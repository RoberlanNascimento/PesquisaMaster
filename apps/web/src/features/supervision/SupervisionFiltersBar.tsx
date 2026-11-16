import React from "react";

export function SummaryMetricBox({
  label,
  value,
  subtext,
  accentColor,
  testId,
}: {
  readonly label: string;
  readonly value: number;
  readonly subtext: string;
  readonly accentColor: string;
  readonly testId: string;
}): React.JSX.Element {
  return (
    <div
      data-testid={testId}
      style={{
        backgroundColor: "#1b1c1c",
        border: "1px solid #353535",
        borderLeft: `4px solid ${accentColor}`,
        borderRadius: "12px",
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "#9aa0a6",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "24px", fontWeight: 700, color: "#e5e2e1", margin: "4px 0" }}>
        {value}
      </div>
      <div style={{ fontSize: "11px", color: "#c3c6d1" }}>{subtext}</div>
    </div>
  );
}

interface SupervisionFiltersBarProps {
  readonly uniqueSurveys: readonly string[];
  readonly uniqueRegions: readonly string[];
  readonly filterSurvey: string;
  readonly filterRegion: string;
  readonly onChangeSurvey: (val: string) => void;
  readonly onChangeRegion: (val: string) => void;
}

export function SupervisionFiltersBar({
  uniqueSurveys,
  uniqueRegions,
  filterSurvey,
  filterRegion,
  onChangeSurvey,
  onChangeRegion,
}: SupervisionFiltersBarProps): React.JSX.Element {
  const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #353535",
    fontSize: "12px",
    backgroundColor: "#202020",
    color: "#e5e2e1",
  };

  return (
    <div
      style={{
        backgroundColor: "#1b1c1c",
        border: "1px solid #353535",
        borderRadius: "12px",
        padding: "14px",
        marginBottom: "16px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "12px",
        alignItems: "end",
      }}
    >
      <div>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#c3c6d1", marginBottom: "4px" }}>
          Pesquisa Em Andamento
        </label>
        <select
          data-testid="filter-survey"
          value={filterSurvey}
          onChange={(e) => onChangeSurvey(e.target.value)}
          style={selectStyle}
        >
          <option value="ALL">Todas as Pesquisas</option>
          {uniqueSurveys.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#c3c6d1", marginBottom: "4px" }}>
          Regiões Censitárias
        </label>
        <select
          data-testid="filter-region"
          value={filterRegion}
          onChange={(e) => onChangeRegion(e.target.value)}
          style={selectStyle}
        >
          <option value="ALL">Todas as Regiões/Setores</option>
          {uniqueRegions.map((reg) => (
            <option key={reg} value={reg}>{reg}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

