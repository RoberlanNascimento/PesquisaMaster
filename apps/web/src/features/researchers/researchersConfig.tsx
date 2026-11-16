import type {
  WorkspaceTab,
  WorkspaceKpi,
  WorkspaceFilterConfig,
  WorkspaceColumn,
} from "../../components/ui/EnterpriseCrudWorkspaceTypes";
import type { ResearcherRecord } from "./researchersData";

export function getResearcherTabs(researchers: readonly ResearcherRecord[]): readonly WorkspaceTab[] {
  return [
    {
      id: "ATIVOS",
      label: "Ativos em Campo",
      count: researchers.filter((r) => !r.isSuspended && r.deviceStatus === "VINCULADO").length,
    },
    {
      id: "PENDENTES",
      label: "Pendentes de Vínculo (Device Binding)",
      count: researchers.filter((r) => r.deviceStatus === "SEM_APARELHO").length,
    },
    {
      id: "ALERTAS",
      label: "Com Alertas de Auditoria",
      count: researchers.filter((r) => r.auditAlertsCount > 0).length,
    },
    {
      id: "BLOQUEADOS",
      label: "Bloqueados/Inativos",
      count: researchers.filter((r) => r.isSuspended).length,
    },
  ];
}

export function getResearcherKpis(researchers: readonly ResearcherRecord[]): readonly WorkspaceKpi[] {
  return [
    { id: "k1", label: "Pesquisadores", value: researchers.length, variant: "default" },
    {
      id: "k2",
      label: "Aparelhos Vinculados",
      value: researchers.filter((r) => r.deviceStatus === "VINCULADO").length,
      variant: "success",
    },
    {
      id: "k3",
      label: "Com Alertas GPS/Tempo",
      value: researchers.filter((r) => r.auditAlertsCount > 0).length,
      variant: "warning",
    },
    {
      id: "k4",
      label: "Bloqueados",
      value: researchers.filter((r) => r.isSuspended).length,
      variant: "danger",
    },
  ];
}

export function getResearcherFilters(
  filterDevice: string,
  setFilterDevice: (v: string) => void,
  filterSector: string,
  setFilterSector: (v: string) => void,
): readonly WorkspaceFilterConfig[] {
  return [
    {
      id: "deviceStatus",
      label: "Status do Aparelho",
      value: filterDevice,
      options: [
        { label: "Todos os Status", value: "ALL" },
        { label: "Vinculado", value: "VINCULADO" },
        { label: "Sem Aparelho", value: "SEM_APARELHO" },
        { label: "Bloqueado", value: "BLOQUEADO" },
      ],
      onChange: setFilterDevice,
    },
    {
      id: "sector",
      label: "Região / Setor",
      value: filterSector,
      options: [
        { label: "Todas as Regiões", value: "ALL" },
        { label: "Zona Sul", value: "Zona Sul" },
        { label: "Centro", value: "Centro" },
        { label: "Zona Leste", value: "Zona Leste" },
        { label: "Zona Norte", value: "Zona Norte" },
        { label: "Zona Oeste", value: "Zona Oeste" },
      ],
      onChange: setFilterSector,
    },
  ];
}

export const RESEARCHER_COLUMNS: readonly WorkspaceColumn<ResearcherRecord>[] = [
  {
    key: "fullName",
    header: "Pesquisador / CPF",
    render: (r) => (
      <div>
        <strong>{r.fullName}</strong>
        <div style={{ fontSize: "11px", color: "#64748b" }}>CPF: {r.maskedCpf}</div>
      </div>
    ),
  },
  {
    key: "device",
    header: "Aparelho Vinculado",
    width: "180px",
    render: (r) =>
      r.boundDeviceId ? (
        <code style={{ fontSize: "11px", color: "#2563eb" }}>{r.boundDeviceId}</code>
      ) : (
        <span style={{ fontSize: "11px", color: "#d97706", fontWeight: 600 }}>
          ⚠️ Sem Aparelho
        </span>
      ),
  },
  {
    key: "assignedSector",
    header: "Setor Designado",
    render: (r) => r.assignedSector,
  },
  {
    key: "target",
    header: "Meta / Validadas",
    width: "130px",
    render: (r) => `${r.validatedCount} / ${r.targetCount}`,
  },
  {
    key: "rejectionRate",
    header: "Taxa Reprovação",
    width: "120px",
    render: (r) => (
      <span
        style={{
          fontWeight: 700,
          color: r.rejectionRate > 5 ? "#e11d48" : "#059669",
        }}
      >
        {r.rejectionRate.toFixed(1)}%
      </span>
    ),
  },
  {
    key: "lastSyncAt",
    header: "Última Sincronização",
    width: "140px",
    render: (r) => r.lastSyncAt,
  },
];
