"""Camada de serviço de domínio para Gestão de Clientes Empresa e Assinaturas SaaS."""

from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import ConflictError, NotFoundError
from src.modules.audit.schemas import AuditLogCreateSchema
from src.modules.audit.service import AuditService
from src.modules.clients.models import SaasPlanTier
from src.modules.clients.repository import ClientRepository
from src.modules.clients.schemas import (
    ClientCollaboratorCreateSchema,
    ClientCollaboratorResponseSchema,
    ClientCompanyCreateSchema,
    ClientCompanyResponseSchema,
    ClientCompanyUpdateSchema,
    SaasInvoiceResponseSchema,
    SaasPlanCatalogItemSchema,
)

SAAS_CATALOG: list[SaasPlanCatalogItemSchema] = [
    SaasPlanCatalogItemSchema(
        id=SaasPlanTier.STARTER,
        name="Starter Regional",
        price_monthly=Decimal("1990.00"),
        max_surveys=2,
        max_interviews=3000,
        max_devices=10,
        support_tier="Horário Comercial (Email)",
        includes_raking=False,
        includes_split_view=False,
    ),
    SaasPlanCatalogItemSchema(
        id=SaasPlanTier.PRO,
        name="Pro Eleitoral (Recomendado)",
        price_monthly=Decimal("5490.00"),
        max_surveys=10,
        max_interviews=15000,
        max_devices=30,
        support_tier="24/7 WhatsApp & Plantão Eleitoral",
        includes_raking=True,
        includes_split_view=True,
    ),
    SaasPlanCatalogItemSchema(
        id=SaasPlanTier.ENTERPRISE,
        name="Enterprise Majoritária",
        price_monthly=Decimal("14900.00"),
        max_surveys=50,
        max_interviews=100000,
        max_devices=150,
        support_tier="Gerente de Conta & SLA 15 min",
        includes_raking=True,
        includes_split_view=True,
    ),
]


class ClientService:
    """Regras de negócio para Empresas Clientes, Colaboradores e Faturamento SaaS."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = ClientRepository(session)
        self._audit = AuditService(session)

    def get_plans_catalog(self) -> list[SaasPlanCatalogItemSchema]:
        """Retorna o catálogo de planos comerciais SaaS disponíveis para contratação."""
        return SAAS_CATALOG

    async def list_companies(self) -> list[ClientCompanyResponseSchema]:
        """Lista todas as empresas clientes contratantes ativas."""
        companies = await self._repo.list_companies()
        return [ClientCompanyResponseSchema.model_validate(c) for c in companies]

    async def get_company(self, company_id: UUID) -> ClientCompanyResponseSchema:
        """Busca empresa cliente por UUID ou lança NotFoundError."""
        company = await self._repo.get_company_by_id(company_id)
        if not company:
            raise NotFoundError(f"Empresa cliente '{company_id}' não encontrada.")
        return ClientCompanyResponseSchema.model_validate(company)

    async def create_company(
        self, payload: ClientCompanyCreateSchema, *, actor_id: UUID
    ) -> ClientCompanyResponseSchema:
        """Cadastra nova empresa cliente garantindo unicidade de CNPJ."""
        existing = await self._repo.get_company_by_cnpj(payload.cnpj.strip())
        if existing:
            raise ConflictError(f"Já existe uma empresa cadastrada com o CNPJ '{payload.cnpj}'.")

        created = await self._repo.create_company(payload)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="clients",
                action="CLIENT_COMPANY_CREATED",
                payload_diff={
                    "company_id": str(created.id),
                    "cnpj": created.cnpj,
                    "saas_plan": created.saas_plan,
                    "tse_origin_funds": created.tse_origin_funds,
                },
            )
        )
        return ClientCompanyResponseSchema.model_validate(created)

    async def update_company(
        self, company_id: UUID, payload: ClientCompanyUpdateSchema, *, actor_id: UUID
    ) -> ClientCompanyResponseSchema:
        """Atualiza dados cadastrais da empresa cliente."""
        company = await self._repo.get_company_by_id(company_id)
        if not company:
            raise NotFoundError(f"Empresa cliente '{company_id}' não encontrada.")

        updated = await self._repo.update_company(company, payload)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="clients",
                action="CLIENT_COMPANY_UPDATED",
                payload_diff={"company_id": str(company_id)},
            )
        )
        return ClientCompanyResponseSchema.model_validate(updated)

    async def change_saas_plan(
        self, company_id: UUID, new_plan: SaasPlanTier, *, actor_id: UUID
    ) -> ClientCompanyResponseSchema:
        """Altera o plano SaaS da empresa e redimensiona suas cotas operacionais."""
        company = await self._repo.get_company_by_id(company_id)
        if not company:
            raise NotFoundError(f"Empresa cliente '{company_id}' não encontrada.")

        updated = await self._repo.update_plan(company, new_plan)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="clients",
                action="CLIENT_SAAS_PLAN_CHANGED",
                payload_diff={"company_id": str(company_id), "new_plan": new_plan.value},
            )
        )
        return ClientCompanyResponseSchema.model_validate(updated)

    async def list_collaborators(self, company_id: UUID) -> list[ClientCollaboratorResponseSchema]:
        """Lista os colaboradores credenciados da empresa cliente."""
        collabs = await self._repo.list_collaborators(company_id)
        return [ClientCollaboratorResponseSchema.model_validate(c) for c in collabs]

    async def add_collaborator(
        self,
        company_id: UUID,
        payload: ClientCollaboratorCreateSchema,
        *,
        actor_id: UUID,
    ) -> ClientCollaboratorResponseSchema:
        """Adiciona novo colaborador e registra na trilha imutável de auditoria."""
        company = await self._repo.get_company_by_id(company_id)
        if not company:
            raise NotFoundError(f"Empresa cliente '{company_id}' não encontrada.")

        collab = await self._repo.add_collaborator(company_id, payload)
        await self._audit.record_event(
            AuditLogCreateSchema(
                actor_user_id=actor_id,
                module="clients",
                action="CLIENT_COLLABORATOR_ADDED",
                payload_diff={
                    "company_id": str(company_id),
                    "collaborator_id": str(collab.id),
                    "role": collab.role,
                },
            )
        )
        return ClientCollaboratorResponseSchema.model_validate(collab)

    async def list_invoices(self, company_id: UUID) -> list[SaasInvoiceResponseSchema]:
        """Lista faturas e notas fiscais da empresa cliente."""
        invoices = await self._repo.list_invoices(company_id)
        return [SaasInvoiceResponseSchema.model_validate(inv) for inv in invoices]
