"""Rotas REST para gestão de organizações (tabela 'organizacoes')."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session

organizacoes_router = APIRouter(prefix="/pesquisas-tabelas/organizacoes", tags=["Organizações SaaS"])
DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]


class OrganizacaoPayload(BaseModel):
    razao_social: str = Field(..., min_length=2, max_length=200)
    nome_fantasia: str = Field(..., min_length=2, max_length=150)
    cnpj: str = Field(..., min_length=11, max_length=20)
    slug_subdominio: str = Field(default="matriz", min_length=2, max_length=60)
    plano_assinatura: str = Field(default="enterprise")
    status_assinatura: str = Field(default="ativa")
    limite_pesquisas_ativas: int = Field(default=10, ge=1)
    limite_entrevistas_mes: int = Field(default=10000, ge=100)


@organizacoes_router.get("", summary="Lista organizações cadastradas")
async def list_organizacoes(session: DbSessionDep) -> list[dict]:
    res = await session.execute(
        text("""
            SELECT id_organizacao, razao_social, nome_fantasia, cnpj, slug_subdominio,
                   plano_assinatura, status_assinatura, limite_pesquisas_ativas,
                   limite_entrevistas_mes, ativo, criado_em
            FROM organizacoes
            ORDER BY id_organizacao ASC
        """)
    )
    return [dict(r._mapping) for r in res.fetchall()]


@organizacoes_router.post("", status_code=status.HTTP_201_CREATED, summary="Cria nova organização")
async def create_organizacao(payload: OrganizacaoPayload, session: DbSessionDep) -> dict:
    res = await session.execute(
        text("""
            INSERT INTO organizacoes (
                razao_social, nome_fantasia, cnpj, slug_subdominio,
                plano_assinatura, status_assinatura, limite_pesquisas_ativas,
                limite_entrevistas_mes, ativo
            )
            VALUES (
                :razao_social, :nome_fantasia, :cnpj, :slug,
                :plano, :status_ass, :lim_pesq, :lim_ent, TRUE
            )
            RETURNING id_organizacao, razao_social, nome_fantasia, cnpj, slug_subdominio,
                      plano_assinatura, status_assinatura, limite_pesquisas_ativas,
                      limite_entrevistas_mes, ativo, criado_em
        """),
        {
            "razao_social": payload.razao_social.strip(),
            "nome_fantasia": payload.nome_fantasia.strip(),
            "cnpj": payload.cnpj.strip(),
            "slug": payload.slug_subdominio.strip().lower(),
            "plano": payload.plano_assinatura.strip(),
            "status_ass": payload.status_assinatura.strip(),
            "lim_pesq": payload.limite_pesquisas_ativas,
            "lim_ent": payload.limite_entrevistas_mes,
        },
    )
    await session.commit()
    row = res.fetchone()
    return dict(row._mapping) if row else {}


@organizacoes_router.put("/{id_organizacao}", summary="Atualiza dados da organização")
async def update_organizacao(
    id_organizacao: int,
    payload: OrganizacaoPayload,
    session: DbSessionDep,
) -> dict:
    res = await session.execute(
        text("""
            UPDATE organizacoes
            SET razao_social = :razao_social,
                nome_fantasia = :nome_fantasia,
                cnpj = :cnpj,
                slug_subdominio = :slug,
                plano_assinatura = :plano,
                status_assinatura = :status_ass,
                limite_pesquisas_ativas = :lim_pesq,
                limite_entrevistas_mes = :lim_ent
            WHERE id_organizacao = :id_org
            RETURNING id_organizacao, razao_social, nome_fantasia, cnpj, slug_subdominio,
                      plano_assinatura, status_assinatura, limite_pesquisas_ativas,
                      limite_entrevistas_mes, ativo, criado_em
        """),
        {
            "id_org": id_organizacao,
            "razao_social": payload.razao_social.strip(),
            "nome_fantasia": payload.nome_fantasia.strip(),
            "cnpj": payload.cnpj.strip(),
            "slug": payload.slug_subdominio.strip().lower(),
            "plano": payload.plano_assinatura.strip(),
            "status_ass": payload.status_assinatura.strip(),
            "lim_pesq": payload.limite_pesquisas_ativas,
            "lim_ent": payload.limite_entrevistas_mes,
        },
    )
    await session.commit()
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organização não encontrada.")
    return dict(row._mapping)

