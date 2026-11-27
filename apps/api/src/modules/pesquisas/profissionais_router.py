"""Rotas REST para gestão de profissionais de campo (tabela 'profissionais')."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.modules.pesquisas.tenant_context import (
    TenantContext,
    get_current_user,
    get_tenant_context,
)

profissionais_router = APIRouter(
    prefix="/pesquisas-tabelas/profissionais",
    tags=["Profissionais de Campo"],
    dependencies=[Depends(get_current_user)],
)
DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
TenantDep = Annotated[TenantContext, Depends(get_tenant_context)]


class ProfissionalCreateIn(BaseModel):
    nome: str = Field(..., min_length=2, max_length=150)
    cpf_cnpj: str = Field(..., min_length=11, max_length=20)
    registro_profissional: str | None = Field(default=None, max_length=100)
    especialidade: str = Field(default="Entrevistador de Campo", max_length=150)
    tipo_profissional: str = Field(default="pesquisador_campo", max_length=60)
    telefone: str | None = Field(default=None, max_length=30)
    dispositivo_uuid: str | None = Field(default=None, max_length=100)
    id_organizacao: int = Field(default=1, ge=1)


@profissionais_router.get("", summary="Lista profissionais da tabela 'profissionais'")
async def list_profissionais(
    session: DbSessionDep,
    tenant: TenantDep,
    limit: int = 100,
) -> list[dict]:
    res = await session.execute(
        text("""
            SELECT id_profissional, nome, registro_profissional, cpf_cnpj,
                   especialidade, tipo_profissional, telefone, ativo,
                   id_organizacao
            FROM campo_profissionais
            WHERE id_organizacao = :tid
            ORDER BY id_profissional ASC
            LIMIT :lim
        """),
        {"tid": tenant.tenant_id, "lim": limit},
    )
    return [dict(r._mapping) for r in res.fetchall()]


@profissionais_router.post("", status_code=status.HTTP_201_CREATED, summary="Cadastra novo profissional")
async def create_profissional(
    payload: ProfissionalCreateIn,
    session: DbSessionDep,
    tenant: TenantDep,
) -> dict:
    reg = payload.registro_profissional.strip() if payload.registro_profissional else None
    res = await session.execute(
        text("""
            INSERT INTO campo_profissionais (
                nome, registro_profissional, cpf_cnpj, especialidade, tipo_profissional,
                telefone, ativo, id_organizacao
            )
            VALUES (
                :nome, :reg, :cpf, :esp, :tipo,
                :tel, TRUE, :id_org
            )
            RETURNING id_profissional, nome, registro_profissional, cpf_cnpj,
                      especialidade, tipo_profissional, telefone, ativo,
                      id_organizacao
        """),
        {
            "nome": payload.nome.strip(),
            "reg": reg,
            "cpf": payload.cpf_cnpj.strip(),
            "esp": payload.especialidade.strip(),
            "tipo": payload.tipo_profissional.strip(),
            "tel": payload.telefone.strip() if payload.telefone else None,
            "id_org": tenant.tenant_id,
        },
    )
    await session.commit()
    row = res.fetchone()
    return dict(row._mapping) if row else {}


@profissionais_router.put("/{id_profissional}", summary="Atualiza dados do profissional")
async def update_profissional(
    id_profissional: int,
    payload: ProfissionalCreateIn,
    session: DbSessionDep,
    tenant: TenantDep,
) -> dict:
    reg = payload.registro_profissional.strip() if payload.registro_profissional else None
    res = await session.execute(
        text("""
            UPDATE campo_profissionais
            SET nome = :nome,
                registro_profissional = COALESCE(:reg, registro_profissional),
                cpf_cnpj = :cpf,
                especialidade = :esp,
                tipo_profissional = :tipo,
                telefone = :tel
            WHERE id_profissional = :id_p
              AND id_organizacao = :tid
            RETURNING id_profissional, nome, registro_profissional, cpf_cnpj,
                      especialidade, tipo_profissional, telefone, ativo,
                      id_organizacao
        """),
        {
            "id_p": id_profissional,
            "tid": tenant.tenant_id,
            "nome": payload.nome.strip(),
            "reg": reg,
            "cpf": payload.cpf_cnpj.strip(),
            "esp": payload.especialidade.strip(),
            "tipo": payload.tipo_profissional.strip(),
            "tel": payload.telefone.strip() if payload.telefone else None,
        },
    )
    await session.commit()
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profissional não encontrado.")
    return dict(row._mapping)


@profissionais_router.patch("/{id_profissional}/status", summary="Suspende ou reativa profissional")
async def toggle_profissional_status(
    id_profissional: int,
    session: DbSessionDep,
    tenant: TenantDep,
) -> dict:
    res = await session.execute(
        text("""
            UPDATE campo_profissionais
            SET ativo = NOT ativo
            WHERE id_profissional = :id_p
              AND id_organizacao = :tid
            RETURNING id_profissional, nome, ativo
        """),
        {"id_p": id_profissional, "tid": tenant.tenant_id},
    )
    await session.commit()
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profissional não encontrado.")
    return dict(row._mapping)

