"""Modelos relacionais SQLAlchemy 2.0 para Empresa Cliente e Módulo Comercial SaaS."""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import AuditTimestampMixin, Base


class TseFundingOrigin(StrEnum):
    """Origem dos recursos contratantes conforme Resolução TSE nº 23.600."""

    PROPRIOS = "PROPRIOS"
    FUNDO_PARTIDARIO = "FUNDO_PARTIDARIO"
    FEFC_ELEITORAL = "FEFC_ELEITORAL"
    DOACOES_PF = "DOACOES_PF"


class SaasPlanTier(StrEnum):
    """Níveis de assinatura comercial SaaS da plataforma."""

    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class SaasAccountStatus(StrEnum):
    """Situação operacional da assinatura SaaS da empresa."""

    ACTIVE = "ACTIVE"
    TRIAL = "TRIAL"
    OVERDUE = "OVERDUE"
    SUSPENDED = "SUSPENDED"


class ClientCompanyModel(AuditTimestampMixin, Base):
    """Entidade ORM da empresa cliente contratante do PesquisaMaster."""

    __tablename__ = "client_companies"

    corporate_name: Mapped[str] = mapped_column(String(255), nullable=False)
    trade_name: Mapped[str] = mapped_column(String(255), nullable=False)
    cnpj: Mapped[str] = mapped_column(String(18), unique=True, index=True, nullable=False)
    legal_rep: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    city_uf: Mapped[str] = mapped_column(String(100), nullable=False)
    tse_origin_funds: Mapped[str] = mapped_column(
        String(32), nullable=False, default=TseFundingOrigin.PROPRIOS.value
    )
    saas_plan: Mapped[str] = mapped_column(
        String(32), nullable=False, default=SaasPlanTier.PRO.value
    )
    saas_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=SaasAccountStatus.ACTIVE.value
    )
    interviews_quota_total: Mapped[int] = mapped_column(Integer, nullable=False, default=15000)
    interviews_quota_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    surveys_quota_total: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    surveys_quota_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    devices_quota_total: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    devices_quota_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class ClientCollaboratorModel(AuditTimestampMixin, Base):
    """Colaborador credenciado da empresa cliente (Estatístico CONRE, Pesquisador, Auditor)."""

    __tablename__ = "client_collaborators"

    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("client_companies.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    credential: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class SaasInvoiceModel(AuditTimestampMixin, Base):
    """Fatura ou comprovante fiscal com download de espelho NF-e."""

    __tablename__ = "saas_invoices"

    company_id: Mapped[UUID] = mapped_column(
        ForeignKey("client_companies.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    period: Mapped[str] = mapped_column(String(64), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PAID")
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    nfe_xml_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
