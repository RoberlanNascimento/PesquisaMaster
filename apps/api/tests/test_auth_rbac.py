"""Testes de integração para Autenticação JWT, RBAC (6 perfis) e Device Binding."""

from collections.abc import AsyncGenerator
from datetime import timedelta

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
    """Cria um banco SQLite em memória isolado por teste com override de dependência."""
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


async def _seed_user(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    role: UserRole,
    bound_device_id: str | None = None,
) -> UserModel:
    """Auxiliar para inserir usuário diretamente no banco de teste."""
    user = UserModel(
        email=email,
        password_hash=hash_password(password),
        full_name=f"User {role.value}",
        role=role.value,
        bound_device_id=bound_device_id,
        is_active=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest.mark.asyncio
async def test_admin_login_and_create_users_across_6_roles(
    db_session: AsyncSession,
) -> None:
    """ADMIN deve autenticar e conseguir criar usuários nos 6 perfis RBAC sem expor senha."""
    await _seed_user(
        db_session,
        email="admin@pesquisamaster.org",
        password="AdminStrongPassword!2026",
        role=UserRole.ADMIN,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        login_res = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "admin@pesquisamaster.org",
                "password": "AdminStrongPassword!2026",
            },
        )
        assert login_res.status_code == 200
        token_data = login_res.json()
        admin_token = token_data["access_token"]
        assert "password_hash" not in token_data["user"]

        headers = {"Authorization": f"Bearer {admin_token}"}

        for role in (
            UserRole.STATISTICIAN,
            UserRole.SUPERVISOR,
            UserRole.RESEARCHER,
            UserRole.ANALYST,
            UserRole.AUDITOR,
        ):
            create_res = await client.post(
                "/api/v1/auth/users",
                headers=headers,
                json={
                    "email": f"{role.value.lower()}@pesquisamaster.org",
                    "password": "ValidPassword#1234",
                    "full_name": f"Operador {role.value}",
                    "role": role.value,
                },
            )
            assert create_res.status_code == 201
            created_user = create_res.json()
            assert created_user["role"] == role.value
            assert "password_hash" not in created_user

        list_res = await client.get("/api/v1/auth/users?limit=10&offset=0", headers=headers)
        assert list_res.status_code == 200
        paged = list_res.json()
        assert paged["total"] == 6
        assert len(paged["items"]) == 6
        assert paged["has_next"] is False


@pytest.mark.asyncio
async def test_rbac_denies_non_admin_from_creating_user(
    db_session: AsyncSession,
) -> None:
    """Perfis não-ADMIN (ex: ANALYST, STATISTICIAN) devem receber 403 RFC 7807 ao criar usuário."""
    await _seed_user(
        db_session,
        email="analyst@pesquisamaster.org",
        password="AnalystPassword!2026",
        role=UserRole.ANALYST,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        login_res = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "analyst@pesquisamaster.org",
                "password": "AnalystPassword!2026",
            },
        )
        analyst_token = login_res.json()["access_token"]

        forbidden_res = await client.post(
            "/api/v1/auth/users",
            headers={"Authorization": f"Bearer {analyst_token}"},
            json={
                "email": "unauthorized@pesquisamaster.org",
                "password": "ValidPassword#1234",
                "full_name": "Tentativa Indevida",
                "role": "AUDITOR",
            },
        )
        assert forbidden_res.status_code == 403
        problem = forbidden_res.json()
        assert problem["type"] == "https://pesquisamaster.local/errors/forbidden"
        assert "ADMIN" in problem["detail"]


@pytest.mark.asyncio
async def test_researcher_device_binding_first_login_and_mismatch_protection(
    db_session: AsyncSession,
) -> None:
    """Pesquisador vincula device_id no 1º login e bloqueia outro aparelho."""
    await _seed_user(
        db_session,
        email="pesquisador01@pesquisamaster.org",
        password="FieldSecret!2026",
        role=UserRole.RESEARCHER,
        bound_device_id=None,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Login sem device_id deve ser negado (403)
        no_device_res = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "pesquisador01@pesquisamaster.org",
                "password": "FieldSecret!2026",
            },
        )
        assert no_device_res.status_code == 403

        # 2. Primeiro login com device_id válido realiza o vínculo automático (Trust-On-First-Use)
        first_login_res = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "pesquisador01@pesquisamaster.org",
                "password": "FieldSecret!2026",
                "device_id": "tablet-tse-sp-001",
            },
        )
        assert first_login_res.status_code == 200
        token = first_login_res.json()["access_token"]
        assert first_login_res.json()["user"]["bound_device_id"] == "tablet-tse-sp-001"

        # 3. Chamada autenticada a /me sem cabeçalho X-Device-ID deve falhar (403)
        me_without_header = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_without_header.status_code == 403

        # 4. Chamada autenticada a /me com X-Device-ID divergente deve falhar (403)
        me_wrong_device = await client.get(
            "/api/v1/auth/me",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Device-ID": "tablet-clonado-999",
            },
        )
        assert me_wrong_device.status_code == 403

        # 5. Chamada autenticada a /me com X-Device-ID correto deve ter sucesso (200)
        me_ok = await client.get(
            "/api/v1/auth/me",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Device-ID": "tablet-tse-sp-001",
            },
        )
        assert me_ok.status_code == 200
        assert me_ok.json()["bound_device_id"] == "tablet-tse-sp-001"

        # 6. Tentativa de novo login a partir de outro aparelho deve ser bloqueada (403)
        second_device_login = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "pesquisador01@pesquisamaster.org",
                "password": "FieldSecret!2026",
                "device_id": "outro-celular-fraude-02",
            },
        )
        assert second_device_login.status_code == 403


@pytest.mark.asyncio
async def test_expired_token_returns_401_rfc7807(db_session: AsyncSession) -> None:
    """Tokens expirados devem retornar HTTP 401 no formato RFC 7807."""
    user = await _seed_user(
        db_session,
        email="auditor@pesquisamaster.org",
        password="AuditorPassword!2026",
        role=UserRole.AUDITOR,
    )
    expired_token, _ = create_access_token(
        user_id=user.id,
        email=user.email,
        role=UserRole.AUDITOR,
        expires_delta=timedelta(seconds=-10),
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert res.status_code == 401
        assert res.json()["type"] == "https://pesquisamaster.local/errors/unauthorized"


@pytest.mark.asyncio
async def test_mock_user_iwcosta_login_success(db_session: AsyncSession) -> None:
    """Valida autenticação do usuário mock iwcosta@gmail.com com senha 123456."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "iwcosta@gmail.com", "password": "123456"},
        )
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["user"]["email"] == "iwcosta@gmail.com"
        assert data["user"]["role"] == "ADMIN"
        assert data["user"]["full_name"] == "Igor W. Costa"
