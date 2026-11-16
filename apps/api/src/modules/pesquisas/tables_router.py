"""Rotas para tabelas auxiliares do banco 'pesquisas' (Catálogo, Amostragem, Campo, Auditoria)."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session

tables_router = APIRouter(prefix="/pesquisas-tabelas", tags=["Tabelas do Banco Pesquisas"])
DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]


@tables_router.get("/candidatos", summary="Lista candidatos e marcas (candidatos_produtos)")
async def list_candidatos(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text("SELECT * FROM candidatos_produtos ORDER BY id_candidato_produto ASC LIMIT :lim")
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/estados", summary="Lista unidades federativas (estados)")
async def list_estados(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT id_estado, codigo_ibge, sigla, nome, regiao, populacao_total, eleitorado_total "
        "FROM estados ORDER BY id_estado ASC LIMIT :lim"
    )
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/perguntas", summary="Lista banco de perguntas (perguntas)")
async def list_perguntas(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT p.*, g.nome_grupo, g.tipo_escala FROM perguntas p "
        "LEFT JOIN grupos_opcoes g ON p.id_grupo_opcao = g.id_grupo_opcao "
        "ORDER BY p.id_pergunta ASC LIMIT :lim"
    )
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/pessoas", summary="Lista eleitores/respondentes (pessoas)")
async def list_pessoas(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text("SELECT * FROM pessoas ORDER BY id_pessoa ASC LIMIT :lim")
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/sessoes-campo", summary="Lista sessões de campo (questionarios_pessoas)")
async def list_sessoes_campo(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT qp.*, pesq.nome AS pesquisa_nome, p.nome AS pessoa_nome, "
        "prof.nome AS pesquisador_nome FROM questionarios_pessoas qp "
        "LEFT JOIN pesquisas pesq ON qp.id_pesquisa = pesq.id_pesquisa "
        "LEFT JOIN pessoas p ON qp.id_pessoa = p.id_pessoa "
        "LEFT JOIN profissionais prof ON qp.id_pesquisador = prof.id_profissional "
        "ORDER BY qp.id_questionario_pessoa DESC LIMIT :lim"
    )
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/respostas", summary="Lista respostas coletadas (respostas)")
async def list_respostas(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT r.*, c.nome_urna_comercial, op.rotulo AS opcao_rotulo FROM respostas r "
        "LEFT JOIN candidatos_produtos c ON r.id_candidato_produto = c.id_candidato_produto "
        "LEFT JOIN opcoes_resposta op ON r.id_opcao = op.id_opcao "
        "ORDER BY r.id_resposta DESC LIMIT :lim"
    )
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/demografia", summary="Lista dados demográficos (demografia_ibge)")
async def list_demografia(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT d.*, m.nome AS municipio_nome, b.nome_bairro FROM demografia_ibge d "
        "LEFT JOIN municipios m ON d.id_municipio = m.id_municipio "
        "LEFT JOIN bairros_ibge b ON d.id_bairro = b.id_bairro "
        "ORDER BY d.id_demografia ASC LIMIT :lim"
    )
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/eleitorado", summary="Lista histórico do eleitorado (eleitorado_tse)")
async def list_eleitorado(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT e.*, m.nome AS municipio_nome FROM eleitorado_tse e "
        "LEFT JOIN municipios m ON e.id_municipio = m.id_municipio "
        "ORDER BY e.ano_referencia DESC, e.mes_referencia DESC LIMIT :lim"
    )
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/atribuicoes", summary="Lista distribuição de metas (atribuicao_pesquisadores)")
async def list_atribuicoes(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT a.*, p.nome AS pesquisa_nome, prof.nome AS pesquisador_nome, b.nome_bairro "
        "FROM atribuicao_pesquisadores a "
        "LEFT JOIN pesquisas p ON a.id_pesquisa = p.id_pesquisa "
        "LEFT JOIN profissionais prof ON a.id_profissional = prof.id_profissional "
        "LEFT JOIN bairros_ibge b ON a.id_bairro = b.id_bairro "
        "ORDER BY a.id_atribuicao DESC LIMIT :lim"
    )
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/historico-desbloqueios", summary="Lista histórico de desbloqueios master")
async def list_desbloqueios(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT h.*, p.nome AS pesquisa_nome, u.nome AS usuario_master_nome "
        "FROM historico_desbloqueio_pesquisas h "
        "LEFT JOIN pesquisas p ON h.id_pesquisa = p.id_pesquisa "
        "LEFT JOIN usuarios u ON h.id_usuario_master = u.id_usuario "
        "ORDER BY h.id_historico_desbloqueio DESC LIMIT :lim"
    )
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/historico-reatribuicoes", summary="Histórico de reatribuição de entrevistas")
async def list_reatribuicoes(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT hr.*, p1.nome AS pesquisador_anterior_nome, p2.nome AS pesquisador_novo_nome, "
        "u.nome AS autorizador_nome FROM historico_reatribuicao_questionarios hr "
        "LEFT JOIN profissionais p1 ON hr.id_pesquisador_anterior = p1.id_profissional "
        "LEFT JOIN profissionais p2 ON hr.id_pesquisador_novo = p2.id_profissional "
        "LEFT JOIN usuarios u ON hr.id_usuario_autorizador = u.id_usuario "
        "ORDER BY hr.id_historico_reatribuicao DESC LIMIT :lim"
    )
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/dimensoes", summary="Lista variáveis de controle (amostras_dimensao)")
async def list_dimensoes(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT ad.*, a.descricao AS amostra_descricao FROM amostras_dimensao ad "
        "LEFT JOIN amostras a ON ad.id_amostra = a.id_amostra "
        "ORDER BY ad.ordem_exibicao ASC LIMIT :lim"
    )
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/escalas", summary="Lista réguas e escalas (grupos_opcoes)")
async def list_escalas(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT g.*, COUNT(o.id_opcao) AS total_opcoes FROM grupos_opcoes g "
        "LEFT JOIN opcoes_resposta o ON g.id_grupo_opcao = o.id_grupo_opcao "
        "GROUP BY g.id_grupo_opcao ORDER BY g.id_grupo_opcao ASC LIMIT :lim"
    )
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/opcoes-resposta", summary="Lista alternativas de resposta (opcoes_resposta)")
async def list_opcoes_resposta(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT o.*, g.nome_grupo FROM opcoes_resposta o "
        "LEFT JOIN grupos_opcoes g ON o.id_grupo_opcao = g.id_grupo_opcao "
        "ORDER BY o.id_grupo_opcao ASC, o.ordem_exibicao ASC LIMIT :lim"
    )
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/itens-bateria", summary="Lista subitens de bateria (itens_bateria)")
async def list_itens_bateria(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT ib.*, p.texto_pergunta FROM itens_bateria ib "
        "LEFT JOIN perguntas p ON ib.id_pergunta = p.id_pergunta "
        "ORDER BY ib.id_pergunta ASC, ib.ordem ASC LIMIT :lim"
    )
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/transferencias", summary="Lista repasse de metas (transferencias_atribuicao)")
async def list_transferencias(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT t.*, p.nome AS pesquisa_nome, p1.nome AS pesquisador_origem_nome, "
        "p2.nome AS pesquisador_destino_nome FROM transferencias_atribuicao t "
        "LEFT JOIN pesquisas p ON t.id_pesquisa = p.id_pesquisa "
        "LEFT JOIN profissionais p1 ON t.id_pesquisador_origem = p1.id_profissional "
        "LEFT JOIN profissionais p2 ON t.id_pesquisador_destino = p2.id_profissional "
        "ORDER BY t.id_transferencia DESC LIMIT :lim"
    )
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/cenario-candidatos", summary="Lista candidatos do cenário")
async def list_cenario_candidatos(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT cc.*, cp.nome_urna_comercial, cp.sigla_partido_marca, cp.cargo_categoria "
        "FROM cenario_candidatos cc "
        "LEFT JOIN candidatos_produtos cp ON cc.id_candidato_produto = cp.id_candidato_produto "
        "ORDER BY cc.id_cenario ASC, cc.ordem_apresentacao ASC LIMIT :lim"
    )
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/relatorios-tabulacao", summary="Lista relatórios salvos")
async def list_relatorios_tabulacao(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT rt.*, p.nome AS pesquisa_nome, u.nome AS usuario_nome FROM relatorios_tabulacao rt "
        "LEFT JOIN pesquisas p ON rt.id_pesquisa = p.id_pesquisa "
        "LEFT JOIN usuarios u ON rt.id_usuario = u.id_usuario "
        "ORDER BY rt.id_relatorio DESC LIMIT :lim"
    )
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]
