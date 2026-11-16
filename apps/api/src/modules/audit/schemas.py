"""Contratos Pydantic v2 para consulta, filtragem e verificação da cadeia SHA-256."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AuditLogCreateSchema(BaseModel):
    """Contrato interno para registro de novo evento de auditoria."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    actor_user_id: UUID | None = None
    module: str = Field(min_length=2, max_length=64)
    action: str = Field(min_length=2, max_length=128)
    payload_diff: dict[str, Any] = Field(default_factory=dict)
    correlation_id: str | None = Field(default=None, max_length=64)


class AuditLogResponseSchema(BaseModel):
    """Contrato público de um registro imutável da trilha de auditoria."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: int
    correlation_id: str
    actor_user_id: UUID | None
    module: str
    action: str
    payload_diff: dict[str, Any]
    prev_hash: str
    record_hash: str
    created_at: datetime


class AuditLogFilterSchema(BaseModel):
    """Filtros e paginação obrigatória para listagem de logs de auditoria."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    module: str | None = None
    action: str | None = None
    actor_user_id: UUID | None = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class PaginatedAuditLogsResponseSchema(BaseModel):
    """Envelope paginado padrão para listagem de eventos de auditoria."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    items: list[AuditLogResponseSchema]
    total: int
    limit: int
    offset: int
    page: int
    page_size: int
    has_next: bool


class AuditChainVerificationResponseSchema(BaseModel):
    """Resultado da auditoria criptográfica completa da cadeia SHA-256."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    is_valid: bool
    checked_records: int
    last_record_hash: str | None = None
    corrupted_record_id: int | None = None
    failure_reason: str | None = None
