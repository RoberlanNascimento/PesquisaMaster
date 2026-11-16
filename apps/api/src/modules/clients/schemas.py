"""Contratos Pydantic v2 para Empresa Cliente, Colaboradores e Módulo SaaS."""

from datetime import datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.modules.clients.models import SaasAccountStatus, SaasPlanTier, TseFundingOrigin


class CollaboratorRole(StrEnum):
    """Papel funcional do colaborador na empresa cliente."""

    ESTATISTICO = "ESTATISTICO"
    PESQUISADOR = "PESQUISADOR"
    AUDITOR = "AUDITOR"
    ADMINISTRADOR = "ADMINISTRADOR"


class ClientCompanyCreateSchema(BaseModel):
    """Contrato de cadastro de nova empresa cliente contratante."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    corporate_name: str = Field(min_length=3, max_length=255)
    trade_name: str = Field(min_length=2, max_length=255)
    cnpj: str = Field(min_length=14, max_length=18)
    legal_rep: str = Field(min_length=3, max_length=255)
    contact_email: EmailStr
    contact_phone: str = Field(min_length=8, max_length=32)
    city_uf: str = Field(min_length=4, max_length=100)
    tse_origin_funds: TseFundingOrigin = TseFundingOrigin.PROPRIOS
    saas_plan: SaasPlanTier = SaasPlanTier.PRO


class ClientCompanyUpdateSchema(BaseModel):
    """Contrato de atualização dos dados da empresa cliente."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    corporate_name: str | None = Field(default=None, min_length=3, max_length=255)
    trade_name: str | None = Field(default=None, min_length=2, max_length=255)
    legal_rep: str | None = Field(default=None, min_length=3, max_length=255)
    contact_email: EmailStr | None = None
    contact_phone: str | None = Field(default=None, min_length=8, max_length=32)
    city_uf: str | None = Field(default=None, min_length=4, max_length=100)
    tse_origin_funds: TseFundingOrigin | None = None


class ClientCompanyResponseSchema(BaseModel):
    """DTO de retorno dos dados cadastrais e de cotas da empresa cliente."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    corporate_name: str
    trade_name: str
    cnpj: str
    legal_rep: str
    contact_email: str
    contact_phone: str
    city_uf: str
    tse_origin_funds: TseFundingOrigin
    saas_plan: SaasPlanTier
    saas_status: SaasAccountStatus
    interviews_quota_total: int
    interviews_quota_used: int
    surveys_quota_total: int
    surveys_quota_used: int
    devices_quota_total: int
    devices_quota_used: int
    created_at: datetime
    updated_at: datetime


class ClientCollaboratorCreateSchema(BaseModel):
    """Contrato para credenciamento de colaborador."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    name: str = Field(min_length=3, max_length=255)
    email: EmailStr
    role: CollaboratorRole
    credential: str = Field(min_length=2, max_length=100)
    is_active: bool = True


class ClientCollaboratorResponseSchema(BaseModel):
    """DTO de retorno do colaborador cadastrado."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    company_id: UUID
    name: str
    email: str
    role: CollaboratorRole
    credential: str
    is_active: bool
    created_at: datetime


class SaasPlanCatalogItemSchema(BaseModel):
    """Item do catálogo de planos comerciais SaaS."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: SaasPlanTier
    name: str
    price_monthly: Decimal
    max_surveys: int
    max_interviews: int
    max_devices: int
    support_tier: str
    includes_raking: bool
    includes_split_view: bool


class SaasInvoiceResponseSchema(BaseModel):
    """DTO de comprovante fiscal / NF-e para download."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    id: UUID
    company_id: UUID
    code: str
    period: str
    amount: Decimal
    status: str
    issued_at: datetime
    nfe_xml_key: str | None = None


class SaasSubscriptionUpdateSchema(BaseModel):
    """Contrato para alteração de plano SaaS."""

    model_config = ConfigDict(from_attributes=True, extra="forbid")

    plan: SaasPlanTier
