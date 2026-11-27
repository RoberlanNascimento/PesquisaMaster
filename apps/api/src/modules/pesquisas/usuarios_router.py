"""Rotas REST para gestão de usuários do sistema (tabela 'usuarios') e troca de senha."""

import asyncio
import base64
import hashlib
import hmac
import os
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.modules.pesquisas.tenant_context import TenantContext, get_tenant_context
from src.services.gcs import get_gcs_service

usuarios_router = APIRouter(prefix="/pesquisas-tabelas/usuarios", tags=["Usuários do Sistema"])
DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
TenantDep = Annotated[TenantContext, Depends(get_tenant_context)]

_ALLOWED_USER_FOTO_TYPES = {"image/png", "image/jpeg", "image/webp"}
_MAX_USER_FOTO_BYTES = 5 * 1024 * 1024  # 5 MB


def _format_user_foto_url(id_usuario: int, raw_url: str | None) -> str | None:
    if not raw_url or not isinstance(raw_url, str):
        return None
    cleaned = raw_url.strip()
    if not cleaned:
        return None
    ver = hashlib.md5(cleaned.encode("utf-8")).hexdigest()[:8]
    return f"http://127.0.0.1:8000/api/v1/pesquisas-tabelas/usuarios/{id_usuario}/foto/view?v={ver}"


class UsuarioCreateIn(BaseModel):
    nome: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    cargo: str = Field(default="Pesquisador", min_length=2, max_length=100)
    senha: str = Field(default="Mudar@123", min_length=6, max_length=128)
    id_organizacao: int = Field(default=1, ge=1)
    id_nivel_acesso: int | None = Field(default=None, ge=1)


class TrocarSenhaIn(BaseModel):
    email: EmailStr
    senha_atual: str = Field(..., min_length=1)
    nova_senha: str = Field(..., min_length=6, max_length=128)


def _pbkdf2_hash(password: str) -> str:
    salt = os.urandom(16).hex()
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"pbkdf2_sha256${salt}${dk.hex()}"


def _pbkdf2_verify(password: str, stored_hash: str) -> bool:
    parts = stored_hash.split("$")
    if len(parts) != 3 or parts[0] != "pbkdf2_sha256":
        return False
    _, salt, expected_hex = parts
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return hmac.compare_digest(dk.hex(), expected_hex)


async def _hash_password(session: AsyncSession, plain_password: str) -> str:
    try:
        res = await session.execute(
            text("SELECT crypt(:pwd, gen_salt('bf'))"),
            {"pwd": plain_password},
        )
        hashed = res.scalar()
        if hashed:
            return str(hashed)
    except Exception:
        pass
    return _pbkdf2_hash(plain_password)


async def _verify_password(session: AsyncSession, plain_password: str, stored_hash: str) -> bool:
    if stored_hash.startswith("pbkdf2_sha256$"):
        return _pbkdf2_verify(plain_password, stored_hash)
    if stored_hash.startswith("$2"):
        try:
            res = await session.execute(
                text("SELECT crypt(:pwd, :h) = :h"),
                {"pwd": plain_password, "h": stored_hash},
            )
            return bool(res.scalar())
        except Exception:
            return False
    return hmac.compare_digest(plain_password, stored_hash)


@usuarios_router.get("", summary="Lista usuários da tabela 'usuarios'")
async def list_usuarios(
    session: DbSessionDep,
    tenant: TenantDep,
    limit: int = 100,
) -> list[dict]:
    res = await session.execute(
        text("""
            SELECT u.id_usuario, u.nome, u.email, u.cargo, u.ativo, u.revogado,
                   u.id_organizacao, u.tentativas_falhas, u.bloqueado_ate, u.ultimo_login,
                   u.exige_troca_senha, u.id_nivel_acesso, u.foto_url,
                   n.codigo AS nivel_codigo, n.nome AS nivel_nome, n.nivel_hierarquia
            FROM sys_usuarios u
            LEFT JOIN public.sys_niveis_acesso n ON n.id_nivel_acesso = u.id_nivel_acesso
            WHERE u.id_organizacao = :tid
            ORDER BY u.id_usuario ASC
            LIMIT :lim
        """),
        {"tid": tenant.tenant_id, "lim": limit},
    )
    rows = []
    for r in res.fetchall():
        item = dict(r._mapping)
        item["foto_url"] = _format_user_foto_url(int(item["id_usuario"]), item.get("foto_url"))
        rows.append(item)
    return rows


@usuarios_router.post("", status_code=status.HTTP_201_CREATED, summary="Cadastra novo usuário")
async def create_usuario(
    payload: UsuarioCreateIn,
    session: DbSessionDep,
    tenant: TenantDep,
) -> dict:
    existing = await session.execute(
        text("SELECT id_usuario FROM sys_usuarios WHERE LOWER(email) = LOWER(:email)"),
        {"email": payload.email},
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um usuário cadastrado com este e-mail.",
        )

    cargo_final = payload.cargo.strip()
    id_nivel_final = payload.id_nivel_acesso
    if id_nivel_final is not None:
        n_res = await session.execute(
            text("SELECT codigo FROM public.sys_niveis_acesso WHERE id_nivel_acesso = :nid AND ativo = true"),
            {"nid": id_nivel_final},
        )
        nivel_codigo = n_res.scalar_one_or_none()
        if nivel_codigo:
            cargo_final = str(nivel_codigo)

    senha_hash = await _hash_password(session, payload.senha)
    is_admin = cargo_final.lower() in ("administrador", "master")
    res = await session.execute(
        text("""
            INSERT INTO sys_usuarios (
                nome, email, senha_hash, cargo, ativo, id_organizacao,
                tentativas_falhas, exige_troca_senha, id_nivel_acesso
            )
            VALUES (
                :nome, :email, :senha_hash, :cargo, TRUE, :id_org,
                0, :exige_troca, :id_nivel_acesso
            )
            RETURNING id_usuario, nome, email, cargo, ativo, id_organizacao,
                      ultimo_login, exige_troca_senha, id_nivel_acesso
        """),
        {
            "nome": payload.nome.strip(),
            "email": payload.email.strip().lower(),
            "senha_hash": senha_hash,
            "cargo": cargo_final,
            "id_org": tenant.tenant_id,
            "exige_troca": not is_admin,
            "id_nivel_acesso": id_nivel_final,
        },
    )
    await session.commit()
    row = res.fetchone()
    return dict(row._mapping) if row else {}


class UsuarioUpdateIn(BaseModel):
    nome: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    cargo: str = Field(..., min_length=2, max_length=100)


@usuarios_router.put("/{id_usuario}", summary="Atualiza dados cadastrais do usuário")
async def update_usuario(
    id_usuario: int,
    payload: UsuarioUpdateIn,
    session: DbSessionDep,
    tenant: TenantDep,
) -> dict:
    existing_res = await session.execute(
        text("""
            SELECT u.id_usuario, u.cargo, n.codigo AS nivel_codigo
            FROM sys_usuarios u
            LEFT JOIN public.sys_niveis_acesso n ON n.id_nivel_acesso = u.id_nivel_acesso
            WHERE u.id_usuario = :id_u AND u.id_organizacao = :tid
        """),
        {"id_u": id_usuario, "tid": tenant.tenant_id},
    )
    existing = existing_res.mappings().first()
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    is_master = (
        str(existing["cargo"] or "").strip().lower() == "master"
        or str(existing["nivel_codigo"] or "").strip().lower() == "master"
    )
    new_cargo = payload.cargo.strip()
    if is_master and new_cargo.lower() != "master":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="O Administrador Master da organização é protegido e não pode ser rebaixado.",
        )

    res = await session.execute(
        text("""
            UPDATE sys_usuarios
            SET nome = :nome, email = :email, cargo = :cargo
            WHERE id_usuario = :id_u AND id_organizacao = :tid
            RETURNING id_usuario, nome, email, cargo, ativo, id_organizacao, ultimo_login, exige_troca_senha, foto_url
        """),
        {
            "id_u": id_usuario,
            "tid": tenant.tenant_id,
            "nome": payload.nome.strip(),
            "email": payload.email.strip().lower(),
            "cargo": new_cargo,
        },
    )
    await session.commit()
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")
    out = dict(row._mapping)
    out["foto_url"] = _format_user_foto_url(int(out["id_usuario"]), out.get("foto_url"))
    return out


@usuarios_router.post(
    "/{id_usuario}/foto",
    status_code=status.HTTP_200_OK,
    summary="Faz upload da foto do usuário para o GCS (com fallback local)",
)
async def upload_usuario_foto(
    id_usuario: int,
    session: DbSessionDep,
    tenant: TenantDep,
    file: UploadFile = File(...),
) -> dict:
    chk = await session.execute(
        text("SELECT id_usuario FROM public.sys_usuarios WHERE id_usuario = :id_u AND id_organizacao = :tid"),
        {"id_u": id_usuario, "tid": tenant.tenant_id},
    )
    if chk.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado nesta organização.")

    content_type = (file.content_type or "").lower().strip()
    if content_type not in _ALLOWED_USER_FOTO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de imagem inválido. Use PNG, JPEG ou WEBP.",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Arquivo de imagem vazio.")
    if len(file_bytes) > _MAX_USER_FOTO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="A foto excede o tamanho máximo permitido de 5 MB.",
        )

    foto_url: str
    storage_mode = "inline_fallback"
    gcs = get_gcs_service()
    if gcs.is_configured:
        try:
            foto_url = gcs.upload_file(
                file_bytes,
                destination_folder="usuarios",
                filename=file.filename or f"user_{id_usuario}.png",
                content_type=content_type,
                make_public=True,
            )
            storage_mode = "gcs"
        except Exception:
            b64 = base64.b64encode(file_bytes).decode("ascii")
            foto_url = f"data:{content_type};base64,{b64}"
    else:
        b64 = base64.b64encode(file_bytes).decode("ascii")
        foto_url = f"data:{content_type};base64,{b64}"

    await session.execute(
        text("UPDATE public.sys_usuarios SET foto_url = :foto WHERE id_usuario = :id_u AND id_organizacao = :tid"),
        {"foto": foto_url, "id_u": id_usuario, "tid": tenant.tenant_id},
    )
    await session.commit()

    return {
        "id_usuario": id_usuario,
        "foto_url": _format_user_foto_url(id_usuario, foto_url),
        "storage": storage_mode,
    }


@usuarios_router.get(
    "/{id_usuario}/foto/view",
    summary="Proxy público da foto do usuário armazenada no GCS",
)
async def view_usuario_foto(
    id_usuario: int,
    session: DbSessionDep,
) -> Response:
    res = await session.execute(
        text("SELECT foto_url FROM public.sys_usuarios WHERE id_usuario = :id_u"),
        {"id_u": id_usuario},
    )
    raw_foto = res.scalar_one_or_none()
    if not raw_foto or not isinstance(raw_foto, str) or not raw_foto.strip():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foto não encontrada.")

    cleaned = raw_foto.strip()
    if cleaned.startswith("data:") and "," in cleaned:
        header, b64_data = cleaned.split(",", 1)
        mime = header.removeprefix("data:").split(";", 1)[0] or "image/png"
        try:
            img_bytes = base64.b64decode(b64_data)
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Foto base64 inválida.") from exc
        return Response(
            content=img_bytes,
            media_type=mime,
            headers={"Cache-Control": "no-cache", "Cross-Origin-Resource-Policy": "cross-origin"},
        )

    gcs = get_gcs_service()
    downloaded = await asyncio.to_thread(gcs.download_file, cleaned)
    if downloaded is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo de foto não encontrado no GCS.")
    data, content_type = downloaded
    return Response(
        content=data,
        media_type=content_type,
        headers={"Cache-Control": "no-cache", "Cross-Origin-Resource-Policy": "cross-origin"},
    )


@usuarios_router.patch("/{id_usuario}/status", summary="Alterna status ativo/inativo do usuário")
async def toggle_usuario_status(
    id_usuario: int,
    session: DbSessionDep,
    tenant: TenantDep,
) -> dict:
    current_res = await session.execute(
        text("""
            SELECT u.id_usuario, u.cargo, u.ativo, u.revogado, u.id_organizacao, n.codigo AS nivel_codigo
            FROM sys_usuarios u
            LEFT JOIN public.sys_niveis_acesso n ON n.id_nivel_acesso = u.id_nivel_acesso
            WHERE u.id_usuario = :id_u AND u.id_organizacao = :tid
        """),
        {"id_u": id_usuario, "tid": tenant.tenant_id},
    )
    current = current_res.mappings().first()
    if not current:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    is_master = (
        str(current["cargo"] or "").strip().lower() == "master"
        or str(current["nivel_codigo"] or "").strip().lower() == "master"
    )
    if is_master:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="O Administrador Master da organização é protegido e não pode ser excluído ou revogado.",
        )

    res = await session.execute(
        text("""
            UPDATE sys_usuarios
            SET revogado = NOT revogado,
                ativo = revogado
            WHERE id_usuario = :id_u AND id_organizacao = :tid
            RETURNING id_usuario, nome, email, cargo, ativo, revogado
        """),
        {"id_u": id_usuario, "tid": tenant.tenant_id},
    )
    await session.commit()
    row = res.fetchone()
    return dict(row._mapping) if row else {}


@usuarios_router.delete("/{id_usuario}", status_code=status.HTTP_204_NO_CONTENT, summary="Exclui usuário da organização")
async def delete_usuario(
    id_usuario: int,
    session: DbSessionDep,
    tenant: TenantDep,
) -> None:
    current_res = await session.execute(
        text("""
            SELECT u.id_usuario, u.cargo, n.codigo AS nivel_codigo
            FROM sys_usuarios u
            LEFT JOIN public.sys_niveis_acesso n ON n.id_nivel_acesso = u.id_nivel_acesso
            WHERE u.id_usuario = :id_u AND u.id_organizacao = :tid
        """),
        {"id_u": id_usuario, "tid": tenant.tenant_id},
    )
    current = current_res.mappings().first()
    if not current:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    is_master = (
        str(current["cargo"] or "").strip().lower() == "master"
        or str(current["nivel_codigo"] or "").strip().lower() == "master"
    )
    if is_master:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="O Administrador Master da organização é protegido e não pode ser excluído ou revogado.",
        )

    await session.execute(
        text("DELETE FROM sys_usuarios WHERE id_usuario = :id_u AND id_organizacao = :tid"),
        {"id_u": id_usuario, "tid": tenant.tenant_id},
    )
    await session.commit()


@usuarios_router.post("/trocar-senha", summary="Permite ao usuário trocar a própria senha")
async def trocar_propria_senha(payload: TrocarSenhaIn, session: DbSessionDep) -> dict:
    res = await session.execute(
        text("SELECT id_usuario, nome, email, senha_hash, ativo FROM sys_usuarios WHERE LOWER(email) = LOWER(:email)"),
        {"email": payload.email.strip()},
    )
    user = res.fetchone()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    user_map = dict(user._mapping)
    if not user_map.get("ativo", True):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo.")

    valid = await _verify_password(session, payload.senha_atual, str(user_map["senha_hash"]))
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha atual incorreta.")

    novo_hash = await _hash_password(session, payload.nova_senha)
    await session.execute(
        text("""
            UPDATE sys_usuarios
            SET senha_hash = :novo_hash, exige_troca_senha = FALSE, tentativas_falhas = 0
            WHERE id_usuario = :id_u
        """),
        {"novo_hash": novo_hash, "id_u": user_map["id_usuario"]},
    )
    await session.commit()
    return {"status": "ok", "message": "Senha alterada com sucesso."}


class PapelPermissoesUpdateIn(BaseModel):
    codigos_permissao: list[str] = Field(default_factory=list)


@usuarios_router.get("/rbac", summary="Lista papéis, permissões e matriz papel_permissoes")
async def get_rbac_matrix(session: DbSessionDep) -> dict:
    papeis_res = await session.execute(
        text("SELECT codigo_papel, nome_exibicao, canal_acesso, nivel_hierarquia, descricao FROM sys_papeis_rbac ORDER BY nivel_hierarquia DESC")
    )
    perms_res = await session.execute(
        text("SELECT codigo_permissao, modulo, descricao FROM sys_permissoes_rbac ORDER BY modulo, codigo_permissao")
    )
    pp_res = await session.execute(
        text("SELECT codigo_papel, codigo_permissao FROM sys_papel_permissoes")
    )
    return {
        "papeis": [dict(r._mapping) for r in papeis_res.fetchall()],
        "permissoes": [dict(r._mapping) for r in perms_res.fetchall()],
        "papel_permissoes": [dict(r._mapping) for r in pp_res.fetchall()],
    }


@usuarios_router.put("/rbac/{codigo_papel}/permissoes", summary="Atualiza permissões de um papel RBAC")
async def update_papel_permissoes(
    codigo_papel: str,
    payload: PapelPermissoesUpdateIn,
    session: DbSessionDep,
) -> dict:
    await session.execute(
        text("DELETE FROM sys_papel_permissoes WHERE codigo_papel = :cp"),
        {"cp": codigo_papel},
    )
    for perm in payload.codigos_permissao:
        await session.execute(
            text("INSERT INTO sys_papel_permissoes (codigo_papel, codigo_permissao) VALUES (:cp, :perm) ON CONFLICT DO NOTHING"),
            {"cp": codigo_papel, "perm": perm},
        )
    await session.commit()
    return {"status": "ok", "codigo_papel": codigo_papel, "total_permissoes": len(payload.codigos_permissao)}

