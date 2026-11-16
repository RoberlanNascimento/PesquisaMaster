"""Motor Matemático de Amostragem Estratificada e Alocação Inteira (Hare-Niemeyer)."""

from decimal import ROUND_DOWN, Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import ConflictError, DomainError, NotFoundError
from src.core.logging import get_logger
from src.modules.audit.schemas import AuditLogCreateSchema
from src.modules.audit.service import AuditService
from src.modules.sampling.repository import SamplingRepository
from src.modules.sampling.schemas import (
    AllocateQuotaCellsRequestSchema,
    AllocateStrataRequestSchema,
    PaginatedQuotaCellsResponseSchema,
    PaginatedStrataResponseSchema,
    QuotaCellResponseSchema,
    SampleStratumResponseSchema,
)
from src.modules.surveys.models import SurveyStatus
from src.modules.surveys.repository import SurveyRepository

logger = get_logger("modules.sampling.service")

FOUR_DECIMALS = Decimal("0.0001")


def allocate_hare_niemeyer(
    total_target: int,
    proportions: list[Decimal],
) -> tuple[list[int], list[Decimal]]:
    """Aloca cotas inteiras pelo Método de Maior Resto (Hare-Niemeyer) usando Decimal estrito.

    Garante matematicamente que sum(allocated_counts) == total_target.
    Retorna `(allocated_counts, normalized_unit_proportions)`.
    """
    if total_target < 0:
        raise DomainError("O total amostral para alocação não pode ser negativo.")
    if not proportions:
        raise DomainError("A lista de proporções para alocação não pode ser vazia.")

    sum_props = sum(proportions, Decimal("0.0000"))
    if sum_props <= Decimal("0.0000"):
        raise DomainError("A soma das proporções deve ser maior que zero.")

    normalized_props = [(p / sum_props).quantize(FOUR_DECIMALS) for p in proportions]

    # Ajuste fino no último elemento para garantir soma unitária exata 1.0000
    diff_norm = Decimal("1.0000") - sum(normalized_props, Decimal("0.0000"))
    normalized_props[-1] = (normalized_props[-1] + diff_norm).quantize(FOUR_DECIMALS)

    total_dec = Decimal(total_target)
    exact_quotas: list[Decimal] = [(p / sum_props) * total_dec for p in proportions]
    integer_parts: list[int] = [int(q.to_integral_value(rounding=ROUND_DOWN)) for q in exact_quotas]
    remainders: list[tuple[Decimal, Decimal, int]] = [
        (exact_quotas[i] - Decimal(integer_parts[i]), proportions[i], i)
        for i in range(len(proportions))
    ]

    remaining_seats = total_target - sum(integer_parts)
    # Ordena: 1) Maior resto DESC, 2) Maior proporção original DESC, 3) Menor índice ASC
    remainders.sort(key=lambda item: (-item[0], -item[1], item[2]))

    for k in range(remaining_seats):
        winner_idx = remainders[k][2]
        integer_parts[winner_idx] += 1

    return integer_parts, normalized_props


class SamplingService:
    """Serviço de domínio para alocação estratificada e células de cota."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = SamplingRepository(session)
        self._survey_repo = SurveyRepository(session)
        self._audit = AuditService(session)

    async def allocate_survey_strata(
        self,
        survey_id: UUID,
        payload: AllocateStrataRequestSchema,
        *,
        actor_id: UUID,
    ) -> list[SampleStratumResponseSchema]:
        """Calcula e grava os estratos amostrais garantindo soma == planned_sample_size."""
        survey = await self._survey_repo.get_model_by_id(survey_id)
        if survey is None:
            raise NotFoundError("Pesquisa eleitoral não encontrada.")

        if survey.status != SurveyStatus.DRAFT.value:
            raise ConflictError(
                f"Plano amostral bloqueado: a pesquisa está em status '{survey.status}'."
            )

        proportions = [s.population_proportion for s in payload.strata]
        counts, norm_props = allocate_hare_niemeyer(survey.planned_sample_size, proportions)

        rows_to_save: list[tuple[str, str, dict[str, Any] | None, Decimal, int]] = []
        for idx, item in enumerate(payload.strata):
            rows_to_save.append(
                (
                    item.region_code.strip().upper(),
                    item.geographic_name.strip(),
                    item.boundary_geom,
                    norm_props[idx],
                    counts[idx],
                )
            )

        saved_strata = await self._repo.replace_survey_strata(survey_id, rows_to_save)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="sampling",
                action="STRATA_ALLOCATED_HARE_NIEMEYER",
                payload_diff={
                    "survey_id": str(survey_id),
                    "planned_sample_size": survey.planned_sample_size,
                    "strata_count": len(saved_strata),
                    "allocated_sum": sum(s.target_interviews for s in saved_strata),
                },
            )
        )
        await self._session.commit()
        logger.info(
            "strata_allocated",
            survey_id=str(survey_id),
            strata_count=len(saved_strata),
            total_allocated=sum(counts),
        )
        return saved_strata

    async def list_survey_strata(
        self, survey_id: UUID, *, limit: int = 20, offset: int = 0
    ) -> PaginatedStrataResponseSchema:
        """Lista os estratos amostrais de uma pesquisa."""
        survey = await self._survey_repo.get_model_by_id(survey_id)
        if survey is None:
            raise NotFoundError("Pesquisa eleitoral não encontrada.")

        items, total = await self._repo.list_strata_paginated(survey_id, limit=limit, offset=offset)
        page = (offset // limit) + 1
        has_next = (offset + len(items)) < total
        return PaginatedStrataResponseSchema(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
            page=page,
            page_size=limit,
            has_next=has_next,
        )

    async def allocate_stratum_quota_cells(
        self,
        survey_id: UUID,
        stratum_id: UUID,
        payload: AllocateQuotaCellsRequestSchema,
        *,
        actor_id: UUID,
    ) -> list[QuotaCellResponseSchema]:
        """Subdivide a meta do estrato em células demográficas via Hare-Niemeyer."""
        survey = await self._survey_repo.get_model_by_id(survey_id)
        if survey is None:
            raise NotFoundError("Pesquisa eleitoral não encontrada.")

        if survey.status != SurveyStatus.DRAFT.value:
            raise ConflictError(f"Cotas bloqueadas: a pesquisa está em status '{survey.status}'.")

        stratum = await self._repo.get_stratum_model_by_id(stratum_id)
        if stratum is None or stratum.survey_id != survey_id:
            raise NotFoundError("Estrato amostral não encontrado nesta pesquisa.")

        proportions = [c.target_proportion for c in payload.cells]
        counts, norm_props = allocate_hare_niemeyer(stratum.target_interviews, proportions)

        cells_to_save: list[tuple[str, str, str, str, Decimal, int]] = []
        for idx, cell in enumerate(payload.cells):
            cells_to_save.append(
                (
                    cell.gender.strip().upper(),
                    cell.age_bracket.strip().upper(),
                    cell.education_level.strip().upper(),
                    cell.income_bracket.strip().upper(),
                    norm_props[idx],
                    counts[idx],
                )
            )

        saved_cells = await self._repo.replace_stratum_quota_cells(stratum_id, cells_to_save)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="sampling",
                action="QUOTA_CELLS_ALLOCATED_HARE_NIEMEYER",
                payload_diff={
                    "survey_id": str(survey_id),
                    "stratum_id": str(stratum_id),
                    "stratum_target": stratum.target_interviews,
                    "cells_count": len(saved_cells),
                    "allocated_sum": sum(c.target_count for c in saved_cells),
                },
            )
        )
        await self._session.commit()
        return saved_cells

    async def list_stratum_quota_cells(
        self,
        survey_id: UUID,
        stratum_id: UUID,
        *,
        limit: int = 20,
        offset: int = 0,
    ) -> PaginatedQuotaCellsResponseSchema:
        """Lista as células demográficas de cota de um estrato."""
        stratum = await self._repo.get_stratum_model_by_id(stratum_id)
        if stratum is None or stratum.survey_id != survey_id:
            raise NotFoundError("Estrato amostral não encontrado nesta pesquisa.")

        items, total = await self._repo.list_quota_cells_paginated(
            stratum_id, limit=limit, offset=offset
        )
        page = (offset // limit) + 1
        has_next = (offset + len(items)) < total
        return PaginatedQuotaCellsResponseSchema(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
            page=page,
            page_size=limit,
            has_next=has_next,
        )
