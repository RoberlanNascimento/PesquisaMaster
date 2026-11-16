"""Contratos Pydantic v2 para Pesquisas Eleitorais (TSE / PesqEle) e travamento de status."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from src.modules.surveys.models import ElectionSphere, SurveyStatus


class SurveyCreateSchema(BaseModel):
    """Contrato de criação de pesquisa eleitoral com metadados obrigatórios do TSE."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    tse_protocol_number: str = Field(
        min_length=5,
        max_length=64,
        pattern=r"^[A-Z]{2}-\d{5}/\d{4}$",
        description="Protocolo PesqEle TSE no formato UF-NNNNN/AAAA (ex: SP-01234/2026).",
    )
    title: str = Field(min_length=5, max_length=255)
    election_sphere: ElectionSphere
    target_uf: str = Field(min_length=2, max_length=2, pattern=r"^[A-Z]{2}$")
    target_municipality_ibge: str | None = Field(
        default=None, min_length=7, max_length=7, pattern=r"^\d{7}$"
    )
    contracting_entity_doc: str = Field(min_length=11, max_length=32)
    statistician_conre: str = Field(min_length=4, max_length=64)
    planned_sample_size: int = Field(ge=50, le=100_000)
    confidence_level: Decimal = Field(
        ge=Decimal("80.0000"),
        le=Decimal("99.9900"),
        decimal_places=4,
    )
    margin_of_error: Decimal = Field(
        gt=Decimal("0.0000"),
        le=Decimal("15.0000"),
        decimal_places=4,
    )
    field_start_at: datetime
    field_end_at: datetime

    @model_validator(mode="after")
    def validate_tse_rules(self) -> "SurveyCreateSchema":
        """Valida regras de consistência geográfica e temporal do TSE."""
        if self.election_sphere == ElectionSphere.MUNICIPAL and not self.target_municipality_ibge:
            raise ValueError(
                "Pesquisas municipais exigem o código IBGE de 7 dígitos (target_municipality_ibge)."
            )
        if self.field_end_at <= self.field_start_at:
            raise ValueError(
                "A data de encerramento de campo (field_end_at) deve ser posterior ao início."
            )
        return self


class SurveyUpdateSchema(BaseModel):
    """Contrato de edição parcial permitido exclusivamente enquanto status == DRAFT."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    title: str | None = Field(default=None, min_length=5, max_length=255)
    contracting_entity_doc: str | None = Field(default=None, min_length=11, max_length=32)
    statistician_conre: str | None = Field(default=None, min_length=4, max_length=64)
    planned_sample_size: int | None = Field(default=None, ge=50, le=100_000)
    confidence_level: Decimal | None = Field(
        default=None,
        ge=Decimal("80.0000"),
        le=Decimal("99.9900"),
        decimal_places=4,
    )
    margin_of_error: Decimal | None = Field(
        default=None,
        gt=Decimal("0.0000"),
        le=Decimal("15.0000"),
        decimal_places=4,
    )
    field_start_at: datetime | None = None
    field_end_at: datetime | None = None


class SurveyStatusTransitionSchema(BaseModel):
    """Contrato para transição unidirecional de status da pesquisa."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    target_status: SurveyStatus


class SurveyResponseSchema(BaseModel):
    """Contrato de resposta de uma pesquisa eleitoral."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    tse_protocol_number: str
    title: str
    election_sphere: ElectionSphere
    target_uf: str
    target_municipality_ibge: str | None
    contracting_entity_doc: str
    statistician_conre: str
    planned_sample_size: int
    confidence_level: Decimal
    margin_of_error: Decimal
    status: SurveyStatus
    created_by: UUID
    field_start_at: datetime
    field_end_at: datetime
    created_at: datetime
    updated_at: datetime


class SurveyFilterSchema(BaseModel):
    """Parâmetros de filtragem e paginação obrigatória de pesquisas eleitorais."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    status: SurveyStatus | None = None
    election_sphere: ElectionSphere | None = None
    target_uf: str | None = Field(default=None, min_length=2, max_length=2)
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class PaginatedSurveysResponseSchema(BaseModel):
    """Envelope paginado padrão para listagem de pesquisas eleitorais."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    items: list[SurveyResponseSchema]
    total: int
    limit: int
    offset: int
    page: int
    page_size: int
    has_next: bool
