"""MLflow 3 Tracing — spec-explicit stretch goal.

Bootstraps an MLflow client pointed at the Databricks workspace and exposes
`maybe_span()`, a no-op-friendly context manager that records each agent
supervisor turn and tool invocation as a nested span.

Set `DATABRICKS_HOST` + `DATABRICKS_TOKEN` in apps/api/.env to enable.
Without those env vars the agent runs unchanged and tracing is a no-op.
"""

from __future__ import annotations

import contextlib
import os
import time
from typing import Any, Iterator

_MLFLOW_READY = False
_INIT_ATTEMPTED = False


def mlflow_enabled() -> bool:
    return _MLFLOW_READY


def _init() -> None:
    """Lazily configure MLflow on first use."""
    global _MLFLOW_READY, _INIT_ATTEMPTED
    if _INIT_ATTEMPTED:
        return
    _INIT_ATTEMPTED = True

    host = os.environ.get("DATABRICKS_HOST")
    token = os.environ.get("DATABRICKS_TOKEN")
    if not host or not token:
        return

    try:
        import mlflow  # noqa: F401
    except ImportError:
        return

    try:
        import mlflow

        mlflow.set_tracking_uri("databricks")
        mlflow.set_registry_uri("databricks-uc")
        # Auto-trace every Anthropic SDK call (model, tokens, tool calls).
        try:
            mlflow.anthropic.autolog()
        except Exception:
            pass
        try:
            mlflow.set_experiment("/Shared/aarogya-atlas")
        except Exception:
            mlflow.set_experiment("aarogya-atlas")
        _MLFLOW_READY = True
    except Exception:
        # Never let observability break the demo.
        _MLFLOW_READY = False


@contextlib.contextmanager
def maybe_span(
    name: str,
    *,
    span_type: str = "TOOL",
    inputs: dict[str, Any] | None = None,
    attributes: dict[str, Any] | None = None,
) -> Iterator[Any]:
    """Yield an MLflow span if Databricks is configured; else a no-op object.

    Use as: `with maybe_span("supervisor_turn", inputs={...}) as span: ...`
    Then `span.set_outputs({...})` works in both modes (no-op when disabled).
    """
    _init()
    if not _MLFLOW_READY:
        yield _NoopSpan()
        return

    import mlflow
    from mlflow.entities import SpanType

    span_type_map = {
        "AGENT": SpanType.AGENT,
        "TOOL": SpanType.TOOL,
        "LLM": SpanType.LLM,
        "RETRIEVER": SpanType.RETRIEVER,
        "CHAIN": SpanType.CHAIN,
    }
    started = time.monotonic()
    try:
        with mlflow.start_span(
            name=name,
            span_type=span_type_map.get(span_type, SpanType.TOOL),
        ) as span:
            if inputs is not None:
                try:
                    span.set_inputs(inputs)
                except Exception:
                    pass
            if attributes:
                try:
                    for k, v in attributes.items():
                        span.set_attribute(k, v)
                except Exception:
                    pass
            yield span
    finally:
        elapsed_ms = round((time.monotonic() - started) * 1000)
        # MLflow auto-records the duration; this is just for logs.
        os.environ.setdefault("AAROGYA_LAST_SPAN_MS", str(elapsed_ms))


class _NoopSpan:
    """Sentinel object returned when MLflow tracing is disabled."""

    def set_inputs(self, *_args, **_kwargs) -> None:  # noqa: D401
        return None

    def set_outputs(self, *_args, **_kwargs) -> None:
        return None

    def set_attribute(self, *_args, **_kwargs) -> None:
        return None

    def __enter__(self) -> "_NoopSpan":
        return self

    def __exit__(self, *_args) -> None:
        return None
