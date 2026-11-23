"""Ponto de entrada da API FastAPI PesquisaMaster."""

from datetime import UTC, datetime
from typing import Literal

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

from src.core.config import get_settings
from src.core.exceptions import DomainError, register_exception_handlers
from src.core.logging import configure_logging, get_correlation_id
from src.core.middleware import CorrelationIdMiddleware
from src.modules.pesquisas.amostragem_router import amostragem_router
from src.modules.pesquisas.auth_router import auth_router as db_auth_router
from src.modules.pesquisas.bairros_router import bairros_router
from src.modules.pesquisas.campo_operacoes_router import campo_operacoes_router
from src.modules.pesquisas.estados_router import estados_router
from src.modules.pesquisas.integracoes_router import integracao_router
from src.modules.pesquisas.organizacoes_router import organizacoes_router
from src.modules.pesquisas.profissionais_router import profissionais_router
from src.modules.pesquisas.questionarios_db_router import questionarios_db_router
from src.modules.pesquisas.regioes_router import regioes_router
from src.modules.pesquisas.router import router as pesquisas_db_router
from src.modules.pesquisas.tables_router import tables_router
from src.modules.pesquisas.tabulacao_ponderada_router import tabulacao_ponderada_router
from src.modules.pesquisas.usuarios_router import usuarios_router


class HealthResponseSchema(BaseModel):
    """Contrato de resposta do endpoint de verificação de saúde."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    status: Literal["ok"]
    service: str
    version: str
    environment: str
    correlation_id: str
    timestamp: datetime


def create_app() -> FastAPI:
    """Fábrica de inicialização da aplicação FastAPI."""
    configure_logging()
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    app.add_middleware(CorrelationIdMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)
    app.include_router(pesquisas_db_router, prefix=settings.api_v1_prefix)
    app.include_router(tables_router, prefix=settings.api_v1_prefix)
    app.include_router(estados_router, prefix=settings.api_v1_prefix)
    app.include_router(regioes_router, prefix=settings.api_v1_prefix)
    app.include_router(bairros_router, prefix=settings.api_v1_prefix)
    app.include_router(usuarios_router, prefix=settings.api_v1_prefix)
    app.include_router(organizacoes_router, prefix=settings.api_v1_prefix)
    app.include_router(profissionais_router, prefix=settings.api_v1_prefix)
    app.include_router(db_auth_router, prefix=settings.api_v1_prefix)
    app.include_router(db_auth_router)
    app.include_router(campo_operacoes_router)
    app.include_router(amostragem_router)
    app.include_router(integracao_router)
    app.include_router(tabulacao_ponderada_router)
    app.include_router(questionarios_db_router)

    @app.get(
        "/health",
        response_model=HealthResponseSchema,
        status_code=status.HTTP_200_OK,
        tags=["Infraestrutura"],
        summary="Verifica a disponibilidade e integridade básica da API",
    )
    async def health_check() -> HealthResponseSchema:
        return HealthResponseSchema(
            status="ok",
            service=settings.app_name,
            version=settings.app_version,
            environment=settings.environment,
            correlation_id=get_correlation_id(),
            timestamp=datetime.now(UTC),
        )

    @app.get(
        f"{settings.api_v1_prefix}/diagnostics/domain-error",
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        include_in_schema=False,
    )
    async def trigger_domain_error_probe() -> None:
        raise DomainError("Simulação controlada de erro de domínio RFC 7807.")

    return app


app = create_app()
