import React, { useState, useEffect, useMemo, useCallback } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { ConfirmDialogModal } from "../../components/ui/ConfirmDialogModal";
import { NOCTURNE_BUTTON_STYLES, NOCTURNE_TOKENS } from "../../lib/designTokens";
import {
  ReassignResearcherDialogModal,
  type MovimentacaoPayload,
} from "./ReassignResearcherDialogModal";

const { colors } = NOCTURNE_TOKENS;

export interface ReassignmentRecord {
  readonly id: number;
  readonly sessionId: number;
  readonly surveyTitle: string;
  readonly previousResearcher: string;
  readonly newResearcher: string;
  readonly authorizerId: number | null;
  readonly authorizer: string;
  readonly date: string;
  readonly reason: string;
}

const API_BASE = "http://127.0.0.1:8000/api/v1/pesquisas-tabelas";

export function AuditReassignmentFeature(): React.JSX.Element {
  const [records, setRecords] = useState<readonly ReassignmentRecord[]>([]);
  const [municipiosAtivos, setMunicipiosAtivos] = useState<any[]>([]);
  const [pesquisasAtivas, setPesquisasAtivas] = useState<any[]>([]);
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");
  const [modalOpen, setModalOpen] = useState(false);

  // Edição e exclusão
  const [editingRecord, setEditingRecord] = useState<ReassignmentRecord | null>(null);
  const [editAuthorizerId, setEditAuthorizerId] = useState("");
  const [editReason, setEditReason] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReassignmentRecord | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  const notifySuccess = (msg: string): void => {
    setBannerSuccess(msg);
    window.setTimeout(() => setBannerSuccess((prev) => (prev === msg ? null : prev)), 3500);
  };

  const loadAll = useCallback(async (): Promise<void> => {
    const [histData, opData] = await Promise.all([
      fetch(`${API_BASE}/historico-reatribuicoes`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
      fetch(`${API_BASE}/movimentacao-opcoes`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ]);

    if (Array.isArray(histData)) {
      setRecords(
        histData.map((r: any) => ({
          id: Number(r.id_historico_reatribuicao),
          sessionId: Number(r.id_questionario_pessoa),
          surveyTitle: r.pesquisa_titulo || "",
          previousResearcher: r.pesquisador_anterior_nome || `Pesquisador #${r.id_pesquisador_anterior}`,
          newResearcher: r.pesquisador_novo_nome || `Pesquisador #${r.id_pesquisador_novo}`,
          authorizerId: r.id_usuario_autorizador ? Number(r.id_usuario_autorizador) : null,
          authorizer: r.autorizador_nome || `Usuário #${r.id_usuario_autorizador}`,
          date: r.data_reatribuicao ? new Date(r.data_reatribuicao).toLocaleString("pt-BR") : "—",
          reason: r.motivo || r.justificativa || "—",
        }))
      );
    } else {
      setRecords([]);
    }

    if (opData) {
      setMunicipiosAtivos(Array.isArray(opData.municipios_ativos) ? opData.municipios_ativos : []);
      setPesquisasAtivas(Array.isArray(opData.pesquisas_ativas) ? opData.pesquisas_ativas : []);
      setSessoes(Array.isArray(opData.sessoes) ? opData.sessoes : []);
      setProfissionais(Array.isArray(opData.profissionais) ? opData.profissionais : []);
      setUsuarios(Array.isArray(opData.usuarios) ? opData.usuarios : []);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleSubmitMovimentacao = async (payload: MovimentacaoPayload): Promise<void> => {
    const res = await fetch(`${API_BASE}/historico-reatribuicoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || "Não foi possível registrar a movimentação de pesquisador.");
    }
    await loadAll();
    notifySuccess("Movimentação registrada e saldo transferido com sucesso.");
  };

  const openEditDrawer = (rec: ReassignmentRecord): void => {
    setEditingRecord(rec);
    setEditAuthorizerId(rec.authorizerId ? String(rec.authorizerId) : "");
    setEditReason(rec.reason === "—" ? "" : rec.reason);
    setEditError(null);
  };

  const handleSaveEdit = async (): Promise<void> => {
    if (!editingRecord) return;
    const trimmed = editReason.trim();
    if (trimmed.length < 3) {
      setEditError("Informe uma justificativa com pelo menos 3 caracteres.");
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await fetch(`${API_BASE}/historico-reatribuicoes/${editingRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario_autorizador: editAuthorizerId ? Number(editAuthorizerId) : null,
          motivo: trimmed,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Erro ao atualizar reatribuição (HTTP ${res.status}).`);
      }
      setEditingRecord(null);
      await loadAll();
      notifySuccess("Reatribuição atualizada com sucesso.");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erro ao salvar alterações.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setBannerError(null);
    try {
      const res = await fetch(`${API_BASE}/historico-reatribuicoes/${target.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Erro ao excluir registro (HTTP ${res.status}).`);
      }
      if (editingRecord?.id === target.id) setEditingRecord(null);
      await loadAll();
      notifySuccess(`Registro #${target.id} excluído com sucesso.`);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : "Erro ao excluir registro.");
    }
  };

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          String(r.sessionId).includes(q) ||
          r.surveyTitle.toLowerCase().includes(q) ||
          r.previousResearcher.toLowerCase().includes(q) ||
          r.newResearcher.toLowerCase().includes(q) ||
          r.authorizer.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {bannerSuccess && (
        <div role="status" style={{ padding: "10px 14px", borderRadius: "12px", backgroundColor: colors.successContainer, color: colors.onSuccessContainer, border: `1px solid ${colors.successPastel}`, fontSize: "13px" }}>
          {bannerSuccess}
        </div>
      )}
      {bannerError && (
        <div role="alert" style={{ padding: "10px 14px", borderRadius: "12px", backgroundColor: colors.errorContainer, color: colors.onErrorContainer, border: `1px solid ${colors.errorPastel}`, fontSize: "13px" }}>
          {bannerError}
        </div>
      )}
      <EnterpriseCrudWorkspace<ReassignmentRecord>
        title="Reatribuição de Entrevistas & Custódia"
        subtitle="Trilha de auditoria forense para transferência e movimentação de pesquisadores em campo (PostgreSQL)"
        globalActions={
          <button
            type="button"
            data-testid="btn-new-reassignment"
            onClick={() => setModalOpen(true)}
            style={NOCTURNE_BUTTON_STYLES.primary}
          >
            + Movimentar Pesquisador
          </button>
        }
        tabs={[
          { id: "TODOS", label: "Todas as Reatribuições", count: records.length },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={[]}
        searchPlaceholder="Buscar por sessão, pesquisa, pesquisador, autorizador ou motivo..."
        searchValue={search}
        onSearchChange={setSearch}
        columns={[
          {
            header: "ID Sessão",
            key: "sessionId",
            render: (r) => (
              <div>
                <span style={{ fontWeight: 700, color: "#38bdf8" }}>#{r.sessionId}</span>
                {r.surveyTitle && (
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>{r.surveyTitle}</div>
                )}
              </div>
            ),
          },
          {
            header: "Pesquisador Anterior",
            key: "previousResearcher",
            render: (r) => <span style={{ color: "#f87171" }}>{r.previousResearcher}</span>,
          },
          {
            header: "Novo Pesquisador",
            key: "newResearcher",
            render: (r) => <span style={{ color: "#4ade80", fontWeight: 600 }}>{r.newResearcher}</span>,
          },
          {
            header: "Autorizado por",
            key: "authorizer",
            render: (r) => <span style={{ color: "#cbd5e1" }}>{r.authorizer}</span>,
          },
          {
            header: "Data/Hora",
            key: "date",
            render: (r) => <span style={{ fontSize: "12px", color: "#94a3b8" }}>{r.date}</span>,
          },
          {
            header: "Justificativa",
            key: "reason",
            render: (r) => (
              <button
                type="button"
                onClick={() => openEditDrawer(r)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  textAlign: "left",
                  fontSize: "12px",
                  color: "#e2e8f0",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textDecorationColor: "rgba(148,163,184,0.35)",
                  textUnderlineOffset: "3px",
                }}
                title="Clique para editar esta reatribuição"
              >
                {r.reason}
              </button>
            ),
          },
        ]}
        data={filtered}
        keyExtractor={(r) => String(r.id)}
        renderRowActions={(r) => (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditDrawer(r);
              }}
              style={{
                padding: "5px 10px",
                borderRadius: "8px",
                border: `1px solid ${colors.borderSubtle}`,
                backgroundColor: colors.surfaceCard,
                color: colors.textPrimary,
                fontSize: "11.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(r);
              }}
              style={{
                padding: "5px 10px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: colors.errorContainer,
                color: colors.onErrorContainer,
                fontSize: "11.5px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Excluir
            </button>
          </div>
        )}
      />

      <ReassignResearcherDialogModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmitMovimentacao}
        municipiosAtivos={municipiosAtivos}
        pesquisasAtivas={pesquisasAtivas}
        sessoes={sessoes}
        profissionais={profissionais}
        usuarios={usuarios}
      />

      <SlideOverDrawer
        isOpen={editingRecord !== null}
        onClose={() => !savingEdit && setEditingRecord(null)}
        title={editingRecord ? `Editar Reatribuição #${editingRecord.id}` : "Editar Reatribuição"}
        width="480px"
        footerActions={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", width: "100%" }}>
            <div>
              {editingRecord && (
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setDeleteTarget(editingRecord)}
                  style={{
                    padding: "9px 14px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: colors.errorContainer,
                    color: colors.onErrorContainer,
                    fontWeight: 600,
                    fontSize: "12.5px",
                    cursor: savingEdit ? "not-allowed" : "pointer",
                  }}
                >
                  Excluir
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                style={{
                  padding: "9px 14px",
                  borderRadius: "10px",
                  border: `1px solid ${colors.borderSubtle}`,
                  backgroundColor: colors.surfaceCard,
                  color: colors.textPrimary,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingEdit || editReason.trim().length < 3}
                onClick={() => void handleSaveEdit()}
                style={{
                  padding: "9px 18px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: colors.primaryContainer,
                  color: colors.onPrimary,
                  fontWeight: 700,
                  cursor: savingEdit || editReason.trim().length < 3 ? "not-allowed" : "pointer",
                  opacity: savingEdit || editReason.trim().length < 3 ? 0.5 : 1,
                }}
              >
                {savingEdit ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {editError && (
            <div role="alert" style={{ padding: "10px 12px", borderRadius: "10px", backgroundColor: colors.errorContainer, color: colors.onErrorContainer, border: `1px solid ${colors.errorPastel}`, fontSize: "12.5px" }}>
              {editError}
            </div>
          )}
          {editingRecord && (
            <div style={{ padding: "10px 12px", borderRadius: "10px", backgroundColor: colors.surfaceCard, border: `1px solid ${colors.borderSubtle}`, fontSize: "12.5px", color: colors.textMuted }}>
              Sessão <strong style={{ color: colors.textPrimary }}>#{editingRecord.sessionId}</strong> • {editingRecord.previousResearcher} → <strong style={{ color: "#4ade80" }}>{editingRecord.newResearcher}</strong>
            </div>
          )}
          <div>
            <label style={{ display: "block", fontSize: "12px", color: colors.textMuted, marginBottom: "5px" }}>Autorizador</label>
            <select
              value={editAuthorizerId}
              onChange={(e) => setEditAuthorizerId(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "10px", border: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceCard, color: colors.textPrimary, fontSize: "13px" }}
            >
              <option value="">Manter autorizador atual</option>
              {usuarios.map((u: any) => (
                <option key={u.id_usuario} value={String(u.id_usuario)}>
                  #{u.id_usuario} — {u.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "12px", color: colors.textMuted, marginBottom: "5px" }}>Justificativa *</label>
            <textarea
              value={editReason}
              onChange={(e) => {
                setEditReason(e.target.value);
                setEditError(null);
              }}
              style={{ width: "100%", minHeight: "90px", padding: "9px 12px", borderRadius: "10px", border: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceCard, color: colors.textPrimary, fontSize: "13px", boxSizing: "border-box" }}
            />
          </div>
        </div>
      </SlideOverDrawer>

      <ConfirmDialogModal
        isOpen={deleteTarget !== null}
        title="Excluir Reatribuição"
        message={
          deleteTarget
            ? `Tem certeza que deseja excluir o registro de reatribuição #${deleteTarget.id} (Sessão #${deleteTarget.sessionId})?`
            : ""
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
