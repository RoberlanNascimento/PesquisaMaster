"""Rotas para tabelas auxiliares do banco 'pesquisas' (Catálogo, Amostragem, Campo, Auditoria)."""

from typing import Annotated, Any

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

tables_router = APIRouter(
    prefix="/pesquisas-tabelas",
    tags=["Tabelas do Banco Pesquisas"],
    dependencies=[Depends(get_current_user)],
)
DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
TenantDep = Annotated[TenantContext, Depends(get_tenant_context)]


class ReatribuicaoCreateSchema(BaseModel):
    id_questionario_pessoa: int
    id_pesquisador_novo: int
    id_usuario_autorizador: int | None = None
    email_usuario: str | None = None
    motivo: str


@tables_router.get("/candidatos", summary="Lista candidatos e marcas (candidatos_produtos)")
async def list_candidatos(session: DbSessionDep, tenant: TenantDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text("SELECT * FROM pesq_candidatos_produtos WHERE id_organizacao = :tid ORDER BY id_candidato_produto ASC LIMIT :lim")
    res = await session.execute(query, {"tid": tenant.tenant_id, "lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/estados", summary="Lista unidades federativas (estados)")
async def list_estados(session: DbSessionDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT id_estado, codigo_ibge, sigla, nome, regiao, populacao_total, eleitorado_total "
        "FROM geo_estados ORDER BY id_estado ASC LIMIT :lim"
    )
    res = await session.execute(query, {"lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/perguntas", summary="Lista banco de perguntas (perguntas)")
async def list_perguntas(session: DbSessionDep, tenant: TenantDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT p.*, g.nome_grupo, g.tipo_escala FROM form_perguntas p "
        "LEFT JOIN form_perguntas_grupos_opcoes g ON p.id_grupo_opcao = g.id_grupo_opcao "
        "WHERE p.id_organizacao = :tid "
        "ORDER BY p.id_pergunta ASC LIMIT :lim"
    )
    res = await session.execute(query, {"tid": tenant.tenant_id, "lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/pessoas", summary="Lista eleitores/respondentes (pessoas)")
async def list_pessoas(session: DbSessionDep, tenant: TenantDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text("SELECT * FROM campo_pessoas WHERE id_organizacao = :tid ORDER BY id_pessoa ASC LIMIT :lim")
    res = await session.execute(query, {"tid": tenant.tenant_id, "lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/sessoes-campo", summary="Lista sessões de campo (questionarios_pessoas)")
async def list_sessoes_campo(session: DbSessionDep, tenant: TenantDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT qp.*, pesq.nome AS pesquisa_nome, p.nome AS pessoa_nome, "
        "prof.nome AS pesquisador_nome FROM campo_questionarios_pessoas qp "
        "LEFT JOIN pesq_pesquisas pesq ON qp.id_pesquisa = pesq.id_pesquisa "
        "LEFT JOIN campo_pessoas p ON qp.id_pessoa = p.id_pessoa "
        "LEFT JOIN campo_profissionais prof ON qp.id_pesquisador = prof.id_profissional "
        "WHERE qp.id_organizacao = :tid "
        "ORDER BY qp.id_questionario_pessoa DESC LIMIT :lim"
    )
    res = await session.execute(query, {"tid": tenant.tenant_id, "lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/respostas", summary="Lista respostas coletadas (respostas)")
async def list_respostas(session: DbSessionDep, tenant: TenantDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT r.*, c.nome_urna_comercial, op.rotulo AS opcao_rotulo FROM campo_respostas r "
        "LEFT JOIN pesq_candidatos_produtos c ON r.id_candidato_produto = c.id_candidato_produto "
        "LEFT JOIN form_opcoes_resposta op ON r.id_opcao = op.id_opcao "
        "WHERE r.id_organizacao = :tid "
        "ORDER BY r.id_resposta DESC LIMIT :lim"
    )
    res = await session.execute(query, {"tid": tenant.tenant_id, "lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/demografia", summary="Lista dados demográficos (demografia_ibge)")
async def list_demografia(session: DbSessionDep, tenant: TenantDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT d.*, m.nome AS municipio_nome, b.nome_bairro FROM geo_demografia_ibge d "
        "LEFT JOIN geo_municipios m ON d.id_municipio = m.id_municipio "
        "LEFT JOIN geo_bairros_ibge b ON d.id_bairro = b.id_bairro "
        "WHERE d.id_organizacao IS NULL OR d.id_organizacao = :tid "
        "ORDER BY d.id_demografia ASC LIMIT :lim"
    )
    res = await session.execute(query, {"tid": tenant.tenant_id, "lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/eleitorado", summary="Lista histórico do eleitorado (eleitorado_tse)")
async def list_eleitorado(session: DbSessionDep, tenant: TenantDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT e.*, m.nome AS municipio_nome FROM geo_eleitorado_tse e "
        "LEFT JOIN geo_municipios m ON e.id_municipio = m.id_municipio "
        "WHERE e.id_organizacao IS NULL OR e.id_organizacao = :tid "
        "ORDER BY e.ano_referencia DESC, e.mes_referencia DESC LIMIT :lim"
    )
    res = await session.execute(query, {"tid": tenant.tenant_id, "lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/atribuicoes", summary="Lista distribuição de metas (atribuicao_pesquisadores)")
async def list_atribuicoes(session: DbSessionDep, tenant: TenantDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT a.*, p.nome AS pesquisa_nome, prof.nome AS pesquisador_nome, b.nome_bairro "
        "FROM campo_atribuicao_pesquisadores a "
        "LEFT JOIN pesq_pesquisas p ON a.id_pesquisa = p.id_pesquisa "
        "LEFT JOIN campo_profissionais prof ON a.id_profissional = prof.id_profissional "
        "LEFT JOIN geo_bairros_ibge b ON a.id_bairro = b.id_bairro "
        "WHERE a.id_organizacao = :tid "
        "ORDER BY a.id_atribuicao DESC LIMIT :lim"
    )
    res = await session.execute(query, {"tid": tenant.tenant_id, "lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/historico-desbloqueios", summary="Lista histórico de desbloqueios master")
async def list_desbloqueios(session: DbSessionDep, tenant: TenantDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT h.*, p.nome AS pesquisa_nome, u.nome AS usuario_master_nome "
        "FROM sys_historico_desbloqueio_pesquisas h "
        "LEFT JOIN pesq_pesquisas p ON h.id_pesquisa = p.id_pesquisa "
        "LEFT JOIN sys_usuarios u ON h.id_usuario_master = u.id_usuario "
        "WHERE h.id_organizacao = :tid "
        "ORDER BY h.id_historico_desbloqueio DESC LIMIT :lim"
    )
    res = await session.execute(query, {"tid": tenant.tenant_id, "lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/historico-reatribuicoes", summary="Histórico de reatribuição de entrevistas")
async def list_reatribuicoes(session: DbSessionDep, tenant: TenantDep, limit: int = 100) -> list[dict[str, Any]]:
    query = text(
        "SELECT hr.*, p1.nome AS pesquisador_anterior_nome, p2.nome AS pesquisador_novo_nome, "
        "u.nome AS autorizador_nome, pe.nome AS pesquisa_titulo "
        "FROM campo_historico_reatribuicao_questionarios hr "
        "LEFT JOIN campo_profissionais p1 ON hr.id_pesquisador_anterior = p1.id_profissional "
        "LEFT JOIN campo_profissionais p2 ON hr.id_pesquisador_novo = p2.id_profissional "
        "LEFT JOIN sys_usuarios u ON hr.id_usuario_autorizador = u.id_usuario "
        "LEFT JOIN campo_questionarios_pessoas qp ON hr.id_questionario_pessoa = qp.id_questionario_pessoa "
        "LEFT JOIN pesq_pesquisas pe ON qp.id_pesquisa = pe.id_pesquisa "
        "WHERE hr.id_organizacao = :tid "
        "ORDER BY hr.id_historico_reatribuicao DESC LIMIT :lim"
    )
    res = await session.execute(query, {"tid": tenant.tenant_id, "lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/movimentacao-opcoes", summary="Opções para movimentação e reatribuição de pesquisadores")
async def get_movimentacao_opcoes(session: DbSessionDep, tenant: TenantDep) -> dict[str, Any]:
    tid = tenant.tenant_id
    muns_res = await session.execute(
        text(
            """
            SELECT DISTINCT m.id_municipio, m.nome, e.sigla AS uf
            FROM pesq_pesquisas pe
            JOIN geo_municipios m ON pe.id_municipio = m.id_municipio
            JOIN geo_estados e ON m.id_estado = e.id_estado
            WHERE pe.status IN ('aprovada', 'processando') AND pe.is_bloqueada = false AND pe.id_organizacao = :tid
            ORDER BY m.nome ASC
            """
        ),
        {"tid": tid},
    )
    pesquisas_res = await session.execute(
        text(
            """
            SELECT pe.id_pesquisa, pe.nome, pe.status, pe.id_municipio,
                   m.nome AS municipio_nome, e.sigla AS uf
            FROM pesq_pesquisas pe
            JOIN geo_municipios m ON pe.id_municipio = m.id_municipio
            JOIN geo_estados e ON m.id_estado = e.id_estado
            WHERE pe.status IN ('aprovada', 'processando') AND pe.is_bloqueada = false AND pe.id_organizacao = :tid
            ORDER BY pe.id_pesquisa DESC
            """
        ),
        {"tid": tid},
    )
    sessoes_res = await session.execute(
        text(
            """
            SELECT qp.id_questionario_pessoa, qp.id_pesquisa, qp.id_pesquisador,
                   qp.data_resposta, qp.status_auditoria,
                   p.nome AS pesquisador_nome,
                   pe.nome AS pesquisa_titulo,
                   pe.id_municipio
            FROM campo_questionarios_pessoas qp
            LEFT JOIN campo_profissionais p ON qp.id_pesquisador = p.id_profissional
            JOIN pesq_pesquisas pe ON qp.id_pesquisa = pe.id_pesquisa
            WHERE qp.id_pesquisador IS NOT NULL
              AND pe.status IN ('aprovada', 'processando')
              AND pe.is_bloqueada = false
              AND qp.id_organizacao = :tid
            ORDER BY qp.id_questionario_pessoa DESC
            LIMIT 200
            """
        ),
        {"tid": tid},
    )
    profs_res = await session.execute(
        text(
            """
            SELECT id_profissional, nome, tipo_profissional, especialidade, ativo
            FROM campo_profissionais
            WHERE ativo = true AND id_organizacao = :tid
            ORDER BY nome ASC
            """
        ),
        {"tid": tid},
    )
    users_res = await session.execute(
        text("SELECT id_usuario, nome, email FROM sys_usuarios WHERE id_organizacao = :tid ORDER BY id_usuario ASC"),
        {"tid": tid},
    )
    return {
        "municipios_ativos": [dict(r._mapping) for r in muns_res.fetchall()],
        "pesquisas_ativas": [dict(r._mapping) for r in pesquisas_res.fetchall()],
        "sessoes": [dict(r._mapping) for r in sessoes_res.fetchall()],
        "profissionais": [dict(r._mapping) for r in profs_res.fetchall()],
        "usuarios": [dict(r._mapping) for r in users_res.fetchall()],
    }


@tables_router.post(
    "/historico-reatribuicoes",
    status_code=status.HTTP_201_CREATED,
    summary="Movimenta / reatribui entrevista para outro pesquisador com auditoria",
)
async def create_reatribuicao(
    payload: ReatribuicaoCreateSchema,
    session: DbSessionDep,
) -> dict[str, Any]:
    motivo = payload.motivo.strip()
    if len(motivo) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe uma justificativa com pelo menos 3 caracteres.",
        )

    qp_res = await session.execute(
        text(
            "SELECT id_questionario_pessoa, id_pesquisa, id_pesquisador, id_organizacao FROM campo_questionarios_pessoas "
            "WHERE id_questionario_pessoa = :id_qp"
        ),
        {"id_qp": payload.id_questionario_pessoa},
    )
    qp_row = qp_res.mappings().first()
    if not qp_row:
        raise HTTPException(status_code=404, detail="Sessão de entrevista não encontrada.")

    id_anterior = qp_row["id_pesquisador"]
    if id_anterior is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta sessão não possui pesquisador anterior vinculado.",
        )
    if int(id_anterior) == int(payload.id_pesquisador_novo):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O novo pesquisador deve ser diferente do pesquisador atual.",
        )

    # Resolve autorizador
    resolved_user_id = payload.id_usuario_autorizador
    if resolved_user_id is None and payload.email_usuario:
        u_res = await session.execute(
            text("SELECT id_usuario FROM sys_usuarios WHERE LOWER(email) = LOWER(:email) LIMIT 1"),
            {"email": payload.email_usuario.strip()},
        )
        resolved_user_id = u_res.scalar_one_or_none()
    if resolved_user_id is None:
        u_res = await session.execute(text("SELECT id_usuario FROM sys_usuarios ORDER BY id_usuario ASC LIMIT 1"))
        resolved_user_id = u_res.scalar_one_or_none() or 1

    # Define contexto multi-tenant e usuário na transação atual antes do UPDATE (exigido pelo trigger/RLS)
    tenant_id = int(qp_row.get("id_organizacao") or 1)
    await session.execute(
        text("SELECT set_config('app.current_tenant_id', :tid, true)"),
        {"tid": str(tenant_id)},
    )
    await session.execute(
        text("SELECT set_config('app.current_user_id', :uid, true)"),
        {"uid": str(resolved_user_id)},
    )

    # Atualiza questionarios_pessoas — o trigger trg_auditar_troca_pesquisador grava no histórico
    await session.execute(
        text(
            "UPDATE campo_questionarios_pessoas SET id_pesquisador = :novo "
            "WHERE id_questionario_pessoa = :id_qp"
        ),
        {"novo": payload.id_pesquisador_novo, "id_qp": payload.id_questionario_pessoa},
    )

    # Atualiza o registro recém-criado pelo trigger com o autorizador real e o motivo informado
    hist_res = await session.execute(
        text(
            """
            UPDATE campo_historico_reatribuicao_questionarios
            SET id_usuario_autorizador = :uid,
                motivo = :motivo
            WHERE id_historico_reatribuicao = (
                SELECT id_historico_reatribuicao
                FROM campo_historico_reatribuicao_questionarios
                WHERE id_questionario_pessoa = :id_qp
                ORDER BY id_historico_reatribuicao DESC
                LIMIT 1
            )
            RETURNING *
            """
        ),
        {"uid": resolved_user_id, "motivo": motivo, "id_qp": payload.id_questionario_pessoa},
    )
    created = hist_res.mappings().first()

    # Transfere TODO o saldo de entrevistas (meta_entrevistas) do pesquisador anterior para o novo pesquisador nesta pesquisa
    id_pesquisa = qp_row.get("id_pesquisa")
    if id_pesquisa is not None:
        origem_res = await session.execute(
            text(
                """
                SELECT id_atribuicao, id_bairro, lote_setor, meta_entrevistas, data_inicio, data_limite
                FROM campo_atribuicao_pesquisadores
                WHERE id_pesquisa = :id_pesq
                  AND id_profissional = :id_ant
                  AND COALESCE(meta_entrevistas, 0) > 0
                ORDER BY id_atribuicao ASC
                """
            ),
            {"id_pesq": id_pesquisa, "id_ant": id_anterior},
        )
        origem_rows = origem_res.mappings().all()
        total_transferido = sum(int(r["meta_entrevistas"] or 0) for r in origem_rows)

        if total_transferido > 0:
            # Zera o saldo do pesquisador anterior nesta pesquisa (preservando FKs de histórico/transferências)
            await session.execute(
                text(
                    """
                    UPDATE campo_atribuicao_pesquisadores
                    SET meta_entrevistas = 0
                    WHERE id_pesquisa = :id_pesq
                      AND id_profissional = :id_ant
                      AND COALESCE(meta_entrevistas, 0) > 0
                    """
                ),
                {"id_pesq": id_pesquisa, "id_ant": id_anterior},
            )

            # Credita todo o saldo ao novo pesquisador (atualiza atribuição existente ou cria uma nova)
            dest_res = await session.execute(
                text(
                    """
                    SELECT id_atribuicao
                    FROM campo_atribuicao_pesquisadores
                    WHERE id_pesquisa = :id_pesq
                      AND id_profissional = :id_novo
                    ORDER BY id_atribuicao ASC
                    LIMIT 1
                    """
                ),
                {"id_pesq": id_pesquisa, "id_novo": payload.id_pesquisador_novo},
            )
            dest_row = dest_res.mappings().first()
            if dest_row:
                await session.execute(
                    text(
                        """
                        UPDATE campo_atribuicao_pesquisadores
                        SET meta_entrevistas = COALESCE(meta_entrevistas, 0) + :qtd,
                            status_atribuicao = 'ativa'
                        WHERE id_atribuicao = :dest_id
                        """
                    ),
                    {"qtd": total_transferido, "dest_id": dest_row["id_atribuicao"]},
                )
            else:
                first_orig = origem_rows[0]
                await session.execute(
                    text(
                        """
                        INSERT INTO campo_atribuicao_pesquisadores (
                            id_pesquisa, id_profissional, id_bairro, lote_setor,
                            meta_entrevistas, data_inicio, data_limite, status_atribuicao, id_organizacao
                        ) VALUES (
                            :id_pesq, :id_novo, :id_bairro, :lote_setor,
                            :qtd, COALESCE(:data_inicio, CURRENT_DATE), COALESCE(:data_limite, CURRENT_DATE + 30), 'ativa', :tid
                        )
                        """
                    ),
                    {
                        "id_pesq": id_pesquisa,
                        "id_novo": payload.id_pesquisador_novo,
                        "id_bairro": first_orig.get("id_bairro"),
                        "lote_setor": first_orig.get("lote_setor") or "Lote Transferido",
                        "qtd": total_transferido,
                        "data_inicio": first_orig.get("data_inicio"),
                        "data_limite": first_orig.get("data_limite"),
                        "tid": tenant_id,
                    },
                )

    await session.commit()
    return dict(created or {})


class ReatribuicaoUpdateSchema(BaseModel):
    id_usuario_autorizador: int | None = None
    motivo: str


@tables_router.put(
    "/historico-reatribuicoes/{id_historico}",
    summary="Edita justificativa e autorizador de uma reatribuição",
)
async def update_reatribuicao(
    id_historico: int,
    payload: ReatribuicaoUpdateSchema,
    session: DbSessionDep,
    tenant: TenantDep,
) -> dict[str, Any]:
    motivo = payload.motivo.strip()
    if len(motivo) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe uma justificativa com pelo menos 3 caracteres.",
        )
    await session.execute(
        text("SELECT set_config('app.current_tenant_id', :tid, true)"),
        {"tid": str(tenant.tenant_id)},
    )
    res = await session.execute(
        text(
            """
            UPDATE campo_historico_reatribuicao_questionarios
            SET motivo = :motivo,
                id_usuario_autorizador = COALESCE(:uid, id_usuario_autorizador)
            WHERE id_historico_reatribuicao = :id_h AND id_organizacao = :tid
            RETURNING *
            """
        ),
        {"id_h": id_historico, "motivo": motivo, "uid": payload.id_usuario_autorizador, "tid": tenant.tenant_id},
    )
    row = res.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Registro de reatribuição não encontrado.")
    await session.commit()
    return dict(row)


@tables_router.delete(
    "/historico-reatribuicoes/{id_historico}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove um registro de histórico de reatribuição",
)
async def delete_reatribuicao(
    id_historico: int,
    session: DbSessionDep,
    tenant: TenantDep,
) -> None:
    await session.execute(
        text("SELECT set_config('app.current_tenant_id', :tid, true)"),
        {"tid": str(tenant.tenant_id)},
    )
    await session.execute(
        text("DELETE FROM campo_historico_reatribuicao_questionarios WHERE id_historico_reatribuicao = :id_h AND id_organizacao = :tid"),
        {"id_h": id_historico, "tid": tenant.tenant_id},
    )
    await session.commit()


@tables_router.get("/dimensoes", summary="Lista variáveis de controle (amostras_dimensao)")
async def list_dimensoes(session: DbSessionDep, tenant: TenantDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT ad.*, a.descricao AS amostra_descricao FROM pesq_amostras_dimensao ad "
        "LEFT JOIN pesq_amostras a ON ad.id_amostra = a.id_amostra "
        "WHERE ad.id_organizacao = :tid "
        "ORDER BY ad.ordem_exibicao ASC LIMIT :lim"
    )
    res = await session.execute(query, {"tid": tenant.tenant_id, "lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/escalas", summary="Lista réguas e escalas (perguntas_grupos_opcoes)")
async def list_escalas(session: DbSessionDep, tenant: TenantDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT g.*, COUNT(o.id_opcao) AS total_opcoes FROM form_perguntas_grupos_opcoes g "
        "LEFT JOIN form_opcoes_resposta o ON g.id_grupo_opcao = o.id_grupo_opcao "
        "WHERE g.id_organizacao = :tid "
        "GROUP BY g.id_grupo_opcao ORDER BY g.id_grupo_opcao ASC LIMIT :lim"
    )
    res = await session.execute(query, {"tid": tenant.tenant_id, "lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/opcoes-resposta", summary="Lista alternativas de resposta (opcoes_resposta)")
async def list_opcoes_resposta(session: DbSessionDep, tenant: TenantDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT o.*, g.nome_grupo FROM form_opcoes_resposta o "
        "LEFT JOIN form_perguntas_grupos_opcoes g ON o.id_grupo_opcao = g.id_grupo_opcao "
        "WHERE o.id_organizacao = :tid "
        "ORDER BY o.id_grupo_opcao ASC, o.ordem_exibicao ASC LIMIT :lim"
    )
    res = await session.execute(query, {"tid": tenant.tenant_id, "lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/itens-bateria", summary="Lista subitens de bateria (perguntas_itens_bateria)")
async def list_itens_bateria(session: DbSessionDep, tenant: TenantDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT ib.*, p.enunciado FROM form_perguntas_itens_bateria ib "
        "LEFT JOIN form_perguntas p ON ib.id_pergunta = p.id_pergunta "
        "WHERE ib.id_organizacao = :tid "
        "ORDER BY ib.id_pergunta ASC, ib.ordem ASC LIMIT :lim"
    )
    res = await session.execute(query, {"tid": tenant.tenant_id, "lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/transferencias", summary="Lista repasse de metas (transferencias_atribuicao)")
async def list_transferencias(session: DbSessionDep, tenant: TenantDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT t.*, p.nome AS pesquisa_nome, p1.nome AS pesquisador_origem_nome, "
        "p2.nome AS pesquisador_destino_nome FROM campo_transferencias_atribuicao t "
        "LEFT JOIN pesq_pesquisas p ON t.id_pesquisa = p.id_pesquisa "
        "LEFT JOIN campo_profissionais p1 ON t.id_pesquisador_origem = p1.id_profissional "
        "LEFT JOIN campo_profissionais p2 ON t.id_pesquisador_destino = p2.id_profissional "
        "WHERE t.id_organizacao = :tid "
        "ORDER BY t.id_transferencia DESC LIMIT :lim"
    )
    res = await session.execute(query, {"tid": tenant.tenant_id, "lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/cenario-candidatos", summary="Lista candidatos do cenário")
async def list_cenario_candidatos(session: DbSessionDep, tenant: TenantDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT cc.*, cp.nome_urna_comercial, cp.sigla_partido_marca, cp.cargo_categoria "
        "FROM pesq_cenario_candidatos cc "
        "LEFT JOIN pesq_candidatos_produtos cp ON cc.id_candidato_produto = cp.id_candidato_produto "
        "WHERE cc.id_organizacao = :tid "
        "ORDER BY cc.id_cenario ASC, cc.ordem_apresentacao ASC LIMIT :lim"
    )
    res = await session.execute(query, {"tid": tenant.tenant_id, "lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/niveis-acesso", summary="Lista níveis de acesso RBAC (niveis_acesso)")
async def list_niveis_acesso(session: DbSessionDep) -> list[dict[str, Any]]:
    query = text(
        "SELECT id_nivel_acesso, codigo, nome, nivel_hierarquia, descricao, ativo "
        "FROM public.sys_niveis_acesso WHERE ativo = true ORDER BY nivel_hierarquia DESC"
    )
    res = await session.execute(query)
    return [dict(r._mapping) for r in res.fetchall()]


@tables_router.get("/relatorios-tabulacao", summary="Lista relatórios salvos")
async def list_relatorios_tabulacao(session: DbSessionDep, tenant: TenantDep, limit: int = 50) -> list[dict[str, Any]]:
    query = text(
        "SELECT rt.*, p.nome AS pesquisa_nome, u.nome AS usuario_nome FROM pesq_relatorios_tabulacao rt "
        "LEFT JOIN pesq_pesquisas p ON rt.id_pesquisa = p.id_pesquisa "
        "LEFT JOIN sys_usuarios u ON rt.id_usuario = u.id_usuario "
        "WHERE rt.id_organizacao = :tid "
        "ORDER BY rt.id_relatorio DESC LIMIT :lim"
    )
    res = await session.execute(query, {"tid": tenant.tenant_id, "lim": limit})
    return [dict(r._mapping) for r in res.fetchall()]
