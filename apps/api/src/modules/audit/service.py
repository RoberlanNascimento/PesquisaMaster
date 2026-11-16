"""Motor de encadeamento criptográfico SHA-256 e verificação de integridade."""

import hashlib
import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.logging import get_correlation_id, get_logger
from src.modules.audit.models import GENESIS_PREV_HASH
from src.modules.audit.repository import AuditRepository
from src.modules.audit.schemas import (
    AuditChainVerificationResponseSchema,
    AuditLogCreateSchema,
    AuditLogFilterSchema,
    AuditLogResponseSchema,
    PaginatedAuditLogsResponseSchema,
)

logger = get_logger("modules.audit.service")


def normalize_utc_iso(dt: datetime) -> str:
    """Normaliza um datetime para ISO-8601 UTC determinístico."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    else:
        dt = dt.astimezone(UTC)
    return dt.isoformat(timespec="microseconds")


def compute_audit_hash(
    *,
    prev_hash: str,
    correlation_id: str,
    actor_user_id: UUID | None,
    module: str,
    action: str,
    payload_diff: dict[str, Any],
    created_at_iso: str,
) -> str:
    """Calcula o digest SHA-256 canônico vinculando o registro atual ao anterior."""
    canonical_payload = json.dumps(
        payload_diff,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    actor_str = str(actor_user_id) if actor_user_id is not None else "system"
    canonical_envelope = "|".join(
        [
            prev_hash,
            correlation_id,
            actor_str,
            module,
            action,
            canonical_payload,
            created_at_iso,
        ]
    )
    return hashlib.sha256(canonical_envelope.encode("utf-8")).hexdigest()


class AuditService:
    """Serviço de auditoria imutável encadeada por hash SHA-256."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = AuditRepository(session)

    async def record_event(
        self,
        payload: AuditLogCreateSchema,
        *,
        auto_commit: bool = False,
    ) -> AuditLogResponseSchema:
        """Registra um evento na trilha de auditoria encadeando o hash SHA-256."""
        latest = await self._repo.get_latest_record()
        prev_hash = latest.record_hash if latest is not None else GENESIS_PREV_HASH
        corr_id = payload.correlation_id or get_correlation_id()
        now_utc = datetime.now(UTC)
        created_at_iso = normalize_utc_iso(now_utc)

        record_hash = compute_audit_hash(
            prev_hash=prev_hash,
            correlation_id=corr_id,
            actor_user_id=payload.actor_user_id,
            module=payload.module,
            action=payload.action,
            payload_diff=payload.payload_diff,
            created_at_iso=created_at_iso,
        )

        created = await self._repo.append_record(
            correlation_id=corr_id,
            actor_user_id=payload.actor_user_id,
            module=payload.module,
            action=payload.action,
            payload_diff=payload.payload_diff,
            prev_hash=prev_hash,
            record_hash=record_hash,
            created_at=now_utc,
        )
        if auto_commit:
            await self._session.commit()

        logger.info(
            "security_audit_recorded",
            audit_id=created.id,
            audit_module=created.module,
            action=created.action,
            record_hash=created.record_hash,
        )
        return created

    async def list_logs(self, filters: AuditLogFilterSchema) -> PaginatedAuditLogsResponseSchema:
        """Retorna registros de auditoria paginados."""
        items, total = await self._repo.list_paginated(filters)
        page = (filters.offset // filters.limit) + 1
        has_next = (filters.offset + len(items)) < total
        return PaginatedAuditLogsResponseSchema(
            items=items,
            total=total,
            limit=filters.limit,
            offset=filters.offset,
            page=page,
            page_size=filters.limit,
            has_next=has_next,
        )

    async def verify_chain_integrity(self) -> AuditChainVerificationResponseSchema:
        """Percorre toda a cadeia `security_audit_logs` validando os hashes SHA-256."""
        records = await self._repo.list_all_ordered_by_id()
        expected_prev_hash = GENESIS_PREV_HASH

        for record in records:
            if record.prev_hash != expected_prev_hash:
                logger.error(
                    "audit_chain_broken_prev_hash",
                    corrupted_record_id=record.id,
                    expected_prev_hash=expected_prev_hash,
                    actual_prev_hash=record.prev_hash,
                )
                return AuditChainVerificationResponseSchema(
                    is_valid=False,
                    checked_records=len(records),
                    last_record_hash=record.record_hash,
                    corrupted_record_id=record.id,
                    failure_reason=(
                        f"Quebra de encadeamento no registro #{record.id}: "
                        "prev_hash diverge do record_hash anterior."
                    ),
                )

            recomputed_hash = compute_audit_hash(
                prev_hash=record.prev_hash,
                correlation_id=record.correlation_id,
                actor_user_id=record.actor_user_id,
                module=record.module,
                action=record.action,
                payload_diff=record.payload_diff,
                created_at_iso=normalize_utc_iso(record.created_at),
            )
            if recomputed_hash != record.record_hash:
                logger.error(
                    "audit_chain_tampering_detected",
                    corrupted_record_id=record.id,
                    expected_hash=recomputed_hash,
                    stored_hash=record.record_hash,
                )
                return AuditChainVerificationResponseSchema(
                    is_valid=False,
                    checked_records=len(records),
                    last_record_hash=record.record_hash,
                    corrupted_record_id=record.id,
                    failure_reason=(
                        f"Adulteração detectada no registro #{record.id}: "
                        "o conteúdo não corresponde à assinatura SHA-256."
                    ),
                )

            expected_prev_hash = record.record_hash

        return AuditChainVerificationResponseSchema(
            is_valid=True,
            checked_records=len(records),
            last_record_hash=expected_prev_hash if records else None,
        )
