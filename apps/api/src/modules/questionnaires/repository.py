"""Repositório isolado de acesso a dados (SQLAlchemy Async) para itens de questionário."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.questionnaires.models import QuestionnaireItemModel
from src.modules.questionnaires.schemas import (
    QuestionnaireItemCreateSchema,
    QuestionnaireItemResponseSchema,
)


class QuestionnaireRepository:
    """Encapsula todas as operações de banco da tabela `questionnaire_items`."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_code(
        self, survey_id: UUID, question_code: str
    ) -> QuestionnaireItemModel | None:
        """Busca item de questionário pelo código dentro de uma pesquisa."""
        normalized_code = question_code.strip().upper()
        stmt = select(QuestionnaireItemModel).where(
            QuestionnaireItemModel.survey_id == survey_id,
            QuestionnaireItemModel.question_code == normalized_code,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_order(
        self, survey_id: UUID, order_index: int
    ) -> QuestionnaireItemModel | None:
        """Busca item de questionário pela posição ordinal dentro da pesquisa."""
        stmt = select(QuestionnaireItemModel).where(
            QuestionnaireItemModel.survey_id == survey_id,
            QuestionnaireItemModel.order_index == order_index,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(
        self, survey_id: UUID, payload: QuestionnaireItemCreateSchema
    ) -> QuestionnaireItemResponseSchema:
        """Persiste novo item de questionário serializando opções e skip logic."""
        entity = QuestionnaireItemModel(
            survey_id=survey_id,
            order_index=payload.order_index,
            question_code=payload.question_code.strip().upper(),
            question_type=payload.question_type.value,
            prompt_text=payload.prompt_text.strip(),
            rotate_options=payload.rotate_options,
            options_schema=[opt.model_dump() for opt in payload.options_schema],
            skip_logic_rules=[rule.model_dump() for rule in payload.skip_logic_rules],
        )
        self._session.add(entity)
        await self._session.flush()
        await self._session.refresh(entity)
        return QuestionnaireItemResponseSchema.model_validate(entity)

    async def list_by_survey_paginated(
        self, survey_id: UUID, *, limit: int, offset: int
    ) -> tuple[list[QuestionnaireItemResponseSchema], int]:
        """Lista os itens do questionário ordenados por `order_index` ASC."""
        count_stmt = (
            select(func.count())
            .select_from(QuestionnaireItemModel)
            .where(QuestionnaireItemModel.survey_id == survey_id)
        )
        total = int((await self._session.execute(count_stmt)).scalar_one())

        stmt = (
            select(QuestionnaireItemModel)
            .where(QuestionnaireItemModel.survey_id == survey_id)
            .order_by(QuestionnaireItemModel.order_index.asc())
            .limit(limit)
            .offset(offset)
        )
        rows = (await self._session.execute(stmt)).scalars().all()
        items = [QuestionnaireItemResponseSchema.model_validate(row) for row in rows]
        return items, total

    async def list_all_by_survey(self, survey_id: UUID) -> list[QuestionnaireItemResponseSchema]:
        """Retorna todos os itens de uma pesquisa ordenados por `order_index` ASC."""
        stmt = (
            select(QuestionnaireItemModel)
            .where(QuestionnaireItemModel.survey_id == survey_id)
            .order_by(QuestionnaireItemModel.order_index.asc())
        )
        rows = (await self._session.execute(stmt)).scalars().all()
        return [QuestionnaireItemResponseSchema.model_validate(row) for row in rows]
