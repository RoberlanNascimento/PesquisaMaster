"""Criação das tabelas `poll_institutes` e `external_polls` para o Agregador.

Revision ID: 0008_polling_aggregator
Revises: 0007_fieldwork_interviews
Create Date: 2026-10-29 13:06:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0008_polling_aggregator"
down_revision: str | None = "0007_fieldwork_interviews"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Cria as tabelas `poll_institutes` e `external_polls`."""
    op.create_table(
        "poll_institutes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("cnpj", sa.String(length=32), nullable=False),
        sa.Column(
            "methodological_weight",
            sa.Numeric(precision=19, scale=4),
            nullable=False,
        ),
        sa.Column(
            "house_effect_adjustment",
            sa.Numeric(precision=19, scale=4),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name="pk_poll_institutes"),
    )
    op.create_index("ix_poll_institutes_name", "poll_institutes", ["name"], unique=True)
    op.create_index("ix_poll_institutes_cnpj", "poll_institutes", ["cnpj"], unique=True)

    op.create_table(
        "external_polls",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("institute_id", sa.Uuid(), nullable=False),
        sa.Column("tse_protocol_number", sa.String(length=64), nullable=False),
        sa.Column("field_median_date", sa.Date(), nullable=False),
        sa.Column("sample_size", sa.Integer(), nullable=False),
        sa.Column("margin_of_error", sa.Numeric(precision=19, scale=4), nullable=False),
        sa.Column("candidate_results", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["institute_id"],
            ["poll_institutes.id"],
            name="fk_external_polls_institute_id_poll_institutes",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_external_polls"),
    )
    op.create_index("ix_external_polls_institute_id", "external_polls", ["institute_id"])
    op.create_index(
        "ix_external_polls_tse_protocol_number",
        "external_polls",
        ["tse_protocol_number"],
        unique=True,
    )
    op.create_index(
        "ix_external_polls_field_median_date", "external_polls", ["field_median_date"]
    )


def downgrade() -> None:
    """Remove as tabelas `external_polls` e `poll_institutes`."""
    op.drop_index("ix_external_polls_field_median_date", table_name="external_polls")
    op.drop_index("ix_external_polls_tse_protocol_number", table_name="external_polls")
    op.drop_index("ix_external_polls_institute_id", table_name="external_polls")
    op.drop_table("external_polls")
    op.drop_index("ix_poll_institutes_cnpj", table_name="poll_institutes")
    op.drop_index("ix_poll_institutes_name", table_name="poll_institutes")
    op.drop_table("poll_institutes")

