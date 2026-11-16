"""Rotas HTTP para autenticação JWT, gestão de usuários (RBAC) e Device Binding."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.core.security import (
    TokenClaimsSchema,
    UserRole,
    get_current_token_claims,
    require_roles,
)
from src.modules.auth.schemas import (
    LoginRequestSchema,
    PaginatedUsersResponseSchema,
    TokenResponseSchema,
    UserCreateSchema,
    UserFilterSchema,
    UserResponseSchema,
    UserUpdateSchema,
)
from src.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Autenticação & RBAC"])

DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
CurrentClaimsDep = Annotated[TokenClaimsSchema, Depends(get_current_token_claims)]
AdminOnlyDep = Annotated[TokenClaimsSchema, Depends(require_roles(UserRole.ADMIN))]
AdminOrSupervisorDep = Annotated[
    TokenClaimsSchema,
    Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR)),
]


@router.post(
    "/login",
    response_model=TokenResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Autentica usuário e emite JWT (aplica Device Binding para Pesquisadores)",
)
async def login(payload: LoginRequestSchema, session: DbSessionDep) -> TokenResponseSchema:
    service = AuthService(session)
    return await service.authenticate(payload)


@router.get(
    "/me",
    response_model=UserResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Retorna o perfil do usuário autenticado (valida X-Device-ID se Pesquisador)",
)
async def get_me(claims: CurrentClaimsDep, session: DbSessionDep) -> UserResponseSchema:
    service = AuthService(session)
    return await service.get_profile(claims.sub)


@router.post(
    "/users",
    response_model=UserResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Cria um novo usuário na plataforma (exclusivo ADMIN)",
)
async def create_user(
    payload: UserCreateSchema,
    admin_claims: AdminOnlyDep,
    session: DbSessionDep,
) -> UserResponseSchema:
    service = AuthService(session)
    return await service.register_user(payload, actor_id=admin_claims.sub)


@router.get(
    "/users",
    response_model=PaginatedUsersResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Lista usuários com paginação obrigatória (ADMIN ou SUPERVISOR)",
)
async def list_users(
    _claims: AdminOrSupervisorDep,
    session: DbSessionDep,
    role: Annotated[UserRole | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PaginatedUsersResponseSchema:
    filters = UserFilterSchema(role=role, is_active=is_active, limit=limit, offset=offset)
    service = AuthService(session)
    return await service.list_users(filters)


@router.patch(
    "/users/{user_id}",
    response_model=UserResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Atualiza usuário ou redefine vínculo de dispositivo (ADMIN ou SUPERVISOR)",
)
async def update_user(
    user_id: UUID,
    payload: UserUpdateSchema,
    actor_claims: AdminOrSupervisorDep,
    session: DbSessionDep,
) -> UserResponseSchema:
    service = AuthService(session)
    return await service.update_user(user_id, payload, actor_id=actor_claims.sub)
