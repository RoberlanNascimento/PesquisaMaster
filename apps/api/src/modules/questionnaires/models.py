"""Modelo relacional SQLAlchemy 2.0 para Itens de Questionário (`questionnaire_items`)."""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class QuestionType(StrEnum):
    """Tipos de pergunta eleitoral segundo metodologia TSE."""

    SPONTANEOUS = "SPONTANEOUS"
    STIMULATED_SINGLE = "STIMULATED_SINGLE"
    STIMULATED_MULTIPLE = "STIMULATED_MULTIPLE"
    REJECTION = "REJECTION"


class QuestionnaireItemModel(Base):
    """Entidade ORM da tabela `questionnaire_items`."""

    __tablename__ = "questionnaire_items"
    __table_args__ = (
        UniqueConstraint("survey_id", "question_code", name="uq_questionnaire_items_survey_code"),
        UniqueConstraint("survey_id", "order_index", name="uq_questionnaire_items_survey_order"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    survey_id: Mapped[UUID] = mapped_column(
        ForeignKey("surveys.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    question_code: Mapped[str] = mapped_column(String(64), nullable=False)
    question_type: Mapped[str] = mapped_column(String(32), nullable=False)
    prompt_text: Mapped[str] = mapped_column(String(1000), nullable=False)
    rotate_options: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    options_schema: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    skip_logic_rules: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
