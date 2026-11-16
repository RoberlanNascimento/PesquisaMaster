import React from "react";
import { useUiSessionStore } from "../../lib/store";

interface SurveyGlobalActionsProps {
  readonly dbConnected: boolean;
  readonly dbDetails: string;
  readonly onNewSurvey: () => void;
}

export function SurveyGlobalActions({
  dbConnected,
  dbDetails,
  onNewSurvey,
}: SurveyGlobalActionsProps): React.JSX.Element {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      {dbConnected && (
        <span
          data-testid="badge-postgres-connected"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            fontWeight: 600,
            padding: "5px 10px",
            borderRadius: "9999px",
            backgroundColor: "rgba(34, 197, 94, 0.15)",
            color: "#4ade80",
            border: "1px solid rgba(34, 197, 94, 0.3)",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: "#22c55e",
              boxShadow: "0 0 6px #22c55e",
            }}
          />
          {dbDetails || "🟢 PostgreSQL: pesquisas (Conectado)"}
        </span>
      )}

      <button
        type="button"
        data-testid="btn-open-survey-composition"
        onClick={() => {
          useUiSessionStore.getState().setActiveTab("survey-composition");
          useUiSessionStore.getState().setCurrentPath("/composicao-pesquisas");
          if (typeof window !== "undefined") window.history.pushState({}, "", "/composicao-pesquisas");
        }}
        style={{
          padding: "9px 16px",
          backgroundColor: "transparent",
          color: "#e5e2e1",
          border: "1px solid #353535",
          fontSize: "13px",
          fontWeight: 500,
          borderRadius: "12px",
          cursor: "pointer",
        }}
      >
        🧩 Composição de Pesquisas
      </button>

      <button
        type="button"
        data-testid="btn-open-questionnaires-sub"
        onClick={() => {
          useUiSessionStore.getState().setActiveTab("questionnaires");
          useUiSessionStore.getState().setCurrentPath("/questionarios");
          if (typeof window !== "undefined") window.history.pushState({}, "", "/questionarios");
        }}
        style={{
          padding: "9px 16px",
          backgroundColor: "transparent",
          color: "#e5e2e1",
          border: "1px solid #353535",
          fontSize: "13px",
          fontWeight: 500,
          borderRadius: "12px",
          cursor: "pointer",
        }}
      >
        📝 Construtor de Questionários
      </button>

      <button
        type="button"
        data-testid="btn-new-survey-tse"
        onClick={onNewSurvey}
        style={{
          padding: "10px 18px",
          backgroundColor: "#8ab4f8",
          color: "#003061",
          fontSize: "13px",
          fontWeight: 600,
          borderRadius: "12px",
          border: "none",
          cursor: "pointer",
        }}
      >
        + Nova Pesquisa TSE
      </button>
    </div>
  );
}

