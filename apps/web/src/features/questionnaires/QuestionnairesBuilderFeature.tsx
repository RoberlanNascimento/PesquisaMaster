import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { SearchableCombobox } from "../../components/ui/SearchableCombobox";
import { useUiSessionStore } from "../../lib/store";

const { colors, typography } = NOCTURNE_TOKENS;
const API = "http://127.0.0.1:8000/api/v1/questionarios-db";

type ActiveLayerTab =
  | "questionarios"
  | "cenarios"
  | "perguntas"
  | "grupos_opcoes"
  | "itens_bateria";

interface ResumoData {
  readonly pesquisas: readonly any[];
  readonly grupos_opcoes: readonly any[];
  readonly opcoes_resposta: readonly any[];
  readonly perguntas: readonly any[];
  readonly itens_bateria: readonly any[];
  readonly questionarios: readonly any[];
  readonly questionario_perguntas: readonly any[];
  readonly cenarios_pesquisa: readonly any[];
  readonly candidatos: readonly any[];
  readonly cenario_candidatos: readonly any[];
}

const EMPTY_RESUMO: ResumoData = {
  pesquisas: [],
  grupos_opcoes: [],
  opcoes_resposta: [],
  perguntas: [],
  itens_bateria: [],
  questionarios: [],
  questionario_perguntas: [],
  cenarios_pesquisa: [],
  candidatos: [],
  cenario_candidatos: [],
};

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

function resolveCandidatePhotoUrl(candidateId: number, fotoUrl?: string | null): string | null {
  if (!fotoUrl || !fotoUrl.trim()) return null;
  const trimmed = fotoUrl.trim();
  if (trimmed.startsWith(`${API}/candidatos/`) || trimmed.startsWith("/api/v1/questionarios-db/candidatos/")) {
    return trimmed;
  }
  return `${API}/candidatos/${candidateId}/foto`;
}

function CandidateAvatar({ candidateId, name, url, size = 28 }: { candidateId: number; name: string; url?: string | null; size?: number }): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  const resolvedUrl = resolveCandidatePhotoUrl(candidateId, url);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = ((parts[0]?.charAt(0) ?? "?") + (parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "")).toUpperCase();
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        border: `1px solid ${colors.borderSubtle}`,
        backgroundColor: colors.surfaceContainerHigh,
        color: colors.textMuted,
        fontSize: Math.round(size * 0.38),
        fontWeight: 700,
      }}
    >
      {resolvedUrl && !failed ? (
        <img src={resolvedUrl} alt={name} onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        initials
      )}
    </span>
  );
}

export function QuestionnairesBuilderFeature(): React.JSX.Element {
  const currentUser = useUiSessionStore((s) => s.currentUser);
  const [data, setData] = useState<ResumoData>(EMPTY_RESUMO);
  const [activeTab, setActiveTab] = useState<ActiveLayerTab>("questionarios");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Seleções Pai/Filho
  const [selectedQuestionarioId, setSelectedQuestionarioId] = useState<number | null>(null);
  const [selectedCenarioId, setSelectedCenarioId] = useState<number | null>(null);
  const [selectedGrupoId, setSelectedGrupoId] = useState<number | null>(null);
  const [filterPesquisaId, setFilterPesquisaId] = useState<string>("");

  // Modais
  const [modalKind, setModalKind] = useState<
    | null
    | "questionario"
    | "vincular_pergunta"
    | "cenario"
    | "cenario_candidato"
    | "pergunta"
    | "grupo"
    | "opcao"
    | "item_bateria"
  >(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form states
  const [qPesquisaId, setQPesquisaId] = useState("");
  const [qTitulo, setQTitulo] = useState("");
  const [qVersao, setQVersao] = useState("v1.0");

  const [vpPerguntaId, setVpPerguntaId] = useState("");
  const [vpCenarioId, setVpCenarioId] = useState("");
  const [vpOrdem, setVpOrdem] = useState("1");
  const [vpObrigatoria, setVpObrigatoria] = useState(true);
  const [updatingQpId, setUpdatingQpId] = useState<number | null>(null);
  const [expandedQpId, setExpandedQpId] = useState<number | null>(null);
  const [newBateriaLabel, setNewBateriaLabel] = useState("");
  const [detailBusy, setDetailBusy] = useState(false);

  const [cPesquisaId, setCPesquisaId] = useState("");
  const [cIdentificador, setCIdentificador] = useState("");
  const [cTipo, setCTipo] = useState("estimulado");

  const [ccCandidatoId, setCcCandidatoId] = useState("");
  const [ccOrdem, setCcOrdem] = useState("1");

  const [pEnunciado, setPEnunciado] = useState("");
  const [pTipo, setPTipo] = useState("estimulada");
  const [pGrupoId, setPGrupoId] = useState("");

  const [gNome, setGNome] = useState("");
  const [gEscala, setGEscala] = useState("nominal");

  const [oRotulo, setORotulo] = useState("");
  const [oValor, setOValor] = useState("");
  const [oOrdem, setOOrdem] = useState("1");

  const [ibPerguntaId, setIbPerguntaId] = useState("");
  const [ibRotulo, setIbRotulo] = useState("");
  const [ibOrdem, setIbOrdem] = useState("1");

  const notify = (msg: string): void => {
    setFeedback(msg);
    window.setTimeout(() => setFeedback((prev) => (prev === msg ? null : prev)), 3500);
  };

  const loadAll = useCallback(async (): Promise<void> => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API}/resumo`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Erro ao carregar questionários (HTTP ${res.status}).`);
      const json = (await res.json()) as Partial<ResumoData>;
      const normalized: ResumoData = {
        ...EMPTY_RESUMO,
        ...json,
        candidatos: json.candidatos ?? [],
        cenario_candidatos: json.cenario_candidatos ?? [],
      };
      setData(normalized);
      setSelectedQuestionarioId((prev) => {
        if (prev !== null && normalized.questionarios.some((q) => q.id_questionario === prev)) return prev;
        return normalized.questionarios[0]?.id_questionario ?? null;
      });
      setSelectedCenarioId((prev) => {
        if (prev !== null && normalized.cenarios_pesquisa.some((c) => c.id_cenario === prev)) return prev;
        return normalized.cenarios_pesquisa[0]?.id_cenario ?? null;
      });
      setSelectedGrupoId((prev) => {
        if (prev !== null && normalized.grupos_opcoes.some((g) => g.id_grupo_opcao === prev)) return prev;
        return normalized.grupos_opcoes[0]?.id_grupo_opcao ?? null;
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao conectar com o banco de dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const selectedQuestionario = useMemo(
    () => data.questionarios.find((q) => q.id_questionario === selectedQuestionarioId) ?? null,
    [data.questionarios, selectedQuestionarioId]
  );

  const perguntasDoQuestionario = useMemo(
    () => data.questionario_perguntas.filter((qp) => qp.id_questionario === selectedQuestionarioId),
    [data.questionario_perguntas, selectedQuestionarioId]
  );

  const cenariosDoQuestionario = useMemo(() => {
    if (!selectedQuestionario) return [];
    return data.cenarios_pesquisa.filter(
      (c) => Number(c.id_pesquisa) === Number(selectedQuestionario.id_pesquisa)
    );
  }, [data.cenarios_pesquisa, selectedQuestionario]);

  const vpCenarioIdNum = vpCenarioId ? Number(vpCenarioId) : null;

  const linkedPerguntaIds = useMemo(() => {
    return new Set(
      perguntasDoQuestionario
        .filter((qp) => {
          const qpCenario =
            qp.id_cenario !== null && qp.id_cenario !== undefined ? Number(qp.id_cenario) : null;
          return qpCenario === vpCenarioIdNum;
        })
        .map((qp) => Number(qp.id_pergunta))
    );
  }, [perguntasDoQuestionario, vpCenarioIdNum]);

  const perguntasDisponiveisParaVincular = useMemo(
    () => data.perguntas.filter((p) => !linkedPerguntaIds.has(Number(p.id_pergunta))),
    [data.perguntas, linkedPerguntaIds]
  );

  const groupedPerguntasPorCenario = useMemo(() => {
    const sorted = [...perguntasDoQuestionario].sort(
      (a, b) => (Number(a.ordem) || 999) - (Number(b.ordem) || 999)
    );
    const knownCenarioIds = new Set(cenariosDoQuestionario.map((c) => Number(c.id_cenario)));
    const groups: {
      readonly key: string;
      readonly idCenario: number | null;
      readonly label: string;
      readonly tipoCenario: string | null;
      readonly items: readonly any[];
    }[] = cenariosDoQuestionario.map((c) => {
      const cId = Number(c.id_cenario);
      return {
        key: `cenario-${cId}`,
        idCenario: cId,
        label: String(c.identificador || `Cenário #${cId}`),
        tipoCenario: c.tipo_cenario ? String(c.tipo_cenario) : null,
        items: sorted.filter(
          (qp) =>
            qp.id_cenario !== null &&
            qp.id_cenario !== undefined &&
            Number(qp.id_cenario) === cId
        ),
      };
    });

    const unlinked = sorted.filter(
      (qp) =>
        qp.id_cenario === null ||
        qp.id_cenario === undefined ||
        !knownCenarioIds.has(Number(qp.id_cenario))
    );
    if (unlinked.length > 0 || groups.length === 0) {
      groups.push({
        key: "geral",
        idCenario: null,
        label: "Geral / Sem Cenário",
        tipoCenario: null,
        items: unlinked,
      });
    }
    return groups;
  }, [perguntasDoQuestionario, cenariosDoQuestionario]);

  const selectedGrupo = useMemo(
    () => data.grupos_opcoes.find((g) => g.id_grupo_opcao === selectedGrupoId) ?? null,
    [data.grupos_opcoes, selectedGrupoId]
  );

  const opcoesDoGrupo = useMemo(
    () => data.opcoes_resposta.filter((o) => o.id_grupo_opcao === selectedGrupoId),
    [data.opcoes_resposta, selectedGrupoId]
  );

  const cenariosFiltrados = useMemo(() => {
    if (!filterPesquisaId) return data.cenarios_pesquisa;
    return data.cenarios_pesquisa.filter((c) => String(c.id_pesquisa) === filterPesquisaId);
  }, [data.cenarios_pesquisa, filterPesquisaId]);

  const selectedCenario = useMemo(
    () =>
      data.cenarios_pesquisa.find((c) => c.id_cenario === selectedCenarioId) ??
      cenariosFiltrados[0] ??
      null,
    [data.cenarios_pesquisa, cenariosFiltrados, selectedCenarioId]
  );

  const candidatosDoCenario = useMemo(
    () =>
      selectedCenario
        ? data.cenario_candidatos.filter((cc) => cc.id_cenario === selectedCenario.id_cenario)
        : [],
    [data.cenario_candidatos, selectedCenario]
  );

  const linkedCandidatoIds = useMemo(
    () => new Set(candidatosDoCenario.map((cc) => Number(cc.id_candidato_produto))),
    [candidatosDoCenario]
  );

  const candidatosDisponiveisParaCenario = useMemo(
    () => data.candidatos.filter((c) => !linkedCandidatoIds.has(Number(c.id_candidato_produto))),
    [data.candidatos, linkedCandidatoIds]
  );

  const pesquisaIdsComQuestionario = useMemo(
    () => new Set(data.questionarios.map((q) => Number(q.id_pesquisa))),
    [data.questionarios]
  );

  const pesquisasDisponiveisQuestionario = useMemo(() => {
    const blockedStatuses = new Set([
      "finalizada",
      "concluida",
      "consolidada",
      "encerrada",
      "fechada",
      "em_andamento",
      "em_campo",
      "coleta",
      "ativa",
    ]);
    return data.pesquisas.filter((p) => {
      if (p.is_bloqueada) return false;
      if (pesquisaIdsComQuestionario.has(Number(p.id_pesquisa))) return false;
      const st = String(p.status ?? "").trim().toLowerCase();
      return !blockedStatuses.has(st);
    });
  }, [data.pesquisas, pesquisaIdsComQuestionario]);

  const sendAndReload = async (
    method: "POST" | "PUT" | "DELETE",
    path: string,
    body: Record<string, unknown> | null,
    okMsg: string
  ): Promise<void> => {
    setDetailBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = typeof err?.detail === "string" ? err.detail : null;
        throw new Error(detail || `Erro na operação (HTTP ${res.status}).`);
      }
      await loadAll();
      notify(okMsg);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setDetailBusy(false);
    }
  };

  const patchAndReload = async (
    qpId: number,
    body: Record<string, unknown>,
    okMsg: string
  ): Promise<void> => {
    setUpdatingQpId(qpId);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API}/questionario-perguntas/${qpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail =
          typeof err?.detail === "string"
            ? err.detail
            : Array.isArray(err?.detail)
              ? err.detail.map((d: { msg?: string }) => d?.msg).filter(Boolean).join("; ")
              : null;
        throw new Error(detail || `Erro ao atualizar vínculo (HTTP ${res.status}).`);
      }
      await loadAll();
      notify(okMsg);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao atualizar vínculo da pergunta.");
    } finally {
      setUpdatingQpId(null);
    }
  };

  const postAndReload = async (path: string, body: Record<string, unknown>, okMsg: string): Promise<void> => {
    setSaving(true);
    setErrorMsg(null);
    setModalError(null);
    try {
      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail =
          typeof err?.detail === "string"
            ? err.detail
            : Array.isArray(err?.detail)
              ? err.detail.map((d: { msg?: string }) => d?.msg).filter(Boolean).join("; ")
              : null;
        throw new Error(detail || `Erro ao salvar (HTTP ${res.status}).`);
      }
      setModalKind(null);
      setModalError(null);
      await loadAll();
      notify(okMsg);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar registro.";
      setModalError(message);
      setErrorMsg(message);
    } finally {
      setSaving(false);
    }
  };

  const deleteAndReload = async (path: string, okMsg: string): Promise<void> => {
    setErrorMsg(null);
    try {
      const res = await fetch(`${API}${path}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.detail || `Erro ao excluir (HTTP ${res.status}).`);
      }
      await loadAll();
      notify(okMsg);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao excluir registro.");
    }
  };

  const tabButton = (id: ActiveLayerTab, label: string, count: number): React.JSX.Element => {
    const active = activeTab === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => setActiveTab(id)}
        style={{
          padding: "8px 14px",
          borderRadius: "9999px",
          border: `1px solid ${active ? colors.primaryContainer : colors.borderSubtle}`,
          backgroundColor: active ? colors.primaryContainer : colors.surfaceCard,
          color: active ? colors.onPrimary : colors.textPrimary,
          fontSize: "12.5px",
          fontWeight: active ? 700 : 500,
          cursor: "pointer",
        }}
      >
        {label} ({count})
      </button>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: colors.textPrimary, fontFamily: typography.fontFamily }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>
            Arquitetura de Questionários & Repositório Reutilizável
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: colors.textMuted }}>
            Instâncias versionadas por pesquisa (<code>questionarios</code>, <code>questionario_perguntas</code>, <code>cenarios_pesquisa</code>) separadas do repositório reutilizável (<code>perguntas</code>, <code>grupos_opcoes</code>, <code>opcoes_resposta</code>, <code>itens_bateria</code>).
          </p>
        </div>
      </div>

      {/* Navegação por Camada */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: colors.textMuted, textTransform: "uppercase", fontWeight: 700, marginRight: "4px" }}>
          Instância da Pesquisa:
        </span>
        {tabButton("questionarios", "Questionários & Versões", data.questionarios.length)}
        {tabButton("cenarios", "Cenários da Pesquisa", data.cenarios_pesquisa.length)}

        <span style={{ fontSize: "11px", color: colors.textMuted, textTransform: "uppercase", fontWeight: 700, marginLeft: "12px", marginRight: "4px" }}>
          Repositório Reutilizável:
        </span>
        {tabButton("perguntas", "Perguntas", data.perguntas.length)}
        {tabButton("grupos_opcoes", "Grupos & Opções", data.grupos_opcoes.length)}
        {tabButton("itens_bateria", "Itens de Bateria", data.itens_bateria.length)}
      </div>

      {feedback && (
        <div role="status" style={{ padding: "10px 14px", borderRadius: "12px", backgroundColor: colors.successContainer, color: colors.onSuccessContainer, border: `1px solid ${colors.successPastel}`, fontSize: "13px" }}>
          {feedback}
        </div>
      )}
      {errorMsg && (
        <div role="alert" style={{ padding: "10px 14px", borderRadius: "12px", backgroundColor: colors.errorContainer, color: colors.onErrorContainer, border: `1px solid ${colors.errorPastel}`, fontSize: "13px" }}>
          {errorMsg}
        </div>
      )}

      {/* ABA 1: QUESTIONÁRIOS & VERSÕES (PAI -> CENÁRIOS -> QUESTIONARIO_PERGUNTAS FILHO) */}
      {activeTab === "questionarios" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 340px) minmax(0, 1fr)", gap: "16px", alignItems: "start" }}>
          <aside style={{ backgroundColor: colors.surfaceContainerLow, border: `1px solid ${colors.borderSubtle}`, borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "14px" }}>Formulários ({data.questionarios.length})</h3>
              <button
                type="button"
                data-testid="btn-new-questionnaire"
                onClick={() => {
                  setModalError(null);
                  setQPesquisaId(pesquisasDisponiveisQuestionario[0] ? String(pesquisasDisponiveisQuestionario[0].id_pesquisa) : "");
                  setQTitulo("");
                  setQVersao("v1.0");
                  setModalKind("questionario");
                }}
                style={{ padding: "6px 12px", borderRadius: "10px", border: "none", backgroundColor: colors.primaryContainer, color: colors.onPrimary, fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
              >
                + Novo Formulário
              </button>
            </div>
            {!loading && data.pesquisas.length > 0 && pesquisasDisponiveisQuestionario.length === 0 && (
              <div
                role="status"
                style={{
                  padding: "8px 10px",
                  borderRadius: "10px",
                  backgroundColor: colors.surfaceCard,
                  border: `1px solid ${colors.borderSubtle}`,
                  fontSize: "11.5px",
                  color: colors.textMuted,
                  lineHeight: "16px",
                }}
              >
                Todas as pesquisas ativas já possuem seu formulário único (regra: 1 formulário por pesquisa).
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "520px", overflowY: "auto" }}>
              {data.questionarios.map((q) => {
                const active = q.id_questionario === selectedQuestionarioId;
                return (
                  <button
                    key={q.id_questionario}
                    type="button"
                    onClick={() => setSelectedQuestionarioId(q.id_questionario)}
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      borderRadius: "12px",
                      border: `1px solid ${active ? colors.borderFocus : colors.borderSubtle}`,
                      backgroundColor: active ? colors.surfaceElevated : colors.surfaceCard,
                      color: colors.textPrimary,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <strong style={{ fontSize: "13px" }}>{q.titulo}</strong>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "9999px", backgroundColor: colors.surfaceContainerHigh, color: colors.primaryContainer, fontWeight: 700 }}>
                        {q.codigo_versao || "v1.0"}
                      </span>
                    </div>
                    <span style={{ fontSize: "11.5px", color: colors.textMuted }}>
                      {q.pesquisa_nome || `Pesquisa #${q.id_pesquisa}`}
                    </span>
                  </button>
                );
              })}
              {!loading && data.questionarios.length === 0 && (
                <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: colors.textMuted }}>
                  Nenhum formulário cadastrado.
                </div>
              )}
            </div>
          </aside>

          <section style={{ backgroundColor: colors.surfaceContainerLow, border: `1px solid ${colors.borderSubtle}`, borderRadius: "16px", padding: "18px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {selectedQuestionario ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", paddingBottom: "12px", borderBottom: `1px solid ${colors.borderSubtle}` }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px" }}>
                      {selectedQuestionario.titulo} <span style={{ color: colors.primaryContainer }}>({selectedQuestionario.codigo_versao || "v1.0"})</span>
                    </h3>
                    <div style={{ fontSize: "12px", color: colors.textMuted, marginTop: "2px" }}>
                      Hierarquia: Formulário Único → {cenariosDoQuestionario.length} Cenário(s) → {perguntasDoQuestionario.length} Pergunta(s) • {selectedQuestionario.pesquisa_nome}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      data-testid="btn-add-cenario-from-form"
                      onClick={() => {
                        setModalError(null);
                        setCPesquisaId(String(selectedQuestionario.id_pesquisa));
                        setCIdentificador("");
                        setCTipo("estimulado");
                        setModalKind("cenario");
                      }}
                      style={{ padding: "8px 13px", borderRadius: "10px", border: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceCard, color: colors.textPrimary, fontSize: "12.5px", fontWeight: 600, cursor: "pointer" }}
                    >
                      + Novo Cenário
                    </button>
                    <button
                      type="button"
                      data-testid="btn-add-question-to-form"
                      onClick={() => {
                        setModalError(null);
                        setVpPerguntaId("");
                        setVpCenarioId(cenariosDoQuestionario[0] ? String(cenariosDoQuestionario[0].id_cenario) : "");
                        setVpOrdem(String(perguntasDoQuestionario.length + 1));
                        setVpObrigatoria(true);
                        setModalKind("vincular_pergunta");
                      }}
                      style={{ padding: "8px 14px", borderRadius: "10px", border: "none", backgroundColor: colors.primaryContainer, color: colors.onPrimary, fontSize: "12.5px", fontWeight: 700, cursor: "pointer" }}
                    >
                      + Adicionar Pergunta
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteAndReload(`/questionarios/${selectedQuestionario.id_questionario}`, "Formulário excluído.")}
                      style={{ padding: "8px 12px", borderRadius: "10px", border: "none", backgroundColor: colors.errorContainer, color: colors.onErrorContainer, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Excluir Formulário
                    </button>
                  </div>
                </div>

                {/* Resumo dos Cenários do Formulário */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: colors.textMuted }}>
                      Cenários deste Formulário ({cenariosDoQuestionario.length})
                    </span>
                  </div>
                  {cenariosDoQuestionario.length === 0 ? (
                    <div
                      style={{
                        padding: "12px 14px",
                        borderRadius: "12px",
                        border: `1px dashed ${colors.borderSubtle}`,
                        color: colors.textMuted,
                        fontSize: "12.5px",
                      }}
                    >
                      Nenhum cenário cadastrado para esta pesquisa. Clique em <strong>+ Novo Cenário</strong> para organizar as perguntas por cenário.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {cenariosDoQuestionario.map((c) => {
                        const cId = Number(c.id_cenario);
                        const qCount = perguntasDoQuestionario.filter(
                          (qp) => qp.id_cenario !== null && qp.id_cenario !== undefined && Number(qp.id_cenario) === cId
                        ).length;
                        return (
                          <div
                            key={cId}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "7px 11px",
                              borderRadius: "10px",
                              backgroundColor: colors.surfaceCard,
                              border: `1px solid ${colors.borderSubtle}`,
                              fontSize: "12px",
                            }}
                          >
                            <strong style={{ color: colors.textPrimary }}>{c.identificador}</strong>
                            <span style={{ fontSize: "10.5px", padding: "2px 7px", borderRadius: "9999px", backgroundColor: colors.surfaceContainerHigh, color: colors.primaryContainer, fontWeight: 700 }}>
                              {c.tipo_cenario}
                            </span>
                            <span style={{ color: colors.textMuted, fontSize: "11.5px" }}>
                              {qCount} perg.
                            </span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "2px" }} title="Cartela de candidatos do cenário">
                              {data.cenario_candidatos
                                .filter((cc) => Number(cc.id_cenario) === cId)
                                .map((cc) => (
                                  <CandidateAvatar
                                    key={cc.id_candidato_produto}
                                    candidateId={Number(cc.id_candidato_produto)}
                                    name={String(cc.nome_urna_comercial || `C${cc.id_candidato_produto}`)}
                                    url={cc.foto_url ? String(cc.foto_url) : null}
                                    size={22}
                                  />
                                ))}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const candsCount = data.cenario_candidatos.filter(
                                  (cc) => Number(cc.id_cenario) === cId
                                ).length;
                                setSelectedCenarioId(cId);
                                setModalError(null);
                                setCcCandidatoId("");
                                setCcOrdem(String(candsCount + 1));
                                setModalKind("cenario_candidato");
                              }}
                              style={{
                                padding: "3px 8px",
                                borderRadius: "7px",
                                border: `1px solid ${colors.borderSubtle}`,
                                backgroundColor: colors.surfaceContainerLow,
                                color: colors.textPrimary,
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              + Candidato
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setModalError(null);
                                setVpPerguntaId("");
                                setVpCenarioId(String(cId));
                                setVpOrdem(String(perguntasDoQuestionario.length + 1));
                                setVpObrigatoria(true);
                                setModalKind("vincular_pergunta");
                              }}
                              style={{
                                padding: "3px 8px",
                                borderRadius: "7px",
                                border: `1px solid ${colors.borderSubtle}`,
                                backgroundColor: colors.surfaceContainerHigh,
                                color: colors.primaryContainer,
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              + Pergunta
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Perguntas Agrupadas por Cenário */}
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {groupedPerguntasPorCenario.map((group) => (
                    <div
                      key={group.key}
                      style={{
                        border: `1px solid ${colors.borderSubtle}`,
                        borderRadius: "12px",
                        backgroundColor: colors.surfaceCard,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "8px",
                          padding: "10px 14px",
                          backgroundColor: colors.surfaceContainerHigh,
                          borderBottom: `1px solid ${colors.borderSubtle}`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              backgroundColor: group.idCenario !== null ? "rgba(138, 180, 248, 0.16)" : colors.surfaceCard,
                              color: group.idCenario !== null ? colors.primaryContainer : colors.textMuted,
                            }}
                          >
                            {group.idCenario !== null ? `Cenário #${group.idCenario}` : "Bloco Geral"}
                          </span>
                          <strong style={{ fontSize: "13.5px", color: colors.textPrimary }}>{group.label}</strong>
                          {group.tipoCenario && (
                            <span style={{ fontSize: "11px", color: colors.textMuted }}>
                              ({group.tipoCenario})
                            </span>
                          )}
                          <span style={{ fontSize: "11.5px", color: colors.textMuted }}>
                            • {group.items.length} pergunta(s)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setModalError(null);
                            setVpPerguntaId("");
                            setVpCenarioId(group.idCenario !== null ? String(group.idCenario) : "");
                            setVpOrdem(String(perguntasDoQuestionario.length + 1));
                            setVpObrigatoria(true);
                            setModalKind("vincular_pergunta");
                          }}
                          style={{
                            padding: "5px 10px",
                            borderRadius: "8px",
                            border: `1px solid ${colors.borderSubtle}`,
                            backgroundColor: colors.surfaceCard,
                            color: colors.primaryContainer,
                            fontSize: "11.5px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          + Pergunta neste Cenário
                        </button>
                      </div>

                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                          <thead>
                            <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.textMuted, fontSize: "11px", textTransform: "uppercase" }}>
                              <th style={{ padding: "8px 10px" }}>Ordem</th>
                              <th style={{ padding: "8px 10px" }}>Enunciado (perguntas)</th>
                              <th style={{ padding: "8px 10px" }}>Tipo</th>
                              <th style={{ padding: "8px 10px" }}>Cenário</th>
                              <th style={{ padding: "8px 10px" }}>Grupo de Opções</th>
                              <th style={{ padding: "8px 10px" }}>Obrigatória</th>
                              <th style={{ padding: "8px 10px", textAlign: "right" }}>Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.items.map((qp) => {
                              const currentCenarioVal =
                                qp.id_cenario !== null && qp.id_cenario !== undefined
                                  ? String(qp.id_cenario)
                                  : "";
                              const isUpdating = updatingQpId === qp.id_questionario_pergunta;
                              const perguntaBase = data.perguntas.find((p) => Number(p.id_pergunta) === Number(qp.id_pergunta));
                              const grupoIdAtual =
                                perguntaBase?.id_grupo_opcao !== null && perguntaBase?.id_grupo_opcao !== undefined
                                  ? Number(perguntaBase.id_grupo_opcao)
                                  : null;
                              const opcoesDaPergunta =
                                grupoIdAtual !== null
                                  ? data.opcoes_resposta.filter((o) => Number(o.id_grupo_opcao) === grupoIdAtual)
                                  : [];
                              const bateriaDaPergunta = data.itens_bateria.filter(
                                (ib) => Number(ib.id_pergunta) === Number(qp.id_pergunta)
                              );
                              const isExpanded = expandedQpId === qp.id_questionario_pergunta;
                              return (
                                <React.Fragment key={qp.id_questionario_pergunta}>
                                <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                                  <td style={{ padding: "10px", fontWeight: 700, color: colors.primaryContainer }}>#{qp.ordem}</td>
                                  <td style={{ padding: "10px", fontWeight: 500 }}>{qp.enunciado || `Pergunta #${qp.id_pergunta}`}</td>
                                  <td style={{ padding: "10px", color: colors.textMuted }}>{qp.tipo_questao ?? qp.tipo_pergunta ?? "—"}</td>
                                  <td style={{ padding: "10px", minWidth: "170px" }}>
                                    <select
                                      aria-label={`Cenário da pergunta ${qp.enunciado || qp.id_pergunta}`}
                                      disabled={isUpdating}
                                      value={currentCenarioVal}
                                      onChange={(e) => {
                                        const nextVal = e.target.value;
                                        void patchAndReload(
                                          qp.id_questionario_pergunta,
                                          { id_cenario: nextVal ? Number(nextVal) : null },
                                          "Cenário da pergunta atualizado."
                                        );
                                      }}
                                      style={{
                                        width: "100%",
                                        padding: "5px 8px",
                                        borderRadius: "8px",
                                        border: `1px solid ${colors.borderSubtle}`,
                                        backgroundColor: colors.surfaceContainerLow,
                                        color: colors.textPrimary,
                                        fontSize: "12px",
                                        opacity: isUpdating ? 0.5 : 1,
                                      }}
                                    >
                                      <option value="">Geral / Sem Cenário</option>
                                      {cenariosDoQuestionario.map((c) => (
                                        <option key={c.id_cenario} value={String(c.id_cenario)}>
                                          {c.identificador} ({c.tipo_cenario})
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td style={{ padding: "10px", color: colors.textMuted }}>
                                    {qp.nome_grupo || "—"}
                                    <span style={{ marginLeft: "6px", fontSize: "11px" }}>
                                      ({opcoesDaPergunta.length} opç. • {bateriaDaPergunta.length} itens)
                                    </span>
                                  </td>
                                  <td style={{ padding: "10px" }}>{qp.obrigatoria ? "Sim" : "Não"}</td>
                                  <td style={{ padding: "10px", textAlign: "right", whiteSpace: "nowrap" }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewBateriaLabel("");
                                        setExpandedQpId(isExpanded ? null : qp.id_questionario_pergunta);
                                      }}
                                      style={{ padding: "5px 10px", marginRight: "6px", borderRadius: "8px", border: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceContainerHigh, color: colors.primaryContainer, fontSize: "11.5px", fontWeight: 700, cursor: "pointer" }}
                                    >
                                      {isExpanded ? "Fechar" : "Grupos & Bateria"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void deleteAndReload(`/questionario-perguntas/${qp.id_questionario_pergunta}`, "Pergunta desvinculada.")}
                                      style={{ padding: "5px 10px", borderRadius: "8px", border: "none", backgroundColor: colors.errorContainer, color: colors.onErrorContainer, fontSize: "11.5px", fontWeight: 600, cursor: "pointer" }}
                                    >
                                      Desvincular
                                    </button>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceContainerLow }}>
                                    <td colSpan={7} style={{ padding: "12px 16px" }}>
                                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                                        <div>
                                          <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: colors.textMuted, marginBottom: "6px" }}>
                                            Grupo de Opções da Pergunta
                                          </div>
                                          <select
                                            disabled={detailBusy || !perguntaBase}
                                            value={grupoIdAtual !== null ? String(grupoIdAtual) : ""}
                                            onChange={(e) => {
                                              if (!perguntaBase) return;
                                              void sendAndReload(
                                                "PUT",
                                                `/perguntas/${perguntaBase.id_pergunta}`,
                                                {
                                                  enunciado: perguntaBase.enunciado,
                                                  tipo_pergunta: perguntaBase.tipo_questao ?? perguntaBase.tipo_pergunta ?? "estimulada",
                                                  id_grupo_opcao: e.target.value ? Number(e.target.value) : null,
                                                },
                                                "Grupo de opções da pergunta atualizado."
                                              );
                                            }}
                                            style={{ ...INPUT_STYLE, marginBottom: "8px" }}
                                          >
                                            <option value="">Sem grupo de opções</option>
                                            {data.grupos_opcoes.map((g) => (
                                              <option key={g.id_grupo_opcao} value={String(g.id_grupo_opcao)}>
                                                {g.nome_grupo} ({g.tipo_escala || "nominal"})
                                              </option>
                                            ))}
                                          </select>
                                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                            {opcoesDaPergunta.length === 0 ? (
                                              <span style={{ fontSize: "12px", color: colors.textMuted }}>Nenhuma opção de resposta.</span>
                                            ) : (
                                              opcoesDaPergunta.map((o) => (
                                                <span key={o.id_opcao} style={{ fontSize: "11.5px", padding: "3px 9px", borderRadius: "9999px", backgroundColor: colors.surfaceContainerHigh, color: colors.textPrimary }}>
                                                  {o.rotulo}
                                                </span>
                                              ))
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: colors.textMuted, marginBottom: "6px" }}>
                                            Itens de Bateria ({bateriaDaPergunta.length})
                                          </div>
                                          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                                            {bateriaDaPergunta.length === 0 && (
                                              <span style={{ fontSize: "12px", color: colors.textMuted }}>Nenhum item de bateria.</span>
                                            )}
                                            {bateriaDaPergunta.map((ib) => (
                                              <div key={ib.id_item_bateria} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", padding: "5px 10px", borderRadius: "8px", border: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceCard, fontSize: "12.5px" }}>
                                                <span>#{ib.ordem ?? "—"} {ib.rotulo_item}</span>
                                                <button
                                                  type="button"
                                                  disabled={detailBusy}
                                                  onClick={() => void sendAndReload("DELETE", `/itens-bateria/${ib.id_item_bateria}`, null, "Item de bateria removido.")}
                                                  style={{ padding: "2px 8px", borderRadius: "6px", border: "none", backgroundColor: colors.errorContainer, color: colors.onErrorContainer, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                                                >
                                                  Remover
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                          <div style={{ display: "flex", gap: "6px" }}>
                                            <input
                                              style={INPUT_STYLE}
                                              value={newBateriaLabel}
                                              onChange={(e) => setNewBateriaLabel(e.target.value)}
                                              placeholder="Novo item (ex: Saúde Pública)"
                                            />
                                            <button
                                              type="button"
                                              disabled={detailBusy || !newBateriaLabel.trim()}
                                              onClick={() => {
                                                const label = newBateriaLabel.trim();
                                                const nextOrdem =
                                                  bateriaDaPergunta.reduce((m, ib) => Math.max(m, Number(ib.ordem) || 0), 0) + 1;
                                                setNewBateriaLabel("");
                                                void sendAndReload(
                                                  "POST",
                                                  "/itens-bateria",
                                                  { id_pergunta: Number(qp.id_pergunta), rotulo_item: label, ordem: nextOrdem },
                                                  "Item de bateria adicionado."
                                                );
                                              }}
                                              style={{ padding: "8px 12px", borderRadius: "10px", border: "none", backgroundColor: colors.primaryContainer, color: colors.onPrimary, fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", opacity: detailBusy || !newBateriaLabel.trim() ? 0.5 : 1 }}
                                            >
                                              + Item
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                                </React.Fragment>
                              );
                            })}
                            {group.items.length === 0 && (
                              <tr>
                                <td colSpan={7} style={{ padding: "18px", textAlign: "center", color: colors.textMuted, fontSize: "12.5px" }}>
                                  Nenhuma pergunta vinculada a este cenário ainda.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ padding: "32px", textAlign: "center", color: colors.textMuted }}>
                Selecione um formulário à esquerda ou crie o formulário único da pesquisa.
              </div>
            )}
          </section>
        </div>
      )}

      {/* ABA 2: CENÁRIOS DA PESQUISA (PAI -> CENARIO_CANDIDATOS FILHO) */}
      {activeTab === "cenarios" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 340px) minmax(0, 1fr)", gap: "16px", alignItems: "start" }}>
          <aside style={{ backgroundColor: colors.surfaceContainerLow, border: `1px solid ${colors.borderSubtle}`, borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "14px" }}>Cenários ({cenariosFiltrados.length})</h3>
              <button
                type="button"
                onClick={() => {
                  setModalError(null);
                  setCPesquisaId(filterPesquisaId || (data.pesquisas[0] ? String(data.pesquisas[0].id_pesquisa) : ""));
                  setCIdentificador("");
                  setCTipo("estimulado");
                  setModalKind("cenario");
                }}
                style={{ padding: "6px 12px", borderRadius: "10px", border: "none", backgroundColor: colors.primaryContainer, color: colors.onPrimary, fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
              >
                + Novo Cenário
              </button>
            </div>
            <SearchableCombobox
              value={filterPesquisaId}
              emptyOptionLabel="Todas as Pesquisas"
              placeholder="Filtrar por pesquisa..."
              options={data.pesquisas.map((p) => ({ value: String(p.id_pesquisa), label: p.nome }))}
              onChange={setFilterPesquisaId}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "480px", overflowY: "auto" }}>
              {cenariosFiltrados.map((c) => {
                const active = selectedCenario?.id_cenario === c.id_cenario;
                return (
                  <button
                    key={c.id_cenario}
                    type="button"
                    onClick={() => setSelectedCenarioId(c.id_cenario)}
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      borderRadius: "12px",
                      border: `1px solid ${active ? colors.borderFocus : colors.borderSubtle}`,
                      backgroundColor: active ? colors.surfaceElevated : colors.surfaceCard,
                      color: colors.textPrimary,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <strong style={{ fontSize: "13px" }}>{c.identificador}</strong>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "9999px", backgroundColor: colors.surfaceContainerHigh, color: colors.primaryContainer, fontWeight: 700 }}>
                        {c.tipo_cenario}
                      </span>
                    </div>
                    <span style={{ fontSize: "11.5px", color: colors.textMuted }}>
                      {c.pesquisa_nome || `Pesquisa #${c.id_pesquisa}`}
                    </span>
                  </button>
                );
              })}
              {!loading && cenariosFiltrados.length === 0 && (
                <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: colors.textMuted }}>
                  Nenhum cenário cadastrado.
                </div>
              )}
            </div>
          </aside>

          <section style={{ backgroundColor: colors.surfaceContainerLow, border: `1px solid ${colors.borderSubtle}`, borderRadius: "16px", padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {selectedCenario ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", paddingBottom: "12px", borderBottom: `1px solid ${colors.borderSubtle}` }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px" }}>
                      {selectedCenario.identificador} <span style={{ color: colors.primaryContainer }}>({selectedCenario.tipo_cenario})</span>
                    </h3>
                    <div style={{ fontSize: "12px", color: colors.textMuted, marginTop: "2px" }}>
                      Candidatos / Produtos vinculados (<code>cenario_candidatos</code>) • {selectedCenario.pesquisa_nome || `Pesquisa #${selectedCenario.id_pesquisa}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setModalError(null);
                        setCcCandidatoId("");
                        setCcOrdem(String(candidatosDoCenario.length + 1));
                        setModalKind("cenario_candidato");
                      }}
                      style={{ padding: "8px 14px", borderRadius: "10px", border: "none", backgroundColor: colors.primaryContainer, color: colors.onPrimary, fontSize: "12.5px", fontWeight: 700, cursor: "pointer" }}
                    >
                      + Adicionar Candidato / Produto
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteAndReload(`/cenarios-pesquisa/${selectedCenario.id_cenario}`, "Cenário excluído.")}
                      style={{ padding: "8px 12px", borderRadius: "10px", border: "none", backgroundColor: colors.errorContainer, color: colors.onErrorContainer, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Excluir Cenário
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.textMuted, fontSize: "11px", textTransform: "uppercase" }}>
                        <th style={{ padding: "8px" }}>Ordem</th>
                        <th style={{ padding: "8px" }}>Candidato / Produto</th>
                        <th style={{ padding: "8px" }}>Partido / Marca</th>
                        <th style={{ padding: "8px" }}>Cargo / Categoria</th>
                        <th style={{ padding: "8px", textAlign: "right" }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidatosDoCenario.map((cc) => (
                        <tr key={`${cc.id_cenario}-${cc.id_candidato_produto}`} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                          <td style={{ padding: "10px 8px", fontWeight: 700, color: colors.primaryContainer }}>#{cc.ordem_apresentacao ?? 1}</td>
                          <td style={{ padding: "10px 8px", fontWeight: 500 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                              <CandidateAvatar
                                candidateId={Number(cc.id_candidato_produto)}
                                name={String(cc.nome_urna_comercial || `C${cc.id_candidato_produto}`)}
                                url={cc.foto_url ? String(cc.foto_url) : null}
                              />
                              {cc.nome_urna_comercial || `Candidato #${cc.id_candidato_produto}`}
                            </span>
                          </td>
                          <td style={{ padding: "10px 8px", color: colors.textMuted }}>{cc.sigla_partido_marca || "—"}</td>
                          <td style={{ padding: "10px 8px", color: colors.textMuted }}>{cc.cargo_categoria || "—"}</td>
                          <td style={{ padding: "10px 8px", textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => void deleteAndReload(`/cenario-candidatos/${cc.id_cenario}/${cc.id_candidato_produto}`, "Candidato/produto removido do cenário.")}
                              style={{ padding: "5px 10px", borderRadius: "8px", border: "none", backgroundColor: colors.errorContainer, color: colors.onErrorContainer, fontSize: "11.5px", fontWeight: 600, cursor: "pointer" }}
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                      {candidatosDoCenario.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: colors.textMuted }}>
                            Nenhum candidato ou produto vinculado a este cenário.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div style={{ padding: "32px", textAlign: "center", color: colors.textMuted }}>
                Selecione um cenário à esquerda ou crie um novo cenário.
              </div>
            )}
          </section>
        </div>
      )}

      {/* ABA 3: BANCO DE PERGUNTAS (REPOSITÓRIO REUTILIZÁVEL) */}
      {activeTab === "perguntas" && (
        <section style={{ backgroundColor: colors.surfaceContainerLow, border: `1px solid ${colors.borderSubtle}`, borderRadius: "16px", padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "15px" }}>Repositório de Perguntas (<code>perguntas</code>)</h3>
            <button
              type="button"
              onClick={() => {
                setPEnunciado("");
                setPTipo("estimulada");
                setPGrupoId(data.grupos_opcoes[0] ? String(data.grupos_opcoes[0].id_grupo_opcao) : "");
                setModalKind("pergunta");
              }}
              style={{ padding: "9px 15px", borderRadius: "10px", border: "none", backgroundColor: colors.primaryContainer, color: colors.onPrimary, fontSize: "12.5px", fontWeight: 700, cursor: "pointer" }}
            >
              + Nova Pergunta
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.textMuted, fontSize: "11px", textTransform: "uppercase" }}>
                  <th style={{ padding: "8px" }}>ID</th>
                  <th style={{ padding: "8px" }}>Enunciado</th>
                  <th style={{ padding: "8px" }}>Tipo</th>
                  <th style={{ padding: "8px" }}>Grupo de Opções (FK)</th>
                  <th style={{ padding: "8px", textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {data.perguntas.map((p) => (
                  <tr key={p.id_pergunta} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "10px 8px", color: colors.primaryContainer, fontWeight: 700 }}>#{p.id_pergunta}</td>
                    <td style={{ padding: "10px 8px", fontWeight: 500 }}>{p.enunciado}</td>
                    <td style={{ padding: "10px 8px", color: colors.textMuted }}>{p.tipo_questao ?? p.tipo_pergunta ?? "—"}</td>
                    <td style={{ padding: "10px 8px", color: colors.successPastel }}>{p.nome_grupo || "—"}</td>
                    <td style={{ padding: "10px 8px", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => void deleteAndReload(`/perguntas/${p.id_pergunta}`, "Pergunta excluída.")}
                        style={{ padding: "5px 10px", borderRadius: "8px", border: "none", backgroundColor: colors.errorContainer, color: colors.onErrorContainer, fontSize: "11.5px", fontWeight: 600, cursor: "pointer" }}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ABA 4: GRUPOS & OPÇÕES DE RESPOSTA (PAI -> FILHO) */}
      {activeTab === "grupos_opcoes" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)", gap: "16px", alignItems: "start" }}>
          <aside style={{ backgroundColor: colors.surfaceContainerLow, border: `1px solid ${colors.borderSubtle}`, borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "14px" }}>Grupos (<code>grupos_opcoes</code>)</h3>
              <button
                type="button"
                onClick={() => { setGNome(""); setGEscala("nominal"); setModalKind("grupo"); }}
                style={{ padding: "6px 10px", borderRadius: "8px", border: "none", backgroundColor: colors.primaryContainer, color: colors.onPrimary, fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
              >
                + Grupo
              </button>
            </div>
            {data.grupos_opcoes.map((g) => {
              const active = g.id_grupo_opcao === selectedGrupoId;
              return (
                <button
                  key={g.id_grupo_opcao}
                  type="button"
                  onClick={() => setSelectedGrupoId(g.id_grupo_opcao)}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: `1px solid ${active ? colors.borderFocus : colors.borderSubtle}`,
                    backgroundColor: active ? colors.surfaceElevated : colors.surfaceCard,
                    color: colors.textPrimary,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "13px" }}>{g.nome_grupo}</div>
                  <div style={{ fontSize: "11px", color: colors.textMuted }}>Escala: {g.tipo_escala || "nominal"}</div>
                </button>
              );
            })}
          </aside>

          <section style={{ backgroundColor: colors.surfaceContainerLow, border: `1px solid ${colors.borderSubtle}`, borderRadius: "16px", padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "15px" }}>
                Opções de Resposta {selectedGrupo ? `— ${selectedGrupo.nome_grupo}` : ""}
              </h3>
              {selectedGrupo && (
                <button
                  type="button"
                  onClick={() => { setORotulo(""); setOValor(""); setOOrdem(String(opcoesDoGrupo.length + 1)); setModalKind("opcao"); }}
                  style={{ padding: "8px 14px", borderRadius: "10px", border: "none", backgroundColor: colors.primaryContainer, color: colors.onPrimary, fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                >
                  + Nova Opção
                </button>
              )}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.textMuted, fontSize: "11px", textTransform: "uppercase" }}>
                  <th style={{ padding: "8px" }}>Ordem</th>
                  <th style={{ padding: "8px" }}>Rótulo</th>
                  <th style={{ padding: "8px" }}>Valor Numérico</th>
                  <th style={{ padding: "8px", textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {opcoesDoGrupo.map((o) => (
                  <tr key={o.id_opcao} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                    <td style={{ padding: "8px" }}>{o.ordem_exibicao ?? o.ordem ?? "—"}</td>
                    <td style={{ padding: "8px", fontWeight: 500 }}>{o.rotulo}</td>
                    <td style={{ padding: "8px", color: colors.textMuted }}>{o.codigo_valor ?? o.valor_numerico ?? "—"}</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => void deleteAndReload(`/opcoes-resposta/${o.id_opcao}`, "Opção removida.")}
                        style={{ padding: "4px 10px", borderRadius: "8px", border: "none", backgroundColor: colors.errorContainer, color: colors.onErrorContainer, fontSize: "11.5px", fontWeight: 600, cursor: "pointer" }}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* ABA 5: ITENS DE BATERIA */}
      {activeTab === "itens_bateria" && (
        <section style={{ backgroundColor: colors.surfaceContainerLow, border: `1px solid ${colors.borderSubtle}`, borderRadius: "16px", padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "15px" }}>Itens de Bateria (<code>itens_bateria</code>)</h3>
            <button
              type="button"
              onClick={() => {
                setIbPerguntaId(data.perguntas[0] ? String(data.perguntas[0].id_pergunta) : "");
                setIbRotulo("");
                setIbOrdem("1");
                setModalKind("item_bateria");
              }}
              style={{ padding: "9px 15px", borderRadius: "10px", border: "none", backgroundColor: colors.primaryContainer, color: colors.onPrimary, fontSize: "12.5px", fontWeight: 700, cursor: "pointer" }}
            >
              + Novo Item de Bateria
            </button>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, textAlign: "left", color: colors.textMuted, fontSize: "11px", textTransform: "uppercase" }}>
                <th style={{ padding: "8px" }}>Ordem</th>
                <th style={{ padding: "8px" }}>Pergunta (FK)</th>
                <th style={{ padding: "8px" }}>Rótulo do Item</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.itens_bateria.map((ib) => (
                <tr key={ib.id_item_bateria} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                  <td style={{ padding: "8px" }}>{ib.ordem ?? "—"}</td>
                  <td style={{ padding: "8px", color: colors.textMuted }}>{ib.pergunta_enunciado || `Pergunta #${ib.id_pergunta}`}</td>
                  <td style={{ padding: "8px", fontWeight: 500 }}>{ib.rotulo_item}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => void deleteAndReload(`/itens-bateria/${ib.id_item_bateria}`, "Item excluído.")}
                      style={{ padding: "4px 10px", borderRadius: "8px", border: "none", backgroundColor: colors.errorContainer, color: colors.onErrorContainer, fontSize: "11.5px", fontWeight: 600, cursor: "pointer" }}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* MODAIS DE CADASTRO */}
      <SlideOverDrawer
        isOpen={modalKind !== null}
        onClose={() => {
          if (!saving) {
            setModalKind(null);
            setModalError(null);
          }
        }}
        title={
          modalKind === "questionario" ? "Novo Formulário Único da Pesquisa" :
            modalKind === "vincular_pergunta" ? "Adicionar Pergunta ao Formulário" :
              modalKind === "cenario" ? "Novo Cenário da Pesquisa" :
                modalKind === "cenario_candidato" ? "Adicionar Candidato / Produto ao Cenário" :
                  modalKind === "pergunta" ? "Nova Pergunta (Repositório)" :
                    modalKind === "grupo" ? "Novo Grupo de Opções" :
                      modalKind === "opcao" ? "Nova Opção de Resposta" :
                        "Novo Item de Bateria"
        }
        width="520px"
        footerActions={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", width: "100%" }}>
            <button
              type="button"
              onClick={() => {
                setModalKind(null);
                setModalError(null);
              }}
              style={{ padding: "9px 14px", borderRadius: "10px", border: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surfaceCard, color: colors.textPrimary, cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={
                saving ||
                (modalKind === "questionario" &&
                  (pesquisasDisponiveisQuestionario.length === 0 ||
                    !qPesquisaId ||
                    !qTitulo.trim())) ||
                (modalKind === "vincular_pergunta" &&
                  (perguntasDisponiveisParaVincular.length === 0 ||
                    !vpPerguntaId ||
                    linkedPerguntaIds.has(Number(vpPerguntaId)))) ||
                (modalKind === "cenario_candidato" &&
                  (candidatosDisponiveisParaCenario.length === 0 ||
                    !ccCandidatoId ||
                    linkedCandidatoIds.has(Number(ccCandidatoId))))
              }
              onClick={() => {
                if (modalKind === "questionario") {
                  if (!qPesquisaId) {
                    setModalError("Selecione uma pesquisa disponível (sem formulário vinculado).");
                    return;
                  }
                  if (!qTitulo.trim()) {
                    setModalError("Informe o título do formulário.");
                    return;
                  }
                  void postAndReload("/questionarios", { id_pesquisa: Number(qPesquisaId), titulo: qTitulo.trim(), codigo_versao: qVersao.trim() || "v1.0", ativo: true }, "Formulário criado.");
                } else if (modalKind === "vincular_pergunta" && selectedQuestionarioId) {
                  const perguntaIdNum = Number(vpPerguntaId);
                  if (!vpPerguntaId || !Number.isFinite(perguntaIdNum) || perguntaIdNum <= 0) {
                    setModalError("Selecione uma pergunta do repositório para vincular.");
                    return;
                  }
                  if (linkedPerguntaIds.has(perguntaIdNum)) {
                    setModalError("Esta pergunta já está vinculada neste cenário.");
                    return;
                  }
                  const numericUserId = currentUser?.id && /^\d+$/.test(currentUser.id) ? Number(currentUser.id) : null;
                  const cenarioIdNum = vpCenarioId ? Number(vpCenarioId) : null;
                  void postAndReload(
                    "/questionario-perguntas",
                    {
                      id_questionario: selectedQuestionarioId,
                      id_pergunta: perguntaIdNum,
                      id_cenario: cenarioIdNum !== null && Number.isFinite(cenarioIdNum) ? cenarioIdNum : null,
                      ordem: Number(vpOrdem) || 1,
                      obrigatoria: vpObrigatoria,
                      id_usuario: numericUserId,
                    },
                    "Pergunta adicionada ao formulário."
                  );
                } else if (modalKind === "cenario") {
                  void postAndReload("/cenarios-pesquisa", { id_pesquisa: Number(cPesquisaId), identificador: cIdentificador, tipo_cenario: cTipo, ativo: true }, "Cenário criado.");
                } else if (modalKind === "cenario_candidato" && selectedCenario) {
                  const candidatoIdNum = Number(ccCandidatoId);
                  if (!ccCandidatoId || !Number.isFinite(candidatoIdNum) || candidatoIdNum <= 0) {
                    setModalError("Selecione um candidato ou produto para adicionar.");
                    return;
                  }
                  if (linkedCandidatoIds.has(candidatoIdNum)) {
                    setModalError("Este candidato/produto já está vinculado a este cenário.");
                    return;
                  }
                  void postAndReload(
                    "/cenario-candidatos",
                    {
                      id_cenario: selectedCenario.id_cenario,
                      id_candidato_produto: candidatoIdNum,
                      ordem_apresentacao: Number(ccOrdem) || 1,
                    },
                    "Candidato/produto adicionado ao cenário."
                  );
                } else if (modalKind === "pergunta") {
                  void postAndReload("/perguntas", { enunciado: pEnunciado, tipo_pergunta: pTipo, id_grupo_opcao: pGrupoId ? Number(pGrupoId) : null }, "Pergunta criada.");
                } else if (modalKind === "grupo") {
                  void postAndReload("/grupos-opcoes", { nome_grupo: gNome, tipo_escala: gEscala }, "Grupo de opções criado.");
                } else if (modalKind === "opcao" && selectedGrupoId) {
                  void postAndReload("/opcoes-resposta", { id_grupo_opcao: selectedGrupoId, rotulo: oRotulo, valor_numerico: oValor ? Number(oValor) : null, ordem: Number(oOrdem) || 1 }, "Opção criada.");
                } else if (modalKind === "item_bateria") {
                  void postAndReload("/itens-bateria", { id_pergunta: Number(ibPerguntaId), rotulo_item: ibRotulo, ordem: Number(ibOrdem) || 1 }, "Item de bateria criado.");
                }
              }}
              style={{
                padding: "9px 18px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: colors.primaryContainer,
                color: colors.onPrimary,
                fontWeight: 700,
                cursor:
                  saving ||
                    (modalKind === "questionario" &&
                      (pesquisasDisponiveisQuestionario.length === 0 ||
                        !qPesquisaId ||
                        !qTitulo.trim())) ||
                    (modalKind === "vincular_pergunta" &&
                      (perguntasDisponiveisParaVincular.length === 0 ||
                        !vpPerguntaId ||
                        linkedPerguntaIds.has(Number(vpPerguntaId)))) ||
                    (modalKind === "cenario_candidato" &&
                      (candidatosDisponiveisParaCenario.length === 0 ||
                        !ccCandidatoId ||
                        linkedCandidatoIds.has(Number(ccCandidatoId))))
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  saving ||
                    (modalKind === "questionario" &&
                      (pesquisasDisponiveisQuestionario.length === 0 ||
                        !qPesquisaId ||
                        !qTitulo.trim())) ||
                    (modalKind === "vincular_pergunta" &&
                      (perguntasDisponiveisParaVincular.length === 0 ||
                        !vpPerguntaId ||
                        linkedPerguntaIds.has(Number(vpPerguntaId)))) ||
                    (modalKind === "cenario_candidato" &&
                      (candidatosDisponiveisParaCenario.length === 0 ||
                        !ccCandidatoId ||
                        linkedCandidatoIds.has(Number(ccCandidatoId))))
                    ? 0.5
                    : 1,
              }}
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
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
          {modalKind === "questionario" && (
            <>
              <div>
                <label style={LABEL_STYLE}>Pesquisa (FK pesquisas — 1 formulário por pesquisa) *</label>
                {pesquisasDisponiveisQuestionario.length > 0 ? (
                  <SearchableCombobox
                    value={qPesquisaId}
                    placeholder="Selecione uma pesquisa sem formulário..."
                    options={pesquisasDisponiveisQuestionario.map((p) => ({
                      value: String(p.id_pesquisa),
                      label: p.nome,
                      sublabel: p.status,
                    }))}
                    onChange={(val) => {
                      setQPesquisaId(val);
                      setModalError(null);
                    }}
                  />
                ) : (
                  <div
                    role="status"
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: `1px solid ${colors.borderSubtle}`,
                      backgroundColor: colors.surfaceCard,
                      color: colors.textMuted,
                      fontSize: "12.5px",
                    }}
                  >
                    Todas as pesquisas disponíveis já possuem um formulário vinculado. Cada pesquisa pode ter apenas 1 formulário.
                  </div>
                )}
              </div>
              <div>
                <label style={LABEL_STYLE}>Título do Formulário *</label>
                <input
                  style={INPUT_STYLE}
                  value={qTitulo}
                  onChange={(e) => {
                    setQTitulo(e.target.value);
                    setModalError(null);
                  }}
                  placeholder="Ex: Formulário Eleitoral Municipal"
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Código da Versão (codigo_versao) *</label>
                <input style={INPUT_STYLE} value={qVersao} onChange={(e) => setQVersao(e.target.value)} placeholder="v1.0" />
              </div>
            </>
          )}

          {modalKind === "vincular_pergunta" && (
            <>
              <div>
                <label style={LABEL_STYLE}>Formulário Selecionado</label>
                <input
                  style={{ ...INPUT_STYLE, opacity: 0.85, cursor: "default" }}
                  type="text"
                  readOnly
                  value={
                    selectedQuestionario
                      ? `#${selectedQuestionario.id_questionario} — ${selectedQuestionario.titulo} (${selectedQuestionario.codigo_versao || "v1.0"})`
                      : ""
                  }
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Cenário do Formulário (FK cenarios_pesquisa)</label>
                <select
                  data-testid="select-vp-cenario"
                  style={INPUT_STYLE}
                  value={vpCenarioId}
                  onChange={(e) => {
                    setVpCenarioId(e.target.value);
                    setVpPerguntaId("");
                    setModalError(null);
                  }}
                >
                  <option value="">Geral / Sem Cenário</option>
                  {cenariosDoQuestionario.map((c) => (
                    <option key={c.id_cenario} value={String(c.id_cenario)}>
                      #{c.id_cenario} — {c.identificador} ({c.tipo_cenario})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE}>Pergunta do Repositório (FK perguntas) *</label>
                {perguntasDisponiveisParaVincular.length > 0 ? (
                  <SearchableCombobox
                    value={vpPerguntaId}
                    placeholder="Selecione ou pesquise uma pergunta disponível..."
                    options={perguntasDisponiveisParaVincular.map((p) => ({
                      value: String(p.id_pergunta),
                      label: `#${p.id_pergunta} — ${p.enunciado}`,
                    }))}
                    onChange={(val) => {
                      setVpPerguntaId(val);
                      setModalError(null);
                    }}
                  />
                ) : (
                  <div
                    role="status"
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: `1px solid ${colors.borderSubtle}`,
                      backgroundColor: colors.surfaceCard,
                      color: colors.textMuted,
                      fontSize: "12.5px",
                    }}
                  >
                    {data.perguntas.length === 0
                      ? "Nenhuma pergunta cadastrada no repositório."
                      : "Todas as perguntas do repositório já estão vinculadas neste cenário."}
                  </div>
                )}
              </div>
              <div>
                <label style={LABEL_STYLE}>Ordem no Formulário *</label>
                <input style={INPUT_STYLE} type="number" min="1" value={vpOrdem} onChange={(e) => setVpOrdem(e.target.value)} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                <input type="checkbox" checked={vpObrigatoria} onChange={(e) => setVpObrigatoria(e.target.checked)} />
                Pergunta obrigatória
              </label>
            </>
          )}

          {modalKind === "cenario" && (
            <>
              <div>
                <label style={LABEL_STYLE}>Pesquisa (FK pesquisas) *</label>
                <SearchableCombobox value={cPesquisaId} options={data.pesquisas.map((p) => ({ value: String(p.id_pesquisa), label: p.nome }))} onChange={setCPesquisaId} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Identificador do Cenário *</label>
                <input style={INPUT_STYLE} value={cIdentificador} onChange={(e) => setCIdentificador(e.target.value)} placeholder="Ex: Cenário 1 - Estimulado" />
              </div>
              <div>
                <label style={LABEL_STYLE}>Tipo de Cenário *</label>
                <select style={INPUT_STYLE} value={cTipo} onChange={(e) => setCTipo(e.target.value)}>
                  <option value="estimulado">Estimulado</option>
                  <option value="espontaneo">Espontâneo</option>
                  <option value="rejeicao">Rejeição</option>
                  <option value="segundo_turno">Segundo Turno</option>
                </select>
              </div>
            </>
          )}

          {modalKind === "cenario_candidato" && (
            <>
              <div>
                <label style={LABEL_STYLE}>Cenário Selecionado</label>
                <input
                  style={{ ...INPUT_STYLE, opacity: 0.85, cursor: "default" }}
                  type="text"
                  readOnly
                  value={
                    selectedCenario
                      ? `#${selectedCenario.id_cenario} — ${selectedCenario.identificador} (${selectedCenario.tipo_cenario})`
                      : ""
                  }
                />
              </div>
              <div>
                <label style={LABEL_STYLE}>Candidato / Produto (FK candidatos_produtos) *</label>
                {candidatosDisponiveisParaCenario.length > 0 ? (
                  <SearchableCombobox
                    value={ccCandidatoId}
                    placeholder="Selecione ou pesquise um candidato/produto..."
                    options={candidatosDisponiveisParaCenario.map((c) => ({
                      value: String(c.id_candidato_produto),
                      label: `#${c.id_candidato_produto} — ${c.nome_urna_comercial}${c.sigla_partido_marca ? ` (${c.sigla_partido_marca})` : ""}`,
                      sublabel: c.cargo_categoria || undefined,
                    }))}
                    onChange={(val) => {
                      setCcCandidatoId(val);
                      setModalError(null);
                    }}
                  />
                ) : (
                  <div
                    role="status"
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: `1px solid ${colors.borderSubtle}`,
                      backgroundColor: colors.surfaceCard,
                      color: colors.textMuted,
                      fontSize: "12.5px",
                    }}
                  >
                    {data.candidatos.length === 0
                      ? "Nenhum candidato ou produto cadastrado."
                      : "Todos os candidatos/produtos já estão vinculados a este cenário."}
                  </div>
                )}
              </div>
              <div>
                <label style={LABEL_STYLE}>Ordem de Apresentação</label>
                <input style={INPUT_STYLE} type="number" min="1" value={ccOrdem} onChange={(e) => setCcOrdem(e.target.value)} />
              </div>
            </>
          )}

          {modalKind === "pergunta" && (
            <>
              <div>
                <label style={LABEL_STYLE}>Enunciado da Pergunta *</label>
                <textarea style={{ ...INPUT_STYLE, minHeight: "80px" }} value={pEnunciado} onChange={(e) => setPEnunciado(e.target.value)} placeholder="Digite o enunciado completo..." />
              </div>
              <div>
                <label style={LABEL_STYLE}>Tipo de Pergunta *</label>
                <select style={INPUT_STYLE} value={pTipo} onChange={(e) => setPTipo(e.target.value)}>
                  <option value="estimulada">Estimulada</option>
                  <option value="espontanea">Espontânea</option>
                  <option value="rejeicao">Rejeição</option>
                  <option value="escala">Escala / Avaliação</option>
                  <option value="bateria">Bateria</option>
                </select>
              </div>
              <div>
                <label style={LABEL_STYLE}>Grupo de Opções (FK grupos_opcoes)</label>
                <SearchableCombobox
                  value={pGrupoId}
                  emptyOptionLabel="Sem grupo de opções"
                  placeholder="Pesquisar grupo de opções..."
                  options={data.grupos_opcoes.map((g) => ({ value: String(g.id_grupo_opcao), label: g.nome_grupo, sublabel: g.tipo_escala }))}
                  onChange={setPGrupoId}
                />
              </div>
            </>
          )}

          {modalKind === "grupo" && (
            <>
              <div>
                <label style={LABEL_STYLE}>Nome do Grupo *</label>
                <input style={INPUT_STYLE} value={gNome} onChange={(e) => setGNome(e.target.value)} placeholder="Ex: Escala Likert 5 Pontos" />
              </div>
              <div>
                <label style={LABEL_STYLE}>Tipo de Escala *</label>
                <select style={INPUT_STYLE} value={gEscala} onChange={(e) => setGEscala(e.target.value)}>
                  <option value="nominal">Nominal</option>
                  <option value="ordinal">Ordinal / Likert</option>
                  <option value="dicotomica">Dicotômica</option>
                </select>
              </div>
            </>
          )}

          {modalKind === "opcao" && (
            <>
              <div>
                <label style={LABEL_STYLE}>Rótulo da Opção *</label>
                <input style={INPUT_STYLE} value={oRotulo} onChange={(e) => setORotulo(e.target.value)} placeholder="Ex: Ótimo" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={LABEL_STYLE}>Valor Numérico</label>
                  <input style={INPUT_STYLE} type="number" value={oValor} onChange={(e) => setOValor(e.target.value)} placeholder="Ex: 5" />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Ordem</label>
                  <input style={INPUT_STYLE} type="number" min="1" value={oOrdem} onChange={(e) => setOOrdem(e.target.value)} />
                </div>
              </div>
            </>
          )}

          {modalKind === "item_bateria" && (
            <>
              <div>
                <label style={LABEL_STYLE}>Pergunta (FK perguntas) *</label>
                <SearchableCombobox value={ibPerguntaId} options={data.perguntas.map((p) => ({ value: String(p.id_pergunta), label: `#${p.id_pergunta} — ${p.enunciado}` }))} onChange={setIbPerguntaId} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Rótulo do Item *</label>
                <input style={INPUT_STYLE} value={ibRotulo} onChange={(e) => setIbRotulo(e.target.value)} placeholder="Ex: Saúde Pública" />
              </div>
              <div>
                <label style={LABEL_STYLE}>Ordem</label>
                <input style={INPUT_STYLE} type="number" min="1" value={ibOrdem} onChange={(e) => setIbOrdem(e.target.value)} />
              </div>
            </>
          )}
        </div>
      </SlideOverDrawer>
    </div>
  );
}
