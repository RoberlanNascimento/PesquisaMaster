"""Repositório isolado de acesso a dados (SQLAlchemy Async) para Pesquisas Eleitorais."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.surveys.models import SurveyModel, SurveyStatus
from src.modules.surveys.schemas import (
    SurveyCreateSchema,
    SurveyFilterSchema,
    SurveyResponseSchema,
)


class SurveyRepository:
    """Encapsula todas as operações de banco da tabela `surveys`."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_model_by_id(self, survey_id: UUID) -> SurveyModel | None:
        """Busca uma pesquisa ativa (não deletada) pelo UUID."""
        stmt = select(SurveyModel).where(
            SurveyModel.id == survey_id,
            SurveyModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_model_by_protocol(self, tse_protocol_number: str) -> SurveyModel | None:
        """Busca uma pesquisa pelo número de protocolo PesqEle TSE."""
        normalized = tse_protocol_number.strip().upper()
        stmt = select(SurveyModel).where(
            func.upper(SurveyModel.tse_protocol_number) == normalized,
            SurveyModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(
        self, payload: SurveyCreateSchema, *, created_by: UUID
    ) -> SurveyResponseSchema:
        """Persiste uma nova pesquisa em status DRAFT e retorna o DTO validado."""
        entity = SurveyModel(
            tse_protocol_number=payload.tse_protocol_number.strip().upper(),
            title=payload.title.strip(),
            election_sphere=payload.election_sphere.value,
            target_uf=payload.target_uf.strip().upper(),
            target_municipality_ibge=payload.target_municipality_ibge,
            contracting_entity_doc=payload.contracting_entity_doc.strip(),
            statistician_conre=payload.statistician_conre.strip(),
            planned_sample_size=payload.planned_sample_size,
            confidence_level=payload.confidence_level,
            margin_of_error=payload.margin_of_error,
            status=SurveyStatus.DRAFT.value,
            created_by=created_by,
            field_start_at=payload.field_start_at,
            field_end_at=payload.field_end_at,
        )
        self._session.add(entity)
        await self._session.flush()
        await self._session.refresh(entity)
        return SurveyResponseSchema.model_validate(entity)

    async def save(self, entity: SurveyModel) -> SurveyResponseSchema:
        """Sincroniza alterações da entidade e retorna DTO validado."""
        self._session.add(entity)
        await self._session.flush()
        await self._session.refresh(entity)
        return SurveyResponseSchema.model_validate(entity)

    async def list_paginated(
        self, filters: SurveyFilterSchema
    ) -> tuple[list[SurveyResponseSchema], int]:
        """Lista pesquisas com paginação obrigatória e filtros opcionais."""
        base_stmt = select(SurveyModel).where(SurveyModel.deleted_at.is_(None))
        count_stmt = (
            select(func.count()).select_from(SurveyModel).where(SurveyModel.deleted_at.is_(None))
        )

        if filters.status is not None:
            base_stmt = base_stmt.where(SurveyModel.status == filters.status.value)
            count_stmt = count_stmt.where(SurveyModel.status == filters.status.value)

        if filters.election_sphere is not None:
            base_stmt = base_stmt.where(
                SurveyModel.election_sphere == filters.election_sphere.value
            )
            count_stmt = count_stmt.where(
                SurveyModel.election_sphere == filters.election_sphere.value
            )

        if filters.target_uf is not None:
            uf_upper = filters.target_uf.strip().upper()
            base_stmt = base_stmt.where(SurveyModel.target_uf == uf_upper)
            count_stmt = count_stmt.where(SurveyModel.target_uf == uf_upper)

        total = int((await self._session.execute(count_stmt)).scalar_one())
        paged_stmt = (
            base_stmt.order_by(SurveyModel.created_at.desc())
            .limit(filters.limit)
            .offset(filters.offset)
        )
        rows = (await self._session.execute(paged_stmt)).scalars().all()
        items = [SurveyResponseSchema.model_validate(row) for row in rows]
        return items, total
