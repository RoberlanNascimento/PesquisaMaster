import type {
  WorkspaceTab,
  WorkspaceKpi,
  WorkspaceFilterConfig,
  WorkspaceColumn,
} from "../../components/ui/EnterpriseCrudWorkspaceTypes";
import type { QuotaStratumRecord } from "./samplingData";

export function getSamplingTabs(strataCount: number): readonly WorkspaceTab[] {
  return [
    { id: "TAB_POPULATION", label: "1. Parâmetros Populacionais (IBGE/TSE)", count: strataCount },
    { id: "TAB_HARE", label: "2. Alocação Inteira Hare-Niemeyer" },
    { id: "TAB_SECTORS", label: "3. Distribuição por Setor Censitário/Bairro" },
  ];
}

export function getSamplingKpis(
  totalN: number,
  strataCount: number,
  totalAllocated: number,
  totalValidated: number
): readonly WorkspaceKpi[] {
  return [
    { id: "k1", label: "Amostra Meta (N)", value: totalN, variant: "default" },
    { id: "k2", label: "Estratos Ativos", value: strataCount, variant: "default" },
    {
      id: "k3",
      label: "Cotas Alocadas",
      value: `${totalAllocated}`,
      helperText: "Método de Maior Resto",
      variant: "success",
    },
    {
      id: "k4",
      label: "Entrevistas Validadas",
      value: totalValidated,
      helperText: `${((totalValidated / totalN) * 100).toFixed(1)}% da meta`,
      variant: totalValidated >= totalN ? "success" : "warning",
    },
  ];
}

export function getSamplingFilters(
  filterSurvey: string,
  setFilterSurvey: (v: string) => void,
  filterDimension: string,
  setFilterDimension: (v: string) => void
): readonly WorkspaceFilterConfig[] {
  return [
    {
      id: "survey",
      label: "Pesquisa Ativa",
      value: filterSurvey,
      options: [
        { label: "SP-05190/2026 — Governador SP (N=2000)", value: "SP-05190/2026" },
        { label: "BR-08421/2026 — Presidencial (N=3500)", value: "BR-08421/2026" },
      ],
      onChange: setFilterSurvey,
    },
    {
      id: "dimension",
      label: "Dimensão Demográfica",
      value: filterDimension,
      options: [
        { label: "Todas as Dimensões", value: "ALL" },
        { label: "Sexo", value: "Sexo" },
        { label: "Faixa Etária", value: "Faixa Etária" },
        { label: "Escolaridade", value: "Escolaridade" },
      ],
      onChange: setFilterDimension,
    },
  ];
}

export const SAMPLING_COLUMNS: readonly WorkspaceColumn<QuotaStratumRecord>[] = [
  {
    key: "dimension",
    header: "Dimensão Demográfica",
    width: "150px",
    render: (s) => (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: "4px",
          backgroundColor: "#f1f5f9",
          fontWeight: 600,
          fontSize: "12px",
        }}
      >
        {s.dimension}
      </span>
    ),
  },
  {
    key: "stratumName",
    header: "Estrato Populacional",
    render: (s) => <strong>{s.stratumName}</strong>,
  },
  {
    key: "officialPercentage",
    header: "% Oficial TSE",
    width: "120px",
    align: "right",
    render: (s) => `${s.officialPercentage.toFixed(1)}%`,
  },
  {
    key: "fractional",
    header: "Cota Fracionária",
    width: "130px",
    align: "right",
    render: (s) => `${s.exactFractionalQuota}`,
  },
  {
    key: "hareQuota",
    header: "Cota Inteira (Hare)",
    width: "140px",
    align: "right",
    render: (s) => (
      <span style={{ color: "#2563eb", fontWeight: 700 }}>{s.hareNiemeyerQuota}</span>
    ),
  },
  {
    key: "validated",
    header: "Validadas / Saldo",
    width: "140px",
    align: "right",
    render: (s) => {
      const saldo = s.hareNiemeyerQuota - s.validated;
      return (
        <span>
          {s.validated} (
          <span style={{ color: saldo === 0 ? "#059669" : "#d97706", fontWeight: 600 }}>
            {saldo === 0 ? "✓ OK" : `${saldo} rest.`}
          </span>
          )
        </span>
      );
    },
  },
];
