"""Rotas HTTP para o Motor de Questionários Dinâmicos (Rodízio de Disco e Skip Logic)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.core.security import (
    TokenClaimsSchema,
    UserRole,
    get_current_token_claims,
    require_roles,
)
from src.modules.questionnaires.schemas import (
    EvaluateSkipLogicRequestSchema,
    EvaluateSkipLogicResponseSchema,
    PaginatedQuestionnaireItemsResponseSchema,
    QuestionnaireItemCreateSchema,
    QuestionnaireItemResponseSchema,
)
from src.modules.questionnaires.service import QuestionnaireService

router = APIRouter(
    prefix="/surveys/{survey_id}/questions",
    tags=["Motor de Questionários Dinâmicos"],
)

DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
AuthenticatedDep = Annotated[TokenClaimsSchema, Depends(get_current_token_claims)]
StatisticianOrAdminDep = Annotated[
    TokenClaimsSchema,
    Depends(require_roles(UserRole.ADMIN, UserRole.STATISTICIAN)),
]


@router.post(
    "",
    response_model=QuestionnaireItemResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Adiciona pergunta ao questionário (somente pesquisa em DRAFT)",
)
async def add_questionnaire_item(
    survey_id: UUID,
    payload: QuestionnaireItemCreateSchema,
    claims: StatisticianOrAdminDep,
    session: DbSessionDep,
) -> QuestionnaireItemResponseSchema:
    service = QuestionnaireService(session)
    return await service.add_item(survey_id, payload, actor_id=claims.sub)


@router.get(
    "",
    response_model=PaginatedQuestionnaireItemsResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Lista perguntas do questionário (aplica rodízio de disco se rotation_seed informado)",
)
async def list_questionnaire_items(
    survey_id: UUID,
    _claims: AuthenticatedDep,
    session: DbSessionDep,
    rotation_seed: Annotated[str | None, Query(max_length=128)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PaginatedQuestionnaireItemsResponseSchema:
    service = QuestionnaireService(session)
    return await service.list_items(
        survey_id,
        limit=limit,
        offset=offset,
        rotation_seed=rotation_seed,
    )


@router.post(
    "/evaluate-skip",
    response_model=EvaluateSkipLogicResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Avalia regras de Skip Logic e retorna a próxima pergunta da entrevista",
)
async def evaluate_question_skip_logic(
    survey_id: UUID,
    payload: EvaluateSkipLogicRequestSchema,
    _claims: AuthenticatedDep,
    session: DbSessionDep,
) -> EvaluateSkipLogicResponseSchema:
    service = QuestionnaireService(session)
    return await service.evaluate_skip_logic(survey_id, payload)
