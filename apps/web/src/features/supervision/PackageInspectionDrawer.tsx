import React, { useState } from "react";
import {
  type FieldPackageItem,
  type PackageAuditStatus,
  STATUS_BADGE_MAP,
} from "./supervisionData";
import { PackageBiometricAuditSection } from "./PackageBiometricAuditSection";

interface PackageInspectionDrawerProps {
  readonly pkg: FieldPackageItem | null;
  readonly onClose: () => void;
  readonly onDecision: (pkgId: string, targetStatus: PackageAuditStatus, reason: string) => void;
}

const ACTION_BTN: React.CSSProperties = {
  flex: 1,
  padding: "9px 12px",
  color: "#ffffff",
  border: "none",
  borderRadius: "6px",
  fontWeight: 700,
  fontSize: "12px",
  cursor: "pointer",
};

export function PackageInspectionDrawer({
  pkg,
  onClose,
  onDecision,
}: PackageInspectionDrawerProps): React.JSX.Element | null {
  const [auditReason, setAuditReason] = useState<string>(
    "Verificação técnica de geofencing PostGIS e consistência de respostas concluída.",
  );

  if (!pkg) return null;
  const badge = STATUS_BADGE_MAP[pkg.status];

  return (
    <div
      data-testid="package-inspection-drawer-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 250,
      }}
    >
      <aside
        data-testid="package-inspection-drawer"
        aria-label={`Inspeção do Pacote ${pkg.packageProtocol}`}
        style={{
          width: "520px",
          maxWidth: "95vw",
          height: "100vh",
          backgroundColor: "#2a2a2a",
          borderLeft: "1px solid #424750",
          color: "#e5e2e1",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflowY: "auto",
          padding: "20px 22px",
          boxSizing: "border-box",
        }}
      >
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #353535", paddingBottom: "10px", marginBottom: "12px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ margin: 0, fontSize: "17px", color: "#e5e2e1" }}>Inspeção — {pkg.packageProtocol}</h2>
                <span style={{ backgroundColor: badge.bg, color: badge.color, padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700 }}>{badge.label}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#c3c6d1", marginTop: "4px" }}>{pkg.surveyLabel} • {pkg.regionSector}</div>
              <div style={{ fontSize: "11px", color: "#9aa0a6", fontFamily: "monospace" }}>Pesquisador: {pkg.researcherName} | Hash: {pkg.deviceHash}</div>
            </div>
            <button
              type="button"
              data-testid="btn-close-drawer"
              onClick={onClose}
              style={{ backgroundColor: "#202020", color: "#e5e2e1", border: "1px solid #353535", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
            >
              Fechar ✕
            </button>
          </div>

          <div data-testid="drawer-quota-status" style={{ backgroundColor: "#202020", border: "1px solid #353535", borderRadius: "12px", padding: "10px 12px", marginBottom: "12px", fontSize: "12px" }}>
            <div style={{ fontWeight: 700, color: "#e5e2e1", marginBottom: "4px" }}>
              Célula de Cota Vinculada (Hare-Niemeyer): {pkg.quotaCellLabel}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#c3c6d1" }}>
              <span>
                Preenchimento Atual: <strong data-testid="drawer-quota-count">{pkg.quotaCurrentFilled} / {pkg.quotaTargetTotal}</strong>
              </span>
              <span style={{ color: "#8ab4f8", fontWeight: 600 }}>Reprovar estorna automaticamente a cota no banco</span>
            </div>
          </div>

          <div style={{ marginBottom: "14px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#e5e2e1", marginBottom: "6px", display: "flex", justifyContent: "space-between" }}>
              <span>Mapa GPS de Captura vs Polígono do Setor IBGE (SRID 4674)</span>
              <span style={{ fontSize: "11px", color: "#9aa0a6" }}>±{pkg.gpsPrecisionMeters}m</span>
            </div>
            <div data-testid="drawer-gps-map" style={{ position: "relative", height: "155px", backgroundColor: "#1b1c1c", borderRadius: "12px", border: "1px solid #353535", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: "20%", top: "22%", width: "56%", height: "60%", border: "2px dashed #8ab4f8", backgroundColor: "rgba(138, 180, 248, 0.14)", borderRadius: "8px", padding: "6px", fontSize: "10px", fontWeight: 700, color: "#8ab4f8" }}>
                Perímetro Oficial {pkg.regionSector}
              </div>
              {pkg.gpsPoints.map((pt) => (
                <div
                  key={pt.id}
                  data-testid={`gps-pin-${pt.id}`}
                  style={{
                    position: "absolute",
                    left: `${pt.relXPercent}%`,
                    top: `${pt.relYPercent}%`,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: pt.insideSector ? "#81c995" : "#f28b82",
                    color: pt.insideSector ? "#00391b" : "#690005",
                    padding: "2px 6px",
                    borderRadius: "9999px",
                    fontSize: "10px",
                    fontWeight: 700,
                    border: "1px solid #202020",
                  }}
                >
                  {pt.insideSector ? "✓ GPS" : "⚠ FORA"} ({pt.lat}, {pt.lon})
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: "12px", fontWeight: 700, color: "#e5e2e1", marginBottom: "6px" }}>
            Respostas Inspecionadas no Pacote ({pkg.sampleAnswers.length} quesitos auditados)
          </div>
          <table data-testid="drawer-answers-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #353535", textAlign: "left", color: "#9aa0a6" }}>
                <th style={{ padding: "5px 4px" }}>Quesito</th>
                <th style={{ padding: "5px 4px" }}>Tipo</th>
                <th style={{ padding: "5px 4px" }}>Resposta Registrada</th>
                <th style={{ padding: "5px 4px", textAlign: "right" }}>Tempo</th>
              </tr>
            </thead>
            <tbody>
              {pkg.sampleAnswers.map((ans) => (
                <tr key={ans.questionCode} style={{ borderBottom: "1px solid #353535" }}>
                  <td style={{ padding: "5px 4px" }}>
                    <strong>{ans.questionCode}</strong>
                    <div style={{ fontSize: "11px", color: "#9aa0a6" }}>{ans.questionText}</div>
                  </td>
                  <td style={{ padding: "5px 4px", fontSize: "11px", fontWeight: 600 }}>{ans.responseType}</td>
                  <td style={{ padding: "5px 4px", fontWeight: 600 }}>{ans.selectedAnswer}</td>
                  <td style={{ padding: "5px 4px", textAlign: "right", fontFamily: "monospace" }}>{ans.durationSec}s</td>
                </tr>
              ))}
            </tbody>
          </table>

          <PackageBiometricAuditSection pkg={pkg} />
        </div>

        <div style={{ borderTop: "1px solid #353535", paddingTop: "10px" }}>
          <input
            id="drawer-audit-reason"
            data-testid="input-drawer-audit-reason"
            type="text"
            aria-label="Justificativa de Auditoria"
            value={auditReason}
            onChange={(e) => setAuditReason(e.target.value)}
            style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1px solid #353535", fontSize: "12px", marginBottom: "8px", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" data-testid="btn-drawer-approve" onClick={() => onDecision(pkg.id, "VALIDATED", auditReason)} style={{ ...ACTION_BTN, backgroundColor: "#81c995", color: "#00391b" }}>
              ✓ Autorizar & Validar Pacote
            </button>
            <button type="button" data-testid="btn-drawer-reject" onClick={() => onDecision(pkg.id, "REJECTED", auditReason)} style={{ ...ACTION_BTN, backgroundColor: "#f28b82", color: "#690005" }}>
              ✕ Reprovar & Estornar Cota
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
