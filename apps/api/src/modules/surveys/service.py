"""Regras de negócio TSE (PesqEle), máquina de estados e travamento de pesquisas em campo."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import ConflictError, DomainError, NotFoundError
from src.core.logging import get_logger
from src.modules.audit.schemas import AuditLogCreateSchema
from src.modules.audit.service import AuditService
from src.modules.surveys.models import SurveyStatus
from src.modules.surveys.repository import SurveyRepository
from src.modules.surveys.schemas import (
    PaginatedSurveysResponseSchema,
    SurveyCreateSchema,
    SurveyFilterSchema,
    SurveyResponseSchema,
    SurveyStatusTransitionSchema,
    SurveyUpdateSchema,
)

logger = get_logger("modules.surveys.service")

ALLOWED_STATUS_TRANSITIONS: dict[SurveyStatus, frozenset[SurveyStatus]] = {
    SurveyStatus.DRAFT: frozenset({SurveyStatus.ACTIVE_FIELD}),
    SurveyStatus.ACTIVE_FIELD: frozenset({SurveyStatus.CLOSED}),
    SurveyStatus.CLOSED: frozenset({SurveyStatus.PUBLISHED}),
    SurveyStatus.PUBLISHED: frozenset(),
}


class SurveyService:
    """Serviço de domínio para gestão do ciclo de vida de Pesquisas Eleitorais."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = SurveyRepository(session)
        self._audit = AuditService(session)

    async def create_survey(
        self, payload: SurveyCreateSchema, *, actor_id: UUID
    ) -> SurveyResponseSchema:
        """Registra nova pesquisa eleitoral em status DRAFT validando protocolo TSE único."""
        existing = await self._repo.get_model_by_protocol(payload.tse_protocol_number)
        if existing is not None:
            raise ConflictError(
                f"Já existe uma pesquisa registrada com o protocolo TSE "
                f"'{payload.tse_protocol_number}'."
            )

        created = await self._repo.create(payload, created_by=actor_id)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="surveys",
                action="SURVEY_CREATED",
                payload_diff={
                    "survey_id": str(created.id),
                    "tse_protocol_number": created.tse_protocol_number,
                    "planned_sample_size": created.planned_sample_size,
                    "confidence_level": str(created.confidence_level),
                    "margin_of_error": str(created.margin_of_error),
                },
            )
        )
        await self._session.commit()
        logger.info(
            "survey_created",
            survey_id=str(created.id),
            tse_protocol_number=created.tse_protocol_number,
            actor_id=str(actor_id),
        )
        return created

    async def get_survey(self, survey_id: UUID) -> SurveyResponseSchema:
        """Obtém uma pesquisa eleitoral pelo ID."""
        entity = await self._repo.get_model_by_id(survey_id)
        if entity is None:
            raise NotFoundError("Pesquisa eleitoral não encontrada.")
        return SurveyResponseSchema.model_validate(entity)

    async def update_survey(
        self, survey_id: UUID, payload: SurveyUpdateSchema, *, actor_id: UUID
    ) -> SurveyResponseSchema:
        """Atualiza parâmetros da pesquisa somente enquanto estiver em status DRAFT."""
        entity = await self._repo.get_model_by_id(survey_id)
        if entity is None:
            raise NotFoundError("Pesquisa eleitoral não encontrada.")

        if entity.status != SurveyStatus.DRAFT.value:
            raise ConflictError(
                f"Operação bloqueada: pesquisas em status '{entity.status}' estão travadas "
                "para alterações metodológicas ou cadastrais (conformidade TSE)."
            )

        new_start = payload.field_start_at or entity.field_start_at
        new_end = payload.field_end_at or entity.field_end_at
        if new_end <= new_start:
            raise DomainError(
                "A data de encerramento de campo deve ser estritamente posterior ao início."
            )

        if payload.title is not None:
            entity.title = payload.title.strip()
        if payload.contracting_entity_doc is not None:
            entity.contracting_entity_doc = payload.contracting_entity_doc.strip()
        if payload.statistician_conre is not None:
            entity.statistician_conre = payload.statistician_conre.strip()
        if payload.planned_sample_size is not None:
            entity.planned_sample_size = payload.planned_sample_size
        if payload.confidence_level is not None:
            entity.confidence_level = payload.confidence_level
        if payload.margin_of_error is not None:
            entity.margin_of_error = payload.margin_of_error
        if payload.field_start_at is not None:
            entity.field_start_at = payload.field_start_at
        if payload.field_end_at is not None:
            entity.field_end_at = payload.field_end_at

        updated = await self._repo.save(entity)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="surveys",
                action="SURVEY_UPDATED",
                payload_diff={
                    "survey_id": str(survey_id),
                    "updated_fields": sorted(payload.model_fields_set),
                },
            )
        )
        await self._session.commit()
        logger.info("survey_updated", survey_id=str(survey_id), actor_id=str(actor_id))
        return updated

    async def transition_status(
        self,
        survey_id: UUID,
        payload: SurveyStatusTransitionSchema,
        *,
        actor_id: UUID,
    ) -> SurveyResponseSchema:
        """Executa transição unidirecional de status e trava a pesquisa contra edições."""
        entity = await self._repo.get_model_by_id(survey_id)
        if entity is None:
            raise NotFoundError("Pesquisa eleitoral não encontrada.")

        current_status = SurveyStatus(entity.status)
        target_status = payload.target_status
        allowed_targets = ALLOWED_STATUS_TRANSITIONS.get(current_status, frozenset())

        if target_status not in allowed_targets:
            raise ConflictError(
                f"Transição de status inválida: '{current_status.value}' → "
                f"'{target_status.value}' não é permitida pelo fluxo TSE."
            )

        entity.status = target_status.value
        updated = await self._repo.save(entity)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="surveys",
                action="SURVEY_STATUS_CHANGED",
                payload_diff={
                    "survey_id": str(survey_id),
                    "tse_protocol_number": entity.tse_protocol_number,
                    "from_status": current_status.value,
                    "to_status": target_status.value,
                },
            )
        )
        await self._session.commit()
        logger.info(
            "survey_status_transitioned",
            survey_id=str(survey_id),
            from_status=current_status.value,
            to_status=target_status.value,
            actor_id=str(actor_id),
        )
        return updated

    async def list_surveys(self, filters: SurveyFilterSchema) -> PaginatedSurveysResponseSchema:
        """Lista pesquisas paginadas."""
        items, total = await self._repo.list_paginated(filters)
        page = (filters.offset // filters.limit) + 1
        has_next = (filters.offset + len(items)) < total
        return PaginatedSurveysResponseSchema(
            items=items,
            total=total,
            limit=filters.limit,
            offset=filters.offset,
            page=page,
            page_size=filters.limit,
            has_next=has_next,
        )
