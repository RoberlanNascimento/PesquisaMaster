"""Testes de integração para o Motor de Questionários Dinâmicos (Rodízio de Disco e Skip Logic)."""

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


async def _create_draft_survey(client: AsyncClient, token: str) -> str:
    """Auxiliar para criar pesquisa em status DRAFT e retornar o survey_id."""
    res = await client.post(
        "/api/v1/surveys",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "tse_protocol_number": "SP-11223/2026",
            "title": "Pesquisa Eleitoral Questionário Dinâmico",
            "election_sphere": "MUNICIPAL",
            "target_uf": "SP",
            "target_municipality_ibge": "3550308",
            "contracting_entity_doc": "12345678000199",
            "statistician_conre": "CONRE-3 1234",
            "planned_sample_size": 1000,
            "confidence_level": "95.0000",
            "margin_of_error": "3.0000",
            "field_start_at": "2026-10-30T08:00:00Z",
            "field_end_at": "2026-11-02T18:00:00Z",
        },
    )
    assert res.status_code == 201
    return str(res.json()["id"])


@pytest.mark.asyncio
async def test_questionnaire_ballot_disc_rotation_and_skip_logic_evaluation(
    db_session: AsyncSession,
) -> None:
    """Deve cadastrar perguntas, rotacionar disco de opções e avaliar skip logic."""
    _, stat_token = await _create_operator(
        db_session, email="stat@pesquisamaster.org", role=UserRole.STATISTICIAN
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        headers = {"Authorization": f"Bearer {stat_token}"}
        survey_id = await _create_draft_survey(client, stat_token)

        # Q1: Pergunta Espontânea
        q1_res = await client.post(
            f"/api/v1/surveys/{survey_id}/questions",
            headers=headers,
            json={
                "order_index": 1,
                "question_code": "Q1_ESPONTANEA",
                "question_type": "SPONTANEOUS",
                "prompt_text": "Em quem você votaria para Prefeito hoje? (Espontânea)",
                "rotate_options": False,
                "options_schema": [],
                "skip_logic_rules": [],
            },
        )
        assert q1_res.status_code == 201

        # Q2: Pergunta Estimulada com Rodízio de Disco e Skip Logic (se Branco/Nulo -> pula Q3)
        stimulated_options: list[dict[str, Any]] = [
            {"code": "CAND_A", "label": "Candidato Alfa", "is_fixed": False},
            {"code": "CAND_B", "label": "Candidato Beta", "is_fixed": False},
            {"code": "CAND_C", "label": "Candidato Gama", "is_fixed": False},
            {"code": "BRANCO_NULO", "label": "Branco / Nulo", "is_fixed": True},
            {"code": "NS_NR", "label": "Não Sabe / Não Respondeu", "is_fixed": True},
        ]
        q2_res = await client.post(
            f"/api/v1/surveys/{survey_id}/questions",
            headers=headers,
            json={
                "order_index": 2,
                "question_code": "Q2_ESTIMULADA",
                "question_type": "STIMULATED_SINGLE",
                "prompt_text": "Dentre estes nomes do disco, em quem você votaria?",
                "rotate_options": True,
                "options_schema": stimulated_options,
                "skip_logic_rules": [
                    {
                        "when_option_code": "BRANCO_NULO",
                        "goto_question_code": "Q4_AVALIACAO",
                    }
                ],
            },
        )
        assert q2_res.status_code == 201

        # Q3: Pergunta de Rejeição Múltipla
        q3_res = await client.post(
            f"/api/v1/surveys/{survey_id}/questions",
            headers=headers,
            json={
                "order_index": 3,
                "question_code": "Q3_REJEICAO",
                "question_type": "REJECTION",
                "prompt_text": "Em quais destes candidatos você NÃO votaria de jeito nenhum?",
                "rotate_options": True,
                "options_schema": stimulated_options,
                "skip_logic_rules": [],
            },
        )
        assert q3_res.status_code == 201

        # Q4: Pergunta final
        q4_res = await client.post(
            f"/api/v1/surveys/{survey_id}/questions",
            headers=headers,
            json={
                "order_index": 4,
                "question_code": "Q4_AVALIACAO",
                "question_type": "STIMULATED_SINGLE",
                "prompt_text": "Como você avalia a atual gestão municipal?",
                "rotate_options": False,
                "options_schema": [
                    {"code": "OTIMO_BOM", "label": "Ótimo / Bom", "is_fixed": False},
                    {"code": "REGULAR", "label": "Regular", "is_fixed": False},
                    {"code": "RUIM_PESSIMO", "label": "Ruim / Péssimo", "is_fixed": False},
                ],
                "skip_logic_rules": [],
            },
        )
        assert q4_res.status_code == 201

        # Valida Rodízio de Disco determinístico com rotation_seed:
        # Candidatos (não-fixos) devem rotacionar, enquanto BRANCO_NULO e NS_NR permanecem no final!
        rotated_list = await client.get(
            f"/api/v1/surveys/{survey_id}/questions?rotation_seed=entrevista-001",
            headers=headers,
        )
        assert rotated_list.status_code == 200
        q2_rendered = rotated_list.json()["items"][1]
        rendered_codes = [opt["code"] for opt in q2_rendered["options_schema"]]
        assert rendered_codes[-2:] == ["BRANCO_NULO", "NS_NR"]
        assert rendered_codes[:3] != ["CAND_A", "CAND_B", "CAND_C"]
        assert set(rendered_codes[:3]) == {"CAND_A", "CAND_B", "CAND_C"}

        # Valida Skip Logic: se escolher CAND_A em Q2 -> segue fluxo normal para Q3_REJEICAO
        normal_step = await client.post(
            f"/api/v1/surveys/{survey_id}/questions/evaluate-skip",
            headers=headers,
            json={
                "current_question_code": "Q2_ESTIMULADA",
                "selected_option_code": "CAND_A",
            },
        )
        assert normal_step.status_code == 200
        assert normal_step.json()["next_question_code"] == "Q3_REJEICAO"
        assert normal_step.json()["is_skip_triggered"] is False

        # Valida Skip Logic: se escolher BRANCO_NULO em Q2 -> salta Q3 para Q4_AVALIACAO
        skip_step = await client.post(
            f"/api/v1/surveys/{survey_id}/questions/evaluate-skip",
            headers=headers,
            json={
                "current_question_code": "Q2_ESTIMULADA",
                "selected_option_code": "BRANCO_NULO",
            },
        )
        assert skip_step.status_code == 200
        assert skip_step.json()["next_question_code"] == "Q4_AVALIACAO"
        assert skip_step.json()["is_skip_triggered"] is True
        assert skip_step.json()["ends_interview"] is False


@pytest.mark.asyncio
async def test_questionnaire_validation_and_lock_when_survey_active(
    db_session: AsyncSession,
) -> None:
    """Deve rejeitar espontânea com rodízio e bloquear perguntas após entrar em campo."""
    _, stat_token = await _create_operator(
        db_session, email="stat2@pesquisamaster.org", role=UserRole.STATISTICIAN
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        headers = {"Authorization": f"Bearer {stat_token}"}
        survey_id = await _create_draft_survey(client, stat_token)

        # 1. Pergunta espontânea com rotate_options=True deve falhar (422 RFC 7807)
        invalid_spontaneous = await client.post(
            f"/api/v1/surveys/{survey_id}/questions",
            headers=headers,
            json={
                "order_index": 1,
                "question_code": "Q_INVALIDA",
                "question_type": "SPONTANEOUS",
                "prompt_text": "Pergunta espontânea inválida com rodízio",
                "rotate_options": True,
                "options_schema": [],
                "skip_logic_rules": [],
            },
        )
        assert invalid_spontaneous.status_code == 422

        # 2. Avança pesquisa para ACTIVE_FIELD
        lock_res = await client.post(
            f"/api/v1/surveys/{survey_id}/status",
            headers=headers,
            json={"target_status": "ACTIVE_FIELD"},
        )
        assert lock_res.status_code == 200

        # 3. Tentativa de adicionar pergunta após entrar em campo deve retornar 409 Conflict
        locked_question_res = await client.post(
            f"/api/v1/surveys/{survey_id}/questions",
            headers=headers,
            json={
                "order_index": 1,
                "question_code": "Q1_BLOQUEADA",
                "question_type": "SPONTANEOUS",
                "prompt_text": "Em quem você votaria?",
                "rotate_options": False,
                "options_schema": [],
                "skip_logic_rules": [],
            },
        )
        assert locked_question_res.status_code == 409
