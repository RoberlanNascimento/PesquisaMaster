"""Rotas HTTP para Empresa Cliente, Colaboradores e Módulo Comercial SaaS."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.core.security import (
    TokenClaimsSchema,
    UserRole,
    get_current_token_claims,
    require_roles,
)
from src.modules.clients.schemas import (
    ClientCollaboratorCreateSchema,
    ClientCollaboratorResponseSchema,
    ClientCompanyCreateSchema,
    ClientCompanyResponseSchema,
    ClientCompanyUpdateSchema,
    SaasInvoiceResponseSchema,
    SaasPlanCatalogItemSchema,
    SaasSubscriptionUpdateSchema,
)
from src.modules.clients.service import ClientService

router = APIRouter(tags=["Empresas Clientes & Módulo Comercial SaaS"])

DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
AuthenticatedDep = Annotated[TokenClaimsSchema, Depends(get_current_token_claims)]
AdminOnlyDep = Annotated[TokenClaimsSchema, Depends(require_roles(UserRole.ADMIN))]
AdminOrAnalystDep = Annotated[
    TokenClaimsSchema,
    Depends(require_roles(UserRole.ADMIN, UserRole.STATISTICIAN, UserRole.ANALYST)),
]


@router.get(
    "/saas/plans",
    response_model=list[SaasPlanCatalogItemSchema],
    status_code=status.HTTP_200_OK,
    summary="Lista catálogo de planos comerciais SaaS e limites de cotas",
)
async def list_saas_plans(session: DbSessionDep) -> list[SaasPlanCatalogItemSchema]:
    service = ClientService(session)
    return service.get_plans_catalog()


@router.get(
    "/clients",
    response_model=list[ClientCompanyResponseSchema],
    status_code=status.HTTP_200_OK,
    summary="Lista empresas clientes contratantes",
)
async def list_client_companies(
    _claims: AdminOrAnalystDep,
    session: DbSessionDep,
) -> list[ClientCompanyResponseSchema]:
    service = ClientService(session)
    return await service.list_companies()


@router.post(
    "/clients",
    response_model=ClientCompanyResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastra nova empresa cliente com qualificação TSE e plano SaaS",
)
async def create_client_company(
    payload: ClientCompanyCreateSchema,
    claims: AdminOnlyDep,
    session: DbSessionDep,
) -> ClientCompanyResponseSchema:
    service = ClientService(session)
    return await service.create_company(payload, actor_id=claims.sub)


@router.get(
    "/clients/{company_id}",
    response_model=ClientCompanyResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Obtém detalhes cadastrais e cotas de uma empresa cliente",
)
async def get_client_company(
    company_id: UUID,
    _claims: AuthenticatedDep,
    session: DbSessionDep,
) -> ClientCompanyResponseSchema:
    service = ClientService(session)
    return await service.get_company(company_id)


@router.patch(
    "/clients/{company_id}",
    response_model=ClientCompanyResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Atualiza dados cadastrais da empresa cliente",
)
async def update_client_company(
    company_id: UUID,
    payload: ClientCompanyUpdateSchema,
    claims: AdminOnlyDep,
    session: DbSessionDep,
) -> ClientCompanyResponseSchema:
    service = ClientService(session)
    return await service.update_company(company_id, payload, actor_id=claims.sub)


@router.post(
    "/clients/{company_id}/subscription",
    response_model=ClientCompanyResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Altera o plano de assinatura SaaS e readequa cotas de consumo",
)
async def change_saas_subscription(
    company_id: UUID,
    payload: SaasSubscriptionUpdateSchema,
    claims: AdminOnlyDep,
    session: DbSessionDep,
) -> ClientCompanyResponseSchema:
    service = ClientService(session)
    return await service.change_saas_plan(company_id, payload.plan, actor_id=claims.sub)


@router.get(
    "/clients/{company_id}/collaborators",
    response_model=list[ClientCollaboratorResponseSchema],
    status_code=status.HTTP_200_OK,
    summary="Lista colaboradores credenciados da empresa",
)
async def list_company_collaborators(
    company_id: UUID,
    _claims: AuthenticatedDep,
    session: DbSessionDep,
) -> list[ClientCollaboratorResponseSchema]:
    service = ClientService(session)
    return await service.list_collaborators(company_id)


@router.post(
    "/clients/{company_id}/collaborators",
    response_model=ClientCollaboratorResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Credencia novo colaborador vinculado à empresa",
)
async def add_company_collaborator(
    company_id: UUID,
    payload: ClientCollaboratorCreateSchema,
    claims: AdminOnlyDep,
    session: DbSessionDep,
) -> ClientCollaboratorResponseSchema:
    service = ClientService(session)
    return await service.add_collaborator(company_id, payload, actor_id=claims.sub)


@router.get(
    "/clients/{company_id}/invoices",
    response_model=list[SaasInvoiceResponseSchema],
    status_code=status.HTTP_200_OK,
    summary="Lista faturas e notas fiscais de faturamento SaaS",
)
async def list_company_invoices(
    company_id: UUID,
    _claims: AuthenticatedDep,
    session: DbSessionDep,
) -> list[SaasInvoiceResponseSchema]:
    service = ClientService(session)
    return await service.list_invoices(company_id)
