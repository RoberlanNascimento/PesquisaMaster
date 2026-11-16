"""Serviço de Ponderação Raking (IPF), Tabulação TSE e Tabelas de Contingência (Crosstabs)."""

from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import DomainError, NotFoundError
from src.modules.analytics.raking import (
    compute_kish_deff,
    run_iterative_proportional_fitting,
)
from src.modules.analytics.repository import AnalyticsRepository
from src.modules.analytics.schemas import (
    CrosstabCellSchema,
    CrosstabResponseSchema,
    OptionTabulationItemSchema,
    QuestionTabulationResponseSchema,
    RakingExecutionRequestSchema,
    RakingExecutionResponseSchema,
)
from src.modules.audit.schemas import AuditLogCreateSchema
from src.modules.audit.service import AuditService
from src.modules.questionnaires.repository import QuestionnaireRepository
from src.modules.surveys.repository import SurveyRepository

NON_VALID_VOTE_CODES = frozenset({"BRANCO_NULO", "BRANCO", "NULO", "NS_NR", "INDECISO", "NENHUM"})
ALLOWED_DEMOGRAPHIC_DIMENSIONS = frozenset(
    {"gender", "age_bracket", "education_level", "income_bracket"}
)
FOUR_DECIMALS = Decimal("0.0001")


class AnalyticsService:
    """Serviço de domínio para Raking (IPF), Tabulação TSE e Crosstabs."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = AnalyticsRepository(session)
        self._survey_repo = SurveyRepository(session)
        self._question_repo = QuestionnaireRepository(session)
        self._audit = AuditService(session)

    async def execute_raking(
        self,
        survey_id: UUID,
        payload: RakingExecutionRequestSchema,
        *,
        actor_id: UUID,
    ) -> RakingExecutionResponseSchema:
        """Executa pós-estratificação IPF nas entrevistas VALID, grava pesos e calcula DEFF."""
        survey = await self._survey_repo.get_model_by_id(survey_id)
        if survey is None:
            raise NotFoundError("Pesquisa eleitoral não encontrada.")

        pairs = await self._repo.get_valid_interviews_with_demographics(survey_id)
        if not pairs:
            raise DomainError("Não existem entrevistas válidas para ponderar nesta pesquisa.")

        interview_margins: list[dict[str, str]] = [
            {
                "gender": cell.gender,
                "age_bracket": cell.age_bracket,
                "education_level": cell.education_level,
                "income_bracket": cell.income_bracket,
            }
            for _, cell in pairs
        ]

        weights, iterations, converged, max_delta = run_iterative_proportional_fitting(
            interview_margins=interview_margins,
            target_marginal_proportions=payload.target_margins,
            max_iterations=payload.max_iterations,
            convergence_tolerance=payload.convergence_tolerance,
            min_weight_cap=payload.min_weight_cap,
            max_weight_cap=payload.max_weight_cap,
        )

        await self._repo.update_interview_weights(
            [(pairs[i][0], weights[i]) for i in range(len(pairs))]
        )
        deff, eff_n = compute_kish_deff(weights)

        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="analytics",
                action="RAKING_IPF_EXECUTED",
                payload_diff={
                    "survey_id": str(survey_id),
                    "valid_interviews": len(pairs),
                    "iterations_run": iterations,
                    "converged": converged,
                    "kish_deff": str(deff),
                    "effective_sample_size": str(eff_n),
                },
            )
        )
        await self._session.commit()
        return RakingExecutionResponseSchema(
            survey_id=survey_id,
            valid_interviews_weighted=len(pairs),
            iterations_run=iterations,
            converged=converged,
            max_abs_delta=max_delta,
            kish_deff=deff,
            effective_sample_size=eff_n,
            min_weight_applied=min(weights),
            max_weight_applied=max(weights),
        )

    async def tabulate_question(
        self, survey_id: UUID, question_code: str
    ) -> QuestionTabulationResponseSchema:
        """Tabula Votos Totais, Votos Válidos (excluindo Brancos/Nulos/NS-NR) e Margem Ajustada."""
        survey = await self._survey_repo.get_model_by_id(survey_id)
        if survey is None:
            raise NotFoundError("Pesquisa eleitoral não encontrada.")

        q_model = await self._question_repo.get_by_code(survey_id, question_code)
        if q_model is None:
            raise NotFoundError(f"Pergunta '{question_code}' não encontrada na pesquisa.")

        rows = await self._repo.get_answers_with_weights_and_demographics(survey_id, q_model.id)
        if not rows:
            raise DomainError("Não há respostas válidas para tabular nesta pergunta.")

        weights = [w for _, w, _ in rows]
        deff, eff_n = compute_kish_deff(weights)
        adjusted_moe = (survey.margin_of_error * deff.sqrt()).quantize(FOUR_DECIMALS)

        label_map = {str(opt["code"]): str(opt["label"]) for opt in q_model.options_schema}
        fixed_map = {
            str(opt["code"]): bool(opt.get("is_fixed", False)) for opt in q_model.options_schema
        }

        raw_counts: dict[str, int] = {}
        weighted_counts: dict[str, Decimal] = {}
        for code, w, _ in rows:
            raw_counts[code] = raw_counts.get(code, 0) + 1
            weighted_counts[code] = weighted_counts.get(code, Decimal("0")) + w

        total_weighted = sum(weighted_counts.values(), Decimal("0"))
        valid_vote_weighted = sum(
            (
                w_sum
                for code, w_sum in weighted_counts.items()
                if code not in NON_VALID_VOTE_CODES and not fixed_map.get(code, False)
            ),
            Decimal("0"),
        )

        option_items: list[OptionTabulationItemSchema] = []
        for code, w_sum in sorted(weighted_counts.items(), key=lambda kv: (-kv[1], kv[0])):
            is_non_valid = code in NON_VALID_VOTE_CODES or fixed_map.get(code, False)
            tot_pct = (
                ((w_sum / total_weighted) * Decimal("100.0000")).quantize(FOUR_DECIMALS)
                if total_weighted > Decimal("0")
                else Decimal("0.0000")
            )
            val_pct: Decimal | None = None
            if not is_non_valid and valid_vote_weighted > Decimal("0"):
                val_pct = ((w_sum / valid_vote_weighted) * Decimal("100.0000")).quantize(
                    FOUR_DECIMALS
                )

            option_items.append(
                OptionTabulationItemSchema(
                    option_code=code,
                    option_label=label_map.get(code, code),
                    is_non_valid_option=is_non_valid,
                    raw_count=raw_counts[code],
                    weighted_count=w_sum.quantize(FOUR_DECIMALS),
                    total_votes_percentage=tot_pct,
                    valid_votes_percentage=val_pct,
                )
            )

        return QuestionTabulationResponseSchema(
            survey_id=survey_id,
            question_id=q_model.id,
            question_code=q_model.question_code,
            question_type=q_model.question_type,
            total_valid_interviews=len(rows),
            kish_deff=deff,
            effective_sample_size=eff_n,
            adjusted_margin_of_error=adjusted_moe,
            options=option_items,
        )

    async def generate_crosstab(
        self, survey_id: UUID, question_code: str, dimension: str
    ) -> CrosstabResponseSchema:
        """Gera tabela de contingência (Crosstab) cruzando pergunta por variável demográfica."""
        dim_clean = dimension.strip().lower()
        if dim_clean not in ALLOWED_DEMOGRAPHIC_DIMENSIONS:
            raise DomainError(
                f"Dimensão demográfica inválida: '{dimension}'. "
                f"Use uma de: {sorted(ALLOWED_DEMOGRAPHIC_DIMENSIONS)}."
            )

        q_model = await self._question_repo.get_by_code(survey_id, question_code)
        if q_model is None:
            raise NotFoundError(f"Pergunta '{question_code}' não encontrada.")

        rows = await self._repo.get_answers_with_weights_and_demographics(survey_id, q_model.id)
        bucket_raw: dict[tuple[str, str], int] = {}
        bucket_weight: dict[tuple[str, str], Decimal] = {}
        dim_totals: dict[str, Decimal] = {}

        for opt_code, w, cell in rows:
            dem_cat = str(getattr(cell, dim_clean))
            key = (dem_cat, opt_code)
            bucket_raw[key] = bucket_raw.get(key, 0) + 1
            bucket_weight[key] = bucket_weight.get(key, Decimal("0")) + w
            dim_totals[dem_cat] = dim_totals.get(dem_cat, Decimal("0")) + w

        cells: list[CrosstabCellSchema] = []
        for (dem_cat, opt_code), w_sum in sorted(bucket_weight.items()):
            denom = dim_totals.get(dem_cat, Decimal("0"))
            pct = (
                ((w_sum / denom) * Decimal("100.0000")).quantize(FOUR_DECIMALS)
                if denom > Decimal("0")
                else Decimal("0.0000")
            )
            cells.append(
                CrosstabCellSchema(
                    demographic_category=dem_cat,
                    option_code=opt_code,
                    raw_count=bucket_raw[(dem_cat, opt_code)],
                    weighted_count=w_sum.quantize(FOUR_DECIMALS),
                    within_demographic_percentage=pct,
                )
            )

        return CrosstabResponseSchema(
            survey_id=survey_id,
            question_code=q_model.question_code,
            demographic_dimension=dim_clean,
            total_interviews=len(rows),
            cells=cells,
        )
