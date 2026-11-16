"""Serviço de Exportação do Pacote Oficial TSE (PesqEle) com hash SHA-256."""

import hashlib
import json
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import DomainError, NotFoundError
from src.modules.analytics.schemas import (
    QuestionTabulationResponseSchema,
    TseExportPackageResponseSchema,
)
from src.modules.analytics.service import AnalyticsService
from src.modules.questionnaires.repository import QuestionnaireRepository
from src.modules.surveys.repository import SurveyRepository


class TseExportService:
    """Serviço especializado em consolidar e assinar o pacote oficial TSE (PesqEle)."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._survey_repo = SurveyRepository(session)
        self._question_repo = QuestionnaireRepository(session)
        self._analytics = AnalyticsService(session)

    async def export_tse_package(self, survey_id: UUID) -> TseExportPackageResponseSchema:
        """Gera o pacote oficial auditável do TSE (PesqEle) com hash de integridade SHA-256."""
        survey = await self._survey_repo.get_model_by_id(survey_id)
        if survey is None:
            raise NotFoundError("Pesquisa eleitoral não encontrada.")

        all_questions = await self._question_repo.list_all_by_survey(survey_id)
        tabulations: list[QuestionTabulationResponseSchema] = []
        for q in all_questions:
            tabulations.append(await self._analytics.tabulate_question(survey_id, q.question_code))

        if not tabulations:
            raise DomainError("A pesquisa não possui perguntas tabuladas para exportação TSE.")

        first_tab = tabulations[0]
        digest_payload = json.dumps(
            {
                "tse_protocol_number": survey.tse_protocol_number,
                "executed_n": first_tab.total_valid_interviews,
                "kish_deff": str(first_tab.kish_deff),
                "questions": [t.model_dump(mode="json") for t in tabulations],
            },
            sort_keys=True,
        )
        sha_digest = hashlib.sha256(digest_payload.encode("utf-8")).hexdigest()

        return TseExportPackageResponseSchema(
            survey_id=survey_id,
            tse_protocol_number=survey.tse_protocol_number,
            title=survey.title,
            statistician_conre=survey.statistician_conre,
            planned_sample_size=survey.planned_sample_size,
            executed_valid_sample_size=first_tab.total_valid_interviews,
            kish_deff=first_tab.kish_deff,
            effective_sample_size=first_tab.effective_sample_size,
            nominal_margin_of_error=survey.margin_of_error,
            deff_adjusted_margin_of_error=first_tab.adjusted_margin_of_error,
            confidence_level=survey.confidence_level,
            generated_at=datetime.now(UTC),
            questions_tabulation=tabulations,
            integrity_sha256_digest=sha_digest,
        )
