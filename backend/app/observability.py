"""Optional Opik tracing.

Pydantic AI does not have a native Opik integration; it emits OpenTelemetry
spans through Logfire. We export those spans to Opik's OTLP endpoint so the
prompts, model calls, tool calls, token usage, and results all show up in Opik.
FastAPI (>=0.142) also emits a root request span, which we tag with the session
id as ``thread_id`` so each turn is grouped into one Opik thread.
"""

import contextlib
import os
from collections.abc import Iterator
from typing import Any

_configured = False


def enabled() -> bool:
    return _configured


def setup_observability() -> None:
    """Configure Logfire/Pydantic AI to export to Opik. No-op without OPIK_API_KEY."""
    global _configured
    if _configured:
        return
    api_key = os.getenv("OPIK_API_KEY")
    if not api_key:
        return

    workspace = os.getenv("OPIK_WORKSPACE") or "default"
    project = os.getenv("OPIK_PROJECT_NAME") or "ledgerline"
    base_url = (os.getenv("OPIK_URL") or "https://www.comet.com/opik").rstrip("/")

    os.environ.setdefault("OTEL_EXPORTER_OTLP_ENDPOINT", f"{base_url}/api/v1/private/otel")
    os.environ.setdefault(
        "OTEL_EXPORTER_OTLP_HEADERS",
        f"Authorization={api_key},Comet-Workspace={workspace},projectName={project}",
    )
    os.environ.setdefault("OTEL_METRICS_EXPORTER", "none")

    try:
        import opik

        opik.configure(
            api_key=api_key, workspace=workspace, project_name=project, use_local=False
        )
    except Exception:
        pass

    try:
        import logfire

        logfire.configure(send_to_logfire=False, service_name="ledgerline")
        logfire.instrument_pydantic_ai()
        try:
            logfire.instrument_httpx(capture_all=True)
        except Exception:
            pass
        _configured = True
    except Exception:
        _configured = False


def set_thread_id(session_id: str) -> None:
    """Tag the FastAPI request root span so Opik groups the turn into a thread."""
    if not _configured or not session_id:
        return
    span = None
    try:
        from fastapi.telemetry._api import _get_request_telemetry

        request_telemetry = _get_request_telemetry()
        if request_telemetry is not None:
            span = request_telemetry.span
    except Exception:
        span = None
    if span is None:
        try:
            from opentelemetry import trace

            span = trace.get_current_span()
        except Exception:
            span = None
    try:
        if span is not None and span.is_recording():
            span.set_attribute("thread_id", session_id)
    except Exception:
        pass


@contextlib.contextmanager
def chat_span(session_id: str, message: str) -> Iterator[Any | None]:
    """Span for a chat turn; yields a span with ``set_attribute`` or None."""
    if not _configured:
        yield None
        return
    import logfire

    with logfire.span("finance_chat", thread_id=session_id, user_message=message) as span:
        yield span
