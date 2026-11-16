"""Rotas HTTP para CRUD de Pesquisas Eleitorais (TSE / PesqEle) e máquina de estados."""

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
from src.modules.surveys.models import ElectionSphere, SurveyStatus
from src.modules.surveys.schemas import (
    PaginatedSurveysResponseSchema,
    SurveyCreateSchema,
    SurveyFilterSchema,
    SurveyResponseSchema,
    SurveyStatusTransitionSchema,
    SurveyUpdateSchema,
)
from src.modules.surveys.service import SurveyService

router = APIRouter(prefix="/surveys", tags=["Pesquisas Eleitorais (TSE / PesqEle)"])

DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
AuthenticatedDep = Annotated[TokenClaimsSchema, Depends(get_current_token_claims)]
StatisticianOrAdminDep = Annotated[
    TokenClaimsSchema,
    Depends(require_roles(UserRole.ADMIN, UserRole.STATISTICIAN)),
]


@router.post(
    "",
    response_model=SurveyResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Cria uma nova pesquisa eleitoral com metadados do TSE (ADMIN ou STATISTICIAN)",
)
async def create_survey(
    payload: SurveyCreateSchema,
    claims: StatisticianOrAdminDep,
    session: DbSessionDep,
) -> SurveyResponseSchema:
    service = SurveyService(session)
    return await service.create_survey(payload, actor_id=claims.sub)


@router.get(
    "",
    response_model=PaginatedSurveysResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Lista pesquisas eleitorais com paginação obrigatória",
)
async def list_surveys(
    _claims: AuthenticatedDep,
    session: DbSessionDep,
    status_filter: Annotated[SurveyStatus | None, Query(alias="status")] = None,
    election_sphere: Annotated[ElectionSphere | None, Query()] = None,
    target_uf: Annotated[str | None, Query(min_length=2, max_length=2)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PaginatedSurveysResponseSchema:
    filters = SurveyFilterSchema(
        status=status_filter,
        election_sphere=election_sphere,
        target_uf=target_uf,
        limit=limit,
        offset=offset,
    )
    service = SurveyService(session)
    return await service.list_surveys(filters)


@router.get(
    "/{survey_id}",
    response_model=SurveyResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Obtém os detalhes e metadados TSE de uma pesquisa eleitoral",
)
async def get_survey(
    survey_id: UUID,
    _claims: AuthenticatedDep,
    session: DbSessionDep,
) -> SurveyResponseSchema:
    service = SurveyService(session)
    return await service.get_survey(survey_id)


@router.patch(
    "/{survey_id}",
    response_model=SurveyResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Atualiza parâmetros da pesquisa (somente enquanto em status DRAFT)",
)
async def update_survey(
    survey_id: UUID,
    payload: SurveyUpdateSchema,
    claims: StatisticianOrAdminDep,
    session: DbSessionDep,
) -> SurveyResponseSchema:
    service = SurveyService(session)
    return await service.update_survey(survey_id, payload, actor_id=claims.sub)


@router.post(
    "/{survey_id}/status",
    response_model=SurveyResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Avança e trava o status da pesquisa (DRAFT -> ACTIVE_FIELD -> CLOSED -> PUBLISHED)",
)
async def transition_survey_status(
    survey_id: UUID,
    payload: SurveyStatusTransitionSchema,
    claims: StatisticianOrAdminDep,
    session: DbSessionDep,
) -> SurveyResponseSchema:
    service = SurveyService(session)
    return await service.transition_status(survey_id, payload, actor_id=claims.sub)
