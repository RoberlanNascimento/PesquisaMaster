"""Repositório isolado (SQLAlchemy Async) para Institutos e Pesquisas do Agregador."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.aggregator.models import ExternalPollModel, PollInstituteModel
from src.modules.aggregator.schemas import (
    ExternalPollCreateSchema,
    ExternalPollResponseSchema,
    PollInstituteCreateSchema,
    PollInstituteResponseSchema,
)


class AggregatorRepository:
    """Encapsula todas as operações de `poll_institutes` e `external_polls`."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_institute_by_id(self, institute_id: UUID) -> PollInstituteModel | None:
        """Busca instituto pelo UUID."""
        stmt = select(PollInstituteModel).where(PollInstituteModel.id == institute_id)
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def get_institute_by_name_or_cnpj(
        self, name: str, cnpj: str
    ) -> PollInstituteModel | None:
        """Verifica se já existe instituto com mesmo nome ou CNPJ."""
        stmt = select(PollInstituteModel).where(
            (func.upper(PollInstituteModel.name) == name.strip().upper())
            | (PollInstituteModel.cnpj == cnpj.strip())
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def create_institute(
        self, payload: PollInstituteCreateSchema
    ) -> PollInstituteResponseSchema:
        """Persiste novo instituto de pesquisa."""
        entity = PollInstituteModel(
            name=payload.name.strip(),
            cnpj=payload.cnpj.strip(),
            methodological_weight=payload.methodological_weight,
            house_effect_adjustment=payload.house_effect_adjustment,
        )
        self._session.add(entity)
        await self._session.flush()
        await self._session.refresh(entity)
        return PollInstituteResponseSchema.model_validate(entity)

    async def list_institutes_paginated(
        self, *, limit: int, offset: int
    ) -> tuple[list[PollInstituteResponseSchema], int]:
        """Lista institutos paginados."""
        total = int(
            (
                await self._session.execute(select(func.count()).select_from(PollInstituteModel))
            ).scalar_one()
        )
        stmt = (
            select(PollInstituteModel)
            .order_by(PollInstituteModel.name.asc())
            .limit(limit)
            .offset(offset)
        )
        rows = (await self._session.execute(stmt)).scalars().all()
        return [PollInstituteResponseSchema.model_validate(r) for r in rows], total

    async def get_poll_by_protocol(self, protocol: str) -> ExternalPollModel | None:
        """Busca pesquisa externa pelo protocolo TSE."""
        stmt = select(ExternalPollModel).where(
            func.upper(ExternalPollModel.tse_protocol_number) == protocol.strip().upper()
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def create_external_poll(
        self, payload: ExternalPollCreateSchema
    ) -> ExternalPollResponseSchema:
        """Persiste nova pesquisa no agregador."""
        serialized_results = {
            k.strip().upper(): str(v) for k, v in payload.candidate_results.items()
        }
        entity = ExternalPollModel(
            institute_id=payload.institute_id,
            tse_protocol_number=payload.tse_protocol_number.strip().upper(),
            field_median_date=payload.field_median_date,
            sample_size=payload.sample_size,
            margin_of_error=payload.margin_of_error,
            candidate_results=serialized_results,
        )
        self._session.add(entity)
        await self._session.flush()
        await self._session.refresh(entity)
        return ExternalPollResponseSchema.model_validate(entity)

    async def list_polls_paginated(
        self, *, limit: int, offset: int
    ) -> tuple[list[ExternalPollResponseSchema], int]:
        """Lista pesquisas externas paginadas."""
        total = int(
            (
                await self._session.execute(select(func.count()).select_from(ExternalPollModel))
            ).scalar_one()
        )
        stmt = (
            select(ExternalPollModel)
            .order_by(ExternalPollModel.field_median_date.desc())
            .limit(limit)
            .offset(offset)
        )
        rows = (await self._session.execute(stmt)).scalars().all()
        return [ExternalPollResponseSchema.model_validate(r) for r in rows], total

    async def list_all_polls_with_institutes(
        self,
    ) -> list[tuple[ExternalPollModel, PollInstituteModel]]:
        """Retorna todas as pesquisas com seus respectivos institutos."""
        stmt = (
            select(ExternalPollModel, PollInstituteModel)
            .join(
                PollInstituteModel,
                ExternalPollModel.institute_id == PollInstituteModel.id,
            )
            .order_by(ExternalPollModel.field_median_date.asc())
        )
        rows = (await self._session.execute(stmt)).all()
        return [(poll, inst) for poll, inst in rows]
