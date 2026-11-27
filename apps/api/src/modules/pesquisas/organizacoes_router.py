"""Rotas REST para gestão de organizações (tabela 'organizacoes')."""

import asyncio
import base64
import hashlib
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.modules.pesquisas.tenant_context import (
    TenantContext,
    get_current_user,
    get_tenant_context,
)
from src.services.gcs import get_gcs_service

organizacoes_router = APIRouter(prefix="/pesquisas-tabelas/organizacoes", tags=["Organizações SaaS"])
DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
TenantDep = Annotated[TenantContext, Depends(get_tenant_context)]
_AUTH_DEPS = [Depends(get_current_user)]


def _is_proxy_logo_url(url: str | None) -> bool:
    if not url:
        return False
    low = url.strip().lower()
    return "/pesquisas-tabelas/organizacoes/" in low and "/logomarca/view" in low


def _format_logo_display_url(id_organizacao: int, raw_url: str | None) -> str | None:
    if not raw_url or not isinstance(raw_url, str):
        return None
    cleaned = raw_url.strip()
    if not cleaned:
        return None
    if _is_proxy_logo_url(cleaned):
        return cleaned
    if "storage.googleapis.com" in cleaned.lower():
        ver = hashlib.md5(cleaned.encode("utf-8")).hexdigest()[:8]
        return f"http://127.0.0.1:8000/api/v1/pesquisas-tabelas/organizacoes/{id_organizacao}/logomarca/view?v={ver}"
    return cleaned


class OrganizacaoPayload(BaseModel):
    razao_social: str = Field(..., min_length=2, max_length=200)
    nome_fantasia: str = Field(..., min_length=2, max_length=150)
    cnpj: str = Field(..., min_length=11, max_length=20)
    slug_subdominio: str = Field(default="matriz", min_length=2, max_length=60)
    plano_assinatura: str = Field(default="enterprise")
    status_assinatura: str = Field(default="ativa")
    limite_pesquisas_ativas: int = Field(default=10, ge=1)
    limite_entrevistas_mes: int = Field(default=10000, ge=100)
    logomarca: str | None = Field(default=None)


@organizacoes_router.get(
    "/branding",
    summary="Retorna branding público (nome, razão social e logomarca) para a tela de login",
)
async def get_organizacao_branding(
    session: DbSessionDep,
    email: str | None = None,
    id_organizacao: int | None = None,
) -> dict:
    row = None
    if email and email.strip():
        res = await session.execute(
            text("""
                SELECT o.id_organizacao, o.nome_fantasia, o.razao_social, o.logomarca
                FROM public.sys_organizacoes o
                JOIN public.sys_usuarios u ON u.id_organizacao = o.id_organizacao
                WHERE LOWER(u.email) = LOWER(:email)
                LIMIT 1
            """),
            {"email": email.strip()},
        )
        row = res.mappings().first()

    if row is None and id_organizacao is not None:
        res = await session.execute(
            text("""
                SELECT id_organizacao, nome_fantasia, razao_social, logomarca
                FROM public.sys_organizacoes
                WHERE id_organizacao = :id_org
                LIMIT 1
            """),
            {"id_org": id_organizacao},
        )
        row = res.mappings().first()

    if row is None:
        res = await session.execute(
            text("""
                SELECT id_organizacao, nome_fantasia, razao_social, logomarca
                FROM public.sys_organizacoes
                ORDER BY id_organizacao ASC
                LIMIT 1
            """)
        )
        row = res.mappings().first()

    if not row:
        return {
            "id_organizacao": 1,
            "nome_fantasia": "PesquisaMaster",
            "razao_social": "Plataforma Eleitoral, Tabulação TSE & Agregador Multi-Tenant",
            "logomarca": None,
        }
    out = dict(row)
    out["logomarca"] = _format_logo_display_url(int(out["id_organizacao"]), out.get("logomarca"))
    return out


@organizacoes_router.get(
    "/{id_organizacao}/logomarca/view",
    summary="Proxy público da logomarca da organização armazenada no GCS",
)
async def view_organizacao_logomarca(
    id_organizacao: int,
    session: DbSessionDep,
) -> Response:
    res = await session.execute(
        text("SELECT logomarca FROM public.sys_organizacoes WHERE id_organizacao = :id_org"),
        {"id_org": id_organizacao},
    )
    raw_logo = res.scalar_one_or_none()
    if not raw_logo or not isinstance(raw_logo, str) or not raw_logo.strip():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Logomarca não encontrada.")

    cleaned = raw_logo.strip()
    if cleaned.startswith("data:") and "," in cleaned:
        header, b64_data = cleaned.split(",", 1)
        mime = header.removeprefix("data:").split(";", 1)[0] or "image/png"
        try:
            img_bytes = base64.b64decode(b64_data)
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Logomarca base64 inválida.") from exc
        return Response(
            content=img_bytes,
            media_type=mime,
            headers={"Cache-Control": "no-cache", "Cross-Origin-Resource-Policy": "cross-origin"},
        )

    gcs = get_gcs_service()
    downloaded = await asyncio.to_thread(gcs.download_file, cleaned)
    if downloaded is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo de logomarca não encontrado no GCS.")
    data, content_type = downloaded
    return Response(
        content=data,
        media_type=content_type,
        headers={"Cache-Control": "no-cache", "Cross-Origin-Resource-Policy": "cross-origin"},
    )


@organizacoes_router.get("", dependencies=_AUTH_DEPS, summary="Lista a organização do tenant autenticado")
async def list_organizacoes(session: DbSessionDep, tenant: TenantDep) -> list[dict]:
    res = await session.execute(
        text("""
            SELECT id_organizacao, razao_social, nome_fantasia, cnpj, slug_subdominio,
                   plano_assinatura, status_assinatura, limite_pesquisas_ativas,
                   limite_entrevistas_mes, ativo, criado_em, logomarca
            FROM sys_organizacoes
            WHERE id_organizacao = :tid
            ORDER BY id_organizacao ASC
        """),
        {"tid": tenant.tenant_id},
    )
    rows = []
    for r in res.fetchall():
        item = dict(r._mapping)
        item["logomarca"] = _format_logo_display_url(int(item["id_organizacao"]), item.get("logomarca"))
        rows.append(item)
    return rows


@organizacoes_router.post("", status_code=status.HTTP_201_CREATED, dependencies=_AUTH_DEPS, summary="Cria nova organização")
async def create_organizacao(payload: OrganizacaoPayload, session: DbSessionDep) -> dict:
    res = await session.execute(
        text("""
            INSERT INTO sys_organizacoes (
                razao_social, nome_fantasia, cnpj, slug_subdominio,
                plano_assinatura, status_assinatura, limite_pesquisas_ativas,
                limite_entrevistas_mes, ativo, logomarca
            )
            VALUES (
                :razao_social, :nome_fantasia, :cnpj, :slug,
                :plano, :status_ass, :lim_pesq, :lim_ent, TRUE, :logomarca
            )
            RETURNING id_organizacao, razao_social, nome_fantasia, cnpj, slug_subdominio,
                      plano_assinatura, status_assinatura, limite_pesquisas_ativas,
                      limite_entrevistas_mes, ativo, criado_em, logomarca
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
            "logomarca": payload.logomarca.strip() if payload.logomarca else None,
        },
    )
    await session.commit()
    row = res.fetchone()
    return dict(row._mapping) if row else {}


@organizacoes_router.put("/{id_organizacao}", dependencies=_AUTH_DEPS, summary="Atualiza dados da organização do tenant autenticado")
async def update_organizacao(
    id_organizacao: int,
    payload: OrganizacaoPayload,
    session: DbSessionDep,
    tenant: TenantDep,
) -> dict:
    if id_organizacao != tenant.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você só tem permissão para editar os dados da sua própria organização.",
        )

    incoming_logo = payload.logomarca.strip() if payload.logomarca else None
    keep_existing_logo = _is_proxy_logo_url(incoming_logo)

    res = await session.execute(
        text("""
            UPDATE sys_organizacoes
            SET razao_social = :razao_social,
                nome_fantasia = :nome_fantasia,
                cnpj = :cnpj,
                slug_subdominio = :slug,
                plano_assinatura = :plano,
                status_assinatura = :status_ass,
                limite_pesquisas_ativas = :lim_pesq,
                limite_entrevistas_mes = :lim_ent,
                logomarca = CASE WHEN :keep_existing THEN logomarca ELSE :logomarca END
            WHERE id_organizacao = :id_org
            RETURNING id_organizacao, razao_social, nome_fantasia, cnpj, slug_subdominio,
                      plano_assinatura, status_assinatura, limite_pesquisas_ativas,
                      limite_entrevistas_mes, ativo, criado_em, logomarca
        """),
        {
            "id_org": tenant.tenant_id,
            "razao_social": payload.razao_social.strip(),
            "nome_fantasia": payload.nome_fantasia.strip(),
            "cnpj": payload.cnpj.strip(),
            "slug": payload.slug_subdominio.strip().lower(),
            "plano": payload.plano_assinatura.strip(),
            "status_ass": payload.status_assinatura.strip(),
            "lim_pesq": payload.limite_pesquisas_ativas,
            "lim_ent": payload.limite_entrevistas_mes,
            "keep_existing": keep_existing_logo,
            "logomarca": None if keep_existing_logo else incoming_logo,
        },
    )
    await session.commit()
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organização não encontrada.")
    out = dict(row._mapping)
    out["logomarca"] = _format_logo_display_url(int(out["id_organizacao"]), out.get("logomarca"))
    return out


_ALLOWED_LOGO_TYPES = {"image/png", "image/jpeg", "image/webp", "image/svg+xml"}
_MAX_LOGO_BYTES = 5 * 1024 * 1024  # 5 MB


@organizacoes_router.post(
    "/{id_organizacao}/logomarca",
    status_code=status.HTTP_200_OK,
    dependencies=_AUTH_DEPS,
    summary="Faz upload da logomarca da organização para o GCS (com fallback local)",
)
async def upload_organizacao_logomarca(
    id_organizacao: int,
    session: DbSessionDep,
    tenant: TenantDep,
    file: UploadFile = File(...),
) -> dict:
    if id_organizacao != tenant.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você só tem permissão para alterar a logomarca da sua própria organização.",
        )

    content_type = (file.content_type or "").lower().strip()
    if content_type not in _ALLOWED_LOGO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de imagem inválido. Use PNG, JPEG, WEBP ou SVG.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo de imagem vazio.",
        )
    if len(file_bytes) > _MAX_LOGO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="A logomarca excede o tamanho máximo permitido de 5 MB.",
        )

    logo_url: str
    storage_mode = "inline_fallback"
    gcs = get_gcs_service()
    if gcs.is_configured:
        try:
            logo_url = gcs.upload_file(
                file_bytes,
                destination_folder="organizacoes",
                filename=file.filename or f"org_{id_organizacao}.png",
                content_type=content_type,
                make_public=True,
            )
            storage_mode = "gcs"
        except Exception:
            b64 = base64.b64encode(file_bytes).decode("ascii")
            logo_url = f"data:{content_type};base64,{b64}"
    else:
        b64 = base64.b64encode(file_bytes).decode("ascii")
        logo_url = f"data:{content_type};base64,{b64}"

    res = await session.execute(
        text("""
            UPDATE sys_organizacoes
            SET logomarca = :logo
            WHERE id_organizacao = :id_org
            RETURNING id_organizacao, logomarca
        """),
        {"logo": logo_url, "id_org": tenant.tenant_id},
    )
    await session.commit()
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organização não encontrada.")

    return {
        "id_organizacao": id_organizacao,
        "logomarca": _format_logo_display_url(id_organizacao, logo_url),
        "storage": storage_mode,
    }

