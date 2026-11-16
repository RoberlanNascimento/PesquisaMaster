"""Rotas HTTP de consulta e verificação criptográfica da trilha de auditoria."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.core.security import TokenClaimsSchema, UserRole, require_roles
from src.modules.audit.schemas import (
    AuditChainVerificationResponseSchema,
    AuditLogFilterSchema,
    PaginatedAuditLogsResponseSchema,
)
from src.modules.audit.service import AuditService

router = APIRouter(prefix="/audit", tags=["Auditoria Imutável (Hash-Chain)"])

DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
AuditorOrAdminDep = Annotated[
    TokenClaimsSchema,
    Depends(require_roles(UserRole.ADMIN, UserRole.AUDITOR)),
]


@router.get(
    "/logs",
    response_model=PaginatedAuditLogsResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Lista a trilha de auditoria de segurança com paginação (ADMIN ou AUDITOR)",
)
async def list_audit_logs(
    _claims: AuditorOrAdminDep,
    session: DbSessionDep,
    module: Annotated[str | None, Query()] = None,
    action: Annotated[str | None, Query()] = None,
    actor_user_id: Annotated[UUID | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PaginatedAuditLogsResponseSchema:
    filters = AuditLogFilterSchema(
        module=module,
        action=action,
        actor_user_id=actor_user_id,
        limit=limit,
        offset=offset,
    )
    service = AuditService(session)
    return await service.list_logs(filters)


@router.get(
    "/verify-chain",
    response_model=AuditChainVerificationResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Recalcula e verifica a integridade SHA-256 de toda a trilha (ADMIN ou AUDITOR)",
)
async def verify_audit_chain(
    _claims: AuditorOrAdminDep,
    session: DbSessionDep,
) -> AuditChainVerificationResponseSchema:
    service = AuditService(session)
    return await service.verify_chain_integrity()
