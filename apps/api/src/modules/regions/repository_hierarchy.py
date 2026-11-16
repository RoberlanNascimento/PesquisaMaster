"""Repositório SQLAlchemy assíncrono para Hierarquia Territorial (País, Estado/UF e Município)."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.regions.models import CountryModel, MunicipalityModel, StateModel
from src.modules.regions.schemas_hierarchy import (
    CountryCreateSchema,
    CountryUpdateSchema,
    MunicipalityCreateSchema,
    MunicipalityUpdateSchema,
    StateCreateSchema,
    StateUpdateSchema,
)


class HierarchyRepository:
    """Persistência CRUD para Países, Estados (UF) e Municípios."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_country_by_id(self, country_id: UUID) -> CountryModel | None:
        stmt = select(CountryModel).where(
            CountryModel.id == country_id, CountryModel.deleted_at.is_(None)
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def get_country_by_iso(self, iso_code: str) -> CountryModel | None:
        stmt = select(CountryModel).where(
            CountryModel.iso_code == iso_code, CountryModel.deleted_at.is_(None)
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def list_countries(self, *, limit: int = 50, offset: int = 0) -> list[CountryModel]:
        stmt = (
            select(CountryModel)
            .where(CountryModel.deleted_at.is_(None))
            .order_by(CountryModel.iso_code.asc())
            .limit(limit)
            .offset(offset)
        )
        return list((await self._session.execute(stmt)).scalars().all())

    async def create_country(self, payload: CountryCreateSchema) -> CountryModel:
        country = CountryModel(
            iso_code=payload.iso_code.strip().upper(),
            name=payload.name.strip(),
            electoral_authority=payload.electoral_authority.strip(),
            is_active=payload.is_active,
        )
        self._session.add(country)
        await self._session.commit()
        await self._session.refresh(country)
        return country

    async def update_country(
        self, country: CountryModel, payload: CountryUpdateSchema
    ) -> CountryModel:
        for key, val in payload.model_dump(exclude_unset=True).items():
            if val is not None:
                setattr(country, key, val)
        await self._session.commit()
        await self._session.refresh(country)
        return country

    async def soft_delete_country(self, country: CountryModel) -> None:
        country.deleted_at = datetime.now(UTC)
        await self._session.commit()

    async def get_state_by_id(self, state_id: UUID) -> StateModel | None:
        stmt = select(StateModel).where(StateModel.id == state_id, StateModel.deleted_at.is_(None))
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def get_state_by_uf(self, uf: str) -> StateModel | None:
        stmt = select(StateModel).where(StateModel.uf == uf, StateModel.deleted_at.is_(None))
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def list_states(
        self, *, country_id: UUID | None = None, limit: int = 50, offset: int = 0
    ) -> list[StateModel]:
        stmt = select(StateModel).where(StateModel.deleted_at.is_(None))
        if country_id:
            stmt = stmt.where(StateModel.country_id == country_id)
        stmt = stmt.order_by(StateModel.uf.asc()).limit(limit).offset(offset)
        return list((await self._session.execute(stmt)).scalars().all())

    async def create_state(self, payload: StateCreateSchema) -> StateModel:
        state = StateModel(
            country_id=payload.country_id,
            uf=payload.uf.strip().upper(),
            name=payload.name.strip(),
            ibge_code=payload.ibge_code.strip(),
            macro_region=payload.macro_region.strip(),
            electorate_total=payload.electorate_total,
            is_active=payload.is_active,
        )
        self._session.add(state)
        await self._session.commit()
        await self._session.refresh(state)
        return state

    async def update_state(self, state: StateModel, payload: StateUpdateSchema) -> StateModel:
        for key, val in payload.model_dump(exclude_unset=True).items():
            if val is not None:
                setattr(state, key, val)
        await self._session.commit()
        await self._session.refresh(state)
        return state

    async def soft_delete_state(self, state: StateModel) -> None:
        state.deleted_at = datetime.now(UTC)
        await self._session.commit()

    async def get_municipality_by_id(self, municipality_id: UUID) -> MunicipalityModel | None:
        stmt = select(MunicipalityModel).where(
            MunicipalityModel.id == municipality_id, MunicipalityModel.deleted_at.is_(None)
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def get_municipality_by_ibge(self, ibge_code: str) -> MunicipalityModel | None:
        stmt = select(MunicipalityModel).where(
            MunicipalityModel.ibge_code == ibge_code, MunicipalityModel.deleted_at.is_(None)
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def list_municipalities(
        self,
        *,
        state_id: UUID | None = None,
        uf: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[MunicipalityModel]:
        stmt = select(MunicipalityModel).where(MunicipalityModel.deleted_at.is_(None))
        if state_id:
            stmt = stmt.where(MunicipalityModel.state_id == state_id)
        if uf:
            stmt = stmt.where(MunicipalityModel.uf == uf.upper())
        stmt = stmt.order_by(MunicipalityModel.name.asc()).limit(limit).offset(offset)
        return list((await self._session.execute(stmt)).scalars().all())

    async def create_municipality(self, payload: MunicipalityCreateSchema) -> MunicipalityModel:
        city = MunicipalityModel(
            state_id=payload.state_id,
            ibge_code=payload.ibge_code.strip(),
            name=payload.name.strip(),
            uf=payload.uf.strip().upper(),
            master_plan_law_ref=payload.master_plan_law_ref.strip(),
            electorate_total=payload.electorate_total,
            is_active=payload.is_active,
        )
        self._session.add(city)
        await self._session.commit()
        await self._session.refresh(city)
        return city

    async def update_municipality(
        self, city: MunicipalityModel, payload: MunicipalityUpdateSchema
    ) -> MunicipalityModel:
        for key, val in payload.model_dump(exclude_unset=True).items():
            if val is not None:
                setattr(city, key, val)
        await self._session.commit()
        await self._session.refresh(city)
        return city

    async def soft_delete_municipality(self, city: MunicipalityModel) -> None:
        city.deleted_at = datetime.now(UTC)
        await self._session.commit()
