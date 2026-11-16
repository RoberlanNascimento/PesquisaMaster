"""Repositório isolado de acesso a dados (SQLAlchemy Async) para usuários."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.auth.models import UserModel
from src.modules.auth.schemas import UserFilterSchema, UserResponseSchema


class AuthRepository:
    """Encapsula todas as queries da tabela `users`."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_model_by_id(self, user_id: UUID) -> UserModel | None:
        """Busca entidade de usuário ativa (não deletada) pelo UUID."""
        stmt = select(UserModel).where(
            UserModel.id == user_id,
            UserModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_model_by_email(self, email: str) -> UserModel | None:
        """Busca entidade de usuário pelo e-mail normalizado."""
        normalized_email = email.strip().lower()
        stmt = select(UserModel).where(
            func.lower(UserModel.email) == normalized_email,
            UserModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        email: str,
        password_hash: str,
        full_name: str,
        role: str,
        bound_device_id: str | None,
    ) -> UserResponseSchema:
        """Persiste novo usuário na sessão atual e retorna DTO mapeado."""
        entity = UserModel(
            email=email.strip().lower(),
            password_hash=password_hash,
            full_name=full_name.strip(),
            role=role,
            bound_device_id=bound_device_id,
            is_active=True,
        )
        self._session.add(entity)
        await self._session.flush()
        await self._session.refresh(entity)
        return UserResponseSchema.model_validate(entity)

    async def save(self, entity: UserModel) -> UserResponseSchema:
        """Sincroniza alterações da entidade e retorna DTO mapeado."""
        self._session.add(entity)
        await self._session.flush()
        await self._session.refresh(entity)
        return UserResponseSchema.model_validate(entity)

    async def list_paginated(
        self, filters: UserFilterSchema
    ) -> tuple[list[UserResponseSchema], int]:
        """Lista usuários com paginação obrigatória e contagem total."""
        base_stmt = select(UserModel).where(UserModel.deleted_at.is_(None))
        count_stmt = (
            select(func.count()).select_from(UserModel).where(UserModel.deleted_at.is_(None))
        )

        if filters.role is not None:
            base_stmt = base_stmt.where(UserModel.role == filters.role.value)
            count_stmt = count_stmt.where(UserModel.role == filters.role.value)

        if filters.is_active is not None:
            base_stmt = base_stmt.where(UserModel.is_active == filters.is_active)
            count_stmt = count_stmt.where(UserModel.is_active == filters.is_active)

        total_res = await self._session.execute(count_stmt)
        total = int(total_res.scalar_one())

        paged_stmt = (
            base_stmt.order_by(UserModel.created_at.desc())
            .limit(filters.limit)
            .offset(filters.offset)
        )
        rows = (await self._session.execute(paged_stmt)).scalars().all()
        items = [UserResponseSchema.model_validate(row) for row in rows]
        return items, total
