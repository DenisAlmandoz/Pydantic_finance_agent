# Ledgerline Finance Intelligence

A finance analytics demo with one PydanticAI agent, two typed finance tools, a FastAPI backend, and a React/TypeScript dashboard. The bundled dataset is synthetic and must not be treated as real company or market data.

## Run locally

Prerequisites: Python 3.11+, `uv`, and Node.js 20+.

```sh
uv sync --group dev
cd frontend && npm install && npm run dev
```

In another terminal:

```sh
uv run uvicorn app.main:app --reload --app-dir backend
```

Open `http://localhost:5173`. Without `OPENAI_API_KEY`, chat runs in deterministic demo mode. Add `OPENAI_API_KEY` to the environment to enable the PydanticAI model-backed loop. Add `OPIK_API_KEY` and `OPIK_WORKSPACE` to enable remote tracing. Do not commit secrets.

## Demo access

The local-only fallback tokens are `demo-admin-token`, `demo-analyst-token`, and `demo-viewer-token`. Dashboard reads are available to all three roles; chat requires analyst or admin. Override them with comma-separated `token:role` pairs in `FINANCE_API_TOKENS` before deploying. The fallback tokens are not production credentials.

## Evaluation and checks

```sh
uv run --group dev pytest
uv run --directory backend python -m app.evals
cd frontend && npm run build
```

Agent requests are traced with Opik when configured. Deterministic regression cases cover calculation behavior, mean-revenue output, and synthetic-data disclosure; expand the evaluation set before connecting real financial data.

## Architecture and boundaries

- PydanticAI agent with exactly two tools: financial calculation and descriptive statistics.
- FastAPI authorization dependency enforces role-based access before protected actions.
- Conversation memory is bounded, in-process, and intended for local/demo use; configure shared persistent storage before running multiple replicas.
- `data/synthetic_financials.csv` provides generated monthly values.
- Neo4j graph extraction is future scope and is not a second agent in this MVP.
- Do not present the output as financial advice, or use the synthetic data for business decisions.

## Databricks

Reauthenticate the Databricks CLI, create a `finance-secrets` secret scope, and add the `openai-api-key`, `opik-api-key`, and `finance-api-tokens` keys. The RBAC secret should contain comma-separated `token:role` pairs. The bundle maps these existing secrets to app resources. The frontend is built at app startup and served by FastAPI on the same origin using Databricks' assigned app port. Validate and deploy with:

```sh
databricks bundle validate -t dev
databricks bundle deploy -t dev
```

Review `databricks.yml` and workspace app secret configuration against the target workspace before deployment. The bundle does not contain credentials.