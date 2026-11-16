"""Camada de serviço de domínio para Gerenciamento de Regiões Municipais e Bairros."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import ConflictError, NotFoundError
from src.modules.audit.schemas import AuditLogCreateSchema
from src.modules.audit.service import AuditService
from src.modules.regions.repository import RegionRepository
from src.modules.regions.schemas import (
    MunicipalRegionCreateSchema,
    MunicipalRegionResponseSchema,
    MunicipalRegionUpdateSchema,
    NeighborhoodCreateSchema,
    NeighborhoodResponseSchema,
    NeighborhoodUpdateSchema,
)


class RegionService:
    """Regras de negócio e CRUD para Regiões Administrativas e Bairros no Município."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = RegionRepository(session)
        self._audit = AuditService(session)

    async def list_regions(
        self,
        *,
        municipality_id: UUID | None = None,
        uf: str | None = None,
        zone: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[MunicipalRegionResponseSchema]:
        """Lista regiões municipais cadastradas com suporte a filtros e paginação."""
        items = await self._repo.list_regions(
            municipality_id=municipality_id, uf=uf, zone=zone, limit=limit, offset=offset
        )
        return [MunicipalRegionResponseSchema.model_validate(r) for r in items]

    async def get_region(self, region_id: UUID) -> MunicipalRegionResponseSchema:
        """Obtém uma região municipal pelo UUID ou lança NotFoundError."""
        region = await self._repo.get_region_by_id(region_id)
        if not region:
            raise NotFoundError(f"Região municipal '{region_id}' não encontrada.")
        return MunicipalRegionResponseSchema.model_validate(region)

    async def create_region(
        self, payload: MunicipalRegionCreateSchema, *, actor_id: UUID
    ) -> MunicipalRegionResponseSchema:
        """Cria nova região municipal garantindo unicidade do código e registrando auditoria."""
        normalized_code = payload.code.strip().upper()
        existing = await self._repo.get_region_by_code(normalized_code)
        if existing:
            raise ConflictError(
                f"Já existe uma região municipal cadastrada com o código '{normalized_code}'."
            )

        created = await self._repo.create_region(payload)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="regions",
                action="MUNICIPAL_REGION_CREATED",
                payload_diff={
                    "region_id": str(created.id),
                    "code": created.code,
                    "city_name": created.city_name,
                    "uf": created.uf,
                    "master_plan_zone": created.master_plan_zone,
                },
            )
        )
        return MunicipalRegionResponseSchema.model_validate(created)

    async def update_region(
        self, region_id: UUID, payload: MunicipalRegionUpdateSchema, *, actor_id: UUID
    ) -> MunicipalRegionResponseSchema:
        """Atualiza dados de uma região municipal e registra evento na trilha SHA-256."""
        region = await self._repo.get_region_by_id(region_id)
        if not region:
            raise NotFoundError(f"Região municipal '{region_id}' não encontrada.")

        updated = await self._repo.update_region(region, payload)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="regions",
                action="MUNICIPAL_REGION_UPDATED",
                payload_diff={
                    "region_id": str(region_id),
                    "code": updated.code,
                    "is_active": updated.is_active,
                },
            )
        )
        return MunicipalRegionResponseSchema.model_validate(updated)

    async def delete_region(self, region_id: UUID, *, actor_id: UUID) -> None:
        """Exclui logicamente uma região municipal e registra auditoria."""
        region = await self._repo.get_region_by_id(region_id)
        if not region:
            raise NotFoundError(f"Região municipal '{region_id}' não encontrada.")
        await self._repo.soft_delete_region(region)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="regions",
                action="MUNICIPAL_REGION_DELETED",
                payload_diff={"region_id": str(region_id), "code": region.code},
            )
        )

    async def list_neighborhoods(
        self, region_id: UUID, *, limit: int = 100, offset: int = 0
    ) -> list[NeighborhoodResponseSchema]:
        """Lista os bairros vinculados a uma região municipal."""
        region = await self._repo.get_region_by_id(region_id)
        if not region:
            raise NotFoundError(f"Região municipal '{region_id}' não encontrada.")

        items = await self._repo.list_neighborhoods(region_id, limit=limit, offset=offset)
        return [NeighborhoodResponseSchema.model_validate(n) for n in items]

    async def create_neighborhood(
        self, region_id: UUID, payload: NeighborhoodCreateSchema, *, actor_id: UUID
    ) -> NeighborhoodResponseSchema:
        """Cadastra novo bairro vinculado à região municipal conforme o Plano Diretor."""
        region = await self._repo.get_region_by_id(region_id)
        if not region:
            raise NotFoundError(f"Região municipal '{region_id}' não encontrada.")

        normalized_code = payload.code.strip().upper()
        existing = await self._repo.get_neighborhood_by_code(normalized_code)
        if existing:
            raise ConflictError(f"Já existe um bairro cadastrado com o código '{normalized_code}'.")

        created = await self._repo.create_neighborhood(region_id, payload)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="regions",
                action="MUNICIPAL_NEIGHBORHOOD_CREATED",
                payload_diff={
                    "region_id": str(region_id),
                    "neighborhood_id": str(created.id),
                    "code": created.code,
                    "name": created.name,
                },
            )
        )
        return NeighborhoodResponseSchema.model_validate(created)

    async def update_neighborhood(
        self,
        region_id: UUID,
        neighborhood_id: UUID,
        payload: NeighborhoodUpdateSchema,
        *,
        actor_id: UUID,
    ) -> NeighborhoodResponseSchema:
        """Atualiza dados de um bairro vinculado à região municipal."""
        nb = await self._repo.get_neighborhood_by_id(neighborhood_id)
        if not nb or nb.region_id != region_id:
            raise NotFoundError(f"Bairro '{neighborhood_id}' não encontrado na região.")
        updated = await self._repo.update_neighborhood(nb, payload)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="regions",
                action="MUNICIPAL_NEIGHBORHOOD_UPDATED",
                payload_diff={
                    "region_id": str(region_id),
                    "neighborhood_id": str(neighborhood_id),
                    "name": updated.name,
                },
            )
        )
        return NeighborhoodResponseSchema.model_validate(updated)

    async def delete_neighborhood(
        self, region_id: UUID, neighborhood_id: UUID, *, actor_id: UUID
    ) -> None:
        """Exclui logicamente um bairro vinculado à região municipal."""
        nb = await self._repo.get_neighborhood_by_id(neighborhood_id)
        if not nb or nb.region_id != region_id:
            raise NotFoundError(f"Bairro '{neighborhood_id}' não encontrado na região.")
        await self._repo.soft_delete_neighborhood(nb)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="regions",
                action="MUNICIPAL_NEIGHBORHOOD_DELETED",
                payload_diff={
                    "region_id": str(region_id),
                    "neighborhood_id": str(neighborhood_id),
                    "code": nb.code,
                },
            )
        )
