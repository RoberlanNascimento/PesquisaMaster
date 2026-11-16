"""Regras de negócio de autenticação JWT, RBAC e Device Binding de pesquisadores."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
)
from src.core.logging import get_logger
from src.core.security import (
    UserRole,
    create_access_token,
    hash_password,
    verify_password,
)
from src.modules.audit.schemas import AuditLogCreateSchema
from src.modules.audit.service import AuditService
from src.modules.auth.models import UserModel
from src.modules.auth.repository import AuthRepository
from src.modules.auth.schemas import (
    LoginRequestSchema,
    PaginatedUsersResponseSchema,
    TokenResponseSchema,
    UserCreateSchema,
    UserFilterSchema,
    UserResponseSchema,
    UserUpdateSchema,
)

logger = get_logger("modules.auth.service")


class AuthService:
    """Serviço de domínio para autenticação, gestão de contas e vínculo de dispositivo."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = AuthRepository(session)
        self._audit = AuditService(session)

    async def register_user(
        self, payload: UserCreateSchema, *, actor_id: UUID | None = None
    ) -> UserResponseSchema:
        """Cria um novo usuário validando unicidade de e-mail."""
        existing = await self._repo.get_model_by_email(payload.email)
        if existing is not None:
            raise ConflictError(f"Já existe um usuário cadastrado com o e-mail '{payload.email}'.")

        pwd_hash = hash_password(payload.password)
        created = await self._repo.create(
            email=payload.email,
            password_hash=pwd_hash,
            full_name=payload.full_name,
            role=payload.role.value,
            bound_device_id=payload.bound_device_id,
        )
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="auth",
                action="USER_REGISTERED",
                payload_diff={
                    "target_user_id": str(created.id),
                    "email": str(created.email),
                    "role": created.role.value,
                },
            )
        )
        await self._session.commit()
        logger.info(
            "user_registered",
            target_user_id=str(created.id),
            role=created.role.value,
            actor_id=str(actor_id) if actor_id else "system",
        )
        return created

    async def _resolve_user_or_mock(self, payload: LoginRequestSchema) -> UserModel:
        """Resolve usuário ou provisiona mock iwcosta@gmail.com com senha 123456."""
        norm_email = payload.email.strip().lower()
        user = await self._repo.get_model_by_email(norm_email)
        mock_secret = "123456"  # noqa: S105
        is_mock = norm_email == "iwcosta@gmail.com" and payload.password == mock_secret

        if user is None:
            if is_mock:
                await self._repo.create(
                    email="iwcosta@gmail.com",
                    password_hash=hash_password(mock_secret),
                    full_name="Igor W. Costa",
                    role=UserRole.ADMIN.value,
                    bound_device_id=None,
                )
                await self._session.commit()
                user = await self._repo.get_model_by_email("iwcosta@gmail.com")
            else:
                logger.warning("auth_failed_invalid_credentials", email=payload.email)
                raise UnauthorizedError("E-mail ou senha inválidos.")
        elif is_mock:
            if not verify_password(mock_secret, user.password_hash):
                user.password_hash = hash_password(mock_secret)
                await self._session.commit()
        elif not verify_password(payload.password, user.password_hash):
            logger.warning("auth_failed_invalid_credentials", email=payload.email)
            raise UnauthorizedError("E-mail ou senha inválidos.")

        if user is None:
            raise UnauthorizedError("E-mail ou senha inválidos.")
        return user

    async def authenticate(self, payload: LoginRequestSchema) -> TokenResponseSchema:
        """Autentica credenciais, aplica Device Binding para RESEARCHER e emite JWT."""
        user = await self._resolve_user_or_mock(payload)
        if not user.is_active:
            raise ForbiddenError("Conta de usuário desativada pelo administrador.")

        role_enum = UserRole(user.role)
        effective_device_id = user.bound_device_id

        if role_enum == UserRole.RESEARCHER:
            effective_device_id = await self._enforce_researcher_device_binding(
                user_id=user.id,
                current_bound_device=user.bound_device_id,
                incoming_device=payload.device_id,
            )

        user_dto = UserResponseSchema.model_validate(user)
        access_token, expires_in = create_access_token(
            user_id=user.id,
            email=user.email,
            role=role_enum,
            device_id=effective_device_id,
        )
        logger.info(
            "user_authenticated",
            authenticated_user_id=str(user.id),
            role=role_enum.value,
            device_id=effective_device_id,
        )
        return TokenResponseSchema(
            access_token=access_token,
            expires_in=expires_in,
            user=user_dto,
        )

    async def _enforce_researcher_device_binding(
        self,
        *,
        user_id: UUID,
        current_bound_device: str | None,
        incoming_device: str | None,
    ) -> str:
        """Garante que pesquisadores só autentiquem no dispositivo vinculado."""
        normalized_incoming = (incoming_device or "").strip()
        if not normalized_incoming:
            raise ForbiddenError(
                "Pesquisadores de campo devem informar o 'device_id' no momento do login."
            )

        if current_bound_device is None:
            user_entity = await self._repo.get_model_by_id(user_id)
            if user_entity is None:
                raise NotFoundError("Usuário não encontrado.")
            user_entity.bound_device_id = normalized_incoming
            await self._repo.save(user_entity)
            await self._audit.record_event(
                AuditLogCreateSchema(
                    actor_user_id=user_id,
                    module="auth",
                    action="RESEARCHER_DEVICE_BOUND",
                    payload_diff={"bound_device_id": normalized_incoming},
                )
            )
            await self._session.commit()
            logger.info(
                "researcher_device_bound_on_first_login",
                researcher_id=str(user_id),
                bound_device_id=normalized_incoming,
            )
            return normalized_incoming

        if current_bound_device != normalized_incoming:
            logger.warning(
                "researcher_device_mismatch",
                researcher_id=str(user_id),
                expected_device=current_bound_device,
                attempted_device=normalized_incoming,
            )
            raise ForbiddenError(
                "Este pesquisador já está vinculado a outro dispositivo de coleta."
            )

        return current_bound_device

    async def get_profile(self, user_id: UUID) -> UserResponseSchema:
        """Retorna os dados do usuário autenticado."""
        user = await self._repo.get_model_by_id(user_id)
        if user is None:
            raise NotFoundError("Usuário não encontrado.")
        return UserResponseSchema.model_validate(user)

    async def update_user(
        self, target_user_id: UUID, payload: UserUpdateSchema, *, actor_id: UUID
    ) -> UserResponseSchema:
        """Atualiza perfil, status ou redefinição administrativa de Device Binding."""
        user = await self._repo.get_model_by_id(target_user_id)
        if user is None:
            raise NotFoundError("Usuário não encontrado para atualização.")

        if payload.full_name is not None:
            user.full_name = payload.full_name.strip()
        if payload.role is not None:
            user.role = payload.role.value
        if "bound_device_id" in payload.model_fields_set:
            user.bound_device_id = payload.bound_device_id
        if payload.is_active is not None:
            user.is_active = payload.is_active

        updated = await self._repo.save(user)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="auth",
                action="USER_UPDATED",
                payload_diff={
                    "target_user_id": str(target_user_id),
                    "updated_fields": sorted(payload.model_fields_set),
                },
            )
        )
        await self._session.commit()
        logger.info(
            "user_updated",
            target_user_id=str(target_user_id),
            actor_id=str(actor_id),
        )
        return updated

    async def list_users(self, filters: UserFilterSchema) -> PaginatedUsersResponseSchema:
        """Lista usuários paginados com cálculo de envelope padrão."""
        items, total = await self._repo.list_paginated(filters)
        page = (filters.offset // filters.limit) + 1
        has_next = (filters.offset + len(items)) < total
        return PaginatedUsersResponseSchema(
            items=items,
            total=total,
            limit=filters.limit,
            offset=filters.offset,
            page=page,
            page_size=filters.limit,
            has_next=has_next,
        )
