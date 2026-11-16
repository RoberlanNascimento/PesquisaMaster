"""Rotas HTTP para Ponderação Raking (IPF), Tabulação TSE, Crosstabs e Pacote PesqEle."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.core.security import (
    TokenClaimsSchema,
    UserRole,
    get_current_token_claims,
    require_roles,
)
from src.modules.analytics.export_service import TseExportService
from src.modules.analytics.schemas import (
    CrosstabResponseSchema,
    QuestionTabulationResponseSchema,
    RakingExecutionRequestSchema,
    RakingExecutionResponseSchema,
    TseExportPackageResponseSchema,
)
from src.modules.analytics.service import AnalyticsService

router = APIRouter(
    prefix="/surveys/{survey_id}/analytics",
    tags=["Ponderação Raking (IPF), Tabulação TSE & Crosstabs"],
)

DbSessionDep = Annotated[AsyncSession, Depends(get_db_session)]
AuthenticatedDep = Annotated[TokenClaimsSchema, Depends(get_current_token_claims)]
StatisticianOrAdminDep = Annotated[
    TokenClaimsSchema,
    Depends(require_roles(UserRole.ADMIN, UserRole.STATISTICIAN)),
]


@router.post(
    "/raking",
    response_model=RakingExecutionResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Executa Pós-Estratificação Raking (IPF) e calcula DEFF de Kish",
)
async def execute_raking_weighting(
    survey_id: UUID,
    payload: RakingExecutionRequestSchema,
    claims: StatisticianOrAdminDep,
    session: DbSessionDep,
) -> RakingExecutionResponseSchema:
    service = AnalyticsService(session)
    return await service.execute_raking(survey_id, payload, actor_id=claims.sub)


@router.get(
    "/tabulate/{question_code}",
    response_model=QuestionTabulationResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Tabula Votos Totais, Votos Válidos e Margem de Erro Ajustada por DEFF",
)
async def tabulate_survey_question(
    survey_id: UUID,
    question_code: str,
    _claims: AuthenticatedDep,
    session: DbSessionDep,
) -> QuestionTabulationResponseSchema:
    service = AnalyticsService(session)
    return await service.tabulate_question(survey_id, question_code)


@router.get(
    "/crosstabs/{question_code}",
    response_model=CrosstabResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Gera Tabela de Contingência (Crosstab) cruzando intenção de voto por demografia",
)
async def get_question_crosstab(
    survey_id: UUID,
    question_code: str,
    _claims: AuthenticatedDep,
    session: DbSessionDep,
    dimension: Annotated[
        str,
        Query(description="gender | age_bracket | education_level | income_bracket"),
    ] = "gender",
) -> CrosstabResponseSchema:
    service = AnalyticsService(session)
    return await service.generate_crosstab(survey_id, question_code, dimension)


@router.get(
    "/export-tse-package",
    response_model=TseExportPackageResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Exporta o Pacote Oficial TSE (PesqEle) com assinatura de integridade SHA-256",
)
async def export_tse_package(
    survey_id: UUID,
    _claims: AuthenticatedDep,
    session: DbSessionDep,
) -> TseExportPackageResponseSchema:
    service = TseExportService(session)
    return await service.export_tse_package(survey_id)
