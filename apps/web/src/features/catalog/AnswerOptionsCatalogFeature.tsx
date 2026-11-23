import React, { useCallback, useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { SearchableCombobox } from "../../components/ui/SearchableCombobox";
import { ConfirmDialogModal } from "../../components/ui/ConfirmDialogModal";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors } = NOCTURNE_TOKENS;
const API_RESUMO = "http://127.0.0.1:8000/api/v1/questionarios-db/resumo";
const API_OPCOES = "http://127.0.0.1:8000/api/v1/questionarios-db/opcoes-resposta";

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

export interface OptionRecord {
  readonly id: number;
  readonly groupId: number;
  readonly groupName: string;
  readonly label: string;
  readonly numericCode: number | null;
  readonly displayOrder: number;
  readonly isNeutral: boolean;
  readonly colorHex: string;
  readonly active: boolean;
}

interface ScaleGroupOption {
  readonly id: number;
  readonly name: string;
  readonly scaleType: string;
}

export function AnswerOptionsCatalogFeature(): React.JSX.Element {
  const [options, setOptions] = useState<readonly OptionRecord[]>([]);
  const [groups, setGroups] = useState<readonly ScaleGroupOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  // Drawer create/edit state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<OptionRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [groupId, setGroupId] = useState("");
  const [rotulo, setRotulo] = useState("");
  const [valorNumerico, setValorNumerico] = useState("");
  const [ordem, setOrdem] = useState("1");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<OptionRecord | null>(null);

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
        throw new Error(`Erro ao carregar alternativas de resposta do banco (HTTP ${res.status}).`);
      }
      const json = (await res.json()) as {
        grupos_opcoes?: any[];
        opcoes_resposta?: any[];
      };
      const groupList: ScaleGroupOption[] = Array.isArray(json.grupos_opcoes)
        ? json.grupos_opcoes.map((g) => ({
            id: Number(g.id_grupo_opcao),
            name: String(g.nome_grupo ?? `Grupo #${g.id_grupo_opcao}`),
            scaleType: String(g.tipo_escala ?? "nominal"),
          }))
        : [];
      setGroups(groupList);

      const groupMap = new Map(groupList.map((g) => [g.id, g.name]));
      const items: OptionRecord[] = Array.isArray(json.opcoes_resposta)
        ? json.opcoes_resposta.map((o) => {
            const gId = Number(o.id_grupo_opcao);
            const rawCode = o.valor_numerico ?? o.codigo_valor;
            const numCode = rawCode !== null && rawCode !== undefined ? Number(rawCode) : null;
            const lbl = String(o.rotulo ?? "");
            const isNeutral =
              typeof o.eh_neutro_invalido === "boolean"
                ? o.eh_neutro_invalido
                : numCode === 98 || numCode === 99 || /não sabe|branco|nulo|ns\/nr/i.test(lbl);
            return {
              id: Number(o.id_opcao),
              groupId: gId,
              groupName: String(o.nome_grupo || groupMap.get(gId) || `Grupo #${gId}`),
              label: lbl,
              numericCode: numCode,
              displayOrder: Number(o.ordem ?? o.ordem_exibicao ?? 1),
              isNeutral,
              colorHex: String(o.cor_hex || (isNeutral ? "#64748b" : "#3b82f6")),
              active: Boolean(o.ativo ?? true),
            };
          })
        : [];
      setOptions(items);
    } catch (err) {
      setOptions([]);
      setBannerError(err instanceof Error ? err.message : "Erro ao conectar com o banco de dados.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateModal = (): void => {
    setEditingOption(null);
    setModalError(null);
    setBannerError(null);
    setGroupId("");
    setRotulo("");
    setValorNumerico("");
    setOrdem(String(options.length + 1));
    setDrawerOpen(true);
  };

  const openEditModal = (opt: OptionRecord): void => {
    setEditingOption(opt);
    setModalError(null);
    setBannerError(null);
    setGroupId(String(opt.groupId));
    setRotulo(opt.label);
    setValorNumerico(opt.numericCode !== null ? String(opt.numericCode) : "");
    setOrdem(String(opt.displayOrder));
    setDrawerOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    const trimmedLabel = rotulo.trim();
    const numericGroupId = Number(groupId);
    if (!groupId || !Number.isFinite(numericGroupId) || numericGroupId <= 0) {
      setModalError("Selecione o grupo / régua pertencente.");
      return;
    }
    if (!trimmedLabel) {
      setModalError("Informe o rótulo da alternativa de resposta.");
      return;
    }
    setSaving(true);
    setModalError(null);
    setBannerError(null);
    try {
      const parsedVal = valorNumerico.trim() !== "" ? Number(valorNumerico.trim()) : null;
      const payload = {
        id_grupo_opcao: numericGroupId,
        rotulo: trimmedLabel,
        valor_numerico: parsedVal !== null && Number.isFinite(parsedVal) ? parsedVal : null,
        ordem: Math.max(1, Number(ordem) || 1),
      };
      const isEdit = editingOption !== null;
      const url = isEdit ? `${API_OPCOES}/${editingOption.id}` : API_OPCOES;
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
            : `Erro ao salvar alternativa (HTTP ${res.status}).`;
        throw new Error(detail);
      }
      setDrawerOpen(false);
      setEditingOption(null);
      await loadData();
      notifySuccess(isEdit ? "Alternativa atualizada com sucesso." : "Alternativa cadastrada com sucesso.");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Erro ao salvar alternativa.");
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
      const res = await fetch(`${API_OPCOES}/${target.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail =
          typeof err?.detail === "string"
            ? err.detail
            : `Erro ao excluir alternativa (HTTP ${res.status}).`;
        setBannerError(detail);
        return;
      }
      if (editingOption?.id === target.id) {
        setDrawerOpen(false);
        setEditingOption(null);
      }
      await loadData();
      notifySuccess(`Alternativa "${target.label}" excluída com sucesso.`);
    } catch (err) {
      setBannerError(err instanceof Error ? err.message : "Erro ao excluir alternativa.");
    }
  };

  const filtered = useMemo(() => {
    return options.filter((o) => {
      if (activeTab === "NEUTROS" && !o.isNeutral) return false;
      if (activeTab === "VALORATIVOS" && o.isNeutral) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return o.label.toLowerCase().includes(q) || o.groupName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [options, activeTab, search]);

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

      <EnterpriseCrudWorkspace<OptionRecord>
        title="Alternativas de Resposta"
        subtitle="Cadastro e calibração de rótulos, códigos numéricos e paleta de cores — Tabela opcoes_resposta"
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
            + Nova Alternativa
          </button>
        }
        tabs={[
          { id: "TODOS", label: "Todas as Alternativas", count: options.length },
          { id: "VALORATIVOS", label: "Alternativas Válidas", count: options.filter((o) => !o.isNeutral).length },
          { id: "NEUTROS", label: "Neutros / Inválidos (NS/NR/Branco)", count: options.filter((o) => o.isNeutral).length },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={[
          { id: "kpi-opt-total", label: "Total de Alternativas", value: options.length, helperText: "Tabela opcoes_resposta", variant: "default" },
          { id: "kpi-opt-neutral", label: "Filtros de Abstenção", value: "NS/NR & Nulo", helperText: "Validação estatística", variant: "default" },
          { id: "kpi-opt-palette", label: "Cores Padronizadas", value: "HEX Ativo", helperText: "Renderização CAPI / Gráficos", variant: "success" },
        ]}
        searchPlaceholder="Buscar por rótulo ou grupo de opção..."
        searchValue={search}
        onSearchChange={setSearch}
        columns={[
          { header: "Código", key: "numericCode", render: (o) => <span style={{ fontWeight: 700, color: "#38bdf8" }}>{o.numericCode !== null ? `Cod: ${o.numericCode}` : "—"}</span> },
          {
            header: "Rótulo da Opção",
            key: "label",
            render: (o) => (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: o.colorHex, border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
                <button
                  type="button"
                  onClick={() => openEditModal(o)}
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
                  title="Clique para editar esta alternativa"
                >
                  {o.label}
                </button>
              </div>
            ),
          },
          { header: "Grupo / Régua Pertencente", key: "groupName", render: (o) => <span style={{ color: "#94a3b8" }}>{o.groupName}</span> },
          { header: "Ordem Base", key: "displayOrder", render: (o) => <span style={{ color: "#cbd5e1" }}>Posição {o.displayOrder}</span> },
          {
            header: "Classificação",
            key: "isNeutral",
            render: (o) => (
              <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", backgroundColor: o.isNeutral ? "#334155" : "#1e293b", color: o.isNeutral ? "#94a3b8" : "#38bdf8" }}>
                {o.isNeutral ? "Neutro / Inválido" : "Válido / Pontuado"}
              </span>
            ),
          },
        ]}
        data={filtered}
        keyExtractor={(o) => String(o.id)}
        isLoading={isLoading}
        emptyTitle="Nenhuma alternativa cadastrada"
        emptyDescription="Clique em '+ Nova Alternativa' para cadastrar uma opção de resposta no banco de dados."
        renderRowActions={(o) => (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(o);
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
                setDeleteTarget(o);
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
            setEditingOption(null);
            setModalError(null);
          }
        }}
        title={editingOption ? `Editar Alternativa #${editingOption.id}` : "Nova Alternativa de Resposta"}
        width="500px"
        footerActions={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", width: "100%" }}>
            <div>
              {editingOption && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setDeleteTarget(editingOption)}
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
                  setEditingOption(null);
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
                disabled={saving || !rotulo.trim() || !groupId}
                onClick={() => void handleSave()}
                style={{
                  padding: "9px 18px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: colors.primaryContainer,
                  color: colors.onPrimary,
                  fontWeight: 700,
                  cursor: saving || !rotulo.trim() || !groupId ? "not-allowed" : "pointer",
                  opacity: saving || !rotulo.trim() || !groupId ? 0.5 : 1,
                }}
              >
                {saving ? "Salvando..." : editingOption ? "Salvar Alterações" : "Salvar"}
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
            <label style={LABEL_STYLE}>Grupo / Régua Pertencente (FK perguntas_grupos_opcoes) *</label>
            <SearchableCombobox
              value={groupId}
              placeholder="Selecione ou pesquise o grupo de opções..."
              options={groups.map((g) => ({
                value: String(g.id),
                label: g.name,
                sublabel: g.scaleType,
              }))}
              onChange={(val) => {
                setGroupId(val);
                setModalError(null);
              }}
            />
          </div>

          <div>
            <label style={LABEL_STYLE}>Rótulo da Opção *</label>
            <input
              style={INPUT_STYLE}
              value={rotulo}
              onChange={(e) => {
                setRotulo(e.target.value);
                setModalError(null);
              }}
              placeholder="Ex: Ótimo, Bom, Não Sabe / Não Respondeu"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={LABEL_STYLE}>Código / Valor Numérico</label>
              <input
                style={INPUT_STYLE}
                type="number"
                value={valorNumerico}
                onChange={(e) => setValorNumerico(e.target.value)}
                placeholder="Ex: 5, 99"
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Ordem Base</label>
              <input
                style={INPUT_STYLE}
                type="number"
                min="1"
                value={ordem}
                onChange={(e) => setOrdem(e.target.value)}
              />
            </div>
          </div>
        </div>
      </SlideOverDrawer>

      <ConfirmDialogModal
        isOpen={deleteTarget !== null}
        title="Excluir Alternativa de Resposta"
        message={
          deleteTarget
            ? `Tem certeza que deseja excluir a alternativa "${deleteTarget.label}"?`
            : ""
        }
        confirmLabel="Excluir Alternativa"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

