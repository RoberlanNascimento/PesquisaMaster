"""Exceções de domínio e handlers globais no padrão RFC 7807 (Problem Details)."""

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict

from src.core.logging import get_correlation_id, get_logger

logger = get_logger("core.exceptions")


class ProblemDetails(BaseModel):
    """Contrato RFC 7807 padronizado para respostas de erro da API."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    type: str
    title: str
    status: int
    detail: str
    instance: str
    correlation_id: str
    errors: list[dict[str, Any]] | None = None


class DomainError(Exception):
    """Classe base para todas as exceções de regra de negócio da aplicação."""

    def __init__(
        self,
        detail: str,
        *,
        title: str = "Erro de Regra de Negócio",
        status_code: int = status.HTTP_422_UNPROCESSABLE_CONTENT,
        error_type: str = "https://pesquisamaster.local/errors/domain-error",
    ) -> None:
        super().__init__(detail)
        self.detail = detail
        self.title = title
        self.status_code = status_code
        self.error_type = error_type


class NotFoundError(DomainError):
    """Exceção para recursos não encontrados (HTTP 404)."""

    def __init__(self, detail: str = "Recurso não encontrado.") -> None:
        super().__init__(
            detail=detail,
            title="Recurso Não Encontrado",
            status_code=status.HTTP_404_NOT_FOUND,
            error_type="https://pesquisamaster.local/errors/not-found",
        )


class UnauthorizedError(DomainError):
    """Exceção para falha de autenticação ou token inválido/expirado (HTTP 401)."""

    def __init__(self, detail: str = "Credenciais de autenticação inválidas.") -> None:
        super().__init__(
            detail=detail,
            title="Não Autenticado",
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_type="https://pesquisamaster.local/errors/unauthorized",
        )


class ForbiddenError(DomainError):
    """Exceção para violação de RBAC ou ownership (HTTP 403)."""

    def __init__(self, detail: str = "Permissão negada para esta operação.") -> None:
        super().__init__(
            detail=detail,
            title="Acesso Negado",
            status_code=status.HTTP_403_FORBIDDEN,
            error_type="https://pesquisamaster.local/errors/forbidden",
        )


class ConflictError(DomainError):
    """Exceção para conflitos de estado ou idempotência (HTTP 409)."""

    def __init__(self, detail: str = "Conflito de estado do recurso.") -> None:
        super().__init__(
            detail=detail,
            title="Conflito Transacional",
            status_code=status.HTTP_409_CONFLICT,
            error_type="https://pesquisamaster.local/errors/conflict",
        )


async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    """Converte DomainError em JSONResponse compatível com RFC 7807."""
    corr_id = get_correlation_id()
    logger.warning(
        "domain_error",
        error_type=exc.error_type,
        status_code=exc.status_code,
        detail=exc.detail,
        path=request.url.path,
    )
    problem = ProblemDetails(
        type=exc.error_type,
        title=exc.title,
        status=exc.status_code,
        detail=exc.detail,
        instance=request.url.path,
        correlation_id=corr_id,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=problem.model_dump(exclude_none=True),
        headers={"X-Correlation-ID": corr_id, "Content-Type": "application/problem+json"},
    )


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Converte erros de validação do Pydantic/FastAPI para RFC 7807."""
    corr_id = get_correlation_id()
    sanitized_errors = [
        {
            "loc": [str(item) for item in err.get("loc", ())],
            "msg": str(err.get("msg", "")),
            "type": str(err.get("type", "")),
        }
        for err in exc.errors()
    ]
    problem = ProblemDetails(
        type="https://pesquisamaster.local/errors/validation-error",
        title="Falha de Validação do Contrato de Entrada",
        status=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail="Um ou mais campos enviados são inválidos.",
        instance=request.url.path,
        correlation_id=corr_id,
        errors=sanitized_errors,
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content=problem.model_dump(exclude_none=True),
        headers={"X-Correlation-ID": corr_id, "Content-Type": "application/problem+json"},
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Registra os tratadores de exceção RFC 7807 na instância FastAPI."""
    app.add_exception_handler(DomainError, domain_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_error_handler)  # type: ignore[arg-type]
