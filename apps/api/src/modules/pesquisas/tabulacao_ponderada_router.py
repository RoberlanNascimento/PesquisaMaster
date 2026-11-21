"""Rotas HTTP para Ponderação por Raking (IPF) + Trimming + Deff de Kish e Tabulação Ponderada no BD."""

from dataclasses import asdict
import json
from typing import Any

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.modules.analytics.raking_engine import (
    DiagnosticoPonderacao,
    MAPA_DIMENSAO_COLUNA,
    NORMALIZACAO_VALORES,
    executar_raking_ipf,
)

tabulacao_ponderada_router = APIRouter(
    prefix="/api/v1/tabulacao-ponderada",
    tags=["Ponderação Raking (IPF) & Tabulação Ponderada"],
)


class RakingRequest(BaseModel):
    min_weight: float = Field(default=0.30, gt=0.0, le=1.0)
    max_weight: float = Field(default=3.00, ge=1.0, le=10.0)
    dimensoes_alvo: list[str] | None = None
    salvar_relatorio_diagnostico: bool = True
    id_usuario: int | None = None


@tabulacao_ponderada_router.post(
    "/pesquisas/{id_pesquisa}/raking",
    status_code=status.HTTP_200_OK,
    summary="Executa Ponderação por Raking (IPF) + Trimming + Deff de Kish e persiste peso_amostral no BD",
)
async def executar_ponderacao_raking(
    id_pesquisa: int,
    payload: RakingRequest,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    # 1. Valida estado da pesquisa e recupera plano amostral
    pesq_res = await session.execute(
        text(
            """
            SELECT p.id_pesquisa, p.id_amostra, p.is_bloqueada,
                   COALESCE(a.z_score, 1.96) AS z_score,
                   COALESCE(a.margem_erro, 3.5) AS margem_erro
            FROM public.pesquisas p
            LEFT JOIN public.amostras a ON a.id_amostra = p.id_amostra
            WHERE p.id_pesquisa = :pid
            """
        ),
        {"pid": id_pesquisa},
    )
    pesq = pesq_res.mappings().first()
    if not pesq:
        raise HTTPException(status_code=404, detail=f"Pesquisa ID {id_pesquisa} não encontrada.")
    if pesq["is_bloqueada"]:
        raise HTTPException(
            status_code=409,
            detail=f"Pesquisa ID {id_pesquisa} está lacrada (is_bloqueada = TRUE). Ponderação bloqueada.",
        )
    if not pesq["id_amostra"]:
        raise HTTPException(
            status_code=400,
            detail=f"Pesquisa ID {id_pesquisa} não possui plano amostral vinculado.",
        )

    # 2. Extrai entrevistas aprovadas com dados demográficos de public.pessoas
    ent_res = await session.execute(
        text(
            """
            SELECT
                qp.id_questionario_pessoa,
                p.sexo,
                p.faixa_etaria,
                p.escolaridade,
                p.faixa_renda,
                p.religiao
            FROM public.questionarios_pessoas qp
            JOIN public.pessoas p ON p.id_pessoa = qp.id_pessoa
            WHERE qp.id_pesquisa = :pid
              AND qp.status_auditoria = 'aprovada'
            ORDER BY qp.id_questionario_pessoa
            """
        ),
        {"pid": id_pesquisa},
    )
    rows_entrevistas = [dict(r) for r in ent_res.mappings().all()]
    if not rows_entrevistas:
        raise HTTPException(
            status_code=400,
            detail=f"Nenhuma entrevista com status_auditoria = 'aprovada' na pesquisa ID {id_pesquisa}.",
        )

    df = pd.DataFrame(rows_entrevistas)
    for col, mapa in NORMALIZACAO_VALORES.items():
        if col in df.columns:
            df[col] = df[col].replace(mapa)

    # 3. Extrai metas marginais da Matriz de Cotas
    cotas_res = await session.execute(
        text(
            """
            SELECT
                ad.nome_dimensao,
                ac.categoria,
                SUM(ac.quantidade_meta)::NUMERIC AS meta_total_cat
            FROM public.amostras_dimensao ad
            JOIN public.amostras_cotas ac ON ac.id_amostra_dimensao = ad.id_amostra_dimensao
            WHERE ad.id_amostra = :aid
            GROUP BY ad.nome_dimensao, ac.categoria
            """
        ),
        {"aid": pesq["id_amostra"]},
    )
    rows_cotas = [dict(r) for r in cotas_res.mappings().all()]
    if not rows_cotas:
        raise HTTPException(
            status_code=400,
            detail=f"Matriz de Cotas vazia para a amostra ID {pesq['id_amostra']}.",
        )

    df_cotas = pd.DataFrame(rows_cotas)
    metas_por_coluna: dict[str, dict[str, float]] = {}
    dimensoes_usadas: list[str] = []

    for nome_dim, grupo in df_cotas.groupby("nome_dimensao"):
        nome_dim_str = str(nome_dim)
        if payload.dimensoes_alvo and nome_dim_str not in payload.dimensoes_alvo:
            continue
        col_pessoa = MAPA_DIMENSAO_COLUNA.get(nome_dim_str)
        if not col_pessoa or col_pessoa not in df.columns:
            continue

        total_dim = float(grupo["meta_total_cat"].sum())
        if total_dim <= 0:
            continue

        metas_por_coluna[col_pessoa] = {
            str(row["categoria"]): float(row["meta_total_cat"]) / total_dim
            for _, row in grupo.iterrows()
        }
        dimensoes_usadas.append(nome_dim_str)

    if not metas_por_coluna:
        raise HTTPException(
            status_code=400,
            detail="Nenhuma dimensão compatível encontrada entre amostras_dimensao e public.pessoas.",
        )

    # 4. Executa Raking (IPF) com Trimming
    try:
        pesos, iteracoes, convergiu = executar_raking_ipf(
            df=df,
            metas_por_coluna=metas_por_coluna,
            min_weight=payload.min_weight,
            max_weight=payload.max_weight,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # 5. Métricas de Kish (n_efetivo, DEFF e Margem de Erro Real)
    n_bruto = len(pesos)
    soma_w = float(np.sum(pesos))
    soma_w2 = float(np.sum(pesos ** 2))
    n_efetivo = (soma_w ** 2) / soma_w2
    deff = n_bruto / n_efetivo
    z_score = float(pesq["z_score"])
    erro_real_pp = round(z_score * float(np.sqrt(0.25 / n_efetivo)) * 100.0, 2)

    # 6. Grava peso_amostral em lote
    payload_update = [
        {"id_qp": int(id_qp), "peso": float(w)}
        for id_qp, w in zip(df["id_questionario_pessoa"].tolist(), pesos.tolist())
    ]
    await session.execute(
        text(
            """
            UPDATE public.questionarios_pessoas
            SET peso_amostral = :peso
            WHERE id_questionario_pessoa = :id_qp
            """
        ),
        payload_update,
    )

    # 7. Atualiza cubo analítico materializado (se existir no BD)
    try:
        async with session.begin_nested():
            await session.execute(text("SELECT public.fn_atualizar_cubo_analitico()"))
    except Exception:
        pass

    diagnostico = DiagnosticoPonderacao(
        id_pesquisa=id_pesquisa,
        n_bruto_aprovado=n_bruto,
        n_efetivo_kish=round(n_efetivo, 2),
        deff_kish=round(deff, 4),
        margem_erro_nominal_pp=float(pesq["margem_erro"]),
        margem_erro_real_ponderada_pp=erro_real_pp,
        peso_minimo=float(np.min(pesos)),
        peso_maximo=float(np.max(pesos)),
        peso_medio=round(float(np.mean(pesos)), 6),
        iteracoes_executadas=iteracoes,
        convergiu=convergiu,
        dimensoes_ponderadas=dimensoes_usadas,
    )

    # 8. Persiste diagnóstico em public.relatorios_tabulacao
    if payload.salvar_relatorio_diagnostico:
        uid = payload.id_usuario
        if uid is None:
            u_res = await session.execute(text("SELECT id_usuario FROM public.usuarios ORDER BY id_usuario ASC LIMIT 1"))
            uid = u_res.scalar_one_or_none()
        if uid is not None:
            await session.execute(
                text(
                    """
                    INSERT INTO public.relatorios_tabulacao (
                        id_pesquisa, id_usuario, titulo_relatorio, configuracao_crosstab
                    ) VALUES (
                        :pid, :uid, :titulo, CAST(:cfg AS JSONB)
                    )
                    """
                ),
                {
                    "pid": id_pesquisa,
                    "uid": uid,
                    "titulo": f"Diagnóstico de Ponderação Raking (IPF) - Pesquisa #{id_pesquisa}",
                    "cfg": json.dumps(asdict(diagnostico), ensure_ascii=False),
                },
            )

    await session.commit()
    return asdict(diagnostico)


@tabulacao_ponderada_router.get(
    "/pesquisas/{id_pesquisa}",
    status_code=status.HTTP_200_OK,
    summary="Retorna tabulação ponderada (votos brutos, ponderados, válidos, rejeição e crosstab) do BD",
)
async def obter_tabulacao_ponderada(
    id_pesquisa: int,
    dimensao_crosstab: str = Query(default="sexo"),
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    pesq_res = await session.execute(
        text(
            """
            SELECT p.id_pesquisa, p.nome, p.status::text, p.is_bloqueada,
                   p.numero_registro_tse, p.data_inicio, p.data_fim,
                   m.nome AS municipio_nome, e.sigla AS uf,
                   COALESCE(a.tamanho_amostral, 0) AS tamanho_amostral,
                   COALESCE(a.margem_erro, 0) AS margem_erro,
                   COALESCE(a.z_score, 1.96) AS z_score
            FROM public.pesquisas p
            LEFT JOIN public.municipios m ON m.id_municipio = p.id_municipio
            LEFT JOIN public.estados e ON e.id_estado = m.id_estado
            LEFT JOIN public.amostras a ON a.id_amostra = p.id_amostra
            WHERE p.id_pesquisa = :pid
            """
        ),
        {"pid": id_pesquisa},
    )
    pesq = pesq_res.mappings().first()
    if not pesq:
        raise HTTPException(status_code=404, detail=f"Pesquisa ID {id_pesquisa} não encontrada.")

    # Estatísticas ao vivo dos pesos em questionarios_pessoas
    kish_res = await session.execute(
        text(
            """
            SELECT
                COUNT(*)::int AS n_bruto,
                COALESCE(SUM(COALESCE(peso_amostral, 1.0)), 0)::float AS soma_w,
                COALESCE(SUM(POWER(COALESCE(peso_amostral, 1.0), 2)), 0)::float AS soma_w2,
                COALESCE(MIN(COALESCE(peso_amostral, 1.0)), 1.0)::float AS peso_min,
                COALESCE(MAX(COALESCE(peso_amostral, 1.0)), 1.0)::float AS peso_max,
                COALESCE(AVG(COALESCE(peso_amostral, 1.0)), 1.0)::float AS peso_medio
            FROM public.questionarios_pessoas
            WHERE id_pesquisa = :pid
              AND status_auditoria = 'aprovada'
            """
        ),
        {"pid": id_pesquisa},
    )
    krow = kish_res.mappings().first() or {}
    n_bruto = int(krow.get("n_bruto") or 0)
    soma_w = float(krow.get("soma_w") or 0.0)
    soma_w2 = float(krow.get("soma_w2") or 0.0)
    n_efetivo = (soma_w ** 2) / soma_w2 if soma_w2 > 0 else 0.0
    deff = (n_bruto / n_efetivo) if n_efetivo > 0 else 1.0
    z_score = float(pesq["z_score"] or 1.96)
    erro_real_pp = round(z_score * float(np.sqrt(0.25 / n_efetivo)) * 100.0, 2) if n_efetivo > 0 else float(pesq["margem_erro"] or 0.0)

    # Último diagnóstico salvo em relatorios_tabulacao
    diag_res = await session.execute(
        text(
            """
            SELECT id_relatorio, titulo_relatorio, configuracao_crosstab, criado_em
            FROM public.relatorios_tabulacao
            WHERE id_pesquisa = :pid
              AND titulo_relatorio LIKE 'Diagnóstico de Ponderação Raking%'
            ORDER BY id_relatorio DESC
            LIMIT 1
            """
        ),
        {"pid": id_pesquisa},
    )
    diag_row = diag_res.mappings().first()

    # Votos diretos ponderados por cenário e candidato
    votos_res = await session.execute(
        text(
            """
            SELECT
                COALESCE(r.id_cenario, 0) AS id_cenario,
                COALESCE(cp.identificador, 'Cenário Principal') AS cenario_nome,
                COALESCE(cp.tipo_cenario, 'estimulado') AS tipo_cenario,
                r.id_candidato_produto,
                COALESCE(c.nome_urna_comercial, 'Branco / Nulo / Não sabe') AS candidato,
                COALESCE(c.sigla_partido_marca, 'NS/NR') AS partido,
                COALESCE(c.cor_hex, '#64748b') AS cor_hex,
                (r.id_candidato_produto IS NULL) AS is_nao_valido,
                COUNT(*)::int AS votos_brutos,
                COALESCE(SUM(COALESCE(qp.peso_amostral, 1.0)), 0)::float AS votos_ponderados
            FROM public.respostas r
            JOIN public.questionarios_pessoas qp ON qp.id_questionario_pessoa = r.id_questionario_pessoa
            LEFT JOIN public.cenarios_pesquisa cp ON cp.id_cenario = r.id_cenario
            LEFT JOIN public.candidatos_produtos c ON c.id_candidato_produto = r.id_candidato_produto
            WHERE qp.id_pesquisa = :pid
              AND qp.status_auditoria = 'aprovada'
              AND r.tipo_registro = 'voto_direto'
            GROUP BY r.id_cenario, cp.identificador, cp.tipo_cenario, r.id_candidato_produto,
                     c.nome_urna_comercial, c.sigla_partido_marca, c.cor_hex
            ORDER BY COALESCE(r.id_cenario, 0) ASC, votos_ponderados DESC
            """
        ),
        {"pid": id_pesquisa},
    )
    votos_rows = [dict(r) for r in votos_res.mappings().all()]

    # Rejeição ponderada
    rej_res = await session.execute(
        text(
            """
            SELECT
                r.id_candidato_produto,
                COALESCE(c.nome_urna_comercial, 'Não rejeita / Não sabe') AS candidato,
                COUNT(*)::int AS votos_brutos,
                COALESCE(SUM(COALESCE(qp.peso_amostral, 1.0)), 0)::float AS votos_ponderados
            FROM public.respostas r
            JOIN public.questionarios_pessoas qp ON qp.id_questionario_pessoa = r.id_questionario_pessoa
            LEFT JOIN public.candidatos_produtos c ON c.id_candidato_produto = r.id_candidato_produto
            WHERE qp.id_pesquisa = :pid
              AND qp.status_auditoria = 'aprovada'
              AND r.tipo_registro = 'rejeicao'
            GROUP BY r.id_candidato_produto, c.nome_urna_comercial
            """
        ),
        {"pid": id_pesquisa},
    )
    rej_map = {
        r["candidato"]: float(r["votos_ponderados"] or 0.0)
        for r in rej_res.mappings().all()
    }
    total_rej_base = soma_w if soma_w > 0 else 1.0

    # Agrupa por cenário e calcula % bruto, % ponderado e % votos válidos
    cenarios_map: dict[int, dict[str, Any]] = {}
    for row in votos_rows:
        cid = int(row["id_cenario"])
        if cid not in cenarios_map:
            cenarios_map[cid] = {
                "id_cenario": cid,
                "cenario_nome": row["cenario_nome"],
                "tipo_cenario": row["tipo_cenario"],
                "itens": [],
            }
        cenarios_map[cid]["itens"].append(row)

    cenarios_out: list[dict[str, Any]] = []
    for cen in cenarios_map.values():
        tot_bruto = sum(int(i["votos_brutos"]) for i in cen["itens"]) or 1
        tot_pond = sum(float(i["votos_ponderados"]) for i in cen["itens"]) or 1.0
        tot_validos = sum(float(i["votos_ponderados"]) for i in cen["itens"] if not i["is_nao_valido"]) or 1.0

        itens_fmt = []
        for i in cen["itens"]:
            vp = float(i["votos_ponderados"])
            vb = int(i["votos_brutos"])
            rej_pond = rej_map.get(i["candidato"], 0.0)
            itens_fmt.append(
                {
                    "id_candidato_produto": i["id_candidato_produto"],
                    "candidato": i["candidato"],
                    "partido": i["partido"],
                    "cor_hex": i["cor_hex"],
                    "is_nao_valido": bool(i["is_nao_valido"]),
                    "votos_brutos": vb,
                    "votos_ponderados": round(vp, 2),
                    "pct_bruto": round((vb / tot_bruto) * 100.0, 2),
                    "pct_ponderado": round((vp / tot_pond) * 100.0, 2),
                    "pct_validos": 0.0 if i["is_nao_valido"] else round((vp / tot_validos) * 100.0, 2),
                    "pct_rejeicao": round((rej_pond / total_rej_base) * 100.0, 2),
                }
            )
        cenarios_out.append(
            {
                "id_cenario": cen["id_cenario"],
                "cenario_nome": cen["cenario_nome"],
                "tipo_cenario": cen["tipo_cenario"],
                "total_votos_brutos": sum(int(i["votos_brutos"]) for i in cen["itens"]),
                "total_votos_ponderados": round(sum(float(i["votos_ponderados"]) for i in cen["itens"]), 2),
                "itens": itens_fmt,
            }
        )

    # Crosstab ponderado pela dimensão solicitada
    col_segura = dimensao_crosstab if dimensao_crosstab in ("sexo", "faixa_etaria", "escolaridade", "faixa_renda", "religiao") else "sexo"
    cross_res = await session.execute(
        text(
            f"""
            SELECT
                COALESCE(p.{col_segura}::text, 'Não informado') AS segmento,
                COALESCE(c.nome_urna_comercial, 'Branco / Nulo / Não sabe') AS candidato,
                COUNT(*)::int AS votos_brutos,
                COALESCE(SUM(COALESCE(qp.peso_amostral, 1.0)), 0)::float AS votos_ponderados
            FROM public.respostas r
            JOIN public.questionarios_pessoas qp ON qp.id_questionario_pessoa = r.id_questionario_pessoa
            JOIN public.pessoas p ON p.id_pessoa = qp.id_pessoa
            LEFT JOIN public.candidatos_produtos c ON c.id_candidato_produto = r.id_candidato_produto
            WHERE qp.id_pesquisa = :pid
              AND qp.status_auditoria = 'aprovada'
              AND r.tipo_registro = 'voto_direto'
            GROUP BY COALESCE(p.{col_segura}::text, 'Não informado'),
                     COALESCE(c.nome_urna_comercial, 'Branco / Nulo / Não sabe')
            ORDER BY segmento ASC, votos_ponderados DESC
            """
        ),
        {"pid": id_pesquisa},
    )
    crosstabs = [dict(r) for r in cross_res.mappings().all()]

    return {
        "pesquisa": dict(pesq),
        "metricas_kish": {
            "n_bruto_aprovado": n_bruto,
            "n_efetivo_kish": round(n_efetivo, 2),
            "deff_kish": round(deff, 4),
            "margem_erro_nominal_pp": float(pesq["margem_erro"] or 0.0),
            "margem_erro_real_ponderada_pp": erro_real_pp,
            "peso_minimo": round(float(krow.get("peso_min") or 1.0), 4),
            "peso_maximo": round(float(krow.get("peso_max") or 1.0), 4),
            "peso_medio": round(float(krow.get("peso_medio") or 1.0), 6),
        },
        "ultimo_diagnostico": dict(diag_row) if diag_row else None,
        "cenarios": cenarios_out,
        "dimensao_crosstab": col_segura,
        "crosstabs": crosstabs,
    }
