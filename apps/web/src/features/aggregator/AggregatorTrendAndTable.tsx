import React from "react";
import type {
  CandidateAggregateDetail,
  ExternalPollEntry,
  HistoricalTrendPoint,
} from "./aggregatorData";

interface AggregatorTrendAndTableProps {
  readonly candidates: readonly CandidateAggregateDetail[];
  readonly trendSeries: readonly HistoricalTrendPoint[];
  readonly polls: readonly ExternalPollEntry[];
  readonly halfLifeDays: string;
  readonly onChangeHalfLife: (val: string) => void;
}

export function AggregatorTrendAndTable({
  candidates,
  trendSeries,
  polls,
  halfLifeDays,
  onChangeHalfLife,
}: AggregatorTrendAndTableProps): React.JSX.Element {
  return (
    <div style={{ display: "grid", gap: "16px", marginTop: "16px" }}>
      {/* 5.2 & 5.3 Motor de Média Móvel Ponderada + Banda de Confiança IC 95% */}
      <div
        data-testid="aggregator-moving-average-panel"
        style={{
          backgroundColor: "#1b1c1c",
          border: "1px solid #353535",
          borderRadius: "12px",
          padding: "16px",
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
              5.2 Motor de Média Móvel Ponderada (Peso √N • Decaimento Exponencial • House Effects)
            </div>
            <div style={{ fontSize: "11px", color: "#9aa0a6" }}>
              Estimativa agregada com Banda de Confiança IC 95% e correção de viés sistemático de
              institutos
            </div>
          </div>

          <label style={{ fontSize: "12px", fontWeight: 600 }}>
            Meia-Vida Temporal (λ):
            <select
              data-testid="select-aggregator-halflife"
              value={halfLifeDays}
              onChange={(e) => onChangeHalfLife(e.target.value)}
              style={{
                marginLeft: "6px",
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid #353535",
                fontSize: "12px",
                backgroundColor: "#202020",
              }}
            >
              <option value="7.0000">7.0000 dias (Reação Rápida)</option>
              <option value="14.0000">14.0000 dias (Padrão Eleitoral)</option>
              <option value="30.0000">30.0000 dias (Suavização Longa)</option>
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gap: "10px" }}>
          {candidates.map((cand) => {
            const widthPct = Math.min(100, Math.max(4, Number.parseFloat(cand.weightedAveragePct)));
            return (
              <div
                key={cand.candidateCode}
                style={{
                  backgroundColor: "#202020",
                  border: "1px solid #353535",
                  borderRadius: "10px",
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    marginBottom: "6px",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <span>
                    <strong>{cand.candidateCode}</strong> — {cand.candidateName} ({cand.party})
                  </span>
                  <span style={{ fontFamily: "monospace" }}>
                    Média Ponderada: <strong>{cand.weightedAveragePct}%</strong> (IC 95%: [
                    {cand.confidenceBandLow}% – {cand.confidenceBandHigh}%]) | Ajuste House:{" "}
                    {cand.houseAdjustedDelta} p.p.
                  </span>
                </div>
                <div
                  style={{
                    height: "10px",
                    width: "100%",
                    backgroundColor: "#353535",
                    borderRadius: "9999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${widthPct}%`,
                      backgroundColor: cand.color,
                      borderRadius: "9999px",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5.3 Curva de Tendência Histórica */}
      <div
        data-testid="aggregator-trend-curve"
        style={{
          backgroundColor: "#1b1c1c",
          border: "1px solid #353535",
          borderRadius: "12px",
          padding: "16px",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: "14px", color: "#8ab4f8", marginBottom: "8px" }}>
          5.3 Curva de Tendência Histórica (Série Temporal Ponderada)
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "10px",
          }}
        >
          {trendSeries.map((pt) => (
            <div
              key={pt.dateLabel}
              style={{
                backgroundColor: "#202020",
                border: "1px solid #353535",
                borderRadius: "10px",
                padding: "8px 10px",
                fontSize: "12px",
              }}
            >
              <div style={{ fontWeight: 700, color: "#e5e2e1", marginBottom: "4px" }}>
                Rodada {pt.dateLabel}
              </div>
              <div style={{ fontFamily: "monospace", color: "#8ab4f8" }}>
                CAND_A: <strong>{pt.candAAvg}%</strong>
              </div>
              <div style={{ fontFamily: "monospace", color: "#81c995" }}>
                CAND_B: <strong>{pt.candBAvg}%</strong>
              </div>
              <div style={{ fontFamily: "monospace", color: "#fdd663" }}>
                CAND_C: <strong>{pt.candCAvg}%</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5.3 Tabela Comparativa de Institutos e Pesquisas Registradas */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ fontWeight: 700, fontSize: "14px", color: "#e5e2e1", marginBottom: "8px" }}>
          Tabela Comparativa de Institutos, Pesos Metodológicos (√N × Decaimento) e House Effects
        </div>
        <table
          data-testid="aggregator-institutes-table"
          style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", color: "#e5e2e1" }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #353535", textAlign: "left", color: "#9aa0a6" }}>
              <th style={{ padding: "7px 6px" }}>Instituto / Protocolo TSE</th>
              <th style={{ padding: "7px 6px" }}>Data Mediana</th>
              <th style={{ padding: "7px 6px" }}>Amostra (N) / √N</th>
              <th style={{ padding: "7px 6px" }}>Rating / House Effect</th>
              <th style={{ padding: "7px 6px" }}>Peso Temporal</th>
              <th style={{ padding: "7px 6px" }}>CAND_A</th>
              <th style={{ padding: "7px 6px" }}>CAND_B</th>
              <th style={{ padding: "7px 6px" }}>CAND_C</th>
            </tr>
          </thead>
          <tbody>
            {polls.map((poll) => (
              <tr key={poll.id} style={{ borderBottom: "1px solid #353535" }}>
                <td style={{ padding: "8px 6px" }}>
                  <strong>{poll.instituteName}</strong>
                  <div style={{ fontSize: "11px", color: "#9aa0a6", fontFamily: "monospace" }}>
                    {poll.tseProtocolNumber}
                  </div>
                </td>
                <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>
                  {poll.fieldMedianDate}
                </td>
                <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>
                  {poll.sampleSize} ({poll.sqrtSampleWeight})
                </td>
                <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>
                  w={poll.methodologicalWeight} | Δ={poll.houseEffectAdjustment}
                </td>
                <td style={{ padding: "8px 6px", fontFamily: "monospace", color: "#8ab4f8" }}>
                  {poll.temporalDecayWeight}
                </td>
                <td style={{ padding: "8px 6px", fontFamily: "monospace", fontWeight: 700 }}>
                  {poll.candAPct}%
                </td>
                <td style={{ padding: "8px 6px", fontFamily: "monospace", fontWeight: 700 }}>
                  {poll.candBPct}%
                </td>
                <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>{poll.candCPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

