import React, { useState, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { ConfirmDialogModal } from "../../components/ui/ConfirmDialogModal";
import {
  INITIAL_FIELD_PACKAGES,
  type FieldPackageItem,
  type PackageAuditStatus,
} from "./supervisionData";
import {
  getFieldTabs,
  getFieldKpis,
  getFieldFilters,
  FIELD_COLUMNS,
} from "./fieldHomologationConfig";
import { PackageInspectionDrawer } from "./PackageInspectionDrawer";

export function FieldHomologationFeature(): React.JSX.Element {
  const [packages, setPackages] = useState<readonly FieldPackageItem[]>(INITIAL_FIELD_PACKAGES);
  const [activeTab, setActiveTab] = useState<string>("PENDING");
  const [search, setSearch] = useState<string>("");
  const [filterSurvey, setFilterSurvey] = useState<string>("ALL");
  const [filterResearcher, setFilterResearcher] = useState<string>("ALL");
  const [filterAlert, setFilterAlert] = useState<string>("ALL");

  const [inspectingPackage, setInspectingPackage] = useState<FieldPackageItem | null>(null);
  const [rejectingTarget, setRejectingTarget] = useState<FieldPackageItem | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const filteredPackages = useMemo(() => {
    return packages.filter((p) => {
      if (activeTab === "PENDING" && p.status !== "PENDING") return false;
      if (activeTab === "ALERTAS" && !p.gpsAlert && p.antifraudAlert === "NONE") return false;
      if (activeTab === "VALIDATED" && p.status !== "VALIDATED") return false;
      if (activeTab === "REJECTED" && p.status !== "REJECTED") return false;

      if (filterSurvey !== "ALL" && !p.surveyLabel.includes(filterSurvey)) return false;
      if (filterResearcher !== "ALL" && p.researcherName !== filterResearcher) return false;
      if (filterAlert === "GPS" && !p.gpsAlert) return false;
      if (filterAlert === "SPEEDING" && p.antifraudAlert !== "SPEEDING_TEMPO_CURTO") return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        if (
          !p.packageProtocol.toLowerCase().includes(query) &&
          !p.deviceHash.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [packages, activeTab, filterSurvey, filterResearcher, filterAlert, search]);

  const tabs = useMemo(() => getFieldTabs(packages), [packages]);
  const kpis = useMemo(() => getFieldKpis(packages), [packages]);
  const filters = useMemo(
    () =>
      getFieldFilters(
        filterSurvey,
        setFilterSurvey,
        filterResearcher,
        setFilterResearcher,
        filterAlert,
        setFilterAlert
      ),
    [filterSurvey, filterResearcher, filterAlert]
  );

  const handleDecision = (pkgId: string, targetStatus: PackageAuditStatus, reason: string): void => {
    setPackages((prev) =>
      prev.map((item) => (item.id === pkgId ? { ...item, status: targetStatus } : item))
    );
    setFeedbackMsg(`Decisão registrada para o pacote ${pkgId}: ${targetStatus} (${reason})`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  return (
    <>
      {feedbackMsg && (
        <div
          data-testid="homologation-feedback"
          style={{
            padding: "10px 16px",
            backgroundColor: "#183724",
            color: "#a8dab5",
            border: "1px solid rgba(129, 201, 149, 0.3)",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 600,
            marginBottom: "16px",
          }}
        >
          {feedbackMsg}
        </div>
      )}

      <EnterpriseCrudWorkspace<FieldPackageItem>
        title="Mesa de Homologação de Campo e Antifraude"
        subtitle="Auditoria de pacotes de dados coletados, telemetria GPS PostGIS e expurgo rastreável TSE"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={kpis}
        searchPlaceholder="Buscar por protocolo (#PK-...) ou hash do tablet..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        onClearFilters={() => {
          setSearch("");
          setFilterSurvey("ALL");
          setFilterResearcher("ALL");
          setFilterAlert("ALL");
        }}
        columns={FIELD_COLUMNS}
        data={filteredPackages}
        keyExtractor={(p) => p.id}
        batchActions={[
          {
            id: "batch-approve",
            label: "✓ Autorizar Selecionados",
            variant: "success",
            onExecute: (selected) => {
              const ids = new Set(selected.map((s) => s.id));
              setPackages((prev) =>
                prev.map((item) => (ids.has(item.id) ? { ...item, status: "VALIDATED" } : item))
              );
              setFeedbackMsg(`${selected.length} pacotes validados em lote.`);
              setTimeout(() => setFeedbackMsg(null), 3000);
            },
          },
          {
            id: "batch-reject",
            label: "✕ Reprovar Selecionados",
            variant: "danger",
            onExecute: (selected) => {
              const ids = new Set(selected.map((s) => s.id));
              setPackages((prev) =>
                prev.map((item) =>
                  ids.has(item.id) ? { ...item, status: "REJECTED" } : item
                )
              );
              setFeedbackMsg(`${selected.length} pacotes reprovados e cotas estornadas.`);
              setTimeout(() => setFeedbackMsg(null), 3000);
            },
          },
        ]}
        renderRowActions={(p) => (
          <>
            <button
              type="button"
              data-testid={`btn-inspect-${p.id}`}
              onClick={() => setInspectingPackage(p)}
              style={{
                padding: "5px 10px",
                border: "1px solid #353535",
                backgroundColor: "#2a2a2a",
                color: "#e5e2e1",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              👁 Detalhes
            </button>
            {p.status === "PENDING" && (
              <>
                <button
                  type="button"
                  onClick={() => handleDecision(p.id, "VALIDATED", "Validação rápida")}
                  style={{
                    padding: "5px 10px",
                    border: "none",
                    backgroundColor: "#81c995",
                    color: "#00391b",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ✓ Validar
                </button>
                <button
                  type="button"
                  onClick={() => setRejectingTarget(p)}
                  style={{
                    padding: "5px 10px",
                    border: "none",
                    backgroundColor: "#f28b82",
                    color: "#690005",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ✕ Reprovar
                </button>
              </>
            )}
          </>
        )}
      />

      <PackageInspectionDrawer
        pkg={inspectingPackage}
        onClose={() => setInspectingPackage(null)}
        onDecision={(id, targetStatus, reason) => {
          handleDecision(id, targetStatus, reason);
          setInspectingPackage(null);
        }}
      />

      <ConfirmDialogModal
        isOpen={Boolean(rejectingTarget)}
        title="Expurgo e Reprovação de Pacote de Coleta"
        message={`Deseja reprovar o pacote #${rejectingTarget?.packageProtocol}?`}
        confirmLabel="✕ Confirmar Expurgo e Estornar Cota"
        variant="danger"
        requireReason={true}
        onConfirm={(reason) => {
          if (rejectingTarget) {
            handleDecision(rejectingTarget.id, "REJECTED", reason ?? "Expurgo manual");
            setRejectingTarget(null);
          }
        }}
        onCancel={() => setRejectingTarget(null)}
      />
    </>
  );
}
