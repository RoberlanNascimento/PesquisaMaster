import type {
  WorkspaceTab,
  WorkspaceKpi,
  WorkspaceFilterConfig,
  WorkspaceColumn,
} from "../../components/ui/EnterpriseCrudWorkspaceTypes";
import {
  QUESTIONNAIRE_TEMPLATES,
  type SurveyCompositionRecord,
} from "./surveyCompositionData";
import type { QuestionnaireOption } from "./SurveyCompositionDrawerForm";

const COMPOSITION_BADGES: Record<
  SurveyCompositionRecord["status"],
  { bg: string; text: string; border: string; label: string }
> = {
  EM_MONTAGEM: { bg: "#3b2e08", text: "#fde293", border: "#fde293", label: "Em Montagem" },
  HOMOLOGADA_TSE: {
    bg: "#1b1c1c",
    text: "#8ab4f8",
    border: "#315f9d",
    label: "Homologada TSE",
  },
  TRAVADA_SHA256: {
    bg: "#183724",
    text: "#a8dab5",
    border: "rgba(129, 201, 149, 0.3)",
    label: "Travada SHA-256",
  },
};

export function getCompositionTabs(
  items: readonly SurveyCompositionRecord[]
): readonly WorkspaceTab[] {
  return [
    { id: "TODAS", label: "Todas as Composições", count: items.length },
    {
      id: "EM_MONTAGEM",
      label: "Em Montagem",
      count: items.filter((c) => c.status === "EM_MONTAGEM").length,
    },
    {
      id: "HOMOLOGADA_TSE",
      label: "Homologadas TSE",
      count: items.filter((c) => c.status === "HOMOLOGADA_TSE").length,
    },
    {
      id: "TRAVADA_SHA256",
      label: "Travadas SHA-256",
      count: items.filter((c) => c.status === "TRAVADA_SHA256").length,
    },
  ];
}

export function getCompositionKpis(
  items: readonly SurveyCompositionRecord[]
): readonly WorkspaceKpi[] {
  const totalBlocks = items.reduce((acc, c) => acc + c.questionnaireIds.length, 0);
  return [
    { id: "ck1", label: "Pesquisas Compostas", value: items.length, variant: "default" },
    {
      id: "ck2",
      label: "Questionários Vinculados",
      value: totalBlocks,
      variant: "success",
    },
    {
      id: "ck3",
      label: "CadernosDisponíveis",
      value: QUESTIONNAIRE_TEMPLATES.length,
      variant: "default",
    },
    {
      id: "ck4",
      label: "Travadas SHA-256",
      value: items.filter((c) => c.status === "TRAVADA_SHA256").length,
      variant: "success",
    },
  ];
}

export function getCompositionFilters(
  filterSurvey: string,
  setFilterSurvey: (v: string) => void,
  filterOffice: string,
  setFilterOffice: (v: string) => void,
  filterStatus: string,
  setFilterStatus: (v: string) => void
): readonly WorkspaceFilterConfig[] {
  return [
    {
      id: "comp-survey",
      label: "Pesquisa TSE",
      value: filterSurvey,
      options: [
        { label: "Todas as Pesquisas", value: "ALL" },
        { label: "SP-05190/2026 — Governador SP", value: "SP-05190/2026" },
        { label: "BR-08421/2026 — Presidente BR", value: "BR-08421/2026" },
        { label: "RJ-01124/2026 — Prefeito RJ", value: "RJ-01124/2026" },
        { label: "MG-00982/2026 — Senador MG", value: "MG-00982/2026" },
      ],
      onChange: setFilterSurvey,
    },
    {
      id: "comp-office",
      label: "Cargo Eleitoral",
      value: filterOffice,
      options: [
        { label: "Todos os Cargos", value: "ALL" },
        { label: "Presidente", value: "Presidente" },
        { label: "Governador", value: "Governador" },
        { label: "Senador", value: "Senador" },
        { label: "Prefeito", value: "Prefeito" },
      ],
      onChange: setFilterOffice,
    },
    {
      id: "comp-status",
      label: "Status da Composição",
      value: filterStatus,
      options: [
        { label: "Todos os Status", value: "ALL" },
        { label: "Em Montagem", value: "EM_MONTAGEM" },
        { label: "Homologada TSE", value: "HOMOLOGADA_TSE" },
        { label: "Travada SHA-256", value: "TRAVADA_SHA256" },
      ],
      onChange: setFilterStatus,
    },
  ];
}

export function getCompositionColumns(
  questionnaires: readonly QuestionnaireOption[] = QUESTIONNAIRE_TEMPLATES
): readonly WorkspaceColumn<SurveyCompositionRecord>[] {
  return [
    {
      key: "protocol",
      header: "Protocolo & Versão",
      width: "155px",
      render: (c) => (
        <div>
          <strong style={{ color: "#8ab4f8" }}>{c.surveyProtocolTse}</strong>
          <div style={{ fontSize: "11px", color: "#9aa0a6", fontFamily: "monospace" }}>
            Caderno {c.compositionVersion}
          </div>
        </div>
      ),
    },
    {
      key: "surveyTitle",
      header: "Pesquisa TSE Destino",
      render: (c) => (
        <div>
          <div style={{ fontWeight: 600, color: "#e5e2e1" }}>{c.surveyTitle}</div>
          <div style={{ fontSize: "11px", color: "#9aa0a6" }}>
            Cargo: {c.office} • {c.cityUf}
          </div>
        </div>
      ),
    },
    {
      key: "questionnaires",
      header: "Questionários Juntados na Pesquisa (Ordem de Aplicação)",
      render: (c) => {
        const blocks = c.questionnaireIds
          .map(
            (id) =>
              questionnaires.find((q) => q.id === id) ??
              QUESTIONNAIRE_TEMPLATES.find((t) => t.id === id)
          )
          .filter((b): b is QuestionnaireOption => Boolean(b));
        const totalQ = blocks.reduce((acc, b) => acc + b.questionsCount, 0);
        const totalSec = blocks.reduce(
          (acc, b) => acc + (b.estimatedSeconds ?? b.questionsCount * 20),
          0
        );
        return (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "4px" }}>
              {blocks.map((b, idx) => (
                <span
                  key={b.id}
                  style={{
                    fontSize: "10px",
                    padding: "2px 7px",
                    borderRadius: "6px",
                    backgroundColor: "#202020",
                    border: "1px solid #353535",
                    color: "#e5e2e1",
                    fontFamily: "monospace",
                  }}
                >
                  {idx + 1}. {b.code}
                </span>
              ))}
            </div>
            <div style={{ fontSize: "11px", color: "#9aa0a6" }}>
              {blocks.length} questionário(s) • {totalQ} perguntas • ~{totalSec}s duração
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status & Hash",
      width: "175px",
      render: (c) => {
        const b = COMPOSITION_BADGES[c.status];
        return (
          <div>
            <span
              style={{
                padding: "3px 9px",
                borderRadius: "9999px",
                fontSize: "11px",
                fontWeight: 600,
                backgroundColor: b.bg,
                color: b.text,
                border: `1px solid ${b.border}`,
                display: "inline-block",
              }}
            >
              {b.label}
            </span>
            <div style={{ fontSize: "10px", color: "#9aa0a6", fontFamily: "monospace", marginTop: "4px" }}>
              {c.sha256Signature.slice(0, 18)}
            </div>
          </div>
        );
      },
    },
  ];
}

export const COMPOSITION_COLUMNS: readonly WorkspaceColumn<SurveyCompositionRecord>[] =
  getCompositionColumns();
