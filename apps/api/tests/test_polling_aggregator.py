"""Testes de integração para o Agregador de Pesquisas Eleitorais (Polling Aggregator)."""

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


@pytest.mark.asyncio
async def test_polling_aggregator_weighted_moving_average_and_house_effects(
    db_session: AsyncSession,
) -> None:
    """Cadastra institutos e pesquisas e calcula média móvel ponderada e House Effects."""
    _, analyst_token = await _create_operator(
        db_session, email="analyst@pesquisamaster.org", role=UserRole.ANALYST
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        headers = {"Authorization": f"Bearer {analyst_token}"}

        # 1. Instituto A: peso 1.0, sem viés de casa (house_effect = 0.0)
        inst_a_res = await client.post(
            "/api/v1/aggregator/institutes",
            headers=headers,
            json={
                "name": "Instituto DataVoto",
                "cnpj": "11111111000199",
                "methodological_weight": "1.0000",
                "house_effect_adjustment": "0.0000",
            },
        )
        assert inst_a_res.status_code == 201
        inst_a_id = inst_a_res.json()["id"]

        # 2. Instituto B: peso 1.0, com viés histórico de +2.0 pontos (house_effect = +2.0000)
        inst_b_res = await client.post(
            "/api/v1/aggregator/institutes",
            headers=headers,
            json={
                "name": "Instituto OpiniaoBrasil",
                "cnpj": "22222222000199",
                "methodological_weight": "1.0000",
                "house_effect_adjustment": "2.0000",
            },
        )
        assert inst_b_res.status_code == 201
        inst_b_id = inst_b_res.json()["id"]

        # 3. Pesquisa recente Instituto A (N=4000 -> sqrt(4)=2.0, data=2026-10-28): CAND_A=44%
        poll1 = await client.post(
            "/api/v1/aggregator/polls",
            headers=headers,
            json={
                "institute_id": inst_a_id,
                "tse_protocol_number": "BR-00101/2026",
                "field_median_date": "2026-10-28",
                "sample_size": 4000,
                "margin_of_error": "1.5000",
                "candidate_results": {"CAND_A": "44.0000", "CAND_B": "36.0000"},
            },
        )
        assert poll1.status_code == 201

        # 4. Pesquisa antiga do Instituto B (N=1000 -> sqrt(1) = 1.0, 14 dias antes: 2026-10-14)
        # Nominal CAND_A = 40%, mas com house_effect de +2.0 -> ajustado = 38.0%
        poll2 = await client.post(
            "/api/v1/aggregator/polls",
            headers=headers,
            json={
                "institute_id": inst_b_id,
                "tse_protocol_number": "BR-00102/2026",
                "field_median_date": "2026-10-14",
                "sample_size": 1000,
                "margin_of_error": "3.0000",
                "candidate_results": {"CAND_A": "40.0000", "CAND_B": "38.0000"},
            },
        )
        assert poll2.status_code == 201

        # 5. Calcula Média Móvel Ponderada em 2026-10-28 com half_life = 14 dias:
        # Poll 1: w_sample = 2.0, days=0 -> w_decay = 1.0 -> W1 = 2.0 (CAND_A = 44%)
        # Poll 2: w_sample = 1.0, days=14 -> w_decay = 0.5 -> W2 = 0.5 (CAND_A ajustado = 38%)
        # Média esperada de CAND_A = (44 * 2.0 + 38 * 0.5) / 2.5 = 107 / 2.5 = 42.8000%!
        avg_res = await client.get(
            "/api/v1/aggregator/average?reference_date=2026-10-28&half_life_days=14.0000",
            headers=headers,
        )
        assert avg_res.status_code == 200
        avg_body = avg_res.json()
        assert avg_body["polls_included"] == 2
        assert avg_body["total_combined_sample"] == 5000

        cands = {c["candidate_code"]: c for c in avg_body["candidates"]}
        cand_a_avg = Decimal(cands["CAND_A"]["weighted_average_pct"])
        assert abs(cand_a_avg - Decimal("42.8000")) <= Decimal("0.0100")
        assert Decimal(cands["CAND_A"]["confidence_band_low"]) < cand_a_avg
        assert Decimal(cands["CAND_A"]["confidence_band_high"]) > cand_a_avg
