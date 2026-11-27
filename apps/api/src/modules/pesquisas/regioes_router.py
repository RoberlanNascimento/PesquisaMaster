"""Rotas CRUD assíncronas para a tabela 'regiao_zonas' do PostgreSQL."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session

regioes_router = APIRouter(prefix="/regioes", tags=["Regiões Municipais (PostgreSQL)"])
DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]


class RegiaoCreate(BaseModel):
    id_municipio: int = Field(default=1, description="ID do município vinculado")
    nome_regiao: str = Field(..., min_length=2, max_length=120, description="Nome da região")
    sigla: str | None = Field(default=None, max_length=10, description="Sigla da região")
    descricao: str | None = Field(default=None, description="Descrição da macrozona")
    ativo: bool = Field(default=True, description="Status ativo")
    id_organizacao: int = Field(default=1, description="Tenant / Organização")


class RegiaoUpdate(BaseModel):
    id_municipio: int | None = None
    nome_regiao: str | None = None
    sigla: str | None = None
    descricao: str | None = None
    ativo: bool | None = None
    id_organizacao: int | None = None


@regioes_router.get("", summary="Lista regiões municipais do banco de dados")
async def list_regioes(
    session: DbSessionDep,
    id_municipio: Annotated[int | None, Query(description="Filtro por município")] = None,
    q: Annotated[str | None, Query(description="Busca por nome ou sigla")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
) -> list[dict[str, Any]]:
    sql = (
        "SELECT r.*, m.nome AS municipio_nome, m.id_estado, e.sigla AS uf, e.nome AS estado_nome "
        "FROM geo_regiao_zonas r "
        "LEFT JOIN geo_municipios m ON r.id_municipio = m.id_municipio "
        "LEFT JOIN geo_estados e ON m.id_estado = e.id_estado "
        "WHERE 1=1"
    )
    params: dict[str, Any] = {"lim": limit}
    if id_municipio:
        sql += " AND r.id_municipio = :id_mun"
        params["id_mun"] = id_municipio
    if q and q.strip():
        sql += " AND (LOWER(r.nome_regiao) LIKE :ql OR UPPER(r.sigla) LIKE :qu)"
        params["ql"] = f"%{q.strip().lower()}%"
        params["qu"] = f"%{q.strip().upper()}%"
    sql += " ORDER BY r.id_regiao_zona ASC LIMIT :lim"
    res = await session.execute(text(sql), params)
    return [dict(row._mapping) for row in res.fetchall()]


@regioes_router.get("/{id_regiao_zona}", summary="Obtém detalhes de uma região municipal")
async def get_regiao(id_regiao_zona: int, session: DbSessionDep) -> dict[str, Any]:
    sql = (
        "SELECT r.*, m.nome AS municipio_nome, m.id_estado, e.sigla AS uf "
        "FROM geo_regiao_zonas r "
        "LEFT JOIN geo_municipios m ON r.id_municipio = m.id_municipio "
        "LEFT JOIN geo_estados e ON m.id_estado = e.id_estado "
        "WHERE r.id_regiao_zona = :id"
    )
    res = await session.execute(text(sql), {"id": id_regiao_zona})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Região não encontrada.")
    return dict(row._mapping)


@regioes_router.post("", status_code=status.HTTP_201_CREATED, summary="Cadastra região municipal")
async def create_regiao(payload: RegiaoCreate, session: DbSessionDep) -> dict[str, Any]:
    query = text(
        "INSERT INTO geo_regiao_zonas (id_municipio, nome_regiao, sigla, descricao, ativo, "
        "id_organizacao) VALUES (:id_mun, :nome, :sigla, :desc, :ativo, :id_org) RETURNING *"
    )
    res = await session.execute(
        query,
        {
            "id_mun": payload.id_municipio,
            "nome": payload.nome_regiao.strip(),
            "sigla": payload.sigla.strip().upper() if payload.sigla else None,
            "desc": payload.descricao.strip() if payload.descricao else None,
            "ativo": payload.ativo,
            "id_org": payload.id_organizacao,
        },
    )
    await session.commit()
    created = res.fetchone()
    if not created:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Erro ao criar região.")
    return dict(created._mapping)


@regioes_router.put("/{id_regiao_zona}", summary="Atualiza região municipal")
async def update_regiao(
    id_regiao_zona: int, payload: RegiaoUpdate, session: DbSessionDep
) -> dict[str, Any]:
    current_res = await session.execute(
        text("SELECT * FROM geo_regiao_zonas WHERE id_regiao_zona = :id"), {"id": id_regiao_zona}
    )
    current = current_res.fetchone()
    if not current:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Região não encontrada.")
    cur_map = dict(current._mapping)

    clean_mun = (
        payload.id_municipio if payload.id_municipio is not None else cur_map["id_municipio"]
    )
    clean_nome = payload.nome_regiao.strip() if payload.nome_regiao else cur_map["nome_regiao"]
    clean_sigla = payload.sigla.strip().upper() if payload.sigla is not None else cur_map["sigla"]
    clean_desc = (
        payload.descricao.strip() if payload.descricao is not None else cur_map["descricao"]
    )
    clean_ativo = payload.ativo if payload.ativo is not None else cur_map["ativo"]

    query = text(
        "UPDATE geo_regiao_zonas SET id_municipio = :id_mun, nome_regiao = :nome, "
        "sigla = :sigla, descricao = :desc, ativo = :ativo "
        "WHERE id_regiao_zona = :id RETURNING *"
    )
    res = await session.execute(
        query,
        {
            "id": id_regiao_zona,
            "id_mun": clean_mun,
            "nome": clean_nome,
            "sigla": clean_sigla,
            "desc": clean_desc,
            "ativo": clean_ativo,
        },
    )
    await session.commit()
    updated = res.fetchone()
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Erro ao atualizar região."
        )
    return dict(updated._mapping)


@regioes_router.delete("/{id_regiao_zona}", summary="Remove região municipal")
async def delete_regiao(id_regiao_zona: int, session: DbSessionDep) -> dict[str, Any]:
    res = await session.execute(
        text("DELETE FROM geo_regiao_zonas WHERE id_regiao_zona = :id RETURNING id_regiao_zona"),
        {"id": id_regiao_zona},
    )
    deleted = res.fetchone()
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Região não encontrada.")
    await session.commit()
    return {"deleted": True, "id_regiao_zona": id_regiao_zona}
