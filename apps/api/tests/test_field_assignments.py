"""Testes de integração para Distribuição de Cotas e Perímetros Geográficos por Pesquisador."""

from collections.abc import AsyncGenerator
from typing import Any

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
    session: AsyncSession,
    *,
    email: str,
    role: UserRole,
    bound_device_id: str | None = None,
) -> tuple[UserModel, str]:
    """Cria operador e retorna a entidade e seu token JWT."""
    user = UserModel(
        email=email,
        password_hash=hash_password("ValidPass#2026"),
        full_name=f"Operator {role.value}",
        role=role.value,
        bound_device_id=bound_device_id,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    token, _ = create_access_token(
        user_id=user.id,
        email=user.email,
        role=role,
        device_id=bound_device_id,
    )
    return user, token


async def _setup_survey_with_stratum(
    client: AsyncClient, stat_token: str
) -> tuple[str, str, dict[str, Any]]:
    """Cria pesquisa (N=100) e estrato ZONA_LESTE com meta de 50 e polígono GeoJSON."""
    headers = {"Authorization": f"Bearer {stat_token}"}
    survey_res = await client.post(
        "/api/v1/surveys",
        headers=headers,
        json={
            "tse_protocol_number": "SP-77889/2026",
            "title": "Pesquisa Distribuição de Campo",
            "election_sphere": "MUNICIPAL",
            "target_uf": "SP",
            "target_municipality_ibge": "3550308",
            "contracting_entity_doc": "12345678000199",
            "statistician_conre": "CONRE-3 4455",
            "planned_sample_size": 100,
            "confidence_level": "95.0000",
            "margin_of_error": "3.0000",
            "field_start_at": "2026-10-30T08:00:00Z",
            "field_end_at": "2026-11-02T18:00:00Z",
        },
    )
    survey_id = str(survey_res.json()["id"])

    polygon: dict[str, Any] = {
        "type": "Polygon",
        "coordinates": [
            [
                [-46.55, -23.55],
                [-46.50, -23.55],
                [-46.50, -23.50],
                [-46.55, -23.55],
            ]
        ],
    }
    strata_res = await client.post(
        f"/api/v1/surveys/{survey_id}/strata/allocate",
        headers=headers,
        json={
            "strata": [
                {
                    "region_code": "ZONA_LESTE",
                    "geographic_name": "Zona Leste - Setor 01",
                    "population_proportion": "0.5000",
                    "boundary_geom": polygon,
                },
                {
                    "region_code": "ZONA_OESTE",
                    "geographic_name": "Zona Oeste - Setor 02",
                    "population_proportion": "0.5000",
                },
            ]
        },
    )
    zl_stratum = next(s for s in strata_res.json() if s["region_code"] == "ZONA_LESTE")
    return survey_id, str(zl_stratum["id"]), polygon


@pytest.mark.asyncio
async def test_supervisor_assigns_quotas_and_researcher_fetches_own_perimeter(
    db_session: AsyncSession,
) -> None:
    """Supervisor distribui cotas sem exceder a meta do estrato e pesquisador lê seu perímetro."""
    _, stat_token = await _create_operator(
        db_session, email="stat@pesquisamaster.org", role=UserRole.STATISTICIAN
    )
    _, sup_token = await _create_operator(
        db_session, email="sup@pesquisamaster.org", role=UserRole.SUPERVISOR
    )
    r1, r1_token = await _create_operator(
        db_session,
        email="pesq1@pesquisamaster.org",
        role=UserRole.RESEARCHER,
        bound_device_id="tablet-zl-001",
    )
    r2, _ = await _create_operator(
        db_session,
        email="pesq2@pesquisamaster.org",
        role=UserRole.RESEARCHER,
        bound_device_id="tablet-zl-002",
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        survey_id, stratum_id, polygon = await _setup_survey_with_stratum(client, stat_token)
        sup_headers = {"Authorization": f"Bearer {sup_token}"}

        # 1. Supervisor atribui 30 entrevistas para Pesquisador 1 (meta do estrato = 50)
        a1_res = await client.post(
            f"/api/v1/surveys/{survey_id}/assignments",
            headers=sup_headers,
            json={
                "stratum_id": stratum_id,
                "researcher_id": str(r1.id),
                "assigned_quota": 30,
            },
        )
        assert a1_res.status_code == 201
        a1_body = a1_res.json()
        assert a1_body["assigned_quota"] == 30
        assert a1_body["region_code"] == "ZONA_LESTE"
        assert a1_body["boundary_geom"] == polygon

        # 2. Tentativa de atribuir 25 entrevistas para Pesquisador 2 deve falhar (30 + 25 = 55 > 50)
        overflow_res = await client.post(
            f"/api/v1/surveys/{survey_id}/assignments",
            headers=sup_headers,
            json={
                "stratum_id": stratum_id,
                "researcher_id": str(r2.id),
                "assigned_quota": 25,
            },
        )
        assert overflow_res.status_code == 409
        assert "excede o saldo disponível" in overflow_res.json()["detail"]

        # 3. Atribuir o saldo restante (20) para Pesquisador 2 deve funcionar (30 + 20 = 50)
        a2_res = await client.post(
            f"/api/v1/surveys/{survey_id}/assignments",
            headers=sup_headers,
            json={
                "stratum_id": stratum_id,
                "researcher_id": str(r2.id),
                "assigned_quota": 20,
            },
        )
        assert a2_res.status_code == 201

        # 4. Pesquisador 1 consulta `/assignments` (com X-Device-ID) e vê apenas sua própria cota
        r1_list = await client.get(
            f"/api/v1/surveys/{survey_id}/assignments",
            headers={
                "Authorization": f"Bearer {r1_token}",
                "X-Device-ID": "tablet-zl-001",
            },
        )
        assert r1_list.status_code == 200
        assert r1_list.json()["total"] == 1
        assert r1_list.json()["items"][0]["researcher_id"] == str(r1.id)
        assert r1_list.json()["items"][0]["boundary_geom"] == polygon


@pytest.mark.asyncio
async def test_assignment_rejects_non_researcher_target(
    db_session: AsyncSession,
) -> None:
    """Não deve permitir atribuir cota de campo a um usuário que não tenha perfil RESEARCHER."""
    _, stat_token = await _create_operator(
        db_session, email="stat2@pesquisamaster.org", role=UserRole.STATISTICIAN
    )
    analyst, _ = await _create_operator(
        db_session, email="analyst@pesquisamaster.org", role=UserRole.ANALYST
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        survey_id, stratum_id, _ = await _setup_survey_with_stratum(client, stat_token)

        bad_target_res = await client.post(
            f"/api/v1/surveys/{survey_id}/assignments",
            headers={"Authorization": f"Bearer {stat_token}"},
            json={
                "stratum_id": stratum_id,
                "researcher_id": str(analyst.id),
                "assigned_quota": 10,
            },
        )
        assert bad_target_res.status_code == 422
        assert "RESEARCHER" in bad_target_res.json()["detail"]
