.PHONY: dev backend frontend eval submission stop install

# One-shot dev: backend + frontend, foregrounded so Ctrl-C stops both.
dev:
	@echo "Starting backend on :8000 and frontend on :3000…"
	@trap 'kill 0' INT; \
	  ( cd apps/api && uv run uvicorn aarogya_api.app:app --reload --host 127.0.0.1 --port 8000 ) & \
	  ( cd apps/web && pnpm dev ) & \
	  wait

backend:
	cd apps/api && uv run uvicorn aarogya_api.app:app --reload --host 127.0.0.1 --port 8000

frontend:
	cd apps/web && pnpm dev

install:
	cd apps/api && uv sync
	cd apps/web && pnpm install

# 20-query evaluation harness, writes docs/EVAL_REPORT.md.
eval:
	cd apps/api && uv run python ../../scripts/evaluate.py --queries 20 --output ../../docs/EVAL_REPORT.md

# Build a clean submission.zip — excludes .env, node_modules, .venv, .next, data/raw.
submission:
	./scripts/build_submission.sh aarogya-atlas-submission.zip

stop:
	@pkill -f 'uvicorn aarogya_api' 2>/dev/null || true
	@pkill -f 'next dev'             2>/dev/null || true
	@echo "stopped."
