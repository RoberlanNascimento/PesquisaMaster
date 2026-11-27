"""Rotas de Operações de Campo: Atribuições, Transferências, Reatribuições, Sessões e Logs."""

import hashlib
from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.modules.pesquisas.tenant_context import (
    TenantContext,
    get_current_user,
    get_tenant_context,
)

campo_operacoes_router = APIRouter(
    prefix="/api/v1/campo-operacoes",
    tags=["Operações de Campo"],
    dependencies=[Depends(get_current_user)],
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
    id_organizacao: int | None = None


class AtribuicaoUpdateSchema(BaseModel):
    id_profissional: int | None = None
    id_bairro: int | None = None
    lote_setor: str | None = None
    meta_entrevistas: int | None = None
    data_inicio: date | None = None
    data_limite: date | None = None
    status_atribuicao: str | None = None


class AuditoriaStatusUpdateSchema(BaseModel):
    status_auditoria: str


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
    tenant: TenantContext = Depends(get_tenant_context),
) -> dict[str, Any]:
    tid = tenant.tenant_id
    res = await session.execute(
        text(
            """
            SELECT
                (SELECT COUNT(*)::int FROM pesq_pesquisas WHERE id_organizacao = :tid) AS total_pesquisas,
                (SELECT COUNT(*)::int FROM geo_municipios) AS total_cidades,
                (SELECT COALESCE(SUM(COALESCE(NULLIF(populacao_total, 0), eleitorado_total, 0)), 0)::bigint FROM geo_municipios) AS populacao_municipios,
                (SELECT COUNT(*)::int FROM campo_questionarios_pessoas WHERE id_organizacao = :tid) AS entrevistas_realizadas,
                (SELECT COALESCE(SUM(tamanho_amostral), 0)::int FROM pesq_amostras WHERE id_organizacao = :tid) AS entrevistas_planejadas
            """
        ),
        {"tid": tid},
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
            FROM pesq_pesquisas p
            LEFT JOIN geo_municipios m ON m.id_municipio = p.id_municipio
            LEFT JOIN geo_estados e ON e.id_estado = m.id_estado
            LEFT JOIN pesq_amostras a ON a.id_amostra = p.id_amostra
            WHERE p.id_organizacao = :tid
            ORDER BY p.id_pesquisa DESC
            """
        ),
        {"tid": tid},
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
            FROM campo_respostas r
            JOIN campo_questionarios_pessoas qp ON qp.id_questionario_pessoa = r.id_questionario_pessoa
            LEFT JOIN pesq_cenarios_pesquisa cp ON cp.id_cenario = r.id_cenario
            LEFT JOIN pesq_candidatos_produtos c ON c.id_candidato_produto = r.id_candidato_produto
            WHERE r.tipo_registro = 'voto_direto' AND r.id_organizacao = :tid
            GROUP BY qp.id_pesquisa, r.id_cenario, cp.identificador, cp.tipo_cenario, c.nome_urna_comercial, c.sigla_partido_marca, c.cor_hex
            ORDER BY r.id_cenario ASC NULLS LAST, votos DESC
            """
        ),
        {"tid": tid},
    )
    rejeicao_res = await session.execute(
        text(
            """
            SELECT qp.id_pesquisa,
                   COALESCE(c.nome_urna_comercial, 'Não rejeita / Não sabe') AS candidato,
                   COALESCE(c.sigla_partido_marca, 'NS/NR') AS partido,
                   COALESCE(c.cor_hex, '#64748b') AS cor_hex,
                   COUNT(*)::int AS votos
            FROM campo_respostas r
            JOIN campo_questionarios_pessoas qp ON qp.id_questionario_pessoa = r.id_questionario_pessoa
            LEFT JOIN pesq_candidatos_produtos c ON c.id_candidato_produto = r.id_candidato_produto
            WHERE r.tipo_registro = 'rejeicao' AND r.id_organizacao = :tid
            GROUP BY qp.id_pesquisa, c.nome_urna_comercial, c.sigla_partido_marca, c.cor_hex
            ORDER BY votos DESC
            """
        ),
        {"tid": tid},
    )
    rel_res = await session.execute(
        text(
            """
            SELECT id_relatorio, id_pesquisa, titulo_relatorio, configuracao_crosstab, criado_em
            FROM pesq_relatorios_tabulacao
            WHERE id_organizacao = :tid
            ORDER BY id_relatorio DESC
            """
        ),
        {"tid": tid},
    )
    perg_res = await session.execute(
        text(
            """
            SELECT q.id_pesquisa,
                   qp.id_questionario,
                   qp.id_pergunta,
                   qp.ordem,
                   p.enunciado
            FROM form_questionario_perguntas qp
            JOIN form_questionarios q ON q.id_questionario = qp.id_questionario
            JOIN form_perguntas p ON p.id_pergunta = qp.id_pergunta
            WHERE qp.id_organizacao = :tid
            ORDER BY q.id_pesquisa ASC, qp.ordem ASC
            """
        ),
        {"tid": tid},
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
        "perguntas": [dict(r) for r in perg_res.mappings().all()],
    }


@campo_operacoes_router.get("/resumo-opcoes")
async def get_resumo_opcoes(
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> dict[str, Any]:
    tid = tenant.tenant_id
    pesq = await session.execute(
        text(
            """
            SELECT p.id_pesquisa, p.nome, p.status::text, p.id_municipio,
                   COALESCE(a.tamanho_amostral, 0) AS total_entrevistas
            FROM pesq_pesquisas p
            LEFT JOIN pesq_amostras a ON a.id_amostra = p.id_amostra
            WHERE p.id_organizacao = :tid
            ORDER BY p.id_pesquisa DESC
            """
        ),
        {"tid": tid},
    )
    quest = await session.execute(
        text("SELECT id_questionario, titulo, id_pesquisa FROM form_questionarios WHERE ativo = true AND id_organizacao = :tid ORDER BY id_questionario DESC"),
        {"tid": tid},
    )
    prof = await session.execute(
        text("SELECT id_profissional, nome, tipo_profissional FROM campo_profissionais WHERE ativo = true AND id_organizacao = :tid ORDER BY nome ASC"),
        {"tid": tid},
    )
    bairros = await session.execute(
        text("SELECT id_bairro, id_municipio, nome_bairro, codigo_bairro_ibge FROM geo_bairros_ibge WHERE ativo = true ORDER BY nome_bairro ASC")
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
    tenant: TenantContext = Depends(get_tenant_context),
) -> list[dict[str, Any]]:
    result = await session.execute(
        text(
            """
            SELECT a.id_atribuicao, a.id_pesquisa, a.id_profissional, a.id_bairro,
                   a.lote_setor, a.meta_entrevistas, a.data_inicio, a.data_limite,
                   a.status_atribuicao, a.id_organizacao,
                   p.nome AS profissional_nome,
                   pe.nome AS pesquisa_titulo
            FROM campo_atribuicao_pesquisadores a
            LEFT JOIN campo_profissionais p ON p.id_profissional = a.id_profissional
            LEFT JOIN pesq_pesquisas pe ON pe.id_pesquisa = a.id_pesquisa
            WHERE a.id_organizacao = :tid
            ORDER BY a.id_atribuicao DESC
            LIMIT 200
            """
        ),
        {"tid": tenant.tenant_id},
    )
    return [dict(r) for r in result.mappings().all()]


@campo_operacoes_router.post("/atribuicoes", status_code=status.HTTP_201_CREATED)
async def create_atribuicao(
    payload: AtribuicaoCreateSchema,
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> dict[str, Any]:
    tid = tenant.tenant_id
    existing = await session.execute(
        text(
            """
            SELECT id_atribuicao, id_pesquisa, id_profissional, lote_setor, meta_entrevistas, status_atribuicao
            FROM campo_atribuicao_pesquisadores
            WHERE id_pesquisa = :id_pesquisa AND id_profissional = :id_profissional AND id_organizacao = :tid
            LIMIT 1
            """
        ),
        {"id_pesquisa": payload.id_pesquisa, "id_profissional": payload.id_profissional, "tid": tid},
    )
    found = existing.mappings().first()
    if found:
        return dict(found)

    data = payload.model_dump()
    data["id_organizacao"] = tid
    result = await session.execute(
        text(
            """
            INSERT INTO campo_atribuicao_pesquisadores (
                id_pesquisa, id_profissional, id_bairro, lote_setor,
                meta_entrevistas, data_inicio, data_limite, status_atribuicao, id_organizacao
            ) VALUES (
                :id_pesquisa, :id_profissional, :id_bairro, :lote_setor,
                :meta_entrevistas, COALESCE(:data_inicio, CURRENT_DATE), COALESCE(:data_limite, CURRENT_DATE + 30), :status_atribuicao, :id_organizacao
            )
            RETURNING id_atribuicao, id_pesquisa, id_profissional, lote_setor, meta_entrevistas, status_atribuicao
            """
        ),
        data,
    )
    await session.commit()
    row = result.mappings().first()
    return dict(row) if row else {}


@campo_operacoes_router.put("/atribuicoes/{id_atribuicao}")
async def update_atribuicao(
    id_atribuicao: int,
    payload: AtribuicaoUpdateSchema,
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> dict[str, Any]:
    existing_res = await session.execute(
        text(
            """
            SELECT * FROM campo_atribuicao_pesquisadores
            WHERE id_atribuicao = :id_atribuicao AND id_organizacao = :tid
            """
        ),
        {"id_atribuicao": id_atribuicao, "tid": tenant.tenant_id},
    )
    existing = existing_res.mappings().first()
    if not existing:
        raise HTTPException(status_code=404, detail="Atribuição não encontrada.")

    fields_set = payload.model_fields_set
    params = {
        "id_atribuicao": id_atribuicao,
        "tid": tenant.tenant_id,
        "id_profissional": (
            payload.id_profissional
            if "id_profissional" in fields_set and payload.id_profissional is not None
            else existing["id_profissional"]
        ),
        "id_bairro": payload.id_bairro if "id_bairro" in fields_set else existing["id_bairro"],
        "lote_setor": (
            payload.lote_setor.strip()
            if "lote_setor" in fields_set and payload.lote_setor is not None
            else existing["lote_setor"]
        ),
        "meta_entrevistas": (
            payload.meta_entrevistas
            if "meta_entrevistas" in fields_set and payload.meta_entrevistas is not None
            else existing["meta_entrevistas"]
        ),
        "data_inicio": (
            payload.data_inicio
            if "data_inicio" in fields_set and payload.data_inicio is not None
            else existing["data_inicio"]
        ),
        "data_limite": (
            payload.data_limite
            if "data_limite" in fields_set and payload.data_limite is not None
            else existing["data_limite"]
        ),
        "status_atribuicao": (
            payload.status_atribuicao.strip()
            if "status_atribuicao" in fields_set and payload.status_atribuicao is not None
            else existing["status_atribuicao"]
        ),
    }
    result = await session.execute(
        text(
            """
            UPDATE campo_atribuicao_pesquisadores
            SET id_profissional = :id_profissional,
                id_bairro = :id_bairro,
                lote_setor = :lote_setor,
                meta_entrevistas = :meta_entrevistas,
                data_inicio = :data_inicio,
                data_limite = :data_limite,
                status_atribuicao = :status_atribuicao
            WHERE id_atribuicao = :id_atribuicao AND id_organizacao = :tid
            RETURNING id_atribuicao, id_pesquisa, id_profissional, id_bairro,
                      lote_setor, meta_entrevistas, data_inicio, data_limite, status_atribuicao
            """
        ),
        params,
    )
    await session.commit()
    row = result.mappings().first()
    return dict(row) if row else {}


@campo_operacoes_router.delete("/atribuicoes/{id_atribuicao}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_atribuicao(
    id_atribuicao: int,
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> None:
    await session.execute(
        text("DELETE FROM campo_atribuicao_pesquisadores WHERE id_atribuicao = :id_atribuicao AND id_organizacao = :tid"),
        {"id_atribuicao": id_atribuicao, "tid": tenant.tenant_id},
    )
    await session.commit()


@campo_operacoes_router.get("/transferencias")
async def list_transferencias(
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> list[dict[str, Any]]:
    result = await session.execute(
        text(
            """
            SELECT t.id_transferencia, t.id_pesquisa, t.id_atribuicao_origem,
                   t.id_atribuicao_destino, t.id_pesquisador_origem, t.id_pesquisador_destino,
                   t.quantidade_transferida, t.motivo, t.data_transferencia,
                   po.nome AS origem_nome, pd.nome AS destino_nome
            FROM campo_transferencias_atribuicao t
            LEFT JOIN campo_profissionais po ON po.id_profissional = t.id_pesquisador_origem
            LEFT JOIN campo_profissionais pd ON pd.id_profissional = t.id_pesquisador_destino
            WHERE t.id_organizacao = :tid
            ORDER BY t.id_transferencia DESC
            LIMIT 200
            """
        ),
        {"tid": tenant.tenant_id},
    )
    return [dict(r) for r in result.mappings().all()]


@campo_operacoes_router.post("/transferencias", status_code=status.HTTP_201_CREATED)
async def create_transferencia(
    payload: TransferenciaCreateSchema,
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> dict[str, Any]:
    if payload.id_pesquisador_origem == payload.id_pesquisador_destino:
        raise HTTPException(status_code=400, detail="Origem e destino devem ser diferentes.")
    if payload.quantidade_transferida <= 0:
        raise HTTPException(status_code=400, detail="A quantidade transferida deve ser maior que zero.")

    tid = tenant.tenant_id
    id_orig_atrib = payload.id_atribuicao_origem
    if id_orig_atrib is None:
        orig_res = await session.execute(
            text(
                """
                SELECT id_atribuicao, meta_entrevistas
                FROM campo_atribuicao_pesquisadores
                WHERE id_pesquisa = :id_pesquisa
                  AND id_profissional = :id_prof
                  AND id_organizacao = :tid
                ORDER BY meta_entrevistas DESC, id_atribuicao ASC
                LIMIT 1
                """
            ),
            {"id_pesquisa": payload.id_pesquisa, "id_prof": payload.id_pesquisador_origem, "tid": tid},
        )
        orig_row = orig_res.mappings().first()
        if orig_row:
            id_orig_atrib = int(orig_row["id_atribuicao"])

    if id_orig_atrib is not None:
        await session.execute(
            text(
                """
                UPDATE campo_atribuicao_pesquisadores
                SET meta_entrevistas = GREATEST(0, COALESCE(meta_entrevistas, 0) - :qtd)
                WHERE id_atribuicao = :id_atrib AND id_organizacao = :tid
                """
            ),
            {"qtd": payload.quantidade_transferida, "id_atrib": id_orig_atrib, "tid": tid},
        )

    id_dest_atrib = payload.id_atribuicao_destino
    if id_dest_atrib is None:
        dest_res = await session.execute(
            text(
                """
                SELECT id_atribuicao
                FROM campo_atribuicao_pesquisadores
                WHERE id_pesquisa = :id_pesquisa
                  AND id_profissional = :id_prof
                  AND id_organizacao = :tid
                ORDER BY id_atribuicao ASC
                LIMIT 1
                """
            ),
            {"id_pesquisa": payload.id_pesquisa, "id_prof": payload.id_pesquisador_destino, "tid": tid},
        )
        dest_row = dest_res.mappings().first()
        if dest_row:
            id_dest_atrib = int(dest_row["id_atribuicao"])

    if id_dest_atrib is not None:
        await session.execute(
            text(
                """
                UPDATE campo_atribuicao_pesquisadores
                SET meta_entrevistas = COALESCE(meta_entrevistas, 0) + :qtd,
                    status_atribuicao = 'ativa'
                WHERE id_atribuicao = :id_atrib AND id_organizacao = :tid
                """
            ),
            {"qtd": payload.quantidade_transferida, "id_atrib": id_dest_atrib, "tid": tid},
        )

    data = payload.model_dump()
    data["id_atribuicao_origem"] = id_orig_atrib
    data["id_atribuicao_destino"] = id_dest_atrib
    data["id_autorizador"] = payload.id_autorizador or tenant.user_id or 1
    data["id_organizacao"] = tid

    result = await session.execute(
        text(
            """
            INSERT INTO campo_transferencias_atribuicao (
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
        data,
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
            FROM campo_historico_reatribuicao_questionarios h
            LEFT JOIN campo_profissionais pa ON pa.id_profissional = h.id_pesquisador_anterior
            LEFT JOIN campo_profissionais pn ON pn.id_profissional = h.id_pesquisador_novo
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
            INSERT INTO campo_historico_reatribuicao_questionarios (
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
                "UPDATE campo_questionarios_pessoas SET id_pesquisador = :novo WHERE id_questionario_pessoa = :id_qp"
            ),
            {"novo": payload.id_pesquisador_novo, "id_qp": payload.id_questionario_pessoa},
        )
    await session.commit()
    row = result.mappings().first()
    return dict(row) if row else {}


@campo_operacoes_router.get("/sessoes-profissionais")
async def list_sessoes_profissionais(
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> list[dict[str, Any]]:
    result = await session.execute(
        text(
            """
            SELECT s.id_sessao::text, s.id_usuario,
                   s.ip_origem, s.user_agent, s.expira_em, s.revogado, s.criado_em,
                   u.nome AS usuario_nome, u.nome AS profissional_nome
            FROM sys_sessoes_refresh_tokens s
            LEFT JOIN sys_usuarios u ON u.id_usuario = s.id_usuario
            WHERE s.id_organizacao = :tid
            ORDER BY s.criado_em DESC
            LIMIT 200
            """
        ),
        {"tid": tenant.tenant_id},
    )
    return [dict(r) for r in result.mappings().all()]


_VALID_AUDITORIA_STATUS = {
    "aprovada",
    "reprovada",
    "pendente",
    "expurgada",
    "suspeita",
    "descartada",
}


@campo_operacoes_router.patch("/sessoes/{id_questionario_pessoa}/auditoria")
async def update_sessao_auditoria(
    id_questionario_pessoa: int,
    payload: AuditoriaStatusUpdateSchema,
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> dict[str, Any]:
    novo_status = (payload.status_auditoria or "").strip().lower()
    if novo_status not in _VALID_AUDITORIA_STATUS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="status_auditoria inválido. Use aprovada, reprovada, pendente ou expurgada.",
        )
    result = await session.execute(
        text(
            """
            UPDATE campo_questionarios_pessoas
            SET status_auditoria = :status_auditoria
            WHERE id_questionario_pessoa = :id_qp
              AND id_organizacao = :tid
            RETURNING id_questionario_pessoa, id_pesquisa, status_auditoria
            """
        ),
        {
            "status_auditoria": novo_status,
            "id_qp": id_questionario_pessoa,
            "tid": tenant.tenant_id,
        },
    )
    await session.commit()
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Sessão de entrevista não encontrada.")
    return dict(row)


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
            FROM sys_logs_autenticacao l
            LEFT JOIN campo_profissionais p ON p.id_profissional = l.id_profissional
            ORDER BY l.data_evento DESC
            LIMIT 200
            """
        )
    )
    return [dict(r) for r in result.mappings().all()]


@campo_operacoes_router.get("/apresentacao-dados/{id_pesquisa}")
async def get_apresentacao_dados_pesquisa(
    id_pesquisa: int,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    """Retorna exclusivamente os dados reais do PostgreSQL para o relatório de apresentação de uma pesquisa."""
    pergs_res = await session.execute(
        text(
            """
            SELECT qp.id_questionario_pergunta,
                   qp.id_questionario,
                   qp.id_pergunta,
                   qp.id_cenario,
                   qp.secao_bloco,
                   cp.identificador AS cenario_nome,
                   cp.tipo_cenario AS cenario_tipo,
                   qp.ordem,
                   p.enunciado,
                   p.tipo_questao
            FROM form_questionario_perguntas qp
            JOIN form_questionarios q ON q.id_questionario = qp.id_questionario
            JOIN form_perguntas p ON p.id_pergunta = qp.id_pergunta
            LEFT JOIN pesq_cenarios_pesquisa cp ON cp.id_cenario = qp.id_cenario
            WHERE q.id_pesquisa = :pid
            ORDER BY COALESCE(qp.id_cenario, 999999) ASC, qp.ordem ASC, qp.id_questionario_pergunta ASC
            """
        ),
        {"pid": id_pesquisa},
    )
    perguntas = [dict(r) for r in pergs_res.mappings().all()]

    resp_res = await session.execute(
        text(
            """
            SELECT r.id_questionario_pergunta,
                   r.id_cenario,
                   r.id_item_bateria,
                   ib.descricao_item AS item_bateria_nome,
                   r.tipo_registro,
                   r.valor_texto,
                   r.id_candidato_produto,
                   c.nome_urna_comercial AS candidato_nome,
                   c.sigla_partido_marca AS partido,
                   c.cor_hex,
                   c.foto_url AS raw_foto_url,
                   o.rotulo AS opcao_texto,
                   r.codigo_especial,
                   COUNT(*)::int AS votos
            FROM campo_respostas r
            JOIN campo_questionarios_pessoas qp ON qp.id_questionario_pessoa = r.id_questionario_pessoa
            LEFT JOIN pesq_candidatos_produtos c ON c.id_candidato_produto = r.id_candidato_produto
            LEFT JOIN form_opcoes_resposta o ON o.id_opcao = r.id_opcao
            LEFT JOIN form_perguntas_itens_bateria ib ON ib.id_item_bateria = r.id_item_bateria
            WHERE qp.id_pesquisa = :pid
            GROUP BY r.id_questionario_pergunta, r.id_cenario, r.id_item_bateria, ib.descricao_item,
                     r.tipo_registro, r.valor_texto,
                     r.id_candidato_produto, c.nome_urna_comercial, c.sigla_partido_marca,
                     c.cor_hex, c.foto_url, o.rotulo, r.codigo_especial
            ORDER BY r.id_questionario_pergunta ASC, r.id_cenario ASC NULLS LAST, r.id_item_bateria ASC NULLS LAST, votos DESC
            """
        ),
        {"pid": id_pesquisa},
    )
    respostas = []
    for row in resp_res.mappings().all():
        item = dict(row)
        raw_foto = item.pop("raw_foto_url", None)
        cid = item.get("id_candidato_produto")
        if cid and isinstance(raw_foto, str) and raw_foto.strip():
            ver = hashlib.md5(raw_foto.encode("utf-8")).hexdigest()[:8]
            item["foto_url"] = f"http://127.0.0.1:8000/api/v1/questionarios-db/candidatos/{cid}/foto?v={ver}"
        else:
            item["foto_url"] = None
        respostas.append(item)

    rel_res = await session.execute(
        text(
            """
            SELECT id_relatorio, id_pesquisa, titulo_relatorio, configuracao_crosstab, criado_em
            FROM pesq_relatorios_tabulacao
            WHERE id_pesquisa = :pid
            ORDER BY id_relatorio DESC
            """
        ),
        {"pid": id_pesquisa},
    )
    relatorios = [dict(r) for r in rel_res.mappings().all()]

    dim_res = await session.execute(
        text(
            """
            SELECT d.id_amostra_dimensao,
                   d.nome_dimensao,
                   d.fonte_dados,
                   d.ordem_exibicao,
                   c.categoria,
                   COALESCE(SUM(c.quantidade_meta), 0)::int AS quantidade_meta,
                   COALESCE(SUM(c.quantidade_coletada), 0)::int AS quantidade_coletada,
                   COALESCE(ROUND(AVG(c.percentual_meta)::numeric, 2), 0)::float AS percentual_meta
            FROM pesq_pesquisas p
            JOIN pesq_amostras_dimensao d ON d.id_amostra = p.id_amostra
            LEFT JOIN pesq_amostras_cotas c ON c.id_amostra_dimensao = d.id_amostra_dimensao
            WHERE p.id_pesquisa = :pid
            GROUP BY d.id_amostra_dimensao, d.nome_dimensao, d.fonte_dados, d.ordem_exibicao, c.categoria
            ORDER BY d.ordem_exibicao ASC, quantidade_meta DESC
            """
        ),
        {"pid": id_pesquisa},
    )
    dimensoes = [dict(r) for r in dim_res.mappings().all()]

    return {
        "id_pesquisa": id_pesquisa,
        "perguntas": perguntas,
        "respostas_por_pergunta": respostas,
        "relatorios": relatorios,
        "dimensoes": dimensoes,
    }

