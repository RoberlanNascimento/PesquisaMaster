"""Rotas de Conferência Oficial TSE / IBGE e sincronização no banco de dados."""

import hashlib
import json
from datetime import datetime, timezone
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session

integracao_router = APIRouter(
    prefix="/api/v1/integracoes",
    tags=["Conferência Oficial TSE / IBGE"],
)

TSE_CKAN_BASE = "https://dadosabertos.tse.jus.br/api/3/action"
IBGE_AGREGADOS_BASE = "https://servicodados.ibge.gov.br/api/v3/agregados"


class ConferenciaUniversoResponse(BaseModel):
    id_municipio: int
    municipio: str
    uf: str
    codigo_ibge: int
    codigo_tse: Optional[int]
    eleitorado_tse_oficial: int
    eleitores_biometria: int
    populacao_ibge_oficial: int
    ano_referencia_tse: int
    mes_referencia_tse: int
    id_eleitorado_tse_gravado: int
    hash_auditoria_sha256: str
    status_conferencia: str
    divergencia_percentual: float


async def consultar_populacao_ibge(client: httpx.AsyncClient, codigo_ibge: int) -> tuple[int, int, str]:
    url = f"{IBGE_AGREGADOS_BASE}/6579/periodos/-1/variaveis/9324?localidades=N6[{codigo_ibge}]"
    resp = await client.get(url, timeout=15.0)
    resp.raise_for_status()
    dados = resp.json()

    try:
        serie = dados[0]["resultados"][0]["series"][0]["serie"]
        ano_str, pop_str = next(iter(serie.items()))
        return int(pop_str), int(ano_str), url
    except (IndexError, KeyError, ValueError, StopIteration):
        url_censo = f"{IBGE_AGREGADOS_BASE}/4714/periodos/2022/variaveis/93?localidades=N6[{codigo_ibge}]"
        resp_censo = await client.get(url_censo, timeout=15.0)
        resp_censo.raise_for_status()
        dados_censo = resp_censo.json()
        serie = dados_censo[0]["resultados"][0]["series"][0]["serie"]
        ano_str, pop_str = next(iter(serie.items()))
        return int(pop_str), int(ano_str), url_censo


async def consultar_eleitorado_tse(
    client: httpx.AsyncClient, nome_municipio: str, uf: str, codigo_tse: Optional[int] = None
) -> tuple[int, int, int, int, Optional[int], str]:
    search_url = f"{TSE_CKAN_BASE}/package_search?q=perfil-eleitorado&rows=5"
    pkg_resp = await client.get(search_url, timeout=20.0)
    pkg_resp.raise_for_status()
    pacotes = pkg_resp.json().get("result", {}).get("results", [])

    resource_id = None
    for pkg in pacotes:
        for res in pkg.get("resources", []):
            if res.get("datastore_active"):
                resource_id = res["id"]
                break
        if resource_id:
            break

    if not resource_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Nenhum recurso datastore ativo encontrado na API de Dados Abertos do TSE.",
        )

    filtros: dict[str, object] = {"SG_UF": uf.upper()}
    if codigo_tse:
        filtros["CD_MUNICIPIO"] = codigo_tse
    else:
        filtros["NM_MUNICIPIO"] = nome_municipio.upper()

    ds_url = f"{TSE_CKAN_BASE}/datastore_search"
    params = {
        "resource_id": resource_id,
        "filters": json.dumps(filtros, ensure_ascii=False),
        "limit": 5000,
    }
    ds_resp = await client.get(ds_url, params=params, timeout=25.0)
    ds_resp.raise_for_status()
    registros = ds_resp.json().get("result", {}).get("records", [])

    if not registros:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Município '{nome_municipio}/{uf}' não localizado na base aberta do TSE.",
        )

    total_eleitores = sum(int(r.get("QT_ELEITORES_PERFIL", 0)) for r in registros)
    total_biometria = sum(int(r.get("QT_ELEITORES_BIOMETRIA", 0)) for r in registros)
    cod_tse_retornado = int(registros[0].get("CD_MUNICIPIO")) if registros[0].get("CD_MUNICIPIO") else codigo_tse

    ano_mes = str(registros[0].get("ANO_MES_REFERENCIA") or "")
    if len(ano_mes) == 6 and ano_mes.isdigit():
        ano_ref, mes_ref = int(ano_mes[:4]), int(ano_mes[4:6])
    else:
        agora = datetime.now(timezone.utc)
        ano_ref, mes_ref = agora.year, agora.month

    endpoint_audit = f"{ds_url}?resource_id={resource_id}&filters={json.dumps(filtros)}"
    return total_eleitores, total_biometria, ano_ref, mes_ref, cod_tse_retornado, endpoint_audit


@integracao_router.post("/conferir-municipio/{id_municipio}", response_model=ConferenciaUniversoResponse)
async def conferir_e_sincronizar_municipio(
    id_municipio: int,
    session: AsyncSession = Depends(get_db_session),
) -> ConferenciaUniversoResponse:
    res = await session.execute(
        text(
            """
            SELECT m.id_municipio, m.nome, m.codigo_ibge, m.codigo_tse,
                   m.eleitorado_total AS eleitorado_atual_db,
                   e.sigla AS uf
            FROM public.municipios m
            JOIN public.estados e ON m.id_estado = e.id_estado
            WHERE m.id_municipio = :mid
            """
        ),
        {"mid": id_municipio},
    )
    mun = res.mappings().first()
    if not mun:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Município não encontrado.")

    async with httpx.AsyncClient(headers={"User-Agent": "PesquisaMaster-TSE-Sync/1.0"}) as client:
        pop_ibge, ano_ibge, url_ibge = await consultar_populacao_ibge(client, mun["codigo_ibge"])
        eleitores_tse, biometria, ano_tse, mes_tse, cod_tse, url_tse = await consultar_eleitorado_tse(
            client, mun["nome"], mun["uf"], mun["codigo_tse"]
        )

    payload_auditoria = f"{mun['codigo_ibge']}|{cod_tse}|{ano_tse}-{mes_tse}|TSE:{eleitores_tse}|IBGE:{pop_ibge}"
    hash_sha256 = hashlib.sha256(payload_auditoria.encode("utf-8")).hexdigest()
    fonte_combinada = f"TSE:{url_tse} | IBGE:{url_ibge}"[:255]

    reg_res = await session.execute(
        text(
            """
            SELECT public.fn_registrar_captura_oficial_tse_ibge(
                :cod_ibge, :ano_tse, :mes_tse, :eleitores, :biometria,
                :pop_ibge, :ano_ibge, :fonte, :hash, :cod_tse
            )
            """
        ),
        {
            "cod_ibge": mun["codigo_ibge"],
            "ano_tse": ano_tse,
            "mes_tse": mes_tse,
            "eleitores": eleitores_tse,
            "biometria": biometria,
            "pop_ibge": pop_ibge,
            "ano_ibge": ano_ibge,
            "fonte": fonte_combinada,
            "hash": hash_sha256,
            "cod_tse": cod_tse,
        },
    )
    id_registro = int(reg_res.scalar() or 0)
    await session.commit()

    base_anterior = mun["eleitorado_atual_db"] or eleitores_tse
    divergencia_pct = round(abs(eleitores_tse - base_anterior) / max(base_anterior, 1) * 100, 4)
    status_conf = "CONFERIDO_SEM_DIVERGENCIA" if divergencia_pct == 0 else "ATUALIZADO_COM_DIVERGENCIA"

    return ConferenciaUniversoResponse(
        id_municipio=mun["id_municipio"],
        municipio=mun["nome"],
        uf=mun["uf"],
        codigo_ibge=mun["codigo_ibge"],
        codigo_tse=cod_tse,
        eleitorado_tse_oficial=eleitores_tse,
        eleitores_biometria=biometria,
        populacao_ibge_oficial=pop_ibge,
        ano_referencia_tse=ano_tse,
        mes_referencia_tse=mes_tse,
        id_eleitorado_tse_gravado=id_registro,
        hash_auditoria_sha256=hash_sha256,
        status_conferencia=status_conf,
        divergencia_percentual=divergencia_pct,
    )
