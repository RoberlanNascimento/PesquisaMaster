"""Rotas HTTP REST para o banco de dados PostgreSQL 'pesquisas'."""

from collections.abc import Sequence
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.modules.pesquisas.models import (
    AmostraDbModel,
    MunicipioDbModel,
    PesquisaDbModel,
    ProfissionalDbModel,
)
from src.modules.pesquisas.repository import PesquisasRepository
from src.modules.pesquisas.schemas import (
    AmostraOut,
    DbHealthOut,
    MunicipioOut,
    PesquisaCreate,
    PesquisaOut,
    PesquisaUpdate,
    ProfissionalOut,
)
from src.modules.pesquisas.tenant_context import (
    TenantContext,
    get_current_user,
    get_tenant_context,
)

router = APIRouter(
    prefix="/pesquisas",
    tags=["Banco de Dados Pesquisas (PostgreSQL)"],
    dependencies=[Depends(get_current_user)],
)
DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
TenantDep = Annotated[TenantContext, Depends(get_tenant_context)]


@router.get(
    "/database/health",
    response_model=DbHealthOut,
    summary="Diagnóstico de integridade do Postgres",
)
async def get_db_health(session: DbSessionDep) -> DbHealthOut:
    repo = PesquisasRepository(session)
    data = await repo.get_db_health()
    return DbHealthOut(**data)


@router.get(
    "",
    response_model=list[PesquisaOut],
    summary="Lista pesquisas cadastradas no PostgreSQL",
)
async def list_pesquisas(
    session: DbSessionDep,
    tenant: TenantDep,
    search: Annotated[str | None, Query(description="Busca textual por nome")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Sequence[PesquisaDbModel]:
    repo = PesquisasRepository(session)
    return await repo.list_pesquisas(
        search=search, limit=limit, offset=offset, tenant_id=tenant.tenant_id
    )


@router.get(
    "/aux/municipios",
    response_model=list[MunicipioOut],
    summary="Lista municípios disponíveis",
)
async def list_municipios(session: DbSessionDep) -> Sequence[MunicipioDbModel]:
    repo = PesquisasRepository(session)
    return await repo.list_municipios()


@router.get(
    "/aux/amostras",
    response_model=list[AmostraOut],
    summary="Lista planos amostrais",
)
async def list_amostras(session: DbSessionDep, tenant: TenantDep) -> Sequence[AmostraDbModel]:
    repo = PesquisasRepository(session)
    return await repo.list_amostras(tenant_id=tenant.tenant_id)


@router.get(
    "/aux/profissionais",
    response_model=list[ProfissionalOut],
    summary="Lista profissionais",
)
async def list_profissionais(
    session: DbSessionDep, tenant: TenantDep
) -> Sequence[ProfissionalDbModel]:
    repo = PesquisasRepository(session)
    return await repo.list_profissionais(tenant_id=tenant.tenant_id)


@router.get(
    "/{id_pesquisa}",
    response_model=PesquisaOut,
    summary="Obtém detalhes de uma pesquisa",
)
async def get_pesquisa(
    id_pesquisa: int, session: DbSessionDep, tenant: TenantDep
) -> PesquisaDbModel:
    repo = PesquisasRepository(session)
    item = await repo.get_by_id(id_pesquisa, tenant_id=tenant.tenant_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pesquisa não encontrada."
        )
    return item


@router.post(
    "",
    response_model=PesquisaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastra nova pesquisa",
)
async def create_pesquisa(
    payload: PesquisaCreate, session: DbSessionDep, tenant: TenantDep
) -> PesquisaDbModel:
    repo = PesquisasRepository(session)
    return await repo.create(payload, tenant_id=tenant.tenant_id, user_id=tenant.user_id)


@router.put(
    "/{id_pesquisa}",
    response_model=PesquisaOut,
    summary="Atualiza dados da pesquisa",
)
async def update_pesquisa(
    id_pesquisa: int, payload: PesquisaUpdate, session: DbSessionDep, tenant: TenantDep
) -> PesquisaDbModel:
    repo = PesquisasRepository(session)
    item = await repo.update(id_pesquisa, payload, tenant_id=tenant.tenant_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pesquisa não encontrada."
        )
    return item


@router.patch(
    "/{id_pesquisa}/bloqueio",
    response_model=PesquisaOut,
    summary="Altera status de bloqueio da pesquisa",
)
async def toggle_bloqueio(
    id_pesquisa: int,
    session: DbSessionDep,
    tenant: TenantDep,
    is_bloqueada: Annotated[bool, Query()],
    motivo: Annotated[str | None, Query()] = None,
) -> PesquisaDbModel:
    repo = PesquisasRepository(session)
    item = await repo.set_bloqueio(
        id_pesquisa, is_bloqueada=is_bloqueada, motivo=motivo, tenant_id=tenant.tenant_id
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pesquisa não encontrada."
        )
    return item
