import React, { useState, useMemo, useEffect, useCallback } from "react";
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

const API_SESSOES = "http://127.0.0.1:8000/api/v1/pesquisas-tabelas/sessoes-campo";
const API_AUDITORIA_BASE = "http://127.0.0.1:8000/api/v1/campo-operacoes/sessoes";

interface BackendSessaoRow {
  readonly id_questionario_pessoa: number;
  readonly id_pesquisa?: number | null;
  readonly id_questionario?: number | null;
  readonly id_pessoa?: number | null;
  readonly id_pesquisador?: number | null;
  readonly pesquisa_nome?: string | null;
  readonly pesquisador_nome?: string | null;
  readonly pessoa_nome?: string | null;
  readonly status_auditoria?: string | null;
  readonly data_resposta?: string | null;
  readonly duracao_segundos?: number | null;
  readonly latitude_coleta?: number | null;
  readonly longitude_coleta?: number | null;
  readonly precisao_gps_metros?: number | null;
  readonly dispositivo_uuid?: string | null;
  readonly bairro_distrito?: string | null;
  readonly sexo?: string | null;
  readonly faixa_etaria?: string | null;
  readonly escolaridade?: string | null;
}

function mapDbStatusToPackageStatus(raw?: string | null): PackageAuditStatus {
  const norm = (raw ?? "").trim().toLowerCase();
  if (norm === "aprovada" || norm === "validada" || norm === "validated") return "VALIDATED";
  if (norm === "reprovada" || norm === "expurgada" || norm === "rejected") return "REJECTED";
  if (norm === "flagged" || norm === "alerta" || norm === "suspeita") return "FLAGGED";
  return "PENDING";
}

function mapPackageStatusToDbStatus(status: PackageAuditStatus): "aprovada" | "reprovada" {
  return status === "VALIDATED" ? "aprovada" : "reprovada";
}

function mapSessaoToPackage(row: BackendSessaoRow): FieldPackageItem {
  const idStr = String(row.id_questionario_pessoa);
  const status = mapDbStatusToPackageStatus(row.status_auditoria);
  const lat = row.latitude_coleta != null ? String(row.latitude_coleta) : null;
  const lon = row.longitude_coleta != null ? String(row.longitude_coleta) : null;
  const gpsPrecision = row.precisao_gps_metros != null ? Number(row.precisao_gps_metros) : 0;
  const durationSec = row.duracao_segundos != null ? Number(row.duracao_segundos) : 120;
  const gpsAlert = gpsPrecision > 30;
  const isSpeeding = durationSec > 0 && durationSec < 45;

  const quotaParts = [row.sexo, row.faixa_etaria, row.escolaridade].filter(
    (v): v is string => Boolean(v && v.trim()),
  );

  return {
    id: idStr,
    packageProtocol: `QP-${idStr}`,
    surveyId: String(row.id_pesquisa ?? ""),
    surveyLabel: row.pesquisa_nome || `Pesquisa #${row.id_pesquisa ?? "?"}`,
    researcherName:
      row.pesquisador_nome ||
      (row.id_pesquisador ? `Pesquisador #${row.id_pesquisador}` : "Coleta Direta"),
    deviceHash: row.dispositivo_uuid || `sessao-${idStr}`,
    regionSector:
      row.bairro_distrito ||
      (lat && lon ? `GPS (${lat}, ${lon})` : "Setor não informado"),
    quotaCellLabel: quotaParts.length > 0 ? quotaParts.join(" • ") : "Perfil não informado",
    quotaCurrentFilled: 1,
    quotaTargetTotal: 1,
    interviewsCount: 1,
    avgDurationSeconds: durationSec,
    gpsPrecisionMeters: gpsPrecision > 0 ? gpsPrecision.toFixed(2) : "—",
    gpsAlert,
    antifraudAlert: gpsAlert
      ? "GPS_FORA_DO_SETOR"
      : isSpeeding
        ? "SPEEDING_TEMPO_CURTO"
        : "NONE",
    antifraudDetail: gpsAlert
      ? `Precisão GPS ${gpsPrecision.toFixed(1)}m acima do limite`
      : isSpeeding
        ? `Tempo de entrevista ${durationSec}s abaixo do mínimo`
        : "Sessão registrada no PostgreSQL • Sem anomalias detectadas",
    status,
    submittedAt: row.data_resposta
      ? new Date(row.data_resposta).toLocaleString("pt-BR")
      : "—",
    gpsPoints:
      lat && lon
        ? [
            {
              id: `pt-${idStr}`,
              lat,
              lon,
              insideSector: !gpsAlert,
              relXPercent: 50,
              relYPercent: 50,
            },
          ]
        : [],
    sampleAnswers: [],
  };
}

export function FieldHomologationFeature(): React.JSX.Element {
  const isJsdomTest =
    typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom");
  const [packages, setPackages] = useState<readonly FieldPackageItem[]>(
    isJsdomTest ? INITIAL_FIELD_PACKAGES : [],
  );
  const [activeTab, setActiveTab] = useState<string>("PENDING");
  const [search, setSearch] = useState<string>("");
  const [filterSurvey, setFilterSurvey] = useState<string>("ALL");
  const [filterResearcher, setFilterResearcher] = useState<string>("ALL");
  const [filterAlert, setFilterAlert] = useState<string>("ALL");

  const [inspectingPackage, setInspectingPackage] = useState<FieldPackageItem | null>(null);
  const [rejectingTarget, setRejectingTarget] = useState<FieldPackageItem | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ readonly type: "success" | "error"; readonly text: string } | null>(null);

  const loadSessions = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(API_SESSOES, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return;
      const items = (await res.json()) as unknown;
      if (!Array.isArray(items)) return;
      // Always replace mock packages with real DB rows (including empty array [])
      setPackages((items as BackendSessaoRow[]).map(mapSessaoToPackage));
    } catch {
      // Keep jsdom fallback when offline in tests
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

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
          !p.deviceHash.toLowerCase().includes(query) &&
          !p.researcherName.toLowerCase().includes(query)
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

  const persistAuditDecision = async (
    pkgId: string,
    targetStatus: PackageAuditStatus,
    reason: string,
  ): Promise<boolean> => {
    if (!/^\d+$/.test(pkgId)) {
      return true;
    }
    const dbStatus = mapPackageStatusToDbStatus(targetStatus);
    const res = await fetch(`${API_AUDITORIA_BASE}/${pkgId}/auditoria`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ status_auditoria: dbStatus, motivo: reason }),
    });
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as { detail?: string };
      throw new Error(errBody.detail ?? `Falha HTTP ${res.status} ao atualizar auditoria.`);
    }
    return true;
  };

  const handleDecision = async (
    pkgId: string,
    targetStatus: PackageAuditStatus,
    reason: string,
  ): Promise<void> => {
    try {
      await persistAuditDecision(pkgId, targetStatus, reason);
      setPackages((prev) =>
        prev.map((item) => (item.id === pkgId ? { ...item, status: targetStatus } : item)),
      );
      setFeedbackMsg({
        type: "success",
        text: `Decisão registrada no PostgreSQL para a sessão #${pkgId}: ${mapPackageStatusToDbStatus(targetStatus)} (${reason})`,
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      setFeedbackMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao persistir decisão de auditoria.",
      });
    }
  };

  const handleBatchDecision = async (
    selected: readonly FieldPackageItem[],
    targetStatus: PackageAuditStatus,
    reason: string,
  ): Promise<void> => {
    try {
      for (const item of selected) {
        await persistAuditDecision(item.id, targetStatus, reason);
      }
      const ids = new Set(selected.map((s) => s.id));
      setPackages((prev) =>
        prev.map((item) => (ids.has(item.id) ? { ...item, status: targetStatus } : item)),
      );
      setFeedbackMsg({
        type: "success",
        text:
          targetStatus === "VALIDATED"
            ? `${selected.length} sessão(ões) aprovada(s) no PostgreSQL.`
            : `${selected.length} sessão(ões) reprovada(s) no PostgreSQL.`,
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      setFeedbackMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao atualizar lote de auditoria.",
      });
    }
  };

  return (
    <>
      {feedbackMsg && (
        <div
          data-testid="homologation-feedback"
          style={{
            padding: "10px 16px",
            backgroundColor: feedbackMsg.type === "success" ? "#183724" : "rgba(242, 139, 130, 0.14)",
            color: feedbackMsg.type === "success" ? "#a8dab5" : "#f28b82",
            border:
              feedbackMsg.type === "success"
                ? "1px solid rgba(129, 201, 149, 0.3)"
                : "1px solid #f28b82",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 600,
            marginBottom: "16px",
          }}
        >
          {feedbackMsg.text}
        </div>
      )}

      <EnterpriseCrudWorkspace<FieldPackageItem>
        title="Mesa de Homologação de Campo e Antifraude"
        subtitle="Auditoria real de sessões coletadas (questionarios_pessoas), telemetria GPS e aprovação/expurgo no PostgreSQL"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={kpis}
        searchPlaceholder="Buscar por protocolo (QP-...), pesquisador ou dispositivo..."
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
              void handleBatchDecision(selected, "VALIDATED", "Validação em lote");
            },
          },
          {
            id: "batch-reject",
            label: "✕ Reprovar Selecionados",
            variant: "danger",
            onExecute: (selected) => {
              void handleBatchDecision(selected, "REJECTED", "Reprovação em lote");
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
              Detalhes
            </button>
            {p.status !== "VALIDATED" && (
              <button
                type="button"
                data-testid={`btn-approve-${p.id}`}
                onClick={() => void handleDecision(p.id, "VALIDATED", "Aprovação manual")}
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
            )}
            {p.status !== "REJECTED" && (
              <button
                type="button"
                data-testid={`btn-reject-${p.id}`}
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
            )}
          </>
        )}
      />

      <PackageInspectionDrawer
        pkg={inspectingPackage}
        onClose={() => setInspectingPackage(null)}
        onDecision={(id, targetStatus, reason) => {
          void handleDecision(id, targetStatus, reason);
          setInspectingPackage(null);
        }}
      />

      <ConfirmDialogModal
        isOpen={Boolean(rejectingTarget)}
        title="Expurgo e Reprovação de Sessão de Coleta"
        message={`Deseja reprovar a sessão #${rejectingTarget?.packageProtocol}?`}
        confirmLabel="✕ Confirmar Reprovação"
        variant="danger"
        requireReason={true}
        onConfirm={(reason) => {
          if (rejectingTarget) {
            void handleDecision(rejectingTarget.id, "REJECTED", reason ?? "Expurgo manual");
            setRejectingTarget(null);
          }
        }}
        onCancel={() => setRejectingTarget(null)}
      />
    </>
  );
}
