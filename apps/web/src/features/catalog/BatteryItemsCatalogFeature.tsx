import React, { useCallback, useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { SearchableCombobox } from "../../components/ui/SearchableCombobox";
import { ConfirmDialogModal } from "../../components/ui/ConfirmDialogModal";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors } = NOCTURNE_TOKENS;
const API_RESUMO = "http://127.0.0.1:8000/api/v1/questionarios-db/resumo";
const API_ITENS_BATERIA = "http://127.0.0.1:8000/api/v1/questionarios-db/itens-bateria";

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

export interface BatteryItemRecord {
  readonly id: number;
  readonly questionId: number;
  readonly questionText: string;
  readonly itemDescription: string;
  readonly order: number;
}

interface QuestionOption {
  readonly id: number;
  readonly enunciado: string;
}

export function BatteryItemsCatalogFeature(): React.JSX.Element {
  const [items, setItems] = useState<readonly BatteryItemRecord[]>([]);
  const [questions, setQuestions] = useState<readonly QuestionOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  // Drawer create/edit state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BatteryItemRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [questionId, setQuestionId] = useState("");
  const [itemLabel, setItemLabel] = useState("");
  const [itemOrder, setItemOrder] = useState("1");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<BatteryItemRecord | null>(null);

  const notifySuccess = (msg: string): void => {
    setBannerSuccess(msg);
    window.setTimeout(() => setBannerSuccess((prev) => (prev === msg ? null : prev)), 3500);
  };

  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setBannerError(null);
    try {
      const res = await fetch(API_RESUMO, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Erro ao carregar itens de bateria do banco de dados (HTTP ${res.status}).`);
      }
      const json = (await res.json()) as {
        itens_bateria?: any[];
        perguntas?: any[];
      };
      setQuestions(
        Array.isArray(json.perguntas)
          ? json.perguntas.map((p) => ({
              id: Number(p.id_pergunta),
              enunciado: String(p.enunciado ?? `Pergunta #${p.id_pergunta}`),
            }))
          : []
      );
      setItems(
        Array.isArray(json.itens_bateria)
          ? json.itens_bateria.map((b) => ({
              id: Number(b.id_item_bateria),
              questionId: Number(b.id_pergunta),
              questionText: String(b.pergunta_enunciado || b.texto_pergunta || `Pergunta Matriz #${b.id_pergunta}`),
              itemDescription: String(b.rotulo_item || b.descricao_item || ""),
              order: Number(b.ordem ?? 1),
            }))
          : []
      );
    } catch (err) {
      setItems([]);
      setBannerError(err instanceof Error ? err.message : "Erro ao conectar com o banco de dados.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateModal = (): void => {
    setEditingItem(null);
    setModalError(null);
    setBannerError(null);
    setQuestionId("");
    setItemLabel("");
    setItemOrder(String(items.length + 1));
    setDrawerOpen(true);
  };

  const openEditModal = (item: BatteryItemRecord): void => {
    setEditingItem(item);
    setModalError(null);
    setBannerError(null);
    setQuestionId(String(item.questionId));
    setItemLabel(item.itemDescription);
    setItemOrder(String(item.order));
    setDrawerOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    const trimmedLabel = itemLabel.trim();
    const numericQuestionId = Number(questionId);
    if (!questionId || !Number.isFinite(numericQuestionId) || numericQuestionId <= 0) {
      setModalError("Selecione a pergunta matriz vinculada.");
      return;
    }
    if (!trimmedLabel) {
      setModalError("Informe o rótulo do subitem / área avaliada.");
      return;
    }
    setSaving(true);
    setModalError(null);
    setBannerError(null);
    try {
      const payload = {
        id_pergunta: numericQuestionId,
        rotulo_item: trimmedLabel,
        ordem: Math.max(1, Number(itemOrder) || 1),
      };
      const isEdit = editingItem !== null;
      const url = isEdit ? `${API_ITENS_BATERIA}/${editingItem.id}` : API_ITENS_BATERIA;
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
            : `Erro ao salvar item de bateria (HTTP ${res.status}).`;
        throw new Error(detail);
      }
      setDrawerOpen(false);
      setEditingItem(null);
      await loadData();
      notifySuccess(isEdit ? "Item de bateria atualizado com sucesso." : "Item de bateria cadastrado com sucesso.");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Erro ao salvar item de bateria.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setBannerError(null);
    setModalError(null);
    try {
      const res = await fetch(`${API_ITENS_BATERIA}/${target.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail =
          typeof err?.detail === "string"
            ? err.detail
            : `Erro ao excluir item de bateria (HTTP ${res.status}).`;
        setBannerError(detail);
        return;
      }
      if (editingItem?.id === target.id) {
        setDrawerOpen(false);
        setEditingItem(null);
      }
      await loadData();
      notifySuccess(`Item "${target.itemDescription}" excluído com sucesso.`);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : "Erro ao excluir item de bateria.");
    }
  };

  const filtered = useMemo(() => {
    return items.filter((b) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return b.itemDescription.toLowerCase().includes(q) || b.questionText.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, search]);

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
          }}
        >
          {bannerError}
        </div>
      )}

      <EnterpriseCrudWorkspace<BatteryItemRecord>
        title="Itens de Bateria & Matrizes de Avaliação"
        subtitle="Subitens avaliados em lote sob a mesma escala (Saúde, Educação, etc.) — Tabela perguntas_itens_bateria"
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
            + Novo Item de Bateria
          </button>
        }
        tabs={[
          { id: "TODOS", label: "Todos os Itens", count: items.length },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={[
          { id: "kpi-battery-total", label: "Itens de Avaliação", value: items.length, helperText: "Tabela perguntas_itens_bateria", variant: "default" },
          { id: "kpi-battery-matrix", label: "Estrutura CAPI", value: "Matriz em Grade", helperText: "Avaliação sequencial", variant: "success" },
          { id: "kpi-battery-order", label: "Rodízio Parametrizável", value: "Ativo", helperText: "Previne cansaço do respondente", variant: "default" },
        ]}
        searchPlaceholder="Buscar por item avaliado ou pergunta matriz..."
        searchValue={search}
        onSearchChange={setSearch}
        columns={[
          { header: "Ordem", key: "order", render: (b) => <span style={{ fontWeight: 700, color: "#38bdf8" }}>#{b.order}</span> },
          {
            header: "Subitem / Área Avaliada",
            key: "itemDescription",
            render: (b) => (
              <button
                type="button"
                onClick={() => openEditModal(b)}
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
                title="Clique para editar este item"
              >
                {b.itemDescription}
              </button>
            ),
          },
          { header: "Pergunta Matriz Vinculada", key: "questionText", render: (b) => <span style={{ color: "#94a3b8" }}>{b.questionText}</span> },
          { header: "Identificador Pergunta", key: "questionId", render: (b) => <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", backgroundColor: "#1e293b", color: "#a78bfa" }}>Pergunta #{b.questionId}</span> },
        ]}
        data={filtered}
        keyExtractor={(b) => String(b.id)}
        isLoading={isLoading}
        emptyTitle="Nenhum item de bateria cadastrado"
        emptyDescription="Clique em '+ Novo Item de Bateria' para cadastrar o primeiro item no banco de dados."
        renderRowActions={(b) => (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(b);
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
                setDeleteTarget(b);
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

      <SlideOverDrawer
        isOpen={drawerOpen}
        onClose={() => {
          if (!saving) {
            setDrawerOpen(false);
            setEditingItem(null);
            setModalError(null);
          }
        }}
        title={editingItem ? `Editar Item de Bateria #${editingItem.id}` : "Novo Item de Bateria"}
        width="500px"
        footerActions={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", width: "100%" }}>
            <div>
              {editingItem && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setDeleteTarget(editingItem)}
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
                  setEditingItem(null);
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
                disabled={saving || !itemLabel.trim() || !questionId}
                onClick={() => void handleSave()}
                style={{
                  padding: "9px 18px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: colors.primaryContainer,
                  color: colors.onPrimary,
                  fontWeight: 700,
                  cursor: saving || !itemLabel.trim() || !questionId ? "not-allowed" : "pointer",
                  opacity: saving || !itemLabel.trim() || !questionId ? 0.5 : 1,
                }}
              >
                {saving ? "Salvando..." : editingItem ? "Salvar Alterações" : "Salvar"}
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
            <label style={LABEL_STYLE}>Pergunta Matriz (FK perguntas) *</label>
            <SearchableCombobox
              value={questionId}
              placeholder="Selecione ou pesquise a pergunta matriz..."
              options={questions.map((q) => ({
                value: String(q.id),
                label: `#${q.id} — ${q.enunciado}`,
              }))}
              onChange={(val) => {
                setQuestionId(val);
                setModalError(null);
              }}
            />
          </div>

          <div>
            <label style={LABEL_STYLE}>Subitem / Área Avaliada *</label>
            <input
              style={INPUT_STYLE}
              value={itemLabel}
              onChange={(e) => {
                setItemLabel(e.target.value);
                setModalError(null);
              }}
              placeholder="Ex: Saúde Pública e Postos de Saúde (UBS)"
            />
          </div>

          <div>
            <label style={LABEL_STYLE}>Ordem de Apresentação</label>
            <input
              style={INPUT_STYLE}
              type="number"
              min="1"
              value={itemOrder}
              onChange={(e) => setItemOrder(e.target.value)}
            />
          </div>
        </div>
      </SlideOverDrawer>

      <ConfirmDialogModal
        isOpen={deleteTarget !== null}
        title="Excluir Item de Bateria"
        message={
          deleteTarget
            ? `Tem certeza que deseja excluir o item "${deleteTarget.itemDescription}"?`
            : ""
        }
        confirmLabel="Excluir Item"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

