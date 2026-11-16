"""Contratos Pydantic v2 (Create, Update, Response, Filter e Login) do módulo Auth."""

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.core.security import UserRole


class UserCreateSchema(BaseModel):
    """Contrato de criação de usuário (ADMIN)."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=3, max_length=255)
    role: UserRole
    bound_device_id: str | None = Field(default=None, min_length=6, max_length=128)


class UserUpdateSchema(BaseModel):
    """Contrato de atualização parcial de usuário ou vínculo de dispositivo."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    full_name: str | None = Field(default=None, min_length=3, max_length=255)
    role: UserRole | None = None
    bound_device_id: str | None = Field(default=None, min_length=6, max_length=128)
    is_active: bool | None = None


class UserResponseSchema(BaseModel):
    """Contrato público de resposta de usuário (nunca expõe password_hash)."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    bound_device_id: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserFilterSchema(BaseModel):
    """Parâmetros de filtragem e paginação obrigatória para listagem de usuários."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    role: UserRole | None = None
    is_active: bool | None = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class PaginatedUsersResponseSchema(BaseModel):
    """Envelope paginado padrão para listagem de usuários."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    items: list[UserResponseSchema]
    total: int
    limit: int
    offset: int
    page: int
    page_size: int
    has_next: bool


class LoginRequestSchema(BaseModel):
    """Credenciais de entrada para autenticação e vinculação de dispositivo."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
    device_id: str | None = Field(default=None, min_length=6, max_length=128)


class TokenResponseSchema(BaseModel):
    """Resposta de autenticação com JWT assinado e metadados do operador."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    access_token: str
    token_type: Literal["bearer"] = "bearer"  # noqa: S105
    expires_in: int
    user: UserResponseSchema
