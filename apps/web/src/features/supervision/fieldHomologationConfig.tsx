import type {
  WorkspaceTab,
  WorkspaceKpi,
  WorkspaceFilterConfig,
  WorkspaceColumn,
} from "../../components/ui/EnterpriseCrudWorkspaceTypes";
import type { FieldPackageItem } from "./supervisionData";

export function getFieldTabs(packages: readonly FieldPackageItem[]): readonly WorkspaceTab[] {
  return [
    {
      id: "PENDING",
      label: "⏳ Pendentes de Validação",
      count: packages.filter((p) => p.status === "PENDING").length,
    },
    {
      id: "ALERTAS",
      label: "⚠️ Com Alerta GPS/Tempo",
      count: packages.filter((p) => p.gpsAlert || p.antifraudAlert !== "NONE").length,
    },
    {
      id: "VALIDATED",
      label: "✅ Validados (Liberados p/ Tabulação)",
      count: packages.filter((p) => p.status === "VALIDATED").length,
    },
    {
      id: "REJECTED",
      label: "❌ Reprovados (Expurgo TSE)",
      count: packages.filter((p) => p.status === "REJECTED").length,
    },
  ];
}

export function getFieldKpis(packages: readonly FieldPackageItem[]): readonly WorkspaceKpi[] {
  return [
    { id: "k1", label: "Pacotes Recebidos", value: packages.length, variant: "default" },
    {
      id: "k2",
      label: "Pendentes",
      value: packages.filter((p) => p.status === "PENDING").length,
      variant: "warning",
    },
    {
      id: "k3",
      label: "Com Alertas Antifraude",
      value: packages.filter((p) => p.gpsAlert || p.antifraudAlert !== "NONE").length,
      variant: "danger",
    },
    {
      id: "k4",
      label: "Validados TSE",
      value: packages.filter((p) => p.status === "VALIDATED").length,
      variant: "success",
    },
  ];
}

export function getFieldFilters(
  filterSurvey: string,
  setFilterSurvey: (v: string) => void,
  filterResearcher: string,
  setFilterResearcher: (v: string) => void,
  filterAlert: string,
  setFilterAlert: (v: string) => void,
): readonly WorkspaceFilterConfig[] {
  return [
    {
      id: "survey",
      label: "Pesquisa Eleitoral",
      value: filterSurvey,
      options: [
        { label: "Todas as Pesquisas", value: "ALL" },
        { label: "SP-05190/2026 — Gov. SP", value: "SP-05190/2026" },
        { label: "BR-08421/2026 — Presidencial", value: "BR-08421/2026" },
      ],
      onChange: setFilterSurvey,
    },
    {
      id: "researcher",
      label: "Pesquisador",
      value: filterResearcher,
      options: [
        { label: "Todos os Pesquisadores", value: "ALL" },
        { label: "Juliana Paiva Castro", value: "Juliana Paiva Castro" },
        { label: "Ricardo Silveira Prado", value: "Ricardo Silveira Prado" },
        { label: "Aline Ferreira Santos", value: "Aline Ferreira Santos" },
      ],
      onChange: setFilterResearcher,
    },
    {
      id: "alert",
      label: "Alerta Antifraude",
      value: filterAlert,
      options: [
        { label: "Todos os Alertas", value: "ALL" },
        { label: "Fora do Polígono GPS", value: "GPS" },
        { label: "Tempo Abaixo do Mínimo", value: "SPEEDING" },
      ],
      onChange: setFilterAlert,
    },
  ];
}

export const FIELD_COLUMNS: readonly WorkspaceColumn<FieldPackageItem>[] = [
  {
    key: "protocol",
    header: "Protocolo / Horário",
    render: (p) => (
      <div>
        <strong>#{p.packageProtocol}</strong>
        <div style={{ fontSize: "11px", color: "#64748b" }}>
          {new Date(p.submittedAt).toLocaleTimeString("pt-BR")}
        </div>
      </div>
    ),
  },
  {
    key: "researcher",
    header: "Pesquisador & Hardware",
    render: (p) => (
      <div>
        <div>{p.researcherName}</div>
        <code style={{ fontSize: "10px", color: "#64748b" }}>{p.deviceHash}</code>
      </div>
    ),
  },
  {
    key: "sector",
    header: "Setor & Cota",
    render: (p) => (
      <div>
        <div>{p.regionSector}</div>
        <div style={{ fontSize: "11px", color: "#64748b" }}>
          {p.quotaCellLabel} • {p.interviewsCount} entrevistas
        </div>
      </div>
    ),
  },
  {
    key: "gps",
    header: "Semáforo GPS",
    width: "120px",
    render: (p) =>
      p.gpsAlert ? (
        <span style={{ color: "#e11d48", fontWeight: 700 }}>🔴 Fora do Raio</span>
      ) : (
        <span style={{ color: "#059669", fontWeight: 700 }}>🟢 No Setor</span>
      ),
  },
  {
    key: "duration",
    header: "Tempo Médio",
    width: "110px",
    render: (p) => (
      <span style={{ color: p.avgDurationSeconds < 30 ? "#f28b82" : "#e5e2e1" }}>
        ⏱️ {p.avgDurationSeconds}s
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "120px",
    render: (p) => (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: "9999px",
          fontSize: "11px",
          fontWeight: 700,
          backgroundColor:
            p.status === "VALIDATED"
              ? "#ecfdf5"
              : p.status === "REJECTED"
                ? "#fff1f2"
                : "#fef3c7",
          color:
            p.status === "VALIDATED"
              ? "#047857"
              : p.status === "REJECTED"
                ? "#9f1239"
                : "#92400e",
        }}
      >
        {p.status}
      </span>
    ),
  },
];
