"""Contratos Pydantic v2 para Questionários Dinâmicos, Rodízio de Disco e Skip Logic."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from src.modules.questionnaires.models import QuestionType


class QuestionOptionSchema(BaseModel):
    """Opção de resposta de um cartão estimulado ou de rejeição."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    code: str = Field(min_length=1, max_length=64, pattern=r"^[A-Z0-9_]+$")
    label: str = Field(min_length=1, max_length=255)
    is_fixed: bool = Field(
        default=False,
        description="Se True (ex: Branco/Nulo, NS/NR), permanece fixo ao final durante o rodízio.",
    )


class SkipLogicRuleSchema(BaseModel):
    """Regra condicional de salto (Skip Logic) entre perguntas."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    when_option_code: str = Field(min_length=1, max_length=64)
    goto_question_code: str = Field(
        min_length=1,
        max_length=64,
        description="Código da pergunta de destino ou 'END_INTERVIEW'.",
    )


class QuestionnaireItemCreateSchema(BaseModel):
    """Contrato para adicionar um item ao questionário de uma pesquisa em DRAFT."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    order_index: int = Field(ge=1, le=200)
    question_code: str = Field(min_length=2, max_length=64, pattern=r"^[A-Z0-9_]+$")
    question_type: QuestionType
    prompt_text: str = Field(min_length=5, max_length=1000)
    rotate_options: bool = False
    options_schema: list[QuestionOptionSchema] = Field(default_factory=list)
    skip_logic_rules: list[SkipLogicRuleSchema] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_question_structure(self) -> "QuestionnaireItemCreateSchema":
        """Valida regras de negócio entre tipo de pergunta, opções e skip logic."""
        if self.question_type == QuestionType.SPONTANEOUS:
            if self.rotate_options:
                raise ValueError(
                    "Perguntas espontâneas (SPONTANEOUS) não suportam rodízio de opções."
                )
        else:
            if len(self.options_schema) < 2:
                raise ValueError(
                    f"Perguntas do tipo '{self.question_type.value}' exigem ao menos 2 opções."
                )

        option_codes = [opt.code for opt in self.options_schema]
        if len(option_codes) != len(set(option_codes)):
            raise ValueError("Existem códigos de opção duplicados em 'options_schema'.")

        valid_codes = set(option_codes)
        for rule in self.skip_logic_rules:
            if valid_codes and rule.when_option_code not in valid_codes:
                raise ValueError(
                    f"Regra de skip logic referencia opção inexistente: '{rule.when_option_code}'."
                )
            if rule.goto_question_code == self.question_code:
                raise ValueError(
                    "Uma regra de skip logic não pode apontar para a própria pergunta."
                )

        return self


class QuestionnaireItemResponseSchema(BaseModel):
    """Contrato de resposta de um item do questionário."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    survey_id: UUID
    order_index: int
    question_code: str
    question_type: QuestionType
    prompt_text: str
    rotate_options: bool
    options_schema: list[QuestionOptionSchema]
    skip_logic_rules: list[SkipLogicRuleSchema]
    created_at: datetime


class PaginatedQuestionnaireItemsResponseSchema(BaseModel):
    """Envelope paginado padrão para listagem de itens do questionário."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    items: list[QuestionnaireItemResponseSchema]
    total: int
    limit: int
    offset: int
    page: int
    page_size: int
    has_next: bool


class EvaluateSkipLogicRequestSchema(BaseModel):
    """Entrada para avaliação de salto (Skip Logic) dada uma resposta em campo."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    current_question_code: str = Field(min_length=2, max_length=64)
    selected_option_code: str = Field(min_length=1, max_length=64)


class EvaluateSkipLogicResponseSchema(BaseModel):
    """Resultado determinístico da próxima pergunta a ser exibida ao pesquisador."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    current_question_code: str
    selected_option_code: str
    next_question_code: str
    is_skip_triggered: bool
    ends_interview: bool
