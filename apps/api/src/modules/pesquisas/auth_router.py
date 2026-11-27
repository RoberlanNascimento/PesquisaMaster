"""Rotas de Autenticação JWT + Cookie HttpOnly via fn_autenticar_usuario (PostgreSQL)."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.database import get_db_session

auth_router = APIRouter(prefix="/auth", tags=["Autenticação & Sessão"])
DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str = Field(..., min_length=1)


def _create_token(payload: dict, expires_delta: timedelta) -> str:
    settings = get_settings()
    to_encode = payload.copy()
    to_encode["exp"] = datetime.now(UTC) + expires_delta
    to_encode["iat"] = datetime.now(UTC)
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


@dataclass(frozen=True)
class CurrentUser:
    """Usuário autenticado extraído do JWT Bearer."""

    id_usuario: int
    tenant_id: int
    cargo: str
    email: str


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


async def get_current_user(request: Request) -> CurrentUser:
    """Valida Authorization: Bearer <access_token> e retorna o usuário autenticado."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação não fornecido.",
        )

    token = auth_header.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação vazio.",
        )

    try:
        claims = decode_access_token(token)
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão expirada.",
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido.",
        ) from exc

    if claims.get("type") == "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token não pode ser usado para acessar recursos da API.",
        )

    raw_uid = claims.get("id_usuario") or claims.get("sub")
    raw_tid = claims.get("tenant_id") or claims.get("id_organizacao")
    try:
        id_usuario = int(raw_uid)
        tenant_id = int(raw_tid)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Claims de identificação inválidas no token.",
        ) from exc

    return CurrentUser(
        id_usuario=id_usuario,
        tenant_id=tenant_id,
        cargo=str(claims.get("cargo") or ""),
        email=str(claims.get("email") or ""),
    )


@auth_router.post("/login", summary="Autentica usuário via fn_autenticar_usuario e emite JWT + Cookie HttpOnly")
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: DbSessionDep,
) -> dict:
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "PesquisaMaster-Web")

    res = await session.execute(
        text("""
            SELECT autenticado, mensagem_erro, id_usuario, id_organizacao,
                   nome_usuario, email_usuario, cargo, nome_organizacao,
                   plano_assinatura, exige_troca_senha
            FROM fn_autenticar_usuario(:email, :senha, :ip, :ua)
        """),
        {
            "email": payload.email.strip().lower(),
            "senha": payload.senha,
            "ip": client_ip,
            "ua": user_agent,
        },
    )
    row = res.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Falha ao consultar serviço de autenticação.",
        )

    auth_data = dict(row._mapping)
    if not auth_data.get("autenticado"):
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=auth_data.get("mensagem_erro") or "E-mail ou senha inválidos.",
        )

    rev_res = await session.execute(
        text("SELECT revogado FROM sys_usuarios WHERE id_usuario = :id_u"),
        {"id_u": auth_data["id_usuario"]},
    )
    if bool(rev_res.scalar()):
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso revogado pelo administrador. Aguarde nova autorização.",
        )

    await session.commit()

    claims = {
        "sub": str(auth_data["id_usuario"]),
        "id_usuario": auth_data["id_usuario"],
        "tenant_id": auth_data["id_organizacao"],
        "email": auth_data["email_usuario"],
        "nome": auth_data["nome_usuario"],
        "cargo": auth_data["cargo"],
        "nome_organizacao": auth_data["nome_organizacao"],
        "plano": auth_data["plano_assinatura"],
    }

    access_token = _create_token(claims, timedelta(minutes=15))
    refresh_token = _create_token(
        {"sub": str(auth_data["id_usuario"]), "tenant_id": auth_data["id_organizacao"], "type": "refresh"},
        timedelta(days=7),
    )

    response.set_cookie(
        key="pm_refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=7 * 24 * 3600,
        path="/",
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 900,
        "user": {
            "id_usuario": auth_data["id_usuario"],
            "id_organizacao": auth_data["id_organizacao"],
            "tenant_id": auth_data["id_organizacao"],
            "full_name": auth_data["nome_usuario"],
            "email": auth_data["email_usuario"],
            "role": auth_data["cargo"],
            "nome_organizacao": auth_data["nome_organizacao"],
            "plano_assinatura": auth_data["plano_assinatura"],
            "exige_troca_senha": False if auth_data["cargo"] == "administrador" else auth_data["exige_troca_senha"],
        },
    }


@auth_router.get("/me", summary="Retorna dados do usuário autenticado pelo Bearer JWT")
async def get_me(request: Request) -> dict:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token não fornecido.")

    token = auth_header.removeprefix("Bearer ").strip()
    try:
        claims = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão expirada.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido.")

    if claims.get("type") == "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token não é aceito neste endpoint.",
        )

    return {
        "id_usuario": claims.get("id_usuario"),
        "id_organizacao": claims.get("tenant_id"),
        "tenant_id": claims.get("tenant_id"),
        "full_name": claims.get("nome"),
        "email": claims.get("email"),
        "role": claims.get("cargo"),
        "nome_organizacao": claims.get("nome_organizacao"),
        "plano_assinatura": claims.get("plano"),
    }


@auth_router.post("/logout", summary="Encerra sessão e remove Cookie HttpOnly")
async def logout(response: Response) -> dict:
    response.delete_cookie(key="pm_refresh_token", path="/")
    return {"status": "ok"}

