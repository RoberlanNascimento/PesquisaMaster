import React from "react";
import { Card } from "../../components/ui/Card";
import type { CandidateStatPoint, OfficeResearchReport } from "./overviewData";

export function HorizontalBarChart({
  title,
  subtitle,
  points,
  testId,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly points: readonly CandidateStatPoint[];
  readonly testId?: string;
}): React.JSX.Element {
  return (
    <div
      data-testid={testId}
      style={{
        width: "100%",
        backgroundColor: "#1b1c1c",
        border: "1px solid #353535",
        borderRadius: "16px",
        padding: "20px 24px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: "15px", color: "#e5e2e1" }}>{title}</div>
      <div style={{ fontSize: "12px", color: "#9aa0a6", marginBottom: "20px" }}>{subtitle}</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`,
          gap: "24px",
          alignItems: "end",
          width: "100%",
          padding: "8px 12px 4px",
          boxSizing: "border-box",
        }}
      >
        {points.map((pt) => {
          const heightPct = Math.min(100, Math.max(6, Number.parseFloat(pt.percentage)));
          return (
            <div
              key={pt.code}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
              }}
            >
              <div
                style={{
                  fontFamily: "monospace",
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "#8ab4f8",
                  marginBottom: "8px",
                  textAlign: "center",
                }}
              >
                {pt.percentage}%{" "}
                <span style={{ fontSize: "11px", color: "#9aa0a6", fontWeight: 500 }}>
                  ({pt.quantity})
                </span>
              </div>
              <div
                style={{
                  height: "190px",
                  width: "100%",
                  maxWidth: "140px",
                  backgroundColor: "#202020",
                  border: "1px solid #353535",
                  borderRadius: "12px",
                  padding: "4px",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: `${heightPct}%`,
                    backgroundColor: pt.color,
                    borderRadius: "8px",
                    transition: "height 0.25s ease",
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: "10px",
                  textAlign: "center",
                  fontSize: "13px",
                  lineHeight: "18px",
                }}
              >
                <div style={{ fontWeight: 700, color: "#e5e2e1" }}>{pt.name}</div>
                <div style={{ color: "#9aa0a6", fontSize: "11px" }}>({pt.party})</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CitationsChartTable({
  points,
  officeCode,
}: {
  readonly points: readonly CandidateStatPoint[];
  readonly officeCode: string;
}): React.JSX.Element {
  return (
    <div
      data-testid={`citations-panel-${officeCode}`}
      style={{
        backgroundColor: "#1b1c1c",
        border: "1px solid #353535",
        borderRadius: "12px",
        padding: "16px",
        marginTop: "14px",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: "14px", color: "#8ab4f8", marginBottom: "4px" }}>
        Gráfico de Citações — Quantidade (N), Frequência Relativa (f) e Percentual (%)
      </div>
      <div style={{ fontSize: "11px", color: "#9aa0a6", marginBottom: "12px" }}>
        Total consolidado de menções espontâneas, estimuladas e conhecimento de marca política
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", color: "#e5e2e1" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #353535", textAlign: "left", color: "#9aa0a6" }}>
            <th style={{ padding: "8px 6px" }}>Candidato / Opção</th>
            <th style={{ padding: "8px 6px" }}>Quantidade (Citações)</th>
            <th style={{ padding: "8px 6px" }}>Frequência (f)</th>
            <th style={{ padding: "8px 6px" }}>Percentual (%)</th>
            <th style={{ padding: "8px 6px", width: "45%" }}>Distribuição Visual</th>
          </tr>
        </thead>
        <tbody>
          {points.map((pt) => {
            const widthPct = Math.min(100, Math.max(2, Number.parseFloat(pt.percentage)));
            return (
              <tr key={pt.code} style={{ borderBottom: "1px solid #353535" }}>
                <td style={{ padding: "10px 6px", fontWeight: 600 }}>
                  {pt.name} <span style={{ color: "#9aa0a6" }}>({pt.party})</span>
                </td>
                <td style={{ padding: "10px 6px", fontFamily: "monospace", fontWeight: 700 }}>
                  {pt.quantity}
                </td>
                <td style={{ padding: "10px 6px", fontFamily: "monospace" }}>{pt.frequency}</td>
                <td style={{ padding: "10px 6px", fontFamily: "monospace", fontWeight: 700, color: "#81c995" }}>
                  {pt.percentage}%
                </td>
                <td style={{ padding: "10px 6px" }}>
                  <div
                    style={{
                      height: "20px",
                      width: "100%",
                      backgroundColor: "#2a2a2a",
                      border: "1px solid #353535",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${widthPct}%`,
                        backgroundColor: pt.color,
                        borderRadius: "6px",
                      }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function OfficeSectionCard({
  office,
}: {
  readonly office: OfficeResearchReport;
}): React.JSX.Element {
  return (
    <Card
      title={`Cargo Pesquisado: ${office.officeLabel}`}
      subtitle="Comparativo de Pesquisa Espontânea, Estimulada, Cenários de 2º Turno, Taxa de Rejeição e Citações"
      badgeText={office.officeCode}
    >
      <div
        data-testid={`office-section-${office.officeCode}`}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "18px",
          width: "100%",
        }}
      >
        <HorizontalBarChart
          testId={`chart-spontaneous-${office.officeCode}`}
          title="1. Pesquisa Espontânea"
          subtitle="Intenção de voto sem apresentação do disco eleitoral"
          points={office.spontaneous}
        />
        <HorizontalBarChart
          testId={`chart-stimulated-${office.officeCode}`}
          title="2. Pesquisa Estimulada"
          subtitle="Intenção de voto com rodízio determinístico do disco TSE"
          points={office.stimulated}
        />
        {office.scenarios.map((scen) => (
          <HorizontalBarChart
            key={scen.scenarioId}
            testId={`chart-scenario-${office.officeCode}-${scen.scenarioId}`}
            title={`3. ${scen.scenarioTitle}`}
            subtitle="Simulação direta de confrontos eleitorais"
            points={scen.points}
          />
        ))}
        <HorizontalBarChart
          testId={`chart-rejection-${office.officeCode}`}
          title="4. Rejeição Eleitoral"
          subtitle="Eleitores que declararam não votar de jeito nenhum no candidato"
          points={office.rejection}
        />
      </div>

      <CitationsChartTable points={office.citations} officeCode={office.officeCode} />
    </Card>
  );
}

