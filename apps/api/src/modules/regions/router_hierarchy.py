"""Rotas HTTP para CRUD da Hierarquia Territorial (País, Estado/UF e Município)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.core.security import (
    TokenClaimsSchema,
    UserRole,
    get_current_token_claims,
    require_roles,
)
from src.modules.regions.schemas_hierarchy import (
    CountryCreateSchema,
    CountryResponseSchema,
    CountryUpdateSchema,
    MunicipalityCreateSchema,
    MunicipalityResponseSchema,
    MunicipalityUpdateSchema,
    StateCreateSchema,
    StateResponseSchema,
    StateUpdateSchema,
)
from src.modules.regions.service_hierarchy import HierarchyService

hierarchy_router = APIRouter(tags=["Hierarquia Territorial (País, Estado e Município)"])

DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
AuthenticatedDep = Annotated[TokenClaimsSchema, Depends(get_current_token_claims)]
PlannerOrAdminDep = Annotated[
    TokenClaimsSchema,
    Depends(require_roles(UserRole.ADMIN, UserRole.STATISTICIAN, UserRole.SUPERVISOR)),
]


@hierarchy_router.get(
    "/regions/countries",
    response_model=list[CountryResponseSchema],
    status_code=status.HTTP_200_OK,
    summary="Lista países cadastrados na hierarquia territorial",
)
async def list_countries(
    _claims: AuthenticatedDep,
    session: DbSessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[CountryResponseSchema]:
    return await HierarchyService(session).list_countries(limit=limit, offset=offset)


@hierarchy_router.post(
    "/regions/countries",
    response_model=CountryResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastra novo país na hierarquia territorial",
)
async def create_country(
    payload: CountryCreateSchema,
    claims: PlannerOrAdminDep,
    session: DbSessionDep,
) -> CountryResponseSchema:
    return await HierarchyService(session).create_country(payload, actor_id=claims.sub)


@hierarchy_router.patch(
    "/regions/countries/{country_id}",
    response_model=CountryResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Atualiza dados de um país",
)
async def update_country(
    country_id: UUID,
    payload: CountryUpdateSchema,
    claims: PlannerOrAdminDep,
    session: DbSessionDep,
) -> CountryResponseSchema:
    return await HierarchyService(session).update_country(country_id, payload, actor_id=claims.sub)


@hierarchy_router.delete(
    "/regions/countries/{country_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove país da hierarquia territorial",
)
async def delete_country(
    country_id: UUID,
    claims: PlannerOrAdminDep,
    session: DbSessionDep,
) -> Response:
    await HierarchyService(session).delete_country(country_id, actor_id=claims.sub)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@hierarchy_router.get(
    "/regions/states",
    response_model=list[StateResponseSchema],
    status_code=status.HTTP_200_OK,
    summary="Lista estados (UFs) vinculados aos países",
)
async def list_states(
    _claims: AuthenticatedDep,
    session: DbSessionDep,
    country_id: Annotated[UUID | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[StateResponseSchema]:
    return await HierarchyService(session).list_states(
        country_id=country_id, limit=limit, offset=offset
    )


@hierarchy_router.post(
    "/regions/states",
    response_model=StateResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastra novo estado (UF) vinculado a um país",
)
async def create_state(
    payload: StateCreateSchema,
    claims: PlannerOrAdminDep,
    session: DbSessionDep,
) -> StateResponseSchema:
    return await HierarchyService(session).create_state(payload, actor_id=claims.sub)


@hierarchy_router.patch(
    "/regions/states/{state_id}",
    response_model=StateResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Atualiza dados de um estado (UF)",
)
async def update_state(
    state_id: UUID,
    payload: StateUpdateSchema,
    claims: PlannerOrAdminDep,
    session: DbSessionDep,
) -> StateResponseSchema:
    return await HierarchyService(session).update_state(state_id, payload, actor_id=claims.sub)


@hierarchy_router.delete(
    "/regions/states/{state_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove estado (UF) da hierarquia territorial",
)
async def delete_state(
    state_id: UUID,
    claims: PlannerOrAdminDep,
    session: DbSessionDep,
) -> Response:
    await HierarchyService(session).delete_state(state_id, actor_id=claims.sub)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@hierarchy_router.get(
    "/regions/municipalities",
    response_model=list[MunicipalityResponseSchema],
    status_code=status.HTTP_200_OK,
    summary="Lista municípios vinculados aos estados (UFs)",
)
async def list_municipalities(
    _claims: AuthenticatedDep,
    session: DbSessionDep,
    state_id: Annotated[UUID | None, Query()] = None,
    uf: Annotated[str | None, Query(min_length=2, max_length=4)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[MunicipalityResponseSchema]:
    return await HierarchyService(session).list_municipalities(
        state_id=state_id, uf=uf, limit=limit, offset=offset
    )


@hierarchy_router.post(
    "/regions/municipalities",
    response_model=MunicipalityResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastra novo município vinculado a um estado (UF)",
)
async def create_municipality(
    payload: MunicipalityCreateSchema,
    claims: PlannerOrAdminDep,
    session: DbSessionDep,
) -> MunicipalityResponseSchema:
    return await HierarchyService(session).create_municipality(payload, actor_id=claims.sub)


@hierarchy_router.patch(
    "/regions/municipalities/{municipality_id}",
    response_model=MunicipalityResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Atualiza dados de um município",
)
async def update_municipality(
    municipality_id: UUID,
    payload: MunicipalityUpdateSchema,
    claims: PlannerOrAdminDep,
    session: DbSessionDep,
) -> MunicipalityResponseSchema:
    return await HierarchyService(session).update_municipality(
        municipality_id, payload, actor_id=claims.sub
    )


@hierarchy_router.delete(
    "/regions/municipalities/{municipality_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove município da hierarquia territorial",
)
async def delete_municipality(
    municipality_id: UUID,
    claims: PlannerOrAdminDep,
    session: DbSessionDep,
) -> Response:
    await HierarchyService(session).delete_municipality(municipality_id, actor_id=claims.sub)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
