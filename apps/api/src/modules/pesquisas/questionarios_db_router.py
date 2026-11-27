"""Rotas CRUD completas para a arquitetura de Questionários:
- Repositório reutilizável: perguntas, perguntas_grupos_opcoes, opcoes_resposta, perguntas_itens_bateria
- Instância aplicada à pesquisa (versionada por codigo_versao): questionarios, questionario_perguntas, cenarios_pesquisa
"""

import asyncio
import base64
import hashlib
import json
from typing import Any
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.modules.pesquisas.tenant_context import TenantContext, get_tenant_context
from src.services.gcs import get_gcs_service

questionarios_db_router = APIRouter(
    prefix="/api/v1/questionarios-db",
    tags=["Questionários & Repositório Reutilizável (PostgreSQL)"],
)


# --- Schemas ---
class GrupoOpcaoCreate(BaseModel):
    nome_grupo: str
    tipo_escala: str = "nominal"
    descricao: str | None = None


class OpcaoRespostaCreate(BaseModel):
    id_grupo_opcao: int
    rotulo: str
    valor_numerico: int | None = None
    codigo_valor: int | None = None
    ordem: int | None = None
    ordem_exibicao: int | None = None


class PerguntaCreate(BaseModel):
    enunciado: str
    tipo_pergunta: str | None = None
    tipo_questao: str | None = None
    identificador_tecnico: str | None = None
    id_grupo_opcao: int | None = None
    obrigatoria: bool = True


class PerguntaUpdate(BaseModel):
    enunciado: str | None = None
    tipo_pergunta: str | None = None
    tipo_questao: str | None = None
    id_grupo_opcao: int | None = None


class ItemBateriaCreate(BaseModel):
    id_pergunta: int
    descricao_item: str | None = None
    rotulo_item: str | None = None
    ordem: int = 1


class ItemBateriaUpdate(BaseModel):
    id_pergunta: int | None = None
    descricao_item: str | None = None
    rotulo_item: str | None = None
    ordem: int | None = None


class QuestionarioCreate(BaseModel):
    id_pesquisa: int
    titulo: str
    codigo_versao: str = "v1.0"
    ativo: bool = True


class QuestionarioPerguntaCreate(BaseModel):
    id_questionario: int
    id_pergunta: int
    id_cenario: int | None = None
    ordem: int = 1
    bloco: str | None = None
    secao_bloco: str | None = None
    obrigatoria: bool = True
    id_usuario: int | None = None


class QuestionarioPerguntaUpdate(BaseModel):
    id_cenario: int | None = None
    ordem: int | None = None
    obrigatoria: bool | None = None
    secao_bloco: str | None = None


class RespostaItemCreate(BaseModel):
    id_questionario_pergunta: int
    id_cenario: int | None = None
    id_opcao: int | None = None
    id_candidato_produto: int | None = None
    id_item_bateria: int | None = None
    tipo_registro: str = "likert"
    codigo_especial: str | None = None
    valor_texto: str | None = None


class EntrevistaCreate(BaseModel):
    id_pesquisa: int
    id_questionario: int
    id_pesquisador: int | None = None
    respostas: list[RespostaItemCreate]


class CenarioPesquisaCreate(BaseModel):
    id_pesquisa: int
    identificador: str
    tipo_cenario: str = "estimulado"
    cargo_disputa: str | None = "Prefeito"
    ativo: bool = True


class CenarioCandidatoCreate(BaseModel):
    id_cenario: int
    id_candidato_produto: int
    ordem_apresentacao: int = 1


class CandidatoProdutoCreate(BaseModel):
    nome_urna_comercial: str
    nome_completo_razao: str | None = None
    tipo: str = "candidato"
    numero_partido: int | None = None
    sigla_partido_marca: str | None = None
    cargo_categoria: str = "Prefeito"
    cor_hex: str | None = "#3b82f6"
    foto_url: str | None = None
    ativo: bool = True


@questionarios_db_router.get("/resumo")
async def get_questionarios_resumo(
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> dict[str, Any]:
    tid = tenant.tenant_id
    pesquisas = (
        await session.execute(
            text("SELECT id_pesquisa, nome, status::text FROM public.pesq_pesquisas WHERE id_organizacao = :tid ORDER BY id_pesquisa DESC"),
            {"tid": tid},
        )
    ).mappings().all()

    grupos = (
        await session.execute(
            text("SELECT * FROM public.form_perguntas_grupos_opcoes WHERE id_organizacao = :tid ORDER BY id_grupo_opcao ASC"),
            {"tid": tid},
        )
    ).mappings().all()

    opcoes = (
        await session.execute(
            text(
                """
                SELECT o.*, g.nome_grupo
                FROM public.form_opcoes_resposta o
                LEFT JOIN public.form_perguntas_grupos_opcoes g ON g.id_grupo_opcao = o.id_grupo_opcao
                WHERE o.id_organizacao = :tid
                ORDER BY o.id_grupo_opcao ASC, o.id_opcao ASC
                """
            ),
            {"tid": tid},
        )
    ).mappings().all()

    perguntas = (
        await session.execute(
            text(
                """
                SELECT p.*, g.nome_grupo, g.tipo_escala
                FROM public.form_perguntas p
                LEFT JOIN public.form_perguntas_grupos_opcoes g ON g.id_grupo_opcao = p.id_grupo_opcao
                WHERE p.id_organizacao = :tid
                ORDER BY p.id_pergunta ASC
                """
            ),
            {"tid": tid},
        )
    ).mappings().all()

    itens_bateria = (
        await session.execute(
            text(
                """
                SELECT ib.*, ib.descricao_item AS rotulo_item, p.enunciado AS pergunta_enunciado
                FROM public.form_perguntas_itens_bateria ib
                LEFT JOIN public.form_perguntas p ON p.id_pergunta = ib.id_pergunta
                WHERE ib.id_organizacao = :tid
                ORDER BY ib.id_pergunta ASC, ib.ordem ASC, ib.id_item_bateria ASC
                """
            ),
            {"tid": tid},
        )
    ).mappings().all()

    questionarios = (
        await session.execute(
            text(
                """
                SELECT q.*, pe.nome AS pesquisa_nome
                FROM public.form_questionarios q
                LEFT JOIN public.pesq_pesquisas pe ON pe.id_pesquisa = q.id_pesquisa
                WHERE q.id_organizacao = :tid
                ORDER BY q.id_questionario DESC
                """
            ),
            {"tid": tid},
        )
    ).mappings().all()

    qp_links = (
        await session.execute(
            text(
                """
                SELECT qp.*, p.enunciado, p.tipo_questao, p.id_grupo_opcao,
                       g.nome_grupo, g.tipo_escala, u.nome AS usuario_nome,
                       cp.identificador AS cenario_identificador, cp.tipo_cenario AS cenario_tipo
                FROM public.form_questionario_perguntas qp
                LEFT JOIN public.form_perguntas p ON p.id_pergunta = qp.id_pergunta
                LEFT JOIN public.form_perguntas_grupos_opcoes g ON g.id_grupo_opcao = p.id_grupo_opcao
                LEFT JOIN public.sys_usuarios u ON u.id_usuario = qp.id_usuario
                LEFT JOIN public.pesq_cenarios_pesquisa cp ON cp.id_cenario = qp.id_cenario
                WHERE qp.id_organizacao = :tid
                ORDER BY qp.id_questionario ASC, COALESCE(qp.id_cenario, 999999) ASC, qp.ordem ASC
                """
            ),
            {"tid": tid},
        )
    ).mappings().all()

    cenarios = (
        await session.execute(
            text(
                """
                SELECT c.*, pe.nome AS pesquisa_nome
                FROM public.pesq_cenarios_pesquisa c
                LEFT JOIN public.pesq_pesquisas pe ON pe.id_pesquisa = c.id_pesquisa
                WHERE c.id_organizacao = :tid
                ORDER BY c.id_pesquisa DESC, c.id_cenario ASC
                """
            ),
            {"tid": tid},
        )
    ).mappings().all()

    candidatos = (
        await session.execute(
            text(
                """
                SELECT *
                FROM public.pesq_candidatos_produtos
                WHERE id_organizacao = :tid
                ORDER BY id_candidato_produto ASC
                """
            ),
            {"tid": tid},
        )
    ).mappings().all()

    cenario_candidatos = (
        await session.execute(
            text(
                """
                SELECT cc.*, cp.nome_urna_comercial, cp.sigla_partido_marca, cp.cargo_categoria, cp.foto_url
                FROM public.pesq_cenario_candidatos cc
                LEFT JOIN public.pesq_candidatos_produtos cp ON cp.id_candidato_produto = cc.id_candidato_produto
                WHERE cc.id_organizacao = :tid
                ORDER BY cc.id_cenario ASC, cc.ordem_apresentacao ASC
                """
            ),
            {"tid": tid},
        )
    ).mappings().all()

    candidatos_list = [dict(r) for r in candidatos]
    cc_list = [dict(r) for r in cenario_candidatos]
    for row in candidatos_list:
        cid = row.get("id_candidato_produto")
        val = row.get("foto_url") or row.get("imagem_url") or row.get("url_foto")
        if cid and isinstance(val, str) and val.strip() and not _is_proxy_foto_url(val):
            ver = hashlib.md5(val.encode("utf-8")).hexdigest()[:8]
            row["foto_url"] = f"http://127.0.0.1:8000/api/v1/questionarios-db/candidatos/{cid}/foto?v={ver}"
        elif isinstance(val, str) and _is_proxy_foto_url(val):
            row["foto_url"] = None
    for row in cc_list:
        cid = row.get("id_candidato_produto")
        val = row.get("foto_url")
        if cid and isinstance(val, str) and val.strip() and not _is_proxy_foto_url(val):
            ver = hashlib.md5(val.encode("utf-8")).hexdigest()[:8]
            row["foto_url"] = f"http://127.0.0.1:8000/api/v1/questionarios-db/candidatos/{cid}/foto?v={ver}"
        elif isinstance(val, str) and _is_proxy_foto_url(val):
            row["foto_url"] = None

    return {
        "pesquisas": [dict(r) for r in pesquisas],
        "grupos_opcoes": [dict(r) for r in grupos],
        "opcoes_resposta": [dict(r) for r in opcoes],
        "perguntas": [dict(r) for r in perguntas],
        "itens_bateria": [dict(r) for r in itens_bateria],
        "questionarios": [dict(r) for r in questionarios],
        "questionario_perguntas": [dict(r) for r in qp_links],
        "cenarios_pesquisa": [dict(r) for r in cenarios],
        "candidatos": candidatos_list,
        "cenario_candidatos": cc_list,
    }


# --- Repositório Reutilizável ---
@questionarios_db_router.post("/grupos-opcoes", status_code=status.HTTP_201_CREATED)
async def create_grupo_opcao(
    payload: GrupoOpcaoCreate,
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> dict[str, Any]:
    res = await session.execute(
        text(
            """
            INSERT INTO public.form_perguntas_grupos_opcoes (nome_grupo, tipo_escala, id_organizacao)
            VALUES (:nome_grupo, :tipo_escala, :tid)
            RETURNING *
            """
        ),
        {
            "nome_grupo": payload.nome_grupo.strip(),
            "tipo_escala": payload.tipo_escala.strip(),
            "tid": tenant.tenant_id,
        },
    )
    await session.commit()
    return dict(res.mappings().first() or {})


@questionarios_db_router.put("/grupos-opcoes/{id_grupo_opcao}")
async def update_grupo_opcao(
    id_grupo_opcao: int,
    payload: GrupoOpcaoCreate,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    nome = payload.nome_grupo.strip()
    if not nome:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O nome do grupo de opções não pode ser vazio.",
        )
    res = await session.execute(
        text(
            """
            UPDATE public.form_perguntas_grupos_opcoes
            SET nome_grupo = :nome_grupo,
                tipo_escala = :tipo_escala
            WHERE id_grupo_opcao = :id
            RETURNING *
            """
        ),
        {
            "id": id_grupo_opcao,
            "nome_grupo": nome,
            "tipo_escala": payload.tipo_escala.strip() or "nominal",
        },
    )
    row = res.mappings().first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Grupo de opções #{id_grupo_opcao} não encontrado.",
        )
    await session.commit()
    return dict(row)


@questionarios_db_router.delete("/grupos-opcoes/{id_grupo_opcao}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grupo_opcao(
    id_grupo_opcao: int,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    try:
        await session.execute(
            text("DELETE FROM public.form_perguntas_grupos_opcoes WHERE id_grupo_opcao = :id"),
            {"id": id_grupo_opcao},
        )
        await session.commit()
    except Exception as exc:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail="Não é possível excluir grupo vinculado a perguntas ou opções.",
        ) from exc


@questionarios_db_router.post("/opcoes-resposta", status_code=status.HTTP_201_CREATED)
async def create_opcao_resposta(
    payload: OpcaoRespostaCreate,
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> dict[str, Any]:
    codigo_valor = payload.codigo_valor if payload.codigo_valor is not None else payload.valor_numerico
    ordem_exibicao = payload.ordem_exibicao if payload.ordem_exibicao is not None else (payload.ordem or 1)
    res = await session.execute(
        text(
            """
            INSERT INTO public.form_opcoes_resposta (id_grupo_opcao, rotulo, codigo_valor, ordem_exibicao, id_organizacao)
            VALUES (:id_grupo_opcao, :rotulo, :codigo_valor, :ordem_exibicao, :tid)
            RETURNING *
            """
        ),
        {
            "id_grupo_opcao": payload.id_grupo_opcao,
            "rotulo": payload.rotulo.strip(),
            "codigo_valor": codigo_valor,
            "ordem_exibicao": ordem_exibicao,
            "tid": tenant.tenant_id,
        },
    )
    await session.commit()
    return dict(res.mappings().first() or {})


@questionarios_db_router.put("/opcoes-resposta/{id_opcao}")
async def update_opcao_resposta(
    id_opcao: int,
    payload: OpcaoRespostaCreate,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    rotulo = payload.rotulo.strip()
    if not rotulo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O rótulo da opção de resposta não pode ser vazio.",
        )
    codigo_valor = payload.codigo_valor if payload.codigo_valor is not None else payload.valor_numerico
    ordem_exibicao = payload.ordem_exibicao if payload.ordem_exibicao is not None else (payload.ordem or 1)
    res = await session.execute(
        text(
            """
            UPDATE public.form_opcoes_resposta
            SET id_grupo_opcao = :id_grupo_opcao,
                rotulo = :rotulo,
                codigo_valor = :codigo_valor,
                ordem_exibicao = :ordem_exibicao
            WHERE id_opcao = :id
            RETURNING *
            """
        ),
        {
            "id": id_opcao,
            "id_grupo_opcao": payload.id_grupo_opcao,
            "rotulo": rotulo,
            "codigo_valor": codigo_valor,
            "ordem_exibicao": ordem_exibicao,
        },
    )
    row = res.mappings().first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Opção de resposta #{id_opcao} não encontrada.",
        )
    await session.commit()
    return dict(row)


@questionarios_db_router.delete("/opcoes-resposta/{id_opcao}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_opcao_resposta(
    id_opcao: int,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    await session.execute(
        text("DELETE FROM public.form_opcoes_resposta WHERE id_opcao = :id"),
        {"id": id_opcao},
    )
    await session.commit()


@questionarios_db_router.get("/perguntas")
async def list_perguntas(
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> list[dict[str, Any]]:
    res = await session.execute(
        text(
            """
            SELECT
                p.*,
                g.nome_grupo,
                g.tipo_escala,
                COALESCE(qp_cnt.total, 0) AS questionarios_vinculados
            FROM public.form_perguntas p
            LEFT JOIN public.form_perguntas_grupos_opcoes g ON g.id_grupo_opcao = p.id_grupo_opcao
            LEFT JOIN (
                SELECT id_pergunta, COUNT(DISTINCT id_questionario)::int AS total
                FROM public.form_questionario_perguntas
                GROUP BY id_pergunta
            ) qp_cnt ON qp_cnt.id_pergunta = p.id_pergunta
            WHERE p.id_organizacao = :tid
            ORDER BY p.id_pergunta ASC
            """
        ),
        {"tid": tenant.tenant_id},
    )
    return [dict(r) for r in res.mappings().all()]


_VALID_TIPOS_QUESTAO = {
    "unica_escolha",
    "multipla_escolha",
    "matriz_bateria",
    "ranking",
    "texto_livre",
}


def _normalize_tipo_questao(raw: str | None) -> str:
    val = (raw or "").strip().lower()
    if val in _VALID_TIPOS_QUESTAO:
        return val
    mapping = {
        "estimulada": "unica_escolha",
        "espontanea": "texto_livre",
        "espontânea": "texto_livre",
        "rejeicao": "multipla_escolha",
        "rejeição": "multipla_escolha",
        "bateria": "matriz_bateria",
        "matriz": "matriz_bateria",
        "aberta": "texto_livre",
        "texto": "texto_livre",
    }
    return mapping.get(val, "unica_escolha")


@questionarios_db_router.post("/perguntas", status_code=status.HTTP_201_CREATED)
async def create_pergunta(
    payload: PerguntaCreate,
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> dict[str, Any]:
    enunciado = payload.enunciado.strip()
    if not enunciado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O enunciado da pergunta é obrigatório.",
        )
    tipo_questao = _normalize_tipo_questao(payload.tipo_questao or payload.tipo_pergunta)
    ident_raw = (payload.identificador_tecnico or "").strip()
    if not ident_raw:
        digest = hashlib.md5(f"{enunciado}:{tipo_questao}".encode("utf-8")).hexdigest()[:8].upper()
        ident_raw = f"PERG_{digest}"
    res = await session.execute(
        text(
            """
            INSERT INTO public.form_perguntas (identificador_tecnico, enunciado, tipo_questao, id_grupo_opcao, id_organizacao)
            VALUES (:identificador_tecnico, :enunciado, :tipo_questao, :id_grupo_opcao, :tid)
            RETURNING *
            """
        ),
        {
            "identificador_tecnico": ident_raw,
            "enunciado": enunciado,
            "tipo_questao": tipo_questao,
            "id_grupo_opcao": payload.id_grupo_opcao,
            "tid": tenant.tenant_id,
        },
    )
    await session.commit()
    return dict(res.mappings().first() or {})


async def _update_pergunta_impl(
    id_pergunta: int,
    payload: PerguntaUpdate,
    session: AsyncSession,
) -> dict[str, Any]:
    existing_res = await session.execute(
        text("SELECT * FROM public.form_perguntas WHERE id_pergunta = :id"),
        {"id": id_pergunta},
    )
    existing = existing_res.mappings().first()
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pergunta não encontrada.",
        )

    fields_set = payload.model_fields_set
    enunciado = (
        payload.enunciado.strip()
        if "enunciado" in fields_set and payload.enunciado is not None
        else existing["enunciado"]
    )
    if not enunciado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O enunciado da pergunta é obrigatório.",
        )
    if "tipo_questao" in fields_set and payload.tipo_questao is not None:
        tipo_questao = _normalize_tipo_questao(payload.tipo_questao)
    elif "tipo_pergunta" in fields_set and payload.tipo_pergunta is not None:
        tipo_questao = _normalize_tipo_questao(payload.tipo_pergunta)
    else:
        tipo_questao = existing["tipo_questao"]
    id_grupo_opcao = (
        payload.id_grupo_opcao
        if "id_grupo_opcao" in fields_set
        else existing["id_grupo_opcao"]
    )

    res = await session.execute(
        text(
            """
            UPDATE public.form_perguntas
            SET enunciado = :enunciado,
                tipo_questao = :tipo_questao,
                id_grupo_opcao = :id_grupo_opcao
            WHERE id_pergunta = :id
            RETURNING *
            """
        ),
        {
            "id": id_pergunta,
            "enunciado": enunciado,
            "tipo_questao": tipo_questao,
            "id_grupo_opcao": id_grupo_opcao,
        },
    )
    await session.commit()
    return dict(res.mappings().first() or {})


@questionarios_db_router.put("/perguntas/{id_pergunta}")
async def update_pergunta(
    id_pergunta: int,
    payload: PerguntaUpdate,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    return await _update_pergunta_impl(id_pergunta, payload, session)


@questionarios_db_router.patch("/perguntas/{id_pergunta}")
async def patch_pergunta(
    id_pergunta: int,
    payload: PerguntaUpdate,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    return await _update_pergunta_impl(id_pergunta, payload, session)


@questionarios_db_router.delete("/perguntas/{id_pergunta}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pergunta(
    id_pergunta: int,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    cnt_res = await session.execute(
        text(
            """
            SELECT COUNT(DISTINCT id_questionario)::int
            FROM public.form_questionario_perguntas
            WHERE id_pergunta = :id
            """
        ),
        {"id": id_pergunta},
    )
    vinculos = cnt_res.scalar_one() or 0
    if vinculos > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Não é possível excluir: esta pergunta já está vinculada a {vinculos} questionário(s).",
        )

    try:
        await session.execute(
            text("DELETE FROM public.form_perguntas WHERE id_pergunta = :id"),
            {"id": id_pergunta},
        )
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível excluir pergunta vinculada a questionários ou respostas coletadas.",
        ) from exc
    except Exception as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível excluir pergunta vinculada a um questionário.",
        ) from exc


@questionarios_db_router.post("/itens-bateria", status_code=status.HTTP_201_CREATED)
async def create_item_bateria(
    payload: ItemBateriaCreate,
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> dict[str, Any]:
    descricao = (payload.descricao_item or payload.rotulo_item or "").strip()
    if not descricao:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A descrição do item de bateria é obrigatória.",
        )
    res = await session.execute(
        text(
            """
            INSERT INTO public.form_perguntas_itens_bateria (id_pergunta, descricao_item, ordem, id_organizacao)
            VALUES (:id_pergunta, :descricao_item, :ordem, :tid)
            RETURNING *, descricao_item AS rotulo_item
            """
        ),
        {
            "id_pergunta": payload.id_pergunta,
            "descricao_item": descricao,
            "ordem": payload.ordem,
            "tid": tenant.tenant_id,
        },
    )
    await session.commit()
    return dict(res.mappings().first() or {})


@questionarios_db_router.put("/itens-bateria/{id_item_bateria}")
async def update_item_bateria(
    id_item_bateria: int,
    payload: ItemBateriaCreate,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    descricao = (payload.descricao_item or payload.rotulo_item or "").strip()
    if not descricao:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O rótulo do item de bateria não pode ser vazio.",
        )
    res = await session.execute(
        text(
            """
            UPDATE public.form_perguntas_itens_bateria
            SET id_pergunta = :id_pergunta,
                descricao_item = :descricao_item,
                ordem = :ordem
            WHERE id_item_bateria = :id
            RETURNING *, descricao_item AS rotulo_item
            """
        ),
        {
            "id": id_item_bateria,
            "id_pergunta": payload.id_pergunta,
            "descricao_item": descricao,
            "ordem": payload.ordem,
        },
    )
    row = res.mappings().first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item de bateria #{id_item_bateria} não encontrado.",
        )
    await session.commit()
    return dict(row)


@questionarios_db_router.patch("/itens-bateria/{id_item_bateria}")
async def patch_item_bateria(
    id_item_bateria: int,
    payload: ItemBateriaUpdate,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    existing_res = await session.execute(
        text("SELECT * FROM public.form_perguntas_itens_bateria WHERE id_item_bateria = :id"),
        {"id": id_item_bateria},
    )
    existing = existing_res.mappings().first()
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item de bateria #{id_item_bateria} não encontrado.",
        )
    fields_set = payload.model_fields_set
    new_id_pergunta = (
        payload.id_pergunta
        if "id_pergunta" in fields_set and payload.id_pergunta is not None
        else existing["id_pergunta"]
    )
    if "descricao_item" in fields_set and payload.descricao_item is not None:
        new_desc = payload.descricao_item.strip()
    elif "rotulo_item" in fields_set and payload.rotulo_item is not None:
        new_desc = payload.rotulo_item.strip()
    else:
        new_desc = existing["descricao_item"]
    if not new_desc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A descrição do item de bateria não pode ser vazia.",
        )
    new_ordem = (
        payload.ordem
        if "ordem" in fields_set and payload.ordem is not None
        else existing["ordem"]
    )
    res = await session.execute(
        text(
            """
            UPDATE public.form_perguntas_itens_bateria
            SET id_pergunta = :id_pergunta,
                descricao_item = :descricao_item,
                ordem = :ordem
            WHERE id_item_bateria = :id
            RETURNING *, descricao_item AS rotulo_item
            """
        ),
        {
            "id": id_item_bateria,
            "id_pergunta": new_id_pergunta,
            "descricao_item": new_desc,
            "ordem": new_ordem,
        },
    )
    await session.commit()
    return dict(res.mappings().first() or {})


@questionarios_db_router.delete("/itens-bateria/{id_item_bateria}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item_bateria(
    id_item_bateria: int,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    await session.execute(
        text("DELETE FROM public.form_perguntas_itens_bateria WHERE id_item_bateria = :id"),
        {"id": id_item_bateria},
    )
    await session.commit()


# --- Instância Aplicada à Pesquisa (1 Formulário único por Pesquisa) ---
@questionarios_db_router.post("/questionarios", status_code=status.HTTP_201_CREATED)
async def create_questionario(
    payload: QuestionarioCreate,
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> dict[str, Any]:
    existing_q = await session.execute(
        text(
            """
            SELECT id_questionario
            FROM public.form_questionarios
            WHERE id_pesquisa = :id_pesquisa
            LIMIT 1
            """
        ),
        {"id_pesquisa": payload.id_pesquisa},
    )
    if existing_q.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta pesquisa já possui um formulário cadastrado. Cada pesquisa pode ter apenas um formulário.",
        )

    try:
        res = await session.execute(
            text(
                """
                INSERT INTO public.form_questionarios (id_pesquisa, titulo, codigo_versao, ativo, id_organizacao)
                VALUES (:id_pesquisa, :titulo, :codigo_versao, :ativo, :tid)
                RETURNING *
                """
            ),
            {
                "id_pesquisa": payload.id_pesquisa,
                "titulo": payload.titulo.strip(),
                "codigo_versao": payload.codigo_versao.strip() or "v1.0",
                "ativo": payload.ativo,
                "tid": tenant.tenant_id,
            },
        )
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        orig = getattr(exc, "orig", None)
        pgcode = getattr(orig, "pgcode", None)
        sqlstate = getattr(orig, "sqlstate", None)
        err_msg = str(exc).lower()
        if pgcode == "23505" or sqlstate == "23505" or "unique" in err_msg or "duplicate" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Esta pesquisa já possui um formulário cadastrado. Cada pesquisa pode ter apenas um formulário.",
            ) from exc
        raise
    return dict(res.mappings().first() or {})


@questionarios_db_router.delete("/questionarios/{id_questionario}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_questionario(
    id_questionario: int,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    try:
        await session.execute(
            text("DELETE FROM public.form_questionario_perguntas WHERE id_questionario = :id"),
            {"id": id_questionario},
        )
        await session.execute(
            text("DELETE FROM public.form_questionarios WHERE id_questionario = :id"),
            {"id": id_questionario},
        )
        await session.commit()
    except Exception as exc:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail="Não é possível excluir questionário que já possui entrevistas coletadas.",
        ) from exc


@questionarios_db_router.post("/questionario-perguntas", status_code=status.HTTP_201_CREATED)
async def create_questionario_pergunta(
    payload: QuestionarioPerguntaCreate,
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> dict[str, Any]:
    existing = await session.execute(
        text(
            """
            SELECT 1
            FROM public.form_questionario_perguntas
            WHERE id_questionario = :id_questionario
              AND id_pergunta = :id_pergunta
              AND COALESCE(id_cenario, 0) = COALESCE(:id_cenario, 0)
            LIMIT 1
            """
        ),
        {
            "id_questionario": payload.id_questionario,
            "id_pergunta": payload.id_pergunta,
            "id_cenario": payload.id_cenario,
        },
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta pergunta já está vinculada a este questionário neste cenário.",
        )

    uid = payload.id_usuario or tenant.user_id
    if uid is None:
        u_res = await session.execute(text("SELECT id_usuario FROM public.sys_usuarios ORDER BY id_usuario ASC LIMIT 1"))
        uid = u_res.scalar_one_or_none()

    ordem_final = payload.ordem
    ordem_exists = await session.execute(
        text(
            """
            SELECT 1
            FROM public.form_questionario_perguntas
            WHERE id_questionario = :id_questionario
              AND ordem = :ordem
            LIMIT 1
            """
        ),
        {"id_questionario": payload.id_questionario, "ordem": ordem_final},
    )
    if ordem_exists.scalar_one_or_none() is not None:
        max_res = await session.execute(
            text(
                "SELECT COALESCE(MAX(ordem), 0)::int + 1 FROM public.form_questionario_perguntas WHERE id_questionario = :id_questionario"
            ),
            {"id_questionario": payload.id_questionario},
        )
        ordem_final = int(max_res.scalar_one() or 1)

    secao_bloco = (payload.secao_bloco or payload.bloco or "Bloco Geral").strip() or "Bloco Geral"

    try:
        res = await session.execute(
            text(
                """
                INSERT INTO public.form_questionario_perguntas (
                    id_questionario, id_pergunta, id_cenario, ordem, secao_bloco, obrigatoria, id_usuario, id_organizacao
                )
                VALUES (
                    :id_questionario, :id_pergunta, :id_cenario, :ordem, :secao_bloco, :obrigatoria, :id_usuario, :tid
                )
                RETURNING *
                """
            ),
            {
                "id_questionario": payload.id_questionario,
                "id_pergunta": payload.id_pergunta,
                "id_cenario": payload.id_cenario,
                "ordem": ordem_final,
                "secao_bloco": secao_bloco,
                "obrigatoria": payload.obrigatoria,
                "id_usuario": uid,
                "tid": tenant.tenant_id,
            },
        )
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        orig = getattr(exc, "orig", None)
        pgcode = getattr(orig, "pgcode", None)
        sqlstate = getattr(orig, "sqlstate", None)
        err_msg = str(exc).lower()
        if pgcode == "23505" or sqlstate == "23505" or "unique" in err_msg or "duplicate" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Esta pergunta já está vinculada a este questionário neste cenário ou ordem duplicada.",
            ) from exc
        raise

    return dict(res.mappings().first() or {})


@questionarios_db_router.patch("/questionario-perguntas/{id_questionario_pergunta}")
async def update_questionario_pergunta(
    id_questionario_pergunta: int,
    payload: QuestionarioPerguntaUpdate,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    existing_res = await session.execute(
        text(
            """
            SELECT *
            FROM public.form_questionario_perguntas
            WHERE id_questionario_pergunta = :id
            """
        ),
        {"id": id_questionario_pergunta},
    )
    existing = existing_res.mappings().first()
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vínculo questionario_pergunta #{id_questionario_pergunta} não encontrado.",
        )

    fields_set = payload.model_fields_set
    new_id_cenario = payload.id_cenario if "id_cenario" in fields_set else existing["id_cenario"]
    new_ordem = payload.ordem if "ordem" in fields_set and payload.ordem is not None else existing["ordem"]
    new_obrigatoria = (
        payload.obrigatoria if "obrigatoria" in fields_set and payload.obrigatoria is not None else existing["obrigatoria"]
    )
    new_secao_bloco = (
        (payload.secao_bloco or "Bloco Geral").strip() or "Bloco Geral"
        if "secao_bloco" in fields_set
        else existing["secao_bloco"]
    )

    if "id_cenario" in fields_set:
        dup_res = await session.execute(
            text(
                """
                SELECT 1
                FROM public.form_questionario_perguntas
                WHERE id_questionario = :id_questionario
                  AND id_pergunta = :id_pergunta
                  AND COALESCE(id_cenario, 0) = COALESCE(:id_cenario, 0)
                  AND id_questionario_pergunta <> :id
                LIMIT 1
                """
            ),
            {
                "id_questionario": existing["id_questionario"],
                "id_pergunta": existing["id_pergunta"],
                "id_cenario": new_id_cenario,
                "id": id_questionario_pergunta,
            },
        )
        if dup_res.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Esta pergunta já está vinculada a este questionário neste cenário.",
            )

    try:
        res = await session.execute(
            text(
                """
                UPDATE public.form_questionario_perguntas
                SET id_cenario = :id_cenario,
                    ordem = :ordem,
                    obrigatoria = :obrigatoria,
                    secao_bloco = :secao_bloco
                WHERE id_questionario_pergunta = :id
                RETURNING *
                """
            ),
            {
                "id": id_questionario_pergunta,
                "id_cenario": new_id_cenario,
                "ordem": new_ordem,
                "obrigatoria": new_obrigatoria,
                "secao_bloco": new_secao_bloco,
            },
        )
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não foi possível atualizar a pergunta do formulário (conflito de ordem ou cenário).",
        ) from exc

    return dict(res.mappings().first() or {})


@questionarios_db_router.post("/entrevistas", status_code=status.HTTP_201_CREATED)
async def create_entrevista(
    payload: EntrevistaCreate,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    if not payload.respostas:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envie ao menos uma resposta para registrar a entrevista.",
        )

    pesq_res = await session.execute(
        text(
            """
            SELECT id_pesquisa, is_bloqueada, COALESCE(id_organizacao, 1) AS id_organizacao
            FROM public.pesq_pesquisas
            WHERE id_pesquisa = :id_pesquisa
            """
        ),
        {"id_pesquisa": payload.id_pesquisa},
    )
    pesq = pesq_res.mappings().first()
    if not pesq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pesquisa #{payload.id_pesquisa} não encontrada.",
        )
    if pesq["is_bloqueada"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta pesquisa está bloqueada/lacrada e não aceita novas entrevistas.",
        )

    q_res = await session.execute(
        text(
            """
            SELECT id_questionario
            FROM public.form_questionarios
            WHERE id_questionario = :id_questionario
              AND id_pesquisa = :id_pesquisa
            """
        ),
        {"id_questionario": payload.id_questionario, "id_pesquisa": payload.id_pesquisa},
    )
    if q_res.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Questionário #{payload.id_questionario} não encontrado para a pesquisa #{payload.id_pesquisa}.",
        )

    tenant_id = int(pesq["id_organizacao"] or 1)
    await session.execute(
        text("SELECT set_config('app.current_tenant_id', :tid, true)"),
        {"tid": str(tenant_id)},
    )

    qp_cen_res = await session.execute(
        text(
            """
            SELECT id_questionario_pergunta, id_cenario
            FROM public.form_questionario_perguntas
            WHERE id_questionario = :id_questionario
            """
        ),
        {"id_questionario": payload.id_questionario},
    )
    qp_cenario_map = {int(r["id_questionario_pergunta"]): r["id_cenario"] for r in qp_cen_res.mappings().all()}

    valid_tipos = {"voto_direto", "rejeicao", "likert", "aprovacao", "texto"}
    valid_especiais = {"branco", "nulo", "nao_sabe", "nao_respondeu"}

    try:
        pessoa_res = await session.execute(
            text(
                """
                INSERT INTO public.campo_pessoas (
                    nome, sexo, faixa_etaria, escolaridade, faixa_renda,
                    bairro_distrito, regiao_geografica, id_organizacao
                )
                VALUES (
                    'Entrevistado CAPI', 'F', '25-34', 'Medio', '1 a 2 SM',
                    'Geral', 'Geral', :id_org
                )
                RETURNING id_pessoa
                """
            ),
            {"id_org": tenant_id},
        )
        id_pessoa = int(pessoa_res.scalar_one())

        qp_pessoa_res = await session.execute(
            text(
                """
                INSERT INTO public.campo_questionarios_pessoas (
                    id_questionario, id_pesquisa, id_pessoa, id_pesquisador,
                    peso_amostral, status_auditoria, id_organizacao
                )
                VALUES (
                    :id_questionario, :id_pesquisa, :id_pessoa, :id_pesquisador,
                    1.000000, 'aprovada', :id_org
                )
                RETURNING id_questionario_pessoa
                """
            ),
            {
                "id_questionario": payload.id_questionario,
                "id_pesquisa": payload.id_pesquisa,
                "id_pessoa": id_pessoa,
                "id_pesquisador": payload.id_pesquisador,
                "id_org": tenant_id,
            },
        )
        id_questionario_pessoa = int(qp_pessoa_res.scalar_one())

        saved = 0
        for item in payload.respostas:
            tipo_reg = (item.tipo_registro or "").strip().lower()
            if tipo_reg not in valid_tipos:
                if item.id_candidato_produto is not None:
                    tipo_reg = "voto_direto"
                elif item.valor_texto and item.id_opcao is None:
                    tipo_reg = "texto"
                else:
                    tipo_reg = "likert"

            cod_esp = (item.codigo_especial or "").strip().lower() or None
            if cod_esp is not None and cod_esp not in valid_especiais:
                cod_esp = "nao_respondeu"

            resolved_cenario = (
                item.id_cenario
                if item.id_cenario is not None
                else qp_cenario_map.get(item.id_questionario_pergunta)
            )

            await session.execute(
                text(
                    """
                    INSERT INTO public.campo_respostas (
                        id_questionario_pessoa, id_questionario_pergunta,
                        id_opcao, id_candidato_produto, id_item_bateria, id_cenario,
                        tipo_registro, codigo_especial, valor_texto, id_organizacao
                    )
                    VALUES (
                        :id_qp_pessoa, :id_qp,
                        :id_opcao, :id_candidato, :id_item_bateria, :id_cenario,
                        :tipo_registro, :codigo_especial, :valor_texto, :id_org
                    )
                    """
                ),
                {
                    "id_qp_pessoa": id_questionario_pessoa,
                    "id_qp": item.id_questionario_pergunta,
                    "id_opcao": item.id_opcao,
                    "id_candidato": item.id_candidato_produto,
                    "id_item_bateria": item.id_item_bateria,
                    "id_cenario": resolved_cenario,
                    "tipo_registro": tipo_reg,
                    "codigo_especial": cod_esp,
                    "valor_texto": item.valor_texto.strip() if item.valor_texto else None,
                    "id_org": tenant_id,
                },
            )
            saved += 1

        await session.commit()
    except HTTPException:
        await session.rollback()
        raise
    except Exception as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Falha ao salvar entrevista: {exc}",
        ) from exc

    return {
        "id_questionario_pessoa": id_questionario_pessoa,
        "respostas_salvas": saved,
    }


@questionarios_db_router.delete("/questionario-perguntas/{id_qp}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_questionario_pergunta(
    id_qp: int,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    await session.execute(
        text("DELETE FROM public.form_questionario_perguntas WHERE id_questionario_pergunta = :id"),
        {"id": id_qp},
    )
    await session.commit()


@questionarios_db_router.post("/cenarios-pesquisa", status_code=status.HTTP_201_CREATED)
async def create_cenario_pesquisa(
    payload: CenarioPesquisaCreate,
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> dict[str, Any]:
    res = await session.execute(
        text(
            """
            INSERT INTO public.pesq_cenarios_pesquisa (id_pesquisa, identificador, tipo_cenario, ativo, id_organizacao)
            VALUES (:id_pesquisa, :identificador, :tipo_cenario, :ativo, :tid)
            RETURNING *
            """
        ),
        {
            "id_pesquisa": payload.id_pesquisa,
            "identificador": payload.identificador.strip(),
            "tipo_cenario": payload.tipo_cenario.strip(),
            "ativo": payload.ativo,
            "tid": tenant.tenant_id,
        },
    )
    await session.commit()
    return dict(res.mappings().first() or {})


@questionarios_db_router.delete("/cenarios-pesquisa/{id_cenario}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cenario_pesquisa(
    id_cenario: int,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    try:
        await session.execute(
            text("DELETE FROM public.pesq_cenarios_pesquisa WHERE id_cenario = :id"),
            {"id": id_cenario},
        )
        await session.commit()
    except Exception as exc:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail="Não é possível excluir cenário vinculado a respostas coletadas.",
        ) from exc


@questionarios_db_router.get("/candidatos")
async def list_candidatos_produtos(
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> list[dict[str, Any]]:
    res = await session.execute(
        text(
            """
            SELECT *
            FROM public.pesq_candidatos_produtos
            WHERE id_organizacao = :tid
            ORDER BY id_candidato_produto ASC
            """
        ),
        {"tid": tenant.tenant_id},
    )
    rows = [dict(r) for r in res.mappings().all()]
    for row in rows:
        cid = row.get("id_candidato_produto")
        val = row.get("foto_url") or row.get("imagem_url") or row.get("url_foto")
        if cid and isinstance(val, str) and val.strip() and not _is_proxy_foto_url(val):
            ver = hashlib.md5(val.encode("utf-8")).hexdigest()[:8]
            row["foto_url"] = f"http://127.0.0.1:8000/api/v1/questionarios-db/candidatos/{cid}/foto?v={ver}"
        elif isinstance(val, str) and _is_proxy_foto_url(val):
            row["foto_url"] = None
    return rows


def _is_proxy_foto_url(url: str | None) -> bool:
    if not url:
        return False
    low = url.strip().lower()
    return "/api/v1/questionarios-db/candidatos/" in low and "/foto" in low


@questionarios_db_router.get("/candidatos/{id_candidato_produto}/foto")
async def get_candidato_foto(
    id_candidato_produto: int,
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    res = await session.execute(
        text(
            "SELECT foto_url FROM public.pesq_candidatos_produtos WHERE id_candidato_produto = :id"
        ),
        {"id": id_candidato_produto},
    )
    foto_url = res.scalar_one_or_none()
    if not foto_url or not isinstance(foto_url, str) or _is_proxy_foto_url(foto_url):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Foto não encontrada.")

    gcs = get_gcs_service()
    downloaded = await asyncio.to_thread(gcs.download_file, foto_url)
    if downloaded is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Arquivo de foto não encontrado no GCS.")
    data, content_type = downloaded
    return Response(
        content=data,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=3600",
            "Cross-Origin-Resource-Policy": "cross-origin",
        },
    )


@questionarios_db_router.post("/candidatos", status_code=status.HTTP_201_CREATED)
async def create_candidato_produto(
    payload: CandidatoProdutoCreate,
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> dict[str, Any]:
    nome_urna = payload.nome_urna_comercial.strip()
    if not nome_urna:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O nome de urna / comercial é obrigatório.",
        )

    cols_res = await session.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'pesq_candidatos_produtos'
            """
        )
    )
    existing_cols = {r[0] for r in cols_res.fetchall()}
    has_org = "id_organizacao" in existing_cols
    photo_col = (
        "foto_url"
        if "foto_url" in existing_cols
        else "imagem_url"
        if "imagem_url" in existing_cols
        else "url_foto"
        if "url_foto" in existing_cols
        else None
    )

    cols = [
        "nome_urna_comercial",
        "nome_completo_razao",
        "tipo",
        "numero_partido",
        "sigla_partido_marca",
        "cargo_categoria",
        "cor_hex",
        "ativo",
    ]
    vals = [
        ":nome_urna_comercial",
        ":nome_completo_razao",
        ":tipo",
        ":numero_partido",
        ":sigla_partido_marca",
        ":cargo_categoria",
        ":cor_hex",
        ":ativo",
    ]
    params: dict[str, Any] = {
        "nome_urna_comercial": nome_urna,
        "nome_completo_razao": (payload.nome_completo_razao or nome_urna).strip(),
        "tipo": (payload.tipo or "candidato").strip(),
        "numero_partido": payload.numero_partido,
        "sigla_partido_marca": payload.sigla_partido_marca.strip() if payload.sigla_partido_marca else None,
        "cargo_categoria": (payload.cargo_categoria or "Prefeito").strip(),
        "cor_hex": (payload.cor_hex or "#3b82f6").strip(),
        "ativo": payload.ativo,
    }
    if photo_col is not None and payload.foto_url and not _is_proxy_foto_url(payload.foto_url):
        cols.append(photo_col)
        vals.append(":foto_url")
        params["foto_url"] = payload.foto_url.strip()
    if has_org:
        cols.append("id_organizacao")
        vals.append(":tid")
        params["tid"] = tenant.tenant_id

    res = await session.execute(
        text(
            f"""
            INSERT INTO public.pesq_candidatos_produtos ({", ".join(cols)})
            VALUES ({", ".join(vals)})
            RETURNING *
            """
        ),
        params,
    )
    await session.commit()
    return dict(res.mappings().first() or {})


class CandidatoFotoUploadPayload(BaseModel):
    filename: str = "candidato.jpg"
    content_type: str = "image/jpeg"
    data_base64: str
    id_candidato_produto: int | None = None


@questionarios_db_router.post("/candidatos/upload-foto", status_code=status.HTTP_200_OK)
async def upload_candidato_foto(
    payload: CandidatoFotoUploadPayload,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    content_type = (payload.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envie apenas arquivos de imagem (JPG, PNG, WEBP, etc.).",
        )

    raw_b64 = payload.data_base64.strip()
    if "," in raw_b64 and raw_b64.startswith("data:"):
        raw_b64 = raw_b64.split(",", 1)[1]
    try:
        file_bytes = base64.b64decode(raw_b64)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conteúdo de imagem inválido.",
        ) from exc

    gcs = get_gcs_service()
    if not gcs.is_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Cloud Storage (GCS) não está configurado no servidor.",
        )

    try:
        foto_url = gcs.upload_file(
            file_bytes,
            destination_folder="candidatos",
            filename=payload.filename or "candidato.jpg",
            content_type=content_type,
            make_public=True,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Falha ao enviar imagem para o GCS: {exc}",
        ) from exc

    id_candidato_produto = payload.id_candidato_produto
    if id_candidato_produto is not None:
        cols_res = await session.execute(
            text(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'pesq_candidatos_produtos'
                """
            )
        )
        existing_cols = {r[0] for r in cols_res.fetchall()}
        photo_col = (
            "foto_url"
            if "foto_url" in existing_cols
            else "imagem_url"
            if "imagem_url" in existing_cols
            else "url_foto"
            if "url_foto" in existing_cols
            else None
        )
        if photo_col is not None:
            old_res = await session.execute(
                text(
                    f"SELECT {photo_col} FROM public.pesq_candidatos_produtos WHERE id_candidato_produto = :id"
                ),
                {"id": id_candidato_produto},
            )
            old_url = old_res.scalar_one_or_none()

            await session.execute(
                text(
                    f"UPDATE public.pesq_candidatos_produtos SET {photo_col} = :foto_url WHERE id_candidato_produto = :id"
                ),
                {"foto_url": foto_url, "id": id_candidato_produto},
            )
            await session.commit()

            if old_url and isinstance(old_url, str) and old_url != foto_url:
                gcs.delete_file(old_url)

    ver = hashlib.md5(foto_url.encode("utf-8")).hexdigest()[:8]
    display_url = (
        f"http://127.0.0.1:8000/api/v1/questionarios-db/candidatos/{id_candidato_produto}/foto?v={ver}"
        if id_candidato_produto is not None
        else (gcs.get_signed_url(foto_url) or foto_url)
    )
    return {"foto_url": display_url, "canonical_url": foto_url, "id_candidato_produto": id_candidato_produto}


@questionarios_db_router.put("/candidatos/{id_candidato_produto}")
async def update_candidato_produto(
    id_candidato_produto: int,
    payload: CandidatoProdutoCreate,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, Any]:
    nome_urna = payload.nome_urna_comercial.strip()
    if not nome_urna:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O nome de urna / comercial é obrigatório.",
        )

    cols_res = await session.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'pesq_candidatos_produtos'
            """
        )
    )
    existing_cols = {r[0] for r in cols_res.fetchall()}
    photo_col = (
        "foto_url"
        if "foto_url" in existing_cols
        else "imagem_url"
        if "imagem_url" in existing_cols
        else "url_foto"
        if "url_foto" in existing_cols
        else None
    )

    set_clauses = [
        "nome_urna_comercial = :nome_urna_comercial",
        "nome_completo_razao = :nome_completo_razao",
        "numero_partido = :numero_partido",
        "sigla_partido_marca = :sigla_partido_marca",
        "cargo_categoria = :cargo_categoria",
        "cor_hex = :cor_hex",
        "ativo = :ativo",
    ]
    params: dict[str, Any] = {
        "id": id_candidato_produto,
        "nome_urna_comercial": nome_urna,
        "nome_completo_razao": (payload.nome_completo_razao or nome_urna).strip(),
        "numero_partido": payload.numero_partido,
        "sigla_partido_marca": payload.sigla_partido_marca.strip() if payload.sigla_partido_marca else None,
        "cargo_categoria": (payload.cargo_categoria or "Prefeito").strip(),
        "cor_hex": (payload.cor_hex or "#3b82f6").strip(),
        "ativo": payload.ativo,
    }
    if photo_col is not None:
        incoming_foto = payload.foto_url.strip() if payload.foto_url else None
        is_self_proxy = bool(
            incoming_foto and "/questionarios-db/candidatos/" in incoming_foto and "/foto" in incoming_foto
        )
        if not is_self_proxy:
            set_clauses.append(f"{photo_col} = :foto_url")
            params["foto_url"] = incoming_foto

    res = await session.execute(
        text(
            f"""
            UPDATE public.pesq_candidatos_produtos
            SET {", ".join(set_clauses)}
            WHERE id_candidato_produto = :id
            RETURNING *
            """
        ),
        params,
    )
    row = res.mappings().first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidato/produto #{id_candidato_produto} não encontrado.",
        )
    await session.commit()
    return dict(row)


@questionarios_db_router.delete("/candidatos/{id_candidato_produto}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_candidato_produto(
    id_candidato_produto: int,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    try:
        await session.execute(
            text("DELETE FROM public.pesq_candidatos_produtos WHERE id_candidato_produto = :id"),
            {"id": id_candidato_produto},
        )
        await session.commit()
    except Exception as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Não é possível excluir candidato/produto vinculado a cenários ou respostas.",
        ) from exc


@questionarios_db_router.get("/cenario-candidatos")
async def list_cenario_candidatos(
    id_cenario: int | None = Query(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> list[dict[str, Any]]:
    if id_cenario is not None:
        res = await session.execute(
            text(
                """
                SELECT cc.*, cp.nome_urna_comercial, cp.sigla_partido_marca, cp.cargo_categoria
                FROM public.pesq_cenario_candidatos cc
                LEFT JOIN public.pesq_candidatos_produtos cp ON cp.id_candidato_produto = cc.id_candidato_produto
                WHERE cc.id_cenario = :id_cenario
                ORDER BY cc.ordem_apresentacao ASC
                """
            ),
            {"id_cenario": id_cenario},
        )
    else:
        res = await session.execute(
            text(
                """
                SELECT cc.*, cp.nome_urna_comercial, cp.sigla_partido_marca, cp.cargo_categoria
                FROM public.pesq_cenario_candidatos cc
                LEFT JOIN public.pesq_candidatos_produtos cp ON cp.id_candidato_produto = cc.id_candidato_produto
                ORDER BY cc.id_cenario ASC, cc.ordem_apresentacao ASC
                """
            )
        )
    return [dict(r) for r in res.mappings().all()]


@questionarios_db_router.post("/cenario-candidatos", status_code=status.HTTP_201_CREATED)
async def create_cenario_candidato(
    payload: CenarioCandidatoCreate,
    session: AsyncSession = Depends(get_db_session),
    tenant: TenantContext = Depends(get_tenant_context),
) -> dict[str, Any]:
    existing = await session.execute(
        text(
            """
            SELECT 1
            FROM public.pesq_cenario_candidatos
            WHERE id_cenario = :id_cenario
              AND id_candidato_produto = :id_candidato_produto
            LIMIT 1
            """
        ),
        {
            "id_cenario": payload.id_cenario,
            "id_candidato_produto": payload.id_candidato_produto,
        },
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este candidato/produto já está vinculado a este cenário.",
        )

    has_org_res = await session.execute(
        text(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'pesq_cenario_candidatos'
              AND column_name = 'id_organizacao'
            LIMIT 1
            """
        )
    )
    has_org = has_org_res.scalar_one_or_none() is not None

    insert_sql = (
        """
        INSERT INTO public.pesq_cenario_candidatos (id_cenario, id_candidato_produto, ordem_apresentacao, id_organizacao)
        VALUES (:id_cenario, :id_candidato_produto, :ordem_apresentacao, :tid)
        RETURNING *
        """
        if has_org
        else """
        INSERT INTO public.pesq_cenario_candidatos (id_cenario, id_candidato_produto, ordem_apresentacao)
        VALUES (:id_cenario, :id_candidato_produto, :ordem_apresentacao)
        RETURNING *
        """
    )

    try:
        res = await session.execute(
            text(insert_sql),
            {
                "id_cenario": payload.id_cenario,
                "id_candidato_produto": payload.id_candidato_produto,
                "ordem_apresentacao": payload.ordem_apresentacao,
                "tid": tenant.tenant_id,
            },
        )
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        orig = getattr(exc, "orig", None)
        pgcode = getattr(orig, "pgcode", None)
        sqlstate = getattr(orig, "sqlstate", None)
        err_msg = str(exc).lower()
        if pgcode == "23505" or sqlstate == "23505" or "unique" in err_msg or "duplicate" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Este candidato/produto já está vinculado a este cenário.",
            ) from exc
        raise

    return dict(res.mappings().first() or {})


@questionarios_db_router.delete(
    "/cenario-candidatos/{id_cenario}/{id_candidato_produto}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_cenario_candidato(
    id_cenario: int,
    id_candidato_produto: int,
    session: AsyncSession = Depends(get_db_session),
) -> None:
    await session.execute(
        text(
            """
            DELETE FROM public.pesq_cenario_candidatos
            WHERE id_cenario = :id_cenario
              AND id_candidato_produto = :id_candidato_produto
            """
        ),
        {
            "id_cenario": id_cenario,
            "id_candidato_produto": id_candidato_produto,
        },
    )
    await session.commit()


PARTIDOS_TSE_OFICIAIS: list[dict[str, Any]] = sorted(
    [
        {"sigla": "AGIR", "numero": 36, "nome": "Agir"},
        {"sigla": "AVANTE", "numero": 70, "nome": "Avante"},
        {"sigla": "CIDADANIA", "numero": 23, "nome": "Cidadania"},
        {"sigla": "DC", "numero": 27, "nome": "Democracia Cristã"},
        {"sigla": "MDB", "numero": 15, "nome": "Movimento Democrático Brasileiro"},
        {"sigla": "MOBILIZA", "numero": 33, "nome": "Mobilização Nacional"},
        {"sigla": "NOVO", "numero": 30, "nome": "Partido Novo"},
        {"sigla": "PCB", "numero": 21, "nome": "Partido Comunista Brasileiro"},
        {"sigla": "PCdoB", "numero": 65, "nome": "Partido Comunista do Brasil"},
        {"sigla": "PCO", "numero": 29, "nome": "Partido da Causa Operária"},
        {"sigla": "PDT", "numero": 12, "nome": "Partido Democrático Trabalhista"},
        {"sigla": "PL", "numero": 22, "nome": "Partido Liberal"},
        {"sigla": "PMB", "numero": 35, "nome": "Partido da Mulher Brasileira"},
        {"sigla": "PODE", "numero": 20, "nome": "Podemos"},
        {"sigla": "PP", "numero": 11, "nome": "Progressistas"},
        {"sigla": "PRD", "numero": 25, "nome": "Partido Renovação Democrática"},
        {"sigla": "PRTB", "numero": 28, "nome": "Partido Renovador Trabalhista Brasileiro"},
        {"sigla": "PSB", "numero": 40, "nome": "Partido Socialista Brasileiro"},
        {"sigla": "PSD", "numero": 55, "nome": "Partido Social Democrático"},
        {"sigla": "PSDB", "numero": 45, "nome": "Partido da Social Democracia Brasileira"},
        {"sigla": "PSOL", "numero": 50, "nome": "Partido Socialismo e Liberdade"},
        {"sigla": "PSTU", "numero": 16, "nome": "Partido Socialista dos Trabalhadores Unificado"},
        {"sigla": "PT", "numero": 13, "nome": "Partido dos Trabalhadores"},
        {"sigla": "PV", "numero": 43, "nome": "Partido Verde"},
        {"sigla": "REDE", "numero": 18, "nome": "Rede Sustentabilidade"},
        {"sigla": "REPUBLICANOS", "numero": 10, "nome": "Republicanos"},
        {"sigla": "SOLIDARIEDADE", "numero": 77, "nome": "Solidariedade"},
        {"sigla": "UNIÃO", "numero": 44, "nome": "União Brasil"},
        {"sigla": "UP", "numero": 80, "nome": "Unidade Popular"},
    ],
    key=lambda p: p["sigla"],
)

_PARTIDOS_TSE_CACHE: list[dict[str, Any]] | None = None


def _fetch_partidos_tse_sync() -> list[dict[str, Any]]:
    req = Request(
        "https://divulgacandcontas.tse.jus.br/divulga/rest/v1/partido/listar",
        headers={"Accept": "application/json", "User-Agent": "PesquisaMaster/1.0"},
    )
    with urlopen(req, timeout=2.5) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    raw_items = data if isinstance(data, list) else data.get("partidos", []) if isinstance(data, dict) else []
    parsed: list[dict[str, Any]] = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        sigla = str(item.get("sigla") or "").strip()
        numero = item.get("numero")
        nome = str(item.get("nome") or sigla).strip()
        if sigla and isinstance(numero, int):
            parsed.append({"sigla": sigla, "numero": numero, "nome": nome})
    if len(parsed) >= 20:
        return sorted(parsed, key=lambda p: p["sigla"])
    return PARTIDOS_TSE_OFICIAIS


@questionarios_db_router.get("/partidos-tse")
async def list_partidos_tse() -> list[dict[str, Any]]:
    global _PARTIDOS_TSE_CACHE
    if _PARTIDOS_TSE_CACHE is not None:
        return _PARTIDOS_TSE_CACHE

    try:
        partidos = await asyncio.to_thread(_fetch_partidos_tse_sync)
    except Exception:
        partidos = PARTIDOS_TSE_OFICIAIS

    _PARTIDOS_TSE_CACHE = partidos
    return _PARTIDOS_TSE_CACHE
