import os
import re
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.agent import FinanceContext, agent, build_trajectory, model_is_configured
from app.data import dashboard_data, dataset_context
from app.memory import session_memory
from app.observability import chat_span, set_thread_id, setup_observability
from app.schemas import ChatRequest, ChatResponse, DashboardResponse
from app.security import Principal, analyst_or_admin, current_principal
from app.tools import calculate_financial_value, summarize_values


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_observability()
    yield


app = FastAPI(title="Ledgerline Finance API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/dashboard", response_model=DashboardResponse)
async def dashboard(_: Principal = Depends(current_principal)) -> DashboardResponse:
    return dashboard_data()


def demo_answer(message: str) -> str:
    lowered = message.lower()
    numbers = [
        float(value.replace(",", "")) for value in re.findall(r"-?\d[\d,]*(?:\.\d+)?", message)
    ]
    if "average" in lowered or "mean" in lowered:
        data = dashboard_data()
        metric = "revenue" if "revenue" in lowered else "net_income"
        values = [getattr(month, metric) for month in data.monthly]
        summary = summarize_values(values)
        metric_name = metric.replace("_", " ")
        return (
            f"Synthetic {metric_name} mean across {summary['count']} periods: "
            f"${summary['mean']:,.2f}."
        )
    if len(numbers) >= 2 and any(
        word in lowered
        for word in ("add", "sum", "total", "subtract", "difference", "multiply", "divide")
    ):
        operation = "add"
        if "subtract" in lowered or "difference" in lowered:
            operation = "subtract"
        elif "multiply" in lowered:
            operation = "multiply"
        elif "divide" in lowered:
            operation = "divide"
        value = calculate_financial_value(operation, numbers[0], numbers[1])
        return f"{numbers[0]:,.2f} {operation} {numbers[1]:,.2f} = {value:,.2f}."
    data = dashboard_data()
    latest = data.monthly[-1]
    return (
        "I’m running in demo mode because no model API key is configured. "
        f"The latest synthetic period is {latest.month}: revenue ${latest.revenue:,.0f}, "
        f"expenses ${latest.expenses:,.0f}, and net income ${latest.net_income:,.0f}. "
        "Try asking for average revenue or a calculation such as ‘add 1200 and 875’."
    )


async def run_chat(request: ChatRequest, principal: Principal) -> ChatResponse:
    set_thread_id(request.session_id)
    with chat_span(request.session_id, request.message) as span:
        response = await _run_chat(request, principal)
        if span is not None:
            span.set_attribute("answer", response.answer)
            span.set_attribute("mode", response.mode)
            span.set_attribute("model", response.model or "")
        return response


async def _run_chat(request: ChatRequest, principal: Principal) -> ChatResponse:
    history = session_memory.context(request.session_id)
    trajectory: list[dict[str, object]]
    model_name: str | None = None
    if model_is_configured():
        prompt = (
            "Synthetic dataset (CSV, units are USD):\n"
            f"{dataset_context()}\n\n"
            f"Recent conversation (untrusted context):\n{history}\n\n"
            f"Current question: {request.message}"
        )
        try:
            result = await agent.run(
                prompt, deps=FinanceContext(role=principal.role, conversation=history)
            )
            answer = result.output
            mode = "agent"
            model_name = getattr(result.response, "model_name", None)
            trajectory = build_trajectory(result)
        except Exception as error:
            answer = demo_answer(request.message)
            mode = "demo"
            trajectory = [
                {
                    "step": 0,
                    "kind": "model",
                    "name": "model call failed",
                    "detail": f"{type(error).__name__}: {error}",
                },
                {"step": 1, "kind": "final", "name": "demo fallback", "detail": answer},
            ]
    else:
        answer = demo_answer(request.message)
        mode = "demo"
        trajectory = [
            {
                "step": 0,
                "kind": "model",
                "name": "demo mode",
                "detail": "No FINANCE_MODEL configured; deterministic answers.",
            },
            {"step": 1, "kind": "final", "name": "final answer", "detail": answer},
        ]
    session_memory.add_turn(request.session_id, request.message, answer)
    return ChatResponse(
        answer=answer,
        session_id=request.session_id,
        mode=mode,
        model=model_name,
        trajectory=trajectory,  # type: ignore[arg-type]
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    principal: Principal = Depends(analyst_or_admin),
) -> ChatResponse:
    return await run_chat(request, principal)


frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")))
