"""Rotas CRUD assíncronas para a tabela 'bairros_ibge' do PostgreSQL."""

from decimal import Decimal
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session

bairros_router = APIRouter(prefix="/bairros", tags=["Bairros IBGE (PostgreSQL)"])
DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]


class BairroCreate(BaseModel):
    id_municipio: int = Field(default=1, description="ID do município vinculado")
    id_regiao_zona: int = Field(default=1, description="ID da região/zona vinculada")
    codigo_bairro_ibge: str | None = Field(default=None, description="Código IBGE do setor")
    nome_bairro: str = Field(..., min_length=2, max_length=120, description="Nome do bairro")
    populacao_total: int = Field(default=0, ge=0, description="População total do censo")
    eleitorado_total: int = Field(default=0, ge=0, description="Eleitorado total TSE")
    renda_media_domiciliar: float | None = Field(default=None, description="Renda média em R$")
    ativo: bool = Field(default=True, description="Status ativo do bairro")


class BairroUpdate(BaseModel):
    id_municipio: int | None = None
    id_regiao_zona: int | None = None
    codigo_bairro_ibge: str | None = None
    nome_bairro: str | None = None
    populacao_total: int | None = None
    eleitorado_total: int | None = None
    renda_media_domiciliar: float | None = None
    ativo: bool | None = None


def _format_bairro_row(row: Any) -> dict[str, Any]:
    d = dict(row._mapping)
    if isinstance(d.get("renda_media_domiciliar"), Decimal):
        d["renda_media_domiciliar"] = float(d["renda_media_domiciliar"])
    return d


@bairros_router.get("", summary="Lista bairros do banco de dados")
async def list_bairros(
    session: DbSessionDep,
    id_municipio: Annotated[int | None, Query(description="Filtro por município")] = None,
    id_regiao_zona: Annotated[int | None, Query(description="Filtro por região/zona")] = None,
    q: Annotated[str | None, Query(description="Busca por nome ou código")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
) -> list[dict[str, Any]]:
    sql = (
        "SELECT b.*, r.nome_regiao, r.sigla AS regiao_sigla, m.nome AS municipio_nome, "
        "e.sigla AS uf FROM geo_bairros_ibge b "
        "LEFT JOIN geo_regiao_zonas r ON b.id_regiao_zona = r.id_regiao_zona "
        "LEFT JOIN geo_municipios m ON b.id_municipio = m.id_municipio "
        "LEFT JOIN geo_estados e ON m.id_estado = e.id_estado "
        "WHERE 1=1"
    )
    params: dict[str, Any] = {"lim": limit}
    if id_municipio:
        sql += " AND b.id_municipio = :id_mun"
        params["id_mun"] = id_municipio
    if id_regiao_zona:
        sql += " AND b.id_regiao_zona = :id_rz"
        params["id_rz"] = id_regiao_zona
    if q and q.strip():
        sql += " AND (LOWER(b.nome_bairro) LIKE :ql OR b.codigo_bairro_ibge LIKE :qc)"
        params["ql"] = f"%{q.strip().lower()}%"
        params["qc"] = f"%{q.strip()}%"
    sql += " ORDER BY b.id_bairro ASC LIMIT :lim"
    res = await session.execute(text(sql), params)
    return [_format_bairro_row(r) for r in res.fetchall()]


@bairros_router.get("/{id_bairro}", summary="Obtém detalhes de um bairro")
async def get_bairro(id_bairro: int, session: DbSessionDep) -> dict[str, Any]:
    sql = (
        "SELECT b.*, r.nome_regiao, r.sigla AS regiao_sigla, m.nome AS municipio_nome, "
        "e.sigla AS uf FROM geo_bairros_ibge b "
        "LEFT JOIN geo_regiao_zonas r ON b.id_regiao_zona = r.id_regiao_zona "
        "LEFT JOIN geo_municipios m ON b.id_municipio = m.id_municipio "
        "LEFT JOIN geo_estados e ON m.id_estado = e.id_estado "
        "WHERE b.id_bairro = :id"
    )
    res = await session.execute(text(sql), {"id": id_bairro})
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bairro não encontrado.")
    return _format_bairro_row(row)


@bairros_router.post("", status_code=status.HTTP_201_CREATED, summary="Cadastra novo bairro")
async def create_bairro(payload: BairroCreate, session: DbSessionDep) -> dict[str, Any]:
    query = text(
        "INSERT INTO geo_bairros_ibge (id_municipio, id_regiao_zona, codigo_bairro_ibge, "
        "nome_bairro, populacao_total, eleitorado_total, renda_media_domiciliar, ativo) "
        "VALUES (:id_mun, :id_rz, :cod, :nome, :pop, :eleit, :renda, :ativo) RETURNING *"
    )
    res = await session.execute(
        query,
        {
            "id_mun": payload.id_municipio,
            "id_rz": payload.id_regiao_zona,
            "cod": payload.codigo_bairro_ibge.strip() if payload.codigo_bairro_ibge else None,
            "nome": payload.nome_bairro.strip(),
            "pop": payload.populacao_total,
            "eleit": payload.eleitorado_total,
            "renda": payload.renda_media_domiciliar,
            "ativo": payload.ativo,
        },
    )
    await session.commit()
    created = res.fetchone()
    if not created:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Erro ao criar bairro.")
    return _format_bairro_row(created)


@bairros_router.put("/{id_bairro}", summary="Atualiza dados do bairro")
async def update_bairro(
    id_bairro: int, payload: BairroUpdate, session: DbSessionDep
) -> dict[str, Any]:
    current_res = await session.execute(
        text("SELECT * FROM geo_bairros_ibge WHERE id_bairro = :id"), {"id": id_bairro}
    )
    current = current_res.fetchone()
    if not current:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bairro não encontrado.")
    cur_map = dict(current._mapping)

    clean_mun = (
        payload.id_municipio if payload.id_municipio is not None else cur_map["id_municipio"]
    )
    clean_rz = (
        payload.id_regiao_zona if payload.id_regiao_zona is not None else cur_map["id_regiao_zona"]
    )
    clean_cod = (
        payload.codigo_bairro_ibge
        if payload.codigo_bairro_ibge is not None
        else cur_map["codigo_bairro_ibge"]
    )
    clean_nome = payload.nome_bairro.strip() if payload.nome_bairro else cur_map["nome_bairro"]
    clean_pop = (
        payload.populacao_total
        if payload.populacao_total is not None
        else cur_map["populacao_total"]
    )
    clean_eleit = (
        payload.eleitorado_total
        if payload.eleitorado_total is not None
        else cur_map["eleitorado_total"]
    )
    clean_renda = (
        payload.renda_media_domiciliar
        if payload.renda_media_domiciliar is not None
        else cur_map["renda_media_domiciliar"]
    )
    clean_ativo = payload.ativo if payload.ativo is not None else cur_map["ativo"]

    query = text(
        "UPDATE geo_bairros_ibge SET id_municipio = :id_mun, id_regiao_zona = :id_rz, "
        "codigo_bairro_ibge = :cod, nome_bairro = :nome, populacao_total = :pop, "
        "eleitorado_total = :eleit, renda_media_domiciliar = :renda, ativo = :ativo "
        "WHERE id_bairro = :id RETURNING *"
    )
    res = await session.execute(
        query,
        {
            "id": id_bairro,
            "id_mun": clean_mun,
            "id_rz": clean_rz,
            "cod": clean_cod,
            "nome": clean_nome,
            "pop": clean_pop,
            "eleit": clean_eleit,
            "renda": clean_renda,
            "ativo": clean_ativo,
        },
    )
    await session.commit()
    updated = res.fetchone()
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Erro ao atualizar bairro."
        )
    return _format_bairro_row(updated)


@bairros_router.delete("/{id_bairro}", summary="Remove bairro")
async def delete_bairro(id_bairro: int, session: DbSessionDep) -> dict[str, Any]:
    res = await session.execute(
        text("DELETE FROM geo_bairros_ibge WHERE id_bairro = :id RETURNING id_bairro"),
        {"id": id_bairro},
    )
    deleted = res.fetchone()
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bairro não encontrado.")
    await session.commit()
    return {"deleted": True, "id_bairro": id_bairro}
