"""Modelos SQLAlchemy 2.0 para Entrevistas (`interviews`) e Respostas (`interview_answers`)."""

from datetime import UTC, datetime
from decimal import Decimal
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class InterviewAuditStatus(StrEnum):
    """Status de auditoria antifraude de uma entrevista coletada em campo."""

    VALID = "VALID"
    FLAGGED = "FLAGGED"
    PURGED = "PURGED"


class InterviewModel(Base):
    """Entidade ORM da tabela `interviews` com suporte a HMAC, Geofencing e Raking."""

    __tablename__ = "interviews"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    survey_id: Mapped[UUID] = mapped_column(
        ForeignKey("surveys.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    stratum_id: Mapped[UUID] = mapped_column(
        ForeignKey("sample_strata.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    quota_cell_id: Mapped[UUID] = mapped_column(
        ForeignKey("quota_cells.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    researcher_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    idempotency_key: Mapped[str] = mapped_column(
        String(128), unique=True, index=True, nullable=False
    )
    client_hmac_signature: Mapped[str] = mapped_column(String(64), nullable=False)
    capture_point: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    is_geofence_valid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    audit_status: Mapped[str] = mapped_column(
        String(32),
        index=True,
        nullable=False,
        default=InterviewAuditStatus.VALID.value,
    )
    purge_reason: Mapped[str | None] = mapped_column(String(500), nullable=True, default=None)
    raking_weight: Mapped[Decimal] = mapped_column(
        Numeric(19, 4),
        nullable=False,
        default=Decimal("1.0000"),
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )


class InterviewAnswerModel(Base):
    """Entidade ORM da tabela `interview_answers`."""

    __tablename__ = "interview_answers"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    interview_id: Mapped[UUID] = mapped_column(
        ForeignKey("interviews.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    question_id: Mapped[UUID] = mapped_column(
        ForeignKey("questionnaire_items.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    selected_option_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    spontaneous_text: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
