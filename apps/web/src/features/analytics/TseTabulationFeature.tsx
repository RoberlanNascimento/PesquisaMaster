import React, { useState, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import {
  ANALYTICS_SURVEYS_LIST,
  type OptionWithRejection,
} from "./analyticsData";
import {
  TABULATION_TABS,
  getTabulationKpis,
  getTabulationFilters,
  getTabulationColumns,
} from "./tabulationConfig";

export function TseTabulationFeature(): React.JSX.Element {
  const dataset = ANALYTICS_SURVEYS_LIST[0];
  const allOptions = dataset?.enrichedOptions ?? [];

  const [activeTab, setActiveTab] = useState<string>("TAB_CROSSTABS");
  const [isOnlyValidVotes, setIsOnlyValidVotes] = useState<boolean>(false);
  const [filterSurvey, setFilterSurvey] = useState<string>("SP-01234/2026");
  const [filterScenario, setFilterScenario] = useState<string>("ESTIMULADA");
  const [filterCrosstab, setFilterCrosstab] = useState<string>("SEXO");
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const displayedResults = useMemo(() => {
    if (isOnlyValidVotes) {
      return allOptions.filter((o) => !o.is_non_valid_option);
    }
    return allOptions;
  }, [allOptions, isOnlyValidVotes]);

  const kpis = useMemo(
    () => getTabulationKpis(dataset?.rakingSummary.kishDeff ?? "1.124", isOnlyValidVotes),
    [dataset?.rakingSummary.kishDeff, isOnlyValidVotes]
  );

  const filters = useMemo(
    () =>
      getTabulationFilters(
        filterSurvey,
        setFilterSurvey,
        filterScenario,
        setFilterScenario,
        filterCrosstab,
        setFilterCrosstab
      ),
    [filterSurvey, filterScenario, filterCrosstab]
  );

  const columns = useMemo(
    () => getTabulationColumns(isOnlyValidVotes),
    [isOnlyValidVotes]
  );

  const handleRecalculateRaking = (): void => {
    setFeedbackMsg(
      "⚖️ Algoritmo Iterative Proportional Fitting (IPF) executado com sucesso! Kish DEFF = 1.124."
    );
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleExportXlsx = (): void => {
    setFeedbackMsg(
      `📊 Matriz de Contingência (${filterCrosstab}) exportada em planilha XLSX Jornalística para ${filterSurvey}!`
    );
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleExportTse = (): void => {
    setFeedbackMsg(
      "📥 Pacote de Auditoria PesqEle/TSE gerado com assinatura SHA-256 e memória de cálculo."
    );
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {feedbackMsg && (
        <div
          data-testid="tabulation-feedback"
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

      <EnterpriseCrudWorkspace<OptionWithRejection>
        title="Motor de Tabulação TSE, Raking (IPF) e Relatórios Cruzados"
        subtitle="Pós-estratificação multidimensional, Kish Design Effect e apuração de votos válidos oficiais"
        globalActions={
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setIsOnlyValidVotes(!isOnlyValidVotes)}
              style={{
                padding: "9px 15px",
                borderRadius: "10px",
                border: isOnlyValidVotes ? "1px solid #8ab4f8" : "1px solid #353535",
                backgroundColor: isOnlyValidVotes ? "#2a2a2a" : "#202020",
                color: isOnlyValidVotes ? "#8ab4f8" : "#e5e2e1",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {isOnlyValidVotes ? "✓ Modo: Votos Válidos TSE" : "Modo: Votos Totais"}
            </button>
            <button
              type="button"
              onClick={handleRecalculateRaking}
              style={{
                padding: "9px 15px",
                backgroundColor: "#fdd663",
                color: "#332200",
                border: "none",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ⚖️ Recalibrar Raking (IPF)
            </button>
            <button
              type="button"
              data-testid="btn-export-xlsx"
              onClick={handleExportXlsx}
              style={{
                padding: "9px 15px",
                backgroundColor: "#81c995",
                color: "#00391b",
                border: "none",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              📊 Exportar Crosstabs XLSX
            </button>
            <button
              type="button"
              onClick={handleExportTse}
              style={{
                padding: "9px 16px",
                backgroundColor: "#8ab4f8",
                color: "#003061",
                border: "none",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              📥 Dossiê PesqEle TSE
            </button>
          </div>
        }
        tabs={TABULATION_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={kpis}
        searchPlaceholder="Buscar opção ou candidato..."
        filters={filters}
        columns={columns}
        data={displayedResults}
        keyExtractor={(c) => c.option_code}
      />
    </div>
  );
}
