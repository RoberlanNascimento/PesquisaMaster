"""Repositório isolado para leitura e gravação append-only de `security_audit_logs`."""

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.audit.models import SecurityAuditLogModel
from src.modules.audit.schemas import AuditLogFilterSchema, AuditLogResponseSchema


class AuditRepository:
    """Encapsula todas as queries da tabela `security_audit_logs`."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_latest_record(self) -> SecurityAuditLogModel | None:
        """Retorna o último registro inserido (ordenado por id DESC)."""
        stmt = select(SecurityAuditLogModel).order_by(SecurityAuditLogModel.id.desc()).limit(1)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def append_record(
        self,
        *,
        correlation_id: str,
        actor_user_id: UUID | None,
        module: str,
        action: str,
        payload_diff: dict[str, Any],
        prev_hash: str,
        record_hash: str,
        created_at: datetime,
    ) -> AuditLogResponseSchema:
        """Insere novo evento de auditoria append-only e retorna DTO validado."""
        entity = SecurityAuditLogModel(
            correlation_id=correlation_id,
            actor_user_id=actor_user_id,
            module=module,
            action=action,
            payload_diff=payload_diff,
            prev_hash=prev_hash,
            record_hash=record_hash,
            created_at=created_at,
        )
        self._session.add(entity)
        await self._session.flush()
        await self._session.refresh(entity)
        return AuditLogResponseSchema.model_validate(entity)

    async def list_paginated(
        self, filters: AuditLogFilterSchema
    ) -> tuple[list[AuditLogResponseSchema], int]:
        """Lista registros de auditoria paginados e filtrados."""
        base_stmt = select(SecurityAuditLogModel)
        count_stmt = select(func.count()).select_from(SecurityAuditLogModel)

        if filters.module is not None:
            base_stmt = base_stmt.where(SecurityAuditLogModel.module == filters.module)
            count_stmt = count_stmt.where(SecurityAuditLogModel.module == filters.module)

        if filters.action is not None:
            base_stmt = base_stmt.where(SecurityAuditLogModel.action == filters.action)
            count_stmt = count_stmt.where(SecurityAuditLogModel.action == filters.action)

        if filters.actor_user_id is not None:
            base_stmt = base_stmt.where(
                SecurityAuditLogModel.actor_user_id == filters.actor_user_id
            )
            count_stmt = count_stmt.where(
                SecurityAuditLogModel.actor_user_id == filters.actor_user_id
            )

        total = int((await self._session.execute(count_stmt)).scalar_one())
        paged_stmt = (
            base_stmt.order_by(SecurityAuditLogModel.id.desc())
            .limit(filters.limit)
            .offset(filters.offset)
        )
        rows = (await self._session.execute(paged_stmt)).scalars().all()
        items = [AuditLogResponseSchema.model_validate(row) for row in rows]
        return items, total

    async def list_all_ordered_by_id(self) -> list[SecurityAuditLogModel]:
        """Carrega os registros em ordem estrita de criação para validação do Hash-Chain."""
        stmt = select(SecurityAuditLogModel).order_by(SecurityAuditLogModel.id.asc())
        result = await self._session.execute(stmt)
        return list(result.scalars().all())
