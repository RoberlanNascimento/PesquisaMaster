"""Testes de integração para Raking (IPF), DEFF de Kish, Tabulação TSE e Crosstabs."""

from collections.abc import AsyncGenerator
from decimal import Decimal
from uuid import UUID

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
from src.modules.analytics.raking import compute_kish_deff
from src.modules.auth.models import UserModel
from src.modules.fieldwork.antifraud import compute_interview_hmac


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


def test_compute_kish_deff_equal_and_unequal_weights() -> None:
    """Pesos iguais devem ter DEFF == 1.0000; pesos desiguais aumentam o DEFF (> 1.0000)."""
    deff_equal, eff_n = compute_kish_deff(
        [Decimal("1.0000"), Decimal("1.0000"), Decimal("1.0000"), Decimal("1.0000")]
    )
    assert deff_equal == Decimal("1.0000")
    assert eff_n == Decimal("4.0000")

    # 2 entrevistas: pesos 0.5 e 1.5 -> soma = 2.0, soma(w^2) = 0.25 + 2.25 = 2.50
    # DEFF = (2 * 2.50) / (2.0^2) = 5.0 / 4.0 = 1.2500
    deff_unequal, eff_n_unequal = compute_kish_deff([Decimal("0.5000"), Decimal("1.5000")])
    assert deff_unequal == Decimal("1.2500")
    assert eff_n_unequal == Decimal("1.6000")


@pytest.mark.asyncio
async def test_raking_ipf_tabulation_crosstabs_and_tse_export_package(
    db_session: AsyncSession,
) -> None:
    """Executa fluxo completo: Coleta -> Raking IPF -> Tabulação TSE -> Crosstab -> Export TSE."""
    _, stat_token = await _create_operator(
        db_session, email="stat@pesquisamaster.org", role=UserRole.STATISTICIAN
    )
    researcher, r_token = await _create_operator(
        db_session,
        email="pesq@pesquisamaster.org",
        role=UserRole.RESEARCHER,
        bound_device_id="tablet-raking-01",
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        stat_headers = {"Authorization": f"Bearer {stat_token}"}

        # 1. Cria pesquisa (N=100)
        s_res = await client.post(
            "/api/v1/surveys",
            headers=stat_headers,
            json={
                "tse_protocol_number": "SP-80808/2026",
                "title": "Pesquisa Ponderação Raking e Tabulação TSE",
                "election_sphere": "MUNICIPAL",
                "target_uf": "SP",
                "target_municipality_ibge": "3550308",
                "contracting_entity_doc": "12345678000199",
                "statistician_conre": "CONRE-3 8080",
                "planned_sample_size": 100,
                "confidence_level": "95.0000",
                "margin_of_error": "3.0000",
                "field_start_at": "2026-10-30T08:00:00Z",
                "field_end_at": "2026-11-02T18:00:00Z",
            },
        )
        survey_id = UUID(s_res.json()["id"])

        # 2. Cria pergunta estimulada (CAND_A, CAND_B e BRANCO_NULO fixo)
        q_res = await client.post(
            f"/api/v1/surveys/{survey_id}/questions",
            headers=stat_headers,
            json={
                "order_index": 1,
                "question_code": "Q1_PREFEITO",
                "question_type": "STIMULATED_SINGLE",
                "prompt_text": "Em quem você vota para Prefeito?",
                "rotate_options": True,
                "options_schema": [
                    {"code": "CAND_A", "label": "Candidato Alfa", "is_fixed": False},
                    {"code": "CAND_B", "label": "Candidato Beta", "is_fixed": False},
                    {"code": "BRANCO_NULO", "label": "Branco / Nulo", "is_fixed": True},
                ],
                "skip_logic_rules": [],
            },
        )
        question_id = UUID(q_res.json()["id"])

        # 3. Aloca estrato e duas células de cota (FEMININO e MASCULINO)
        st_res = await client.post(
            f"/api/v1/surveys/{survey_id}/strata/allocate",
            headers=stat_headers,
            json={
                "strata": [
                    {
                        "region_code": "UNICO",
                        "geographic_name": "Município",
                        "population_proportion": "1.0000",
                    }
                ]
            },
        )
        stratum_id = UUID(st_res.json()[0]["id"])

        qc_res = await client.post(
            f"/api/v1/surveys/{survey_id}/strata/{stratum_id}/quota-cells/allocate",
            headers=stat_headers,
            json={
                "cells": [
                    {
                        "gender": "FEMININO",
                        "age_bracket": "25_44",
                        "education_level": "MEDIO",
                        "income_bracket": "ATE_2_SM",
                        "target_proportion": "0.5000",
                    },
                    {
                        "gender": "MASCULINO",
                        "age_bracket": "25_44",
                        "education_level": "MEDIO",
                        "income_bracket": "ATE_2_SM",
                        "target_proportion": "0.5000",
                    },
                ]
            },
        )
        cells = qc_res.json()
        fem_cell_id = UUID(next(c["id"] for c in cells if c["gender"] == "FEMININO"))
        masc_cell_id = UUID(next(c["id"] for c in cells if c["gender"] == "MASCULINO"))

        await client.post(
            f"/api/v1/surveys/{survey_id}/status",
            headers=stat_headers,
            json={"target_status": "ACTIVE_FIELD"},
        )

        # 4. Coleta 4 entrevistas válidas:
        # - 1 FEMININO votando em CAND_A
        # - 2 MASCULINO votando em CAND_B
        # - 1 MASCULINO votando em BRANCO_NULO
        lon, lat = Decimal("-46.6300"), Decimal("-23.5500")
        raw_interviews = [
            ("interview-0001", fem_cell_id, "CAND_A"),
            ("interview-0002", masc_cell_id, "CAND_B"),
            ("interview-0003", masc_cell_id, "CAND_B"),
            ("interview-0004", masc_cell_id, "BRANCO_NULO"),
        ]
        batch_items = []
        for key, cell_id, vote in raw_interviews:
            sig = compute_interview_hmac(
                survey_id=survey_id,
                stratum_id=stratum_id,
                quota_cell_id=cell_id,
                researcher_id=researcher.id,
                client_interview_key=key,
                duration_seconds=90,
                lon=lon,
                lat=lat,
            )
            batch_items.append(
                {
                    "client_interview_key": key,
                    "stratum_id": str(stratum_id),
                    "quota_cell_id": str(cell_id),
                    "capture_point": {"type": "Point", "coordinates": [str(lon), str(lat)]},
                    "duration_seconds": 90,
                    "started_at": "2026-10-30T10:00:00Z",
                    "finished_at": "2026-10-30T10:01:30Z",
                    "client_hmac_signature": sig,
                    "answers": [{"question_id": str(question_id), "selected_option_code": vote}],
                }
            )

        sync_res = await client.post(
            f"/api/v1/surveys/{survey_id}/fieldwork/sync-batch",
            headers={
                "Authorization": f"Bearer {r_token}",
                "X-Device-ID": "tablet-raking-01",
                "Idempotency-Key": "batch-raking-001",
            },
            json={"interviews": batch_items},
        )
        assert sync_res.status_code == 200
        assert sync_res.json()["valid_count"] == 4

        # 5. Executa Raking IPF para reequilibrar Gênero em 50% FEMININO e 50% MASCULINO
        # Na amostra bruta: 1 FEM (25%) e 3 MASC (75%).
        # Após Raking: FEM terá peso 2.0000 e cada MASC terá peso ~0.6667!
        raking_res = await client.post(
            f"/api/v1/surveys/{survey_id}/analytics/raking",
            headers=stat_headers,
            json={
                "target_margins": {
                    "gender": {
                        "FEMININO": "0.5000",
                        "MASCULINO": "0.5000",
                    }
                }
            },
        )
        assert raking_res.status_code == 200
        raking_body = raking_res.json()
        assert raking_body["converged"] is True
        assert Decimal(raking_body["kish_deff"]) > Decimal("1.0000")

        # 6. Tabula Q1_PREFEITO verificando Votos Totais e Votos Válidos (excluindo BRANCO_NULO)
        tab_res = await client.get(
            f"/api/v1/surveys/{survey_id}/analytics/tabulate/Q1_PREFEITO",
            headers=stat_headers,
        )
        assert tab_res.status_code == 200
        tab_data = tab_res.json()
        opts_by_code = {o["option_code"]: o for o in tab_data["options"]}
        cand_a_pct = Decimal(opts_by_code["CAND_A"]["total_votes_percentage"])
        assert abs(cand_a_pct - Decimal("50.0000")) <= Decimal("0.0100")
        assert opts_by_code["BRANCO_NULO"]["valid_votes_percentage"] is None

        # 7. Gera Crosstab por gender
        ct_res = await client.get(
            f"/api/v1/surveys/{survey_id}/analytics/crosstabs/Q1_PREFEITO?dimension=gender",
            headers=stat_headers,
        )
        assert ct_res.status_code == 200
        assert ct_res.json()["demographic_dimension"] == "gender"

        # 8. Exporta Pacote Oficial TSE com assinatura SHA-256
        export_res = await client.get(
            f"/api/v1/surveys/{survey_id}/analytics/export-tse-package",
            headers=stat_headers,
        )
        assert export_res.status_code == 200
        pkg = export_res.json()
        assert pkg["tse_protocol_number"] == "SP-80808/2026"
        assert len(pkg["integrity_sha256_digest"]) == 64
