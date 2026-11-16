"""Configuração de logs estruturados em JSON (Structlog) e contexto de correlação."""

import logging
from collections.abc import MutableMapping
from contextvars import ContextVar
from typing import Any
from uuid import uuid4

import structlog

correlation_id_ctx: ContextVar[str] = ContextVar("correlation_id", default="")
user_id_ctx: ContextVar[str] = ContextVar("user_id", default="anonymous")


def get_correlation_id() -> str:
    """Obtém o correlation_id atual ou gera um novo UUID v4."""
    current = correlation_id_ctx.get()
    if not current:
        current = str(uuid4())
        correlation_id_ctx.set(current)
    return current


def inject_context_vars(
    _logger: Any, _method_name: str, event_dict: MutableMapping[str, Any]
) -> MutableMapping[str, Any]:
    """Injeta correlation_id e user_id em todos os eventos de log."""
    event_dict["correlation_id"] = get_correlation_id()
    event_dict["user_id"] = user_id_ctx.get()
    return event_dict


def configure_logging() -> None:
    """Inicializa o structlog com saída estrita em JSON e timestamps ISO/UTC."""
    logging.basicConfig(format="%(message)s", level=logging.INFO)
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            inject_context_vars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        cache_logger_on_first_use=True,
    )


def get_logger(module_name: str) -> Any:
    """Retorna um logger estruturado vinculado ao módulo informado."""
    return structlog.get_logger().bind(module=module_name)
