import type {
  WorkspaceTab,
  WorkspaceKpi,
  WorkspaceFilterConfig,
  WorkspaceColumn,
} from "../../components/ui/EnterpriseCrudWorkspaceTypes";
import type { QuestionnaireItem } from "./questionnairesData";

export function getQuestionnaireTabs(questions: readonly QuestionnaireItem[]): readonly WorkspaceTab[] {
  return [
    { id: "TAB_STRUCTURE", label: "1. Estrutura de Perguntas", count: questions.length },
    {
      id: "TAB_DISCO",
      label: "2. Configuração do Disco Estimulado (Rodízio TSE)",
      count: questions.filter((q) => q.rotationRule === "CIRCULAR_OFFSET").length,
    },
    { id: "TAB_BRANCHING", label: "3. Lógica de Salto (Branching)" },
    { id: "TAB_SIMULATOR", label: "4. Simulador de Aplicação" },
  ];
}

export function getQuestionnaireKpis(questions: readonly QuestionnaireItem[]): readonly WorkspaceKpi[] {
  return [
    { id: "k1", label: "Total de Perguntas", value: questions.length, variant: "default" },
    {
      id: "k2",
      label: "Perguntas de Disco",
      value: questions.filter((q) => q.rotationRule === "CIRCULAR_OFFSET").length,
      variant: "success",
    },
    {
      id: "k3",
      label: "Obrigatórias",
      value: questions.filter((q) => q.isMandatory).length,
      variant: "warning",
    },
    { id: "k4", label: "Tempo Estimado", value: "3m 45s", variant: "default" },
  ];
}

export function getQuestionnaireFilters(
  filterSurvey: string,
  setFilterSurvey: (v: string) => void,
  filterType: string,
  setFilterType: (v: string) => void,
  filterMandatory: string,
  setFilterMandatory: (v: string) => void,
): readonly WorkspaceFilterConfig[] {
  return [
    {
      id: "survey",
      label: "Pesquisa Vinculada",
      value: filterSurvey,
      options: [
        { label: "SP-05190/2026 — Governador SP", value: "SP-05190/2026" },
        { label: "BR-08421/2026 — Presidencial", value: "BR-08421/2026" },
        { label: "RJ-01124/2026 — Prefeito RJ", value: "RJ-01124/2026" },
      ],
      onChange: setFilterSurvey,
    },
    {
      id: "type",
      label: "Tipo de Pergunta",
      value: filterType,
      options: [
        { label: "Todos os Tipos", value: "ALL" },
        { label: "Estimulada com Disco", value: "ESTIMULADA_DISCO" },
        { label: "Espontânea", value: "ESPONTANEA" },
        { label: "Rejeição Múltipla", value: "REJEICAO_MULTIPLA" },
        { label: "Cota Demográfica", value: "COTA_DEMOGRAFICA" },
        { label: "Avaliação Governo", value: "AVALIACAO_GOVERNO" },
      ],
      onChange: setFilterType,
    },
    {
      id: "mandatory",
      label: "Obrigatoriedade",
      value: filterMandatory,
      options: [
        { label: "Todas", value: "ALL" },
        { label: "Obrigatória", value: "MANDATORY" },
        { label: "Opcional", value: "OPTIONAL" },
      ],
      onChange: setFilterMandatory,
    },
  ];
}

export const QUESTIONNAIRE_COLUMNS: readonly WorkspaceColumn<QuestionnaireItem>[] = [
  { key: "order", header: "Ordem", width: "70px", render: (q) => <strong>#{q.order}</strong> },
  { key: "code", header: "Código", width: "90px", render: (q) => q.code },
  {
    key: "text",
    header: "Enunciado da Pergunta",
    render: (q) => (
      <div>
        <div style={{ fontWeight: 600 }}>{q.text}</div>
        <div style={{ fontSize: "11px", color: "#64748b" }}>
          {q.options.length} opções cadastradas
        </div>
      </div>
    ),
  },
  { key: "type", header: "Tipo", width: "160px", render: (q) => q.type },
  {
    key: "rotation",
    header: "Regra de Rodízio",
    width: "150px",
    render: (q) =>
      q.rotationRule === "CIRCULAR_OFFSET" ? (
        <span style={{ color: "#2563eb", fontWeight: 600 }}>🔄 Disco Circular</span>
      ) : (
        <span style={{ color: "#64748b" }}>Fixa</span>
      ),
  },
  {
    key: "duration",
    header: "Tempo Mínimo",
    width: "110px",
    render: (q) => `${q.minDurationSeconds}s`,
  },
];
