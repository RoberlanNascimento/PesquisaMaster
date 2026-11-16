"""Criação das tabelas `sample_strata` e `quota_cells` para Amostragem Estratificada.

Revision ID: 0005_sampling_strata_quotas
Revises: 0004_questionnaire_items
Create Date: 2026-10-29 12:41:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_sampling_strata_quotas"
down_revision: str | None = "0004_questionnaire_items"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Cria as tabelas `sample_strata` e `quota_cells` com NUMERIC(19,4)."""
    op.create_table(
        "sample_strata",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("survey_id", sa.Uuid(), nullable=False),
        sa.Column("region_code", sa.String(length=64), nullable=False),
        sa.Column("geographic_name", sa.String(length=255), nullable=False),
        sa.Column("boundary_geom", sa.JSON(), nullable=True),
        sa.Column("population_proportion", sa.Numeric(precision=19, scale=4), nullable=False),
        sa.Column("target_interviews", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["survey_id"],
            ["surveys.id"],
            name="fk_sample_strata_survey_id_surveys",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_sample_strata"),
        sa.UniqueConstraint("survey_id", "region_code", name="uq_sample_strata_survey_region"),
    )
    op.create_index("ix_sample_strata_survey_id", "sample_strata", ["survey_id"], unique=False)

    op.create_table(
        "quota_cells",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("stratum_id", sa.Uuid(), nullable=False),
        sa.Column("gender", sa.String(length=32), nullable=False),
        sa.Column("age_bracket", sa.String(length=32), nullable=False),
        sa.Column("education_level", sa.String(length=64), nullable=False),
        sa.Column("income_bracket", sa.String(length=64), nullable=False),
        sa.Column("target_proportion", sa.Numeric(precision=19, scale=4), nullable=False),
        sa.Column("target_count", sa.Integer(), nullable=False),
        sa.Column(
            "current_valid_count",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("version", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["stratum_id"],
            ["sample_strata.id"],
            name="fk_quota_cells_stratum_id_sample_strata",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_quota_cells"),
        sa.UniqueConstraint(
            "stratum_id",
            "gender",
            "age_bracket",
            "education_level",
            "income_bracket",
            name="uq_quota_cells_demographics",
        ),
    )
    op.create_index("ix_quota_cells_stratum_id", "quota_cells", ["stratum_id"], unique=False)


def downgrade() -> None:
    """Remove as tabelas `quota_cells` e `sample_strata`."""
    op.drop_index("ix_quota_cells_stratum_id", table_name="quota_cells")
    op.drop_table("quota_cells")
    op.drop_index("ix_sample_strata_survey_id", table_name="sample_strata")
    op.drop_table("sample_strata")

