import type {
  WorkspaceTab,
  WorkspaceKpi,
  WorkspaceFilterConfig,
  WorkspaceColumn,
} from "../../components/ui/EnterpriseCrudWorkspaceTypes";
import type {
  MunicipalityRecord,
  MunicipalRegionRecord,
  StateRecord,
  UrbanZoneType,
} from "./regionsData";

export const ZONE_LABELS: Record<UrbanZoneType, string> = {
  ZONA_CENTRAL: "Zona Central",
  ZONA_NORTE: "Zona Norte",
  ZONA_SUL: "Zona Sul",
  ZONA_LESTE: "Zona Leste",
  ZONA_OESTE: "Zona Oeste",
  ZONA_EXPANSAO_URBANA: "Expansão Urbana",
  ZONA_RURAL: "Zona Rural",
};

export function getRegionTabs(
  regions: readonly MunicipalRegionRecord[]
): readonly WorkspaceTab[] {
  const totalNeighborhoods = regions.reduce((acc, r) => acc + r.neighborhoods.length, 0);
  return [
    { id: "ALL", label: "Todas as Regiões", count: regions.length },
    {
      id: "ACTIVE",
      label: "Ativas no Plano Amostral",
      count: regions.filter((r) => r.isActive).length,
    },
    {
      id: "METROPOLITAN",
      label: "Capital (São Paulo)",
      count: regions.filter((r) => r.cityName === "São Paulo").length,
    },
    {
      id: "WITH_NEIGHBORHOODS",
      label: `Bairros Mapeados (${totalNeighborhoods})`,
      count: regions.filter((r) => r.neighborhoods.length > 0).length,
    },
  ];
}

export function getRegionKpis(
  regions: readonly MunicipalRegionRecord[],
  statesCount: number,
  municipalitiesCount: number
): readonly WorkspaceKpi[] {
  const totalElectorate = regions.reduce((acc, r) => acc + r.electorateTotal, 0);
  const totalSectors = regions.reduce((acc, r) => acc + r.censusSectorsCount, 0);
  const totalNeighborhoods = regions.reduce((acc, r) => acc + r.neighborhoods.length, 0);

  return [
    {
      id: "rk-1",
      label: "UFs / Municípios / Regiões",
      value: `${statesCount} UFs • ${municipalitiesCount} Mun. • ${regions.length} Reg.`,
      variant: "default",
    },
    {
      id: "rk-2",
      label: "Bairros Cadastrados",
      value: totalNeighborhoods,
      variant: "success",
    },
    {
      id: "rk-3",
      label: "Setores Censitários (IBGE)",
      value: totalSectors.toLocaleString("pt-BR"),
      variant: "default",
    },
    {
      id: "rk-4",
      label: "Eleitorado Consolidado",
      value: totalElectorate.toLocaleString("pt-BR"),
      variant: "warning",
    },
  ];
}

export function getRegionFilters(
  filterStateId: string,
  setFilterStateId: (v: string) => void,
  filterMunicipalityId: string,
  setFilterMunicipalityId: (v: string) => void,
  filterZone: string,
  setFilterZone: (v: string) => void,
  states: readonly StateRecord[],
  municipalities: readonly MunicipalityRecord[]
): readonly WorkspaceFilterConfig[] {
  const visibleMuns =
    filterStateId === "ALL"
      ? municipalities
      : municipalities.filter((m) => m.stateId === filterStateId);

  return [
    {
      id: "state",
      label: "Estado (UF)",
      value: filterStateId,
      onChange: (val) => {
        setFilterStateId(val);
        setFilterMunicipalityId("ALL");
      },
      options: [
        { value: "ALL", label: "Todos os Estados (UFs)" },
        ...states.map((s) => ({ value: s.id, label: `${s.uf} — ${s.name}` })),
      ],
    },
    {
      id: "city",
      label: "Município / Plano Diretor",
      value: filterMunicipalityId,
      onChange: setFilterMunicipalityId,
      options: [
        { value: "ALL", label: "Todos os Municípios" },
        ...visibleMuns.map((m) => ({ value: m.id, label: `${m.name} / ${m.uf}` })),
      ],
    },
    {
      id: "zone",
      label: "Macrozona Urbana",
      value: filterZone,
      onChange: setFilterZone,
      options: [
        { value: "ALL", label: "Todas as Macrozonas" },
        { value: "ZONA_CENTRAL", label: "Zona Central" },
        { value: "ZONA_SUL", label: "Zona Sul" },
        { value: "ZONA_LESTE", label: "Zona Leste" },
        { value: "ZONA_NORTE", label: "Zona Norte" },
        { value: "ZONA_OESTE", label: "Zona Oeste" },
        { value: "ZONA_EXPANSAO_URBANA", label: "Expansão Urbana" },
        { value: "ZONA_RURAL", label: "Zona Rural" },
      ],
    },
  ];
}

export const REGION_COLUMNS: readonly WorkspaceColumn<MunicipalRegionRecord>[] = [
  {
    key: "code",
    header: "Código / Município & UF",
    render: (r) => (
      <div>
        <strong style={{ fontFamily: "monospace", color: "#8ab4f8", fontSize: "12px" }}>
          {r.code}
        </strong>
        <div style={{ fontSize: "11px", color: "#9aa0a6" }}>
          {r.cityName} / {r.uf}
        </div>
      </div>
    ),
  },
  {
    key: "name",
    header: "Região Administrativa & Lei do Plano Diretor",
    render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: "#e5e2e1" }}>{r.name}</div>
        <div style={{ fontSize: "11px", color: "#9aa0a6" }}>{r.masterPlanLawRef}</div>
      </div>
    ),
  },
  {
    key: "zone",
    header: "Macrozona",
    render: (r) => (
      <span
        style={{
          padding: "3px 9px",
          borderRadius: "9999px",
          fontSize: "11px",
          fontWeight: 600,
          backgroundColor: "#183724",
          color: "#a8dab5",
          border: "1px solid rgba(129, 201, 149, 0.3)",
        }}
      >
        {ZONE_LABELS[r.masterPlanZone]}
      </span>
    ),
  },
  {
    key: "electorate",
    header: "Eleitorado & Peso (%)",
    align: "right",
    render: (r) => (
      <div style={{ fontFamily: "monospace" }}>
        <strong style={{ color: "#e5e2e1" }}>{r.electorateTotal.toLocaleString("pt-BR")}</strong>
        <div style={{ fontSize: "11px", color: "#81c995" }}>{r.electorateWeightPct}%</div>
      </div>
    ),
  },
  {
    key: "neighborhoods",
    header: "Bairros / Setores IBGE",
    align: "center",
    render: (r) => (
      <span
        style={{
          fontFamily: "monospace",
          fontSize: "12px",
          padding: "3px 8px",
          borderRadius: "8px",
          backgroundColor: "#2a2a2a",
          border: "1px solid #353535",
          color: "#e5e2e1",
        }}
      >
        {r.neighborhoods.length} bairros • {r.censusSectorsCount} setores
      </span>
    ),
  },
];
