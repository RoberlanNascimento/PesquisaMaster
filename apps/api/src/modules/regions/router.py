"""Rotas HTTP para Gerenciamento de Regiões Municipais e Bairros (Plano Diretor)."""

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
from src.modules.regions.router_hierarchy import hierarchy_router
from src.modules.regions.schemas import (
    MunicipalRegionCreateSchema,
    MunicipalRegionResponseSchema,
    MunicipalRegionUpdateSchema,
    NeighborhoodCreateSchema,
    NeighborhoodResponseSchema,
    NeighborhoodUpdateSchema,
)
from src.modules.regions.service import RegionService

router = APIRouter(tags=["Regiões Municipais & Bairros (Plano Diretor)"])
router.include_router(hierarchy_router)

DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
AuthenticatedDep = Annotated[TokenClaimsSchema, Depends(get_current_token_claims)]
PlannerOrAdminDep = Annotated[
    TokenClaimsSchema,
    Depends(require_roles(UserRole.ADMIN, UserRole.STATISTICIAN, UserRole.SUPERVISOR)),
]


@router.get(
    "/regions",
    response_model=list[MunicipalRegionResponseSchema],
    status_code=status.HTTP_200_OK,
    summary="Lista regiões administrativas municipais conforme o Plano Diretor",
)
async def list_municipal_regions(
    _claims: AuthenticatedDep,
    session: DbSessionDep,
    municipality_id: Annotated[UUID | None, Query()] = None,
    uf: Annotated[str | None, Query(min_length=2, max_length=2)] = None,
    zone: Annotated[str | None, Query(max_length=40)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[MunicipalRegionResponseSchema]:
    service = RegionService(session)
    return await service.list_regions(
        municipality_id=municipality_id, uf=uf, zone=zone, limit=limit, offset=offset
    )


@router.post(
    "/regions",
    response_model=MunicipalRegionResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastra nova região administrativa municipal vinculada ao Plano Diretor",
)
async def create_municipal_region(
    payload: MunicipalRegionCreateSchema,
    claims: PlannerOrAdminDep,
    session: DbSessionDep,
) -> MunicipalRegionResponseSchema:
    service = RegionService(session)
    return await service.create_region(payload, actor_id=claims.sub)


@router.get(
    "/regions/{region_id}",
    response_model=MunicipalRegionResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Obtém os detalhes de uma região administrativa municipal",
)
async def get_municipal_region(
    region_id: UUID,
    _claims: AuthenticatedDep,
    session: DbSessionDep,
) -> MunicipalRegionResponseSchema:
    service = RegionService(session)
    return await service.get_region(region_id)


@router.patch(
    "/regions/{region_id}",
    response_model=MunicipalRegionResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Atualiza dados de uma região administrativa municipal",
)
async def update_municipal_region(
    region_id: UUID,
    payload: MunicipalRegionUpdateSchema,
    claims: PlannerOrAdminDep,
    session: DbSessionDep,
) -> MunicipalRegionResponseSchema:
    service = RegionService(session)
    return await service.update_region(region_id, payload, actor_id=claims.sub)


@router.delete(
    "/regions/{region_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Exclui uma região administrativa municipal",
)
async def delete_municipal_region(
    region_id: UUID,
    claims: PlannerOrAdminDep,
    session: DbSessionDep,
) -> Response:
    service = RegionService(session)
    await service.delete_region(region_id, actor_id=claims.sub)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/regions/{region_id}/neighborhoods",
    response_model=list[NeighborhoodResponseSchema],
    status_code=status.HTTP_200_OK,
    summary="Lista os bairros integrantes de uma região municipal",
)
async def list_region_neighborhoods(
    region_id: UUID,
    _claims: AuthenticatedDep,
    session: DbSessionDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[NeighborhoodResponseSchema]:
    service = RegionService(session)
    return await service.list_neighborhoods(region_id, limit=limit, offset=offset)


@router.post(
    "/regions/{region_id}/neighborhoods",
    response_model=NeighborhoodResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastra novo bairro vinculado à região municipal",
)
async def create_region_neighborhood(
    region_id: UUID,
    payload: NeighborhoodCreateSchema,
    claims: PlannerOrAdminDep,
    session: DbSessionDep,
) -> NeighborhoodResponseSchema:
    service = RegionService(session)
    return await service.create_neighborhood(region_id, payload, actor_id=claims.sub)


@router.patch(
    "/regions/{region_id}/neighborhoods/{neighborhood_id}",
    response_model=NeighborhoodResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Atualiza dados de um bairro vinculado à região municipal",
)
async def update_region_neighborhood(
    region_id: UUID,
    neighborhood_id: UUID,
    payload: NeighborhoodUpdateSchema,
    claims: PlannerOrAdminDep,
    session: DbSessionDep,
) -> NeighborhoodResponseSchema:
    service = RegionService(session)
    return await service.update_neighborhood(
        region_id, neighborhood_id, payload, actor_id=claims.sub
    )


@router.delete(
    "/regions/{region_id}/neighborhoods/{neighborhood_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove um bairro vinculado à região municipal",
)
async def delete_region_neighborhood(
    region_id: UUID,
    neighborhood_id: UUID,
    claims: PlannerOrAdminDep,
    session: DbSessionDep,
) -> Response:
    service = RegionService(session)
    await service.delete_neighborhood(region_id, neighborhood_id, actor_id=claims.sub)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
