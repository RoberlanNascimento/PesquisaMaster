"""Criação da tabela imutável `security_audit_logs` com encadeamento SHA-256.

Revision ID: 0002_security_audit_logs
Revises: 0001_initial_users
Create Date: 2026-10-29 12:15:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_security_audit_logs"
down_revision: str | None = "0001_initial_users"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Cria a tabela `security_audit_logs` e seus índices de auditoria."""
    op.create_table(
        "security_audit_logs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("correlation_id", sa.String(length=64), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("module", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("payload_diff", sa.JSON(), nullable=False),
        sa.Column("prev_hash", sa.String(length=64), nullable=False),
        sa.Column("record_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["actor_user_id"],
            ["users.id"],
            name="fk_security_audit_logs_actor_user_id_users",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_security_audit_logs"),
    )
    op.create_index(
        "ix_security_audit_logs_correlation_id",
        "security_audit_logs",
        ["correlation_id"],
        unique=False,
    )
    op.create_index(
        "ix_security_audit_logs_actor_user_id",
        "security_audit_logs",
        ["actor_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_security_audit_logs_module",
        "security_audit_logs",
        ["module"],
        unique=False,
    )
    op.create_index(
        "ix_security_audit_logs_action",
        "security_audit_logs",
        ["action"],
        unique=False,
    )
    op.create_index(
        "ix_security_audit_logs_record_hash",
        "security_audit_logs",
        ["record_hash"],
        unique=True,
    )


def downgrade() -> None:
    """Remove a tabela `security_audit_logs`."""
    op.drop_index("ix_security_audit_logs_record_hash", table_name="security_audit_logs")
    op.drop_index("ix_security_audit_logs_action", table_name="security_audit_logs")
    op.drop_index("ix_security_audit_logs_module", table_name="security_audit_logs")
    op.drop_index("ix_security_audit_logs_actor_user_id", table_name="security_audit_logs")
    op.drop_index("ix_security_audit_logs_correlation_id", table_name="security_audit_logs")
    op.drop_table("security_audit_logs")

