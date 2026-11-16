"""Rotas HTTP para o Agregador de Pesquisas Eleitorais (Polling Aggregator)."""

from datetime import date
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.core.security import (
    TokenClaimsSchema,
    UserRole,
    get_current_token_claims,
    require_roles,
)
from src.modules.aggregator.schemas import (
    ExternalPollCreateSchema,
    ExternalPollResponseSchema,
    PaginatedExternalPollsResponseSchema,
    PaginatedInstitutesResponseSchema,
    PollingAggregateResponseSchema,
    PollInstituteCreateSchema,
    PollInstituteResponseSchema,
)
from src.modules.aggregator.service import AggregatorService

router = APIRouter(
    prefix="/aggregator",
    tags=["Agregador de Pesquisas Eleitorais (Polling Aggregator)"],
)

DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
AuthenticatedDep = Annotated[TokenClaimsSchema, Depends(get_current_token_claims)]
AnalystOrAdminDep = Annotated[
    TokenClaimsSchema,
    Depends(require_roles(UserRole.ADMIN, UserRole.STATISTICIAN, UserRole.ANALYST)),
]


@router.post(
    "/institutes",
    response_model=PollInstituteResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastra um instituto de pesquisa com peso metodológico e House Effect",
)
async def create_poll_institute(
    payload: PollInstituteCreateSchema,
    claims: AnalystOrAdminDep,
    session: DbSessionDep,
) -> PollInstituteResponseSchema:
    service = AggregatorService(session)
    return await service.register_institute(payload, actor_id=claims.sub)


@router.get(
    "/institutes",
    response_model=PaginatedInstitutesResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Lista institutos de pesquisa cadastrados com paginação obrigatória",
)
async def list_poll_institutes(
    _claims: AuthenticatedDep,
    session: DbSessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PaginatedInstitutesResponseSchema:
    service = AggregatorService(session)
    return await service.list_institutes(limit=limit, offset=offset)


@router.post(
    "/polls",
    response_model=ExternalPollResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Registra uma pesquisa eleitoral no agregador",
)
async def create_external_poll(
    payload: ExternalPollCreateSchema,
    claims: AnalystOrAdminDep,
    session: DbSessionDep,
) -> ExternalPollResponseSchema:
    service = AggregatorService(session)
    return await service.register_external_poll(payload, actor_id=claims.sub)


@router.get(
    "/polls",
    response_model=PaginatedExternalPollsResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Lista pesquisas registradas no agregador com paginação obrigatória",
)
async def list_external_polls(
    _claims: AuthenticatedDep,
    session: DbSessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PaginatedExternalPollsResponseSchema:
    service = AggregatorService(session)
    return await service.list_external_polls(limit=limit, offset=offset)


@router.get(
    "/average",
    response_model=PollingAggregateResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Calcula a Média Móvel Ponderada (sqrt(N), decaimento exponencial e House Effects)",
)
async def get_weighted_polling_average(
    _claims: AuthenticatedDep,
    session: DbSessionDep,
    reference_date: Annotated[date | None, Query()] = None,
    half_life_days: Annotated[
        Decimal, Query(gt=Decimal("1.0000"), le=Decimal("90.0000"))
    ] = Decimal("14.0000"),
) -> PollingAggregateResponseSchema:
    service = AggregatorService(session)
    return await service.compute_weighted_moving_average(
        reference_date=reference_date,
        half_life_days=half_life_days,
    )
