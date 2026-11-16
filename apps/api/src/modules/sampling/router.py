"""Rotas HTTP para Amostragem Estratificada e Alocação de Cotas (Hare-Niemeyer)."""

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
from src.modules.sampling.assignment_service import FieldAssignmentService
from src.modules.sampling.schemas import (
    AllocateQuotaCellsRequestSchema,
    AllocateStrataRequestSchema,
    FieldAssignmentCreateSchema,
    FieldAssignmentResponseSchema,
    PaginatedFieldAssignmentsResponseSchema,
    PaginatedQuotaCellsResponseSchema,
    PaginatedStrataResponseSchema,
    QuotaCellResponseSchema,
    SampleStratumResponseSchema,
)
from src.modules.sampling.service import SamplingService

router = APIRouter(
    prefix="/surveys/{survey_id}/strata",
    tags=["Amostragem Estratificada & Cotas (Hare-Niemeyer)"],
)
assignments_router = APIRouter(
    prefix="/surveys/{survey_id}/assignments",
    tags=["Distribuição de Campo & Perímetros por Pesquisador"],
)

DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
AuthenticatedDep = Annotated[TokenClaimsSchema, Depends(get_current_token_claims)]
StatisticianOrAdminDep = Annotated[
    TokenClaimsSchema,
    Depends(require_roles(UserRole.ADMIN, UserRole.STATISTICIAN)),
]
FieldCoordinatorDep = Annotated[
    TokenClaimsSchema,
    Depends(require_roles(UserRole.ADMIN, UserRole.STATISTICIAN, UserRole.SUPERVISOR)),
]


@router.post(
    "/allocate",
    response_model=list[SampleStratumResponseSchema],
    status_code=status.HTTP_201_CREATED,
    summary="Aloca estratos geográficos pelo método Hare-Niemeyer (ADMIN ou STATISTICIAN)",
)
async def allocate_strata(
    survey_id: UUID,
    payload: AllocateStrataRequestSchema,
    claims: StatisticianOrAdminDep,
    session: DbSessionDep,
) -> list[SampleStratumResponseSchema]:
    service = SamplingService(session)
    return await service.allocate_survey_strata(survey_id, payload, actor_id=claims.sub)


@router.get(
    "",
    response_model=PaginatedStrataResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Lista os estratos amostrais da pesquisa com paginação obrigatória",
)
async def list_strata(
    survey_id: UUID,
    _claims: AuthenticatedDep,
    session: DbSessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PaginatedStrataResponseSchema:
    service = SamplingService(session)
    return await service.list_survey_strata(survey_id, limit=limit, offset=offset)


@router.post(
    "/{stratum_id}/quota-cells/allocate",
    response_model=list[QuotaCellResponseSchema],
    status_code=status.HTTP_201_CREATED,
    summary="Subdivide o estrato em células demográficas via Hare-Niemeyer",
)
async def allocate_quota_cells(
    survey_id: UUID,
    stratum_id: UUID,
    payload: AllocateQuotaCellsRequestSchema,
    claims: StatisticianOrAdminDep,
    session: DbSessionDep,
) -> list[QuotaCellResponseSchema]:
    service = SamplingService(session)
    return await service.allocate_stratum_quota_cells(
        survey_id, stratum_id, payload, actor_id=claims.sub
    )


@router.get(
    "/{stratum_id}/quota-cells",
    response_model=PaginatedQuotaCellsResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Lista as células demográficas de cota de um estrato com paginação",
)
async def list_quota_cells(
    survey_id: UUID,
    stratum_id: UUID,
    _claims: AuthenticatedDep,
    session: DbSessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PaginatedQuotaCellsResponseSchema:
    service = SamplingService(session)
    return await service.list_stratum_quota_cells(survey_id, stratum_id, limit=limit, offset=offset)


@assignments_router.post(
    "",
    response_model=FieldAssignmentResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Atribui cota e perímetro geográfico do estrato a um pesquisador de campo",
)
async def assign_researcher_quota(
    survey_id: UUID,
    payload: FieldAssignmentCreateSchema,
    claims: FieldCoordinatorDep,
    session: DbSessionDep,
) -> FieldAssignmentResponseSchema:
    service = FieldAssignmentService(session)
    return await service.assign_researcher_quota(survey_id, payload, actor_id=claims.sub)


@assignments_router.get(
    "",
    response_model=PaginatedFieldAssignmentsResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Lista atribuições de campo e perímetros geográficos por pesquisador",
)
async def list_field_assignments(
    survey_id: UUID,
    claims: AuthenticatedDep,
    session: DbSessionDep,
    researcher_id: Annotated[UUID | None, Query()] = None,
    stratum_id: Annotated[UUID | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PaginatedFieldAssignmentsResponseSchema:
    effective_researcher_id = claims.sub if claims.role == UserRole.RESEARCHER else researcher_id
    service = FieldAssignmentService(session)
    return await service.list_assignments(
        survey_id,
        researcher_id=effective_researcher_id,
        stratum_id=stratum_id,
        limit=limit,
        offset=offset,
    )
