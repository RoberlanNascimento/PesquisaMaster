import React, { useState, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import type {
  WorkspaceTab,
  WorkspaceKpi,
  WorkspaceFilterConfig,
  WorkspaceColumn,
} from "../../components/ui/EnterpriseCrudWorkspaceTypes";
import {
  INITIAL_EXTERNAL_POLLS,
  AGGREGATED_CANDIDATES_BY_HALFLIFE,
  HISTORICAL_TREND_SERIES,
  type ExternalPollEntry,
} from "./aggregatorData";
import {
  AggregatorExternalSurveyDrawer,
  type ExternalSurveyFormData,
} from "./AggregatorExternalSurveyDrawer";
import { AggregatorTrendAndTable } from "./AggregatorTrendAndTable";

export function AggregatorWorkspaceFeature(): React.JSX.Element {
  const [surveys, setSurveys] = useState<readonly ExternalPollEntry[]>(INITIAL_EXTERNAL_POLLS);
  const [activeTab, setActiveTab] = useState<string>("TAB_TREND");
  const [search, setSearch] = useState<string>("");
  const [filterInstitute, setFilterInstitute] = useState<string>("ALL");
  const [filterHalfLife, setFilterHalfLife] = useState<string>("14");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      if (filterInstitute !== "ALL" && s.instituteName !== filterInstitute) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        if (
          !s.instituteName.toLowerCase().includes(query) &&
          !s.tseProtocolNumber.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [surveys, filterInstitute, search]);

  const tabs: readonly WorkspaceTab[] = [
    { id: "TAB_TREND", label: "Curva de Tendência Ponderada" },
    { id: "TAB_BASE", label: "Base de Pesquisas Registradas", count: surveys.length },
    { id: "TAB_HOUSE", label: "Pesos de Institutos e House Effects" },
  ];

  const kpis: readonly WorkspaceKpi[] = [
    { id: "k1", label: "Pesquisas Agregadas", value: surveys.length, variant: "default" },
    { id: "k2", label: "Institutos Monitorados", value: 4, variant: "default" },
    {
      id: "k3",
      label: "Meia-Vida Ativa (λ)",
      value: `${filterHalfLife} dias`,
      helperText: "Decaimento temporal exponencial",
      variant: "success",
    },
    {
      id: "k4",
      label: "Líder Tendência",
      value: "Alexandre S. (43,2%)",
      helperText: "Margem de 6,8 pp",
      variant: "success",
    },
  ];

  const filters: readonly WorkspaceFilterConfig[] = [
    {
      id: "institute",
      label: "Instituto",
      value: filterInstitute,
      options: [
        { label: "Todos os Institutos", value: "ALL" },
        { label: "PesquisaMaster (Interno)", value: "PesquisaMaster Fieldwork (Interno)" },
        { label: "DataBrasil Opinião", value: "Instituto DataBrasil Opinião" },
        { label: "Quaestus", value: "Quaestus Inteligência Eleitoral" },
      ],
      onChange: setFilterInstitute,
    },
    {
      id: "halfLife",
      label: "Janela Temporal (λ)",
      value: filterHalfLife,
      options: [
        { label: "7 dias (Alta sensibilidade)", value: "7" },
        { label: "14 dias (Padrão de Mercado)", value: "14" },
        { label: "21 dias (Maior suavização)", value: "21" },
      ],
      onChange: setFilterHalfLife,
    },
  ];

  const columns: readonly WorkspaceColumn<ExternalPollEntry>[] = [
    {
      key: "institute",
      header: "Instituto & Registro TSE",
      render: (s) => (
        <div>
          <strong>{s.instituteName}</strong>
          <div style={{ fontSize: "11px", color: "#64748b" }}>{s.tseProtocolNumber}</div>
        </div>
      ),
    },
    { key: "fieldDate", header: "Data Mediana", width: "120px", render: (s) => s.fieldMedianDate },
    {
      key: "sample",
      header: "Amostra (N)",
      width: "120px",
      align: "right",
      render: (s) => `${s.sampleSize.toLocaleString("pt-BR")}`,
    },
    {
      key: "weight",
      header: "Peso Metodológico",
      width: "150px",
      align: "right",
      render: (s) => (
        <span style={{ color: "#2563eb", fontWeight: 700 }}>{s.methodologicalWeight}</span>
      ),
    },
    {
      key: "cands",
      header: "Resultados Estimados",
      render: (s) => (
        <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
          <span>
            Alfa: <strong>{Number(s.candAPct).toFixed(1)}%</strong>
          </span>
          <span>
            Beta: <strong>{Number(s.candBPct).toFixed(1)}%</strong>
          </span>
          <span>
            Gama: <strong>{Number(s.candCPct).toFixed(1)}%</strong>
          </span>
        </div>
      ),
    },
  ];

  const handleSaveExternal = (data: ExternalSurveyFormData): void => {
    const newItem: ExternalPollEntry = {
      id: `poll-${Date.now()}`,
      instituteName: data.instituteName,
      tseProtocolNumber: data.protocolTse,
      fieldMedianDate: data.fieldDate,
      sampleSize: data.sampleSize,
      marginOfError: "2.5000",
      methodologicalWeight: "1.1000",
      houseEffectAdjustment: "0.0000",
      sqrtSampleWeight: "1.0000",
      temporalDecayWeight: "1.0000",
      candAPct: data.candA_pct.toString(),
      candBPct: data.candB_pct.toString(),
      candCPct: data.candC_pct.toString(),
    };
    setSurveys((prev) => [newItem, ...prev]);
    setFeedbackMsg(
      `Pesquisa do instituto ${data.instituteName} incluída e incorporada à média móvel ponderada!`
    );
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {feedbackMsg && (
        <div
          data-testid="aggregator-feedback"
          style={{
            padding: "10px 16px",
            backgroundColor: "#183724",
            color: "#a8dab5",
            border: "1px solid rgba(129, 201, 149, 0.3)",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 600,
            marginBottom: "16px",
          }}
        >
          {feedbackMsg}
        </div>
      )}

      {activeTab === "TAB_TREND" && (
        <div style={{ marginBottom: "20px" }}>
          <AggregatorTrendAndTable
            candidates={
              AGGREGATED_CANDIDATES_BY_HALFLIFE[
                filterHalfLife === "7" ? "7.0000" : filterHalfLife === "21" ? "30.0000" : "14.0000"
              ] ?? []
            }
            trendSeries={HISTORICAL_TREND_SERIES}
            polls={surveys}
            halfLifeDays={filterHalfLife}
            onChangeHalfLife={setFilterHalfLife}
          />
        </div>
      )}

      <EnterpriseCrudWorkspace<ExternalPollEntry>
        title="Agregador de Pesquisas Eleitorais (Polling Aggregator)"
        subtitle="Média móvel ponderada por raiz da amostra (√N), decaimento temporal e neutralização de House Effects"
        globalActions={
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            style={{
              padding: "9px 18px",
              backgroundColor: "#8ab4f8",
              color: "#003061",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
            }}
          >
            + Incluir Pesquisa Externa no Agregador
          </button>
        }
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={kpis}
        searchPlaceholder="Buscar por instituto ou protocolo TSE..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        onClearFilters={() => {
          setSearch("");
          setFilterInstitute("ALL");
        }}
        columns={columns}
        data={filteredSurveys}
        keyExtractor={(s) => s.id}
      />

      <AggregatorExternalSurveyDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSaveExternal}
      />
    </div>
  );
}
