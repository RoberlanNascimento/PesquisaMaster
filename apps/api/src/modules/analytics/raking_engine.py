"""Motor Python de Ponderação por Raking (IPF) + Trimming + Deff de Kish."""

import json
from dataclasses import asdict, dataclass
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.orm import Session

# Mapeamento entre nome_dimensao (amostras_dimensao) e coluna correspondente em public.pessoas
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

# Normalização de siglas da tabela pessoas (M/F) para os rótulos da Matriz de Cotas
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
    dimensoes_ponderadas: List[str]


def executar_raking_ipf(
    df: pd.DataFrame,
    metas_por_coluna: Dict[str, Dict[str, float]],
    min_weight: float = 0.30,
    max_weight: float = 3.00,
    tol: float = 1e-6,
    max_iter: int = 100,
) -> tuple[np.ndarray, int, bool]:
    """
    Executa Iterative Proportional Fitting (Raking) com Weight Trimming e renormalização.
    Retorna (vetor_pesos, iteracoes, convergiu).
    """
    n = len(df)
    if n == 0:
        raise ValueError("Nenhuma entrevista aprovada encontrada para ponderação.")

    pesos = np.ones(n, dtype=np.float64)
    convergiu = False
    iteracoes = 0

    for it in range(1, max_iter + 1):
        iteracoes = it
        pesos_anteriores = pesos.copy()

        for col, metas_cat in metas_por_coluna.items():
            # Garante que a soma das proporções alvo das categorias presentes na amostra seja 1.0
            cats_presentes = set(df[col].dropna().unique())
            metas_ativas = {k: v for k, v in metas_cat.items() if k in cats_presentes and v > 0}
            soma_metas = sum(metas_ativas.values())
            if soma_metas <= 0:
                continue

            total_peso_atual = pesos.sum()
            for cat, prop_alvo in metas_ativas.items():
                prop_norm = prop_alvo / soma_metas
                mascara = (df[col] == cat).to_numpy()
                peso_atual_cat = pesos[mascara].sum()
                if peso_atual_cat > 0:
                    fator = (prop_norm * total_peso_atual) / peso_atual_cat
                    pesos[mascara] *= fator

            # Weight Trimming (evita explosão do Deff por células raras) + renormalização para soma = n
            pesos = np.clip(pesos, min_weight, max_weight)
            pesos *= n / pesos.sum()

        max_diff = np.max(np.abs(pesos - pesos_anteriores))
        if max_diff < tol:
            convergiu = True
            break

    # Renormalização final exata: média dos pesos = 1.000000 (soma = n)
    pesos *= n / pesos.sum()
    return np.round(pesos, 6), iteracoes, convergiu


def ponderar_e_atualizar_pesquisa(
    db: Session,
    tenant_id: int,
    id_usuario: int,
    role_rbac: str,
    id_pesquisa: int,
    dimensoes_alvo: Optional[List[str]] = None,
    min_weight: float = 0.30,
    max_weight: float = 3.00,
    salvar_relatorio_diagnostico: bool = True,
) -> DiagnosticoPonderacao:
    """
    Pipeline completo:
    1. Define contexto RLS/RBAC na transação.
    2. Valida se a pesquisa não está lacrada (is_bloqueada).
    3. Lê entrevistas aprovadas e metas marginais da Matriz de Cotas.
    4. Executa Raking (IPF) e calcula Deff de Kish.
    5. Atualiza peso_amostral em questionarios_pessoas.
    6. Atualiza mv_cubo_analitico_pesquisas e registra diagnóstico em relatorios_tabulacao.
    """
    if role_rbac not in ("estatistico", "administrador"):
        raise PermissionError("Apenas Estatístico ou Administrador podem executar ponderação amostral.")

    # 1. Contexto de sessão Multi-Tenant + RBAC
    db.execute(
        text("SELECT public.fn_definir_contexto_sessao(:tid, :role, :aid, 'usuario')"),
        {"tid": tenant_id, "role": role_rbac, "aid": id_usuario},
    )

    # 2. Valida estado da pesquisa e recupera plano amostral
    pesq = db.execute(
        text("""
            SELECT p.id_pesquisa, p.id_amostra, p.is_bloqueada, a.z_score, a.margem_erro
            FROM public.pesquisas p
            JOIN public.amostras a ON a.id_amostra = p.id_amostra
            WHERE p.id_pesquisa = :pid
        """),
        {"pid": id_pesquisa},
    ).fetchone()

    if not pesq:
        raise ValueError(f"Pesquisa ID {id_pesquisa} não encontrada para o tenant {tenant_id}.")
    if pesq.is_bloqueada:
        raise RuntimeError(f"Pesquisa ID {id_pesquisa} está lacrada (is_bloqueada = TRUE). Ponderação bloqueada.")

    # 3. Extrai entrevistas aprovadas com dados demográficos de public.pessoas
    rows_entrevistas = db.execute(
        text("""
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
        """),
        {"pid": id_pesquisa},
    ).mappings().all()

    if not rows_entrevistas:
        raise ValueError(f"Nenhuma entrevista com status_auditoria = 'aprovada' na pesquisa ID {id_pesquisa}.")

    df = pd.DataFrame(rows_entrevistas)
    for col, mapa in NORMALIZACAO_VALORES.items():
        if col in df.columns:
            df[col] = df[col].replace(mapa)

    # 4. Extrai metas marginais da Matriz de Cotas (agregando os bairros por dimensão + categoria)
    rows_cotas = db.execute(
        text("""
            SELECT
                ad.nome_dimensao,
                ac.categoria,
                SUM(ac.quantidade_meta)::NUMERIC AS meta_total_cat
            FROM public.amostras_dimensao ad
            JOIN public.amostras_cotas ac ON ac.id_amostra_dimensao = ad.id_amostra_dimensao
            WHERE ad.id_amostra = :aid
            GROUP BY ad.nome_dimensao, ac.categoria
        """),
        {"aid": pesq.id_amostra},
    ).mappings().all()

    metas_por_coluna: Dict[str, Dict[str, float]] = {}
    dimensoes_usadas: List[str] = []

    df_cotas = pd.DataFrame(rows_cotas)
    if df_cotas.empty:
        raise ValueError(f"Matriz de Cotas vazia para a amostra ID {pesq.id_amostra}.")

    for nome_dim, grupo in df_cotas.groupby("nome_dimensao"):
        if dimensoes_alvo and nome_dim not in dimensoes_alvo:
            continue
        col_pessoa = MAPA_DIMENSAO_COLUNA.get(nome_dim)
        if not col_pessoa or col_pessoa not in df.columns:
            continue

        total_dim = float(grupo["meta_total_cat"].sum())
        if total_dim <= 0:
            continue

        metas_por_coluna[col_pessoa] = {
            row["categoria"]: float(row["meta_total_cat"]) / total_dim
            for _, row in grupo.iterrows()
        }
        dimensoes_usadas.append(nome_dim)

    if not metas_por_coluna:
        raise ValueError("Nenhuma dimensão compatível encontrada entre amostras_dimensao e public.pessoas.")

    # 5. Executa o Raking (IPF)
    pesos, iteracoes, convergiu = executar_raking_ipf(
        df=df,
        metas_por_coluna=metas_por_coluna,
        min_weight=min_weight,
        max_weight=max_weight,
    )

    # 6. Calcula métricas de precisão estatística (Kish) exigidas para o PesqEle/TSE
    n_bruto = len(pesos)
    soma_w = float(np.sum(pesos))
    soma_w2 = float(np.sum(pesos ** 2))
    n_efetivo = (soma_w ** 2) / soma_w2
    deff = n_bruto / n_efetivo
    z_score = float(pesq.z_score)
    erro_real_pp = round(z_score * np.sqrt(0.25 / n_efetivo) * 100.0, 2)

    # 7. Grava peso_amostral em lote na tabela public.questionarios_pessoas
    payload_update = [
        {"id_qp": int(id_qp), "peso": float(w)}
        for id_qp, w in zip(df["id_questionario_pessoa"].tolist(), pesos.tolist())
    ]

    db.execute(
        text("""
            UPDATE public.questionarios_pessoas
            SET peso_amostral = :peso
            WHERE id_questionario_pessoa = :id_qp
        """),
        payload_update,
    )

    # 8. Atualiza o Cubo Analítico Materializado
    db.execute(text("SELECT public.fn_atualizar_cubo_analitico()"))

    diagnostico = DiagnosticoPonderacao(
        id_pesquisa=id_pesquisa,
        n_bruto_aprovado=n_bruto,
        n_efetivo_kish=round(n_efetivo, 2),
        deff_kish=round(deff, 4),
        margem_erro_nominal_pp=float(pesq.margem_erro),
        margem_erro_real_ponderada_pp=erro_real_pp,
        peso_minimo=float(np.min(pesos)),
        peso_maximo=float(np.max(pesos)),
        peso_medio=round(float(np.mean(pesos)), 6),
        iteracoes_executadas=iteracoes,
        convergiu=convergiu,
        dimensoes_ponderadas=dimensoes_usadas,
    )

    # 9. Persiste o diagnóstico de ponderação em public.relatorios_tabulacao (JSONB)
    if salvar_relatorio_diagnostico:
        db.execute(
            text("""
                INSERT INTO public.relatorios_tabulacao (
                    id_pesquisa, id_usuario, titulo_relatorio, configuracao_crosstab
                ) VALUES (
                    :pid, :uid, :titulo, CAST(:cfg AS JSONB)
                )
            """),
            {
                "pid": id_pesquisa,
                "uid": id_usuario,
                "titulo": f"Diagnóstico de Ponderação Raking (IPF) - Pesquisa #{id_pesquisa}",
                "cfg": json.dumps(asdict(diagnostico), ensure_ascii=False),
            },
        )

    db.commit()
    return diagnostico
