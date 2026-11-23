import React, { useCallback, useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { ConfirmDialogModal } from "../../components/ui/ConfirmDialogModal";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors } = NOCTURNE_TOKENS;
const API_RESUMO = "http://127.0.0.1:8000/api/v1/questionarios-db/resumo";
const API_GRUPOS = "http://127.0.0.1:8000/api/v1/questionarios-db/grupos-opcoes";

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

export interface ScaleRecord {
  readonly id: number;
  readonly name: string;
  readonly scaleType: string;
  readonly description: string;
  readonly totalOptions: number;
}

export function ScalesCatalogFeature(): React.JSX.Element {
  const [scales, setScales] = useState<readonly ScaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  // Drawer create/edit state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingScale, setEditingScale] = useState<ScaleRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [nomeGrupo, setNomeGrupo] = useState("");
  const [tipoEscala, setTipoEscala] = useState("likert");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ScaleRecord | null>(null);

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
        throw new Error(`Erro ao carregar réguas e escalas do banco (HTTP ${res.status}).`);
      }
      const json = (await res.json()) as {
        grupos_opcoes?: any[];
        opcoes_resposta?: any[];
      };
      const optionCounts = new Map<number, number>();
      if (Array.isArray(json.opcoes_resposta)) {
        for (const o of json.opcoes_resposta) {
          const gId = Number(o.id_grupo_opcao);
          optionCounts.set(gId, (optionCounts.get(gId) ?? 0) + 1);
        }
      }
      const items: ScaleRecord[] = Array.isArray(json.grupos_opcoes)
        ? json.grupos_opcoes.map((s) => {
            const id = Number(s.id_grupo_opcao);
            return {
              id,
              name: String(s.nome_grupo || `Escala #${id}`),
              scaleType: String(s.tipo_escala || "nominal"),
              description: String(s.descricao || "Régua padronizada de opções"),
              totalOptions: optionCounts.get(id) ?? Number(s.total_opcoes || 0),
            };
          })
        : [];
      setScales(items);
    } catch (err) {
      setScales([]);
      setBannerError(err instanceof Error ? err.message : "Erro ao conectar com o banco de dados.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateModal = (): void => {
    setEditingScale(null);
    setModalError(null);
    setBannerError(null);
    setNomeGrupo("");
    setTipoEscala("likert");
    setDrawerOpen(true);
  };

  const openEditModal = (scale: ScaleRecord): void => {
    setEditingScale(scale);
    setModalError(null);
    setBannerError(null);
    setNomeGrupo(scale.name);
    setTipoEscala(scale.scaleType || "nominal");
    setDrawerOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    const trimmedName = nomeGrupo.trim();
    if (!trimmedName) {
      setModalError("Informe o nome da régua / grupo de opções.");
      return;
    }
    setSaving(true);
    setModalError(null);
    setBannerError(null);
    try {
      const payload = {
        nome_grupo: trimmedName,
        tipo_escala: tipoEscala.trim() || "nominal",
      };
      const isEdit = editingScale !== null;
      const url = isEdit ? `${API_GRUPOS}/${editingScale.id}` : API_GRUPOS;
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
            : `Erro ao salvar régua/escala (HTTP ${res.status}).`;
        throw new Error(detail);
      }
      setDrawerOpen(false);
      setEditingScale(null);
      await loadData();
      notifySuccess(isEdit ? "Régua/escala atualizada com sucesso." : "Régua/escala cadastrada com sucesso.");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Erro ao salvar régua/escala.");
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
      const res = await fetch(`${API_GRUPOS}/${target.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail =
          typeof err?.detail === "string"
            ? err.detail
            : `Erro ao excluir régua/escala (HTTP ${res.status}).`;
        setBannerError(detail);
        if (drawerOpen) setModalError(detail);
        return;
      }
      if (editingScale?.id === target.id) {
        setDrawerOpen(false);
        setEditingScale(null);
      }
      await loadData();
      notifySuccess(`Régua "${target.name}" excluída com sucesso.`);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : "Erro ao excluir régua/escala.");
    }
  };

  const isLikert = (scaleType: string): boolean => /likert|ordinal/i.test(scaleType);
  const isBinaria = (scaleType: string): boolean => /binar|dicot/i.test(scaleType);

  const filtered = useMemo(() => {
    return scales.filter((s) => {
      if (activeTab === "LIKERT" && !isLikert(s.scaleType)) return false;
      if (activeTab === "BINARIA" && !isBinaria(s.scaleType)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.scaleType.toLowerCase().includes(q);
      }
      return true;
    });
  }, [scales, activeTab, search]);

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

      <EnterpriseCrudWorkspace<ScaleRecord>
        title="Réguas e Escalas de Resposta"
        subtitle="Padronização de réguas psicométricas (Likert, dicotômicas e discos) — Tabela perguntas_grupos_opcoes"
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
            + Nova Régua / Escala
          </button>
        }
        tabs={[
          { id: "TODOS", label: "Todas as Escalas", count: scales.length },
          { id: "LIKERT", label: "Escalas Likert", count: scales.filter((s) => isLikert(s.scaleType)).length },
          { id: "BINARIA", label: "Dicotômicas (Aprova/Desaprova)", count: scales.filter((s) => isBinaria(s.scaleType)).length },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={[
          { id: "kpi-scales-total", label: "Réguas Cadastradas", value: scales.length, helperText: "Tabela perguntas_grupos_opcoes", variant: "default" },
          { id: "kpi-scales-likert", label: "Padrão Internacional", value: "Likert & CAPI", helperText: "Norma ISO / TSE", variant: "success" },
          { id: "kpi-scales-neutral", label: "Neutros Mapeados", value: "NS/NR & Branco", helperText: "Tratamento de não-resposta", variant: "default" },
        ]}
        searchPlaceholder="Buscar por nome da escala, tipo ou descrição..."
        searchValue={search}
        onSearchChange={setSearch}
        columns={[
          { header: "ID", key: "id", render: (s) => <span style={{ fontWeight: 700, color: "#38bdf8" }}>#{s.id}</span> },
          {
            header: "Nome da Régua / Grupo",
            key: "name",
            render: (s) => (
              <button
                type="button"
                onClick={() => openEditModal(s)}
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
                title="Clique para editar esta régua/escala"
              >
                {s.name}
              </button>
            ),
          },
          { header: "Tipo da Escala", key: "scaleType", render: (s) => <span style={{ padding: "2px 8px", borderRadius: "6px", backgroundColor: "#1e293b", color: "#a78bfa", fontWeight: 600, fontSize: "11px" }}>{s.scaleType}</span> },
          { header: "Descrição das Opções", key: "description", render: (s) => <span style={{ color: "#94a3b8" }}>{s.description}</span> },
          { header: "Total de Alternativas", key: "totalOptions", render: (s) => <span style={{ fontWeight: 700, color: "#34d399" }}>{s.totalOptions} opções</span> },
        ]}
        data={filtered}
        keyExtractor={(s) => String(s.id)}
        isLoading={isLoading}
        emptyTitle="Nenhuma régua/escala cadastrada"
        emptyDescription="Clique em '+ Nova Régua / Escala' para cadastrar um grupo de opções no banco de dados."
        renderRowActions={(s) => (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(s);
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
                setDeleteTarget(s);
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
            setEditingScale(null);
            setModalError(null);
          }
        }}
        title={editingScale ? `Editar Régua / Escala #${editingScale.id}` : "Nova Régua / Escala"}
        width="480px"
        footerActions={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", width: "100%" }}>
            <div>
              {editingScale && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setDeleteTarget(editingScale)}
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
                  setEditingScale(null);
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
                disabled={saving || !nomeGrupo.trim()}
                onClick={() => void handleSave()}
                style={{
                  padding: "9px 18px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: colors.primaryContainer,
                  color: colors.onPrimary,
                  fontWeight: 700,
                  cursor: saving || !nomeGrupo.trim() ? "not-allowed" : "pointer",
                  opacity: saving || !nomeGrupo.trim() ? 0.5 : 1,
                }}
              >
                {saving ? "Salvando..." : editingScale ? "Salvar Alterações" : "Salvar"}
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
            <label style={LABEL_STYLE}>Nome da Régua / Grupo *</label>
            <input
              style={INPUT_STYLE}
              value={nomeGrupo}
              onChange={(e) => {
                setNomeGrupo(e.target.value);
                setModalError(null);
              }}
              placeholder="Ex: Escala de Avaliação de Gestão (5 Pontos)"
            />
          </div>

          <div>
            <label style={LABEL_STYLE}>Tipo da Escala *</label>
            <select style={INPUT_STYLE} value={tipoEscala} onChange={(e) => setTipoEscala(e.target.value)}>
              <option value="likert">Likert</option>
              <option value="binaria">Binária / Dicotômica</option>
              <option value="nominal">Nominal</option>
              <option value="ordinal">Ordinal</option>
              <option value="disco_circular">Disco Circular</option>
              <option value="rejeicao">Rejeição</option>
            </select>
          </div>
        </div>
      </SlideOverDrawer>

      <ConfirmDialogModal
        isOpen={deleteTarget !== null}
        title="Excluir Régua / Escala"
        message={
          deleteTarget
            ? `Tem certeza que deseja excluir a régua "${deleteTarget.name}"?`
            : ""
        }
        confirmLabel="Excluir Régua"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

