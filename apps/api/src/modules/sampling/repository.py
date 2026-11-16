"""Repositório isolado (SQLAlchemy Async) para Estratos Amostrais e Células de Cota."""

from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.sampling.models import (
    FieldAssignmentModel,
    QuotaCellModel,
    SampleStratumModel,
)
from src.modules.sampling.schemas import (
    FieldAssignmentResponseSchema,
    QuotaCellResponseSchema,
    SampleStratumResponseSchema,
)


class SamplingRepository:
    """Encapsula todas as operações de banco de `sample_strata` e `quota_cells`."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_stratum_model_by_id(self, stratum_id: UUID) -> SampleStratumModel | None:
        """Busca estrato amostral pelo UUID."""
        stmt = select(SampleStratumModel).where(SampleStratumModel.id == stratum_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def replace_survey_strata(
        self,
        survey_id: UUID,
        allocated_rows: list[tuple[str, str, dict[str, Any] | None, Decimal, int]],
    ) -> list[SampleStratumResponseSchema]:
        """Substitui os estratos da pesquisa em transação atômica e retorna DTOs."""
        await self._session.execute(
            delete(SampleStratumModel).where(SampleStratumModel.survey_id == survey_id)
        )
        entities: list[SampleStratumModel] = []
        for region_code, geo_name, boundary_geom, norm_prop, target_count in allocated_rows:
            entity = SampleStratumModel(
                survey_id=survey_id,
                region_code=region_code,
                geographic_name=geo_name,
                boundary_geom=boundary_geom,
                population_proportion=norm_prop,
                target_interviews=target_count,
            )
            self._session.add(entity)
            entities.append(entity)

        await self._session.flush()
        for entity in entities:
            await self._session.refresh(entity)
        return [SampleStratumResponseSchema.model_validate(e) for e in entities]

    async def list_strata_paginated(
        self, survey_id: UUID, *, limit: int, offset: int
    ) -> tuple[list[SampleStratumResponseSchema], int]:
        """Lista estratos de uma pesquisa com paginação obrigatória."""
        count_stmt = (
            select(func.count())
            .select_from(SampleStratumModel)
            .where(SampleStratumModel.survey_id == survey_id)
        )
        total = int((await self._session.execute(count_stmt)).scalar_one())

        stmt = (
            select(SampleStratumModel)
            .where(SampleStratumModel.survey_id == survey_id)
            .order_by(SampleStratumModel.region_code.asc())
            .limit(limit)
            .offset(offset)
        )
        rows = (await self._session.execute(stmt)).scalars().all()
        return [SampleStratumResponseSchema.model_validate(r) for r in rows], total

    async def replace_stratum_quota_cells(
        self,
        stratum_id: UUID,
        allocated_cells: list[tuple[str, str, str, str, Decimal, int]],
    ) -> list[QuotaCellResponseSchema]:
        """Substitui as células de cota de um estrato e retorna DTOs."""
        await self._session.execute(
            delete(QuotaCellModel).where(QuotaCellModel.stratum_id == stratum_id)
        )
        entities: list[QuotaCellModel] = []
        for gender, age, education, income, norm_prop, target_count in allocated_cells:
            entity = QuotaCellModel(
                stratum_id=stratum_id,
                gender=gender,
                age_bracket=age,
                education_level=education,
                income_bracket=income,
                target_proportion=norm_prop,
                target_count=target_count,
                current_valid_count=0,
                version=1,
            )
            self._session.add(entity)
            entities.append(entity)

        await self._session.flush()
        for entity in entities:
            await self._session.refresh(entity)
        return [QuotaCellResponseSchema.model_validate(e) for e in entities]

    async def list_quota_cells_paginated(
        self, stratum_id: UUID, *, limit: int, offset: int
    ) -> tuple[list[QuotaCellResponseSchema], int]:
        """Lista células de cota de um estrato com paginação obrigatória."""
        count_stmt = (
            select(func.count())
            .select_from(QuotaCellModel)
            .where(QuotaCellModel.stratum_id == stratum_id)
        )
        total = int((await self._session.execute(count_stmt)).scalar_one())

        stmt = (
            select(QuotaCellModel)
            .where(QuotaCellModel.stratum_id == stratum_id)
            .order_by(QuotaCellModel.gender.asc(), QuotaCellModel.age_bracket.asc())
            .limit(limit)
            .offset(offset)
        )
        rows = (await self._session.execute(stmt)).scalars().all()
        return [QuotaCellResponseSchema.model_validate(r) for r in rows], total

    async def get_assignment(
        self, survey_id: UUID, stratum_id: UUID, researcher_id: UUID
    ) -> FieldAssignmentModel | None:
        """Busca atribuição existente para a tríade (pesquisa, estrato, pesquisador)."""
        stmt = select(FieldAssignmentModel).where(
            FieldAssignmentModel.survey_id == survey_id,
            FieldAssignmentModel.stratum_id == stratum_id,
            FieldAssignmentModel.researcher_id == researcher_id,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def sum_assigned_quota_for_stratum(
        self, stratum_id: UUID, *, exclude_researcher_id: UUID | None = None
    ) -> int:
        """Calcula o total de cotas já distribuídas para os pesquisadores de um estrato."""
        stmt = select(func.coalesce(func.sum(FieldAssignmentModel.assigned_quota), 0)).where(
            FieldAssignmentModel.stratum_id == stratum_id
        )
        if exclude_researcher_id is not None:
            stmt = stmt.where(FieldAssignmentModel.researcher_id != exclude_researcher_id)
        result = await self._session.execute(stmt)
        return int(result.scalar_one())

    async def upsert_field_assignment(
        self,
        *,
        survey_id: UUID,
        stratum: SampleStratumModel,
        researcher_id: UUID,
        assigned_quota: int,
    ) -> FieldAssignmentResponseSchema:
        """Cria ou atualiza a cota e perímetro geográfico atribuído a um pesquisador."""
        existing = await self.get_assignment(survey_id, stratum.id, researcher_id)
        if existing is None:
            entity = FieldAssignmentModel(
                survey_id=survey_id,
                stratum_id=stratum.id,
                researcher_id=researcher_id,
                assigned_quota=assigned_quota,
            )
            self._session.add(entity)
        else:
            existing.assigned_quota = assigned_quota
            entity = existing

        await self._session.flush()
        await self._session.refresh(entity)
        return FieldAssignmentResponseSchema(
            id=entity.id,
            survey_id=entity.survey_id,
            stratum_id=entity.stratum_id,
            researcher_id=entity.researcher_id,
            assigned_quota=entity.assigned_quota,
            region_code=stratum.region_code,
            geographic_name=stratum.geographic_name,
            boundary_geom=stratum.boundary_geom,
            stratum_target_interviews=stratum.target_interviews,
            assigned_at=entity.assigned_at,
        )

    async def list_field_assignments_paginated(
        self,
        survey_id: UUID,
        *,
        researcher_id: UUID | None = None,
        stratum_id: UUID | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[FieldAssignmentResponseSchema], int]:
        """Lista atribuições de campo fazendo join com o estrato geográfico."""
        base_stmt = (
            select(FieldAssignmentModel, SampleStratumModel)
            .join(
                SampleStratumModel,
                FieldAssignmentModel.stratum_id == SampleStratumModel.id,
            )
            .where(FieldAssignmentModel.survey_id == survey_id)
        )
        count_stmt = (
            select(func.count())
            .select_from(FieldAssignmentModel)
            .where(FieldAssignmentModel.survey_id == survey_id)
        )

        if researcher_id is not None:
            base_stmt = base_stmt.where(FieldAssignmentModel.researcher_id == researcher_id)
            count_stmt = count_stmt.where(FieldAssignmentModel.researcher_id == researcher_id)

        if stratum_id is not None:
            base_stmt = base_stmt.where(FieldAssignmentModel.stratum_id == stratum_id)
            count_stmt = count_stmt.where(FieldAssignmentModel.stratum_id == stratum_id)

        total = int((await self._session.execute(count_stmt)).scalar_one())
        paged_stmt = (
            base_stmt.order_by(FieldAssignmentModel.assigned_at.desc()).limit(limit).offset(offset)
        )
        rows = (await self._session.execute(paged_stmt)).all()
        items = [
            FieldAssignmentResponseSchema(
                id=assignment.id,
                survey_id=assignment.survey_id,
                stratum_id=assignment.stratum_id,
                researcher_id=assignment.researcher_id,
                assigned_quota=assignment.assigned_quota,
                region_code=stratum.region_code,
                geographic_name=stratum.geographic_name,
                boundary_geom=stratum.boundary_geom,
                stratum_target_interviews=stratum.target_interviews,
                assigned_at=assignment.assigned_at,
            )
            for assignment, stratum in rows
        ]
        return items, total
