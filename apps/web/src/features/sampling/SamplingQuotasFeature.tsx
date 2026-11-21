import React, { useEffect, useMemo, useState } from "react";
import { NOCTURNE_BUTTON_STYLES, NOCTURNE_TOKENS } from "../../lib/designTokens";
import { SearchableCombobox } from "../../components/ui/SearchableCombobox";
import { AddCotaDialogModal, type ManualCotaPayload } from "./AddCotaDialogModal";
import { AmostraDialogModal, type AmostraFormPayload } from "./AmostraDialogModal";
import { EleitoradoTseDialogModal, type EleitoradoTseFormPayload } from "./EleitoradoTseDialogModal";

const { colors } = NOCTURNE_TOKENS;
const API_BASE = "http://127.0.0.1:8000/api/v1/amostragem";
const DIMENSOES_API = "http://127.0.0.1:8000/api/v1/pesquisas-tabelas/dimensoes";

const COMPACT_INPUT_STYLE: React.CSSProperties = {
  width: "72px",
  padding: "4px 6px",
  borderRadius: "6px",
  border: `1px solid ${colors.borderFocus}`,
  backgroundColor: colors.surfaceContainer,
  color: colors.textPrimary,
  fontSize: "12px",
};

interface DimensaoResumo {
  readonly id_amostra_dimensao: number;
  readonly nome_dimensao: string;
  readonly fonte_dados: string;
  readonly obrigatoria: boolean;
  readonly ordem_exibicao: number;
  readonly total_cotas: number;
  readonly soma_meta: number;
  readonly soma_coletada: number;
}

const ALLOCATION_LABELS: Record<string, string> = {
  hare_niemeyer: "Hare-Niemeyer",
  proporcional: "Proporcional",
  uniforme: "Uniforme",
  neyman: "Neyman",
};

export function SamplingQuotasFeature(): React.JSX.Element {
  const [municipios, setMunicipios] = useState<any[]>([]);
  const [amostras, setAmostras] = useState<any[]>([]);
  const [bairros, setBairros] = useState<any[]>([]);
  const [eleitoradosTse, setEleitoradosTse] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [dimensoesCatalogo, setDimensoesCatalogo] = useState<any[]>([]);

  const [filterMunicipioId, setFilterMunicipioId] = useState<string>("");
  const [selectedAmostraId, setSelectedAmostraId] = useState<number | null>(null);
  const [cotas, setCotas] = useState<any[]>([]);
  const [activeChildTab, setActiveChildTab] = useState<"cotas" | "dimensoes">("cotas");
  const [filterDimensao, setFilterDimensao] = useState<string>("TODAS");

  const [loadingOpcoes, setLoadingOpcoes] = useState(true);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [editingCotaId, setEditingCotaId] = useState<number | null>(null);
  const [editPct, setEditPct] = useState<string>("");
  const [editQtd, setEditQtd] = useState<string>("");
  const [mutatingCotaId, setMutatingCotaId] = useState<number | null>(null);

  const [amostraModalOpen, setAmostraModalOpen] = useState(false);
  const [editingAmostra, setEditingAmostra] = useState<any | null>(null);
  const [eleitoradoModalOpen, setEleitoradoModalOpen] = useState(false);
  const [addCotaModalOpen, setAddCotaModalOpen] = useState(false);

  const showFeedback = (msg: string): void => {
    setFeedbackMsg(msg);
    window.setTimeout(() => {
      setFeedbackMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const loadOpcoes = async (): Promise<void> => {
    setLoadingOpcoes(true);
    setErrorMsg(null);
    try {
      const [res, dimRes] = await Promise.all([
        fetch(`${API_BASE}/opcoes`, { cache: "no-store" }),
        fetch(DIMENSOES_API, { cache: "no-store" }).catch(() => null),
      ]);
      if (!res.ok) {
        throw new Error(`Falha ao carregar opções de amostragem (HTTP ${res.status}).`);
      }
      const data = await res.json();
      const muns = Array.isArray(data?.municipios) ? data.municipios : [];
      const ams = Array.isArray(data?.amostras) ? data.amostras : [];
      const brs = Array.isArray(data?.bairros) ? data.bairros : [];
      const tse = Array.isArray(data?.eleitorados_tse) ? data.eleitorados_tse : [];
      const usrs = Array.isArray(data?.usuarios) ? data.usuarios : [];

      setMunicipios(muns);
      setAmostras(ams);
      setBairros(brs);
      setEleitoradosTse(tse);
      setUsuarios(usrs);

      if (dimRes && dimRes.ok) {
        const dims = await dimRes.json().catch(() => []);
        setDimensoesCatalogo(Array.isArray(dims) ? dims : []);
      }

      setSelectedAmostraId((currentId) => {
        if (ams.length === 0) return null;
        if (currentId !== null && ams.some((a: any) => a.id_amostra === currentId)) {
          return currentId;
        }
        return ams[0].id_amostra;
      });
      if (ams.length === 0) {
        setCotas([]);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao carregar dados de amostragem.");
    } finally {
      setLoadingOpcoes(false);
    }
  };

  const loadDetalhes = async (idAmostra: number): Promise<void> => {
    setLoadingDetalhes(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/amostras/${idAmostra}/detalhes`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Falha ao carregar cotas da amostra #${idAmostra} (HTTP ${res.status}).`);
      }
      const data = await res.json();
      setCotas(Array.isArray(data?.cotas) ? data.cotas : []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao carregar detalhes da amostra.");
    } finally {
      setLoadingDetalhes(false);
    }
  };

  useEffect(() => {
    void loadOpcoes();
  }, []);

  useEffect(() => {
    setFilterDimensao("TODAS");
    setEditingCotaId(null);
    if (selectedAmostraId !== null) {
      void loadDetalhes(selectedAmostraId);
    } else {
      setCotas([]);
    }
  }, [selectedAmostraId]);

  const handleSaveAmostra = async (payload: AmostraFormPayload, editingId: number | null): Promise<void> => {
    const url = editingId ? `${API_BASE}/amostras/${editingId}` : `${API_BASE}/amostras`;
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.detail || "Erro ao salvar amostra no banco de dados.");
    }
    const saved = await res.json();
    await loadOpcoes();
    if (saved?.id_amostra) {
      setSelectedAmostraId(saved.id_amostra);
      await loadDetalhes(saved.id_amostra);
    }
    showFeedback(editingId ? "Amostra atualizada com sucesso." : "Amostra criada com sucesso.");
  };

  const handleDeleteAmostra = async (idAmostra: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/amostras/${idAmostra}`, { method: "DELETE" });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.detail || "Não foi possível excluir a amostra.");
    }
    if (selectedAmostraId === idAmostra) {
      setSelectedAmostraId(null);
      setCotas([]);
    }
    await loadOpcoes();
    showFeedback(`Amostra #${idAmostra} excluída.`);
  };

  const handleSaveEleitoradoTse = async (payload: EleitoradoTseFormPayload, editingId: number | null): Promise<void> => {
    const url = editingId ? `${API_BASE}/eleitorado-tse/${editingId}` : `${API_BASE}/eleitorado-tse`;
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.detail || "Erro ao salvar registro de eleitorado TSE.");
    }
    await loadOpcoes();
    showFeedback("Registro de eleitorado TSE salvo.");
  };

  const handleDeleteEleitoradoTse = async (idEleitoradoTse: number): Promise<void> => {
    const res = await fetch(`${API_BASE}/eleitorado-tse/${idEleitoradoTse}`, { method: "DELETE" });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.detail || "Não foi possível excluir o registro de eleitorado TSE.");
    }
    await loadOpcoes();
    showFeedback("Registro de eleitorado TSE excluído.");
  };

  const handleSaveManualCota = async (payload: ManualCotaPayload): Promise<void> => {
    if (!selectedAmostraId) return;
    const res = await fetch(`${API_BASE}/amostras/${selectedAmostraId}/cotas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.detail || "Erro ao adicionar cota.");
    }
    await loadDetalhes(selectedAmostraId);
    showFeedback("Cota adicionada à amostra.");
  };

  const handleStartEditCota = (cota: any): void => {
    setEditingCotaId(cota.id_cota);
    setEditPct(String(cota.percentual_meta ?? 0));
    setEditQtd(String(cota.quantidade_meta ?? 0));
  };

  const handleSaveInlineCota = async (idCota: number): Promise<void> => {
    const pct = Number(editPct);
    const qtd = Number(editQtd);
    if (Number.isNaN(pct) || Number.isNaN(qtd) || qtd < 0) return;
    setMutatingCotaId(idCota);
    try {
      const res = await fetch(`${API_BASE}/cotas/${idCota}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percentual_meta: pct, quantidade_meta: qtd }),
      });
      if (!res.ok) {
        throw new Error("Erro ao atualizar cota.");
      }
      setEditingCotaId(null);
      if (selectedAmostraId) await loadDetalhes(selectedAmostraId);
      showFeedback("Cota atualizada.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao atualizar cota.");
    } finally {
      setMutatingCotaId(null);
    }
  };

  const handleDeleteCota = async (idCota: number): Promise<void> => {
    if (!window.confirm("Deseja remover esta cota da amostra?")) return;
    setMutatingCotaId(idCota);
    try {
      const res = await fetch(`${API_BASE}/cotas/${idCota}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir cota.");
      if (selectedAmostraId) await loadDetalhes(selectedAmostraId);
      showFeedback("Cota removida.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao excluir cota.");
    } finally {
      setMutatingCotaId(null);
    }
  };

  const amostrasVisiveis = useMemo(
    () =>
      filterMunicipioId
        ? amostras.filter((a) => String(a.id_municipio) === filterMunicipioId)
        : amostras,
    [amostras, filterMunicipioId]
  );

  const selectedAmostra = useMemo(
    () => amostras.find((a) => a.id_amostra === selectedAmostraId) ?? null,
    [amostras, selectedAmostraId]
  );

  const filteredBairros = useMemo(
    () =>
      selectedAmostra
        ? bairros.filter((b) => b.id_municipio === selectedAmostra.id_municipio)
        : bairros,
    [bairros, selectedAmostra]
  );

  const dimensoesDaAmostra: readonly DimensaoResumo[] = useMemo(() => {
    if (!selectedAmostraId) return [];
    const map = new Map<number, DimensaoResumo>();

    // Seed from catalog if available for this amostra
    for (const d of dimensoesCatalogo) {
      if (Number(d.id_amostra) !== selectedAmostraId) continue;
      map.set(d.id_amostra_dimensao, {
        id_amostra_dimensao: d.id_amostra_dimensao,
        nome_dimensao: d.nome_dimensao,
        fonte_dados: d.fonte_dados || "TSE / IBGE",
        obrigatoria: Boolean(d.obrigatoria ?? true),
        ordem_exibicao: Number(d.ordem_exibicao ?? 1),
        total_cotas: 0,
        soma_meta: 0,
        soma_coletada: 0,
      });
    }

    // Aggregate from cotas
    for (const c of cotas) {
      const idDim = Number(c.id_amostra_dimensao);
      const existing = map.get(idDim);
      if (existing) {
        map.set(idDim, {
          ...existing,
          total_cotas: existing.total_cotas + 1,
          soma_meta: existing.soma_meta + Number(c.quantidade_meta ?? 0),
          soma_coletada: existing.soma_coletada + Number(c.quantidade_coletada ?? 0),
        });
      } else {
        map.set(idDim, {
          id_amostra_dimensao: idDim,
          nome_dimensao: c.nome_dimensao || `Dimensão #${idDim}`,
          fonte_dados: c.fonte_dados || "TSE",
          obrigatoria: true,
          ordem_exibicao: map.size + 1,
          total_cotas: 1,
          soma_meta: Number(c.quantidade_meta ?? 0),
          soma_coletada: Number(c.quantidade_coletada ?? 0),
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.ordem_exibicao - b.ordem_exibicao);
  }, [cotas, dimensoesCatalogo, selectedAmostraId]);

  const dimensaoNames = useMemo(
    () => Array.from(new Set(cotas.map((c) => String(c.nome_dimensao || "")).filter(Boolean))),
    [cotas]
  );

  const cotasFiltradas = useMemo(
    () =>
      filterDimensao === "TODAS"
        ? cotas
        : cotas.filter((c) => c.nome_dimensao === filterDimensao),
    [cotas, filterDimensao]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: colors.textPrimary }}>
      {/* Cabeçalho Global */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600, letterSpacing: "-0.01em" }}>
            Planejamento Amostral & Cotas
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: colors.textMuted }}>
            Selecione uma amostra à esquerda para gerenciar suas cotas e variáveis de controle.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setEleitoradoModalOpen(true)}
            style={NOCTURNE_BUTTON_STYLES.secondary}
          >
            + Eleitorado TSE
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingAmostra(null);
              setAmostraModalOpen(true);
            }}
            style={NOCTURNE_BUTTON_STYLES.primary}
          >
            + Nova Amostra
          </button>
        </div>
      </div>

      {/* Banners de Erro e Feedback */}
      {errorMsg && (
        <div
          role="alert"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            padding: "10px 14px",
            borderRadius: "12px",
            backgroundColor: "rgba(242, 139, 130, 0.12)",
            border: `1px solid ${colors.errorPastel}`,
            color: colors.errorPastel,
            fontSize: "12.5px",
          }}
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => void loadOpcoes()}
            style={{ ...NOCTURNE_BUTTON_STYLES.ghost, padding: "5px 10px", fontSize: "11.5px" }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {feedbackMsg && (
        <div
          style={{
            padding: "9px 14px",
            borderRadius: "12px",
            backgroundColor: colors.successContainer,
            border: `1px solid ${colors.successPastel}`,
            color: colors.onSuccessContainer,
            fontSize: "12.5px",
            fontWeight: 500,
          }}
        >
          ✓ {feedbackMsg}
        </div>
      )}

      {/* Layout Mestre-Detalhe (Pai e Filho) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(290px, 340px) minmax(0, 1fr)",
          gap: "16px",
          alignItems: "start",
        }}
      >
        {/* PAINEL PAI: Lista de Amostras */}
        <section
          aria-label="Amostras cadastradas"
          style={{
            backgroundColor: colors.surfaceContainerLow,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: "16px",
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "13.5px", fontWeight: 600 }}>
              Amostras ({amostrasVisiveis.length})
            </h3>
            {filterMunicipioId && (
              <button
                type="button"
                onClick={() => setFilterMunicipioId("")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: colors.primaryContainer,
                  fontSize: "11.5px",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Limpar
              </button>
            )}
          </div>

          <SearchableCombobox
            value={filterMunicipioId}
            emptyOptionLabel="Todos os municípios"
            placeholder="Digite o município..."
            options={municipios.map((m) => ({
              value: String(m.id_municipio),
              label: `${m.nome} / ${m.uf}`,
            }))}
            onChange={setFilterMunicipioId}
            style={{ padding: "8px 28px 8px 10px", fontSize: "12px", borderRadius: "10px" }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "64vh", overflowY: "auto", paddingRight: "2px" }}>
            {loadingOpcoes && (
              <>
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    style={{
                      height: "74px",
                      borderRadius: "12px",
                      backgroundColor: colors.surfaceCard,
                      border: `1px solid ${colors.borderSubtle}`,
                      opacity: 0.55,
                    }}
                  />
                ))}
              </>
            )}

            {!loadingOpcoes && amostrasVisiveis.length === 0 && (
              <div
                style={{
                  padding: "24px 12px",
                  textAlign: "center",
                  color: colors.textMuted,
                  fontSize: "12.5px",
                  border: `1px dashed ${colors.borderSubtle}`,
                  borderRadius: "12px",
                }}
              >
                <p style={{ margin: "0 0 10px" }}>Nenhuma amostra encontrada.</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAmostra(null);
                    setAmostraModalOpen(true);
                  }}
                  style={{ ...NOCTURNE_BUTTON_STYLES.primary, padding: "7px 12px", fontSize: "12px" }}
                >
                  + Criar Primeira Amostra
                </button>
              </div>
            )}

            {!loadingOpcoes &&
              amostrasVisiveis.map((a) => {
                const isSelected = a.id_amostra === selectedAmostraId;
                return (
                  <div
                    key={a.id_amostra}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedAmostraId(a.id_amostra)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedAmostraId(a.id_amostra);
                      }
                    }}
                    style={{
                      padding: "11px 12px",
                      borderRadius: "12px",
                      border: `1px solid ${isSelected ? colors.borderFocus : colors.borderSubtle}`,
                      backgroundColor: isSelected ? colors.surfaceContainerHigh : colors.surfaceCard,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      transition: "border-color 120ms ease, background-color 120ms ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: colors.textPrimary, lineHeight: 1.3 }}>
                        {a.descricao}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: colors.textMuted,
                          flexShrink: 0,
                        }}
                      >
                        #{a.id_amostra}
                      </span>
                    </div>

                    <div style={{ fontSize: "11.5px", color: colors.textMuted }}>
                      {a.municipio_nome ? `${a.municipio_nome} / ${a.uf || ""}` : "Município não informado"}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: colors.primaryContainer,
                            backgroundColor: "rgba(138, 180, 248, 0.12)",
                            padding: "2px 7px",
                            borderRadius: "9999px",
                          }}
                        >
                          N = {a.tamanho_amostral}
                        </span>
                        <span style={{ fontSize: "11px", color: colors.textMuted }}>
                          {a.nivel_confianca}% • ±{a.margem_erro}%
                        </span>
                      </div>

                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAmostra(a);
                            setAmostraModalOpen(true);
                          }}
                          style={{ ...NOCTURNE_BUTTON_STYLES.edit, padding: "3px 8px", fontSize: "11px" }}
                        >
                          ✏️ Editar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* PAINEL FILHO: Detalhes, Cotas e Dimensões da Amostra Selecionada */}
        <section
          aria-label="Detalhes da amostra selecionada"
          style={{
            backgroundColor: colors.surfaceContainerLow,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: "16px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            minHeight: "420px",
          }}
        >
          {!selectedAmostra ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "48px 16px",
                color: colors.textMuted,
                textAlign: "center",
              }}
            >
              <strong style={{ color: colors.textPrimary, fontSize: "14px" }}>Nenhuma amostra selecionada</strong>
              <span style={{ fontSize: "12.5px" }}>
                Escolha uma amostra na coluna à esquerda ou crie uma nova para visualizar cotas e dimensões.
              </span>
            </div>
          ) : (
            <>
              {/* Cabeçalho do Pai Selecionado */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "12px",
                  paddingBottom: "12px",
                  borderBottom: `1px solid ${colors.borderSubtle}`,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                      {selectedAmostra.descricao}
                    </h3>
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        backgroundColor: colors.surfaceCard,
                        border: `1px solid ${colors.borderSubtle}`,
                        color: colors.textMuted,
                      }}
                    >
                      #{selectedAmostra.id_amostra} • {selectedAmostra.municipio_nome || "Município"} / {selectedAmostra.uf || ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "12px", color: colors.textMuted }}>
                    <span>
                      Meta: <strong style={{ color: colors.primaryContainer }}>{selectedAmostra.tamanho_amostral}</strong> entrevistas
                    </span>
                    <span>
                      Confiança/Margem: <strong style={{ color: colors.textPrimary }}>{selectedAmostra.nivel_confianca}% / ±{selectedAmostra.margem_erro}%</strong>
                    </span>
                    <span>
                      Universo: <strong style={{ color: colors.textPrimary }}>{Number(selectedAmostra.populacao_universo || 0).toLocaleString("pt-BR")}</strong>
                    </span>
                    <span>
                      Método: <strong style={{ color: colors.textPrimary }}>{ALLOCATION_LABELS[selectedAmostra.metodo_alocacao] || selectedAmostra.metodo_alocacao}</strong>
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAmostra(selectedAmostra);
                      setAmostraModalOpen(true);
                    }}
                    style={{ ...NOCTURNE_BUTTON_STYLES.edit, padding: "7px 12px", fontSize: "12px" }}
                  >
                    ✏️ Editar Amostra
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddCotaModalOpen(true)}
                    style={{ ...NOCTURNE_BUTTON_STYLES.secondary, padding: "7px 12px", fontSize: "12px" }}
                  >
                    + Nova Cota
                  </button>
                </div>
              </div>

              {/* Abas dos Filhos: Cotas vs Dimensões */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div
                  role="tablist"
                  style={{
                    display: "inline-flex",
                    backgroundColor: colors.surfaceCard,
                    border: `1px solid ${colors.borderSubtle}`,
                    borderRadius: "9999px",
                    padding: "3px",
                    gap: "4px",
                  }}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeChildTab === "cotas"}
                    onClick={() => setActiveChildTab("cotas")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "9999px",
                      border: "none",
                      backgroundColor: activeChildTab === "cotas" ? colors.surfaceContainerHigh : "transparent",
                      color: activeChildTab === "cotas" ? colors.textPrimary : colors.textMuted,
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cotas ({cotas.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeChildTab === "dimensoes"}
                    onClick={() => setActiveChildTab("dimensoes")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "9999px",
                      border: "none",
                      backgroundColor: activeChildTab === "dimensoes" ? colors.surfaceContainerHigh : "transparent",
                      color: activeChildTab === "dimensoes" ? colors.textPrimary : colors.textMuted,
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Dimensões / Controle ({dimensoesDaAmostra.length})
                  </button>
                </div>

                {activeChildTab === "cotas" && dimensaoNames.length > 1 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => setFilterDimensao("TODAS")}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "9999px",
                        border: `1px solid ${filterDimensao === "TODAS" ? colors.borderFocus : colors.borderSubtle}`,
                        backgroundColor: filterDimensao === "TODAS" ? "rgba(138, 180, 248, 0.14)" : "transparent",
                        color: filterDimensao === "TODAS" ? colors.primaryContainer : colors.textMuted,
                        fontSize: "11.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Todas
                    </button>
                    {dimensaoNames.map((dim) => (
                      <button
                        key={dim}
                        type="button"
                        onClick={() => setFilterDimensao(dim)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "9999px",
                          border: `1px solid ${filterDimensao === dim ? colors.borderFocus : colors.borderSubtle}`,
                          backgroundColor: filterDimensao === dim ? "rgba(138, 180, 248, 0.14)" : "transparent",
                          color: filterDimensao === dim ? colors.primaryContainer : colors.textMuted,
                          fontSize: "11.5px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {dim}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Conteúdo Filho: COTAS */}
              {activeChildTab === "cotas" && (
                <div style={{ overflowX: "auto" }}>
                  {loadingDetalhes ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "8px 0" }}>
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          style={{
                            height: "36px",
                            borderRadius: "8px",
                            backgroundColor: colors.surfaceCard,
                            opacity: 0.55,
                          }}
                        />
                      ))}
                    </div>
                  ) : cotasFiltradas.length === 0 ? (
                    <div
                      style={{
                        padding: "32px 16px",
                        textAlign: "center",
                        color: colors.textMuted,
                        fontSize: "12.5px",
                        border: `1px dashed ${colors.borderSubtle}`,
                        borderRadius: "12px",
                      }}
                    >
                      <p style={{ margin: "0 0 10px" }}>Nenhuma cota cadastrada para esta amostra.</p>
                      <button
                        type="button"
                        onClick={() => setAddCotaModalOpen(true)}
                        style={{ ...NOCTURNE_BUTTON_STYLES.secondary, padding: "7px 14px", fontSize: "12px" }}
                      >
                        + Adicionar Primeira Cota
                      </button>
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                      <thead>
                        <tr
                          style={{
                            borderBottom: `1px solid ${colors.borderSubtle}`,
                            textAlign: "left",
                            color: colors.textMuted,
                            fontSize: "11px",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          <th style={{ padding: "8px 6px" }}>Dimensão</th>
                          <th style={{ padding: "8px 6px" }}>Estrato / Categoria</th>
                          <th style={{ padding: "8px 6px" }}>Bairro</th>
                          <th style={{ padding: "8px 6px" }}>% Meta</th>
                          <th style={{ padding: "8px 6px" }}>Qtd Meta</th>
                          <th style={{ padding: "8px 6px" }}>Coletadas</th>
                          <th style={{ padding: "8px 6px", textAlign: "right" }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cotasFiltradas.map((c) => {
                          const isEditing = editingCotaId === c.id_cota;
                          const isBusy = mutatingCotaId === c.id_cota;
                          return (
                            <tr
                              key={c.id_cota}
                              style={{
                                borderBottom: `1px solid ${colors.borderSubtle}`,
                                backgroundColor: isEditing ? colors.surfaceContainerHigh : "transparent",
                              }}
                            >
                              <td style={{ padding: "8px 6px", color: colors.textMuted }}>{c.nome_dimensao}</td>
                              <td style={{ padding: "8px 6px", fontWeight: 600 }}>{c.categoria}</td>
                              <td style={{ padding: "8px 6px", color: colors.textMuted }}>{c.nome_bairro || "—"}</td>
                              <td style={{ padding: "8px 6px" }}>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    aria-label="Percentual meta"
                                    style={COMPACT_INPUT_STYLE}
                                    value={editPct}
                                    onChange={(e) => setEditPct(e.target.value)}
                                  />
                                ) : (
                                  `${Number(c.percentual_meta).toFixed(1)}%`
                                )}
                              </td>
                              <td style={{ padding: "8px 6px", color: colors.primaryContainer, fontWeight: 600 }}>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    aria-label="Quantidade meta"
                                    style={COMPACT_INPUT_STYLE}
                                    value={editQtd}
                                    onChange={(e) => setEditQtd(e.target.value)}
                                  />
                                ) : (
                                  c.quantidade_meta
                                )}
                              </td>
                              <td style={{ padding: "8px 6px" }}>{c.quantidade_coletada ?? 0}</td>
                              <td style={{ padding: "8px 6px", textAlign: "right" }}>
                                <div style={{ display: "inline-flex", gap: "6px" }}>
                                  {isEditing ? (
                                    <>
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => void handleSaveInlineCota(c.id_cota)}
                                        style={{ ...NOCTURNE_BUTTON_STYLES.primary, padding: "4px 9px", fontSize: "11px" }}
                                      >
                                        Salvar
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => setEditingCotaId(null)}
                                        style={{ ...NOCTURNE_BUTTON_STYLES.ghost, padding: "4px 9px", fontSize: "11px" }}
                                      >
                                        Cancelar
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => handleStartEditCota(c)}
                                        style={{ ...NOCTURNE_BUTTON_STYLES.edit, padding: "4px 8px", fontSize: "11px" }}
                                      >
                                        ✏️ Editar
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => void handleDeleteCota(c.id_cota)}
                                        style={{ ...NOCTURNE_BUTTON_STYLES.danger, padding: "4px 8px", fontSize: "11px" }}
                                      >
                                        Excluir
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Conteúdo Filho: DIMENSÕES / VARIÁVEIS DE CONTROLE */}
              {activeChildTab === "dimensoes" && (
                <div style={{ overflowX: "auto" }}>
                  {dimensoesDaAmostra.length === 0 ? (
                    <div
                      style={{
                        padding: "32px 16px",
                        textAlign: "center",
                        color: colors.textMuted,
                        fontSize: "12.5px",
                        border: `1px dashed ${colors.borderSubtle}`,
                        borderRadius: "12px",
                      }}
                    >
                      Nenhuma dimensão vinculada a esta amostra. Adicione uma cota para criar uma dimensão automaticamente.
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                      <thead>
                        <tr
                          style={{
                            borderBottom: `1px solid ${colors.borderSubtle}`,
                            textAlign: "left",
                            color: colors.textMuted,
                            fontSize: "11px",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          <th style={{ padding: "8px 6px" }}>Ordem</th>
                          <th style={{ padding: "8px 6px" }}>Dimensão / Variável</th>
                          <th style={{ padding: "8px 6px" }}>Fonte</th>
                          <th style={{ padding: "8px 6px" }}>Controle</th>
                          <th style={{ padding: "8px 6px" }}>Estratos</th>
                          <th style={{ padding: "8px 6px" }}>Meta Total</th>
                          <th style={{ padding: "8px 6px", textAlign: "right" }}>Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dimensoesDaAmostra.map((d) => (
                          <tr key={d.id_amostra_dimensao} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                            <td style={{ padding: "9px 6px", color: colors.primaryContainer, fontWeight: 700 }}>
                              #{d.ordem_exibicao}
                            </td>
                            <td style={{ padding: "9px 6px", fontWeight: 600 }}>{d.nome_dimensao}</td>
                            <td style={{ padding: "9px 6px" }}>
                              <span
                                style={{
                                  fontSize: "11px",
                                  padding: "2px 8px",
                                  borderRadius: "9999px",
                                  backgroundColor: colors.surfaceCard,
                                  border: `1px solid ${colors.borderSubtle}`,
                                  color: colors.textMuted,
                                }}
                              >
                                {d.fonte_dados}
                              </span>
                            </td>
                            <td style={{ padding: "9px 6px", fontSize: "12px", color: d.obrigatoria ? colors.successPastel : colors.warningPastel }}>
                              {d.obrigatoria ? "● Obrigatória" : "○ Estratificadora"}
                            </td>
                            <td style={{ padding: "9px 6px" }}>{d.total_cotas}</td>
                            <td style={{ padding: "9px 6px", fontWeight: 600, color: colors.primaryContainer }}>
                              {d.soma_meta}
                            </td>
                            <td style={{ padding: "9px 6px", textAlign: "right" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setFilterDimensao(d.nome_dimensao);
                                  setActiveChildTab("cotas");
                                }}
                                style={{ ...NOCTURNE_BUTTON_STYLES.ghost, padding: "4px 10px", fontSize: "11px" }}
                              >
                                Ver cotas
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <AmostraDialogModal
        isOpen={amostraModalOpen}
        onClose={() => {
          setAmostraModalOpen(false);
          setEditingAmostra(null);
        }}
        onSave={handleSaveAmostra}
        onDelete={handleDeleteAmostra}
        onRefreshOpcoes={loadOpcoes}
        municipios={municipios}
        eleitoradosTse={eleitoradosTse}
        initialAmostra={editingAmostra}
        defaultMunicipioId={filterMunicipioId}
      />

      <EleitoradoTseDialogModal
        isOpen={eleitoradoModalOpen}
        onClose={() => setEleitoradoModalOpen(false)}
        onSave={handleSaveEleitoradoTse}
        onDelete={handleDeleteEleitoradoTse}
        onRefreshOpcoes={loadOpcoes}
        municipios={municipios}
        bairros={bairros}
        usuarios={usuarios}
        eleitoradosTse={eleitoradosTse}
        defaultMunicipioId={filterMunicipioId}
      />

      <AddCotaDialogModal
        isOpen={addCotaModalOpen}
        onClose={() => setAddCotaModalOpen(false)}
        onSave={handleSaveManualCota}
        bairros={filteredBairros}
        sampleSize={Number(selectedAmostra?.tamanho_amostral) || 400}
        amostraLabel={
          selectedAmostra
            ? `Amostra #${selectedAmostra.id_amostra} — ${selectedAmostra.municipio_nome || "Município"}: ${selectedAmostra.descricao} (N=${selectedAmostra.tamanho_amostral})`
            : ""
        }
      />
    </div>
  );
}
