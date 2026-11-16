"""Contratos Pydantic v2 para Raking (IPF), Tabulação TSE, Crosstabs e Exportação."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RakingExecutionRequestSchema(BaseModel):
    """Parâmetros para execução da Pós-Estratificação Raking (IPF)."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    target_margins: dict[str, dict[str, Decimal]] = Field(
        description="Mapa de dimensão demográfica -> categoria -> proporção populacional."
    )
    max_iterations: int = Field(default=50, ge=1, le=500)
    convergence_tolerance: Decimal = Field(
        default=Decimal("0.0001"),
        gt=Decimal("0.0000"),
        le=Decimal("0.0500"),
    )
    min_weight_cap: Decimal = Field(default=Decimal("0.2000"), gt=Decimal("0.0100"))
    max_weight_cap: Decimal = Field(default=Decimal("5.0000"), le=Decimal("20.0000"))


class RakingExecutionResponseSchema(BaseModel):
    """Resultado estatístico da execução do Raking (IPF) e DEFF de Kish."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    survey_id: UUID
    valid_interviews_weighted: int
    iterations_run: int
    converged: bool
    max_abs_delta: Decimal
    kish_deff: Decimal
    effective_sample_size: Decimal
    min_weight_applied: Decimal
    max_weight_applied: Decimal


class OptionTabulationItemSchema(BaseModel):
    """Resultado ponderado e bruto de uma opção/candidato na tabulação TSE."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    option_code: str
    option_label: str
    is_non_valid_option: bool
    raw_count: int
    weighted_count: Decimal
    total_votes_percentage: Decimal
    valid_votes_percentage: Decimal | None


class QuestionTabulationResponseSchema(BaseModel):
    """Tabulação oficial TSE de uma pergunta (Votos Totais, Válidos, DEFF e Margem Ajustada)."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    survey_id: UUID
    question_id: UUID
    question_code: str
    question_type: str
    total_valid_interviews: int
    kish_deff: Decimal
    effective_sample_size: Decimal
    adjusted_margin_of_error: Decimal
    options: list[OptionTabulationItemSchema]


class CrosstabCellSchema(BaseModel):
    """Célula de cruzamento demográfico (Opção x Categoria Demográfica)."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    demographic_category: str
    option_code: str
    raw_count: int
    weighted_count: Decimal
    within_demographic_percentage: Decimal


class CrosstabResponseSchema(BaseModel):
    """Tabela de contingência (Crosstab) cruzando intenção de voto por variável demográfica."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    survey_id: UUID
    question_code: str
    demographic_dimension: str
    total_interviews: int
    cells: list[CrosstabCellSchema]


class TseExportPackageResponseSchema(BaseModel):
    """Pacote estruturado auditável para submissão/relatório TSE (PesqEle)."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    survey_id: UUID
    tse_protocol_number: str
    title: str
    statistician_conre: str
    planned_sample_size: int
    executed_valid_sample_size: int
    kish_deff: Decimal
    effective_sample_size: Decimal
    nominal_margin_of_error: Decimal
    deff_adjusted_margin_of_error: Decimal
    confidence_level: Decimal
    generated_at: datetime
    questions_tabulation: list[QuestionTabulationResponseSchema]
    integrity_sha256_digest: str
