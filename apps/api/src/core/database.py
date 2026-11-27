"""Configuração do SQLAlchemy 2.0 AsyncEngine, AsyncSession e Base Declarativa."""

from collections.abc import AsyncGenerator
from datetime import datetime
from uuid import UUID, uuid4

import jwt
from fastapi import Request
from sqlalchemy import DateTime, MetaData, func, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from src.core.config import get_settings

NAMING_CONVENTION: dict[str, str] = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    """Classe base para todos os modelos SQLAlchemy 2.0."""

    metadata = MetaData(naming_convention=NAMING_CONVENTION)


class AuditTimestampMixin:
    """Mixin padrão com UUID primário e colunas de auditoria TIMESTAMPTZ (UTC)."""

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )


def create_engine() -> AsyncEngine:
    """Cria o motor assíncrono do SQLAlchemy a partir das configurações."""
    settings = get_settings()
    return create_async_engine(
        settings.database_url,
        echo=settings.debug,
        pool_pre_ping=True,
        future=True,
    )


engine: AsyncEngine = create_engine()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


_VALID_PG_ROLES = {"pesquisador", "auditor", "estatistico", "administrador", "anonimo"}


def _resolve_session_context(request: Request) -> tuple[int, str, int]:
    """Resolve (tenant_id, pg_role, actor_id) a partir do JWT Bearer quando presente."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return 1, "administrador", 1
    token = auth_header.removeprefix("Bearer ").strip()
    if not token:
        return 1, "administrador", 1
    settings = get_settings()
    try:
        claims = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except Exception:
        return 1, "administrador", 1

    raw_tid = claims.get("tenant_id") or claims.get("id_organizacao") or 1
    raw_uid = claims.get("id_usuario") or claims.get("sub") or 1
    raw_cargo = str(claims.get("cargo") or claims.get("role") or "administrador").strip().lower()
    pg_role = raw_cargo if raw_cargo in _VALID_PG_ROLES else "administrador"
    try:
        tid = int(raw_tid)
    except (TypeError, ValueError):
        tid = 1
    try:
        uid = int(raw_uid)
    except (TypeError, ValueError):
        uid = 1
    return tid, pg_role, uid


async def get_db_session(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """Dependência FastAPI que fornece uma AsyncSession com contexto multi-tenant no PostgreSQL."""
    tenant_id, pg_role, actor_id = _resolve_session_context(request)
    async with AsyncSessionLocal() as session:
        await session.execute(
            text("SELECT public.fn_definir_contexto_sessao(:tid, :role, :uid, 'usuario')"),
            {"tid": tenant_id, "role": pg_role, "uid": actor_id},
        )
        yield session
