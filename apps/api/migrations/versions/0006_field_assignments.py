"""Criação da tabela `field_assignments` para distribuição de cotas por pesquisador.

Revision ID: 0006_field_assignments
Revises: 0005_sampling_strata_quotas
Create Date: 2026-10-29 12:47:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_field_assignments"
down_revision: str | None = "0005_sampling_strata_quotas"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Cria a tabela `field_assignments`."""
    op.create_table(
        "field_assignments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("survey_id", sa.Uuid(), nullable=False),
        sa.Column("stratum_id", sa.Uuid(), nullable=False),
        sa.Column("researcher_id", sa.Uuid(), nullable=False),
        sa.Column("assigned_quota", sa.Integer(), nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["survey_id"],
            ["surveys.id"],
            name="fk_field_assignments_survey_id_surveys",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["stratum_id"],
            ["sample_strata.id"],
            name="fk_field_assignments_stratum_id_sample_strata",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["researcher_id"],
            ["users.id"],
            name="fk_field_assignments_researcher_id_users",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_field_assignments"),
        sa.UniqueConstraint(
            "survey_id",
            "stratum_id",
            "researcher_id",
            name="uq_field_assignments_survey_stratum_researcher",
        ),
    )
    op.create_index("ix_field_assignments_survey_id", "field_assignments", ["survey_id"])
    op.create_index("ix_field_assignments_stratum_id", "field_assignments", ["stratum_id"])
    op.create_index("ix_field_assignments_researcher_id", "field_assignments", ["researcher_id"])


def downgrade() -> None:
    """Remove a tabela `field_assignments`."""
    op.drop_index("ix_field_assignments_researcher_id", table_name="field_assignments")
    op.drop_index("ix_field_assignments_stratum_id", table_name="field_assignments")
    op.drop_index("ix_field_assignments_survey_id", table_name="field_assignments")
    op.drop_table("field_assignments")

