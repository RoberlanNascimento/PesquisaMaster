"""Motor de Questionários Dinâmicos: Rodízio de Disco (TSE) e avaliação de Skip Logic."""

import hashlib
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import ConflictError, DomainError, NotFoundError
from src.core.logging import get_logger
from src.modules.audit.schemas import AuditLogCreateSchema
from src.modules.audit.service import AuditService
from src.modules.questionnaires.repository import QuestionnaireRepository
from src.modules.questionnaires.schemas import (
    EvaluateSkipLogicRequestSchema,
    EvaluateSkipLogicResponseSchema,
    PaginatedQuestionnaireItemsResponseSchema,
    QuestionnaireItemCreateSchema,
    QuestionnaireItemResponseSchema,
    QuestionOptionSchema,
)
from src.modules.surveys.models import SurveyStatus
from src.modules.surveys.repository import SurveyRepository

logger = get_logger("modules.questionnaires.service")

END_INTERVIEW_SENTINEL = "END_INTERVIEW"


def rotate_ballot_disc_options(
    options: list[QuestionOptionSchema],
    *,
    rotation_seed: str,
    question_code: str,
) -> list[QuestionOptionSchema]:
    """Aplica rodízio circular determinístico (Disco TSE) apenas nas opções não-fixas."""
    rotatable = [opt for opt in options if not opt.is_fixed]
    fixed = [opt for opt in options if opt.is_fixed]

    if len(rotatable) <= 1:
        return rotatable + fixed

    digest = hashlib.sha256(f"{rotation_seed}:{question_code}".encode()).digest()
    seed_int = int.from_bytes(digest[:8], byteorder="big", signed=False)
    shift = seed_int % len(rotatable)
    if shift == 0 and len(rotatable) > 1:
        shift = 1

    rotated = rotatable[shift:] + rotatable[:shift]
    return rotated + fixed


class QuestionnaireService:
    """Serviço de domínio para gestão e renderização de questionários dinâmicos."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = QuestionnaireRepository(session)
        self._survey_repo = SurveyRepository(session)
        self._audit = AuditService(session)

    async def add_item(
        self,
        survey_id: UUID,
        payload: QuestionnaireItemCreateSchema,
        *,
        actor_id: UUID,
    ) -> QuestionnaireItemResponseSchema:
        """Adiciona uma pergunta ao questionário garantindo que a pesquisa está em DRAFT."""
        survey = await self._survey_repo.get_model_by_id(survey_id)
        if survey is None:
            raise NotFoundError("Pesquisa eleitoral não encontrada.")

        if survey.status != SurveyStatus.DRAFT.value:
            raise ConflictError(
                f"Questionário bloqueado: a pesquisa está em status '{survey.status}' "
                "e não permite adição ou modificação de perguntas."
            )

        existing_code = await self._repo.get_by_code(survey_id, payload.question_code)
        if existing_code is not None:
            raise ConflictError(
                f"Já existe uma pergunta com o código '{payload.question_code}' nesta pesquisa."
            )

        existing_order = await self._repo.get_by_order(survey_id, payload.order_index)
        if existing_order is not None:
            raise ConflictError(
                f"Já existe uma pergunta na posição ordinal {payload.order_index} nesta pesquisa."
            )

        created = await self._repo.create(survey_id, payload)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="questionnaires",
                action="QUESTIONNAIRE_ITEM_ADDED",
                payload_diff={
                    "survey_id": str(survey_id),
                    "question_id": str(created.id),
                    "question_code": created.question_code,
                    "question_type": created.question_type.value,
                    "rotate_options": created.rotate_options,
                },
            )
        )
        await self._session.commit()
        logger.info(
            "questionnaire_item_added",
            survey_id=str(survey_id),
            question_code=created.question_code,
            actor_id=str(actor_id),
        )
        return created

    async def list_items(
        self,
        survey_id: UUID,
        *,
        limit: int = 20,
        offset: int = 0,
        rotation_seed: str | None = None,
    ) -> PaginatedQuestionnaireItemsResponseSchema:
        """Lista perguntas aplicando rodízio de disco quando `rotation_seed` é informado."""
        survey = await self._survey_repo.get_model_by_id(survey_id)
        if survey is None:
            raise NotFoundError("Pesquisa eleitoral não encontrada.")

        items, total = await self._repo.list_by_survey_paginated(
            survey_id, limit=limit, offset=offset
        )

        if rotation_seed:
            rendered_items: list[QuestionnaireItemResponseSchema] = []
            for item in items:
                if item.rotate_options and item.options_schema:
                    rotated_opts = rotate_ballot_disc_options(
                        item.options_schema,
                        rotation_seed=rotation_seed,
                        question_code=item.question_code,
                    )
                    rendered_items.append(item.model_copy(update={"options_schema": rotated_opts}))
                else:
                    rendered_items.append(item)
            items = rendered_items

        page = (offset // limit) + 1
        has_next = (offset + len(items)) < total
        return PaginatedQuestionnaireItemsResponseSchema(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
            page=page,
            page_size=limit,
            has_next=has_next,
        )

    async def evaluate_skip_logic(
        self,
        survey_id: UUID,
        payload: EvaluateSkipLogicRequestSchema,
    ) -> EvaluateSkipLogicResponseSchema:
        """Calcula a próxima pergunta com base nas regras de Skip Logic ou sequência ordinal."""
        all_items = await self._repo.list_all_by_survey(survey_id)
        if not all_items:
            raise NotFoundError("Questionário vazio ou pesquisa não encontrada.")

        code_to_index = {item.question_code: idx for idx, item in enumerate(all_items)}
        normalized_current = payload.current_question_code.strip().upper()
        if normalized_current not in code_to_index:
            raise NotFoundError(f"Pergunta '{normalized_current}' não encontrada no questionário.")

        current_idx = code_to_index[normalized_current]
        current_item = all_items[current_idx]
        selected_code = payload.selected_option_code.strip().upper()

        for rule in current_item.skip_logic_rules:
            if rule.when_option_code == selected_code:
                target = rule.goto_question_code
                if target == END_INTERVIEW_SENTINEL:
                    return EvaluateSkipLogicResponseSchema(
                        current_question_code=normalized_current,
                        selected_option_code=selected_code,
                        next_question_code=END_INTERVIEW_SENTINEL,
                        is_skip_triggered=True,
                        ends_interview=True,
                    )
                if target not in code_to_index:
                    raise DomainError(
                        f"Destino de skip logic '{target}' não existe no questionário."
                    )
                if code_to_index[target] <= current_idx:
                    raise DomainError(
                        f"Destino de skip logic '{target}' deve ser posterior à pergunta atual."
                    )
                return EvaluateSkipLogicResponseSchema(
                    current_question_code=normalized_current,
                    selected_option_code=selected_code,
                    next_question_code=target,
                    is_skip_triggered=True,
                    ends_interview=False,
                )

        if current_idx + 1 < len(all_items):
            next_code = all_items[current_idx + 1].question_code
            return EvaluateSkipLogicResponseSchema(
                current_question_code=normalized_current,
                selected_option_code=selected_code,
                next_question_code=next_code,
                is_skip_triggered=False,
                ends_interview=False,
            )

        return EvaluateSkipLogicResponseSchema(
            current_question_code=normalized_current,
            selected_option_code=selected_code,
            next_question_code=END_INTERVIEW_SENTINEL,
            is_skip_triggered=False,
            ends_interview=True,
        )
