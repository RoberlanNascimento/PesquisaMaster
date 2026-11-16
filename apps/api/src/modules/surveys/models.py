"""Modelo relacional SQLAlchemy 2.0 para Pesquisas Eleitorais (TSE / PesqEle)."""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import AuditTimestampMixin, Base


class ElectionSphere(StrEnum):
    """Abrangência federativa do pleito eleitoral."""

    MUNICIPAL = "MUNICIPAL"
    ESTADUAL = "ESTADUAL"
    FEDERAL = "FEDERAL"


class SurveyStatus(StrEnum):
    """Máquina de estados imutável de uma pesquisa eleitoral."""

    DRAFT = "DRAFT"
    ACTIVE_FIELD = "ACTIVE_FIELD"
    CLOSED = "CLOSED"
    PUBLISHED = "PUBLISHED"


class SurveyModel(AuditTimestampMixin, Base):
    """Entidade ORM da tabela `surveys` com metadados obrigatórios do TSE."""

    __tablename__ = "surveys"

    tse_protocol_number: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    election_sphere: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    target_uf: Mapped[str] = mapped_column(String(2), index=True, nullable=False)
    target_municipality_ibge: Mapped[str | None] = mapped_column(
        String(7), index=True, nullable=True
    )
    contracting_entity_doc: Mapped[str] = mapped_column(String(32), nullable=False)
    statistician_conre: Mapped[str] = mapped_column(String(64), nullable=False)
    planned_sample_size: Mapped[int] = mapped_column(Integer, nullable=False)
    confidence_level: Mapped[Decimal] = mapped_column(Numeric(19, 4), nullable=False)
    margin_of_error: Mapped[Decimal] = mapped_column(Numeric(19, 4), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        index=True,
        nullable=False,
        default=SurveyStatus.DRAFT.value,
    )
    created_by: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    field_start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    field_end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
