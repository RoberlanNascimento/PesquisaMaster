import type {
  WorkspaceTab,
  WorkspaceKpi,
  WorkspaceFilterConfig,
  WorkspaceColumn,
} from "../../components/ui/EnterpriseCrudWorkspaceTypes";
import type { OptionWithRejection } from "./analyticsData";

export const TABULATION_TABS: readonly WorkspaceTab[] = [
  { id: "TAB_CROSSTABS", label: "1. Intenção de Voto e Cruzamentos (Crosstabs)" },
  { id: "TAB_RAKING", label: "2. Diagnóstico de Pesos Raking (IPF & Kish DEFF)" },
  { id: "TAB_EXPORT", label: "3. Exportação Oficial PesqEle/TSE & XLSX Imprensa" },
];

export function getTabulationKpis(
  kishDeff: string,
  isOnlyValidVotes: boolean,
): readonly WorkspaceKpi[] {
  return [
    { id: "k1", label: "Amostra Ponderada", value: "1.500", variant: "default" },
    { id: "k2", label: "Margem de Erro (95%)", value: "±2,65 pp", variant: "default" },
    {
      id: "k3",
      label: "Kish DEFF",
      value: kishDeff,
      helperText: "Excelente representatividade",
      variant: "success",
    },
    {
      id: "k4",
      label: "Filtro Ativo",
      value: isOnlyValidVotes ? "Votos Válidos (TSE)" : "Votos Totais (100%)",
      variant: isOnlyValidVotes ? "success" : "default",
    },
  ];
}

export function getTabulationFilters(
  filterSurvey: string,
  setFilterSurvey: (v: string) => void,
  filterScenario: string,
  setFilterScenario: (v: string) => void,
  filterCrosstab: string,
  setFilterCrosstab: (v: string) => void,
): readonly WorkspaceFilterConfig[] {
  return [
    {
      id: "survey",
      label: "Pesquisa Eleitoral",
      value: filterSurvey,
      options: [
        { label: "SP-01234/2026 — Governador SP", value: "SP-01234/2026" },
        { label: "BR-08421/2026 — Presidencial", value: "BR-08421/2026" },
      ],
      onChange: setFilterSurvey,
    },
    {
      id: "scenario",
      label: "Cenário de Teste",
      value: filterScenario,
      options: [
        { label: "Estimulada — 1º Turno (Disco)", value: "ESTIMULADA" },
        { label: "Espontânea Livre", value: "ESPONTANEA" },
        { label: "Rejeição Múltipla", value: "REJEICAO" },
      ],
      onChange: setFilterScenario,
    },
    {
      id: "crosstab",
      label: "Cruzamento Demográfico",
      value: filterCrosstab,
      options: [
        { label: "Sexo (Fem / Masc)", value: "SEXO" },
        { label: "Faixa Etária", value: "IDADE" },
        { label: "Escolaridade", value: "ESCOLARIDADE" },
        { label: "Renda Familiar", value: "RENDA" },
      ],
      onChange: setFilterCrosstab,
    },
  ];
}

export function getTabulationColumns(
  isOnlyValidVotes: boolean,
): readonly WorkspaceColumn<OptionWithRejection>[] {
  return [
    {
      key: "candidate",
      header: "Candidato / Opção",
      render: (c) => (
        <div>
          <strong>{c.option_label}</strong>
          <span style={{ fontSize: "11px", color: "#9aa0a6", marginLeft: "6px" }}>
            ({c.party})
          </span>
        </div>
      ),
    },
    {
      key: "weighted",
      header: "Votos Ponderados (N)",
      width: "160px",
      align: "right",
      render: (c) => `${Number(c.weighted_count).toFixed(0)} / ${c.raw_count}`,
    },
    {
      key: "pct",
      header: "% Votos",
      width: "130px",
      align: "right",
      render: (c) => {
        const pct = isOnlyValidVotes
          ? c.valid_votes_percentage ?? "0.00"
          : c.total_votes_percentage;
        return (
          <strong style={{ fontSize: "14px", color: "#8ab4f8" }}>
            {Number(pct).toFixed(2)}%
          </strong>
        );
      },
    },
    {
      key: "rejection",
      header: "Rejeição (%)",
      width: "120px",
      align: "right",
      render: (c) => `${Number(c.rejection_percentage).toFixed(1)}%`,
    },
    {
      key: "me",
      header: "Margem Estrato",
      width: "130px",
      align: "right",
      render: (c) => `±${c.stratum_margin_error} pp`,
    },
  ];
}
