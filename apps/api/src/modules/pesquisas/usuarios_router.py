"""Rotas REST para gestão de usuários do sistema (tabela 'usuarios') e troca de senha."""

import hashlib
import hmac
import os
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session

usuarios_router = APIRouter(prefix="/pesquisas-tabelas/usuarios", tags=["Usuários do Sistema"])
DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]


class UsuarioCreateIn(BaseModel):
    nome: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    cargo: str = Field(default="Pesquisador", min_length=2, max_length=100)
    senha: str = Field(default="Mudar@123", min_length=6, max_length=128)
    id_organizacao: int = Field(default=1, ge=1)


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
async def list_usuarios(session: DbSessionDep, limit: int = 100) -> list[dict]:
    res = await session.execute(
        text("""
            SELECT id_usuario, nome, email, cargo, ativo, revogado, revogado_em, id_organizacao,
                   tentativas_falhas, bloqueado_ate, ultimo_login, exige_troca_senha
            FROM usuarios
            ORDER BY id_usuario ASC
            LIMIT :lim
        """),
        {"lim": limit},
    )
    return [dict(r._mapping) for r in res.fetchall()]


@usuarios_router.post("", status_code=status.HTTP_201_CREATED, summary="Cadastra novo usuário")
async def create_usuario(payload: UsuarioCreateIn, session: DbSessionDep) -> dict:
    existing = await session.execute(
        text("SELECT id_usuario FROM usuarios WHERE LOWER(email) = LOWER(:email)"),
        {"email": payload.email},
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe um usuário cadastrado com este e-mail.",
        )

    senha_hash = await _hash_password(session, payload.senha)
    is_admin = payload.cargo.strip().lower() == "administrador"
    res = await session.execute(
        text("""
            INSERT INTO usuarios (nome, email, senha_hash, cargo, ativo, id_organizacao, tentativas_falhas, exige_troca_senha)
            VALUES (:nome, :email, :senha_hash, :cargo, TRUE, :id_org, 0, :exige_troca)
            RETURNING id_usuario, nome, email, cargo, ativo, id_organizacao, ultimo_login, exige_troca_senha
        """),
        {
            "nome": payload.nome.strip(),
            "email": payload.email.strip().lower(),
            "senha_hash": senha_hash,
            "cargo": payload.cargo.strip(),
            "id_org": payload.id_organizacao,
            "exige_troca": not is_admin,
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
async def update_usuario(id_usuario: int, payload: UsuarioUpdateIn, session: DbSessionDep) -> dict:
    res = await session.execute(
        text("""
            UPDATE usuarios
            SET nome = :nome, email = :email, cargo = :cargo
            WHERE id_usuario = :id_u
            RETURNING id_usuario, nome, email, cargo, ativo, id_organizacao, ultimo_login, exige_troca_senha
        """),
        {
            "id_u": id_usuario,
            "nome": payload.nome.strip(),
            "email": payload.email.strip().lower(),
            "cargo": payload.cargo.strip(),
        },
    )
    await session.commit()
    row = res.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")
    return dict(row._mapping)


@usuarios_router.patch("/{id_usuario}/status", summary="Alterna status ativo/inativo do usuário")
async def toggle_usuario_status(id_usuario: int, session: DbSessionDep) -> dict:
    current_res = await session.execute(
        text("SELECT id_usuario, cargo, ativo, id_organizacao FROM usuarios WHERE id_usuario = :id_u"),
        {"id_u": id_usuario},
    )
    current = current_res.fetchone()
    if not current:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado.")

    cur_map = dict(current._mapping)
    if cur_map["cargo"] == "administrador" and not cur_map.get("revogado", False):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="O administrador do sistema não pode ser revogado.",
        )

    res = await session.execute(
        text("""
            UPDATE usuarios
            SET revogado = NOT revogado,
                ativo = revogado,
                revogado_em = CASE WHEN NOT revogado THEN NOW() ELSE NULL END
            WHERE id_usuario = :id_u
            RETURNING id_usuario, nome, email, cargo, ativo, revogado, revogado_em
        """),
        {"id_u": id_usuario},
    )
    await session.commit()
    row = res.fetchone()
    return dict(row._mapping) if row else {}


@usuarios_router.post("/trocar-senha", summary="Permite ao usuário trocar a própria senha")
async def trocar_propria_senha(payload: TrocarSenhaIn, session: DbSessionDep) -> dict:
    res = await session.execute(
        text("SELECT id_usuario, nome, email, senha_hash, ativo FROM usuarios WHERE LOWER(email) = LOWER(:email)"),
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
            UPDATE usuarios
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
        text("SELECT codigo_papel, nome_exibicao, canal_acesso, nivel_hierarquia, descricao FROM papeis_rbac ORDER BY nivel_hierarquia DESC")
    )
    perms_res = await session.execute(
        text("SELECT codigo_permissao, modulo, descricao FROM permissoes_rbac ORDER BY modulo, codigo_permissao")
    )
    pp_res = await session.execute(
        text("SELECT codigo_papel, codigo_permissao FROM papel_permissoes")
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
        text("DELETE FROM papel_permissoes WHERE codigo_papel = :cp"),
        {"cp": codigo_papel},
    )
    for perm in payload.codigos_permissao:
        await session.execute(
            text("INSERT INTO papel_permissoes (codigo_papel, codigo_permissao) VALUES (:cp, :perm) ON CONFLICT DO NOTHING"),
            {"cp": codigo_papel, "perm": perm},
        )
    await session.commit()
    return {"status": "ok", "codigo_papel": codigo_papel, "total_permissoes": len(payload.codigos_permissao)}

