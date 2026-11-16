"""Modelos SQLAlchemy 2.0 para Hierarquia Territorial (País, Estado, Município, Região e Bairro)."""

from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from sqlalchemy import Boolean, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import AuditTimestampMixin, Base


class UrbanZoneType(StrEnum):
    """Macrozona urbana/rural conforme Plano Diretor Municipal."""

    ZONA_CENTRAL = "ZONA_CENTRAL"
    ZONA_NORTE = "ZONA_NORTE"
    ZONA_SUL = "ZONA_SUL"
    ZONA_LESTE = "ZONA_LESTE"
    ZONA_OESTE = "ZONA_OESTE"
    ZONA_EXPANSAO_URBANA = "ZONA_EXPANSAO_URBANA"
    ZONA_RURAL = "ZONA_RURAL"


class CountryModel(AuditTimestampMixin, Base):
    """País cadastrado para organização territorial eleitoral."""

    __tablename__ = "territorial_countries"

    iso_code: Mapped[str] = mapped_column(String(8), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    electoral_authority: Mapped[str] = mapped_column(String(80), nullable=False, default="TSE")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class StateModel(AuditTimestampMixin, Base):
    """Unidade Federativa (Estado/UF) vinculada a um País."""

    __tablename__ = "territorial_states"

    country_id: Mapped[UUID] = mapped_column(
        ForeignKey("territorial_countries.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    uf: Mapped[str] = mapped_column(String(4), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    ibge_code: Mapped[str] = mapped_column(String(10), nullable=False, default="35")
    macro_region: Mapped[str] = mapped_column(String(40), nullable=False, default="Sudeste")
    electorate_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class MunicipalityModel(AuditTimestampMixin, Base):
    """Município vinculado a um Estado (UF), com referência ao Plano Diretor Municipal."""

    __tablename__ = "territorial_municipalities"

    state_id: Mapped[UUID] = mapped_column(
        ForeignKey("territorial_states.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    ibge_code: Mapped[str] = mapped_column(String(16), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(140), nullable=False)
    uf: Mapped[str] = mapped_column(String(4), index=True, nullable=False)
    master_plan_law_ref: Mapped[str] = mapped_column(String(140), nullable=False)
    electorate_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class MunicipalRegionModel(AuditTimestampMixin, Base):
    """Região administrativa ou macrozona do Plano Diretor do município."""

    __tablename__ = "municipal_regions"

    municipality_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("territorial_municipalities.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    city_name: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    uf: Mapped[str] = mapped_column(String(2), index=True, nullable=False)
    master_plan_zone: Mapped[str] = mapped_column(
        String(40), nullable=False, default=UrbanZoneType.ZONA_CENTRAL.value
    )
    master_plan_law_ref: Mapped[str] = mapped_column(String(120), nullable=False)
    electorate_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    electorate_weight_pct: Mapped[Decimal] = mapped_column(
        Numeric(19, 4), nullable=False, default=Decimal("0.0000")
    )
    census_sectors_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class NeighborhoodModel(AuditTimestampMixin, Base):
    """Bairro integrante de uma região municipal no Plano Diretor."""

    __tablename__ = "municipal_neighborhoods"

    region_id: Mapped[UUID] = mapped_column(
        ForeignKey("municipal_regions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    ibge_census_sector_prefix: Mapped[str] = mapped_column(String(32), nullable=False)
    predominant_income_bracket: Mapped[str] = mapped_column(String(48), nullable=False)
    estimated_voters: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    electoral_weight_pct: Mapped[Decimal] = mapped_column(
        Numeric(19, 4), nullable=False, default=Decimal("0.0000")
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
