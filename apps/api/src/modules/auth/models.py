"""Modelo relacional SQLAlchemy 2.0 para usuários e perfis RBAC."""

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import AuditTimestampMixin, Base
from src.core.security import UserRole


class UserModel(AuditTimestampMixin, Base):
    """Entidade ORM da tabela `users` com suporte a RBAC e Device Binding."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=UserRole.RESEARCHER.value,
        index=True,
    )
    bound_device_id: Mapped[str | None] = mapped_column(String(128), nullable=True, default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
