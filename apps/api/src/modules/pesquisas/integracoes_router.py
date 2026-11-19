"""Rotas de Conferência Oficial TSE / IBGE e sincronização no banco de dados."""

import asyncio
import csv
import hashlib
import io
import json
import os
import tempfile
import unicodedata
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session

integracao_router = APIRouter(
    prefix="/api/v1/integracoes",
    tags=["Conferência Oficial TSE / IBGE"],
)

TSE_PERFIL_ATUAL_URL = (
    "https://cdn.tse.jus.br/estatistica/sead/odsele/perfil_eleitorado/perfil_eleitorado_ATUAL.zip"
)
IBGE_AGREGADOS_BASE = "https://servicodados.ibge.gov.br/api/v3/agregados"
CACHE_DIR = Path(__file__).resolve().parents[3] / ".cache" / "tse"
CACHE_INDEX_PATH = CACHE_DIR / "eleitorado_atual_index.json"


class ConferenciaRequest(BaseModel):
    id_usuario: Optional[int] = None
    email_usuario: Optional[str] = None
    id_organizacao: Optional[int] = None


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
    id_usuario_captura: Optional[int] = None
    id_organizacao: Optional[int] = None
    hash_auditoria_sha256: str
    status_conferencia: str
    divergencia_percentual: float


def _normalize_text(value: str) -> str:
    nfkd = unicodedata.normalize("NFKD", value or "")
    return "".join(c for c in nfkd if not unicodedata.combining(c)).strip().upper()


def _parse_tse_zip_to_index(zip_path: str, last_modified: str) -> dict[str, Any]:
    by_code: dict[str, dict[str, Any]] = {}
    by_uf_nome: dict[str, str] = {}
    agora = datetime.now(timezone.utc)
    ano_ref, mes_ref = agora.year, agora.month

    with zipfile.ZipFile(zip_path) as zf:
        csv_names = [n for n in zf.namelist() if n.lower().endswith(".csv")]
        if not csv_names:
            raise ValueError("Arquivo ZIP do TSE não contém arquivo CSV.")
        with zf.open(csv_names[0]) as raw:
            reader = csv.reader(io.TextIOWrapper(raw, encoding="latin-1"), delimiter=";")
            header = next(reader, None)
            if not header:
                raise ValueError("Arquivo CSV do TSE está vazio.")

            col_idx = {name.strip().upper(): i for i, name in enumerate(header)}
            idx_uf = col_idx.get("SG_UF")
            idx_cd = col_idx.get("CD_MUNICIPIO")
            idx_nm = col_idx.get("NM_MUNICIPIO")
            idx_qt = col_idx.get("QT_ELEITORES")
            if idx_qt is None:
                idx_qt = col_idx.get("QT_ELEITORES_PERFIL")
            idx_bio = col_idx.get("QT_ELEITORES_BIOMETRIA")
            idx_dt = col_idx.get("DT_GERACAO")

            if None in (idx_uf, idx_cd, idx_nm, idx_qt):
                raise ValueError(f"Colunas esperadas não encontradas no CSV do TSE: {header[:10]}")

            parsed_dt = False
            for row in reader:
                if len(row) <= max(idx_uf, idx_cd, idx_nm, idx_qt):
                    continue
                if not parsed_dt and idx_dt is not None and len(row) > idx_dt:
                    dt_str = row[idx_dt].strip()
                    parts = dt_str.split("/")
                    if len(parts) == 3 and parts[1].isdigit() and parts[2].isdigit():
                        mes_ref = int(parts[1])
                        ano_ref = int(parts[2])
                        parsed_dt = True

                cd = row[idx_cd].strip()
                uf = row[idx_uf].strip().upper()
                nm = row[idx_nm].strip()
                try:
                    qt = int(row[idx_qt])
                except ValueError:
                    qt = 0
                bio = 0
                if idx_bio is not None and len(row) > idx_bio:
                    try:
                        bio = int(row[idx_bio])
                    except ValueError:
                        bio = 0

                entry = by_code.get(cd)
                if entry is None:
                    by_code[cd] = {"uf": uf, "nome": nm, "eleitores": qt, "biometria": bio}
                    by_uf_nome[f"{uf}|{_normalize_text(nm)}"] = cd
                else:
                    entry["eleitores"] += qt
                    entry["biometria"] += bio

    index_data = {
        "last_modified": last_modified,
        "ano_referencia": ano_ref,
        "mes_referencia": mes_ref,
        "by_code": by_code,
        "by_uf_nome": by_uf_nome,
    }
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    tmp_json = CACHE_INDEX_PATH.with_suffix(".tmp")
    tmp_json.write_text(json.dumps(index_data, ensure_ascii=False), encoding="utf-8")
    tmp_json.replace(CACHE_INDEX_PATH)
    return index_data


async def _load_or_refresh_tse_index(client: httpx.AsyncClient) -> dict[str, Any]:
    remote_last_modified = ""
    try:
        head_resp = await client.head(TSE_PERFIL_ATUAL_URL, timeout=15.0)
        if head_resp.status_code == 200:
            remote_last_modified = head_resp.headers.get("Last-Modified", "")
    except Exception:
        remote_last_modified = ""

    if CACHE_INDEX_PATH.exists():
        try:
            cached = json.loads(CACHE_INDEX_PATH.read_text(encoding="utf-8"))
            if not remote_last_modified or cached.get("last_modified") == remote_last_modified:
                return cached
        except Exception:
            pass

    fd, tmp_zip = tempfile.mkstemp(prefix="tse_perfil_", suffix=".zip")
    os.close(fd)
    try:
        async with client.stream("GET", TSE_PERFIL_ATUAL_URL, timeout=120.0) as resp:
            resp.raise_for_status()
            if not remote_last_modified:
                remote_last_modified = resp.headers.get("Last-Modified", "")
            with open(tmp_zip, "wb") as f:
                async for chunk in resp.aiter_bytes(chunk_size=1024 * 1024):
                    f.write(chunk)
        return await asyncio.to_thread(_parse_tse_zip_to_index, tmp_zip, remote_last_modified)
    finally:
        if os.path.exists(tmp_zip):
            try:
                os.remove(tmp_zip)
            except OSError:
                pass


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
    index_data = await _load_or_refresh_tse_index(client)
    by_code: dict[str, dict[str, Any]] = index_data.get("by_code", {})
    by_uf_nome: dict[str, str] = index_data.get("by_uf_nome", {})

    cd_found: Optional[str] = None
    if codigo_tse is not None and str(codigo_tse) in by_code:
        cd_found = str(codigo_tse)
    else:
        key = f"{uf.strip().upper()}|{_normalize_text(nome_municipio)}"
        cd_found = by_uf_nome.get(key)

    if not cd_found or cd_found not in by_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Município '{nome_municipio}/{uf}' não localizado na base aberta do TSE.",
        )

    entry = by_code[cd_found]
    total_eleitores = int(entry.get("eleitores", 0))
    total_biometria = int(entry.get("biometria", 0))
    ano_ref = int(index_data.get("ano_referencia", datetime.now(timezone.utc).year))
    mes_ref = int(index_data.get("mes_referencia", datetime.now(timezone.utc).month))
    cod_tse_retornado = int(cd_found) if cd_found.isdigit() else codigo_tse

    return total_eleitores, total_biometria, ano_ref, mes_ref, cod_tse_retornado, TSE_PERFIL_ATUAL_URL


@integracao_router.post("/conferir-municipio/{id_municipio}", response_model=ConferenciaUniversoResponse)
async def conferir_e_sincronizar_municipio(
    id_municipio: int,
    payload: Optional[ConferenciaRequest] = Body(default=None),
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

    # Resolve usuário conectado e organização para gravar as chaves em eleitorado_tse
    resolved_user_id: Optional[int] = None
    resolved_org_id: Optional[int] = None
    if payload and payload.id_usuario:
        u_res = await session.execute(
            text("SELECT id_usuario, id_organizacao FROM public.usuarios WHERE id_usuario = :uid LIMIT 1"),
            {"uid": payload.id_usuario},
        )
        u_row = u_res.mappings().first()
        if u_row:
            resolved_user_id = int(u_row["id_usuario"])
            resolved_org_id = int(u_row["id_organizacao"]) if u_row["id_organizacao"] else None

    if resolved_user_id is None and payload and payload.email_usuario:
        u_res = await session.execute(
            text("SELECT id_usuario, id_organizacao FROM public.usuarios WHERE LOWER(email) = LOWER(:email) LIMIT 1"),
            {"email": payload.email_usuario.strip()},
        )
        u_row = u_res.mappings().first()
        if u_row:
            resolved_user_id = int(u_row["id_usuario"])
            resolved_org_id = int(u_row["id_organizacao"]) if u_row["id_organizacao"] else None

    if resolved_user_id is None:
        u_res = await session.execute(
            text("SELECT id_usuario, id_organizacao FROM public.usuarios ORDER BY id_usuario ASC LIMIT 1")
        )
        u_row = u_res.mappings().first()
        if u_row:
            resolved_user_id = int(u_row["id_usuario"])
            resolved_org_id = int(u_row["id_organizacao"]) if u_row["id_organizacao"] else None

    if payload and payload.id_organizacao:
        resolved_org_id = payload.id_organizacao
    if resolved_org_id is None:
        resolved_org_id = 1

    if id_registro > 0:
        await session.execute(
            text(
                """
                UPDATE public.eleitorado_tse
                SET id_usuario_captura = :id_usuario,
                    id_organizacao = :id_organizacao
                WHERE id_eleitorado_tse = :id_registro
                """
            ),
            {
                "id_usuario": resolved_user_id,
                "id_organizacao": resolved_org_id,
                "id_registro": id_registro,
            },
        )

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
        id_usuario_captura=resolved_user_id,
        id_organizacao=resolved_org_id,
        hash_auditoria_sha256=hash_sha256,
        status_conferencia=status_conf,
        divergencia_percentual=divergencia_pct,
    )


@integracao_router.get("/historico-tse-ibge")
async def listar_historico_tse_ibge(
    id_municipio: Optional[int] = None,
    tipo_captura: Optional[str] = None,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    conditions = ["1 = 1"]
    params: dict[str, Any] = {}
    if id_municipio is not None:
        conditions.append("et.id_municipio = :id_municipio")
        params["id_municipio"] = id_municipio
    if tipo_captura:
        conditions.append("et.tipo_captura = :tipo_captura")
        params["tipo_captura"] = tipo_captura.strip().lower()

    where_clause = " AND ".join(conditions)
    res = await session.execute(
        text(
            f"""
            SELECT et.id_eleitorado_tse, et.id_municipio, et.id_bairro,
                   et.ano_referencia, et.mes_referencia,
                   et.zona_eleitoral, et.secao_eleitoral,
                   et.quantidade_eleitores, et.eleitores_biometria,
                   et.populacao_ibge, et.ano_censo_ibge,
                   et.tipo_captura, et.fonte_endpoint,
                   et.id_usuario_captura, et.id_organizacao, et.data_captura,
                   et.hash_origem,
                   m.nome AS municipio_nome, e.sigla AS uf,
                   m.codigo_ibge, m.codigo_tse,
                   b.nome_bairro, u.nome AS usuario_nome,
                   o.nome_fantasia AS organizacao_nome,
                   (SELECT COUNT(*) FROM public.amostras a WHERE a.id_eleitorado_tse = et.id_eleitorado_tse) AS amostras_vinculadas
            FROM public.eleitorado_tse et
            JOIN public.municipios m ON m.id_municipio = et.id_municipio
            JOIN public.estados e ON e.id_estado = m.id_estado
            LEFT JOIN public.bairros_ibge b ON b.id_bairro = et.id_bairro
            LEFT JOIN public.usuarios u ON u.id_usuario = et.id_usuario_captura
            LEFT JOIN public.organizacoes o ON o.id_organizacao = et.id_organizacao
            WHERE {where_clause}
            ORDER BY et.ano_referencia DESC, et.mes_referencia DESC, et.data_captura DESC, et.id_eleitorado_tse DESC
            """
        ),
        params,
    )
    rows = [dict(r) for r in res.mappings().all()]
    return {
        "total": len(rows),
        "registros": rows,
    }
