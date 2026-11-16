"""Testes de integração para Coleta em Campo: Sync Idempotente, HMAC, Antifraude e Supervisão."""

from collections.abc import AsyncGenerator
from decimal import Decimal
from typing import Any
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


async def _prepare_active_survey_environment(
    client: AsyncClient, stat_token: str
) -> tuple[UUID, UUID, UUID, UUID]:
    """Cria pesquisa, pergunta, estrato com polígono, célula de cota (meta=1) e ativa o campo."""
    headers = {"Authorization": f"Bearer {stat_token}"}
    s_res = await client.post(
        "/api/v1/surveys",
        headers=headers,
        json={
            "tse_protocol_number": "SP-30303/2026",
            "title": "Pesquisa Coleta Antifraude",
            "election_sphere": "MUNICIPAL",
            "target_uf": "SP",
            "target_municipality_ibge": "3550308",
            "contracting_entity_doc": "12345678000199",
            "statistician_conre": "CONRE-3 3030",
            "planned_sample_size": 50,
            "confidence_level": "95.0000",
            "margin_of_error": "4.0000",
            "field_start_at": "2026-10-30T08:00:00Z",
            "field_end_at": "2026-11-02T18:00:00Z",
        },
    )
    survey_id = UUID(s_res.json()["id"])

    q_res = await client.post(
        f"/api/v1/surveys/{survey_id}/questions",
        headers=headers,
        json={
            "order_index": 1,
            "question_code": "Q1_VOTO",
            "question_type": "STIMULATED_SINGLE",
            "prompt_text": "Em quem você vota?",
            "rotate_options": True,
            "options_schema": [
                {"code": "CAND_A", "label": "Candidato A", "is_fixed": False},
                {"code": "CAND_B", "label": "Candidato B", "is_fixed": False},
            ],
            "skip_logic_rules": [],
        },
    )
    question_id = UUID(q_res.json()["id"])

    # Polígono retangular: lon entre -46.70 e -46.60, lat entre -23.60 e -23.50
    polygon: dict[str, Any] = {
        "type": "Polygon",
        "coordinates": [
            [
                [-46.70, -23.60],
                [-46.60, -23.60],
                [-46.60, -23.50],
                [-46.70, -23.50],
                [-46.70, -23.60],
            ]
        ],
    }
    st_res = await client.post(
        f"/api/v1/surveys/{survey_id}/strata/allocate",
        headers=headers,
        json={
            "strata": [
                {
                    "region_code": "CENTRO_SP",
                    "geographic_name": "Centro Expandido",
                    "population_proportion": "1.0000",
                    "boundary_geom": polygon,
                }
            ]
        },
    )
    stratum_id = UUID(st_res.json()[0]["id"])

    qc_res = await client.post(
        f"/api/v1/surveys/{survey_id}/strata/{stratum_id}/quota-cells/allocate",
        headers=headers,
        json={
            "cells": [
                {
                    "gender": "FEMININO",
                    "age_bracket": "25_44",
                    "education_level": "MEDIO",
                    "income_bracket": "ATE_2_SM",
                    "target_proportion": "1.0000",
                }
            ]
        },
    )
    quota_cell_id = UUID(qc_res.json()[0]["id"])

    await client.post(
        f"/api/v1/surveys/{survey_id}/status",
        headers=headers,
        json={"target_status": "ACTIVE_FIELD"},
    )
    return survey_id, stratum_id, quota_cell_id, question_id


@pytest.mark.asyncio
async def test_batch_sync_idempotency_hmac_geofence_and_supervision_purge(
    db_session: AsyncSession,
) -> None:
    """Testa sync idempotente, HMAC válido/inválido, geofence, tempo mínimo e expurgo."""
    _, stat_token = await _create_operator(
        db_session, email="stat@pesquisamaster.org", role=UserRole.STATISTICIAN
    )
    _, sup_token = await _create_operator(
        db_session, email="sup@pesquisamaster.org", role=UserRole.SUPERVISOR
    )
    researcher, r_token = await _create_operator(
        db_session,
        email="pesq@pesquisamaster.org",
        role=UserRole.RESEARCHER,
        bound_device_id="device-sp-001",
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        (
            survey_id,
            stratum_id,
            quota_cell_id,
            question_id,
        ) = await _prepare_active_survey_environment(client, stat_token)
        r_headers = {
            "Authorization": f"Bearer {r_token}",
            "X-Device-ID": "device-sp-001",
            "Idempotency-Key": "batch-sync-0001",
        }

        # Entrevista 1: VÁLIDA (dentro do polígono: -46.65, -23.55 e duração 120s >= 45s)
        lon1, lat1 = Decimal("-46.6500"), Decimal("-23.5500")
        hmac1 = compute_interview_hmac(
            survey_id=survey_id,
            stratum_id=stratum_id,
            quota_cell_id=quota_cell_id,
            researcher_id=researcher.id,
            client_interview_key="int-valid-01",
            duration_seconds=120,
            lon=lon1,
            lat=lat1,
        )

        # Entrevista 2: FLAGGED (fora do polígono: -46.10, -23.10 e duração curta 20s < 45s)
        lon2, lat2 = Decimal("-46.1000"), Decimal("-23.1000")
        hmac2 = compute_interview_hmac(
            survey_id=survey_id,
            stratum_id=stratum_id,
            quota_cell_id=quota_cell_id,
            researcher_id=researcher.id,
            client_interview_key="int-fraud-02",
            duration_seconds=20,
            lon=lon2,
            lat=lat2,
        )

        batch_payload = {
            "interviews": [
                {
                    "client_interview_key": "int-valid-01",
                    "stratum_id": str(stratum_id),
                    "quota_cell_id": str(quota_cell_id),
                    "capture_point": {"type": "Point", "coordinates": [str(lon1), str(lat1)]},
                    "duration_seconds": 120,
                    "started_at": "2026-10-30T10:00:00Z",
                    "finished_at": "2026-10-30T10:02:00Z",
                    "client_hmac_signature": hmac1,
                    "answers": [
                        {"question_id": str(question_id), "selected_option_code": "CAND_A"}
                    ],
                },
                {
                    "client_interview_key": "int-fraud-02",
                    "stratum_id": str(stratum_id),
                    "quota_cell_id": str(quota_cell_id),
                    "capture_point": {"type": "Point", "coordinates": [str(lon2), str(lat2)]},
                    "duration_seconds": 20,
                    "started_at": "2026-10-30T10:05:00Z",
                    "finished_at": "2026-10-30T10:05:20Z",
                    "client_hmac_signature": hmac2,
                    "answers": [
                        {"question_id": str(question_id), "selected_option_code": "CAND_B"}
                    ],
                },
            ]
        }

        # 1. Primeira sincronização em lote
        sync_res = await client.post(
            f"/api/v1/surveys/{survey_id}/fieldwork/sync-batch",
            headers=r_headers,
            json=batch_payload,
        )
        assert sync_res.status_code == 200
        data = sync_res.json()
        assert data["total_processed"] == 2
        assert data["valid_count"] == 1
        assert data["flagged_count"] == 1

        # 2. Reenvio com o mesmo Idempotency-Key não deve duplicar entrevistas nem incrementar cota
        retry_res = await client.post(
            f"/api/v1/surveys/{survey_id}/fieldwork/sync-batch",
            headers=r_headers,
            json=batch_payload,
        )
        assert retry_res.status_code == 200
        assert retry_res.json()["items"][0]["id"] == data["items"][0]["id"]

        # 3. Assinatura HMAC adulterada deve retornar 403 Forbidden RFC 7807
        bad_hmac_payload = {
            "interviews": [
                {
                    **batch_payload["interviews"][0],
                    "client_interview_key": "int-tampered-99",
                    "client_hmac_signature": "f" * 64,
                }
            ]
        }
        bad_hmac_res = await client.post(
            f"/api/v1/surveys/{survey_id}/fieldwork/sync-batch",
            headers={**r_headers, "Idempotency-Key": "batch-sync-0002"},
            json=bad_hmac_payload,
        )
        assert bad_hmac_res.status_code == 403

        # 4. Supervisor consulta painel de supervisão e expurga a entrevista FLAGGED
        sup_headers = {"Authorization": f"Bearer {sup_token}"}
        flagged_id = data["items"][1]["id"]
        purge_res = await client.post(
            f"/api/v1/surveys/{survey_id}/fieldwork/interviews/{flagged_id}/audit-decision",
            headers=sup_headers,
            json={
                "target_status": "PURGED",
                "reason": "Coleta realizada fora do setor censitário e em 20 segundos.",
            },
        )
        assert purge_res.status_code == 200
        assert purge_res.json()["audit_status"] == "PURGED"

        summary_res = await client.get(
            f"/api/v1/surveys/{survey_id}/fieldwork/supervision/summary",
            headers=sup_headers,
        )
        assert summary_res.status_code == 200
        summary = summary_res.json()
        assert summary["total_synced"] == 2
        assert summary["total_valid"] == 1
        assert summary["total_purged"] == 1
        assert summary["completion_percentage"] == "2.0000"
