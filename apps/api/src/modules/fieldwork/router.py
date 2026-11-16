"""Rotas HTTP para Coleta em Campo, Sincronização Idempotente, Antifraude e Supervisão."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.core.security import (
    TokenClaimsSchema,
    UserRole,
    get_current_token_claims,
    require_roles,
)
from src.modules.fieldwork.models import InterviewAuditStatus
from src.modules.fieldwork.schemas import (
    BatchSyncRequestSchema,
    BatchSyncResponseSchema,
    FieldSupervisionSummarySchema,
    InterviewAuditDecisionRequestSchema,
    InterviewResponseSchema,
    PackageAuditDecisionRequestSchema,
    PackageAuditDecisionResponseSchema,
    PaginatedInterviewsResponseSchema,
)
from src.modules.fieldwork.service import FieldworkService
from src.modules.fieldwork.supervision_service import SupervisionService

router = APIRouter(
    prefix="/surveys/{survey_id}/fieldwork",
    tags=["Coleta em Campo, Antifraude & Supervisão"],
)

DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
AuthenticatedDep = Annotated[TokenClaimsSchema, Depends(get_current_token_claims)]
ResearcherDep = Annotated[
    TokenClaimsSchema,
    Depends(require_roles(UserRole.RESEARCHER)),
]
SupervisorOrAdminDep = Annotated[
    TokenClaimsSchema,
    Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.STATISTICIAN)),
]


@router.post(
    "/sync-batch",
    response_model=BatchSyncResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Sincroniza lote de entrevistas em campo (exige Idempotency-Key, HMAC e X-Device-ID)",
)
async def sync_interviews_batch(
    survey_id: UUID,
    payload: BatchSyncRequestSchema,
    claims: ResearcherDep,
    session: DbSessionDep,
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key", min_length=6, max_length=64)],
) -> BatchSyncResponseSchema:
    service = FieldworkService(session)
    return await service.sync_batch(
        survey_id,
        payload,
        researcher_id=claims.sub,
        batch_idempotency_key=idempotency_key,
    )


@router.get(
    "/interviews",
    response_model=PaginatedInterviewsResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Lista entrevistas coletadas com status de auditoria antifraude e paginação",
)
async def list_interviews(
    survey_id: UUID,
    claims: AuthenticatedDep,
    session: DbSessionDep,
    audit_status: Annotated[InterviewAuditStatus | None, Query()] = None,
    researcher_id: Annotated[UUID | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PaginatedInterviewsResponseSchema:
    effective_researcher = claims.sub if claims.role == UserRole.RESEARCHER else researcher_id
    service = FieldworkService(session)
    return await service.list_interviews(
        survey_id,
        audit_status=audit_status,
        researcher_id=effective_researcher,
        limit=limit,
        offset=offset,
    )


@router.post(
    "/interviews/{interview_id}/audit-decision",
    response_model=InterviewResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Expurga (PURGED) ou revalida (VALID) uma entrevista com justificativa auditável",
)
async def apply_interview_audit_decision(
    survey_id: UUID,
    interview_id: UUID,
    payload: InterviewAuditDecisionRequestSchema,
    claims: SupervisorOrAdminDep,
    session: DbSessionDep,
) -> InterviewResponseSchema:
    service = FieldworkService(session)
    return await service.apply_audit_decision(survey_id, interview_id, payload, actor_id=claims.sub)


@router.post(
    "/packages/audit-decision",
    response_model=PackageAuditDecisionResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Autoriza ou reprova um pacote no banco e estorna a cota quando reprovado",
)
async def apply_package_audit_decision(
    survey_id: UUID,
    payload: PackageAuditDecisionRequestSchema,
    claims: SupervisorOrAdminDep,
    session: DbSessionDep,
) -> PackageAuditDecisionResponseSchema:
    service = FieldworkService(session)
    return await service.apply_package_audit_decision(survey_id, payload, actor_id=claims.sub)


@router.get(
    "/supervision/summary",
    response_model=FieldSupervisionSummarySchema,
    status_code=status.HTTP_200_OK,
    summary="Retorna o Painel de Supervisão de Campo e desempenho por pesquisador",
)
async def get_supervision_summary(
    survey_id: UUID,
    _claims: SupervisorOrAdminDep,
    session: DbSessionDep,
) -> FieldSupervisionSummarySchema:
    service = SupervisionService(session)
    return await service.get_supervision_summary(survey_id)
