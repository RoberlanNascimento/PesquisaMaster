"""Contratos Pydantic v2 para o Agregador de Pesquisas Eleitorais (Polling Aggregator)."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PollInstituteCreateSchema(BaseModel):
    """Contrato de cadastro de instituto de pesquisa e rating metodológico."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    name: str = Field(min_length=2, max_length=255)
    cnpj: str = Field(min_length=11, max_length=32)
    methodological_weight: Decimal = Field(
        default=Decimal("1.0000"),
        gt=Decimal("0.0500"),
        le=Decimal("5.0000"),
        decimal_places=4,
    )
    house_effect_adjustment: Decimal = Field(
        default=Decimal("0.0000"),
        ge=Decimal("-10.0000"),
        le=Decimal("10.0000"),
        decimal_places=4,
    )


class PollInstituteResponseSchema(BaseModel):
    """Contrato de resposta de um instituto de pesquisa."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    name: str
    cnpj: str
    methodological_weight: Decimal
    house_effect_adjustment: Decimal
    created_at: datetime


class PaginatedInstitutesResponseSchema(BaseModel):
    """Envelope paginado padrão de institutos."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    items: list[PollInstituteResponseSchema]
    total: int
    limit: int
    offset: int
    page: int
    page_size: int
    has_next: bool


class ExternalPollCreateSchema(BaseModel):
    """Contrato para registro de pesquisa no agregador."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    institute_id: UUID
    tse_protocol_number: str = Field(
        min_length=5,
        max_length=64,
        pattern=r"^[A-Z]{2}-\d{5}/\d{4}$",
    )
    field_median_date: date
    sample_size: int = Field(ge=100, le=200_000)
    margin_of_error: Decimal = Field(gt=Decimal("0.0000"), le=Decimal("15.0000"), decimal_places=4)
    candidate_results: dict[str, Decimal] = Field(min_length=1)


class ExternalPollResponseSchema(BaseModel):
    """Contrato de resposta de uma pesquisa externa registrada."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    institute_id: UUID
    tse_protocol_number: str
    field_median_date: date
    sample_size: int
    margin_of_error: Decimal
    candidate_results: dict[str, Decimal]
    created_at: datetime


class PaginatedExternalPollsResponseSchema(BaseModel):
    """Envelope paginado padrão de pesquisas externas."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    items: list[ExternalPollResponseSchema]
    total: int
    limit: int
    offset: int
    page: int
    page_size: int
    has_next: bool


class CandidateAggregateItemSchema(BaseModel):
    """Estimativa agregada de um candidato com banda de confiança."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    candidate_code: str
    weighted_average_pct: Decimal
    confidence_band_low: Decimal
    confidence_band_high: Decimal


class PollingAggregateResponseSchema(BaseModel):
    """Resultado consolidado do Motor de Média Móvel Ponderada do Agregador."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    reference_date: date
    half_life_days: Decimal
    polls_included: int
    total_combined_sample: int
    candidates: list[CandidateAggregateItemSchema]
