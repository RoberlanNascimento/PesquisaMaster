"""Repositório de acesso assíncrono aos dados da base PostgreSQL 'pesquisas'."""

import time
from collections.abc import Sequence
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.pesquisas.models import (
    AmostraDbModel,
    MunicipioDbModel,
    PesquisaDbModel,
    ProfissionalDbModel,
)
from src.modules.pesquisas.schemas import PesquisaCreate, PesquisaUpdate


class PesquisasRepository:
    """Operações CRUD e consultas no banco de dados pesquisas."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_pesquisas(
        self, search: str | None = None, limit: int = 50, offset: int = 0
    ) -> Sequence[PesquisaDbModel]:
        stmt = (
            select(PesquisaDbModel)
            .order_by(PesquisaDbModel.id_pesquisa.desc())
            .offset(offset)
            .limit(limit)
        )
        if search:
            stmt = stmt.where(PesquisaDbModel.nome.ilike(f"%{search}%"))
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def get_by_id(self, id_pesquisa: int) -> PesquisaDbModel | None:
        stmt = select(PesquisaDbModel).where(PesquisaDbModel.id_pesquisa == id_pesquisa)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def create(self, payload: PesquisaCreate) -> PesquisaDbModel:
        data = payload.model_dump()
        if data.get("id_usuario_criador") is None:
            data["id_usuario_criador"] = data.get("id_usuario") or 1
        model = PesquisaDbModel(**data)
        self.session.add(model)
        await self.session.commit()
        await self.session.refresh(model)
        return model

    async def update(self, id_pesquisa: int, payload: PesquisaUpdate) -> PesquisaDbModel | None:
        model = await self.get_by_id(id_pesquisa)
        if not model:
            return None
        data = payload.model_dump(exclude_unset=True)
        for k, v in data.items():
            setattr(model, k, v)
        await self.session.commit()
        await self.session.refresh(model)
        return model

    async def set_bloqueio(
        self, id_pesquisa: int, is_bloqueada: bool, motivo: str | None = None
    ) -> PesquisaDbModel | None:
        model = await self.get_by_id(id_pesquisa)
        if not model:
            return None
        model.is_bloqueada = is_bloqueada
        if motivo:
            model.motivo_fechamento = motivo
        await self.session.commit()
        await self.session.refresh(model)
        return model

    async def list_municipios(self) -> Sequence[MunicipioDbModel]:
        stmt = select(MunicipioDbModel).order_by(MunicipioDbModel.nome.asc()).limit(100)
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def list_amostras(self) -> Sequence[AmostraDbModel]:
        stmt = select(AmostraDbModel).order_by(AmostraDbModel.descricao.asc()).limit(100)
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def list_profissionais(self) -> Sequence[ProfissionalDbModel]:
        stmt = select(ProfissionalDbModel).order_by(ProfissionalDbModel.nome.asc()).limit(100)
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def get_db_health(self) -> dict[str, Any]:
        t0 = time.perf_counter()
        ver_res = await self.session.execute(text("SELECT version();"))
        ver = ver_res.scalar() or "Unknown"

        count_p = await self.session.execute(select(func.count(PesquisaDbModel.id_pesquisa)))
        count_m = await self.session.execute(select(func.count(MunicipioDbModel.id_municipio)))
        count_a = await self.session.execute(select(func.count(AmostraDbModel.id_amostra)))
        latency = (time.perf_counter() - t0) * 1000

        return {
            "status": "connected",
            "database": "pesquisas",
            "host": "localhost:5432",
            "server_version": str(ver).split(",")[0],
            "total_pesquisas": count_p.scalar() or 0,
            "total_municipios": count_m.scalar() or 0,
            "total_amostras": count_a.scalar() or 0,
            "latency_ms": round(latency, 2),
        }
