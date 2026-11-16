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

router = APIRouter(prefix="/pesquisas", tags=["Banco de Dados Pesquisas (PostgreSQL)"])
DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]


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
    search: Annotated[str | None, Query(description="Busca textual por nome")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> Sequence[PesquisaDbModel]:
    repo = PesquisasRepository(session)
    return await repo.list_pesquisas(search=search, limit=limit, offset=offset)


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
async def list_amostras(session: DbSessionDep) -> Sequence[AmostraDbModel]:
    repo = PesquisasRepository(session)
    return await repo.list_amostras()


@router.get(
    "/aux/profissionais",
    response_model=list[ProfissionalOut],
    summary="Lista profissionais",
)
async def list_profissionais(session: DbSessionDep) -> Sequence[ProfissionalDbModel]:
    repo = PesquisasRepository(session)
    return await repo.list_profissionais()


@router.get(
    "/{id_pesquisa}",
    response_model=PesquisaOut,
    summary="Obtém detalhes de uma pesquisa",
)
async def get_pesquisa(id_pesquisa: int, session: DbSessionDep) -> PesquisaDbModel:
    repo = PesquisasRepository(session)
    item = await repo.get_by_id(id_pesquisa)
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
async def create_pesquisa(payload: PesquisaCreate, session: DbSessionDep) -> PesquisaDbModel:
    repo = PesquisasRepository(session)
    return await repo.create(payload)


@router.put(
    "/{id_pesquisa}",
    response_model=PesquisaOut,
    summary="Atualiza dados da pesquisa",
)
async def update_pesquisa(
    id_pesquisa: int, payload: PesquisaUpdate, session: DbSessionDep
) -> PesquisaDbModel:
    repo = PesquisasRepository(session)
    item = await repo.update(id_pesquisa, payload)
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
    is_bloqueada: Annotated[bool, Query()],
    motivo: Annotated[str | None, Query()] = None,
) -> PesquisaDbModel:
    repo = PesquisasRepository(session)
    item = await repo.set_bloqueio(id_pesquisa, is_bloqueada=is_bloqueada, motivo=motivo)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Pesquisa não encontrada."
        )
    return item
