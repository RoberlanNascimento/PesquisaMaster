"""Repositório analítico SQL para Raking, Tabulação TSE e Tabelas de Contingência (Crosstabs)."""

from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.fieldwork.models import (
    InterviewAnswerModel,
    InterviewAuditStatus,
    InterviewModel,
)
from src.modules.sampling.models import QuotaCellModel


class AnalyticsRepository:
    """Executa consultas analíticas juntando entrevistas válidas, cotas e respostas."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_valid_interviews_with_demographics(
        self, survey_id: UUID
    ) -> list[tuple[InterviewModel, QuotaCellModel]]:
        """Retorna todas as entrevistas VALID da pesquisa com sua célula demográfica."""
        stmt = (
            select(InterviewModel, QuotaCellModel)
            .join(QuotaCellModel, InterviewModel.quota_cell_id == QuotaCellModel.id)
            .where(
                InterviewModel.survey_id == survey_id,
                InterviewModel.audit_status == InterviewAuditStatus.VALID.value,
            )
            .order_by(InterviewModel.id.asc())
        )
        rows = (await self._session.execute(stmt)).all()
        return [(interview, cell) for interview, cell in rows]

    async def update_interview_weights(
        self, weighted_pairs: list[tuple[InterviewModel, Decimal]]
    ) -> None:
        """Atualiza o peso `raking_weight` das entrevistas válidas na sessão."""
        for interview, weight in weighted_pairs:
            interview.raking_weight = weight
            self._session.add(interview)
        await self._session.flush()

    async def get_answers_with_weights_and_demographics(
        self, survey_id: UUID, question_id: UUID
    ) -> list[tuple[str, Decimal, QuotaCellModel]]:
        """Retorna `(option_code, raking_weight, quota_cell)` das entrevistas VALID."""
        stmt = (
            select(
                InterviewAnswerModel.selected_option_code,
                InterviewModel.raking_weight,
                QuotaCellModel,
            )
            .join(InterviewModel, InterviewAnswerModel.interview_id == InterviewModel.id)
            .join(QuotaCellModel, InterviewModel.quota_cell_id == QuotaCellModel.id)
            .where(
                InterviewModel.survey_id == survey_id,
                InterviewModel.audit_status == InterviewAuditStatus.VALID.value,
                InterviewAnswerModel.question_id == question_id,
            )
        )
        rows = (await self._session.execute(stmt)).all()
        results: list[tuple[str, Decimal, QuotaCellModel]] = []
        for opt_code, weight, cell in rows:
            code_str = (opt_code or "ESPONTANEO_OUTROS").strip().upper()
            results.append((code_str, Decimal(str(weight)), cell))
        return results
