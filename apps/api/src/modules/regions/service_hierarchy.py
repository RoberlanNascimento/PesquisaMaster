"""Serviço de domínio para Hierarquia Territorial (País, Estado/UF e Município)."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import ConflictError, NotFoundError
from src.modules.audit.schemas import AuditLogCreateSchema
from src.modules.audit.service import AuditService
from src.modules.regions.repository_hierarchy import HierarchyRepository
from src.modules.regions.schemas_hierarchy import (
    CountryCreateSchema,
    CountryResponseSchema,
    CountryUpdateSchema,
    MunicipalityCreateSchema,
    MunicipalityResponseSchema,
    MunicipalityUpdateSchema,
    StateCreateSchema,
    StateResponseSchema,
    StateUpdateSchema,
)


class HierarchyService:
    """Regras de negócio e CRUD hierárquico: País -> Estado (UF) -> Município."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = HierarchyRepository(session)
        self._audit = AuditService(session)

    async def list_countries(
        self, *, limit: int = 50, offset: int = 0
    ) -> list[CountryResponseSchema]:
        items = await self._repo.list_countries(limit=limit, offset=offset)
        return [CountryResponseSchema.model_validate(c) for c in items]

    async def create_country(
        self, payload: CountryCreateSchema, *, actor_id: UUID
    ) -> CountryResponseSchema:
        iso = payload.iso_code.strip().upper()
        if await self._repo.get_country_by_iso(iso):
            raise ConflictError(f"Já existe um país cadastrado com o código ISO '{iso}'.")
        created = await self._repo.create_country(payload)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="regions",
                action="COUNTRY_CREATED",
                payload_diff={"country_id": str(created.id), "iso_code": created.iso_code},
            )
        )
        return CountryResponseSchema.model_validate(created)

    async def update_country(
        self, country_id: UUID, payload: CountryUpdateSchema, *, actor_id: UUID
    ) -> CountryResponseSchema:
        country = await self._repo.get_country_by_id(country_id)
        if not country:
            raise NotFoundError(f"País '{country_id}' não encontrado.")
        updated = await self._repo.update_country(country, payload)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="regions",
                action="COUNTRY_UPDATED",
                payload_diff={"country_id": str(country_id), "iso_code": updated.iso_code},
            )
        )
        return CountryResponseSchema.model_validate(updated)

    async def delete_country(self, country_id: UUID, *, actor_id: UUID) -> None:
        country = await self._repo.get_country_by_id(country_id)
        if not country:
            raise NotFoundError(f"País '{country_id}' não encontrado.")
        await self._repo.soft_delete_country(country)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="regions",
                action="COUNTRY_DELETED",
                payload_diff={"country_id": str(country_id), "iso_code": country.iso_code},
            )
        )

    async def list_states(
        self, *, country_id: UUID | None = None, limit: int = 50, offset: int = 0
    ) -> list[StateResponseSchema]:
        items = await self._repo.list_states(country_id=country_id, limit=limit, offset=offset)
        return [StateResponseSchema.model_validate(s) for s in items]

    async def create_state(
        self, payload: StateCreateSchema, *, actor_id: UUID
    ) -> StateResponseSchema:
        if not await self._repo.get_country_by_id(payload.country_id):
            raise NotFoundError(f"País '{payload.country_id}' não encontrado para vincular estado.")
        uf = payload.uf.strip().upper()
        if await self._repo.get_state_by_uf(uf):
            raise ConflictError(f"Já existe um estado cadastrado com a UF '{uf}'.")
        created = await self._repo.create_state(payload)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="regions",
                action="STATE_CREATED",
                payload_diff={"state_id": str(created.id), "uf": created.uf},
            )
        )
        return StateResponseSchema.model_validate(created)

    async def update_state(
        self, state_id: UUID, payload: StateUpdateSchema, *, actor_id: UUID
    ) -> StateResponseSchema:
        state = await self._repo.get_state_by_id(state_id)
        if not state:
            raise NotFoundError(f"Estado '{state_id}' não encontrado.")
        updated = await self._repo.update_state(state, payload)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="regions",
                action="STATE_UPDATED",
                payload_diff={"state_id": str(state_id), "uf": updated.uf},
            )
        )
        return StateResponseSchema.model_validate(updated)

    async def delete_state(self, state_id: UUID, *, actor_id: UUID) -> None:
        state = await self._repo.get_state_by_id(state_id)
        if not state:
            raise NotFoundError(f"Estado '{state_id}' não encontrado.")
        await self._repo.soft_delete_state(state)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="regions",
                action="STATE_DELETED",
                payload_diff={"state_id": str(state_id), "uf": state.uf},
            )
        )

    async def list_municipalities(
        self,
        *,
        state_id: UUID | None = None,
        uf: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[MunicipalityResponseSchema]:
        items = await self._repo.list_municipalities(
            state_id=state_id, uf=uf, limit=limit, offset=offset
        )
        return [MunicipalityResponseSchema.model_validate(m) for m in items]

    async def create_municipality(
        self, payload: MunicipalityCreateSchema, *, actor_id: UUID
    ) -> MunicipalityResponseSchema:
        state = await self._repo.get_state_by_id(payload.state_id)
        if not state:
            raise NotFoundError(
                f"Estado '{payload.state_id}' não encontrado para vincular município."
            )
        ibge = payload.ibge_code.strip()
        if await self._repo.get_municipality_by_ibge(ibge):
            raise ConflictError(f"Já existe um município cadastrado com o código IBGE '{ibge}'.")
        created = await self._repo.create_municipality(payload)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="regions",
                action="MUNICIPALITY_CREATED",
                payload_diff={
                    "municipality_id": str(created.id),
                    "ibge_code": created.ibge_code,
                    "name": created.name,
                },
            )
        )
        return MunicipalityResponseSchema.model_validate(created)

    async def update_municipality(
        self, municipality_id: UUID, payload: MunicipalityUpdateSchema, *, actor_id: UUID
    ) -> MunicipalityResponseSchema:
        city = await self._repo.get_municipality_by_id(municipality_id)
        if not city:
            raise NotFoundError(f"Município '{municipality_id}' não encontrado.")
        updated = await self._repo.update_municipality(city, payload)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="regions",
                action="MUNICIPALITY_UPDATED",
                payload_diff={"municipality_id": str(municipality_id), "name": updated.name},
            )
        )
        return MunicipalityResponseSchema.model_validate(updated)

    async def delete_municipality(self, municipality_id: UUID, *, actor_id: UUID) -> None:
        city = await self._repo.get_municipality_by_id(municipality_id)
        if not city:
            raise NotFoundError(f"Município '{municipality_id}' não encontrado.")
        await self._repo.soft_delete_municipality(city)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="regions",
                action="MUNICIPALITY_DELETED",
                payload_diff={"municipality_id": str(municipality_id), "name": city.name},
            )
        )
