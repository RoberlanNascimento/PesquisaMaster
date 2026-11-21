import React, { useState, useMemo, useEffect, useCallback } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { useUiSessionStore } from "../../lib/store";
import { ConfirmDialogModal } from "../../components/ui/ConfirmDialogModal";
import {
  type SurveyRecord,
  type SurveyFormData,
  type SurveyStatus,
} from "./surveysData";
import { SurveyDrawerForm } from "./SurveyDrawerForm";
import { SurveyDetailPanel } from "./SurveyDetailPanel";
import {
  createPesquisaInDb,
  fetchPesquisasAuxOptions,
  fetchPesquisasFromDb,
  togglePesquisaBloqueioInDb,
  updatePesquisaInDb,
} from "./pesquisasApi";

const { colors } = NOCTURNE_TOKENS;

const STATUS_META: Record<SurveyStatus, { label: string; bg: string; color: string }> = {
  RASCUNHO: { label: "Rascunho", bg: colors.surfaceContainerHigh, color: colors.textMuted },
  REGISTRADA_PESQELE: { label: "Registrada", bg: "rgba(138, 180, 248, 0.14)", color: colors.primary },
  EM_CAMPO: { label: "Em Campo", bg: colors.warningContainer, color: colors.onWarningContainer },
  CONSOLIDADA: { label: "Consolidada", bg: colors.successContainer, color: colors.onSuccessContainer },
};

const FILTER_TABS: readonly { readonly id: string; readonly label: string }[] = [
  { id: "TODAS", label: "Todas" },
  { id: "RASCUNHO", label: "Rascunho" },
  { id: "REGISTRADA_PESQELE", label: "Registradas" },
  { id: "EM_CAMPO", label: "Em Campo" },
  { id: "CONSOLIDADA", label: "Consolidadas" },
];

export function SurveysManagementFeature(): React.JSX.Element {
  const globalSearchQuery = useUiSessionStore((state) => state.globalSearchQuery);

  const [surveys, setSurveys] = useState<readonly SurveyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dbConnected, setDbConnected] = useState<boolean>(false);

  const [activeStatusTab, setActiveStatusTab] = useState<string>("TODAS");
  const [search, setSearch] = useState<string>("");
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [editingSurvey, setEditingSurvey] = useState<SurveyRecord | null>(null);
  const [confirmLockSurvey, setConfirmLockSurvey] = useState<SurveyRecord | null>(null);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);

  const notify = useCallback((message: string, kind: "success" | "error" = "success"): void => {
    setToast({ message, kind });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  }, []);

  const loadSurveys = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const dbData = await fetchPesquisasFromDb();
      setSurveys(dbData);
      setDbConnected(true);
      setSelectedSurveyId((prev) => prev ?? dbData[0]?.id ?? null);
    } catch (err) {
      setDbConnected(false);
      setSurveys([]);
      setSelectedSurveyId(null);
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar as pesquisas do banco de dados.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSurveys();
  }, [loadSurveys]);

  const effectiveSearch = search.trim() || globalSearchQuery.trim();

  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      if (activeStatusTab !== "TODAS" && s.status !== activeStatusTab) return false;
      if (effectiveSearch) {
        const q = effectiveSearch.toLowerCase();
        const matches =
          s.title.toLowerCase().includes(q) ||
          s.protocolTse.toLowerCase().includes(q) ||
          s.cityUf.toLowerCase().includes(q) ||
          s.statisticianName.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [surveys, activeStatusTab, effectiveSearch]);

  const selectedSurvey = useMemo(
    () => surveys.find((s) => s.id === selectedSurveyId) ?? null,
    [surveys, selectedSurveyId],
  );

  const handleSave = async (formData: SurveyFormData): Promise<void> => {
    if (editingSurvey?.dbId && dbConnected) {
      try {
        const updated = await updatePesquisaInDb(editingSurvey.dbId, {
          nome: formData.title,
          data_inicio: formData.fieldStartDate,
          data_fim: formData.fieldEndDate,
          numero_registro_tse: formData.protocolTse,
        });
        setSurveys((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        notify("Pesquisa atualizada.", "success");
        return;
      } catch (err) {
        notify(err instanceof Error ? err.message : "Erro ao atualizar pesquisa.", "error");
        return;
      }
    }

    if (!editingSurvey && dbConnected) {
      try {
        const aux = await fetchPesquisasAuxOptions();
        const idMunicipio = aux.municipios[0]?.id_municipio ?? 1;
        const parsedAmostra = Number(formData.samplePlanId);
        const idAmostra =
          Number.isFinite(parsedAmostra) && parsedAmostra > 0
            ? parsedAmostra
            : (aux.amostras[0]?.id_amostra ?? 1);
        const idProfissional = aux.profissionais[0]?.id_profissional ?? 1;

        const created = await createPesquisaInDb({
          nome: formData.title,
          data_inicio: formData.fieldStartDate,
          data_fim: formData.fieldEndDate,
          numero_registro_tse: formData.protocolTse,
          id_municipio: idMunicipio,
          id_amostra: idAmostra,
          id_profissional: idProfissional,
          status: "processando",
        });
        setSurveys((prev) => [created, ...prev]);
        setSelectedSurveyId(created.id);
        notify("Pesquisa criada no banco.", "success");
        return;
      } catch (err) {
        notify(err instanceof Error ? err.message : "Erro ao criar pesquisa.", "error");
        return;
      }
    }

    if (editingSurvey) {
      setSurveys((prev) =>
        prev.map((s) => (s.id === editingSurvey.id ? { ...s, ...formData } : s)),
      );
      notify("Pesquisa atualizada localmente.", "success");
    } else {
      const newRec: SurveyRecord = {
        id: `surv-${Date.now()}`,
        ...formData,
        sampleCollected: 0,
        status: "RASCUNHO",
        sha256Hash: "Pendente",
      };
      setSurveys((prev) => [newRec, ...prev]);
      setSelectedSurveyId(newRec.id);
      notify("Pesquisa criada localmente.", "success");
    }
  };

  const handleConfirmLock = async (): Promise<void> => {
    if (!confirmLockSurvey) return;
    const target = confirmLockSurvey;
    setConfirmLockSurvey(null);

    if (target.dbId && dbConnected) {
      try {
        const updated = await togglePesquisaBloqueioInDb(
          target.dbId,
          !target.isBloqueada,
          target.isBloqueada ? "Reaberta via painel" : "Bloqueada para campo",
        );
        setSurveys((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        notify(updated.isBloqueada ? "Pesquisa bloqueada." : "Pesquisa liberada.", "success");
        return;
      } catch (err) {
        notify(err instanceof Error ? err.message : "Erro ao alterar bloqueio.", "error");
        return;
      }
    }

    setSurveys((prev) =>
      prev.map((s) =>
        s.id === target.id ? { ...s, isBloqueada: !s.isBloqueada, status: "EM_CAMPO" } : s,
      ),
    );
    notify("Status atualizado.", "success");
  };

  const handleSurveyUpdated = (updated: SurveyRecord): void => {
    setSurveys((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px", width: "100%" }}>
      {/* Toast */}
      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "10px 16px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 600,
            backgroundColor:
              toast.kind === "error" ? colors.errorContainer : colors.successContainer,
            color: toast.kind === "error" ? colors.onErrorContainer : colors.onSuccessContainer,
            border: `1px solid ${toast.kind === "error" ? colors.errorPastel : colors.successPastel}`,
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Minimal Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 600,
              color: colors.textPrimary,
              letterSpacing: "-0.01em",
            }}
          >
            Pesquisas
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: "13px", color: colors.textMuted }}>
            Selecione uma pesquisa para gerenciar amostras vinculadas e pesquisadores atribuídos.
          </p>
        </div>

        <button
          type="button"
          data-testid="btn-new-survey-tse"
          onClick={() => {
            setEditingSurvey(null);
            setDrawerOpen(true);
          }}
          style={{
            padding: "9px 16px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: colors.primaryContainer,
            color: colors.onPrimary,
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Nova Pesquisa
        </button>
      </header>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "12px",
            backgroundColor: "rgba(253, 214, 99, 0.1)",
            border: `1px solid ${colors.warningPastel}`,
            color: colors.warningPastel,
            fontSize: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadSurveys()}
            style={{
              padding: "4px 10px",
              borderRadius: "8px",
              border: `1px solid ${colors.warningPastel}`,
              backgroundColor: "transparent",
              color: colors.warningPastel,
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recarregar
          </button>
        </div>
      )}

      {/* Compact Filter Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {FILTER_TABS.map((tab) => {
            const count =
              tab.id === "TODAS"
                ? surveys.length
                : surveys.filter((s) => s.status === tab.id).length;
            const active = activeStatusTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveStatusTab(tab.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "9999px",
                  border: `1px solid ${active ? colors.primaryContainer : colors.borderSubtle}`,
                  backgroundColor: active ? "rgba(138, 180, 248, 0.14)" : "transparent",
                  color: active ? colors.primary : colors.textMuted,
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pesquisa ou protocolo..."
            style={{
              padding: "7px 12px",
              borderRadius: "10px",
              border: `1px solid ${colors.borderSubtle}`,
              backgroundColor: colors.surfaceContainerLow,
              color: colors.textPrimary,
              fontSize: "13px",
              width: "240px",
              outline: "none",
            }}
          />
          {(search || activeStatusTab !== "TODAS") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setActiveStatusTab("TODAS");
              }}
              style={{
                padding: "7px 10px",
                borderRadius: "10px",
                border: `1px solid ${colors.borderSubtle}`,
                backgroundColor: "transparent",
                color: colors.textMuted,
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Master List (Pai) */}
      <section
        style={{
          backgroundColor: colors.surfaceCard,
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ height: "40px", borderRadius: "10px", backgroundColor: colors.surfaceContainerHigh, opacity: 0.6 }} />
            <div style={{ height: "40px", borderRadius: "10px", backgroundColor: colors.surfaceContainerHigh, opacity: 0.45 }} />
            <div style={{ height: "40px", borderRadius: "10px", backgroundColor: colors.surfaceContainerHigh, opacity: 0.3 }} />
          </div>
        ) : filteredSurveys.length === 0 ? (
          <div style={{ padding: "36px 20px", textAlign: "center", color: colors.textMuted }}>
            <div style={{ fontSize: "14px", fontWeight: 500, color: colors.textPrimary }}>
              Nenhuma pesquisa encontrada
            </div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              Ajuste os filtros ou cadastre uma nova pesquisa.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: colors.surfaceContainerLow,
                    borderBottom: `1px solid ${colors.borderSubtle}`,
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "11px 16px", fontSize: "11px", fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>Protocolo</th>
                  <th style={{ padding: "11px 16px", fontSize: "11px", fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>Pesquisa</th>
                  <th style={{ padding: "11px 16px", fontSize: "11px", fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>Município</th>
                  <th style={{ padding: "11px 16px", fontSize: "11px", fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>Amostra (N)</th>
                  <th style={{ padding: "11px 16px", fontSize: "11px", fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>Status</th>
                  <th style={{ padding: "11px 16px", textAlign: "right", fontSize: "11px", fontWeight: 600, color: colors.textMuted, textTransform: "uppercase" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredSurveys.map((s) => {
                  const isSelected = s.id === selectedSurveyId;
                  const meta = STATUS_META[s.status];
                  return (
                    <tr
                      key={s.id}
                      data-testid={`survey-row-${s.id}`}
                      onClick={() => setSelectedSurveyId(s.id)}
                      style={{
                        borderBottom: `1px solid ${colors.borderSubtle}`,
                        backgroundColor: isSelected ? "rgba(138, 180, 248, 0.08)" : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: colors.textPrimary, whiteSpace: "nowrap" }}>
                        {s.protocolTse}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 500, color: colors.textPrimary }}>{s.title}</div>
                        <div style={{ fontSize: "11px", color: colors.textMuted, marginTop: "2px" }}>
                          {s.fieldStartDate} a {s.fieldEndDate}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: colors.textMuted, whiteSpace: "nowrap" }}>
                        {s.cityUf}
                      </td>
                      <td style={{ padding: "12px 16px", color: colors.textPrimary, whiteSpace: "nowrap" }}>
                        {s.sampleTarget.toLocaleString("pt-BR")}
                      </td>
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: "9999px",
                            fontSize: "11px",
                            fontWeight: 600,
                            backgroundColor: meta.bg,
                            color: meta.color,
                          }}
                        >
                          {s.isBloqueada ? "Bloqueada" : meta.label}
                        </span>
                      </td>
                      <td
                        style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSurvey(s);
                              setDrawerOpen(true);
                            }}
                            style={{
                              padding: "5px 10px",
                              borderRadius: "8px",
                              border: `1px solid ${colors.borderSubtle}`,
                              backgroundColor: "transparent",
                              color: colors.textPrimary,
                              fontSize: "12px",
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmLockSurvey(s)}
                            style={{
                              padding: "5px 10px",
                              borderRadius: "8px",
                              border: `1px solid ${colors.borderSubtle}`,
                              backgroundColor: "transparent",
                              color: s.isBloqueada ? colors.successPastel : colors.warningPastel,
                              fontSize: "12px",
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                          >
                            {s.isBloqueada ? "Liberar" : "Bloquear"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Child Detail Panel (Filho) */}
      {selectedSurvey && (
        <SurveyDetailPanel
          survey={selectedSurvey}
          onClose={() => setSelectedSurveyId(null)}
          onSurveyUpdated={handleSurveyUpdated}
          onNotify={notify}
        />
      )}

      {/* Create / Edit Drawer */}
      <SurveyDrawerForm
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialData={editingSurvey}
        onSave={(data) => {
          void handleSave(data);
        }}
      />

      {/* Confirm Lock Modal */}
      <ConfirmDialogModal
        isOpen={Boolean(confirmLockSurvey)}
        onCancel={() => setConfirmLockSurvey(null)}
        onConfirm={() => {
          void handleConfirmLock();
        }}
        title={confirmLockSurvey?.isBloqueada ? "Liberar Pesquisa" : "Bloquear Pesquisa"}
        message={
          confirmLockSurvey
            ? `Confirma ${confirmLockSurvey.isBloqueada ? "liberar" : "bloquear"} a pesquisa "${confirmLockSurvey.title}"?`
            : ""
        }
        confirmLabel={confirmLockSurvey?.isBloqueada ? "Liberar" : "Bloquear"}
        variant="warning"
      />
    </div>
  );
}
