"""Testes de integração para Empresa Cliente, Credenciamento de Colaboradores e Módulo SaaS."""

from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

import src.modules.audit.models  # noqa: F401
import src.modules.clients.models  # noqa: F401
from src.core.database import Base, get_db_session
from src.core.security import UserRole, create_access_token
from src.main import app
from src.modules.auth.models import UserModel


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Cria banco SQLite em memória isolado para os testes do módulo de clientes."""
    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        future=True,
    )
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


async def _create_admin(session: AsyncSession) -> tuple[UserModel, str]:
    """Cria operador administrador e retorna seu JWT de autorização."""
    admin = UserModel(
        email="admin.saas@pesquisamaster.com.br",
        password_hash="argon2id$v=19$m=65536,t=3,p=4$dummy_hash_for_test",
        full_name="Admin Operacional SaaS",
        role=UserRole.ADMIN.value,
        is_active=True,
    )
    session.add(admin)
    await session.commit()
    await session.refresh(admin)
    token, _ = create_access_token(user_id=admin.id, email=admin.email, role=UserRole.ADMIN)
    return admin, token


@pytest.mark.asyncio
async def test_saas_catalog_returns_plans(db_session: AsyncSession) -> None:
    """Deve retornar o catálogo com os 3 planos comerciais SaaS."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/v1/saas/plans")

    assert response.status_code == 200
    plans = response.json()
    assert len(plans) == 3
    plan_ids = [p["id"] for p in plans]
    assert "starter" in plan_ids
    assert "pro" in plan_ids
    assert "enterprise" in plan_ids


@pytest.mark.asyncio
async def test_create_client_company_and_list(db_session: AsyncSession) -> None:
    """Deve criar empresa cliente com qualificação TSE e listá-la."""
    _, token = await _create_admin(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Cria empresa cliente
        payload = {
            "corporate_name": "Instituto Data Brasil Pesquisas de Opinião Ltda",
            "trade_name": "Data Brasil",
            "cnpj": "12.345.678/0001-90",
            "legal_rep": "Dr. Fernando Silveira",
            "contact_email": "contato@databrasil.com.br",
            "contact_phone": "(11) 3344-5566",
            "city_uf": "São Paulo / SP",
            "tse_origin_funds": "FEFC_ELEITORAL",
            "saas_plan": "pro",
        }
        res_create = await client.post("/api/v1/clients", json=payload, headers=headers)
        assert res_create.status_code == 201
        created = res_create.json()
        company_id = created["id"]
        assert created["corporate_name"] == payload["corporate_name"]
        assert created["cnpj"] == payload["cnpj"]
        assert created["tse_origin_funds"] == "FEFC_ELEITORAL"
        assert created["saas_plan"] == "pro"
        assert created["surveys_quota_total"] == 10
        assert created["interviews_quota_total"] == 15000
        assert created["devices_quota_total"] == 30

        # 2. Conflito de CNPJ duplicado
        res_dup = await client.post("/api/v1/clients", json=payload, headers=headers)
        assert res_dup.status_code == 409

        # 3. Lista empresas
        res_list = await client.get("/api/v1/clients", headers=headers)
        assert res_list.status_code == 200
        companies = res_list.json()
        assert len(companies) == 1
        assert companies[0]["id"] == company_id


@pytest.mark.asyncio
async def test_saas_plan_upgrade_and_collaborators(db_session: AsyncSession) -> None:
    """Deve alterar o plano SaaS atualizando cotas e credenciar colaboradores."""
    _, token = await _create_admin(db_session)
    headers = {"Authorization": f"Bearer {token}"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Cria empresa inicial com plano starter
        comp_payload = {
            "corporate_name": "Vox Populi & Opinião Pública Ltda",
            "trade_name": "Vox Opinião",
            "cnpj": "98.765.432/0001-10",
            "legal_rep": "Mariana Toledo",
            "contact_email": "mariana@voxopiniao.com.br",
            "contact_phone": "(31) 2233-4455",
            "city_uf": "Belo Horizonte / MG",
            "tse_origin_funds": "PROPRIOS",
            "saas_plan": "starter",
        }
        res_comp = await client.post("/api/v1/clients", json=comp_payload, headers=headers)
        assert res_comp.status_code == 201
        company_id = res_comp.json()["id"]
        assert res_comp.json()["surveys_quota_total"] == 2

        # Altera plano para enterprise
        upgrade_res = await client.post(
            f"/api/v1/clients/{company_id}/subscription",
            json={"plan": "enterprise"},
            headers=headers,
        )
        assert upgrade_res.status_code == 200
        upgraded = upgrade_res.json()
        assert upgraded["saas_plan"] == "enterprise"
        assert upgraded["surveys_quota_total"] == 50
        assert upgraded["interviews_quota_total"] == 100000

        # Credencia colaborador (Estatístico CONRE)
        collab_payload = {
            "name": "Prof. Dra. Camila Diniz",
            "email": "camila.diniz@voxopiniao.com.br",
            "role": "ESTATISTICO",
            "credential": "CONRE 3ª Região nº 9842",
            "is_active": True,
        }
        res_collab = await client.post(
            f"/api/v1/clients/{company_id}/collaborators",
            json=collab_payload,
            headers=headers,
        )
        assert res_collab.status_code == 201
        collab = res_collab.json()
        assert collab["role"] == "ESTATISTICO"
        assert collab["credential"] == "CONRE 3ª Região nº 9842"

        # Lista colaboradores da empresa
        res_list_collabs = await client.get(
            f"/api/v1/clients/{company_id}/collaborators", headers=headers
        )
        assert res_list_collabs.status_code == 200
        collabs = res_list_collabs.json()
        assert len(collabs) == 1
        assert collabs[0]["email"] == "camila.diniz@voxopiniao.com.br"
