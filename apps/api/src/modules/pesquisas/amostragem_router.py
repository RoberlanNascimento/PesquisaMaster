"""Rotas de Planejamento Amostral, Dimensões e Cotas (Hare-Niemeyer) conectadas ao PostgreSQL."""

import hashlib
import math
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session

amostragem_router = APIRouter(
    prefix="/api/v1/amostragem",
    tags=["Amostragem & Cotas"],
)


class AmostraCreateSchema(BaseModel):
    id_municipio: int
    descricao: str
    nivel_confianca: float = 95.0
    margem_erro: float = 4.9
    proporcao_esperada: float = 50.0
    populacao_universo: int = 100000
    z_score: float | None = None
    tamanho_amostral: int | None = None
    metodo_alocacao: str = "hare_niemeyer"
    gerar_cotas_automaticas: bool = True
    id_eleitorado_tse: int | None = None


class CotaUpdateSchema(BaseModel):
    percentual_meta: float
    quantidade_meta: int


class CotaCreateSchema(BaseModel):
    nome_dimensao: str
    categoria: str
    id_bairro: int | None = None
    percentual_meta: float
    quantidade_meta: int


class EleitoradoTseSchema(BaseModel):
    id_municipio: int
    id_bairro: int | None = None
    ano_referencia: int
    mes_referencia: int
    zona_eleitoral: str | None = None
    secao_eleitoral: str | None = None
    quantidade_eleitores: int
    eleitores_biometria: int = 0
    populacao_ibge: int | None = None
    ano_censo_ibge: int | None = None
    tipo_captura: str = "manual"
    fonte_endpoint: str | None = None
    id_usuario_captura: int | None = None
    hash_origem: str | None = None


def _z_from_confidence(conf: float) -> float:
    if conf >= 99.0:
        return 2.576
    if conf >= 95.0:
        return 1.96
    return 1.645


def _calc_sample_size(n_pop: int, conf: float, err_pct: float, p_pct: float) -> tuple[float, int]:
    z = _z_from_confidence(conf)
    e = max(err_pct / 100.0, 0.005)
    p = min(max(p_pct / 100.0, 0.01), 0.99)
    n0 = (z * z * p * (1.0 - p)) / (e * e)
    if n_pop > 0:
        n = math.ceil((n0 * n_pop) / (n0 + n_pop - 1))
    else:
        n = math.ceil(n0)
    return z, max(n, 1)


def _hare_niemeyer(total: int, weights: list[float]) -> list[int]:
    s = sum(weights)
    if s <= 0 or total <= 0:
        return [0 for _ in weights]
    exact = [(w / s) * total for w in weights]
    floors = [int(math.floor(x)) for x in exact]
    rem = total - sum(floors)
    order = sorted(range(len(weights)), key=lambda i: exact[i] - floors[i], reverse=True)
    for i in order[:rem]:
        floors[i] += 1
    return floors


@amostragem_router.get("/opcoes")
async def get_amostragem_opcoes(
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    muns = await session.execute(
        text(
            """
            SELECT m.id_municipio, m.nome, e.sigla AS uf,
                   COALESCE(m.eleitorado_total, 0) AS eleitorado_total
            FROM municipios m
            JOIN estados e ON e.id_estado = m.id_estado
            ORDER BY m.nome ASC
            """
        )
    )
    amostras = await session.execute(
        text(
            """
            SELECT a.id_amostra, a.id_municipio, a.descricao, a.nivel_confianca,
                   a.margem_erro, a.proporcao_esperada, a.populacao_universo,
                   a.z_score, a.tamanho_amostral, a.metodo_alocacao,
                   a.id_eleitorado_tse, a.calculado_em,
                   m.nome AS municipio_nome, e.sigla AS uf
            FROM amostras a
            LEFT JOIN municipios m ON m.id_municipio = a.id_municipio
            LEFT JOIN estados e ON e.id_estado = m.id_estado
            ORDER BY a.id_amostra DESC
            """
        )
    )
    bairros = await session.execute(
        text(
            """
            SELECT id_bairro, id_municipio, nome_bairro,
                   COALESCE(eleitorado_total, 0) AS eleitorado_total,
                   COALESCE(populacao_total, 0) AS populacao_total
            FROM bairros_ibge
            WHERE ativo = true
            ORDER BY nome_bairro ASC
            """
        )
    )
    eleitorados_tse = await session.execute(
        text(
            """
            SELECT et.id_eleitorado_tse, et.id_municipio, et.id_bairro,
                   et.ano_referencia, et.mes_referencia,
                   et.zona_eleitoral, et.secao_eleitoral,
                   et.quantidade_eleitores, et.eleitores_biometria,
                   et.populacao_ibge, et.ano_censo_ibge,
                   et.tipo_captura, et.fonte_endpoint,
                   et.id_usuario_captura, et.data_captura,
                   et.hash_origem, et.id_organizacao,
                   m.nome AS municipio_nome, e.sigla AS uf,
                   b.nome_bairro, u.nome AS usuario_nome
            FROM eleitorado_tse et
            LEFT JOIN municipios m ON m.id_municipio = et.id_municipio
            LEFT JOIN estados e ON e.id_estado = m.id_estado
            LEFT JOIN bairros_ibge b ON b.id_bairro = et.id_bairro
            LEFT JOIN usuarios u ON u.id_usuario = et.id_usuario_captura
            ORDER BY et.ano_referencia DESC, et.mes_referencia DESC, et.data_captura DESC, et.id_eleitorado_tse DESC
            """
        )
    )
    usuarios = await session.execute(
        text("SELECT id_usuario, nome FROM usuarios ORDER BY id_usuario ASC")
    )
    return {
        "municipios": [dict(r) for r in muns.mappings().all()],
        "amostras": [dict(r) for r in amostras.mappings().all()],
        "bairros": [dict(r) for r in bairros.mappings().all()],
        "eleitorados_tse": [dict(r) for r in eleitorados_tse.mappings().all()],
        "usuarios": [dict(r) for r in usuarios.mappings().all()],
    }


@amostragem_router.post("/amostras", status_code=status.HTTP_201_CREATED)
async def create_amostra(
    payload: AmostraCreateSchema,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    z_calc, calc_n = _calc_sample_size(
        payload.populacao_universo,
        payload.nivel_confianca,
        payload.margem_erro,
        payload.proporcao_esperada,
    )
    z = payload.z_score if payload.z_score and payload.z_score > 0 else z_calc
    final_n = payload.tamanho_amostral if payload.tamanho_amostral and payload.tamanho_amostral > 0 else calc_n

    res = await session.execute(
        text(
            """
            INSERT INTO amostras (
                id_municipio, descricao, nivel_confianca, margem_erro,
                proporcao_esperada, populacao_universo, z_score,
                tamanho_amostral, metodo_alocacao, id_eleitorado_tse, calculado_em, id_organizacao
            ) VALUES (
                :id_municipio, :descricao, :nivel_confianca, :margem_erro,
                :proporcao_esperada, :populacao_universo, :z_score,
                :tamanho_amostral, :metodo_alocacao, :id_eleitorado_tse, NOW(), 1
            )
            RETURNING id_amostra, id_municipio, descricao, tamanho_amostral, metodo_alocacao
            """
        ),
        {
            "id_municipio": payload.id_municipio,
            "descricao": payload.descricao,
            "nivel_confianca": payload.nivel_confianca,
            "margem_erro": payload.margem_erro,
            "proporcao_esperada": payload.proporcao_esperada / 100.0 if payload.proporcao_esperada > 1 else payload.proporcao_esperada,
            "populacao_universo": payload.populacao_universo,
            "z_score": z,
            "tamanho_amostral": final_n,
            "metodo_alocacao": payload.metodo_alocacao,
            "id_eleitorado_tse": payload.id_eleitorado_tse,
        },
    )
    amostra_row = dict(res.mappings().first() or {})
    id_amostra = amostra_row["id_amostra"]

    if payload.gerar_cotas_automaticas:
        bairro_res = await session.execute(
            text(
                """
                SELECT id_bairro, nome_bairro,
                       COALESCE(NULLIF(eleitorado_total, 0), NULLIF(populacao_total, 0), 1) AS peso
                FROM bairros_ibge
                WHERE id_municipio = :mid AND ativo = true
                ORDER BY id_bairro ASC
                """
            ),
            {"mid": payload.id_municipio},
        )
        bairros_list = [dict(r) for r in bairro_res.mappings().all()]
        if not bairros_list:
            any_b = await session.execute(text("SELECT id_bairro, nome_bairro, 1 AS peso FROM bairros_ibge ORDER BY id_bairro ASC LIMIT 1"))
            bairros_list = [dict(r) for r in any_b.mappings().all()] or [{"id_bairro": 1, "nome_bairro": "Geral", "peso": 1}]

        pesos_bairros = [float(b["peso"]) for b in bairros_list]

        defaults = [
            ("Sexo", "TSE", 1, [("Feminino", 52.8), ("Masculino", 47.2)]),
            ("Faixa Etária", "TSE", 2, [("16 a 24 anos", 14.5), ("25 a 34 anos", 21.2), ("35 a 44 anos", 21.0), ("45 a 59 anos", 24.8), ("60 anos ou mais", 18.5)]),
        ]
        for nome_dim, fonte, ordem, cats in defaults:
            dim_res = await session.execute(
                text(
                    """
                    INSERT INTO amostras_dimensao (id_amostra, nome_dimensao, fonte_dados, obrigatoria, ordem_exibicao, id_organizacao)
                    VALUES (:id_amostra, :nome, :fonte, true, :ordem, 1)
                    RETURNING id_amostra_dimensao
                    """
                ),
                {"id_amostra": id_amostra, "nome": nome_dim, "fonte": fonte, "ordem": ordem},
            )
            id_dim = dim_res.scalar_one()
            allocs_cat = _hare_niemeyer(final_n, [c[1] for c in cats])
            for (cat_name, pct), qtd_cat in zip(cats, allocs_cat):
                allocs_bairro = _hare_niemeyer(qtd_cat, pesos_bairros)
                for b, qtd_b in zip(bairros_list, allocs_bairro):
                    if qtd_b <= 0:
                        continue
                    await session.execute(
                        text(
                            """
                            INSERT INTO amostras_cotas (id_amostra_dimensao, id_bairro, categoria, percentual_meta, quantidade_meta, quantidade_coletada, id_organizacao)
                            VALUES (:id_dim, :id_bairro, :cat, :pct, :qtd, 0, 1)
                            """
                        ),
                        {"id_dim": id_dim, "id_bairro": b["id_bairro"], "cat": cat_name, "pct": pct, "qtd": qtd_b},
                    )

    await session.commit()
    return amostra_row


@amostragem_router.get("/amostras/{id_amostra}/detalhes")
async def get_amostra_detalhes(
    id_amostra: int,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    am = await session.execute(
        text(
            """
            SELECT a.*, m.nome AS municipio_nome, e.sigla AS uf
            FROM amostras a
            LEFT JOIN municipios m ON m.id_municipio = a.id_municipio
            LEFT JOIN estados e ON e.id_estado = m.id_estado
            WHERE a.id_amostra = :id_amostra
            """
        ),
        {"id_amostra": id_amostra},
    )
    amostra = am.mappings().first()
    if not amostra:
        raise HTTPException(status_code=404, detail="Amostra não encontrada.")

    cotas = await session.execute(
        text(
            """
            SELECT c.id_cota, c.id_amostra_dimensao, c.id_bairro, c.categoria,
                   c.percentual_meta, c.quantidade_meta, c.quantidade_coletada,
                   d.nome_dimensao, d.fonte_dados,
                   b.nome_bairro
            FROM amostras_cotas c
            JOIN amostras_dimensao d ON d.id_amostra_dimensao = c.id_amostra_dimensao
            LEFT JOIN bairros_ibge b ON b.id_bairro = c.id_bairro
            WHERE d.id_amostra = :id_amostra
            ORDER BY d.ordem_exibicao ASC, c.id_cota ASC
            """
        ),
        {"id_amostra": id_amostra},
    )
    return {
        "amostra": dict(amostra),
        "cotas": [dict(r) for r in cotas.mappings().all()],
    }


@amostragem_router.post("/amostras/{id_amostra}/cotas", status_code=status.HTTP_201_CREATED)
async def create_cota_manual(
    id_amostra: int,
    payload: CotaCreateSchema,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    dim = await session.execute(
        text("SELECT id_amostra_dimensao FROM amostras_dimensao WHERE id_amostra = :id_amostra AND nome_dimensao = :nome LIMIT 1"),
        {"id_amostra": id_amostra, "nome": payload.nome_dimensao},
    )
    id_dim = dim.scalar_one_or_none()
    if id_dim is None:
        new_dim = await session.execute(
            text(
                """
                INSERT INTO amostras_dimensao (id_amostra, nome_dimensao, fonte_dados, obrigatoria, ordem_exibicao, id_organizacao)
                VALUES (:id_amostra, :nome, 'MANUAL', true, 10, 1)
                RETURNING id_amostra_dimensao
                """
            ),
            {"id_amostra": id_amostra, "nome": payload.nome_dimensao},
        )
        id_dim = new_dim.scalar_one()

    id_bairro = payload.id_bairro
    if id_bairro is None:
        b_res = await session.execute(
            text(
                """
                SELECT b.id_bairro
                FROM bairros_ibge b
                JOIN amostras a ON a.id_municipio = b.id_municipio
                WHERE a.id_amostra = :id_amostra AND b.ativo = true
                ORDER BY b.id_bairro ASC
                LIMIT 1
                """
            ),
            {"id_amostra": id_amostra},
        )
        id_bairro = b_res.scalar_one_or_none() or 1

    res = await session.execute(
        text(
            """
            INSERT INTO amostras_cotas (id_amostra_dimensao, id_bairro, categoria, percentual_meta, quantidade_meta, quantidade_coletada, id_organizacao)
            VALUES (:id_dim, :id_bairro, :cat, :pct, :qtd, 0, 1)
            RETURNING id_cota, id_amostra_dimensao, id_bairro, categoria, percentual_meta, quantidade_meta, quantidade_coletada
            """
        ),
        {
            "id_dim": id_dim,
            "id_bairro": id_bairro,
            "cat": payload.categoria,
            "pct": payload.percentual_meta,
            "qtd": payload.quantidade_meta,
        },
    )
    await session.commit()
    return dict(res.mappings().first() or {})


@amostragem_router.put("/cotas/{id_cota}")
async def update_cota(
    id_cota: int,
    payload: CotaUpdateSchema,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    res = await session.execute(
        text(
            """
            UPDATE amostras_cotas
            SET percentual_meta = :pct, quantidade_meta = :qtd
            WHERE id_cota = :id_cota
            RETURNING id_cota, percentual_meta, quantidade_meta
            """
        ),
        {"id_cota": id_cota, "pct": payload.percentual_meta, "qtd": payload.quantidade_meta},
    )
    await session.commit()
    row = res.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Cota não encontrada.")
    return dict(row)


@amostragem_router.delete("/cotas/{id_cota}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cota(
    id_cota: int,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    await session.execute(text("DELETE FROM amostras_cotas WHERE id_cota = :id_cota"), {"id_cota": id_cota})
    await session.commit()


@amostragem_router.put("/amostras/{id_amostra}")
async def update_amostra(
    id_amostra: int,
    payload: AmostraCreateSchema,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    z_calc, calc_n = _calc_sample_size(
        payload.populacao_universo,
        payload.nivel_confianca,
        payload.margem_erro,
        payload.proporcao_esperada,
    )
    z = payload.z_score if payload.z_score and payload.z_score > 0 else z_calc
    final_n = payload.tamanho_amostral if payload.tamanho_amostral and payload.tamanho_amostral > 0 else calc_n
    prop_db = payload.proporcao_esperada / 100.0 if payload.proporcao_esperada > 1 else payload.proporcao_esperada
    res = await session.execute(
        text(
            """
            UPDATE amostras
            SET id_municipio = :id_municipio,
                descricao = :descricao,
                nivel_confianca = :nivel_confianca,
                margem_erro = :margem_erro,
                proporcao_esperada = :proporcao_esperada,
                populacao_universo = :populacao_universo,
                z_score = :z_score,
                tamanho_amostral = :tamanho_amostral,
                metodo_alocacao = :metodo_alocacao,
                id_eleitorado_tse = :id_eleitorado_tse
            WHERE id_amostra = :id_amostra
            RETURNING id_amostra, id_municipio, descricao, tamanho_amostral, metodo_alocacao
            """
        ),
        {
            "id_amostra": id_amostra,
            "id_municipio": payload.id_municipio,
            "descricao": payload.descricao,
            "nivel_confianca": payload.nivel_confianca,
            "margem_erro": payload.margem_erro,
            "proporcao_esperada": prop_db,
            "populacao_universo": payload.populacao_universo,
            "z_score": z,
            "tamanho_amostral": final_n,
            "metodo_alocacao": payload.metodo_alocacao,
            "id_eleitorado_tse": payload.id_eleitorado_tse,
        },
    )
    await session.commit()
    row = res.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Amostra não encontrada.")
    return dict(row)


@amostragem_router.delete("/amostras/{id_amostra}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_amostra(
    id_amostra: int,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    linked = await session.execute(
        text("SELECT COUNT(*) FROM pesquisas WHERE id_amostra = :id_amostra"),
        {"id_amostra": id_amostra},
    )
    if (linked.scalar_one() or 0) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível excluir esta amostra pois ela está vinculada a uma pesquisa.",
        )
    await session.execute(
        text(
            """
            DELETE FROM amostras_cotas
            WHERE id_amostra_dimensao IN (
                SELECT id_amostra_dimensao FROM amostras_dimensao WHERE id_amostra = :id_amostra
            )
            """
        ),
        {"id_amostra": id_amostra},
    )
    await session.execute(
        text("DELETE FROM amostras_dimensao WHERE id_amostra = :id_amostra"),
        {"id_amostra": id_amostra},
    )
    await session.execute(
        text("DELETE FROM amostras WHERE id_amostra = :id_amostra"),
        {"id_amostra": id_amostra},
    )
    await session.commit()


async def _prepare_eleitorado_params(
    payload: EleitoradoTseSchema,
    session: AsyncSession,
) -> dict[str, Any]:
    tipo = (payload.tipo_captura or "manual").strip().lower()
    if tipo not in ("manual", "automatica"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="tipo_captura deve ser 'manual' ou 'automatica'.",
        )
    if not (1 <= payload.mes_referencia <= 12):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="mes_referencia deve estar entre 1 e 12.",
        )

    id_usuario = payload.id_usuario_captura
    fonte = (payload.fonte_endpoint or "").strip() or None

    if tipo == "manual" and id_usuario is None:
        u_res = await session.execute(text("SELECT id_usuario FROM usuarios ORDER BY id_usuario ASC LIMIT 1"))
        id_usuario = u_res.scalar_one_or_none()
        if id_usuario is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="id_usuario_captura é obrigatório para captura manual.",
            )

    if tipo == "automatica" and not fonte:
        fonte = "https://dadosabertos.tse.jus.br"

    hash_val = (payload.hash_origem or "").strip() or hashlib.sha256(
        f"{payload.id_municipio}|{payload.ano_referencia}-{payload.mes_referencia}|{payload.quantidade_eleitores}|{tipo}".encode("utf-8")
    ).hexdigest()

    return {
        "id_municipio": payload.id_municipio,
        "id_bairro": payload.id_bairro,
        "ano_referencia": payload.ano_referencia,
        "mes_referencia": payload.mes_referencia,
        "zona_eleitoral": (payload.zona_eleitoral or "").strip() or None,
        "secao_eleitoral": (payload.secao_eleitoral or "").strip() or None,
        "quantidade_eleitores": max(payload.quantidade_eleitores, 0),
        "eleitores_biometria": max(payload.eleitores_biometria, 0),
        "populacao_ibge": payload.populacao_ibge,
        "ano_censo_ibge": payload.ano_censo_ibge,
        "tipo_captura": tipo,
        "fonte_endpoint": fonte,
        "id_usuario_captura": id_usuario,
        "hash_origem": hash_val[:64],
    }


@amostragem_router.post("/eleitorado-tse", status_code=status.HTTP_201_CREATED)
async def create_eleitorado_tse(
    payload: EleitoradoTseSchema,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    params = await _prepare_eleitorado_params(payload, session)
    res = await session.execute(
        text(
            """
            INSERT INTO eleitorado_tse (
                id_municipio, id_bairro, ano_referencia, mes_referencia,
                zona_eleitoral, secao_eleitoral, quantidade_eleitores,
                eleitores_biometria, populacao_ibge, ano_censo_ibge,
                tipo_captura, fonte_endpoint, id_usuario_captura,
                data_captura, hash_origem, id_organizacao
            ) VALUES (
                :id_municipio, :id_bairro, :ano_referencia, :mes_referencia,
                :zona_eleitoral, :secao_eleitoral, :quantidade_eleitores,
                :eleitores_biometria, :populacao_ibge, :ano_censo_ibge,
                :tipo_captura, :fonte_endpoint, :id_usuario_captura,
                NOW(), :hash_origem, 1
            )
            RETURNING id_eleitorado_tse, id_municipio, ano_referencia, mes_referencia,
                      quantidade_eleitores, tipo_captura, data_captura
            """
        ),
        params,
    )
    await session.commit()
    return dict(res.mappings().first() or {})


@amostragem_router.put("/eleitorado-tse/{id_eleitorado_tse}")
async def update_eleitorado_tse(
    id_eleitorado_tse: int,
    payload: EleitoradoTseSchema,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    params = await _prepare_eleitorado_params(payload, session)
    params["id_eleitorado_tse"] = id_eleitorado_tse
    res = await session.execute(
        text(
            """
            UPDATE eleitorado_tse
            SET id_municipio = :id_municipio,
                id_bairro = :id_bairro,
                ano_referencia = :ano_referencia,
                mes_referencia = :mes_referencia,
                zona_eleitoral = :zona_eleitoral,
                secao_eleitoral = :secao_eleitoral,
                quantidade_eleitores = :quantidade_eleitores,
                eleitores_biometria = :eleitores_biometria,
                populacao_ibge = :populacao_ibge,
                ano_censo_ibge = :ano_censo_ibge,
                tipo_captura = :tipo_captura,
                fonte_endpoint = :fonte_endpoint,
                id_usuario_captura = :id_usuario_captura,
                hash_origem = :hash_origem
            WHERE id_eleitorado_tse = :id_eleitorado_tse
            RETURNING id_eleitorado_tse, id_municipio, ano_referencia, mes_referencia,
                      quantidade_eleitores, tipo_captura, data_captura
            """
        ),
        params,
    )
    await session.commit()
    row = res.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Registro de eleitorado TSE não encontrado.")
    return dict(row)


@amostragem_router.delete("/eleitorado-tse/{id_eleitorado_tse}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_eleitorado_tse(
    id_eleitorado_tse: int,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    linked = await session.execute(
        text("SELECT COUNT(*) FROM amostras WHERE id_eleitorado_tse = :id"),
        {"id": id_eleitorado_tse},
    )
    if (linked.scalar_one() or 0) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível excluir este registro pois ele está vinculado a uma amostra.",
        )
    await session.execute(
        text("DELETE FROM eleitorado_tse WHERE id_eleitorado_tse = :id"),
        {"id": id_eleitorado_tse},
    )
    await session.commit()
