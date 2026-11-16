"""Modelos relacionais SQLAlchemy mapeados para as tabelas do banco 'pesquisas'."""

from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class PesquisasBase(DeclarativeBase):
    """Base declarativa para mapeamento das tabelas existentes do banco pesquisas."""

    pass


class MunicipioDbModel(PesquisasBase):
    """Tabela `municipios`."""

    __tablename__ = "municipios"

    id_municipio: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    estado: Mapped[str] = mapped_column(String(2), nullable=False)
    codigo_ibge: Mapped[int] = mapped_column(Integer, nullable=False)
    populacao_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    eleitorado_total: Mapped[int | None] = mapped_column(Integer, nullable=True)


class AmostraDbModel(PesquisasBase):
    """Tabela `amostras`."""

    __tablename__ = "amostras"

    id_amostra: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_municipio: Mapped[int] = mapped_column(
        Integer, ForeignKey("municipios.id_municipio"), nullable=False
    )
    descricao: Mapped[str] = mapped_column(String(255), nullable=False)
    nivel_confianca: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=95.0)
    margem_erro: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False, default=2.5)
    tamanho_amostral: Mapped[int] = mapped_column(Integer, nullable=False, default=1000)


class ProfissionalDbModel(PesquisasBase):
    """Tabela `profissionais` (Estatísticos e pesquisadores)."""

    __tablename__ = "profissionais"

    id_profissional: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    registro_profissional: Mapped[str] = mapped_column(String(100), nullable=False, default="CONRE")
    cpf_cnpj: Mapped[str | None] = mapped_column(String(32), nullable=True)
    especialidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tipo_profissional: Mapped[str] = mapped_column(
        String(50), nullable=False, default="ESTATISTICO"
    )
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)


class UsuarioDbModel(PesquisasBase):
    """Tabela `usuarios`."""

    __tablename__ = "usuarios"

    id_usuario: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    cargo: Mapped[str] = mapped_column(String(100), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)


class PesquisaDbModel(PesquisasBase):
    """Tabela central `pesquisas`."""

    __tablename__ = "pesquisas"

    id_pesquisa: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(255), nullable=False)
    data_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    data_fim: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="processando")
    tse_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    numero_registro_tse: Mapped[str | None] = mapped_column(String(100), nullable=True)
    data_registro_tse: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_divulgacao: Mapped[date | None] = mapped_column(Date, nullable=True)
    id_municipio: Mapped[int] = mapped_column(
        Integer, ForeignKey("municipios.id_municipio"), nullable=False
    )
    id_amostra: Mapped[int] = mapped_column(
        Integer, ForeignKey("amostras.id_amostra"), nullable=False
    )
    id_profissional: Mapped[int] = mapped_column(
        Integer, ForeignKey("profissionais.id_profissional"), nullable=False
    )
    id_usuario: Mapped[int] = mapped_column(
        Integer, ForeignKey("usuarios.id_usuario"), nullable=False
    )
    is_bloqueada: Mapped[bool] = mapped_column(Boolean, default=False)
    fechada_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    fechada_por: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hash_integridade: Mapped[str | None] = mapped_column(String(255), nullable=True)
    motivo_fechamento: Mapped[str | None] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    atualizado_em: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relacionamentos
    municipio: Mapped[MunicipioDbModel | None] = relationship(
        "MunicipioDbModel", foreign_keys=[id_municipio], lazy="joined"
    )
    amostra: Mapped[AmostraDbModel | None] = relationship(
        "AmostraDbModel", foreign_keys=[id_amostra], lazy="joined"
    )
    profissional: Mapped[ProfissionalDbModel | None] = relationship(
        "ProfissionalDbModel", foreign_keys=[id_profissional], lazy="joined"
    )
    usuario: Mapped[UsuarioDbModel | None] = relationship(
        "UsuarioDbModel", foreign_keys=[id_usuario], lazy="joined"
    )
