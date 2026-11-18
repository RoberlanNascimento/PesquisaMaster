"""Rotas de Operações de Campo: Atribuições, Transferências, Reatribuições, Sessões e Logs."""

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session

campo_operacoes_router = APIRouter(
    prefix="/api/v1/campo-operacoes",
    tags=["Operações de Campo"],
)


class AtribuicaoCreateSchema(BaseModel):
    id_pesquisa: int
    id_profissional: int
    id_bairro: int | None = None
    lote_setor: str
    meta_entrevistas: int = 100
    data_inicio: date | None = None
    data_limite: date | None = None
    status_atribuicao: str = "ativa"
    id_organizacao: int | None = 1


class TransferenciaCreateSchema(BaseModel):
    id_pesquisa: int
    id_atribuicao_origem: int | None = None
    id_atribuicao_destino: int | None = None
    id_pesquisador_origem: int
    id_pesquisador_destino: int
    id_autorizador: int | None = None
    quantidade_transferida: int
    motivo: str
    id_organizacao: int | None = None


class ReatribuicaoCreateSchema(BaseModel):
    id_questionario_pessoa: int | None = None
    id_pesquisador_anterior: int
    id_pesquisador_novo: int
    id_usuario_autorizador: int | None = None
    motivo: str
    id_organizacao: int | None = None


@campo_operacoes_router.get("/dashboard-stats")
async def get_dashboard_stats(
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    res = await session.execute(
        text(
            """
            SELECT
                (SELECT COUNT(*)::int FROM pesquisas) AS total_pesquisas,
                (SELECT COUNT(*)::int FROM municipios) AS total_cidades,
                (SELECT COALESCE(SUM(COALESCE(NULLIF(populacao_total, 0), eleitorado_total, 0)), 0)::bigint FROM municipios) AS populacao_municipios,
                (SELECT COUNT(*)::int FROM questionarios_pessoas) AS entrevistas_realizadas,
                (SELECT COALESCE(SUM(tamanho_amostral), 0)::int FROM amostras) AS entrevistas_planejadas
            """
        )
    )
    row = res.mappings().first() or {}
    realizadas = int(row.get("entrevistas_realizadas") or 0)
    planejadas = int(row.get("entrevistas_planejadas") or 0)

    pesq_res = await session.execute(
        text(
            """
            SELECT p.id_pesquisa, p.nome, p.numero_registro_tse, p.data_inicio, p.data_fim,
                   p.status::text, m.nome AS municipio_nome, e.sigla AS uf,
                   COALESCE(a.tamanho_amostral, 0) AS tamanho_amostral,
                   COALESCE(a.margem_erro, 0) AS margem_erro
            FROM pesquisas p
            LEFT JOIN municipios m ON m.id_municipio = p.id_municipio
            LEFT JOIN estados e ON e.id_estado = m.id_estado
            LEFT JOIN amostras a ON a.id_amostra = p.id_amostra
            ORDER BY p.id_pesquisa DESC
            """
        )
    )
    votos_res = await session.execute(
        text(
            """
            SELECT qp.id_pesquisa,
                   r.id_cenario,
                   COALESCE(cp.identificador, 'Cenário Principal') AS cenario_nome,
                   COALESCE(cp.tipo_cenario, 'estimulado') AS tipo_cenario,
                   COALESCE(c.nome_urna_comercial, 'Branco / Nulo / Não sabe') AS candidato,
                   COALESCE(c.sigla_partido_marca, 'NS/NR') AS partido,
                   COALESCE(c.cor_hex, '#64748b') AS cor_hex,
                   COUNT(*)::int AS votos
            FROM respostas r
            JOIN questionarios_pessoas qp ON qp.id_questionario_pessoa = r.id_questionario_pessoa
            LEFT JOIN cenarios_pesquisa cp ON cp.id_cenario = r.id_cenario
            LEFT JOIN candidatos_produtos c ON c.id_candidato_produto = r.id_candidato_produto
            WHERE r.tipo_registro = 'voto_direto'
            GROUP BY qp.id_pesquisa, r.id_cenario, cp.identificador, cp.tipo_cenario, c.nome_urna_comercial, c.sigla_partido_marca, c.cor_hex
            ORDER BY r.id_cenario ASC NULLS LAST, votos DESC
            """
        )
    )
    rejeicao_res = await session.execute(
        text(
            """
            SELECT qp.id_pesquisa,
                   COALESCE(c.nome_urna_comercial, 'Não rejeita / Não sabe') AS candidato,
                   COALESCE(c.sigla_partido_marca, 'NS/NR') AS partido,
                   COALESCE(c.cor_hex, '#64748b') AS cor_hex,
                   COUNT(*)::int AS votos
            FROM respostas r
            JOIN questionarios_pessoas qp ON qp.id_questionario_pessoa = r.id_questionario_pessoa
            LEFT JOIN candidatos_produtos c ON c.id_candidato_produto = r.id_candidato_produto
            WHERE r.tipo_registro = 'rejeicao'
            GROUP BY qp.id_pesquisa, c.nome_urna_comercial, c.sigla_partido_marca, c.cor_hex
            ORDER BY votos DESC
            """
        )
    )
    rel_res = await session.execute(
        text(
            """
            SELECT id_relatorio, id_pesquisa, titulo_relatorio, configuracao_crosstab, criado_em
            FROM relatorios_tabulacao
            ORDER BY id_relatorio DESC
            """
        )
    )

    return {
        "total_pesquisas": int(row.get("total_pesquisas") or 0),
        "total_cidades": int(row.get("total_cidades") or 0),
        "populacao_municipios": int(row.get("populacao_municipios") or 0),
        "total_entrevistas": realizadas if realizadas > 0 else planejadas,
        "entrevistas_realizadas": realizadas,
        "pesquisas": [dict(r) for r in pesq_res.mappings().all()],
        "resultados_votos": [dict(r) for r in votos_res.mappings().all()],
        "rejeicao_votos": [dict(r) for r in rejeicao_res.mappings().all()],
        "relatorios": [dict(r) for r in rel_res.mappings().all()],
    }


@campo_operacoes_router.get("/resumo-opcoes")
async def get_resumo_opcoes(
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    pesq = await session.execute(
        text(
            """
            SELECT p.id_pesquisa, p.nome, p.status::text, p.id_municipio,
                   COALESCE(a.tamanho_amostral, 0) AS total_entrevistas
            FROM pesquisas p
            LEFT JOIN amostras a ON a.id_amostra = p.id_amostra
            ORDER BY p.id_pesquisa DESC
            """
        )
    )
    quest = await session.execute(
        text("SELECT id_questionario, titulo, id_pesquisa FROM questionarios WHERE ativo = true ORDER BY id_questionario DESC")
    )
    prof = await session.execute(
        text("SELECT id_profissional, nome, tipo_profissional FROM profissionais WHERE ativo = true ORDER BY nome ASC")
    )
    bairros = await session.execute(
        text("SELECT id_bairro, id_municipio, nome_bairro, codigo_bairro_ibge FROM bairros_ibge WHERE ativo = true ORDER BY nome_bairro ASC")
    )
    return {
        "pesquisas": [dict(r) for r in pesq.mappings().all()],
        "questionarios": [dict(r) for r in quest.mappings().all()],
        "profissionais": [dict(r) for r in prof.mappings().all()],
        "bairros": [dict(r) for r in bairros.mappings().all()],
    }


@campo_operacoes_router.get("/atribuicoes")
async def list_atribuicoes(
    session: AsyncSession = Depends(get_db_session),
) -> list[dict[str, Any]]:
    result = await session.execute(
        text(
            """
            SELECT a.id_atribuicao, a.id_pesquisa, a.id_profissional, a.id_bairro,
                   a.lote_setor, a.meta_entrevistas, a.data_inicio, a.data_limite,
                   a.status_atribuicao, a.id_organizacao,
                   p.nome AS profissional_nome,
                   pe.nome AS pesquisa_titulo
            FROM atribuicao_pesquisadores a
            LEFT JOIN profissionais p ON p.id_profissional = a.id_profissional
            LEFT JOIN pesquisas pe ON pe.id_pesquisa = a.id_pesquisa
            ORDER BY a.id_atribuicao DESC
            LIMIT 200
            """
        )
    )
    return [dict(r) for r in result.mappings().all()]


@campo_operacoes_router.post("/atribuicoes", status_code=status.HTTP_201_CREATED)
async def create_atribuicao(
    payload: AtribuicaoCreateSchema,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    existing = await session.execute(
        text(
            """
            SELECT id_atribuicao, id_pesquisa, id_profissional, lote_setor, meta_entrevistas, status_atribuicao
            FROM atribuicao_pesquisadores
            WHERE id_pesquisa = :id_pesquisa AND id_profissional = :id_profissional
            LIMIT 1
            """
        ),
        {"id_pesquisa": payload.id_pesquisa, "id_profissional": payload.id_profissional},
    )
    found = existing.mappings().first()
    if found:
        return dict(found)

    result = await session.execute(
        text(
            """
            INSERT INTO atribuicao_pesquisadores (
                id_pesquisa, id_profissional, id_bairro, lote_setor,
                meta_entrevistas, data_inicio, data_limite, status_atribuicao, id_organizacao
            ) VALUES (
                :id_pesquisa, :id_profissional, :id_bairro, :lote_setor,
                :meta_entrevistas, COALESCE(:data_inicio, CURRENT_DATE), COALESCE(:data_limite, CURRENT_DATE + 30), :status_atribuicao, COALESCE(:id_organizacao, 1)
            )
            RETURNING id_atribuicao, id_pesquisa, id_profissional, lote_setor, meta_entrevistas, status_atribuicao
            """
        ),
        payload.model_dump(),
    )
    await session.commit()
    row = result.mappings().first()
    return dict(row) if row else {}


@campo_operacoes_router.delete("/atribuicoes/{id_atribuicao}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_atribuicao(
    id_atribuicao: int,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    await session.execute(
        text("DELETE FROM atribuicao_pesquisadores WHERE id_atribuicao = :id_atribuicao"),
        {"id_atribuicao": id_atribuicao},
    )
    await session.commit()


@campo_operacoes_router.get("/transferencias")
async def list_transferencias(
    session: AsyncSession = Depends(get_db_session),
) -> list[dict[str, Any]]:
    result = await session.execute(
        text(
            """
            SELECT t.id_transferencia, t.id_pesquisa, t.id_atribuicao_origem,
                   t.id_atribuicao_destino, t.id_pesquisador_origem, t.id_pesquisador_destino,
                   t.quantidade_transferida, t.motivo, t.data_transferencia,
                   po.nome AS origem_nome, pd.nome AS destino_nome
            FROM transferencias_atribuicao t
            LEFT JOIN profissionais po ON po.id_profissional = t.id_pesquisador_origem
            LEFT JOIN profissionais pd ON pd.id_profissional = t.id_pesquisador_destino
            ORDER BY t.id_transferencia DESC
            LIMIT 200
            """
        )
    )
    return [dict(r) for r in result.mappings().all()]


@campo_operacoes_router.post("/transferencias", status_code=status.HTTP_201_CREATED)
async def create_transferencia(
    payload: TransferenciaCreateSchema,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    if payload.id_pesquisador_origem == payload.id_pesquisador_destino:
        raise HTTPException(status_code=400, detail="Origem e destino devem ser diferentes.")
    result = await session.execute(
        text(
            """
            INSERT INTO transferencias_atribuicao (
                id_pesquisa, id_atribuicao_origem, id_atribuicao_destino,
                id_pesquisador_origem, id_pesquisador_destino, id_autorizador,
                quantidade_transferida, motivo, id_organizacao
            ) VALUES (
                :id_pesquisa, :id_atribuicao_origem, :id_atribuicao_destino,
                :id_pesquisador_origem, :id_pesquisador_destino, :id_autorizador,
                :quantidade_transferida, :motivo, :id_organizacao
            )
            RETURNING id_transferencia, id_pesquisa, id_pesquisador_origem, id_pesquisador_destino, quantidade_transferida, motivo, data_transferencia
            """
        ),
        payload.model_dump(),
    )
    await session.commit()
    row = result.mappings().first()
    return dict(row) if row else {}


@campo_operacoes_router.get("/reatribuicoes")
async def list_reatribuicoes(
    session: AsyncSession = Depends(get_db_session),
) -> list[dict[str, Any]]:
    result = await session.execute(
        text(
            """
            SELECT h.id_historico_reatribuicao, h.id_questionario_pessoa,
                   h.id_pesquisador_anterior, h.id_pesquisador_novo,
                   h.motivo, h.data_reatribuicao,
                   pa.nome AS anterior_nome, pn.nome AS novo_nome
            FROM historico_reatribuicao_questionarios h
            LEFT JOIN profissionais pa ON pa.id_profissional = h.id_pesquisador_anterior
            LEFT JOIN profissionais pn ON pn.id_profissional = h.id_pesquisador_novo
            ORDER BY h.id_historico_reatribuicao DESC
            LIMIT 200
            """
        )
    )
    return [dict(r) for r in result.mappings().all()]


@campo_operacoes_router.post("/reatribuicoes", status_code=status.HTTP_201_CREATED)
async def create_reatribuicao(
    payload: ReatribuicaoCreateSchema,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    result = await session.execute(
        text(
            """
            INSERT INTO historico_reatribuicao_questionarios (
                id_questionario_pessoa, id_pesquisador_anterior,
                id_pesquisador_novo, id_usuario_autorizador, motivo, id_organizacao
            ) VALUES (
                :id_questionario_pessoa, :id_pesquisador_anterior,
                :id_pesquisador_novo, :id_usuario_autorizador, :motivo, :id_organizacao
            )
            RETURNING id_historico_reatribuicao, id_questionario_pessoa, id_pesquisador_anterior, id_pesquisador_novo, motivo, data_reatribuicao
            """
        ),
        payload.model_dump(),
    )
    if payload.id_questionario_pessoa is not None:
        await session.execute(
            text(
                "UPDATE questionarios_pessoas SET id_pesquisador = :novo WHERE id_questionario_pessoa = :id_qp"
            ),
            {"novo": payload.id_pesquisador_novo, "id_qp": payload.id_questionario_pessoa},
        )
    await session.commit()
    row = result.mappings().first()
    return dict(row) if row else {}


@campo_operacoes_router.get("/sessoes-profissionais")
async def list_sessoes_profissionais(
    session: AsyncSession = Depends(get_db_session),
) -> list[dict[str, Any]]:
    result = await session.execute(
        text(
            """
            SELECT s.id_sessao::text, s.id_profissional, s.id_usuario,
                   s.ip_origem, s.user_agent, s.expira_em, s.revogado, s.criado_em,
                   p.nome AS profissional_nome
            FROM sessoes_refresh_tokens s
            LEFT JOIN profissionais p ON p.id_profissional = s.id_profissional
            ORDER BY s.criado_em DESC
            LIMIT 200
            """
        )
    )
    return [dict(r) for r in result.mappings().all()]


@campo_operacoes_router.get("/logs-autenticacao")
async def list_logs_autenticacao(
    session: AsyncSession = Depends(get_db_session),
) -> list[dict[str, Any]]:
    result = await session.execute(
        text(
            """
            SELECT l.id_log, l.id_profissional, l.id_usuario, l.email_informado,
                   l.identificador_informado, l.sucesso, l.motivo_falha,
                   l.ip_origem, l.data_evento,
                   p.nome AS profissional_nome
            FROM logs_autenticacao l
            LEFT JOIN profissionais p ON p.id_profissional = l.id_profissional
            ORDER BY l.data_evento DESC
            LIMIT 200
            """
        )
    )
    return [dict(r) for r in result.mappings().all()]

