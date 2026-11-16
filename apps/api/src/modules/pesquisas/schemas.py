"""Schemas Pydantic para validação e serialização do banco 'pesquisas'."""

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class MunicipioOut(BaseModel):
    id_municipio: int
    nome: str
    estado: str
    codigo_ibge: int

    model_config = ConfigDict(from_attributes=True)


class AmostraOut(BaseModel):
    id_amostra: int
    descricao: str
    tamanho_amostral: int
    margem_erro: Decimal
    nivel_confianca: Decimal

    model_config = ConfigDict(from_attributes=True)


class ProfissionalOut(BaseModel):
    id_profissional: int
    nome: str
    registro_profissional: str

    model_config = ConfigDict(from_attributes=True)


class UsuarioOut(BaseModel):
    id_usuario: int
    nome: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class PesquisaOut(BaseModel):
    id_pesquisa: int
    nome: str
    data_inicio: date
    data_fim: date
    status: str
    tse_status: str | None = None
    numero_registro_tse: str | None = None
    data_registro_tse: date | None = None
    data_divulgacao: date | None = None
    is_bloqueada: bool = False
    hash_integridade: str | None = None
    motivo_fechamento: str | None = None
    municipio: MunicipioOut | None = None
    amostra: AmostraOut | None = None
    profissional: ProfissionalOut | None = None
    usuario: UsuarioOut | None = None

    model_config = ConfigDict(from_attributes=True)


class PesquisaCreate(BaseModel):
    nome: str = Field(..., min_length=3, max_length=255)
    data_inicio: date
    data_fim: date
    numero_registro_tse: str | None = None
    id_municipio: int
    id_amostra: int
    id_profissional: int
    id_usuario: int = 1
    status: str = "processando"


class PesquisaUpdate(BaseModel):
    nome: str | None = None
    data_inicio: date | None = None
    data_fim: date | None = None
    numero_registro_tse: str | None = None
    id_municipio: int | None = None
    id_amostra: int | None = None
    id_profissional: int | None = None
    status: str | None = None


class DbHealthOut(BaseModel):
    status: str
    database: str
    host: str
    server_version: str
    total_pesquisas: int
    total_municipios: int
    total_amostras: int
    latency_ms: float
