"""Dependência FastAPI para extração de tenant_id (id_organizacao) a partir do JWT Bearer."""

from collections.abc import AsyncGenerator
from dataclasses import dataclass

from fastapi import Depends, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.modules.pesquisas.auth_router import (
    CurrentUser,
    decode_access_token,
    get_current_user,
)


@dataclass(frozen=True)
class TenantContext:
    """Contexto multi-tenant resolvido para a requisição atual."""

    tenant_id: int = 1
    user_id: int | None = None
    authenticated: bool = False


async def get_tenant_context(request: Request) -> TenantContext:
    """Extrai tenant_id e user_id do Bearer JWT quando presente; fallback seguro para tenant 1."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        return TenantContext(tenant_id=1, user_id=None, authenticated=False)

    token = auth_header.removeprefix("Bearer ").strip()
    if not token:
        return TenantContext(tenant_id=1, user_id=None, authenticated=False)

    try:
        claims = decode_access_token(token)
    except Exception:
        return TenantContext(tenant_id=1, user_id=None, authenticated=False)

    if claims.get("type") == "refresh":
        return TenantContext(tenant_id=1, user_id=None, authenticated=False)

    raw_tenant = claims.get("tenant_id") or claims.get("id_organizacao") or 1
    raw_user = claims.get("id_usuario") or claims.get("sub")
    try:
        tenant_id = int(raw_tenant)
    except (TypeError, ValueError):
        tenant_id = 1
    try:
        user_id = int(raw_user) if raw_user is not None else None
    except (TypeError, ValueError):
        user_id = None

    return TenantContext(tenant_id=tenant_id, user_id=user_id, authenticated=True)


async def get_tenant_db_session(
    current_user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> AsyncGenerator[AsyncSession, None]:
    """Configura app.current_tenant_id e app.current_user_id na sessão PostgreSQL (RLS)."""
    await session.execute(
        text("SELECT set_config('app.current_tenant_id', :tid, true)"),
        {"tid": str(current_user.tenant_id)},
    )
    await session.execute(
        text("SELECT set_config('app.current_user_id', :uid, true)"),
        {"uid": str(current_user.id_usuario)},
    )
    yield session


__all__ = [
    "CurrentUser",
    "TenantContext",
    "get_current_user",
    "get_tenant_context",
    "get_tenant_db_session",
]

