"""Repositório isolado (SQLAlchemy Async) para Coleta em Campo e Supervisão."""

from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.fieldwork.models import (
    InterviewAnswerModel,
    InterviewAuditStatus,
    InterviewModel,
)
from src.modules.fieldwork.schemas import (
    InterviewAnswerInputSchema,
    InterviewResponseSchema,
    ResearcherPerformanceItemSchema,
)
from src.modules.sampling.models import QuotaCellModel


class FieldworkRepository:
    """Encapsula todas as queries de `interviews`, `interview_answers` e `quota_cells`."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_idempotency_key(self, idempotency_key: str) -> InterviewModel | None:
        """Busca entrevista já processada pela chave de idempotência."""
        stmt = select(InterviewModel).where(InterviewModel.idempotency_key == idempotency_key)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_interview_by_id(self, interview_id: UUID) -> InterviewModel | None:
        """Busca entrevista pelo UUID."""
        stmt = select(InterviewModel).where(InterviewModel.id == interview_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_quota_cell_for_update(self, quota_cell_id: UUID) -> QuotaCellModel | None:
        """Obtém a célula de cota aplicando bloqueio pessimista (`SELECT ... FOR UPDATE`)."""
        stmt = select(QuotaCellModel).where(QuotaCellModel.id == quota_cell_id).with_for_update()
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_interview_with_answers(
        self,
        *,
        survey_id: UUID,
        stratum_id: UUID,
        quota_cell_id: UUID,
        researcher_id: UUID,
        idempotency_key: str,
        client_hmac_signature: str,
        capture_point: dict[str, Any],
        duration_seconds: int,
        is_geofence_valid: bool,
        audit_status: InterviewAuditStatus,
        purge_reason: str | None,
        started_at: Any,
        finished_at: Any,
        answers: list[InterviewAnswerInputSchema],
    ) -> InterviewResponseSchema:
        """Persiste a entrevista e suas respostas em transação atômica."""
        entity = InterviewModel(
            survey_id=survey_id,
            stratum_id=stratum_id,
            quota_cell_id=quota_cell_id,
            researcher_id=researcher_id,
            idempotency_key=idempotency_key,
            client_hmac_signature=client_hmac_signature,
            capture_point=capture_point,
            duration_seconds=duration_seconds,
            is_geofence_valid=is_geofence_valid,
            audit_status=audit_status.value,
            purge_reason=purge_reason,
            raking_weight=Decimal("1.0000"),
            started_at=started_at,
            finished_at=finished_at,
        )
        self._session.add(entity)
        await self._session.flush()

        for ans in answers:
            ans_entity = InterviewAnswerModel(
                interview_id=entity.id,
                question_id=ans.question_id,
                selected_option_code=ans.selected_option_code,
                spontaneous_text=ans.spontaneous_text,
            )
            self._session.add(ans_entity)

        await self._session.flush()
        await self._session.refresh(entity)
        return InterviewResponseSchema.model_validate(entity)

    async def save_interview(self, entity: InterviewModel) -> InterviewResponseSchema:
        """Salva alterações de auditoria da entrevista e retorna DTO."""
        self._session.add(entity)
        await self._session.flush()
        await self._session.refresh(entity)
        return InterviewResponseSchema.model_validate(entity)

    async def list_interviews_paginated(
        self,
        survey_id: UUID,
        *,
        audit_status: InterviewAuditStatus | None = None,
        researcher_id: UUID | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[InterviewResponseSchema], int]:
        """Lista entrevistas com filtros de auditoria e paginação obrigatória."""
        base_stmt = select(InterviewModel).where(InterviewModel.survey_id == survey_id)
        count_stmt = (
            select(func.count())
            .select_from(InterviewModel)
            .where(InterviewModel.survey_id == survey_id)
        )

        if audit_status is not None:
            base_stmt = base_stmt.where(InterviewModel.audit_status == audit_status.value)
            count_stmt = count_stmt.where(InterviewModel.audit_status == audit_status.value)

        if researcher_id is not None:
            base_stmt = base_stmt.where(InterviewModel.researcher_id == researcher_id)
            count_stmt = count_stmt.where(InterviewModel.researcher_id == researcher_id)

        total = int((await self._session.execute(count_stmt)).scalar_one())
        paged_stmt = base_stmt.order_by(InterviewModel.synced_at.desc()).limit(limit).offset(offset)
        rows = (await self._session.execute(paged_stmt)).scalars().all()
        return [InterviewResponseSchema.model_validate(r) for r in rows], total

    async def get_supervision_metrics(
        self, survey_id: UUID
    ) -> tuple[int, int, int, int, list[ResearcherPerformanceItemSchema]]:
        """Agrega contagens globais e por pesquisador para o Painel de Supervisão."""
        rows_stmt = (
            select(
                InterviewModel.researcher_id,
                InterviewModel.audit_status,
                func.count(InterviewModel.id),
            )
            .where(InterviewModel.survey_id == survey_id)
            .group_by(InterviewModel.researcher_id, InterviewModel.audit_status)
        )
        rows = (await self._session.execute(rows_stmt)).all()

        total_synced = 0
        total_valid = 0
        total_flagged = 0
        total_purged = 0
        by_researcher: dict[UUID, dict[str, int]] = {}

        for r_id, status_str, cnt in rows:
            count_int = int(cnt)
            total_synced += count_int
            bucket = by_researcher.setdefault(
                r_id, {"total": 0, "VALID": 0, "FLAGGED": 0, "PURGED": 0}
            )
            bucket["total"] += count_int
            bucket[status_str] = bucket.get(status_str, 0) + count_int
            if status_str == InterviewAuditStatus.VALID.value:
                total_valid += count_int
            elif status_str == InterviewAuditStatus.FLAGGED.value:
                total_flagged += count_int
            elif status_str == InterviewAuditStatus.PURGED.value:
                total_purged += count_int

        researcher_items = [
            ResearcherPerformanceItemSchema(
                researcher_id=r_id,
                total_synced=metrics["total"],
                valid_count=metrics["VALID"],
                flagged_count=metrics["FLAGGED"],
                purged_count=metrics["PURGED"],
            )
            for r_id, metrics in by_researcher.items()
        ]
        return total_synced, total_valid, total_flagged, total_purged, researcher_items
