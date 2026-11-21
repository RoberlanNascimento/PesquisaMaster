import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { SearchableCombobox } from "../../components/ui/SearchableCombobox";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors, typography } = NOCTURNE_TOKENS;
const API_BASE = "http://127.0.0.1:8000/api/v1/campo-operacoes";

interface PesquisaResumo {
  id_pesquisa: number;
  nome: string;
  status: string;
  id_municipio?: number | null;
  total_entrevistas?: number | null;
}

interface ProfissionalResumo {
  id_profissional: number;
  nome: string;
  tipo_profissional?: string | null;
}

interface BairroResumo {
  id_bairro: number;
  id_municipio: number;
  nome_bairro: string;
  codigo_bairro_ibge?: string | null;
}

interface AtribuicaoItem {
  id_atribuicao: number;
  id_pesquisa: number;
  id_profissional: number;
  id_bairro?: number | null;
  lote_setor: string;
  meta_entrevistas: number;
  data_inicio?: string | null;
  data_limite?: string | null;
  status_atribuicao: string;
  profissional_nome?: string | null;
  pesquisa_titulo?: string | null;
}

function getStatusBadgeStyle(status: string): React.CSSProperties {
  const normalized = (status || "").toLowerCase();
  if (normalized === "ativa" || normalized === "em_campo" || normalized === "ativo") {
    return {
      backgroundColor: colors.successContainer,
      color: colors.onSuccessContainer,
      border: `1px solid ${colors.successPastel}`,
    };
  }
  if (normalized === "pausada" || normalized === "rascunho" || normalized === "planejamento") {
    return {
      backgroundColor: colors.warningContainer,
      color: colors.onWarningContainer,
      border: `1px solid ${colors.warningPastel}`,
    };
  }
  return {
    backgroundColor: colors.surfaceContainerHigh,
    color: colors.textMuted,
    border: `1px solid ${colors.borderSubtle}`,
  };
}

export function DistribuicaoPesquisasFeature(): React.JSX.Element {
  const [pesquisas, setPesquisas] = useState<PesquisaResumo[]>([]);
  const [profissionais, setProfissionais] = useState<ProfissionalResumo[]>([]);
  const [atribuicoes, setAtribuicoes] = useState<AtribuicaoItem[]>([]);
  const [bairros, setBairros] = useState<BairroResumo[]>([]);

  const [selectedPesquisaId, setSelectedPesquisaId] = useState<number | null>(null);
  const [pesquisaSearch, setPesquisaSearch] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [profSearch, setProfSearch] = useState("");
  const [selectedProfIds, setSelectedProfIds] = useState<number[]>([]);
  const [selectedBairroId, setSelectedBairroId] = useState<string>("");
  const [loteSetor, setLoteSetor] = useState("Setor Geral");
  const [metaEntrevistas, setMetaEntrevistas] = useState("150");

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showFeedback = (type: "success" | "error", text: string): void => {
    setFeedback({ type, text });
    window.setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  };

  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [opRes, atrRes] = await Promise.all([
        fetch(`${API_BASE}/resumo-opcoes`, { cache: "no-store" }),
        fetch(`${API_BASE}/atribuicoes`, { cache: "no-store" }),
      ]);
      if (!opRes.ok || !atrRes.ok) {
        throw new Error("Falha ao carregar dados de distribuição de pesquisas.");
      }
      const op = await opRes.json();
      const atr = await atrRes.json();

      const pesqList: PesquisaResumo[] = Array.isArray(op?.pesquisas) ? op.pesquisas : [];
      const profList: ProfissionalResumo[] = Array.isArray(op?.profissionais) ? op.profissionais : [];
      const bairrosList: BairroResumo[] = Array.isArray(op?.bairros) ? op.bairros : [];
      const atrList: AtribuicaoItem[] = Array.isArray(atr) ? atr : [];

      setPesquisas(pesqList);
      setProfissionais(profList);
      setBairros(bairrosList);
      setAtribuicoes(atrList);

      setSelectedPesquisaId((prev) => {
        if (prev !== null && pesqList.some((p) => p.id_pesquisa === prev)) {
          return prev;
        }
        return pesqList[0]?.id_pesquisa ?? null;
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro de comunicação com o servidor.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedPesquisa = useMemo(
    () => pesquisas.find((p) => p.id_pesquisa === selectedPesquisaId) ?? null,
    [pesquisas, selectedPesquisaId]
  );

  const filteredPesquisas = useMemo(() => {
    const q = pesquisaSearch.trim().toLowerCase();
    if (!q) return pesquisas;
    return pesquisas.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        (p.status || "").toLowerCase().includes(q)
    );
  }, [pesquisas, pesquisaSearch]);

  const assignedForSelected = useMemo(() => {
    if (selectedPesquisaId === null) return [];
    return atribuicoes.filter((a) => a.id_pesquisa === selectedPesquisaId);
  }, [atribuicoes, selectedPesquisaId]);

  const assignedProfIds = useMemo(
    () => new Set(assignedForSelected.map((a) => a.id_profissional)),
    [assignedForSelected]
  );

  const filteredBairros = useMemo(() => {
    if (!selectedPesquisa?.id_municipio) return bairros;
    const byCity = bairros.filter((b) => b.id_municipio === selectedPesquisa.id_municipio);
    return byCity.length > 0 ? byCity : bairros;
  }, [bairros, selectedPesquisa]);

  const availableProfissionais = useMemo(() => {
    const q = profSearch.trim().toLowerCase();
    return profissionais.filter((p) => {
      if (assignedProfIds.has(p.id_profissional)) return false;
      if (!q) return true;
      return (
        p.nome.toLowerCase().includes(q) ||
        (p.tipo_profissional || "").toLowerCase().includes(q)
      );
    });
  }, [profissionais, assignedProfIds, profSearch]);

  const totalMetaDistribuida = useMemo(
    () => assignedForSelected.reduce((acc, a) => acc + (Number(a.meta_entrevistas) || 0), 0),
    [assignedForSelected]
  );

  const openAssignModal = (): void => {
    setSelectedProfIds([]);
    setProfSearch("");
    const firstBairro = filteredBairros[0];
    if (firstBairro) {
      setSelectedBairroId(String(firstBairro.id_bairro));
      setLoteSetor(firstBairro.nome_bairro);
    } else {
      setSelectedBairroId("");
      setLoteSetor("Setor Geral");
    }
    setMetaEntrevistas("150");
    setIsModalOpen(true);
  };

  const toggleProf = (id: number): void => {
    setSelectedProfIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAssignGroup = async (): Promise<void> => {
    if (!selectedPesquisaId || selectedProfIds.length === 0) return;
    setSaving(true);
    try {
      const results = await Promise.all(
        selectedProfIds.map((idProf) =>
          fetch(`${API_BASE}/atribuicoes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_pesquisa: selectedPesquisaId,
              id_profissional: idProf,
              id_bairro: selectedBairroId ? Number(selectedBairroId) : null,
              lote_setor: loteSetor.trim() || "Setor Geral",
              meta_entrevistas: Math.max(1, Number(metaEntrevistas) || 150),
            }),
          })
        )
      );
      if (results.some((r) => !r.ok)) {
        throw new Error("Algumas atribuições não puderam ser salvas.");
      }
      const count = selectedProfIds.length;
      setIsModalOpen(false);
      setSelectedProfIds([]);
      await loadData();
      showFeedback(
        "success",
        count === 1
          ? "Pesquisador vinculado com sucesso."
          : `${count} pesquisadores vinculados com sucesso.`
      );
    } catch (err) {
      showFeedback(
        "error",
        err instanceof Error ? err.message : "Erro ao vincular pesquisadores."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async (idAtribuicao: number): Promise<void> => {
    setRemovingId(idAtribuicao);
    try {
      const res = await fetch(`${API_BASE}/atribuicoes/${idAtribuicao}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Não foi possível desvincular o pesquisador.");
      }
      await loadData();
      showFeedback("success", "Atribuição removida com sucesso.");
    } catch (err) {
      showFeedback(
        "error",
        err instanceof Error ? err.message : "Erro ao remover atribuição."
      );
    } finally {
      setRemovingId(null);
    }
  };

  const targetEntrevistas = Number(selectedPesquisa?.total_entrevistas ?? 0);
  const progressPct =
    targetEntrevistas > 0
      ? Math.min(100, Math.round((totalMetaDistribuida / targetEntrevistas) * 100))
      : 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        color: colors.textPrimary,
        fontFamily: typography.fontFamily,
      }}
    >
      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          role="status"
          style={{
            padding: "10px 14px",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor:
              feedback.type === "success" ? colors.successContainer : colors.errorContainer,
            color:
              feedback.type === "success" ? colors.onSuccessContainer : colors.onErrorContainer,
            border: `1px solid ${
              feedback.type === "success" ? colors.successPastel : colors.errorPastel
            }`,
          }}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "14px",
              padding: "0 4px",
            }}
            aria-label="Fechar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error State */}
      {errorMsg && (
        <div
          role="alert"
          style={{
            padding: "14px 16px",
            borderRadius: "12px",
            backgroundColor: colors.errorContainer,
            color: colors.onErrorContainer,
            border: `1px solid ${colors.errorPastel}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            fontSize: "13px",
          }}
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => void loadData()}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              border: `1px solid ${colors.errorPastel}`,
              backgroundColor: "transparent",
              color: colors.onErrorContainer,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Master-Detail Layout (Pai e Filho) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 340px) minmax(0, 1fr)",
          gap: "16px",
          alignItems: "start",
        }}
      >
        {/* MASTER (Pai): Lista de Pesquisas */}
        <aside
          style={{
            backgroundColor: colors.surfaceContainerLow,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: "16px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: colors.textPrimary }}>
              Pesquisas
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "9999px",
                backgroundColor: colors.surfaceContainerHigh,
                color: colors.textMuted,
              }}
            >
              {pesquisas.length}
            </span>
          </div>

          <input
            type="search"
            value={pesquisaSearch}
            onChange={(e) => setPesquisaSearch(e.target.value)}
            placeholder="Filtrar pesquisa..."
            aria-label="Filtrar pesquisa"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 12px",
              borderRadius: "10px",
              border: `1px solid ${colors.borderSubtle}`,
              backgroundColor: colors.surfaceCard,
              color: colors.textPrimary,
              fontSize: "13px",
              outline: "none",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              maxHeight: "520px",
              overflowY: "auto",
              paddingRight: "2px",
            }}
          >
            {isLoading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  style={{
                    height: "68px",
                    borderRadius: "12px",
                    backgroundColor: colors.surfaceCard,
                    border: `1px solid ${colors.borderSubtle}`,
                    opacity: 0.55,
                  }}
                />
              ))
            ) : filteredPesquisas.length === 0 ? (
              <div
                style={{
                  padding: "24px 12px",
                  textAlign: "center",
                  fontSize: "12px",
                  color: colors.textMuted,
                }}
              >
                Nenhuma pesquisa encontrada.
              </div>
            ) : (
              filteredPesquisas.map((p) => {
                const active = p.id_pesquisa === selectedPesquisaId;
                const countAtr = atribuicoes.filter((a) => a.id_pesquisa === p.id_pesquisa).length;
                const totalAtr = atribuicoes
                  .filter((a) => a.id_pesquisa === p.id_pesquisa)
                  .reduce((acc, a) => acc + (Number(a.meta_entrevistas) || 0), 0);
                const meta = Number(p.total_entrevistas ?? 0);

                return (
                  <button
                    key={p.id_pesquisa}
                    type="button"
                    onClick={() => setSelectedPesquisaId(p.id_pesquisa)}
                    style={{
                      textAlign: "left",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: active
                        ? `1px solid ${colors.borderFocus}`
                        : `1px solid ${colors.borderSubtle}`,
                      backgroundColor: active ? colors.surfaceElevated : colors.surfaceCard,
                      color: colors.textPrimary,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      transition: "border-color 0.15s ease, background-color 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "13px",
                          lineHeight: "18px",
                          color: colors.textPrimary,
                        }}
                      >
                        {p.nome}
                      </span>
                      <span
                        style={{
                          ...getStatusBadgeStyle(p.status),
                          fontSize: "10px",
                          fontWeight: 600,
                          padding: "2px 7px",
                          borderRadius: "9999px",
                          whiteSpace: "nowrap",
                          textTransform: "uppercase",
                        }}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "11px",
                        color: colors.textMuted,
                      }}
                    >
                      <span>{countAtr} {countAtr === 1 ? "pesquisador" : "pesquisadores"}</span>
                      <span>
                        {totalAtr}/{meta} entrevistas
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* DETAIL (Filho): Atribuições da Pesquisa Selecionada */}
        <section
          style={{
            backgroundColor: colors.surfaceContainerLow,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: "16px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            minHeight: "420px",
          }}
        >
          {selectedPesquisa ? (
            <>
              {/* Header do Detalhe */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "16px",
                  flexWrap: "wrap",
                  paddingBottom: "14px",
                  borderBottom: `1px solid ${colors.borderSubtle}`,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "18px",
                        fontWeight: 600,
                        color: colors.textPrimary,
                      }}
                    >
                      {selectedPesquisa.nome}
                    </h3>
                    <span
                      style={{
                        ...getStatusBadgeStyle(selectedPesquisa.status),
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 10px",
                        borderRadius: "9999px",
                        textTransform: "uppercase",
                      }}
                    >
                      {selectedPesquisa.status}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", color: colors.textMuted }}>
                    Atribuições de pesquisadores vinculadas a esta pesquisa
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openAssignModal}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: colors.primaryContainer,
                    color: colors.onPrimary,
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  + Atribuir Pesquisadores
                </button>
              </div>

              {/* Resumo Compacto */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    backgroundColor: colors.surfaceCard,
                    border: `1px solid ${colors.borderSubtle}`,
                    borderRadius: "12px",
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ fontSize: "11px", color: colors.textMuted, textTransform: "uppercase" }}>
                    Pesquisadores
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 600, marginTop: "4px" }}>
                    {assignedForSelected.length}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: colors.surfaceCard,
                    border: `1px solid ${colors.borderSubtle}`,
                    borderRadius: "12px",
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ fontSize: "11px", color: colors.textMuted, textTransform: "uppercase" }}>
                    Meta Distribuída
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: 600, marginTop: "4px" }}>
                    {totalMetaDistribuida}
                    <span style={{ fontSize: "12px", fontWeight: 400, color: colors.textMuted }}>
                      {" "}
                      / {targetEntrevistas}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: colors.surfaceCard,
                    border: `1px solid ${colors.borderSubtle}`,
                    borderRadius: "12px",
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "11px",
                      color: colors.textMuted,
                      textTransform: "uppercase",
                    }}
                  >
                    <span>Cobertura</span>
                    <span style={{ color: colors.textPrimary, fontWeight: 600 }}>{progressPct}%</span>
                  </div>
                  <div
                    style={{
                      height: "6px",
                      borderRadius: "9999px",
                      backgroundColor: colors.surfaceContainerHigh,
                      overflow: "hidden",
                      marginTop: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: `${progressPct}%`,
                        height: "100%",
                        backgroundColor: colors.successPastel,
                        borderRadius: "9999px",
                        transition: "width 0.25s ease",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Tabela Filho: atribuicao_pesquisadores */}
              {isLoading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div
                      key={idx}
                      style={{
                        height: "44px",
                        borderRadius: "10px",
                        backgroundColor: colors.surfaceCard,
                        border: `1px solid ${colors.borderSubtle}`,
                        opacity: 0.55,
                      }}
                    />
                  ))}
                </div>
              ) : assignedForSelected.length === 0 ? (
                <div
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    backgroundColor: colors.surfaceCard,
                    border: `1px dashed ${colors.borderSubtle}`,
                    borderRadius: "14px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: 500, color: colors.textPrimary }}>
                    Nenhum pesquisador atribuído a esta pesquisa
                  </div>
                  <div style={{ fontSize: "12px", color: colors.textMuted, maxWidth: "360px" }}>
                    Clique no botão abaixo para selecionar profissionais disponíveis e definir o setor e a meta de entrevistas.
                  </div>
                  <button
                    type="button"
                    onClick={openAssignModal}
                    style={{
                      marginTop: "4px",
                      padding: "8px 16px",
                      borderRadius: "12px",
                      border: "none",
                      backgroundColor: colors.primaryContainer,
                      color: colors.onPrimary,
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    + Atribuir Primeiro Pesquisador
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    overflowX: "auto",
                    borderRadius: "12px",
                    border: `1px solid ${colors.borderSubtle}`,
                    backgroundColor: colors.surfaceCard,
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "13px",
                      color: colors.textPrimary,
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: colors.surfaceContainerLow,
                          borderBottom: `1px solid ${colors.borderSubtle}`,
                          textAlign: "left",
                          fontSize: "11px",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          color: colors.textMuted,
                        }}
                      >
                        <th style={{ padding: "10px 14px" }}>Pesquisador</th>
                        <th style={{ padding: "10px 14px" }}>Lote / Setor</th>
                        <th style={{ padding: "10px 14px" }}>Meta</th>
                        <th style={{ padding: "10px 14px" }}>Status</th>
                        <th style={{ padding: "10px 14px", textAlign: "right" }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedForSelected.map((a) => (
                        <tr
                          key={a.id_atribuicao}
                          style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}
                        >
                          <td style={{ padding: "12px 14px", fontWeight: 500 }}>
                            {a.profissional_nome || `Profissional #${a.id_profissional}`}
                          </td>
                          <td style={{ padding: "12px 14px", color: colors.onSurfaceVariant }}>
                            {a.lote_setor}
                          </td>
                          <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                            {a.meta_entrevistas}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                ...getStatusBadgeStyle(a.status_atribuicao),
                                fontSize: "11px",
                                fontWeight: 600,
                                padding: "2px 9px",
                                borderRadius: "9999px",
                                textTransform: "capitalize",
                              }}
                            >
                              {a.status_atribuicao}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "right" }}>
                            <button
                              type="button"
                              disabled={removingId === a.id_atribuicao}
                              onClick={() => void handleUnlink(a.id_atribuicao)}
                              style={{
                                padding: "5px 11px",
                                borderRadius: "8px",
                                border: "none",
                                backgroundColor: colors.errorContainer,
                                color: colors.onErrorContainer,
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor:
                                  removingId === a.id_atribuicao ? "not-allowed" : "pointer",
                                opacity: removingId === a.id_atribuicao ? 0.5 : 1,
                              }}
                            >
                              {removingId === a.id_atribuicao ? "Removendo..." : "Desvincular"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.textMuted,
                fontSize: "13px",
              }}
            >
              {isLoading
                ? "Carregando pesquisas..."
                : "Selecione uma pesquisa à esquerda para visualizar suas atribuições."}
            </div>
          )}
        </section>
      </div>

      {/* Modal de Atribuição de Pesquisadores */}
      <SlideOverDrawer
        isOpen={isModalOpen}
        onClose={() => !saving && setIsModalOpen(false)}
        title="Atribuir Pesquisadores"
        subtitle={selectedPesquisa ? `Pesquisa: ${selectedPesquisa.nome}` : undefined}
        width="560px"
        footerActions={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", width: "100%" }}>
            <button
              type="button"
              disabled={saving}
              onClick={() => setIsModalOpen(false)}
              style={{
                padding: "9px 16px",
                borderRadius: "12px",
                border: `1px solid ${colors.borderSubtle}`,
                backgroundColor: colors.surfaceCard,
                color: colors.textPrimary,
                fontSize: "13px",
                fontWeight: 500,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving || selectedProfIds.length === 0 || !selectedPesquisaId}
              onClick={() => void handleAssignGroup()}
              style={{
                padding: "9px 18px",
                borderRadius: "12px",
                border: "none",
                backgroundColor: colors.primaryContainer,
                color: colors.onPrimary,
                fontSize: "13px",
                fontWeight: 600,
                cursor:
                  saving || selectedProfIds.length === 0 ? "not-allowed" : "pointer",
                opacity: saving || selectedProfIds.length === 0 ? 0.5 : 1,
              }}
            >
              {saving
                ? "Salvando..."
                : `Confirmar Atribuição (${selectedProfIds.length})`}
            </button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "12px" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: colors.textMuted }}>
              Bairro / Lote
              <SearchableCombobox
                value={selectedBairroId}
                emptyOptionLabel="Setor Geral"
                placeholder="Digite o bairro..."
                options={filteredBairros.map((b) => ({
                  value: String(b.id_bairro),
                  label: b.nome_bairro,
                  sublabel: b.codigo_bairro_ibge ?? undefined,
                }))}
                onChange={(id) => {
                  setSelectedBairroId(id);
                  const found = bairros.find((b) => String(b.id_bairro) === id);
                  if (found) setLoteSetor(found.nome_bairro);
                }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: colors.textMuted }}>
              Meta
              <input
                type="number"
                min={1}
                value={metaEntrevistas}
                onChange={(e) => setMetaEntrevistas(e.target.value)}
                style={{
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: `1px solid ${colors.borderSubtle}`,
                  backgroundColor: colors.surfaceCard,
                  color: colors.textPrimary,
                  fontSize: "13px",
                }}
              />
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: colors.textMuted }}>
            Nome do Lote / Setor
            <input
              type="text"
              value={loteSetor}
              onChange={(e) => setLoteSetor(e.target.value)}
              placeholder="Ex.: Centro - Setor 01"
              style={{
                padding: "9px 12px",
                borderRadius: "10px",
                border: `1px solid ${colors.borderSubtle}`,
                backgroundColor: colors.surfaceCard,
                color: colors.textPrimary,
                fontSize: "13px",
              }}
            />
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: colors.textPrimary }}>
                Profissionais Disponíveis ({availableProfissionais.length})
              </span>
              {availableProfissionais.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedProfIds(
                      selectedProfIds.length === availableProfissionais.length
                        ? []
                        : availableProfissionais.map((p) => p.id_profissional)
                    )
                  }
                  style={{
                    background: "transparent",
                    border: "none",
                    color: colors.primaryContainer,
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {selectedProfIds.length === availableProfissionais.length
                    ? "Desmarcar todos"
                    : "Selecionar todos"}
                </button>
              )}
            </div>

            <input
              type="search"
              value={profSearch}
              onChange={(e) => setProfSearch(e.target.value)}
              placeholder="Buscar profissional por nome..."
              style={{
                padding: "8px 12px",
                borderRadius: "10px",
                border: `1px solid ${colors.borderSubtle}`,
                backgroundColor: colors.surfaceCard,
                color: colors.textPrimary,
                fontSize: "13px",
              }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                maxHeight: "240px",
                overflowY: "auto",
                paddingRight: "2px",
              }}
            >
              {availableProfissionais.map((prof) => {
                const checked = selectedProfIds.includes(prof.id_profissional);
                return (
                  <label
                    key={prof.id_profissional}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: checked
                        ? `1px solid ${colors.borderFocus}`
                        : `1px solid ${colors.borderSubtle}`,
                      backgroundColor: checked ? colors.surfaceElevated : colors.surfaceCard,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProf(prof.id_profissional)}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: colors.textPrimary,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {prof.nome}
                      </div>
                      {prof.tipo_profissional && (
                        <div style={{ fontSize: "11px", color: colors.textMuted }}>
                          {prof.tipo_profissional}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}

              {availableProfissionais.length === 0 && (
                <div
                  style={{
                    padding: "20px 12px",
                    textAlign: "center",
                    fontSize: "12px",
                    color: colors.textMuted,
                  }}
                >
                  Nenhum profissional disponível para atribuir.
                </div>
              )}
            </div>
          </div>
        </div>
      </SlideOverDrawer>
    </div>
  );
}
