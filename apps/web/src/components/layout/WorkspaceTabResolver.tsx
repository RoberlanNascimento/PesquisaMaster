import React from "react";
import type { ActiveTab } from "../../lib/store";

import { Dashboard } from "../../features/overview/Dashboard";
import { SurveysManagementFeature } from "../../features/surveys/SurveysManagementFeature";
import { SurveyCompositionFeature } from "../../features/surveys/SurveyCompositionFeature";
import { CandidatesManagementFeature } from "../../features/catalog/CandidatesManagementFeature";
import { SamplingQuotasFeature } from "../../features/sampling/SamplingQuotasFeature";
import { SamplingDimensionsFeature } from "../../features/sampling/SamplingDimensionsFeature";
import { TseIbgeCapturesFeature } from "../../features/sampling/TseIbgeCapturesFeature";
import { QuestionnairesBuilderFeature } from "../../features/questionnaires/QuestionnairesBuilderFeature";
import { QuestionsCatalogFeature } from "../../features/catalog/QuestionsCatalogFeature";
import { ScalesCatalogFeature } from "../../features/catalog/ScalesCatalogFeature";
import { AnswerOptionsCatalogFeature } from "../../features/catalog/AnswerOptionsCatalogFeature";
import { BatteryItemsCatalogFeature } from "../../features/catalog/BatteryItemsCatalogFeature";
import { ScenarioCandidatesFeature } from "../../features/surveys/ScenarioCandidatesFeature";
import { FieldDistributionFeature } from "../../features/fieldwork/FieldDistributionFeature";
import { FieldTransferFeature } from "../../features/fieldwork/FieldTransferFeature";
import { FieldHomologationFeature } from "../../features/supervision/FieldHomologationFeature";
import { VoterRespondentsFeature } from "../../features/tabulation/VoterRespondentsFeature";
import { FieldSessionsFeature } from "../../features/tabulation/FieldSessionsFeature";
import { RawAnswersFeature } from "../../features/tabulation/RawAnswersFeature";
import { TabulationReportsFeature } from "../../features/analytics/TabulationReportsFeature";
import { TseTabulationFeature } from "../../features/analytics/TseTabulationFeature";
import { TsePlanningFeature } from "../../features/planning/TsePlanningFeature";
import { MunicipalitiesCrudScreen } from "../../features/regions/MunicipalitiesCrudScreen";
import { MunicipalRegionsFeature } from "../../features/regions/MunicipalRegionsFeature";
import { NeighborhoodsCrudScreen } from "../../features/regions/NeighborhoodsCrudScreen";
import { CountriesCrudScreen } from "../../features/regions/CountriesCrudScreen";
import { StatesCrudScreen } from "../../features/regions/StatesCrudScreen";
import { DemographyIbgeFeature } from "../../features/demography/DemographyIbgeFeature";
import { ElectorateTseFeature } from "../../features/electorate/ElectorateTseFeature";
import { RbacUsersFeature } from "../../features/users/RbacUsersFeature";
import { ResearchersManagementFeature } from "../../features/researchers/ResearchersManagementFeature";
import { CampoOperacoesFeature } from "../../features/researchers/CampoOperacoesFeature";
import { DistribuicaoPesquisasFeature } from "../../features/researchers/DistribuicaoPesquisasFeature";
import { ClientCompanyRegistrationFeature } from "../../features/clients/ClientCompanyRegistrationFeature";
import { AuditReassignmentFeature } from "../../features/audit/AuditReassignmentFeature";
import { SecurityAuditFeature } from "../../features/audit/SecurityAuditFeature";
import { AuditUnlockFeature } from "../../features/audit/AuditUnlockFeature";
import { ResearcherPwaFeature } from "../../features/fieldwork/ResearcherPwaFeature";
import { SupervisionPanelFeature } from "../../features/supervision/SupervisionPanelFeature";
import { AnalyticsDashboardFeature } from "../../features/analytics/AnalyticsDashboardFeature";
import { AggregatorContainer } from "../../features/aggregator/AggregatorContainer";

export interface WorkspaceTabResolverProps {
  readonly activeTab: ActiveTab;
}

export function WorkspaceTabResolver({ activeTab }: WorkspaceTabResolverProps): React.JSX.Element {
  switch (activeTab) {
    case "overview":
    case "overview-group":
      return <Dashboard />;

    case "surveys":
    case "surveys-group":
      return <SurveysManagementFeature />;

    case "survey-composition":
      return <SurveyCompositionFeature />;

    case "survey-scenario-candidates":
      return <ScenarioCandidatesFeature />;

    case "survey-candidate-disc":
    case "catalog-candidates":
      return <CandidatesManagementFeature />;

    case "sampling":
    case "sampling-group":
    case "sampling-quotas":
    case "settings":
      return <SamplingQuotasFeature />;

    case "sampling-dimensions":
      return <SamplingDimensionsFeature />;

    case "sampling-tse-ibge":
      return <TseIbgeCapturesFeature />;

    case "questionnaires":
    case "questionnaires-routing":
    case "questionnaires-group":
      return <QuestionnairesBuilderFeature />;

    case "catalog-questions":
      return <QuestionsCatalogFeature />;

    case "catalog-scales":
      return <ScalesCatalogFeature />;

    case "catalog-answer-options":
      return <AnswerOptionsCatalogFeature />;

    case "catalog-battery-items":
      return <BatteryItemsCatalogFeature />;

    case "field-metas":
    case "fieldwork-group":
      return <FieldDistributionFeature />;

    case "field-transfer":
      return <FieldTransferFeature />;

    case "homologation":
      return <FieldHomologationFeature />;

    case "tabulation-voter-card":
      return <VoterRespondentsFeature />;

    case "tabulation-field-sessions":
      return <FieldSessionsFeature />;

    case "tabulation-raw-answers":
      return <RawAnswersFeature />;

    case "tabulation-reports":
      return <TabulationReportsFeature />;

    case "tabulation":
    case "tabulation-group":
      return <TseTabulationFeature />;

    case "tse-planning":
    case "dispatch-tse-group":
      return <TsePlanningFeature />;

    case "regions-municipalities":
      return <MunicipalitiesCrudScreen />;

    case "regions":
    case "regions-group":
      return <MunicipalRegionsFeature />;

    case "regions-neighborhoods":
      return <NeighborhoodsCrudScreen />;

    case "regions-country":
      return <CountriesCrudScreen />;

    case "regions-states":
      return <StatesCrudScreen />;

    case "geo-demography-ibge":
      return <DemographyIbgeFeature />;

    case "geo-electorate-tse":
      return <ElectorateTseFeature />;

    case "users-rbac":
      return <RbacUsersFeature />;

    case "distribution":
      return <DistribuicaoPesquisasFeature />;

    case "researchers":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <ResearchersManagementFeature />
          <CampoOperacoesFeature />
        </div>
      );

    case "client-company":
    case "company":
      return <ClientCompanyRegistrationFeature />;

    case "audit-reassignment":
      return <AuditReassignmentFeature />;

    case "security-audit":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <SecurityAuditFeature />
          <AuditUnlockFeature />
        </div>
      );

    case "field-pwa":
      return <ResearcherPwaFeature />;

    case "supervision":
      return <SupervisionPanelFeature />;

    case "analytics-tse":
      return <AnalyticsDashboardFeature />;

    case "aggregator":
      return <AggregatorContainer />;

    default:
      return <Dashboard />;
  }
}
