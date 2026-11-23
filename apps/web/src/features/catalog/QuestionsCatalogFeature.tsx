import React, { useCallback, useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { SearchableCombobox } from "../../components/ui/SearchableCombobox";
import { ConfirmDialogModal } from "../../components/ui/ConfirmDialogModal";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors } = NOCTURNE_TOKENS;
const API_PERGUNTAS = "http://127.0.0.1:8000/api/v1/questionarios-db/perguntas";
const API_RESUMO = "http://127.0.0.1:8000/api/v1/questionarios-db/resumo";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  borderRadius: "10px",
  border: `1px solid ${colors.borderSubtle}`,
  backgroundColor: colors.surfaceCard,
  color: colors.textPrimary,
  fontSize: "13px",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: colors.textMuted,
  marginBottom: "5px",
};

export interface QuestionRecord {
  readonly id: number;
  readonly text: string;
  readonly type: string;
  readonly groupId: number | null;
  readonly scaleGroup: string;
  readonly scaleType: string;
  readonly linkedQuestionnairesCount: number;
}

interface ScaleGroupOption {
  readonly id: number;
  readonly name: string;
  readonly scaleType: string;
}

export function QuestionsCatalogFeature(): React.JSX.Element {
  const [questions, setQuestions] = useState<readonly QuestionRecord[]>([]);
  const [scaleGroups, setScaleGroups] = useState<readonly ScaleGroupOption[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  // Drawer create/edit state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [enunciado, setEnunciado] = useState("");
  const [tipoPergunta, setTipoPergunta] = useState("estimulada");
  const [grupoId, setGrupoId] = useState("");

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<QuestionRecord | null>(null);

  const notifySuccess = (msg: string): void => {
    setBannerSuccess(msg);
    window.setTimeout(() => setBannerSuccess((prev) => (prev === msg ? null : prev)), 3500);
  };

  const loadQuestions = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(API_PERGUNTAS, { cache: "no-store" });
      if (!res.ok) return;
      const items = (await res.json()) as any[];
      if (Array.isArray(items)) {
        setQuestions(
          items.map((q) => ({
            id: Number(q.id_pergunta),
            text: String(q.enunciado ?? q.texto_pergunta ?? ""),
            type: String(q.tipo_pergunta ?? "estimulada"),
            groupId: q.id_grupo_opcao !== null && q.id_grupo_opcao !== undefined ? Number(q.id_grupo_opcao) : null,
            scaleGroup: String(q.nome_grupo || "Sem grupo"),
            scaleType: String(q.tipo_escala || ""),
            linkedQuestionnairesCount: Number(q.questionarios_vinculados ?? 0),
          }))
        );
      }
    } catch {
      // silent fallback when offline
    }
  }, []);

  const loadScaleGroups = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(API_RESUMO, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { grupos_opcoes?: any[] };
      if (Array.isArray(json.grupos_opcoes)) {
        setScaleGroups(
          json.grupos_opcoes.map((g) => ({
            id: Number(g.id_grupo_opcao),
            name: String(g.nome_grupo ?? `Grupo #${g.id_grupo_opcao}`),
            scaleType: String(g.tipo_escala ?? "nominal"),
          }))
        );
      }
    } catch {
      // silent fallback when offline
    }
  }, []);

  useEffect(() => {
    void loadQuestions();
    void loadScaleGroups();
  }, [loadQuestions, loadScaleGroups]);

  const openCreateModal = (): void => {
    setEditingQuestion(null);
    setModalError(null);
    setBannerError(null);
    setEnunciado("");
    setTipoPergunta("estimulada");
    setGrupoId("");
    setDrawerOpen(true);
  };

  const openEditModal = (q: QuestionRecord): void => {
    setEditingQuestion(q);
    setModalError(null);
    setBannerError(null);
    setEnunciado(q.text);
    setTipoPergunta(q.type || "estimulada");
    setGrupoId(q.groupId !== null ? String(q.groupId) : "");
    setDrawerOpen(true);
  };

  const requestDelete = (q: QuestionRecord): void => {
    setBannerError(null);
    setModalError(null);
    if (q.linkedQuestionnairesCount > 0) {
      const msg = `Não é possível excluir: esta pergunta já está vinculada a ${q.linkedQuestionnairesCount} questionário(s).`;
      setBannerError(msg);
      if (drawerOpen) setModalError(msg);
      return;
    }
    setDeleteTarget(q);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setBannerError(null);
    setModalError(null);
    try {
      const res = await fetch(`${API_PERGUNTAS}/${target.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = typeof err?.detail === "string" ? err.detail : `Erro ao excluir pergunta (HTTP ${res.status}).`;
        setBannerError(detail);
        if (drawerOpen) setModalError(detail);
        return;
      }
      if (editingQuestion?.id === target.id) {
        setDrawerOpen(false);
        setEditingQuestion(null);
      }
      await loadQuestions();
      notifySuccess(`Pergunta #${target.id} excluída com sucesso.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir pergunta.";
      setBannerError(msg);
    }
  };

  const handleSave = async (): Promise<void> => {
    const trimmed = enunciado.trim();
    if (!trimmed) {
      setModalError("Informe o enunciado da pergunta.");
      return;
    }
    setSaving(true);
    setModalError(null);
    setBannerError(null);
    try {
      const payload = {
        enunciado: trimmed,
        tipo_pergunta: tipoPergunta.trim() || "estimulada",
        id_grupo_opcao: grupoId ? Number(grupoId) : null,
      };
      const isEdit = editingQuestion !== null;
      const url = isEdit ? `${API_PERGUNTAS}/${editingQuestion.id}` : API_PERGUNTAS;
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail =
          typeof err?.detail === "string"
            ? err.detail
            : Array.isArray(err?.detail)
              ? err.detail.map((d: { msg?: string }) => d?.msg).filter(Boolean).join("; ")
              : null;
        throw new Error(detail || `Erro ao salvar pergunta (HTTP ${res.status}).`);
      }
      setDrawerOpen(false);
      setEditingQuestion(null);
      await loadQuestions();
      notifySuccess(isEdit ? "Pergunta atualizada com sucesso." : "Pergunta cadastrada com sucesso.");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Erro ao salvar pergunta.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (activeTab === "VINCULADAS" && q.linkedQuestionnairesCount === 0) return false;
      if (activeTab === "DISPONIVEIS" && q.linkedQuestionnairesCount > 0) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          q.text.toLowerCase().includes(query) ||
          q.scaleGroup.toLowerCase().includes(query) ||
          q.type.toLowerCase().includes(query) ||
          String(q.id).includes(query)
        );
      }
      return true;
    });
  }, [questions, activeTab, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {bannerSuccess && (
        <div
          role="status"
          style={{
            padding: "10px 14px",
            borderRadius: "12px",
            backgroundColor: colors.successContainer,
            color: colors.onSuccessContainer,
            border: `1px solid ${colors.successPastel}`,
            fontSize: "13px",
          }}
        >
          {bannerSuccess}
        </div>
      )}
      {bannerError && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            borderRadius: "12px",
            backgroundColor: colors.errorContainer,
            color: colors.onErrorContainer,
            border: `1px solid ${colors.errorPastel}`,
            fontSize: "13px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span>{bannerError}</span>
          <button
            type="button"
            onClick={() => setBannerError(null)}
            style={{
              background: "transparent",
              border: "none",
              color: colors.onErrorContainer,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "14px",
            }}
            aria-label="Fechar aviso"
          >
            ✕
          </button>
        </div>
      )}

      <EnterpriseCrudWorkspace<QuestionRecord>
        title="Banco de Perguntas & Catálogo de Itens"
        subtitle="Repositório central de enunciados, baterias de avaliação e escalas para questionários eleitorais"
        globalActions={
          <button
            type="button"
            onClick={openCreateModal}
            style={{
              padding: "9px 16px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: colors.primaryContainer,
              color: colors.onPrimary,
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Nova Pergunta
          </button>
        }
        tabs={[
          { id: "TODOS", label: "Todas as Perguntas", count: questions.length },
          { id: "VINCULADAS", label: "Em Uso (Questionários)", count: questions.filter((q) => q.linkedQuestionnairesCount > 0).length },
          { id: "DISPONIVEIS", label: "Sem Vínculo", count: questions.filter((q) => q.linkedQuestionnairesCount === 0).length },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={[
          { id: "kpi-q-total", label: "Perguntas Cadastradas", value: questions.length, helperText: "Tabela perguntas", variant: "default" },
          { id: "kpi-q-linked", label: "Vinculadas a Questionários", value: questions.filter((q) => q.linkedQuestionnairesCount > 0).length, helperText: "Protegidas contra exclusão", variant: "success" },
          { id: "kpi-q-groups", label: "Grupos de Opções", value: scaleGroups.length, helperText: "Escalas & alternativas", variant: "default" },
        ]}
        searchPlaceholder="Buscar por ID, enunciado, tipo ou grupo de opções..."
        searchValue={search}
        onSearchChange={setSearch}
        columns={[
          { header: "ID", key: "id", render: (q) => <span style={{ fontWeight: 700, color: "#38bdf8" }}>#{q.id}</span> },
          {
            header: "Enunciado da Pergunta",
            key: "text",
            render: (q) => (
              <button
                type="button"
                onClick={() => openEditModal(q)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  textAlign: "left",
                  fontWeight: 600,
                  color: "#f8fafc",
                  cursor: "pointer",
                  fontSize: "13px",
                  textDecoration: "underline",
                  textDecorationColor: "rgba(148,163,184,0.35)",
                  textUnderlineOffset: "3px",
                }}
                title="Clique para editar esta pergunta"
              >
                {q.text}
              </button>
            ),
          },
          { header: "Tipo / Formato", key: "type", render: (q) => <span style={{ color: "#a78bfa", fontWeight: 600 }}>{q.type}</span> },
          { header: "Régua / Grupo de Opções", key: "scaleGroup", render: (q) => <span style={{ color: "#94a3b8" }}>{q.scaleGroup}</span> },
          {
            header: "Questionários",
            key: "linkedQuestionnairesCount",
            render: (q) => (
              <span
                style={{
                  fontSize: "11.5px",
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  backgroundColor: q.linkedQuestionnairesCount > 0 ? colors.surfaceContainerHigh : colors.surfaceCard,
                  color: q.linkedQuestionnairesCount > 0 ? colors.primaryContainer : colors.textMuted,
                  fontWeight: 600,
                }}
              >
                {q.linkedQuestionnairesCount > 0 ? `${q.linkedQuestionnairesCount} vínculo(s)` : "Livre"}
              </span>
            ),
          },
        ]}
        data={filtered}
        keyExtractor={(q) => String(q.id)}
        renderRowActions={(q) => (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(q);
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
                requestDelete(q);
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
                opacity: q.linkedQuestionnairesCount > 0 ? 0.65 : 1,
              }}
              title={
                q.linkedQuestionnairesCount > 0
                  ? `Vinculada a ${q.linkedQuestionnairesCount} questionário(s)`
                  : "Excluir pergunta"
              }
            >
              Excluir
            </button>
          </div>
        )}
      />

      <SlideOverDrawer
        isOpen={drawerOpen}
        onClose={() => {
          if (!saving) {
            setDrawerOpen(false);
            setEditingQuestion(null);
            setModalError(null);
          }
        }}
        title={editingQuestion ? `Editar Pergunta #${editingQuestion.id}` : "Nova Pergunta (Repositório)"}
        width="520px"
        footerActions={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", width: "100%" }}>
            <div>
              {editingQuestion && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => requestDelete(editingQuestion)}
                  style={{
                    padding: "9px 14px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: colors.errorContainer,
                    color: colors.onErrorContainer,
                    fontWeight: 600,
                    fontSize: "12.5px",
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  Excluir
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setEditingQuestion(null);
                  setModalError(null);
                }}
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
                disabled={saving || !enunciado.trim()}
                onClick={() => void handleSave()}
                style={{
                  padding: "9px 18px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: colors.primaryContainer,
                  color: colors.onPrimary,
                  fontWeight: 700,
                  cursor: saving || !enunciado.trim() ? "not-allowed" : "pointer",
                  opacity: saving || !enunciado.trim() ? 0.5 : 1,
                }}
              >
                {saving ? "Salvando..." : editingQuestion ? "Salvar Alterações" : "Salvar"}
              </button>
            </div>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {modalError && (
            <div
              role="alert"
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                backgroundColor: colors.errorContainer,
                color: colors.onErrorContainer,
                border: `1px solid ${colors.errorPastel}`,
                fontSize: "12.5px",
              }}
            >
              {modalError}
            </div>
          )}

          <div>
            <label style={LABEL_STYLE}>Enunciado da Pergunta *</label>
            <textarea
              style={{ ...INPUT_STYLE, minHeight: "96px", resize: "vertical" }}
              value={enunciado}
              onChange={(e) => {
                setEnunciado(e.target.value);
                setModalError(null);
              }}
              placeholder="Digite o enunciado completo da pergunta..."
            />
          </div>

          <div>
            <label style={LABEL_STYLE}>Tipo de Pergunta *</label>
            <select style={INPUT_STYLE} value={tipoPergunta} onChange={(e) => setTipoPergunta(e.target.value)}>
              <option value="estimulada">Estimulada</option>
              <option value="espontanea">Espontânea</option>
              <option value="rejeicao">Rejeição</option>
              <option value="escala">Escala / Avaliação</option>
              <option value="bateria">Bateria</option>
              <option value="aberta">Aberta</option>
              <option value="multipla_escolha">Múltipla Escolha</option>
            </select>
          </div>

          <div>
            <label style={LABEL_STYLE}>Grupo de Opções / Escala (FK grupos_opcoes)</label>
            <SearchableCombobox
              value={grupoId}
              emptyOptionLabel="Sem grupo de opções"
              placeholder="Pesquisar grupo de opções..."
              options={scaleGroups.map((g) => ({
                value: String(g.id),
                label: g.name,
                sublabel: g.scaleType,
              }))}
              onChange={setGrupoId}
            />
          </div>

          {editingQuestion && editingQuestion.linkedQuestionnairesCount > 0 && (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                backgroundColor: colors.surfaceContainerHigh,
                color: colors.textMuted,
                fontSize: "12px",
              }}
            >
              Esta pergunta está vinculada a <strong>{editingQuestion.linkedQuestionnairesCount}</strong> questionário(s) e não pode ser excluída enquanto houver vínculos ativos.
            </div>
          )}
        </div>
      </SlideOverDrawer>

      <ConfirmDialogModal
        isOpen={deleteTarget !== null}
        title="Excluir Pergunta"
        message={
          deleteTarget
            ? `Tem certeza que deseja excluir permanentemente a pergunta #${deleteTarget.id} ("${deleteTarget.text}")?`
            : ""
        }
        confirmLabel="Excluir Pergunta"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
