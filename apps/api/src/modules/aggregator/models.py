"""Modelos SQLAlchemy 2.0 para Institutos (`poll_institutes`) e Pesquisas (`external_polls`)."""

from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class PollInstituteModel(Base):
    """Entidade ORM da tabela `poll_institutes`."""

    __tablename__ = "poll_institutes"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    cnpj: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    methodological_weight: Mapped[Decimal] = mapped_column(
        Numeric(19, 4),
        nullable=False,
        default=Decimal("1.0000"),
    )
    house_effect_adjustment: Mapped[Decimal] = mapped_column(
        Numeric(19, 4),
        nullable=False,
        default=Decimal("0.0000"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )


class ExternalPollModel(Base):
    """Entidade ORM da tabela `external_polls`."""

    __tablename__ = "external_polls"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    institute_id: Mapped[UUID] = mapped_column(
        ForeignKey("poll_institutes.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    tse_protocol_number: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    field_median_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    sample_size: Mapped[int] = mapped_column(Integer, nullable=False)
    margin_of_error: Mapped[Decimal] = mapped_column(Numeric(19, 4), nullable=False)
    candidate_results: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
