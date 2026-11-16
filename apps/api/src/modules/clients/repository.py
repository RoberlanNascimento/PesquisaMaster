"""Repositório SQLAlchemy assíncrono para Empresa Cliente, Colaboradores e Faturas SaaS."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.clients.models import (
    ClientCollaboratorModel,
    ClientCompanyModel,
    SaasInvoiceModel,
    SaasPlanTier,
)
from src.modules.clients.schemas import (
    ClientCollaboratorCreateSchema,
    ClientCompanyCreateSchema,
    ClientCompanyUpdateSchema,
)

PLAN_LIMITS: dict[SaasPlanTier, dict[str, int]] = {
    SaasPlanTier.STARTER: {"surveys": 2, "interviews": 3000, "devices": 10},
    SaasPlanTier.PRO: {"surveys": 10, "interviews": 15000, "devices": 30},
    SaasPlanTier.ENTERPRISE: {"surveys": 50, "interviews": 100000, "devices": 150},
}


class ClientRepository:
    """Encapsula operações de banco de dados para empresas e o módulo comercial SaaS."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_company_by_id(self, company_id: UUID) -> ClientCompanyModel | None:
        """Busca empresa cliente pelo UUID."""
        stmt = select(ClientCompanyModel).where(
            ClientCompanyModel.id == company_id,
            ClientCompanyModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_company_by_cnpj(self, cnpj: str) -> ClientCompanyModel | None:
        """Busca empresa pelo CNPJ higienizado."""
        stmt = select(ClientCompanyModel).where(
            ClientCompanyModel.cnpj == cnpj,
            ClientCompanyModel.deleted_at.is_(None),
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_companies(self) -> list[ClientCompanyModel]:
        """Lista todas as empresas clientes ativas."""
        stmt = (
            select(ClientCompanyModel)
            .where(ClientCompanyModel.deleted_at.is_(None))
            .order_by(ClientCompanyModel.created_at.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def create_company(self, payload: ClientCompanyCreateSchema) -> ClientCompanyModel:
        """Persiste uma nova empresa cliente com cotas baseadas no plano escolhido."""
        limits = PLAN_LIMITS.get(payload.saas_plan, PLAN_LIMITS[SaasPlanTier.PRO])
        company = ClientCompanyModel(
            corporate_name=payload.corporate_name.strip(),
            trade_name=payload.trade_name.strip(),
            cnpj=payload.cnpj.strip(),
            legal_rep=payload.legal_rep.strip(),
            contact_email=payload.contact_email.strip(),
            contact_phone=payload.contact_phone.strip(),
            city_uf=payload.city_uf.strip(),
            tse_origin_funds=payload.tse_origin_funds.value,
            saas_plan=payload.saas_plan.value,
            surveys_quota_total=limits["surveys"],
            interviews_quota_total=limits["interviews"],
            devices_quota_total=limits["devices"],
        )
        self._session.add(company)
        await self._session.commit()
        await self._session.refresh(company)
        return company

    async def update_company(
        self, company: ClientCompanyModel, payload: ClientCompanyUpdateSchema
    ) -> ClientCompanyModel:
        """Atualiza campos permitidos da empresa cliente."""
        update_data = payload.model_dump(exclude_unset=True)
        for key, val in update_data.items():
            if val is not None:
                setattr(company, key, val.value if hasattr(val, "value") else val)
        await self._session.commit()
        await self._session.refresh(company)
        return company

    async def update_plan(
        self, company: ClientCompanyModel, new_plan: SaasPlanTier
    ) -> ClientCompanyModel:
        """Altera o plano SaaS e atualiza o limite de cotas contratadas."""
        limits = PLAN_LIMITS.get(new_plan, PLAN_LIMITS[SaasPlanTier.PRO])
        company.saas_plan = new_plan.value
        company.surveys_quota_total = limits["surveys"]
        company.interviews_quota_total = limits["interviews"]
        company.devices_quota_total = limits["devices"]
        await self._session.commit()
        await self._session.refresh(company)
        return company

    async def list_collaborators(self, company_id: UUID) -> list[ClientCollaboratorModel]:
        """Lista colaboradores de uma empresa."""
        stmt = (
            select(ClientCollaboratorModel)
            .where(
                ClientCollaboratorModel.company_id == company_id,
                ClientCollaboratorModel.deleted_at.is_(None),
            )
            .order_by(ClientCollaboratorModel.created_at.asc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def add_collaborator(
        self, company_id: UUID, payload: ClientCollaboratorCreateSchema
    ) -> ClientCollaboratorModel:
        """Adiciona novo colaborador vinculado à empresa."""
        collab = ClientCollaboratorModel(
            company_id=company_id,
            name=payload.name.strip(),
            email=payload.email.strip(),
            role=payload.role.value,
            credential=payload.credential.strip(),
            is_active=payload.is_active,
        )
        self._session.add(collab)
        await self._session.commit()
        await self._session.refresh(collab)
        return collab

    async def list_invoices(self, company_id: UUID) -> list[SaasInvoiceModel]:
        """Lista faturas/NF-e de uma empresa cliente."""
        stmt = (
            select(SaasInvoiceModel)
            .where(
                SaasInvoiceModel.company_id == company_id,
                SaasInvoiceModel.deleted_at.is_(None),
            )
            .order_by(SaasInvoiceModel.issued_at.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def create_invoice(self, invoice: SaasInvoiceModel) -> SaasInvoiceModel:
        """Registra uma nova fatura/NF-e emitida."""
        self._session.add(invoice)
        await self._session.commit()
        await self._session.refresh(invoice)
        return invoice
