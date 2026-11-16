"""Repositório SQLAlchemy assíncrono para Regiões Municipais e Bairros (Plano Diretor)."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.regions.models import MunicipalRegionModel, NeighborhoodModel
from src.modules.regions.schemas import (
    MunicipalRegionCreateSchema,
    MunicipalRegionUpdateSchema,
    NeighborhoodCreateSchema,
    NeighborhoodUpdateSchema,
)


class RegionRepository:
    """Encapsula persistência CRUD para regiões administrativas e bairros do Plano Diretor."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_region_by_id(self, region_id: UUID) -> MunicipalRegionModel | None:
        """Busca região municipal pelo UUID."""
        stmt = select(MunicipalRegionModel).where(
            MunicipalRegionModel.id == region_id,
            MunicipalRegionModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_region_by_code(self, code: str) -> MunicipalRegionModel | None:
        """Busca região municipal pelo código único."""
        stmt = select(MunicipalRegionModel).where(
            MunicipalRegionModel.code == code,
            MunicipalRegionModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_regions(
        self,
        *,
        municipality_id: UUID | None = None,
        uf: str | None = None,
        zone: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[MunicipalRegionModel]:
        """Lista regiões municipais com filtros opcionais e paginação."""
        stmt = select(MunicipalRegionModel).where(MunicipalRegionModel.deleted_at.is_(None))
        if municipality_id:
            stmt = stmt.where(MunicipalRegionModel.municipality_id == municipality_id)
        if uf:
            stmt = stmt.where(MunicipalRegionModel.uf == uf.upper())
        if zone:
            stmt = stmt.where(MunicipalRegionModel.master_plan_zone == zone)
        stmt = stmt.order_by(MunicipalRegionModel.code.asc()).limit(limit).offset(offset)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def create_region(self, payload: MunicipalRegionCreateSchema) -> MunicipalRegionModel:
        """Persiste uma nova região administrativa municipal."""
        region = MunicipalRegionModel(
            municipality_id=payload.municipality_id,
            code=payload.code.strip().upper(),
            name=payload.name.strip(),
            city_name=payload.city_name.strip(),
            uf=payload.uf.strip().upper(),
            master_plan_zone=payload.master_plan_zone.value,
            master_plan_law_ref=payload.master_plan_law_ref.strip(),
            electorate_total=payload.electorate_total,
            electorate_weight_pct=payload.electorate_weight_pct,
            census_sectors_count=payload.census_sectors_count,
            is_active=payload.is_active,
        )
        self._session.add(region)
        await self._session.commit()
        await self._session.refresh(region)
        return region

    async def update_region(
        self, region: MunicipalRegionModel, payload: MunicipalRegionUpdateSchema
    ) -> MunicipalRegionModel:
        """Atualiza campos de uma região administrativa municipal."""
        update_data = payload.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            if val is not None:
                setattr(region, key, val.value if hasattr(val, "value") else val)
        await self._session.commit()
        await self._session.refresh(region)
        return region

    async def soft_delete_region(self, region: MunicipalRegionModel) -> None:
        """Remove logicamente (soft delete) uma região administrativa municipal."""
        region.deleted_at = datetime.now(UTC)
        await self._session.commit()

    async def get_neighborhood_by_id(self, neighborhood_id: UUID) -> NeighborhoodModel | None:
        """Busca bairro pelo UUID."""
        stmt = select(NeighborhoodModel).where(
            NeighborhoodModel.id == neighborhood_id,
            NeighborhoodModel.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def get_neighborhood_by_code(self, code: str) -> NeighborhoodModel | None:
        """Busca bairro pelo código único."""
        stmt = select(NeighborhoodModel).where(
            NeighborhoodModel.code == code,
            NeighborhoodModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_neighborhoods(
        self, region_id: UUID, *, limit: int = 100, offset: int = 0
    ) -> list[NeighborhoodModel]:
        """Lista bairros pertencentes a uma região municipal."""
        stmt = (
            select(NeighborhoodModel)
            .where(
                NeighborhoodModel.region_id == region_id,
                NeighborhoodModel.deleted_at.is_(None),
            )
            .order_by(NeighborhoodModel.code.asc())
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def create_neighborhood(
        self, region_id: UUID, payload: NeighborhoodCreateSchema
    ) -> NeighborhoodModel:
        """Cadastra novo bairro vinculado a uma região municipal."""
        neighborhood = NeighborhoodModel(
            region_id=region_id,
            code=payload.code.strip().upper(),
            name=payload.name.strip(),
            ibge_census_sector_prefix=payload.ibge_census_sector_prefix.strip(),
            predominant_income_bracket=payload.predominant_income_bracket.strip(),
            estimated_voters=payload.estimated_voters,
            electoral_weight_pct=payload.electoral_weight_pct,
            is_active=payload.is_active,
        )
        self._session.add(neighborhood)
        await self._session.commit()
        await self._session.refresh(neighborhood)
        return neighborhood

    async def update_neighborhood(
        self, nb: NeighborhoodModel, payload: NeighborhoodUpdateSchema
    ) -> NeighborhoodModel:
        """Atualiza dados de um bairro vinculado à região municipal."""
        for key, val in payload.model_dump(exclude_unset=True).items():
            if val is not None:
                setattr(nb, key, val)
        await self._session.commit()
        await self._session.refresh(nb)
        return nb

    async def soft_delete_neighborhood(self, nb: NeighborhoodModel) -> None:
        """Remove logicamente (soft delete) um bairro."""
        nb.deleted_at = datetime.now(UTC)
        await self._session.commit()
