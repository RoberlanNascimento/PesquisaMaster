"""Testes unitários e de integração para Amostragem Estratificada e Alocação Hare-Niemeyer."""

from collections.abc import AsyncGenerator
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.core.database import Base, get_db_session
from src.core.security import UserRole, create_access_token, hash_password
from src.main import app
from src.modules.auth.models import UserModel
from src.modules.sampling.service import allocate_hare_niemeyer


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Cria banco SQLite em memória isolado por teste."""
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        bind=test_engine, class_=AsyncSession, expire_on_commit=False
    )

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db_session] = _override_get_db
    async with session_factory() as session:
        yield session

    app.dependency_overrides.clear()
    await test_engine.dispose()


async def _create_operator(
    session: AsyncSession, *, email: str, role: UserRole
) -> tuple[UserModel, str]:
    """Cria operador e retorna a entidade e seu token JWT."""
    user = UserModel(
        email=email,
        password_hash=hash_password("ValidPass#2026"),
        full_name=f"Operator {role.value}",
        role=role.value,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    token, _ = create_access_token(user_id=user.id, email=user.email, role=role)
    return user, token


async def _create_draft_survey(
    client: AsyncClient, token: str, *, planned_sample_size: int = 100
) -> str:
    """Auxiliar para criar pesquisa em status DRAFT e retornar o survey_id."""
    res = await client.post(
        "/api/v1/surveys",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "tse_protocol_number": "SP-55443/2026",
            "title": "Pesquisa Amostragem Estratificada Hare-Niemeyer",
            "election_sphere": "MUNICIPAL",
            "target_uf": "SP",
            "target_municipality_ibge": "3550308",
            "contracting_entity_doc": "12345678000199",
            "statistician_conre": "CONRE-3 7788",
            "planned_sample_size": planned_sample_size,
            "confidence_level": "95.0000",
            "margin_of_error": "3.1000",
            "field_start_at": "2026-10-30T08:00:00Z",
            "field_end_at": "2026-11-02T18:00:00Z",
        },
    )
    assert res.status_code == 201
    return str(res.json()["id"])


def test_pure_hare_niemeyer_largest_remainder_exact_sum() -> None:
    """Garante que o método de Maior Resto distribui frações exatas somando N."""
    # Exemplo clássico: N = 100, proporções: 33.33%, 33.33%, 33.34% -> 33, 33, 34
    counts, norm_props = allocate_hare_niemeyer(
        100,
        [Decimal("33.3300"), Decimal("33.3300"), Decimal("33.3400")],
    )
    assert counts == [33, 33, 34]
    assert sum(counts) == 100
    assert sum(norm_props, Decimal("0.0000")) == Decimal("1.0000")

    # Caso com múltiplos restos competitivos: N = 10, proporções: 0.36, 0.34, 0.30
    # Quotas exatas: 3.6 (int 3, resto 0.6), 3.4 (int 3, resto 0.4), 3.0 (int 3, resto 0.0)
    # Soma inteira = 9 -> 1 vaga restante vai para o índice 0 (maior resto 0.6) -> [4, 3, 3]
    counts2, _ = allocate_hare_niemeyer(
        10,
        [Decimal("0.3600"), Decimal("0.3400"), Decimal("0.3000")],
    )
    assert counts2 == [4, 3, 3]
    assert sum(counts2) == 10


@pytest.mark.asyncio
async def test_allocate_strata_and_quota_cells_end_to_end(
    db_session: AsyncSession,
) -> None:
    """Aloca estratos somando planned_sample_size e subdivide estrato em células demográficas."""
    _, stat_token = await _create_operator(
        db_session, email="stat@pesquisamaster.org", role=UserRole.STATISTICIAN
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        headers = {"Authorization": f"Bearer {stat_token}"}
        survey_id = await _create_draft_survey(client, stat_token, planned_sample_size=100)

        # 1. Aloca 3 estratos geográficos (Norte: 45.6%, Sul: 34.4%, Centro: 20.0%) -> 46, 34, 20
        strata_res = await client.post(
            f"/api/v1/surveys/{survey_id}/strata/allocate",
            headers=headers,
            json={
                "strata": [
                    {
                        "region_code": "ZONA_NORTE",
                        "geographic_name": "Zona Norte",
                        "population_proportion": "0.4560",
                        "boundary_geom": {
                            "type": "Polygon",
                            "coordinates": [
                                [
                                    [-46.65, -23.50],
                                    [-46.60, -23.50],
                                    [-46.60, -23.45],
                                    [-46.65, -23.50],
                                ]
                            ],
                        },
                    },
                    {
                        "region_code": "ZONA_SUL",
                        "geographic_name": "Zona Sul",
                        "population_proportion": "0.3440",
                    },
                    {
                        "region_code": "CENTRO",
                        "geographic_name": "Região Central",
                        "population_proportion": "0.2000",
                    },
                ]
            },
        )
        assert strata_res.status_code == 201
        strata_list = strata_res.json()
        assert len(strata_list) == 3
        targets = {s["region_code"]: s["target_interviews"] for s in strata_list}
        assert targets == {"ZONA_NORTE": 46, "ZONA_SUL": 34, "CENTRO": 20}
        assert sum(targets.values()) == 100

        # 2. Subdivide ZONA_NORTE (46 entrevistas) em 3 células demográficas (53%, 27%, 20%)
        # Quotas exatas de 46: 24.38 (24, r=0.38), 12.42 (12, r=0.42), 9.20 (9, r=0.20)
        # Soma inteira = 45 -> 1 vaga vai para maior resto (0.42) -> [24, 13, 9], soma = 46!
        zn_id = next(s["id"] for s in strata_list if s["region_code"] == "ZONA_NORTE")
        cells_res = await client.post(
            f"/api/v1/surveys/{survey_id}/strata/{zn_id}/quota-cells/allocate",
            headers=headers,
            json={
                "cells": [
                    {
                        "gender": "FEMININO",
                        "age_bracket": "25_44",
                        "education_level": "MEDIO",
                        "income_bracket": "ATE_2_SM",
                        "target_proportion": "53.0000",
                    },
                    {
                        "gender": "MASCULINO",
                        "age_bracket": "25_44",
                        "education_level": "MEDIO",
                        "income_bracket": "ATE_2_SM",
                        "target_proportion": "27.0000",
                    },
                    {
                        "gender": "FEMININO",
                        "age_bracket": "45_59",
                        "education_level": "SUPERIOR",
                        "income_bracket": "MAIS_5_SM",
                        "target_proportion": "20.0000",
                    },
                ]
            },
        )
        assert cells_res.status_code == 201
        cells = cells_res.json()
        assert [c["target_count"] for c in cells] == [24, 13, 9]
        assert sum(c["target_count"] for c in cells) == 46

        # 3. Consulta paginada das células de cota
        list_cells_res = await client.get(
            f"/api/v1/surveys/{survey_id}/strata/{zn_id}/quota-cells",
            headers=headers,
        )
        assert list_cells_res.status_code == 200
        assert list_cells_res.json()["total"] == 3


@pytest.mark.asyncio
async def test_sampling_rejects_invalid_proportions_and_locks_after_draft(
    db_session: AsyncSession,
) -> None:
    """Deve rejeitar proporções inválidas e bloquear realocação após entrar em campo."""
    _, stat_token = await _create_operator(
        db_session, email="stat2@pesquisamaster.org", role=UserRole.STATISTICIAN
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        headers = {"Authorization": f"Bearer {stat_token}"}
        survey_id = await _create_draft_survey(client, stat_token, planned_sample_size=200)

        # 1. Proporções que somam 0.8500 (85%) devem retornar 422 RFC 7807
        bad_prop_res = await client.post(
            f"/api/v1/surveys/{survey_id}/strata/allocate",
            headers=headers,
            json={
                "strata": [
                    {
                        "region_code": "NORTE",
                        "geographic_name": "Norte",
                        "population_proportion": "0.5000",
                    },
                    {
                        "region_code": "SUL",
                        "geographic_name": "Sul",
                        "population_proportion": "0.3500",
                    },
                ]
            },
        )
        assert bad_prop_res.status_code == 422

        # 2. Avança pesquisa para ACTIVE_FIELD e tenta alocar estratos -> 409 Conflict
        await client.post(
            f"/api/v1/surveys/{survey_id}/status",
            headers=headers,
            json={"target_status": "ACTIVE_FIELD"},
        )
        locked_res = await client.post(
            f"/api/v1/surveys/{survey_id}/strata/allocate",
            headers=headers,
            json={
                "strata": [
                    {
                        "region_code": "UNICO",
                        "geographic_name": "Município Todo",
                        "population_proportion": "1.0000",
                    }
                ]
            },
        )
        assert locked_res.status_code == 409
