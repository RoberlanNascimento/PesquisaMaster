"""Modelos SQLAlchemy 2.0 para Estratos (`sample_strata`) e Cotas (`quota_cells`)."""

from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class SampleStratumModel(Base):
    """Entidade ORM da tabela `sample_strata` (Estrato Geográfico Amostral)."""

    __tablename__ = "sample_strata"
    __table_args__ = (
        UniqueConstraint("survey_id", "region_code", name="uq_sample_strata_survey_region"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    survey_id: Mapped[UUID] = mapped_column(
        ForeignKey("surveys.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    region_code: Mapped[str] = mapped_column(String(64), nullable=False)
    geographic_name: Mapped[str] = mapped_column(String(255), nullable=False)
    boundary_geom: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        default=None,
    )
    population_proportion: Mapped[Decimal] = mapped_column(Numeric(19, 4), nullable=False)
    target_interviews: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )


class QuotaCellModel(Base):
    """Entidade ORM da tabela `quota_cells` (Célula Demográfica de Cota com Optimistic Lock)."""

    __tablename__ = "quota_cells"
    __table_args__ = (
        UniqueConstraint(
            "stratum_id",
            "gender",
            "age_bracket",
            "education_level",
            "income_bracket",
            name="uq_quota_cells_demographics",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    stratum_id: Mapped[UUID] = mapped_column(
        ForeignKey("sample_strata.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    gender: Mapped[str] = mapped_column(String(32), nullable=False)
    age_bracket: Mapped[str] = mapped_column(String(32), nullable=False)
    education_level: Mapped[str] = mapped_column(String(64), nullable=False)
    income_bracket: Mapped[str] = mapped_column(String(64), nullable=False)
    target_proportion: Mapped[Decimal] = mapped_column(Numeric(19, 4), nullable=False)
    target_count: Mapped[int] = mapped_column(Integer, nullable=False)
    current_valid_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )


class FieldAssignmentModel(Base):
    """Entidade ORM da tabela `field_assignments` (Distribuição de Cota/Setor por Pesquisador)."""

    __tablename__ = "field_assignments"
    __table_args__ = (
        UniqueConstraint(
            "survey_id",
            "stratum_id",
            "researcher_id",
            name="uq_field_assignments_survey_stratum_researcher",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    survey_id: Mapped[UUID] = mapped_column(
        ForeignKey("surveys.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    stratum_id: Mapped[UUID] = mapped_column(
        ForeignKey("sample_strata.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    researcher_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    assigned_quota: Mapped[int] = mapped_column(Integer, nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
