"""Criação das tabelas `interviews` e `interview_answers` para Coleta em Campo.

Revision ID: 0007_fieldwork_interviews
Revises: 0006_field_assignments
Create Date: 2026-10-29 12:55:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007_fieldwork_interviews"
down_revision: str | None = "0006_field_assignments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Cria as tabelas `interviews` e `interview_answers`."""
    op.create_table(
        "interviews",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("survey_id", sa.Uuid(), nullable=False),
        sa.Column("stratum_id", sa.Uuid(), nullable=False),
        sa.Column("quota_cell_id", sa.Uuid(), nullable=False),
        sa.Column("researcher_id", sa.Uuid(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("client_hmac_signature", sa.String(length=64), nullable=False),
        sa.Column("capture_point", sa.JSON(), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column(
            "is_geofence_valid",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("audit_status", sa.String(length=32), nullable=False),
        sa.Column("purge_reason", sa.String(length=500), nullable=True),
        sa.Column("raking_weight", sa.Numeric(precision=19, scale=4), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "synced_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["survey_id"],
            ["surveys.id"],
            name="fk_interviews_survey_id_surveys",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["stratum_id"],
            ["sample_strata.id"],
            name="fk_interviews_stratum_id_sample_strata",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["quota_cell_id"],
            ["quota_cells.id"],
            name="fk_interviews_quota_cell_id_quota_cells",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["researcher_id"],
            ["users.id"],
            name="fk_interviews_researcher_id_users",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_interviews"),
    )
    op.create_index("ix_interviews_survey_id", "interviews", ["survey_id"])
    op.create_index("ix_interviews_stratum_id", "interviews", ["stratum_id"])
    op.create_index("ix_interviews_quota_cell_id", "interviews", ["quota_cell_id"])
    op.create_index("ix_interviews_researcher_id", "interviews", ["researcher_id"])
    op.create_index("ix_interviews_idempotency_key", "interviews", ["idempotency_key"], unique=True)
    op.create_index("ix_interviews_audit_status", "interviews", ["audit_status"])

    op.create_table(
        "interview_answers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("interview_id", sa.Uuid(), nullable=False),
        sa.Column("question_id", sa.Uuid(), nullable=False),
        sa.Column("selected_option_code", sa.String(length=64), nullable=True),
        sa.Column("spontaneous_text", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["interview_id"],
            ["interviews.id"],
            name="fk_interview_answers_interview_id_interviews",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["question_id"],
            ["questionnaire_items.id"],
            name="fk_interview_answers_question_id_questionnaire_items",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_interview_answers"),
    )
    op.create_index("ix_interview_answers_interview_id", "interview_answers", ["interview_id"])
    op.create_index("ix_interview_answers_question_id", "interview_answers", ["question_id"])


def downgrade() -> None:
    """Remove as tabelas `interview_answers` e `interviews`."""
    op.drop_index("ix_interview_answers_question_id", table_name="interview_answers")
    op.drop_index("ix_interview_answers_interview_id", table_name="interview_answers")
    op.drop_table("interview_answers")
    op.drop_index("ix_interviews_audit_status", table_name="interviews")
    op.drop_index("ix_interviews_idempotency_key", table_name="interviews")
    op.drop_index("ix_interviews_researcher_id", table_name="interviews")
    op.drop_index("ix_interviews_quota_cell_id", table_name="interviews")
    op.drop_index("ix_interviews_stratum_id", table_name="interviews")
    op.drop_index("ix_interviews_survey_id", table_name="interviews")
    op.drop_table("interviews")

