"""Contratos Pydantic v2 para Hierarquia Territorial (País, Estado/UF e Município)."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CountryCreateSchema(BaseModel):
    """Contrato de criação de País."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    iso_code: str = Field(min_length=2, max_length=8)
    name: str = Field(min_length=2, max_length=120)
    electoral_authority: str = Field(default="TSE", min_length=2, max_length=80)
    is_active: bool = True


class CountryUpdateSchema(BaseModel):
    """Contrato de atualização parcial de País."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    name: str | None = Field(default=None, min_length=2, max_length=120)
    electoral_authority: str | None = Field(default=None, min_length=2, max_length=80)
    is_active: bool | None = None


class CountryResponseSchema(BaseModel):
    """DTO de saída de País."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    iso_code: str
    name: str
    electoral_authority: str
    is_active: bool
    created_at: datetime


class StateCreateSchema(BaseModel):
    """Contrato de criação de Estado (UF) vinculado a um País."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    country_id: UUID
    uf: str = Field(min_length=2, max_length=4)
    name: str = Field(min_length=2, max_length=120)
    ibge_code: str = Field(default="35", min_length=1, max_length=10)
    macro_region: str = Field(default="Sudeste", min_length=2, max_length=40)
    electorate_total: int = Field(default=0, ge=0)
    is_active: bool = True


class StateUpdateSchema(BaseModel):
    """Contrato de atualização parcial de Estado (UF)."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    name: str | None = Field(default=None, min_length=2, max_length=120)
    ibge_code: str | None = Field(default=None, min_length=1, max_length=10)
    macro_region: str | None = Field(default=None, min_length=2, max_length=40)
    electorate_total: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class StateResponseSchema(BaseModel):
    """DTO de saída de Estado (UF)."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    country_id: UUID
    uf: str
    name: str
    ibge_code: str
    macro_region: str
    electorate_total: int
    is_active: bool
    created_at: datetime


class MunicipalityCreateSchema(BaseModel):
    """Contrato de criação de Município vinculado a um Estado (UF)."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    state_id: UUID
    ibge_code: str = Field(min_length=4, max_length=16)
    name: str = Field(min_length=2, max_length=140)
    uf: str = Field(min_length=2, max_length=4)
    master_plan_law_ref: str = Field(min_length=3, max_length=140)
    electorate_total: int = Field(default=0, ge=0)
    is_active: bool = True


class MunicipalityUpdateSchema(BaseModel):
    """Contrato de atualização parcial de Município."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    name: str | None = Field(default=None, min_length=2, max_length=140)
    master_plan_law_ref: str | None = Field(default=None, min_length=3, max_length=140)
    electorate_total: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class MunicipalityResponseSchema(BaseModel):
    """DTO de saída de Município."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    state_id: UUID
    ibge_code: str
    name: str
    uf: str
    master_plan_law_ref: str
    electorate_total: int
    is_active: bool
    created_at: datetime
