import React from "react";
import type {
  CrosstabDemographicRow,
  DemographicDimensionKey,
  RunoffSimulationMatchup,
} from "./analyticsData";

const DIMENSION_LABELS: Record<DemographicDimensionKey, string> = {
  SEXO: "Sexo Biológico (Censo IBGE)",
  FAIXA_ETARIA: "Faixa Etária (TSE Eleitorado)",
  ESCOLARIDADE: "Grau de Instrução / Escolaridade",
  RENDA_FAMILIAR: "Renda Familiar Mensal (Salários Mínimos)",
};

const BTN_EXPORT: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
  border: "1px solid #cbd5e1",
};

interface AnalyticsCrosstabAndExportProps {
  readonly dimension: DemographicDimensionKey;
  readonly onChangeDimension: (dim: DemographicDimensionKey) => void;
  readonly rows: readonly CrosstabDemographicRow[];
  readonly runoffMatchups: readonly RunoffSimulationMatchup[];
  readonly selectedRunoffId: string;
  readonly onChangeRunoff: (id: string) => void;
  readonly onExportReport: (format: "TSE_PESQELE" | "PDF" | "XLSX") => void;
  readonly exportToast: string | null;
  readonly integritySha256: string;
}

export function AnalyticsCrosstabAndExport({
  dimension,
  onChangeDimension,
  rows,
  runoffMatchups,
  selectedRunoffId,
  onChangeRunoff,
  onExportReport,
  exportToast,
  integritySha256,
}: AnalyticsCrosstabAndExportProps): React.JSX.Element {
  const activeRunoff = runoffMatchups.find((m) => m.id === selectedRunoffId) ?? runoffMatchups[0];

  return (
    <div style={{ marginTop: "18px", display: "grid", gap: "16px" }}>
      <div
        data-testid="analytics-crosstab-section"
        style={{ backgroundColor: "#1b1c1c", border: "1px solid #353535", borderRadius: "12px", padding: "16px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#e5e2e1" }}>
              4.3 Gerador de Tabelas de Contingência (Crosstabs Demográficos Ponderados)
            </div>
            <div style={{ fontSize: "11px", color: "#9aa0a6" }}>
              Cruzamento de intenção de voto por estrato demográfico após calibração Raking (IPF)
            </div>
          </div>
          <select
            data-testid="select-crosstab-dimension"
            value={dimension}
            onChange={(e) => onChangeDimension(e.target.value as DemographicDimensionKey)}
            style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #353535", fontSize: "12px", fontWeight: 600, backgroundColor: "#202020" }}
          >
            {(Object.keys(DIMENSION_LABELS) as DemographicDimensionKey[]).map((key) => (
              <option key={key} value={key}>
                Dimensão: {DIMENSION_LABELS[key]}
              </option>
            ))}
          </select>
        </div>

        <table data-testid="crosstab-matrix-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #353535", textAlign: "left", color: "#9aa0a6" }}>
              <th style={{ padding: "7px 6px" }}>Segmento Demográfico</th>
              <th style={{ padding: "7px 6px" }}>Meta IBGE/TSE</th>
              <th style={{ padding: "7px 6px" }}>Amostra Raking</th>
              <th style={{ padding: "7px 6px" }}>Candidato Alfa</th>
              <th style={{ padding: "7px 6px" }}>Candidato Beta</th>
              <th style={{ padding: "7px 6px" }}>Candidato Gama</th>
              <th style={{ padding: "7px 6px" }}>Branco / Nulo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.categoryLabel} style={{ borderBottom: "1px solid #353535" }}>
                <td style={{ padding: "7px 6px", fontWeight: 600 }}>{r.categoryLabel}</td>
                <td style={{ padding: "7px 6px", fontFamily: "monospace" }}>{r.populationTargetPct}%</td>
                <td style={{ padding: "7px 6px", fontFamily: "monospace", color: "#8ab4f8" }}>{r.sampleWeightedPct}%</td>
                <td style={{ padding: "7px 6px", fontFamily: "monospace", fontWeight: 700 }}>{r.candAPct}%</td>
                <td style={{ padding: "7px 6px", fontFamily: "monospace", fontWeight: 700 }}>{r.candBPct}%</td>
                <td style={{ padding: "7px 6px", fontFamily: "monospace" }}>{r.candCPct}%</td>
                <td style={{ padding: "7px 6px", fontFamily: "monospace", color: "#9aa0a6" }}>{r.brancoNuloPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "14px" }}>
        <div
          data-testid="analytics-runoff-simulator"
          style={{ backgroundColor: "#1b1c1c", border: "1px solid #353535", borderRadius: "12px", padding: "16px" }}
        >
          <div style={{ fontWeight: 700, fontSize: "14px", color: "#8ab4f8", marginBottom: "8px" }}>
            4.4 Simulador de Cenários de 2º Turno (Votos Totais vs Válidos)
          </div>
          <select
            data-testid="select-runoff-matchup"
            value={activeRunoff?.id ?? ""}
            onChange={(e) => onChangeRunoff(e.target.value)}
            style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1px solid #353535", fontSize: "12px", marginBottom: "12px", backgroundColor: "#202020" }}
          >
            {runoffMatchups.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>

          {activeRunoff && (
            <div style={{ fontSize: "12px", display: "grid", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{activeRunoff.candAName}</strong>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#8ab4f8" }}>
                  Totais: {activeRunoff.candATotalPct}% | Válidos: {activeRunoff.candAValidPct}%
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{activeRunoff.candBName}</strong>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#81c995" }}>
                  Totais: {activeRunoff.candBTotalPct}% | Válidos: {activeRunoff.candBValidPct}%
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#9aa0a6" }}>
                Brancos / Nulos / Indecisos no confronto: {activeRunoff.undecidedBrancoPct}%
              </div>
            </div>
          )}
        </div>

        <div
          data-testid="analytics-export-panel"
          style={{ backgroundColor: "#1b1c1c", border: "1px solid #353535", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#e5e2e1", marginBottom: "4px" }}>
              Exportação Auditável (PDF / XLSX / Dossiê Oficial PesqEle TSE)
            </div>
            <div style={{ fontSize: "11px", color: "#9aa0a6", marginBottom: "10px" }}>
              Manifesto Assinado: <code style={{ fontSize: "10px" }}>{integritySha256}</code>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" data-testid="btn-export-tse-package" onClick={() => onExportReport("TSE_PESQELE")} style={{ ...BTN_EXPORT, backgroundColor: "#8ab4f8", color: "#003061", border: "none" }}>
              Exportar Pacote TSE (PesqEle JSON/ZIP)
            </button>
            <button type="button" data-testid="btn-export-pdf" onClick={() => onExportReport("PDF")} style={{ ...BTN_EXPORT, backgroundColor: "#2a2a2a", color: "#e5e2e1", borderColor: "#353535" }}>
              Relatório Nota Técnica (PDF)
            </button>
            <button type="button" data-testid="btn-export-xlsx" onClick={() => onExportReport("XLSX")} style={{ ...BTN_EXPORT, backgroundColor: "#2a2a2a", color: "#e5e2e1", borderColor: "#353535" }}>
              Planilha Crosstabs (XLSX)
            </button>
          </div>
          {exportToast && (
            <div
              data-testid="analytics-export-toast"
              style={{ marginTop: "10px", padding: "8px 10px", backgroundColor: "#183724", border: "1px solid rgba(129, 201, 149, 0.3)", borderRadius: "8px", fontSize: "11px", color: "#a8dab5", fontWeight: 600 }}
            >
              {exportToast}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
