"""Testes de integração para Auditoria Imutável (`security_audit_logs` Hash-Chain SHA-256)."""

from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.core.database import Base, get_db_session
from src.core.security import UserRole, create_access_token, hash_password
from src.main import app
from src.modules.audit.models import GENESIS_PREV_HASH, SecurityAuditLogModel
from src.modules.audit.schemas import AuditLogCreateSchema
from src.modules.audit.service import AuditService
from src.modules.auth.models import UserModel


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Cria banco SQLite em memória isolado com tabelas `users` e `security_audit_logs`."""
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


@pytest.mark.asyncio
async def test_audit_hash_chain_links_sequential_events_and_verifies_ok(
    db_session: AsyncSession,
) -> None:
    """Eventos sequenciais devem encadear prev_hash == record_hash anterior e validar 100%."""
    auditor, auditor_token = await _create_operator(
        db_session, email="auditor@pesquisamaster.org", role=UserRole.AUDITOR
    )

    audit_service = AuditService(db_session)
    first = await audit_service.record_event(
        AuditLogCreateSchema(
            actor_user_id=auditor.id,
            module="surveys",
            action="SURVEY_CREATED",
            payload_diff={"tse_protocol": "BR-01234/2026", "sample_size": 2000},
            correlation_id="corr-chain-001",
        ),
        auto_commit=True,
    )
    second = await audit_service.record_event(
        AuditLogCreateSchema(
            actor_user_id=auditor.id,
            module="surveys",
            action="SURVEY_STATUS_LOCKED",
            payload_diff={"old_status": "DRAFT", "new_status": "ACTIVE_FIELD"},
            correlation_id="corr-chain-002",
        ),
        auto_commit=True,
    )
    third = await audit_service.record_event(
        AuditLogCreateSchema(
            actor_user_id=auditor.id,
            module="fieldwork",
            action="INTERVIEW_PURGED",
            payload_diff={"interview_id": "int-99", "reason": "GPS fora do setor"},
            correlation_id="corr-chain-003",
        ),
        auto_commit=True,
    )

    assert first.prev_hash == GENESIS_PREV_HASH
    assert second.prev_hash == first.record_hash
    assert third.prev_hash == second.record_hash

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        headers = {"Authorization": f"Bearer {auditor_token}"}

        logs_res = await client.get("/api/v1/audit/logs?limit=10&offset=0", headers=headers)
        assert logs_res.status_code == 200
        logs_payload = logs_res.json()
        assert logs_payload["total"] == 3
        assert len(logs_payload["items"]) == 3

        verify_res = await client.get("/api/v1/audit/verify-chain", headers=headers)
        assert verify_res.status_code == 200
        verification = verify_res.json()
        assert verification["is_valid"] is True
        assert verification["checked_records"] == 3
        assert verification["last_record_hash"] == third.record_hash
        assert verification["corrupted_record_id"] is None


@pytest.mark.asyncio
async def test_audit_chain_detects_payload_tampering(
    db_session: AsyncSession,
) -> None:
    """Qualquer adulteração direta no banco em payload_diff deve invalidar a cadeia SHA-256."""
    admin, admin_token = await _create_operator(
        db_session, email="admin@pesquisamaster.org", role=UserRole.ADMIN
    )

    audit_service = AuditService(db_session)
    rec1 = await audit_service.record_event(
        AuditLogCreateSchema(
            actor_user_id=admin.id,
            module="weighting",
            action="RAKING_EXECUTED",
            payload_diff={"deff_kish": "1.1420", "converged": True},
        ),
        auto_commit=True,
    )
    await audit_service.record_event(
        AuditLogCreateSchema(
            actor_user_id=admin.id,
            module="weighting",
            action="TSE_REPORT_EXPORTED",
            payload_diff={"format": "PDF"},
        ),
        auto_commit=True,
    )

    # Simula ataque/adulteração direta no banco de dados alterando o JSON do registro #1
    await db_session.execute(
        update(SecurityAuditLogModel)
        .where(SecurityAuditLogModel.id == rec1.id)
        .values(payload_diff={"deff_kish": "0.5000", "converged": True})
    )
    await db_session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        verify_res = await client.get(
            "/api/v1/audit/verify-chain",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert verify_res.status_code == 200
        body = verify_res.json()
        assert body["is_valid"] is False
        assert body["corrupted_record_id"] == rec1.id
        assert "Adulteração detectada" in body["failure_reason"]


@pytest.mark.asyncio
async def test_audit_endpoints_enforce_auditor_or_admin_rbac(
    db_session: AsyncSession,
) -> None:
    """Perfis como STATISTICIAN, SUPERVISOR ou ANALYST não podem acessar /audit/* (HTTP 403)."""
    _, analyst_token = await _create_operator(
        db_session, email="analyst@pesquisamaster.org", role=UserRole.ANALYST
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res_logs = await client.get(
            "/api/v1/audit/logs",
            headers={"Authorization": f"Bearer {analyst_token}"},
        )
        assert res_logs.status_code == 403

        res_verify = await client.get(
            "/api/v1/audit/verify-chain",
            headers={"Authorization": f"Bearer {analyst_token}"},
        )
        assert res_verify.status_code == 403
