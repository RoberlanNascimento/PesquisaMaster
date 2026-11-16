"""Serviço de Supervisão de Campo, Desempenho por Pesquisador e Fluxo de Expurgo Auditável."""

from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import DomainError, NotFoundError
from src.modules.audit.schemas import AuditLogCreateSchema
from src.modules.audit.service import AuditService
from src.modules.fieldwork.models import InterviewAuditStatus
from src.modules.fieldwork.repository import FieldworkRepository
from src.modules.fieldwork.schemas import (
    FieldSupervisionSummarySchema,
    InterviewAuditDecisionRequestSchema,
    InterviewResponseSchema,
    PackageAuditDecisionRequestSchema,
    PackageAuditDecisionResponseSchema,
)
from src.modules.surveys.repository import SurveyRepository


class SupervisionService:
    """Serviço de domínio para supervisão de campo, métricas e expurgo auditável."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = FieldworkRepository(session)
        self._survey_repo = SurveyRepository(session)
        self._audit = AuditService(session)

    async def apply_audit_decision(
        self,
        survey_id: UUID,
        interview_id: UUID,
        payload: InterviewAuditDecisionRequestSchema,
        *,
        actor_id: UUID,
    ) -> InterviewResponseSchema:
        """Permite ao supervisor expurgar ou revalidar uma entrevista ajustando a cota."""
        interview = await self._repo.get_interview_by_id(interview_id)
        if interview is None or interview.survey_id != survey_id:
            raise NotFoundError("Entrevista não encontrada nesta pesquisa.")

        old_status = InterviewAuditStatus(interview.audit_status)
        new_status = payload.target_status
        if old_status == new_status:
            return InterviewResponseSchema.model_validate(interview)

        quota_cell = await self._repo.get_quota_cell_for_update(interview.quota_cell_id)
        if quota_cell is None:
            raise NotFoundError("Célula de cota vinculada não encontrada.")

        if old_status == InterviewAuditStatus.VALID and new_status == InterviewAuditStatus.PURGED:
            quota_cell.current_valid_count = max(0, quota_cell.current_valid_count - 1)
            quota_cell.version += 1
        elif old_status != InterviewAuditStatus.VALID and new_status == InterviewAuditStatus.VALID:
            if quota_cell.current_valid_count >= quota_cell.target_count:
                raise DomainError(
                    "Não é possível validar esta entrevista: a cota demográfica já está completa."
                )
            quota_cell.current_valid_count += 1
            quota_cell.version += 1

        interview.audit_status = new_status.value
        interview.purge_reason = payload.reason.strip()
        updated = await self._repo.save_interview(interview)

        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="fieldwork",
                action=f"INTERVIEW_{new_status.value}",
                payload_diff={
                    "survey_id": str(survey_id),
                    "interview_id": str(interview_id),
                    "from_status": old_status.value,
                    "to_status": new_status.value,
                    "reason": payload.reason.strip(),
                },
            )
        )
        await self._session.commit()
        return updated

    async def apply_package_audit_decision(
        self,
        survey_id: UUID,
        payload: PackageAuditDecisionRequestSchema,
        *,
        actor_id: UUID,
    ) -> PackageAuditDecisionResponseSchema:
        """Grava a decisão do Administrador sobre um pacote e estorna a cota quando reprovado."""
        processed: list[InterviewResponseSchema] = []
        quotas_refunded = 0
        quotas_incremented = 0
        new_status = payload.target_status

        for interview_id in payload.interview_ids:
            interview = await self._repo.get_interview_by_id(interview_id)
            if interview is None or interview.survey_id != survey_id:
                raise NotFoundError(f"Entrevista '{interview_id}' não encontrada nesta pesquisa.")

            old_status = InterviewAuditStatus(interview.audit_status)
            if old_status == new_status:
                processed.append(InterviewResponseSchema.model_validate(interview))
                continue

            quota_cell = await self._repo.get_quota_cell_for_update(interview.quota_cell_id)
            if quota_cell is None:
                raise NotFoundError("Célula de cota demográfica vinculada não encontrada.")

            if (
                old_status == InterviewAuditStatus.VALID
                and new_status == InterviewAuditStatus.PURGED
            ):
                quota_cell.current_valid_count = max(0, quota_cell.current_valid_count - 1)
                quota_cell.version += 1
                quotas_refunded += 1
            elif (
                old_status != InterviewAuditStatus.VALID
                and new_status == InterviewAuditStatus.VALID
            ):
                if quota_cell.current_valid_count >= quota_cell.target_count:
                    raise DomainError(
                        "Não é possível validar o pacote: a cota demográfica já está completa."
                    )
                quota_cell.current_valid_count += 1
                quota_cell.version += 1
                quotas_incremented += 1

            interview.audit_status = new_status.value
            interview.purge_reason = payload.reason.strip()
            updated_dto = await self._repo.save_interview(interview)
            processed.append(updated_dto)

        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="fieldwork",
                action=f"PACKAGE_{new_status.value}",
                payload_diff={
                    "survey_id": str(survey_id),
                    "interview_ids": [str(uid) for uid in payload.interview_ids],
                    "target_status": new_status.value,
                    "quotas_refunded": quotas_refunded,
                    "quotas_incremented": quotas_incremented,
                    "reason": payload.reason.strip(),
                },
            )
        )
        await self._session.commit()
        return PackageAuditDecisionResponseSchema(
            survey_id=survey_id,
            target_status=new_status,
            processed_count=len(processed),
            quotas_refunded=quotas_refunded,
            quotas_incremented=quotas_incremented,
            items=processed,
        )

    async def get_supervision_summary(self, survey_id: UUID) -> FieldSupervisionSummarySchema:
        """Retorna painel consolidado de supervisão de campo com desempenho por pesquisador."""
        survey = await self._survey_repo.get_model_by_id(survey_id)
        if survey is None:
            raise NotFoundError("Pesquisa eleitoral não encontrada.")

        synced, valid, flagged, purged, metrics = await self._repo.get_supervision_metrics(
            survey_id
        )
        planned = Decimal(survey.planned_sample_size)
        completion = (
            ((Decimal(valid) / planned) * Decimal("100.0000")).quantize(Decimal("0.0001"))
            if planned > Decimal("0")
            else Decimal("0.0000")
        )
        return FieldSupervisionSummarySchema(
            survey_id=survey_id,
            planned_sample_size=survey.planned_sample_size,
            total_synced=synced,
            total_valid=valid,
            total_flagged=flagged,
            total_purged=purged,
            completion_percentage=completion,
            researcher_metrics=metrics,
        )
