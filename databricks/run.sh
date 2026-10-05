#!/usr/bin/env bash
set -euo pipefail
uv sync --frozen --no-dev
export PORT="${DATABRICKS_APP_PORT:-${PORT:-8000}}"
cd frontend
npm ci
VITE_API_URL="" npm run build
cd ..
uv run --no-sync uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port "${PORT:-8000}"