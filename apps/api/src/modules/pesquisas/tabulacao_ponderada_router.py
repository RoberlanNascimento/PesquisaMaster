"""Rotas HTTP para Ponderação por Raking (IPF) + Trimming + Deff de Kish e Tabulação Ponderada no BD."""

from collections import defaultdict
from dataclasses import asdict, dataclass
import json
import math
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.modules.pesquisas.tenant_context import TenantContext, get_tenant_context

tabulacao_ponderada_router = APIRouter(
    prefix="/api/v1/tabulacao-ponderada",
    tags=["Ponderação Raking (IPF) & Tabulação Ponderada"],
)

MAPA_DIMENSAO_COLUNA = {
    "Sexo": "sexo",
    "Faixa Etária": "faixa_etaria",
    "Escolaridade (Grau de Instrução)": "escolaridade",
    "Grau de Instrução": "escolaridade",
    "Nível Econômico / Renda Familiar": "faixa_renda",
    "Faixa de Renda Familiar": "faixa_renda",
    "Religião / Matriz Religiosa": "religiao",
    "Religião": "religiao",
}

NORMALIZACAO_VALORES = {
    "sexo": {"M": "Masculino", "F": "Feminino"},
}


@dataclass
class DiagnosticoPonderacao:
    id_pesquisa: int
    n_bruto_aprovado: int
    n_efetivo_kish: float
    deff_kish: float
    margem_erro_nominal_pp: float
    margem_erro_real_ponderada_pp: float
    peso_minimo: float
    peso_maximo: float
    peso_medio: float
    iteracoes_executadas: int
    convergiu: bool
    dimensoes_ponderadas: list[str]


def _executar_raking_ipf_puro(
    rows: list[dict[str, Any]],
    metas_por_coluna: dict[str, dict[str, float]],
    min_weight: float = 0.30,
    max_weight: float = 3.00,
    tol: float = 1e-6,
    max_iter: int = 100,
) -> tuple[list[float], int, bool]:
    """Iterative Proportional Fitting (Raking) com Weight Trimming e renormalização em Python puro."""
    n = len(rows)
    if n == 0:
        raise ValueError("Nenhuma entrevista aprovada encontrada para ponderação.")

    pesos = [1.0] * n
    convergiu = False
    iteracoes = 0

    for it in range(1, max_iter + 1):
        iteracoes = it
        pesos_anteriores = pesos.copy()

        for col, metas_cat in metas_por_coluna.items():
            cats_presentes = {r.get(col) for r in rows if r.get(col) is not None}
            metas_ativas = {k: v for k, v in metas_cat.items() if k in cats_presentes and v > 0}
            soma_metas = sum(metas_ativas.values())
            if soma_metas <= 0:
                continue

            total_peso_atual = sum(pesos)
            for cat, prop_alvo in metas_ativas.items():
                prop_norm = prop_alvo / soma_metas
                indices = [i for i, r in enumerate(rows) if r.get(col) == cat]
                peso_atual_cat = sum(pesos[i] for i in indices)
                if peso_atual_cat > 0:
                    fator = (prop_norm * total_peso_atual) / peso_atual_cat
                    for i in indices:
                        pesos[i] *= fator

            # Weight Trimming + renormalização para soma = n
            pesos = [min(max(w, min_weight), max_weight) for w in pesos]
            soma_w = sum(pesos)
            if soma_w > 0:
                escala = n / soma_w
                pesos = [w * escala for w in pesos]

        max_diff = max(abs(a - b) for a, b in zip(pesos, pesos_anteriores))
        if max_diff < tol:
            convergiu = True
            break

    soma_final = sum(pesos)
    if soma_final > 0:
        escala = n / soma_final
        pesos = [round(w * escala, 6) for w in pesos]
    return pesos, iteracoes, convergiu


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
    tenant: TenantContext = Depends(get_tenant_context),
) -> dict[str, Any]:
    pesq_res = await session.execute(
        text(
            """
            SELECT p.id_pesquisa, p.id_amostra, p.is_bloqueada,
                   COALESCE(a.z_score, 1.96) AS z_score,
                   COALESCE(a.margem_erro, 3.5) AS margem_erro
            FROM public.pesq_pesquisas p
            LEFT JOIN public.pesq_amostras a ON a.id_amostra = p.id_amostra
            WHERE p.id_pesquisa = :pid AND p.id_organizacao = :tid
            """
        ),
        {"pid": id_pesquisa, "tid": tenant.tenant_id},
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
            FROM public.campo_questionarios_pessoas qp
            JOIN public.campo_pessoas p ON p.id_pessoa = qp.id_pessoa
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

    for row in rows_entrevistas:
        for col, mapa in NORMALIZACAO_VALORES.items():
            if col in row and row[col] in mapa:
                row[col] = mapa[row[col]]

    cotas_res = await session.execute(
        text(
            """
            SELECT
                ad.nome_dimensao,
                ac.categoria,
                SUM(ac.quantidade_meta)::NUMERIC AS meta_total_cat
            FROM public.pesq_amostras_dimensao ad
            JOIN public.pesq_amostras_cotas ac ON ac.id_amostra_dimensao = ad.id_amostra_dimensao
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

    grupos_cotas: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for r in rows_cotas:
        grupos_cotas[str(r["nome_dimensao"])].append(r)

    metas_por_coluna: dict[str, dict[str, float]] = {}
    dimensoes_usadas: list[str] = []
    colunas_entrevista = set(rows_entrevistas[0].keys())

    for nome_dim, grupo in grupos_cotas.items():
        if payload.dimensoes_alvo and nome_dim not in payload.dimensoes_alvo:
            continue
        col_pessoa = MAPA_DIMENSAO_COLUNA.get(nome_dim)
        if not col_pessoa or col_pessoa not in colunas_entrevista:
            continue

        total_dim = sum(float(r["meta_total_cat"] or 0.0) for r in grupo)
        if total_dim <= 0:
            continue

        metas_por_coluna[col_pessoa] = {
            str(r["categoria"]): float(r["meta_total_cat"] or 0.0) / total_dim
            for r in grupo
        }
        dimensoes_usadas.append(nome_dim)

    if not metas_por_coluna:
        raise HTTPException(
            status_code=400,
            detail="Nenhuma dimensão compatível encontrada entre amostras_dimensao e public.pessoas.",
        )

    try:
        pesos, iteracoes, convergiu = _executar_raking_ipf_puro(
            rows=rows_entrevistas,
            metas_por_coluna=metas_por_coluna,
            min_weight=payload.min_weight,
            max_weight=payload.max_weight,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    n_bruto = len(pesos)
    soma_w = sum(pesos)
    soma_w2 = sum(w * w for w in pesos)
    n_efetivo = (soma_w ** 2) / soma_w2 if soma_w2 > 0 else 0.0
    deff = (n_bruto / n_efetivo) if n_efetivo > 0 else 1.0
    z_score = float(pesq["z_score"])
    erro_real_pp = round(z_score * math.sqrt(0.25 / n_efetivo) * 100.0, 2) if n_efetivo > 0 else float(pesq["margem_erro"])

    payload_update = [
        {"id_qp": int(r["id_questionario_pessoa"]), "peso": float(w)}
        for r, w in zip(rows_entrevistas, pesos)
    ]
    await session.execute(
        text(
            """
            UPDATE public.campo_questionarios_pessoas
            SET peso_amostral = :peso
            WHERE id_questionario_pessoa = :id_qp
            """
        ),
        payload_update,
    )

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
        peso_minimo=min(pesos),
        peso_maximo=max(pesos),
        peso_medio=round(soma_w / n_bruto, 6),
        iteracoes_executadas=iteracoes,
        convergiu=convergiu,
        dimensoes_ponderadas=dimensoes_usadas,
    )

    if payload.salvar_relatorio_diagnostico:
        uid = payload.id_usuario
        if uid is None:
            u_res = await session.execute(text("SELECT id_usuario FROM public.sys_usuarios ORDER BY id_usuario ASC LIMIT 1"))
            uid = u_res.scalar_one_or_none()
        if uid is not None:
            await session.execute(
                text(
                    """
                    INSERT INTO public.pesq_relatorios_tabulacao (
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
    tenant: TenantContext = Depends(get_tenant_context),
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
            FROM public.pesq_pesquisas p
            LEFT JOIN public.geo_municipios m ON m.id_municipio = p.id_municipio
            LEFT JOIN public.geo_estados e ON e.id_estado = m.id_estado
            LEFT JOIN public.pesq_amostras a ON a.id_amostra = p.id_amostra
            WHERE p.id_pesquisa = :pid AND p.id_organizacao = :tid
            """
        ),
        {"pid": id_pesquisa, "tid": tenant.tenant_id},
    )
    pesq = pesq_res.mappings().first()
    if not pesq:
        raise HTTPException(status_code=404, detail=f"Pesquisa ID {id_pesquisa} não encontrada.")

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
            FROM public.campo_questionarios_pessoas
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
    erro_real_pp = round(z_score * math.sqrt(0.25 / n_efetivo) * 100.0, 2) if n_efetivo > 0 else float(pesq["margem_erro"] or 0.0)

    diag_res = await session.execute(
        text(
            """
            SELECT id_relatorio, titulo_relatorio, configuracao_crosstab, criado_em
            FROM public.pesq_relatorios_tabulacao
            WHERE id_pesquisa = :pid
              AND titulo_relatorio LIKE 'Diagnóstico de Ponderação Raking%'
            ORDER BY id_relatorio DESC
            LIMIT 1
            """
        ),
        {"pid": id_pesquisa},
    )
    diag_row = diag_res.mappings().first()

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
            FROM public.campo_respostas r
            JOIN public.campo_questionarios_pessoas qp ON qp.id_questionario_pessoa = r.id_questionario_pessoa
            LEFT JOIN public.pesq_cenarios_pesquisa cp ON cp.id_cenario = r.id_cenario
            LEFT JOIN public.pesq_candidatos_produtos c ON c.id_candidato_produto = r.id_candidato_produto
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

    rej_res = await session.execute(
        text(
            """
            SELECT
                r.id_candidato_produto,
                COALESCE(c.nome_urna_comercial, 'Não rejeita / Não sabe') AS candidato,
                COUNT(*)::int AS votos_brutos,
                COALESCE(SUM(COALESCE(qp.peso_amostral, 1.0)), 0)::float AS votos_ponderados
            FROM public.campo_respostas r
            JOIN public.campo_questionarios_pessoas qp ON qp.id_questionario_pessoa = r.id_questionario_pessoa
            LEFT JOIN public.pesq_candidatos_produtos c ON c.id_candidato_produto = r.id_candidato_produto
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

    col_segura = dimensao_crosstab if dimensao_crosstab in ("sexo", "faixa_etaria", "escolaridade", "faixa_renda", "religiao") else "sexo"
    cross_res = await session.execute(
        text(
            f"""
            SELECT
                COALESCE(p.{col_segura}::text, 'Não informado') AS segmento,
                COALESCE(c.nome_urna_comercial, 'Branco / Nulo / Não sabe') AS candidato,
                COUNT(*)::int AS votos_brutos,
                COALESCE(SUM(COALESCE(qp.peso_amostral, 1.0)), 0)::float AS votos_ponderados
            FROM public.campo_respostas r
            JOIN public.campo_questionarios_pessoas qp ON qp.id_questionario_pessoa = r.id_questionario_pessoa
            JOIN public.campo_pessoas p ON p.id_pessoa = qp.id_pessoa
            LEFT JOIN public.pesq_candidatos_produtos c ON c.id_candidato_produto = r.id_candidato_produto
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
