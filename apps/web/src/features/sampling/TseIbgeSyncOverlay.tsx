import React from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors } = NOCTURNE_TOKENS;

export interface SyncOverlayState {
  readonly status: "idle" | "loading" | "success" | "error";
  readonly title: string;
  readonly message: string;
}

export const INITIAL_SYNC_OVERLAY: SyncOverlayState = {
  status: "idle",
  title: "",
  message: "",
};

export function TseIbgeSyncOverlay({
  state,
  onClose,
}: {
  readonly state: SyncOverlayState;
  readonly onClose: () => void;
}): React.JSX.Element | null {
  if (state.status === "idle") return null;

  const isLoading = state.status === "loading";
  const isSuccess = state.status === "success";
  const accentColor = isLoading ? "#8ab4f8" : isSuccess ? "#81c995" : "#f28b82";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-busy={isLoading}
      aria-label={state.title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <style>{`@keyframes pmSpin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          backgroundColor: "#1b1c1d",
          border: `1px solid ${accentColor}`,
          borderRadius: "16px",
          padding: "24px 22px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.75)",
          color: colors.textPrimary,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}
      >
        {isLoading ? (
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              border: "4px solid rgba(138, 180, 248, 0.2)",
              borderTopColor: "#8ab4f8",
              animation: "pmSpin 0.85s linear infinite",
            }}
          />
        ) : (
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              backgroundColor: isSuccess ? "rgba(129, 201, 149, 0.16)" : "rgba(242, 139, 130, 0.16)",
              color: accentColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              fontWeight: 700,
            }}
          >
            {isSuccess ? "✓" : "✕"}
          </div>
        )}

        <h4 style={{ margin: 0, fontSize: "15.5px", color: accentColor }}>{state.title}</h4>
        <p style={{ margin: 0, fontSize: "12.5px", lineHeight: 1.5, color: colors.textPrimary }}>
          {state.message}
        </p>

        {!isLoading && (
          <button
            type="button"
            onClick={onClose}
            style={{
              marginTop: "6px",
              padding: "8px 22px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: accentColor,
              color: isSuccess ? "#00391b" : "#690005",
              fontWeight: 700,
              fontSize: "12.5px",
              cursor: "pointer",
            }}
          >
            Fechar
          </button>
        )}
      </div>
    </div>
  );
}
