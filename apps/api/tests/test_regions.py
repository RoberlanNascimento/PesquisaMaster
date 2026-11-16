"""Testes de integração para CRUD da Hierarquia Territorial (País, Estado, Município e Região)."""

from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

import src.modules.audit.models
import src.modules.regions.models  # noqa: F401
from src.core.database import Base, get_db_session
from src.core.security import UserRole, create_access_token
from src.main import app
from src.modules.auth.models import UserModel


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Cria banco SQLite em memória isolado para os testes de hierarquia territorial."""
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        bind=test_engine, class_=AsyncSession, expire_on_commit=False
    )

    async with session_factory() as session:

        async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
            yield session

        app.dependency_overrides[get_db_session] = _override_get_db
        yield session

    app.dependency_overrides.clear()
    await test_engine.dispose()


async def _create_operator(session: AsyncSession, role: UserRole) -> str:
    """Cria usuário operador e retorna o token JWT correspondente."""
    user = UserModel(
        email=f"{role.value.lower()}.regions@pesquisamaster.com.br",
        password_hash="argon2id$v=19$m=65536,t=3,p=4$dummy_hash_for_test",
        full_name=f"Operador {role.value}",
        role=role.value,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    token, _ = create_access_token(user_id=user.id, email=user.email, role=role)
    return token


@pytest.mark.asyncio
async def test_full_hierarchy_crud_country_state_municipality_region_neighborhood(
    db_session: AsyncSession,
) -> None:
    """Valida CRUD completo em cascata: País -> Estado (UF) -> Município -> Região -> Bairro."""
    token = await _create_operator(db_session, UserRole.STATISTICIAN)
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. CRUD País
        res_country = await client.post(
            "/api/v1/regions/countries",
            json={"iso_code": "BR", "name": "Brasil", "electoral_authority": "TSE"},
            headers=headers,
        )
        assert res_country.status_code == 201
        country_id = res_country.json()["id"]

        res_patch_c = await client.patch(
            f"/api/v1/regions/countries/{country_id}",
            json={"electoral_authority": "TSE / TRE"},
            headers=headers,
        )
        assert res_patch_c.status_code == 200
        assert res_patch_c.json()["electoral_authority"] == "TSE / TRE"

        # 2. CRUD Estado (UF) vinculado ao País
        res_state = await client.post(
            "/api/v1/regions/states",
            json={
                "country_id": country_id,
                "uf": "SP",
                "name": "São Paulo",
                "ibge_code": "35",
                "macro_region": "Sudeste",
                "electorate_total": 34400000,
            },
            headers=headers,
        )
        assert res_state.status_code == 201
        state_id = res_state.json()["id"]

        res_patch_s = await client.patch(
            f"/api/v1/regions/states/{state_id}",
            json={"electorate_total": 34500000},
            headers=headers,
        )
        assert res_patch_s.status_code == 200
        assert res_patch_s.json()["electorate_total"] == 34500000

        # 3. CRUD Município vinculado ao Estado
        res_city = await client.post(
            "/api/v1/regions/municipalities",
            json={
                "state_id": state_id,
                "ibge_code": "3550308",
                "name": "São Paulo",
                "uf": "SP",
                "master_plan_law_ref": "Lei Municipal nº 16.050/2014 (PDE-SP)",
                "electorate_total": 8940000,
            },
            headers=headers,
        )
        assert res_city.status_code == 201
        municipality_id = res_city.json()["id"]

        res_patch_m = await client.patch(
            f"/api/v1/regions/municipalities/{municipality_id}",
            json={"electorate_total": 8950000},
            headers=headers,
        )
        assert res_patch_m.status_code == 200
        assert res_patch_m.json()["electorate_total"] == 8950000

        # 4. CRUD Região Municipal vinculada ao Município
        region_payload = {
            "municipality_id": municipality_id,
            "code": "REG-SP-SUL",
            "name": "Macrozona Sul — Santo Amaro & Capela do Socorro",
            "city_name": "São Paulo",
            "uf": "SP",
            "master_plan_zone": "ZONA_SUL",
            "master_plan_law_ref": "Lei Municipal nº 16.050/2014 (PDE-SP)",
            "electorate_total": 1845200,
            "electorate_weight_pct": "21.4500",
            "census_sectors_count": 412,
            "is_active": True,
        }
        res_create = await client.post("/api/v1/regions", json=region_payload, headers=headers)
        assert res_create.status_code == 201
        region_id = res_create.json()["id"]

        res_patch_r = await client.patch(
            f"/api/v1/regions/{region_id}",
            json={"census_sectors_count": 430},
            headers=headers,
        )
        assert res_patch_r.status_code == 200
        assert res_patch_r.json()["census_sectors_count"] == 430

        # 5. CRUD Bairro vinculado à Região Municipal
        nb_payload = {
            "code": "BAIRRO-BELA-VISTA",
            "name": "Bela Vista / Bixiga",
            "ibge_census_sector_prefix": "35503080500",
            "predominant_income_bracket": "3 a 5 Salários Mínimos",
            "estimated_voters": 64200,
            "electoral_weight_pct": "0.7200",
            "is_active": True,
        }
        res_nb = await client.post(
            f"/api/v1/regions/{region_id}/neighborhoods",
            json=nb_payload,
            headers=headers,
        )
        assert res_nb.status_code == 201
        nb_id = res_nb.json()["id"]

        res_patch_nb = await client.patch(
            f"/api/v1/regions/{region_id}/neighborhoods/{nb_id}",
            json={"name": "Bela Vista / Morro dos Ingleses", "estimated_voters": 66500},
            headers=headers,
        )
        assert res_patch_nb.status_code == 200
        assert res_patch_nb.json()["name"] == "Bela Vista / Morro dos Ingleses"

        # Exclusão de Bairro e Região
        res_del_nb = await client.delete(
            f"/api/v1/regions/{region_id}/neighborhoods/{nb_id}", headers=headers
        )
        assert res_del_nb.status_code == 204

        res_del_reg = await client.delete(f"/api/v1/regions/{region_id}", headers=headers)
        assert res_del_reg.status_code == 204
