"""Serviço de Sincronização em Lote Idempotente e Antifraude de Coleta em Campo."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from src.core.logging import get_logger
from src.modules.audit.schemas import AuditLogCreateSchema
from src.modules.audit.service import AuditService
from src.modules.fieldwork.antifraud import (
    evaluate_antifraud_rules,
    verify_interview_hmac,
)
from src.modules.fieldwork.models import InterviewAuditStatus
from src.modules.fieldwork.repository import FieldworkRepository
from src.modules.fieldwork.schemas import (
    BatchSyncRequestSchema,
    BatchSyncResponseSchema,
    InterviewAuditDecisionRequestSchema,
    InterviewResponseSchema,
    PackageAuditDecisionRequestSchema,
    PackageAuditDecisionResponseSchema,
    PaginatedInterviewsResponseSchema,
)
from src.modules.fieldwork.supervision_service import SupervisionService
from src.modules.sampling.repository import SamplingRepository
from src.modules.surveys.models import SurveyStatus
from src.modules.surveys.repository import SurveyRepository

logger = get_logger("modules.fieldwork.service")


class FieldworkService:
    """Serviço de domínio para sincronização em lote idempotente e validação antifraude."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = FieldworkRepository(session)
        self._survey_repo = SurveyRepository(session)
        self._sampling_repo = SamplingRepository(session)
        self._audit = AuditService(session)

    async def sync_batch(
        self,
        survey_id: UUID,
        payload: BatchSyncRequestSchema,
        *,
        researcher_id: UUID,
        batch_idempotency_key: str,
    ) -> BatchSyncResponseSchema:
        """Sincroniza lote de entrevistas com idempotência, verificação HMAC e motor antifraude."""
        survey = await self._survey_repo.get_model_by_id(survey_id)
        if survey is None:
            raise NotFoundError("Pesquisa eleitoral não encontrada.")

        if survey.status != SurveyStatus.ACTIVE_FIELD.value:
            raise ConflictError(
                f"Sincronização negada: a pesquisa está em status '{survey.status}' "
                "(requer 'ACTIVE_FIELD')."
            )

        processed_items: list[InterviewResponseSchema] = []

        for item in payload.interviews:
            composite_idem_key = (
                f"{batch_idempotency_key.strip()}:{item.client_interview_key.strip()}"
            )
            existing = await self._repo.get_by_idempotency_key(composite_idem_key)
            if existing is not None:
                processed_items.append(InterviewResponseSchema.model_validate(existing))
                continue

            lon, lat = item.capture_point.coordinates
            hmac_ok = verify_interview_hmac(
                expected_signature=item.client_hmac_signature,
                survey_id=survey_id,
                stratum_id=item.stratum_id,
                quota_cell_id=item.quota_cell_id,
                researcher_id=researcher_id,
                client_interview_key=item.client_interview_key,
                duration_seconds=item.duration_seconds,
                lon=lon,
                lat=lat,
            )
            if not hmac_ok:
                raise ForbiddenError(
                    f"Assinatura criptográfica HMAC inválida para a entrevista "
                    f"'{item.client_interview_key}'."
                )

            stratum = await self._sampling_repo.get_stratum_model_by_id(item.stratum_id)
            if stratum is None or stratum.survey_id != survey_id:
                raise NotFoundError("Estrato amostral não pertence a esta pesquisa.")

            quota_cell = await self._repo.get_quota_cell_for_update(item.quota_cell_id)
            if quota_cell is None or quota_cell.stratum_id != stratum.id:
                raise NotFoundError("Célula demográfica de cota não encontrada no estrato.")

            is_geo_ok, audit_status, flag_reason = evaluate_antifraud_rules(
                lon=lon,
                lat=lat,
                boundary_geom=stratum.boundary_geom,
                duration_seconds=item.duration_seconds,
                current_valid_quota=quota_cell.current_valid_count,
                target_quota=quota_cell.target_count,
            )

            if audit_status == InterviewAuditStatus.VALID:
                quota_cell.current_valid_count += 1
                quota_cell.version += 1

            created_dto = await self._repo.create_interview_with_answers(
                survey_id=survey_id,
                stratum_id=stratum.id,
                quota_cell_id=quota_cell.id,
                researcher_id=researcher_id,
                idempotency_key=composite_idem_key,
                client_hmac_signature=item.client_hmac_signature.strip().lower(),
                capture_point={
                    "type": "Point",
                    "coordinates": [str(lon), str(lat)],
                },
                duration_seconds=item.duration_seconds,
                is_geofence_valid=is_geo_ok,
                audit_status=audit_status,
                purge_reason=flag_reason,
                started_at=item.started_at,
                finished_at=item.finished_at,
                answers=item.answers,
            )
            processed_items.append(created_dto)

        valid_cnt = sum(1 for i in processed_items if i.audit_status == InterviewAuditStatus.VALID)
        flagged_cnt = sum(
            1 for i in processed_items if i.audit_status == InterviewAuditStatus.FLAGGED
        )
        purged_cnt = sum(
            1 for i in processed_items if i.audit_status == InterviewAuditStatus.PURGED
        )

        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=researcher_id,
                module="fieldwork",
                action="INTERVIEW_BATCH_SYNCED",
                payload_diff={
                    "survey_id": str(survey_id),
                    "batch_idempotency_key": batch_idempotency_key,
                    "total_processed": len(processed_items),
                    "valid_count": valid_cnt,
                    "flagged_count": flagged_cnt,
                },
            )
        )
        await self._session.commit()
        return BatchSyncResponseSchema(
            batch_idempotency_key=batch_idempotency_key,
            total_processed=len(processed_items),
            valid_count=valid_cnt,
            flagged_count=flagged_cnt,
            purged_count=purged_cnt,
            items=processed_items,
        )

    async def list_interviews(
        self,
        survey_id: UUID,
        *,
        audit_status: InterviewAuditStatus | None = None,
        researcher_id: UUID | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> PaginatedInterviewsResponseSchema:
        """Lista entrevistas da pesquisa com paginação obrigatória."""
        items, total = await self._repo.list_interviews_paginated(
            survey_id,
            audit_status=audit_status,
            researcher_id=researcher_id,
            limit=limit,
            offset=offset,
        )
        page = (offset // limit) + 1
        has_next = (offset + len(items)) < total
        return PaginatedInterviewsResponseSchema(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
            page=page,
            page_size=limit,
            has_next=has_next,
        )

    async def apply_audit_decision(
        self,
        survey_id: UUID,
        interview_id: UUID,
        payload: InterviewAuditDecisionRequestSchema,
        *,
        actor_id: UUID,
    ) -> InterviewResponseSchema:
        """Grava a decisão de auditoria no banco e estorna a cota quando reprovada."""
        supervision = SupervisionService(self._session)
        return await supervision.apply_audit_decision(
            survey_id, interview_id, payload, actor_id=actor_id
        )

    async def apply_package_audit_decision(
        self,
        survey_id: UUID,
        payload: PackageAuditDecisionRequestSchema,
        *,
        actor_id: UUID,
    ) -> PackageAuditDecisionResponseSchema:
        """Grava a decisão administrativa sobre o pacote e estorna cotas quando reprovado."""
        supervision = SupervisionService(self._session)
        return await supervision.apply_package_audit_decision(survey_id, payload, actor_id=actor_id)
