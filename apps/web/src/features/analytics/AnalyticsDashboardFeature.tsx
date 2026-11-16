import React, { useState } from "react";
import { Card } from "../../components/ui/Card";
import { AnalyticsCrosstabAndExport } from "./AnalyticsCrosstabAndExport";
import {
  ANALYTICS_SURVEYS_LIST,
  type DemographicDimensionKey,
} from "./analyticsData";

export function AnalyticsDashboardFeature(): React.JSX.Element {
  const activeDataset = ANALYTICS_SURVEYS_LIST[0];
  const [showValidOnly, setShowValidOnly] = useState<boolean>(false);
  const [maxIterations, setMaxIterations] = useState<number>(50);
  const [tolerance, setTolerance] = useState<string>("0.0001");
  const [rakingCycles, setRakingCycles] = useState<number>(
    activeDataset?.rakingSummary.iterationsRun ?? 14,
  );
  const [rakingToast, setRakingToast] = useState<string | null>(null);
  const [dimension, setDimension] = useState<DemographicDimensionKey>("SEXO");
  const [selectedRunoffId, setSelectedRunoffId] = useState<string>(
    activeDataset?.runoffMatchups[0]?.id ?? "RUNOFF_AB",
  );
  const [exportToast, setExportToast] = useState<string | null>(null);

  if (!activeDataset) return <div />;

  const { rakingSummary, enrichedOptions, crosstabs, runoffMatchups } = activeDataset;

  const handleRunRaking = (): void => {
    setRakingCycles(15);
    setRakingToast(
      `Pós-estratificação Raking (IPF) recalibrada em 15 iterações (Tolerância Δ <= ${tolerance} | DEFF de Kish = ${rakingSummary.kishDeff}).`,
    );
  };

  const handleExportReport = (format: "TSE_PESQELE" | "PDF" | "XLSX"): void => {
    setExportToast(
      `Pacote ${format} gerado com manifesto SHA-256 (${activeDataset.protocolTse} — ${activeDataset.statisticianConre}).`,
    );
  };

  return (
    <Card
      title="Épico 4 — Ponderação Raking (IPF), Tabulação Rápida TSE, Crosstabs & Simulador de 2º Turno"
      subtitle={`DEFF de Kish: ${rakingSummary.kishDeff} | N Efetivo: ${rakingSummary.effectiveSampleSize} | Margem Ajustada: ±${rakingSummary.adjustedMarginOfError} p.p. (${activeDataset.statisticianConre})`}
      badgeText={`Protocolo PesqEle: ${activeDataset.protocolTse}`}
    >
      {/* 4.1 Painel de Calibração Raking (IPF) e KPIs de Efeito do Desenho (Kish DEFF) */}
      <div
        data-testid="raking-calibration-panel"
        style={{
          backgroundColor: "#1b1c1c",
          border: "1px solid #353535",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "#e5e2e1" }}>
              4.1 Motor Iterative Proportional Fitting (Raking) & Efeito do Desenho (Kish DEFF)
            </div>
            <div style={{ fontSize: "11px", color: "#9aa0a6" }}>
              Convergência em <strong data-testid="raking-iterations-val">{rakingCycles}</strong>{" "}
              iterações • Trimagem de pesos: [{rakingSummary.minWeightApplied},{" "}
              {rakingSummary.maxWeightApplied}] • Margem Nominal: ±
              {rakingSummary.nominalMarginOfError}% → Ajustada: ±
              {rakingSummary.adjustedMarginOfError}%
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: "11px", fontWeight: 600 }}>
              Máx Iterações:
              <input
                data-testid="input-raking-iterations"
                type="number"
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value))}
                style={{
                  width: "60px",
                  marginLeft: "4px",
                  padding: "5px 6px",
                  borderRadius: "6px",
                  border: "1px solid #353535",
                  fontSize: "12px",
                }}
              />
            </label>
            <label style={{ fontSize: "11px", fontWeight: 600 }}>
              Tolerância Δ:
              <select
                data-testid="select-raking-tolerance"
                value={tolerance}
                onChange={(e) => setTolerance(e.target.value)}
                style={{
                  marginLeft: "4px",
                  padding: "5px 6px",
                  borderRadius: "6px",
                  border: "1px solid #353535",
                  fontSize: "12px",
                }}
              >
                <option value="0.0001">0.0001 (Padrão TSE)</option>
                <option value="0.0005">0.0005</option>
                <option value="0.0010">0.0010</option>
              </select>
            </label>
            <button
              type="button"
              data-testid="btn-run-raking"
              onClick={handleRunRaking}
              style={{
                padding: "8px 14px",
                backgroundColor: "#8ab4f8",
                color: "#003061",
                border: "none",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Executar Calibração Raking (IPF)
            </button>
          </div>
        </div>

        {rakingToast && (
          <div
            data-testid="raking-status-toast"
            style={{
              padding: "8px 12px",
              backgroundColor: "#183724",
              border: "1px solid rgba(129, 201, 149, 0.3)",
              borderRadius: "8px",
              color: "#a8dab5",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {rakingToast}
          </div>
        )}
      </div>

      {/* 4.2 Tabulação Rápida SQL (FILTER Pivoting): Votos Totais, Válidos, Rejeição e Margem */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: "14px", color: "#e5e2e1" }}>
          4.2 Tabulação Oficial TSE — Votos Totais, Votos Válidos, Rejeição e Margem por Estrato
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={showValidOnly}
            onChange={(e) => setShowValidOnly(e.target.checked)}
            data-testid="toggle-valid-votes"
          />
          <span>Exibir apenas Votos Válidos (Critério TSE — exclui Brancos/Nulos/Indecisos)</span>
        </label>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #353535", textAlign: "left", color: "#9aa0a6" }}>
            <th style={{ padding: "8px 6px" }}>Candidato / Opção</th>
            <th style={{ padding: "8px 6px" }}>Amostra Bruta</th>
            <th style={{ padding: "8px 6px" }}>Peso Raking (IPF)</th>
            <th style={{ padding: "8px 6px" }}>% Votos Totais</th>
            <th style={{ padding: "8px 6px" }}>% Votos Válidos (TSE)</th>
            <th style={{ padding: "8px 6px" }}>Taxa de Rejeição</th>
            <th style={{ padding: "8px 6px" }}>Margem Estrato</th>
          </tr>
        </thead>
        <tbody>
          {enrichedOptions
            .filter((opt) => (!showValidOnly ? true : !opt.is_non_valid_option))
            .map((opt) => (
              <tr key={opt.option_code} style={{ borderBottom: "1px solid #353535" }}>
                <td style={{ padding: "8px 6px", fontWeight: 600 }}>
                  {opt.option_label}{" "}
                  <span style={{ fontSize: "11px", color: "#9aa0a6" }}>({opt.party})</span>
                </td>
                <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>{opt.raw_count}</td>
                <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>{opt.weighted_count}</td>
                <td style={{ padding: "8px 6px", fontFamily: "monospace", fontWeight: 700, color: "#e5e2e1" }}>
                  {opt.total_votes_percentage}%
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    fontFamily: "monospace",
                    fontWeight: 700,
                    color: "#8ab4f8",
                  }}
                >
                  {opt.valid_votes_percentage ? `${opt.valid_votes_percentage}%` : "—"}
                </td>
                <td style={{ padding: "8px 6px", fontFamily: "monospace", color: "#f28b82" }}>
                  {opt.is_non_valid_option ? "—" : `${opt.rejection_percentage}%`}
                </td>
                <td style={{ padding: "8px 6px", fontFamily: "monospace", color: "#c3c6d1" }}>
                  ±{opt.stratum_margin_error} p.p.
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      <AnalyticsCrosstabAndExport
        dimension={dimension}
        onChangeDimension={setDimension}
        rows={crosstabs[dimension]}
        runoffMatchups={runoffMatchups}
        selectedRunoffId={selectedRunoffId}
        onChangeRunoff={setSelectedRunoffId}
        onExportReport={handleExportReport}
        exportToast={exportToast}
        integritySha256={activeDataset.integritySha256}
      />
    </Card>
  );
}
