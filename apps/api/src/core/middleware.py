"""Middleware HTTP para propagação de X-Correlation-ID e log de requisição."""

import time
from collections.abc import Awaitable, Callable
from uuid import uuid4

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from src.core.logging import correlation_id_ctx, get_logger

logger = get_logger("core.middleware")


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Garante que toda requisição possua um correlation_id rastreável."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        incoming_id = request.headers.get("X-Correlation-ID", "").strip()
        corr_id = incoming_id if incoming_id else str(uuid4())
        token = correlation_id_ctx.set(corr_id)
        start_time = time.perf_counter()

        try:
            response = await call_next(request)
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            response.headers["X-Correlation-ID"] = corr_id
            logger.info(
                "http_request_completed",
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                duration_ms=elapsed_ms,
            )
            return response
        finally:
            correlation_id_ctx.reset(token)
