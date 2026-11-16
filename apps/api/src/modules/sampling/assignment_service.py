"""Serviço de distribuição de cotas e perímetros geográficos por pesquisador de campo."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import ConflictError, DomainError, NotFoundError
from src.core.logging import get_logger
from src.core.security import UserRole
from src.modules.audit.schemas import AuditLogCreateSchema
from src.modules.audit.service import AuditService
from src.modules.auth.repository import AuthRepository
from src.modules.sampling.repository import SamplingRepository
from src.modules.sampling.schemas import (
    FieldAssignmentCreateSchema,
    FieldAssignmentResponseSchema,
    PaginatedFieldAssignmentsResponseSchema,
)
from src.modules.surveys.models import SurveyStatus
from src.modules.surveys.repository import SurveyRepository

logger = get_logger("modules.sampling.assignment_service")

ASSIGNABLE_SURVEY_STATUSES = frozenset({SurveyStatus.DRAFT.value, SurveyStatus.ACTIVE_FIELD.value})


class FieldAssignmentService:
    """Serviço de domínio para alocação de pesquisadores em setores/estratos geográficos."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = SamplingRepository(session)
        self._survey_repo = SurveyRepository(session)
        self._auth_repo = AuthRepository(session)
        self._audit = AuditService(session)

    async def assign_researcher_quota(
        self,
        survey_id: UUID,
        payload: FieldAssignmentCreateSchema,
        *,
        actor_id: UUID,
    ) -> FieldAssignmentResponseSchema:
        """Atribui cota e perímetro geográfico a um pesquisador validando teto do estrato e RBAC."""
        survey = await self._survey_repo.get_model_by_id(survey_id)
        if survey is None:
            raise NotFoundError("Pesquisa eleitoral não encontrada.")

        if survey.status not in ASSIGNABLE_SURVEY_STATUSES:
            raise ConflictError(
                f"Distribuição de campo bloqueada: a pesquisa está em status '{survey.status}'."
            )

        stratum = await self._repo.get_stratum_model_by_id(payload.stratum_id)
        if stratum is None or stratum.survey_id != survey_id:
            raise NotFoundError("Estrato geográfico não encontrado nesta pesquisa.")

        researcher = await self._auth_repo.get_model_by_id(payload.researcher_id)
        if researcher is None:
            raise NotFoundError("Usuário pesquisador não encontrado.")
        if not researcher.is_active:
            raise DomainError("Não é permitido atribuir cotas a um pesquisador inativo.")
        if researcher.role != UserRole.RESEARCHER.value:
            raise DomainError(
                f"O usuário informado possui perfil '{researcher.role}', "
                "mas apenas 'RESEARCHER' pode receber atribuições de coleta em campo."
            )

        already_assigned_others = await self._repo.sum_assigned_quota_for_stratum(
            stratum.id, exclude_researcher_id=researcher.id
        )
        new_total = already_assigned_others + payload.assigned_quota
        if new_total > stratum.target_interviews:
            available = max(0, stratum.target_interviews - already_assigned_others)
            raise ConflictError(
                f"A cota solicitada ({payload.assigned_quota}) excede o saldo disponível "
                f"do estrato '{stratum.region_code}' (disponível: {available}, "
                f"meta total do estrato: {stratum.target_interviews})."
            )

        assigned = await self._repo.upsert_field_assignment(
            survey_id=survey_id,
            stratum=stratum,
            researcher_id=researcher.id,
            assigned_quota=payload.assigned_quota,
        )
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="sampling",
                action="FIELD_QUOTA_ASSIGNED",
                payload_diff={
                    "survey_id": str(survey_id),
                    "stratum_id": str(stratum.id),
                    "region_code": stratum.region_code,
                    "researcher_id": str(researcher.id),
                    "assigned_quota": payload.assigned_quota,
                    "stratum_assigned_total": new_total,
                    "stratum_target": stratum.target_interviews,
                },
            )
        )
        await self._session.commit()
        logger.info(
            "field_quota_assigned",
            survey_id=str(survey_id),
            stratum_id=str(stratum.id),
            researcher_id=str(researcher.id),
            assigned_quota=payload.assigned_quota,
        )
        return assigned

    async def list_assignments(
        self,
        survey_id: UUID,
        *,
        researcher_id: UUID | None = None,
        stratum_id: UUID | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> PaginatedFieldAssignmentsResponseSchema:
        """Lista atribuições de cotas e perímetros geográficos de uma pesquisa."""
        survey = await self._survey_repo.get_model_by_id(survey_id)
        if survey is None:
            raise NotFoundError("Pesquisa eleitoral não encontrada.")

        items, total = await self._repo.list_field_assignments_paginated(
            survey_id,
            researcher_id=researcher_id,
            stratum_id=stratum_id,
            limit=limit,
            offset=offset,
        )
        page = (offset // limit) + 1
        has_next = (offset + len(items)) < total
        return PaginatedFieldAssignmentsResponseSchema(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
            page=page,
            page_size=limit,
            has_next=has_next,
        )
