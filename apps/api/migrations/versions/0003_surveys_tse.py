"""Criação da tabela `surveys` com metadados obrigatórios do TSE (PesqEle).

Revision ID: 0003_surveys_tse
Revises: 0002_security_audit_logs
Create Date: 2026-10-29 12:30:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_surveys_tse"
down_revision: str | None = "0002_security_audit_logs"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Cria a tabela `surveys` com NUMERIC(19,4) e TIMESTAMPTZ."""
    op.create_table(
        "surveys",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("tse_protocol_number", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("election_sphere", sa.String(length=32), nullable=False),
        sa.Column("target_uf", sa.String(length=2), nullable=False),
        sa.Column("target_municipality_ibge", sa.String(length=7), nullable=True),
        sa.Column("contracting_entity_doc", sa.String(length=32), nullable=False),
        sa.Column("statistician_conre", sa.String(length=64), nullable=False),
        sa.Column("planned_sample_size", sa.Integer(), nullable=False),
        sa.Column("confidence_level", sa.Numeric(precision=19, scale=4), nullable=False),
        sa.Column("margin_of_error", sa.Numeric(precision=19, scale=4), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column("field_start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("field_end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
            name="fk_surveys_created_by_users",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_surveys"),
    )
    op.create_index(
        "ix_surveys_tse_protocol_number",
        "surveys",
        ["tse_protocol_number"],
        unique=True,
    )
    op.create_index("ix_surveys_election_sphere", "surveys", ["election_sphere"], unique=False)
    op.create_index("ix_surveys_target_uf", "surveys", ["target_uf"], unique=False)
    op.create_index(
        "ix_surveys_target_municipality_ibge",
        "surveys",
        ["target_municipality_ibge"],
        unique=False,
    )
    op.create_index("ix_surveys_status", "surveys", ["status"], unique=False)
    op.create_index("ix_surveys_created_by", "surveys", ["created_by"], unique=False)


def downgrade() -> None:
    """Remove a tabela `surveys`."""
    op.drop_index("ix_surveys_created_by", table_name="surveys")
    op.drop_index("ix_surveys_status", table_name="surveys")
    op.drop_index("ix_surveys_target_municipality_ibge", table_name="surveys")
    op.drop_index("ix_surveys_target_uf", table_name="surveys")
    op.drop_index("ix_surveys_election_sphere", table_name="surveys")
    op.drop_index("ix_surveys_tse_protocol_number", table_name="surveys")
    op.drop_table("surveys")

