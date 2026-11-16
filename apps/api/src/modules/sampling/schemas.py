"""Contratos Pydantic v2 para Amostragem Estratificada e Alocação Hare-Niemeyer."""

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

PROPORTION_TOLERANCE = Decimal("0.0001")
HUNDRED_PERCENT = Decimal("100.0000")
ONE_UNIT = Decimal("1.0000")


def _validate_proportions_sum(proportions: list[Decimal], context_label: str) -> None:
    """Garante que a soma das proporções seja exatamente 1.0000 ou 100.0000 (±0.0001)."""
    total = sum(proportions, Decimal("0.0000"))
    is_unit = abs(total - ONE_UNIT) <= PROPORTION_TOLERANCE
    is_percentage = abs(total - HUNDRED_PERCENT) <= PROPORTION_TOLERANCE
    if not (is_unit or is_percentage):
        raise ValueError(
            f"A soma das proporções em '{context_label}' deve ser 1.0000 (ou 100.0000%), "
            f"mas foi {total}."
        )


class StratumAllocationInputSchema(BaseModel):
    """Entrada de estrato geográfico para alocação inteira Hare-Niemeyer."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    region_code: str = Field(min_length=2, max_length=64, pattern=r"^[A-Z0-9_-]+$")
    geographic_name: str = Field(min_length=2, max_length=255)
    population_proportion: Decimal = Field(gt=Decimal("0.0000"), decimal_places=4)
    boundary_geom: dict[str, Any] | None = None


class AllocateStrataRequestSchema(BaseModel):
    """Contrato de requisição para calcular e persistir estratos da pesquisa."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    strata: list[StratumAllocationInputSchema] = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def validate_strata_integrity(self) -> "AllocateStrataRequestSchema":
        """Verifica unicidade de códigos e soma exata das proporções populacionais."""
        codes = [s.region_code for s in self.strata]
        if len(codes) != len(set(codes)):
            raise ValueError("Existem códigos de região ('region_code') duplicados nos estratos.")
        _validate_proportions_sum(
            [s.population_proportion for s in self.strata],
            "strata.population_proportion",
        )
        return self


class SampleStratumResponseSchema(BaseModel):
    """Contrato de resposta de um estrato amostral alocado."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    survey_id: UUID
    region_code: str
    geographic_name: str
    boundary_geom: dict[str, Any] | None
    population_proportion: Decimal
    target_interviews: int
    created_at: datetime


class PaginatedStrataResponseSchema(BaseModel):
    """Envelope paginado padrão de estratos amostrais."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    items: list[SampleStratumResponseSchema]
    total: int
    limit: int
    offset: int
    page: int
    page_size: int
    has_next: bool


class QuotaCellInputSchema(BaseModel):
    """Entrada de célula demográfica para alocação Hare-Niemeyer dentro do estrato."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    gender: str = Field(min_length=1, max_length=32)
    age_bracket: str = Field(min_length=1, max_length=32)
    education_level: str = Field(min_length=1, max_length=64)
    income_bracket: str = Field(min_length=1, max_length=64)
    target_proportion: Decimal = Field(gt=Decimal("0.0000"), decimal_places=4)


class AllocateQuotaCellsRequestSchema(BaseModel):
    """Contrato para alocar células de cota dentro de um estrato."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    cells: list[QuotaCellInputSchema] = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def validate_cells_integrity(self) -> "AllocateQuotaCellsRequestSchema":
        """Verifica unicidade de combinações demográficas e soma das proporções."""
        keys = [
            (
                c.gender.strip().upper(),
                c.age_bracket.strip().upper(),
                c.education_level.strip().upper(),
                c.income_bracket.strip().upper(),
            )
            for c in self.cells
        ]
        if len(keys) != len(set(keys)):
            raise ValueError("Existem células demográficas duplicadas na requisição.")
        _validate_proportions_sum(
            [c.target_proportion for c in self.cells],
            "cells.target_proportion",
        )
        return self


class QuotaCellResponseSchema(BaseModel):
    """Contrato de resposta de uma célula demográfica de cota."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    stratum_id: UUID
    gender: str
    age_bracket: str
    education_level: str
    income_bracket: str
    target_proportion: Decimal
    target_count: int
    current_valid_count: int
    version: int
    updated_at: datetime


class PaginatedQuotaCellsResponseSchema(BaseModel):
    """Envelope paginado padrão para células de cota."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    items: list[QuotaCellResponseSchema]
    total: int
    limit: int
    offset: int
    page: int
    page_size: int
    has_next: bool


class FieldAssignmentCreateSchema(BaseModel):
    """Contrato para atribuir cota de um estrato geográfico a um pesquisador de campo."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    stratum_id: UUID
    researcher_id: UUID
    assigned_quota: int = Field(ge=1, le=10_000)


class FieldAssignmentResponseSchema(BaseModel):
    """Contrato de resposta de atribuição de campo enriquecido com perímetro GeoJSON do estrato."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    survey_id: UUID
    stratum_id: UUID
    researcher_id: UUID
    assigned_quota: int
    region_code: str
    geographic_name: str
    boundary_geom: dict[str, Any] | None
    stratum_target_interviews: int
    assigned_at: datetime


class PaginatedFieldAssignmentsResponseSchema(BaseModel):
    """Envelope paginado padrão para atribuições de campo por pesquisador."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    items: list[FieldAssignmentResponseSchema]
    total: int
    limit: int
    offset: int
    page: int
    page_size: int
    has_next: bool
