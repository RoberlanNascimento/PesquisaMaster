"""Motor de Média Móvel Ponderada (Peso por sqrt(N), Decaimento Exponencial e House Effects)."""

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import ConflictError, DomainError, NotFoundError
from src.modules.aggregator.repository import AggregatorRepository
from src.modules.aggregator.schemas import (
    CandidateAggregateItemSchema,
    ExternalPollCreateSchema,
    ExternalPollResponseSchema,
    PaginatedExternalPollsResponseSchema,
    PaginatedInstitutesResponseSchema,
    PollingAggregateResponseSchema,
    PollInstituteCreateSchema,
    PollInstituteResponseSchema,
)
from src.modules.audit.schemas import AuditLogCreateSchema
from src.modules.audit.service import AuditService

FOUR_DECIMALS = Decimal("0.0001")
LN_2 = Decimal("0.69314718")
BASELINE_SAMPLE_N = Decimal("1000")


def compute_poll_composite_weight(
    *,
    sample_size: int,
    days_elapsed: int,
    half_life_days: Decimal,
    methodological_weight: Decimal,
) -> Decimal:
    """Calcula o peso composto de uma pesquisa usando Decimal puro (sem float).

    Fórmula:
        w_sample = sqrt(N / 1000)
        w_decay  = exp(-ln(2) * max(0, days_elapsed) / half_life_days)
        W_total  = w_sample * w_decay * methodological_weight
    """
    n_ratio = Decimal(sample_size) / BASELINE_SAMPLE_N
    w_sample = n_ratio.sqrt()
    safe_days = Decimal(max(0, days_elapsed))
    exponent = -(LN_2 * safe_days) / half_life_days
    w_decay = exponent.exp()
    return w_sample * w_decay * methodological_weight


class AggregatorService:
    """Serviço de domínio do Agregador de Pesquisas Eleitorais."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = AggregatorRepository(session)
        self._audit = AuditService(session)

    async def register_institute(
        self, payload: PollInstituteCreateSchema, *, actor_id: UUID
    ) -> PollInstituteResponseSchema:
        """Cadastra instituto de pesquisa e seu peso metodológico / house effect."""
        existing = await self._repo.get_institute_by_name_or_cnpj(payload.name, payload.cnpj)
        if existing is not None:
            raise ConflictError("Já existe um instituto com este nome ou CNPJ.")

        created = await self._repo.create_institute(payload)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="aggregator",
                action="INSTITUTE_REGISTERED",
                payload_diff={
                    "institute_id": str(created.id),
                    "name": created.name,
                    "methodological_weight": str(created.methodological_weight),
                },
            )
        )
        await self._session.commit()
        return created

    async def list_institutes(
        self, *, limit: int = 20, offset: int = 0
    ) -> PaginatedInstitutesResponseSchema:
        """Lista institutos paginados."""
        items, total = await self._repo.list_institutes_paginated(limit=limit, offset=offset)
        page = (offset // limit) + 1
        has_next = (offset + len(items)) < total
        return PaginatedInstitutesResponseSchema(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
            page=page,
            page_size=limit,
            has_next=has_next,
        )

    async def register_external_poll(
        self, payload: ExternalPollCreateSchema, *, actor_id: UUID
    ) -> ExternalPollResponseSchema:
        """Registra pesquisa externa no agregador validando instituto e protocolo único."""
        inst = await self._repo.get_institute_by_id(payload.institute_id)
        if inst is None:
            raise NotFoundError("Instituto de pesquisa não encontrado.")

        existing = await self._repo.get_poll_by_protocol(payload.tse_protocol_number)
        if existing is not None:
            raise ConflictError(
                f"Pesquisa '{payload.tse_protocol_number}' já cadastrada no agregador."
            )

        created = await self._repo.create_external_poll(payload)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="aggregator",
                action="EXTERNAL_POLL_REGISTERED",
                payload_diff={
                    "poll_id": str(created.id),
                    "tse_protocol_number": created.tse_protocol_number,
                    "sample_size": created.sample_size,
                },
            )
        )
        await self._session.commit()
        return created

    async def list_external_polls(
        self, *, limit: int = 20, offset: int = 0
    ) -> PaginatedExternalPollsResponseSchema:
        """Lista pesquisas externas paginadas."""
        items, total = await self._repo.list_polls_paginated(limit=limit, offset=offset)
        page = (offset // limit) + 1
        has_next = (offset + len(items)) < total
        return PaginatedExternalPollsResponseSchema(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
            page=page,
            page_size=limit,
            has_next=has_next,
        )

    async def compute_weighted_moving_average(
        self,
        *,
        reference_date: date | None = None,
        half_life_days: Decimal = Decimal("14.0000"),
    ) -> PollingAggregateResponseSchema:
        """Calcula a média móvel ponderada por sqrt(N), decaimento temporal e House Effects."""
        pairs = await self._repo.list_all_polls_with_institutes()
        if not pairs:
            raise DomainError("Não existem pesquisas cadastradas no agregador.")

        ref_date = reference_date or max(p.field_median_date for p, _ in pairs)
        cand_weighted_sums: dict[str, Decimal] = {}
        cand_weight_totals: dict[str, Decimal] = {}
        moe_weighted_sum = Decimal("0")
        total_w_all = Decimal("0")
        combined_sample = 0

        for poll, inst in pairs:
            days_elapsed = (ref_date - poll.field_median_date).days
            w_poll = compute_poll_composite_weight(
                sample_size=poll.sample_size,
                days_elapsed=days_elapsed,
                half_life_days=half_life_days,
                methodological_weight=inst.methodological_weight,
            )
            combined_sample += poll.sample_size
            moe_weighted_sum += poll.margin_of_error * w_poll
            total_w_all += w_poll

            for cand_code, raw_val in poll.candidate_results.items():
                code_upper = cand_code.strip().upper()
                pct_dec = Decimal(str(raw_val))
                # Aplica correção de viés de casa (House Effect)
                adjusted_pct = max(Decimal("0.0000"), pct_dec - inst.house_effect_adjustment)
                cand_weighted_sums[code_upper] = cand_weighted_sums.get(
                    code_upper, Decimal("0")
                ) + (adjusted_pct * w_poll)
                cand_weight_totals[code_upper] = (
                    cand_weight_totals.get(code_upper, Decimal("0")) + w_poll
                )

        avg_band = (
            (moe_weighted_sum / total_w_all) / Decimal(len(pairs)).sqrt()
            if total_w_all > Decimal("0")
            else Decimal("2.0000")
        ).quantize(FOUR_DECIMALS)

        candidates_out: list[CandidateAggregateItemSchema] = []
        for code, w_sum in sorted(cand_weighted_sums.items(), key=lambda kv: (-kv[1], kv[0])):
            denom = cand_weight_totals[code]
            avg_pct = (w_sum / denom).quantize(FOUR_DECIMALS)
            low = max(Decimal("0.0000"), (avg_pct - avg_band).quantize(FOUR_DECIMALS))
            high = min(Decimal("100.0000"), (avg_pct + avg_band).quantize(FOUR_DECIMALS))
            candidates_out.append(
                CandidateAggregateItemSchema(
                    candidate_code=code,
                    weighted_average_pct=avg_pct,
                    confidence_band_low=low,
                    confidence_band_high=high,
                )
            )

        return PollingAggregateResponseSchema(
            reference_date=ref_date,
            half_life_days=half_life_days.quantize(FOUR_DECIMALS),
            polls_included=len(pairs),
            total_combined_sample=combined_sample,
            candidates=candidates_out,
        )
