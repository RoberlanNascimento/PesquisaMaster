"""Contratos Pydantic v2 para Sincronização Idempotente, Antifraude e Supervisão de Campo."""

from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from src.modules.fieldwork.models import InterviewAuditStatus


class GeoPointSchema(BaseModel):
    """Ponto geográfico GeoJSON (SRID 4674 / WGS84) de captura da entrevista."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    type: Literal["Point"] = "Point"
    coordinates: tuple[Decimal, Decimal] = Field(
        description="Tupla (longitude, latitude) em graus decimais."
    )


class InterviewAnswerInputSchema(BaseModel):
    """Resposta individual capturada em uma entrevista de campo."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    question_id: UUID
    selected_option_code: str | None = Field(default=None, max_length=64)
    spontaneous_text: str | None = Field(default=None, max_length=500)


class InterviewSyncItemSchema(BaseModel):
    """Item unitário de entrevista enviado no lote offline-first."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    client_interview_key: str = Field(min_length=4, max_length=64)
    stratum_id: UUID
    quota_cell_id: UUID
    capture_point: GeoPointSchema
    duration_seconds: int = Field(ge=1, le=7200)
    started_at: datetime
    finished_at: datetime
    client_hmac_signature: str = Field(min_length=64, max_length=64)
    answers: list[InterviewAnswerInputSchema] = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def validate_timestamps(self) -> "InterviewSyncItemSchema":
        """Garante que finished_at seja posterior a started_at."""
        if self.finished_at <= self.started_at:
            raise ValueError("O horário 'finished_at' deve ser posterior a 'started_at'.")
        return self


class BatchSyncRequestSchema(BaseModel):
    """Contrato de sincronização em lote de entrevistas coletadas em campo."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    interviews: list[InterviewSyncItemSchema] = Field(min_length=1, max_length=100)


class InterviewResponseSchema(BaseModel):
    """Contrato de resposta de uma entrevista processada."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    survey_id: UUID
    stratum_id: UUID
    quota_cell_id: UUID
    researcher_id: UUID
    idempotency_key: str
    client_hmac_signature: str
    capture_point: GeoPointSchema
    duration_seconds: int
    is_geofence_valid: bool
    audit_status: InterviewAuditStatus
    purge_reason: str | None
    raking_weight: Decimal
    started_at: datetime
    finished_at: datetime
    synced_at: datetime


class BatchSyncResponseSchema(BaseModel):
    """Resultado do processamento idempotente do lote de entrevistas."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    batch_idempotency_key: str
    total_processed: int
    valid_count: int
    flagged_count: int
    purged_count: int
    items: list[InterviewResponseSchema]


class PaginatedInterviewsResponseSchema(BaseModel):
    """Envelope paginado padrão para listagem de entrevistas."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    items: list[InterviewResponseSchema]
    total: int
    limit: int
    offset: int
    page: int
    page_size: int
    has_next: bool


class InterviewAuditDecisionRequestSchema(BaseModel):
    """Contrato para expurgo ou revalidação auditável de entrevista pelo supervisor."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    target_status: Literal[InterviewAuditStatus.VALID, InterviewAuditStatus.PURGED]
    reason: str = Field(min_length=5, max_length=500)


class PackageAuditDecisionRequestSchema(BaseModel):
    """Contrato para validação ou reprovação em lote de um pacote pelo administrador."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    interview_ids: list[UUID] = Field(min_length=1, max_length=200)
    target_status: Literal[InterviewAuditStatus.VALID, InterviewAuditStatus.PURGED]
    reason: str = Field(min_length=5, max_length=500)


class PackageAuditDecisionResponseSchema(BaseModel):
    """Resultado da decisão administrativa sobre um pacote de entrevistas com estorno de cotas."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    survey_id: UUID
    target_status: InterviewAuditStatus
    processed_count: int
    quotas_refunded: int
    quotas_incremented: int
    items: list[InterviewResponseSchema]


class ResearcherPerformanceItemSchema(BaseModel):
    """Métricas de produtividade e qualidade antifraude por pesquisador."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    researcher_id: UUID
    total_synced: int
    valid_count: int
    flagged_count: int
    purged_count: int


class FieldSupervisionSummarySchema(BaseModel):
    """Painel consolidado de supervisão de campo da pesquisa."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    survey_id: UUID
    planned_sample_size: int
    total_synced: int
    total_valid: int
    total_flagged: int
    total_purged: int
    completion_percentage: Decimal
    researcher_metrics: list[ResearcherPerformanceItemSchema]
