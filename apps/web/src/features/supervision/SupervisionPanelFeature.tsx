import React, { useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { PackageInspectionDrawer } from "./PackageInspectionDrawer";
import { SummaryMetricBox, SupervisionFiltersBar } from "./SupervisionFiltersBar";
import {
  type FieldPackageItem,
  INITIAL_FIELD_PACKAGES,
  type PackageAuditStatus,
  STATUS_BADGE_MAP,
} from "./supervisionData";

const BTN_BASE: React.CSSProperties = {
  padding: "6px 10px",
  color: "#ffffff",
  border: "none",
  borderRadius: "4px",
  fontSize: "11px",
  fontWeight: 600,
  cursor: "pointer",
};

export function SupervisionPanelFeature(): React.JSX.Element {
  const [packages, setPackages] = useState<readonly FieldPackageItem[]>(INITIAL_FIELD_PACKAGES);
  const [filterSurvey, setFilterSurvey] = useState<string>("ALL");
  const [filterRegion, setFilterRegion] = useState<string>("ALL");
  const [auditToast, setAuditToast] = useState<string | null>(null);
  const [inspectedPkgId, setInspectedPkgId] = useState<string | null>(null);

  const inspectedPackage = useMemo(
    () => packages.find((p) => p.id === inspectedPkgId) ?? null,
    [packages, inspectedPkgId],
  );
  const uniqueSurveys = useMemo(() => Array.from(new Set(packages.map((p) => p.surveyLabel))), [packages]);
  const uniqueRegions = useMemo(() => Array.from(new Set(packages.map((p) => p.regionSector))), [packages]);

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (filterSurvey !== "ALL" && pkg.surveyLabel !== filterSurvey) return false;
      if (filterRegion !== "ALL" && pkg.regionSector !== filterRegion) return false;
      return true;
    });
  }, [packages, filterSurvey, filterRegion]);

  const totals = useMemo(
    () => ({
      received: packages.length,
      pending: packages.filter((p) => p.status === "PENDING" || p.status === "FLAGGED").length,
      gpsAlerts: packages.filter((p) => p.gpsAlert).length,
      validated: packages.filter((p) => p.status === "VALIDATED").length,
    }),
    [packages],
  );

  const handleUpdateStatus = (pkgId: string, newStatus: PackageAuditStatus, customReason?: string): void => {
    setPackages((prev) =>
      prev.map((item) => {
        if (item.id !== pkgId || item.status === newStatus) return item;
        const delta = newStatus === "REJECTED" ? -1 : newStatus === "VALIDATED" ? 1 : 0;
        const nextQuota = Math.min(item.quotaTargetTotal, Math.max(0, item.quotaCurrentFilled + delta));
        return { ...item, status: newStatus, quotaCurrentFilled: nextQuota };
      }),
    );
    const label = newStatus === "VALIDATED" ? "AUTORIZADO E VALIDADO" : "REPROVADO (Cota estornada)";
    setAuditToast(`Pacote ${pkgId} ${label} (Hash-Chain SHA-256)${customReason ? ` | ${customReason}` : ""}.`);
  };

  return (
    <Card
      title="Recepção de Pacote de Campo"
      subtitle="Visão geral das pesquisas em andamento"
      badgeText={`Exibindo ${filteredPackages.length} de ${packages.length} pacote(s)`}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px", marginBottom: "18px" }}>
        <SummaryMetricBox testId="total-received" label="Total Recebidos" value={totals.received} subtext="Pacotes sincronizados via HMAC" accentColor="#2563eb" />
        <SummaryMetricBox testId="total-pending" label="Pendentes de Análise" value={totals.pending} subtext="Aguardando autorização do Admin" accentColor="#d97706" />
        <SummaryMetricBox testId="total-gps-alerts" label="Alertas de GPS" value={totals.gpsAlerts} subtext="Desvio de polígono ou precisão" accentColor="#dc2626" />
        <SummaryMetricBox testId="total-validated" label="Pacotes Validados" value={totals.validated} subtext="Liberados para ponderação Raking" accentColor="#16a34a" />
      </div>

      <SupervisionFiltersBar
        uniqueSurveys={uniqueSurveys}
        uniqueRegions={uniqueRegions}
        filterSurvey={filterSurvey}
        filterRegion={filterRegion}
        onChangeSurvey={setFilterSurvey}
        onChangeRegion={setFilterRegion}
      />

      {auditToast && (
        <div
          data-testid="supervision-audit-toast"
          style={{
            marginBottom: "14px",
            padding: "9px 12px",
            backgroundColor: "#183724",
            border: "1px solid rgba(129, 201, 149, 0.3)",
            borderRadius: "10px",
            color: "#a8dab5",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          {auditToast}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table data-testid="supervision-packages-grid" style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", color: "#e5e2e1" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #353535", textAlign: "left", color: "#9aa0a6" }}>
              <th style={{ padding: "8px 6px" }}>Protocolo / Hash</th>
              <th style={{ padding: "8px 6px" }}>Pesquisa / Região Setor</th>
              <th style={{ padding: "8px 6px" }}>Pesquisador</th>
              <th style={{ padding: "8px 6px" }}>Coletas / Tempo</th>
              <th style={{ padding: "8px 6px" }}>Diagnóstico GPS & Antifraude</th>
              <th style={{ padding: "8px 6px" }}>Status</th>
              <th style={{ padding: "8px 6px", textAlign: "right" }}>Ações do Administrador</th>
            </tr>
          </thead>
          <tbody>
            {filteredPackages.map((pkg) => {
              const badge = STATUS_BADGE_MAP[pkg.status];
              const isFraudRow = pkg.id === "int-fraud-02";
              return (
                <tr key={pkg.id} style={{ borderBottom: "1px solid #353535" }}>
                  <td style={{ padding: "10px 6px" }}>
                    <strong>{pkg.packageProtocol}</strong>
                    <div style={{ fontSize: "11px", color: "#9aa0a6", fontFamily: "monospace" }}>{pkg.deviceHash}</div>
                  </td>
                  <td style={{ padding: "10px 6px" }}>
                    <div style={{ fontWeight: 600 }}>{pkg.surveyId}</div>
                    <div style={{ fontSize: "11px", color: "#c3c6d1" }}>{pkg.regionSector}</div>
                  </td>
                  <td style={{ padding: "10px 6px" }}>
                    <div>{pkg.researcherName}</div>
                    <div style={{ fontSize: "11px", color: "#9aa0a6" }}>{pkg.submittedAt}</div>
                  </td>
                  <td style={{ padding: "10px 6px", fontFamily: "monospace" }}>
                    <div>{pkg.interviewsCount} entrevistas</div>
                    <div style={{ fontSize: "11px", color: "#9aa0a6" }}>
                      Média: {pkg.avgDurationSeconds}s | GPS ±{pkg.gpsPrecisionMeters}m
                    </div>
                  </td>
                  <td style={{ padding: "10px 6px" }}>
                    <span style={{ fontSize: "11px", color: pkg.gpsAlert ? "#f28b82" : "#81c995", fontWeight: 600 }}>
                      {pkg.antifraudDetail}
                    </span>
                  </td>
                  <td style={{ padding: "10px 6px" }}>
                    <span
                      data-testid={isFraudRow ? "flagged-status" : `status-${pkg.id}`}
                      style={{
                        backgroundColor: badge.bg,
                        color: badge.color,
                        padding: "3px 8px",
                        borderRadius: "9999px",
                        fontWeight: 700,
                        fontSize: "11px",
                      }}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: "10px 6px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      data-testid={`btn-inspect-${pkg.id}`}
                      onClick={() => setInspectedPkgId(pkg.id)}
                      style={{ ...BTN_BASE, backgroundColor: "#0284c7", marginRight: "6px" }}
                    >
                      Inspecionar (Mapa & Respostas)
                    </button>
                    <button
                      type="button"
                      data-testid={`btn-approve-${pkg.id}`}
                      onClick={() => handleUpdateStatus(pkg.id, "VALIDATED")}
                      style={{ ...BTN_BASE, backgroundColor: "#16a34a", marginRight: "6px" }}
                    >
                      Autorizar / Validar
                    </button>
                    <button
                      type="button"
                      data-testid={isFraudRow ? "btn-purge-interview" : `btn-reject-${pkg.id}`}
                      onClick={() => handleUpdateStatus(pkg.id, "REJECTED")}
                      style={{ ...BTN_BASE, backgroundColor: "#dc2626" }}
                    >
                      Reprovar / Expurgar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PackageInspectionDrawer
        pkg={inspectedPackage}
        onClose={() => setInspectedPkgId(null)}
        onDecision={(pkgId, targetStatus, reason) => handleUpdateStatus(pkgId, targetStatus, reason)}
      />
    </Card>
  );
}
