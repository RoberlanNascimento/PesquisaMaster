"""Criação da tabela `questionnaire_items` para o Motor de Questionários Dinâmicos.

Revision ID: 0004_questionnaire_items
Revises: 0003_surveys_tse
Create Date: 2026-10-29 12:35:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_questionnaire_items"
down_revision: str | None = "0003_surveys_tse"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Cria a tabela `questionnaire_items` com restrições de ordem e código por pesquisa."""
    op.create_table(
        "questionnaire_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("survey_id", sa.Uuid(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("question_code", sa.String(length=64), nullable=False),
        sa.Column("question_type", sa.String(length=32), nullable=False),
        sa.Column("prompt_text", sa.String(length=1000), nullable=False),
        sa.Column(
            "rotate_options",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("options_schema", sa.JSON(), nullable=False),
        sa.Column("skip_logic_rules", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["survey_id"],
            ["surveys.id"],
            name="fk_questionnaire_items_survey_id_surveys",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_questionnaire_items"),
        sa.UniqueConstraint(
            "survey_id",
            "question_code",
            name="uq_questionnaire_items_survey_code",
        ),
        sa.UniqueConstraint(
            "survey_id",
            "order_index",
            name="uq_questionnaire_items_survey_order",
        ),
    )
    op.create_index(
        "ix_questionnaire_items_survey_id",
        "questionnaire_items",
        ["survey_id"],
        unique=False,
    )


def downgrade() -> None:
    """Remove a tabela `questionnaire_items`."""
    op.drop_index("ix_questionnaire_items_survey_id", table_name="questionnaire_items")
    op.drop_table("questionnaire_items")

