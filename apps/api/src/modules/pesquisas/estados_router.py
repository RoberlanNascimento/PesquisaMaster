"""Rotas CRUD assíncronas para a tabela 'estados' do banco de dados PostgreSQL."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session

estados_router = APIRouter(prefix="/estados", tags=["Estados do Brasil (PostgreSQL)"])
DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]


class EstadoCreate(BaseModel):
    sigla: str = Field(..., min_length=2, max_length=2, description="Sigla da UF (ex: SP, PR)")
    nome: str = Field(..., min_length=2, max_length=100, description="Nome por extenso do Estado")
    codigo_ibge: int = Field(..., ge=11, le=99, description="Código IBGE da UF de 2 dígitos")
    regiao: str = Field(..., description="Macrorregião (Norte, Nordeste, Sul, etc.)")
    populacao_total: int = Field(default=0, ge=0, description="População total Censo IBGE")
    eleitorado_total: int = Field(default=0, ge=0, description="Eleitorado total TSE")


class EstadoUpdate(BaseModel):
    sigla: str | None = None
    nome: str | None = None
    codigo_ibge: int | None = None
    regiao: str | None = None
    populacao_total: int | None = None
    eleitorado_total: int | None = None


@estados_router.get("", summary="Lista os 27 estados do banco de dados")
async def list_estados(
    session: DbSessionDep,
    q: Annotated[str | None, Query(description="Busca por sigla ou nome")] = None,
    regiao: Annotated[str | None, Query(description="Filtro por macrorregião")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
) -> list[dict[str, Any]]:
    sql = "SELECT * FROM estados WHERE 1=1"
    params: dict[str, Any] = {"lim": limit}
    if q and q.strip():
        sql += " AND (UPPER(sigla) LIKE :q OR LOWER(nome) LIKE :ql)"
        params["q"] = f"%{q.strip().upper()}%"
        params["ql"] = f"%{q.strip().lower()}%"
    if regiao and regiao.strip() and regiao != "ALL":
        sql += " AND regiao = :regiao"
        params["regiao"] = regiao.strip()
    sql += " ORDER BY id_estado ASC LIMIT :lim"
    res = await session.execute(text(sql), params)
    return [dict(r._mapping) for r in res.fetchall()]


@estados_router.get("/{id_estado}", summary="Obtém detalhes de um estado")
async def get_estado(id_estado: int, session: DbSessionDep) -> dict[str, Any]:
    res = await session.execute(
        text("SELECT * FROM estados WHERE id_estado = :id"), {"id": id_estado}
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estado não encontrado.")
    return dict(row._mapping)


@estados_router.post("", status_code=status.HTTP_201_CREATED, summary="Cadastra novo estado")
async def create_estado(payload: EstadoCreate, session: DbSessionDep) -> dict[str, Any]:
    query = text(
        "INSERT INTO estados (sigla, nome, codigo_ibge, regiao, populacao_total, eleitorado_total) "
        "VALUES (:sigla, :nome, :codigo_ibge, :regiao, :populacao_total, :eleitorado_total) "
        "RETURNING *"
    )
    res = await session.execute(
        query,
        {
            "sigla": payload.sigla.strip().upper(),
            "nome": payload.nome.strip(),
            "codigo_ibge": payload.codigo_ibge,
            "regiao": payload.regiao.strip(),
            "populacao_total": payload.populacao_total,
            "eleitorado_total": payload.eleitorado_total,
        },
    )
    await session.commit()
    created = res.fetchone()
    if not created:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Erro ao criar estado.")
    return dict(created._mapping)


@estados_router.put("/{id_estado}", summary="Atualiza dados do estado")
async def update_estado(
    id_estado: int, payload: EstadoUpdate, session: DbSessionDep
) -> dict[str, Any]:
    current_res = await session.execute(
        text("SELECT * FROM estados WHERE id_estado = :id"), {"id": id_estado}
    )
    current = current_res.fetchone()
    if not current:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estado não encontrado.")
    cur_map = dict(current._mapping)

    query = text(
        "UPDATE estados SET sigla = :sigla, nome = :nome, codigo_ibge = :codigo_ibge, "
        "regiao = :regiao, populacao_total = :populacao_total, "
        "eleitorado_total = :eleitorado_total "
        "WHERE id_estado = :id RETURNING *"
    )
    clean_sigla = payload.sigla.strip().upper() if payload.sigla else cur_map["sigla"]
    clean_nome = payload.nome.strip() if payload.nome else cur_map["nome"]
    clean_ibge = payload.codigo_ibge if payload.codigo_ibge is not None else cur_map["codigo_ibge"]
    clean_regiao = payload.regiao.strip() if payload.regiao else cur_map["regiao"]
    pop_val = (
        payload.populacao_total
        if payload.populacao_total is not None
        else cur_map["populacao_total"]
    )
    eleit_val = (
        payload.eleitorado_total
        if payload.eleitorado_total is not None
        else cur_map["eleitorado_total"]
    )

    res = await session.execute(
        query,
        {
            "id": id_estado,
            "sigla": clean_sigla,
            "nome": clean_nome,
            "codigo_ibge": clean_ibge,
            "regiao": clean_regiao,
            "populacao_total": pop_val,
            "eleitorado_total": eleit_val,
        },
    )
    await session.commit()
    updated = res.fetchone()
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Erro ao atualizar estado."
        )
    return dict(updated._mapping)


@estados_router.delete("/{id_estado}", summary="Remove estado")
async def delete_estado(id_estado: int, session: DbSessionDep) -> dict[str, Any]:
    res = await session.execute(
        text("DELETE FROM estados WHERE id_estado = :id RETURNING id_estado"), {"id": id_estado}
    )
    deleted = res.fetchone()
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Estado não encontrado.")
    await session.commit()
    return {"deleted": True, "id_estado": id_estado}
