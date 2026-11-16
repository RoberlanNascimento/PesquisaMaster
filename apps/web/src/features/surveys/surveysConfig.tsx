import type {
  WorkspaceTab,
  WorkspaceKpi,
  WorkspaceFilterConfig,
  WorkspaceColumn,
} from "../../components/ui/EnterpriseCrudWorkspaceTypes";
import type { SurveyRecord, SurveyStatus } from "./surveysData";

const STATUS_BADGES: Record<SurveyStatus, { bg: string; text: string; border: string; label: string }> = {
  RASCUNHO: { bg: "#202020", text: "#c3c6d1", border: "#353535", label: "Em Rascunho" },
  REGISTRADA_PESQELE: { bg: "#1b1c1c", text: "#8ab4f8", border: "#315f9d", label: "PesqEle Registrada" },
  EM_CAMPO: { bg: "#2a2a2a", text: "#fdd663", border: "#653934", label: "Em Campo" },
  CONSOLIDADA: { bg: "#183724", text: "#a8dab5", border: "rgba(129, 201, 149, 0.3)", label: "Consolidada" },
};

export function getSurveyTabs(surveys: readonly SurveyRecord[]): readonly WorkspaceTab[] {
  return [
    { id: "TODAS", label: "Todas", count: surveys.length },
    {
      id: "RASCUNHO",
      label: "Em Rascunho",
      count: surveys.filter((s) => s.status === "RASCUNHO").length,
    },
    {
      id: "REGISTRADA",
      label: "Registradas TSE (PesqEle)",
      count: surveys.filter((s) => s.status === "REGISTRADA_PESQELE").length,
    },
    {
      id: "EM_CAMPO",
      label: "Em Campo",
      count: surveys.filter((s) => s.status === "EM_CAMPO").length,
    },
    {
      id: "CONSOLIDADA",
      label: "Consolidadas",
      count: surveys.filter((s) => s.status === "CONSOLIDADA").length,
    },
  ];
}

export function getSurveyKpis(surveys: readonly SurveyRecord[]): readonly WorkspaceKpi[] {
  return [
    { id: "k1", label: "Total Pesquisas", value: surveys.length, variant: "default" },
    {
      id: "k2",
      label: "Registradas TSE",
      value: surveys.filter((s) => s.status === "REGISTRADA_PESQELE").length,
      variant: "success",
    },
    {
      id: "k3",
      label: "Em Campo",
      value: surveys.filter((s) => s.status === "EM_CAMPO").length,
      variant: "warning",
    },
    {
      id: "k4",
      label: "Consolidadas TSE",
      value: surveys.filter((s) => s.status === "CONSOLIDADA").length,
      variant: "success",
    },
  ];
}

export function getSurveyFilters(
  filterOffice: string,
  setFilterOffice: (v: string) => void,
  filterUf: string,
  setFilterUf: (v: string) => void,
  filterStatus: string,
  setFilterStatus: (v: string) => void,
): readonly WorkspaceFilterConfig[] {
  return [
    {
      id: "office",
      label: "Cargo Pesquisado",
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
      id: "uf",
      label: "UF / Abrangência",
      value: filterUf,
      options: [
        { label: "Todas as Regiões", value: "ALL" },
        { label: "SP - São Paulo", value: "SP" },
        { label: "RJ - Rio de Janeiro", value: "RJ" },
        { label: "MG - Minas Gerais", value: "MG" },
        { label: "BR - Nacional", value: "BR" },
      ],
      onChange: setFilterUf,
    },
    {
      id: "status",
      label: "Status TSE",
      value: filterStatus,
      options: [
        { label: "Todos os Status", value: "ALL" },
        { label: "Rascunho", value: "RASCUNHO" },
        { label: "Registrada PesqEle", value: "REGISTRADA_PESQELE" },
        { label: "Em Campo", value: "EM_CAMPO" },
        { label: "Consolidada", value: "CONSOLIDADA" },
      ],
      onChange: setFilterStatus,
    },
  ];
}

export const SURVEY_COLUMNS: readonly WorkspaceColumn<SurveyRecord>[] = [
  {
    key: "protocolTse",
    header: "Protocolo TSE",
    width: "140px",
    render: (s) => <strong>{s.protocolTse}</strong>,
  },
  {
    key: "title",
    header: "Título da Pesquisa & Estatístico",
    render: (s) => (
      <div>
        <div style={{ fontWeight: 600, color: "#e5e2e1" }}>{s.title}</div>
        <div style={{ fontSize: "11px", color: "#9aa0a6" }}>
          {s.statisticianName} • {s.conreNumber}
        </div>
      </div>
    ),
  },
  { key: "cityUf", header: "UF / Município", width: "130px", render: (s) => s.cityUf },
  {
    key: "sample",
    header: "Amostra (N)",
    width: "120px",
    render: (s) => `${s.sampleCollected} / ${s.sampleTarget}`,
  },
  {
    key: "status",
    header: "Status",
    width: "140px",
    render: (s) => {
      const b = STATUS_BADGES[s.status];
      return (
        <span
          style={{
            padding: "3px 10px",
            borderRadius: "9999px",
            fontSize: "11px",
            fontWeight: 600,
            backgroundColor: b.bg,
            color: b.text,
            border: `1px solid ${b.border}`,
          }}
        >
          {b.label}
        </span>
      );
    },
  },
  {
    key: "hash",
    header: "Hash SHA-256 & Espelho TSE",
    width: "190px",
    render: (s) => (
      <div>
        <div
          title={s.sha256Hash}
          style={{ fontFamily: "monospace", fontSize: "11px", color: "#9aa0a6" }}
        >
          {s.sha256Hash.slice(0, 14)}...
        </div>
        {s.tseReceiptPdf ? (
          <div style={{ fontSize: "11px", color: "#8ab4f8", fontWeight: 600, marginTop: "2px" }}>
            📄 {s.tseReceiptPdf}
          </div>
        ) : (
          <div style={{ fontSize: "11px", color: "#fdd663", marginTop: "2px" }}>
            ⚠ Sem espelho PDF anexado
          </div>
        )}
      </div>
    ),
  },
];
