# Aarogya Atlas API — production image for SnapDeploy / HF Spaces / any Docker host.
#
# Multi-stage build keeps the runtime image lean. uv handles dependency install
# from the lockfile so the deployed image matches local exactly.

FROM python:3.13-slim AS builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_PREFERENCE=only-system

# uv: copy a static binary in — much smaller than `pip install uv`.
COPY --from=ghcr.io/astral-sh/uv:0.5.13 /uv /uvx /usr/local/bin/

WORKDIR /app

# Cache dependencies separately from source so a code change doesn't bust the
# pip layer.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# Now copy the project itself + install it into the env.
COPY aarogya_api ./aarogya_api
COPY db ./db
RUN uv sync --frozen --no-dev


FROM python:3.13-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

# Tiny set of OS deps for psycopg / cryptography / curl healthcheck.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app /app

# SnapDeploy auto-detects port 8000 for FastAPI. HF Spaces expects 7860 —
# overridden via the PORT env var at runtime in that case.
ENV PORT=8000
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS "http://localhost:${PORT}/healthz" || exit 1

CMD ["sh", "-c", "uvicorn aarogya_api.app:app --host 0.0.0.0 --port ${PORT}"]
