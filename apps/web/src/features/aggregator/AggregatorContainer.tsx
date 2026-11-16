import React, { useState } from "react";
import { PollingAggregatorFeature } from "./PollingAggregatorFeature";
import { AggregatorWorkspaceFeature } from "./AggregatorWorkspaceFeature";

export function AggregatorContainer(): React.JSX.Element {
  const [currentSubView, setCurrentSubView] = useState<"VISUAL" | "WORKSPACE">("VISUAL");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{
          display: "flex",
          gap: "8px",
          backgroundColor: "#1b1c1c",
          border: "1px solid #353535",
          padding: "4px",
          borderRadius: "9999px",
          width: "fit-content",
        }}
      >
        <button
          type="button"
          onClick={() => setCurrentSubView("VISUAL")}
          style={{
            padding: "7px 16px",
            fontSize: "12px",
            fontWeight: 600,
            borderRadius: "9999px",
            border: "none",
            backgroundColor: currentSubView === "VISUAL" ? "#8ab4f8" : "transparent",
            color: currentSubView === "VISUAL" ? "#003061" : "#9aa0a6",
            cursor: "pointer",
          }}
        >
          📈 Painel Visual & Curva de Tendência
        </button>
        <button
          type="button"
          onClick={() => setCurrentSubView("WORKSPACE")}
          style={{
            padding: "7px 16px",
            fontSize: "12px",
            fontWeight: 600,
            borderRadius: "9999px",
            border: "none",
            backgroundColor: currentSubView === "WORKSPACE" ? "#8ab4f8" : "transparent",
            color: currentSubView === "WORKSPACE" ? "#003061" : "#9aa0a6",
            cursor: "pointer",
          }}
        >
          📋 Workspace Corporativo (Arquétipo 4)
        </button>
      </div>

      {currentSubView === "VISUAL" ? (
        <PollingAggregatorFeature />
      ) : (
        <AggregatorWorkspaceFeature />
      )}
    </div>
  );
}

