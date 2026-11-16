"""Testes de integração para o endpoint /health, Correlation-ID e RFC 7807."""

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.mark.asyncio
async def test_health_check_returns_200_and_generates_correlation_id() -> None:
    """Deve retornar HTTP 200 com payload tipado e cabeçalho X-Correlation-ID."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    header_corr_id = response.headers.get("X-Correlation-ID")
    assert header_corr_id is not None and len(header_corr_id) > 0

    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "PesquisaMaster API"
    assert payload["correlation_id"] == header_corr_id


@pytest.mark.asyncio
async def test_health_check_propagates_incoming_correlation_id() -> None:
    """Deve preservar o X-Correlation-ID enviado pelo cliente na resposta."""
    custom_corr_id = "corr-tse-2026-audit-0001"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health", headers={"X-Correlation-ID": custom_corr_id})

    assert response.status_code == 200
    assert response.headers["X-Correlation-ID"] == custom_corr_id
    assert response.json()["correlation_id"] == custom_corr_id


@pytest.mark.asyncio
async def test_domain_error_returns_rfc7807_problem_details() -> None:
    """Deve formatar exceções de negócio seguindo estritamente a RFC 7807."""
    custom_corr_id = "corr-rfc7807-check-999"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/api/v1/diagnostics/domain-error",
            headers={"X-Correlation-ID": custom_corr_id},
        )

    assert response.status_code == 422
    assert "application/problem+json" in response.headers.get("content-type", "")
    body = response.json()
    assert body["type"] == "https://pesquisamaster.local/errors/domain-error"
    assert body["title"] == "Erro de Regra de Negócio"
    assert body["status"] == 422
    assert body["instance"] == "/api/v1/diagnostics/domain-error"
    assert body["correlation_id"] == custom_corr_id
