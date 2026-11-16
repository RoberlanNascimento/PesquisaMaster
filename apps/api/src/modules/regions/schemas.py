"""Contratos Pydantic v2 para Regiões Municipais e Bairros (Plano Diretor)."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from src.modules.regions.models import UrbanZoneType


class MunicipalRegionCreateSchema(BaseModel):
    """Contrato de criação de região administrativa municipal conforme Plano Diretor."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    municipality_id: UUID | None = None
    code: str = Field(min_length=2, max_length=32)
    name: str = Field(min_length=3, max_length=160)
    city_name: str = Field(min_length=2, max_length=120)
    uf: str = Field(min_length=2, max_length=2)
    master_plan_zone: UrbanZoneType = UrbanZoneType.ZONA_CENTRAL
    master_plan_law_ref: str = Field(min_length=3, max_length=120)
    electorate_total: int = Field(ge=0)
    electorate_weight_pct: Decimal = Field(ge=Decimal("0.0000"), le=Decimal("100.0000"))
    census_sectors_count: int = Field(ge=1, default=1)
    is_active: bool = True


class MunicipalRegionUpdateSchema(BaseModel):
    """Contrato de atualização parcial de uma região municipal."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    municipality_id: UUID | None = None
    name: str | None = Field(default=None, min_length=3, max_length=160)
    city_name: str | None = Field(default=None, min_length=2, max_length=120)
    uf: str | None = Field(default=None, min_length=2, max_length=2)
    master_plan_zone: UrbanZoneType | None = None
    master_plan_law_ref: str | None = Field(default=None, min_length=3, max_length=120)
    electorate_total: int | None = Field(default=None, ge=0)
    electorate_weight_pct: Decimal | None = Field(
        default=None, ge=Decimal("0.0000"), le=Decimal("100.0000")
    )
    census_sectors_count: int | None = Field(default=None, ge=1)
    is_active: bool | None = None


class MunicipalRegionResponseSchema(BaseModel):
    """DTO de saída de uma região administrativa municipal."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    municipality_id: UUID | None = None
    code: str
    name: str
    city_name: str
    uf: str
    master_plan_zone: UrbanZoneType
    master_plan_law_ref: str
    electorate_total: int
    electorate_weight_pct: Decimal
    census_sectors_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class NeighborhoodCreateSchema(BaseModel):
    """Contrato de cadastro de bairro vinculado a uma região municipal."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    code: str = Field(min_length=2, max_length=32)
    name: str = Field(min_length=2, max_length=160)
    ibge_census_sector_prefix: str = Field(min_length=3, max_length=32)
    predominant_income_bracket: str = Field(min_length=2, max_length=48)
    estimated_voters: int = Field(ge=0)
    electoral_weight_pct: Decimal = Field(ge=Decimal("0.0000"), le=Decimal("100.0000"))
    is_active: bool = True


class NeighborhoodUpdateSchema(BaseModel):
    """Contrato de atualização parcial de um bairro."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    name: str | None = Field(default=None, min_length=2, max_length=160)
    ibge_census_sector_prefix: str | None = Field(default=None, min_length=3, max_length=32)
    predominant_income_bracket: str | None = Field(default=None, min_length=2, max_length=48)
    estimated_voters: int | None = Field(default=None, ge=0)
    electoral_weight_pct: Decimal | None = Field(
        default=None, ge=Decimal("0.0000"), le=Decimal("100.0000")
    )
    is_active: bool | None = None


class NeighborhoodResponseSchema(BaseModel):
    """DTO de saída de um bairro vinculado à região municipal."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    region_id: UUID
    code: str
    name: str
    ibge_census_sector_prefix: str
    predominant_income_bracket: str
    estimated_voters: int
    electoral_weight_pct: Decimal
    is_active: bool
    created_at: datetime
