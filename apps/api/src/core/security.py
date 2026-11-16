"""Criptografia de senhas (Argon2), emissão/validação JWT, RBAC (6 perfis) e Device Binding."""

from collections.abc import Callable, Coroutine
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Annotated, Any
from uuid import UUID

import jwt
from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from pydantic import BaseModel, ConfigDict

from src.core.config import get_settings
from src.core.exceptions import ForbiddenError, UnauthorizedError
from src.core.logging import user_id_ctx

password_hasher = PasswordHash.recommended()
bearer_scheme = HTTPBearer(auto_error=False)


class UserRole(StrEnum):
    """Os 6 perfis de acesso estritos da plataforma PesquisaMaster."""

    ADMIN = "ADMIN"
    STATISTICIAN = "STATISTICIAN"
    SUPERVISOR = "SUPERVISOR"
    RESEARCHER = "RESEARCHER"
    ANALYST = "ANALYST"
    AUDITOR = "AUDITOR"


class TokenClaimsSchema(BaseModel):
    """Payload decodificado e validado de um token JWT de acesso."""

    model_config = ConfigDict(from_attributes=True, extra="ignore")

    sub: UUID
    email: str
    role: UserRole
    device_id: str | None = None
    exp: int
    iat: int


def hash_password(plain_password: str) -> str:
    """Gera o hash Argon2 seguro para armazenamento da senha."""
    return password_hasher.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verifica se a senha em texto plano corresponde ao hash Argon2."""
    return password_hasher.verify(plain_password, password_hash)


def create_access_token(
    *,
    user_id: UUID,
    email: str,
    role: UserRole,
    device_id: str | None = None,
    expires_delta: timedelta | None = None,
) -> tuple[str, int]:
    """Assina um JWT de acesso contendo perfil RBAC e vínculo de dispositivo."""
    settings = get_settings()
    now = datetime.now(UTC)
    delta = expires_delta or timedelta(minutes=settings.jwt_access_token_expire_minutes)
    expire_at = now + delta
    expires_in_seconds = int(delta.total_seconds())

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "role": role.value,
        "device_id": device_id,
        "iat": int(now.timestamp()),
        "exp": int(expire_at.timestamp()),
    }
    encoded = jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )
    return encoded, expires_in_seconds


def decode_access_token(token: str) -> TokenClaimsSchema:
    """Decodifica e valida assinatura e expiração de um token JWT."""
    settings = get_settings()
    try:
        raw_payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        return TokenClaimsSchema.model_validate(raw_payload)
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError("Token de autenticação expirado.") from exc
    except (jwt.PyJWTError, ValueError) as exc:
        raise UnauthorizedError("Token de autenticação inválido ou malformado.") from exc


async def get_current_token_claims(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    x_device_id: Annotated[str | None, Header(alias="X-Device-ID")] = None,
) -> TokenClaimsSchema:
    """Extrai o usuário autenticado do JWT e impõe Device Binding para Pesquisadores."""
    if credentials is None or not credentials.credentials:
        raise UnauthorizedError("Cabeçalho Authorization Bearer ausente.")

    claims = decode_access_token(credentials.credentials)
    user_id_ctx.set(str(claims.sub))

    if claims.role == UserRole.RESEARCHER:
        normalized_header_device = (x_device_id or "").strip()
        if not normalized_header_device:
            raise ForbiddenError(
                "Pesquisadores de campo devem enviar o cabeçalho X-Device-ID vinculado."
            )
        if not claims.device_id or claims.device_id != normalized_header_device:
            raise ForbiddenError(
                "Dispositivo não autorizado para este pesquisador (violação de Device Binding)."
            )

    return claims


def require_roles(
    *allowed_roles: UserRole,
) -> Callable[[TokenClaimsSchema], Coroutine[Any, Any, TokenClaimsSchema]]:
    """Fábrica de dependência FastAPI para exigir um dos perfis RBAC permitidos."""
    allowed_set = frozenset(allowed_roles)

    async def role_checker(
        claims: Annotated[TokenClaimsSchema, Depends(get_current_token_claims)],
    ) -> TokenClaimsSchema:
        if claims.role not in allowed_set:
            allowed_names = ", ".join(sorted(r.value for r in allowed_set))
            raise ForbiddenError(
                f"Perfil '{claims.role.value}' não possui permissão. Requer: {allowed_names}."
            )
        return claims

    return role_checker
