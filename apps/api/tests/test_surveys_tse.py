"""Testes de integração para Pesquisas Eleitorais TSE (PesqEle) e travamento de status."""

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


def _valid_survey_payload(**overrides: Any) -> dict[str, Any]:
    """Gera payload padrão válido para registro de pesquisa municipal TSE."""
    base: dict[str, Any] = {
        "tse_protocol_number": "SP-01234/2026",
        "title": "Pesquisa Intenção de Voto Prefeito São Paulo - Outubro/2026",
        "election_sphere": "MUNICIPAL",
        "target_uf": "SP",
        "target_municipality_ibge": "3550308",
        "contracting_entity_doc": "12345678000199",
        "statistician_conre": "CONRE-3 9876-A",
        "planned_sample_size": 1500,
        "confidence_level": "95.0000",
        "margin_of_error": "2.5000",
        "field_start_at": "2026-10-30T08:00:00Z",
        "field_end_at": "2026-11-02T18:00:00Z",
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_statistician_creates_updates_and_locks_survey_lifecycle(
    db_session: AsyncSession,
) -> None:
    """Estatístico deve criar pesquisa em DRAFT, editar em DRAFT, avançar status e travar edição."""
    _, stat_token = await _create_operator(
        db_session, email="estatistico@pesquisamaster.org", role=UserRole.STATISTICIAN
    )
    _, auditor_token = await _create_operator(
        db_session, email="auditor@pesquisamaster.org", role=UserRole.AUDITOR
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        headers = {"Authorization": f"Bearer {stat_token}"}

        # 1. Criação em status DRAFT
        create_res = await client.post(
            "/api/v1/surveys",
            headers=headers,
            json=_valid_survey_payload(),
        )
        assert create_res.status_code == 201
        survey = create_res.json()
        survey_id = survey["id"]
        assert survey["status"] == "DRAFT"
        assert survey["confidence_level"] == "95.0000"
        assert survey["margin_of_error"] == "2.5000"

        # 2. Protocolo TSE duplicado deve retornar 409 Conflict RFC 7807
        dup_res = await client.post(
            "/api/v1/surveys",
            headers=headers,
            json=_valid_survey_payload(),
        )
        assert dup_res.status_code == 409

        # 3. Edição enquanto em status DRAFT deve ser permitida (200)
        patch_res = await client.patch(
            f"/api/v1/surveys/{survey_id}",
            headers=headers,
            json={"planned_sample_size": 2000, "margin_of_error": "2.2000"},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["planned_sample_size"] == 2000
        assert patch_res.json()["margin_of_error"] == "2.2000"

        # 4. Transição DRAFT -> ACTIVE_FIELD
        to_active_res = await client.post(
            f"/api/v1/surveys/{survey_id}/status",
            headers=headers,
            json={"target_status": "ACTIVE_FIELD"},
        )
        assert to_active_res.status_code == 200
        assert to_active_res.json()["status"] == "ACTIVE_FIELD"

        # 5. Tentativa de edição após entrar em ACTIVE_FIELD deve ser bloqueada (409 Conflict)
        locked_patch_res = await client.patch(
            f"/api/v1/surveys/{survey_id}",
            headers=headers,
            json={"planned_sample_size": 500},
        )
        assert locked_patch_res.status_code == 409
        assert "travadas" in locked_patch_res.json()["detail"]

        # 6. Tentativa de regressão de status ACTIVE_FIELD -> DRAFT deve ser bloqueada (409)
        invalid_transition = await client.post(
            f"/api/v1/surveys/{survey_id}/status",
            headers=headers,
            json={"target_status": "DRAFT"},
        )
        assert invalid_transition.status_code == 409

        # 7. Avanço até CLOSED e PUBLISHED
        to_closed = await client.post(
            f"/api/v1/surveys/{survey_id}/status",
            headers=headers,
            json={"target_status": "CLOSED"},
        )
        assert to_closed.status_code == 200
        to_published = await client.post(
            f"/api/v1/surveys/{survey_id}/status",
            headers=headers,
            json={"target_status": "PUBLISHED"},
        )
        assert to_published.status_code == 200
        assert to_published.json()["status"] == "PUBLISHED"

        # 8. Verifica se toda a trilha de auditoria SHA-256 permanece íntegra
        verify_res = await client.get(
            "/api/v1/audit/verify-chain",
            headers={"Authorization": f"Bearer {auditor_token}"},
        )
        assert verify_res.status_code == 200
        assert verify_res.json()["is_valid"] is True
        assert verify_res.json()["checked_records"] == 5


@pytest.mark.asyncio
async def test_survey_tse_validation_and_rbac_restrictions(
    db_session: AsyncSession,
) -> None:
    """Valida regras de contrato TSE (código IBGE municipal, datas) e bloqueio RBAC."""
    _, stat_token = await _create_operator(
        db_session, email="stat2@pesquisamaster.org", role=UserRole.STATISTICIAN
    )
    _, supervisor_token = await _create_operator(
        db_session, email="sup@pesquisamaster.org", role=UserRole.SUPERVISOR
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Pesquisa MUNICIPAL sem código IBGE deve falhar com 422 RFC 7807
        missing_ibge_res = await client.post(
            "/api/v1/surveys",
            headers={"Authorization": f"Bearer {stat_token}"},
            json=_valid_survey_payload(target_municipality_ibge=None),
        )
        assert missing_ibge_res.status_code == 422

        # 2. Data final anterior à inicial deve falhar com 422 RFC 7807
        bad_dates_res = await client.post(
            "/api/v1/surveys",
            headers={"Authorization": f"Bearer {stat_token}"},
            json=_valid_survey_payload(
                tse_protocol_number="SP-99999/2026",
                field_start_at="2026-11-05T10:00:00Z",
                field_end_at="2026-11-01T10:00:00Z",
            ),
        )
        assert bad_dates_res.status_code == 422

        # 3. SUPERVISOR não pode criar pesquisa (exclusivo ADMIN ou STATISTICIAN -> 403)
        forbidden_res = await client.post(
            "/api/v1/surveys",
            headers={"Authorization": f"Bearer {supervisor_token}"},
            json=_valid_survey_payload(tse_protocol_number="RJ-00001/2026"),
        )
        assert forbidden_res.status_code == 403
