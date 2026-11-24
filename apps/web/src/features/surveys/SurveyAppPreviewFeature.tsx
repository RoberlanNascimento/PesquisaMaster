import React, { useState, useEffect, useMemo, useCallback } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors } = NOCTURNE_TOKENS;
const API_BASE = "http://127.0.0.1:8000/api/v1/questionarios-db";
const API_RESUMO = `${API_BASE}/resumo`;
const API_ENTREVISTAS = `${API_BASE}/entrevistas`;

interface BackendQuestionario {
  readonly id_questionario: number;
  readonly titulo?: string | null;
  readonly versao?: string | null;
  readonly codigo_versao?: string | null;
  readonly id_pesquisa?: number | null;
  readonly pesquisa_nome?: string | null;
}

interface BackendQuestionarioPergunta {
  readonly id_questionario_pergunta?: number | null;
  readonly id_questionario: number;
  readonly id_pergunta: number;
  readonly id_cenario?: number | null;
  readonly cenario_identificador?: string | null;
  readonly cenario_tipo?: string | null;
  readonly ordem?: number | null;
  readonly obrigatoria?: boolean | null;
  readonly secao_bloco?: string | null;
  readonly enunciado?: string | null;
  readonly texto_pergunta?: string | null;
  readonly nome_grupo?: string | null;
  readonly tipo_escala?: string | null;
}

interface BackendPergunta {
  readonly id_pergunta: number;
  readonly id_grupo_opcao?: number | null;
  readonly enunciado?: string | null;
  readonly texto_pergunta?: string | null;
  readonly tipo_pergunta?: string | null;
  readonly nome_grupo?: string | null;
  readonly tipo_escala?: string | null;
}

interface BackendOpcaoResposta {
  readonly id_opcao: number;
  readonly id_grupo_opcao: number;
  readonly texto_opcao?: string | null;
  readonly rotulo?: string | null;
  readonly descricao?: string | null;
  readonly ordem?: number | null;
}

interface BackendCenario {
  readonly id_cenario: number;
  readonly id_pesquisa?: number | null;
  readonly identificador?: string | null;
  readonly tipo_cenario?: string | null;
  readonly descricao?: string | null;
  readonly pesquisa_nome?: string | null;
}

interface BackendCenarioCandidato {
  readonly id_cenario: number;
  readonly id_candidato_produto: number;
  readonly ordem_apresentacao?: number | null;
  readonly nome_urna_comercial?: string | null;
  readonly sigla_partido_marca?: string | null;
  readonly cargo_categoria?: string | null;
  readonly foto_url?: string | null;
}

interface BackendItemBateria {
  readonly id_item_bateria: number;
  readonly id_pergunta: number;
  readonly rotulo_item?: string | null;
  readonly ordem?: number | null;
}

interface ResumoPayload {
  readonly itens_bateria?: readonly BackendItemBateria[];
  readonly questionarios?: readonly BackendQuestionario[];
  readonly questionario_perguntas?: readonly BackendQuestionarioPergunta[];
  readonly perguntas?: readonly BackendPergunta[];
  readonly opcoes_resposta?: readonly BackendOpcaoResposta[];
  readonly cenarios_pesquisa?: readonly BackendCenario[];
  readonly cenarios?: readonly BackendCenario[];
  readonly cenario_candidatos?: readonly BackendCenarioCandidato[];
}

type TipoRegistro = "voto_direto" | "rejeicao" | "likert" | "aprovacao" | "texto";

interface PreviewQuestionItem {
  readonly key: string;
  readonly idQuestionarioPergunta: number;
  readonly idPergunta: number;
  readonly idCenario: number | null;
  readonly cenarioNome: string;
  readonly cenarioTipo: string | null;
  readonly ordem: number;
  readonly obrigatoria: boolean;
  readonly texto: string;
  readonly grupoNome: string | null;
  readonly tipoEscala: string | null;
  readonly opcoes: readonly { readonly id: number; readonly label: string }[];
  readonly itensBateria: readonly { readonly id: number; readonly label: string }[];
  readonly isElectoral: boolean;
}

interface PreviewAnswerValue {
  readonly label: string;
  readonly idOpcao: number | null;
  readonly idItemBateria?: number | null;
  readonly idCandidatoProduto: number | null;
  readonly valorTexto: string | null;
  readonly codigoEspecial: string | null;
  readonly tipoRegistro: TipoRegistro;
}

interface SavedInterviewResult {
  readonly id_questionario_pessoa: number;
  readonly respostas_salvas: number;
}

function getCandidateInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "?";
  const last = parts[parts.length - 1];
  if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function resolveCandidatePhotoUrl(candidateId: number, fotoUrl?: string | null): string | null {
  const raw = fotoUrl?.trim();
  if (!raw) return null;
  if (raw.includes(`/candidatos/${candidateId}/foto`)) return raw;
  return `${API_BASE}/candidatos/${candidateId}/foto`;
}

function resolveOptionTipoRegistro(tipoEscala: string | null, texto: string): TipoRegistro {
  if (tipoEscala && /likert|ordinal/i.test(tipoEscala)) return "likert";
  if (/aprov|avali|administra/i.test(texto)) return "aprovacao";
  return "likert";
}

function resolveCandidateTipoRegistro(cenarioTipo: string | null, texto: string): TipoRegistro {
  if (cenarioTipo?.toLowerCase() === "rejeicao" || /rejei[cç]|n[aã]o votaria/i.test(texto)) {
    return "rejeicao";
  }
  return "voto_direto";
}

export function SurveyAppPreviewFeature(): React.JSX.Element {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [questionarios, setQuestionarios] = useState<readonly BackendQuestionario[]>([]);
  const [qpLinks, setQpLinks] = useState<readonly BackendQuestionarioPergunta[]>([]);
  const [perguntas, setPerguntas] = useState<readonly BackendPergunta[]>([]);
  const [opcoesResposta, setOpcoesResposta] = useState<readonly BackendOpcaoResposta[]>([]);
  const [itensBateria, setItensBateria] = useState<readonly BackendItemBateria[]>([]);
  const [batteryAnswers, setBatteryAnswers] = useState<Record<string, PreviewAnswerValue>>({});
  const [cenarios, setCenarios] = useState<readonly BackendCenario[]>([]);
  const [cenarioCandidatos, setCenarioCandidatos] = useState<readonly BackendCenarioCandidato[]>([]);

  const [selectedQuestionarioId, setSelectedQuestionarioId] = useState<number | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);

  // Interactive simulation state
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, PreviewAnswerValue>>({});
  const [rotationOffset, setRotationOffset] = useState<number>(0);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [failedPhotoUrls, setFailedPhotoUrls] = useState<Record<string, boolean>>({});

  // Persistence state
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedResult, setSavedResult] = useState<SavedInterviewResult | null>(null);

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_RESUMO, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Falha HTTP ${res.status} ao carregar dados da prévia.`);
      }
      const data = (await res.json()) as ResumoPayload;
      const loadedQuests = Array.isArray(data.questionarios) ? data.questionarios : [];
      const loadedLinks = Array.isArray(data.questionario_perguntas) ? data.questionario_perguntas : [];
      const loadedPerguntas = Array.isArray(data.perguntas) ? data.perguntas : [];
      const loadedOpcoes = Array.isArray(data.opcoes_resposta) ? data.opcoes_resposta : [];
      const loadedCenarios = Array.isArray(data.cenarios_pesquisa)
        ? data.cenarios_pesquisa
        : Array.isArray(data.cenarios)
          ? data.cenarios
          : [];
      const loadedCC = Array.isArray(data.cenario_candidatos) ? data.cenario_candidatos : [];

      setQuestionarios(loadedQuests);
      setQpLinks(loadedLinks);
      setPerguntas(loadedPerguntas);
      setOpcoesResposta(loadedOpcoes);
      setItensBateria(Array.isArray(data.itens_bateria) ? data.itens_bateria : []);
      setCenarios(loadedCenarios);
      setCenarioCandidatos(loadedCC);
      setFailedPhotoUrls({});

      const firstQuest = loadedQuests[0] ?? null;
      setSelectedQuestionarioId((prev) => prev ?? firstQuest?.id_questionario ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar prévia do app.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedQuestionario = useMemo(
    () => questionarios.find((q) => q.id_questionario === selectedQuestionarioId) ?? null,
    [questionarios, selectedQuestionarioId],
  );

  // Filter sidebar scenarios strictly to the selected questionnaire's id_pesquisa
  const scenarioList = useMemo(() => {
    if (selectedQuestionario?.id_pesquisa == null) return cenarios;
    return cenarios.filter((c) => c.id_pesquisa === selectedQuestionario.id_pesquisa);
  }, [cenarios, selectedQuestionario]);

  // Keep selectedScenarioId valid for the active questionnaire's pesquisa
  useEffect(() => {
    if (scenarioList.length === 0) {
      setSelectedScenarioId(null);
      return;
    }
    const stillValid = scenarioList.some((c) => c.id_cenario === selectedScenarioId);
    if (!stillValid) {
      setSelectedScenarioId(scenarioList[0]?.id_cenario ?? null);
    }
  }, [scenarioList, selectedScenarioId]);

  // All questions of the formulário grouped by id_cenario (Cenário 1, Cenário 2, ..., Bloco Geral)
  const previewQuestions: readonly PreviewQuestionItem[] = useMemo(() => {
    if (selectedQuestionarioId === null) return [];

    const perguntaMap = new Map<number, BackendPergunta>();
    for (const p of perguntas) {
      perguntaMap.set(p.id_pergunta, p);
    }

    const cenarioMap = new Map<number, BackendCenario>();
    for (const c of cenarios) {
      cenarioMap.set(c.id_cenario, c);
    }

    const scenarioOrderIndex = new Map<number, number>();
    scenarioList.forEach((sc, idx) => {
      scenarioOrderIndex.set(sc.id_cenario, idx);
    });

    const filteredLinks = qpLinks.filter((qp) => qp.id_questionario === selectedQuestionarioId);

    // Group order: linked scenarios in scenarioList order, then any other non-null scenario, then null (Bloco Geral)
    const sortedLinks = [...filteredLinks].sort((a, b) => {
      const aSc = a.id_cenario ?? null;
      const bSc = b.id_cenario ?? null;
      const aGroupRank =
        aSc === null
          ? Number.MAX_SAFE_INTEGER
          : (scenarioOrderIndex.get(aSc) ?? scenarioList.length + aSc);
      const bGroupRank =
        bSc === null
          ? Number.MAX_SAFE_INTEGER
          : (scenarioOrderIndex.get(bSc) ?? scenarioList.length + bSc);
      if (aGroupRank !== bGroupRank) return aGroupRank - bGroupRank;
      return (a.ordem ?? 999) - (b.ordem ?? 999);
    });

    return sortedLinks.map((link, idx) => {
      const p = perguntaMap.get(link.id_pergunta);
      const texto =
        link.enunciado?.trim() ||
        link.texto_pergunta?.trim() ||
        p?.enunciado?.trim() ||
        p?.texto_pergunta?.trim() ||
        `Pergunta #${link.id_pergunta}`;
      const grupoId = p?.id_grupo_opcao ?? null;
      const opcoes =
        grupoId !== null
          ? opcoesResposta
              .filter((o) => o.id_grupo_opcao === grupoId)
              .sort((a, b) => (a.ordem ?? a.id_opcao) - (b.ordem ?? b.id_opcao))
              .map((o) => ({
                id: o.id_opcao,
                label:
                  o.texto_opcao?.trim() ||
                  o.rotulo?.trim() ||
                  o.descricao?.trim() ||
                  `Opção #${o.id_opcao}`,
              }))
          : [];

      const itensDaPergunta = itensBateria
        .filter((ib) => ib.id_pergunta === link.id_pergunta)
        .sort((a, b) => (a.ordem ?? a.id_item_bateria) - (b.ordem ?? b.id_item_bateria))
        .map((ib) => ({
          id: ib.id_item_bateria,
          label: ib.rotulo_item?.trim() || `Item #${ib.id_item_bateria}`,
        }));

      const idCenario = link.id_cenario ?? null;
      const scObj = idCenario !== null ? cenarioMap.get(idCenario) : undefined;
      const cenarioNome =
        link.cenario_identificador?.trim() ||
        scObj?.identificador?.trim() ||
        (idCenario !== null ? `Cenário #${idCenario}` : link.secao_bloco?.trim() || "Bloco Geral");
      const cenarioTipo = link.cenario_tipo ?? scObj?.tipo_cenario ?? null;

      const lowerText = texto.toLowerCase();
      const isElectoral =
        opcoes.length === 0 &&
        (lowerText.includes("voto") ||
          lowerText.includes("votaria") ||
          lowerText.includes("candidat") ||
          lowerText.includes("rejei") ||
          lowerText.includes("eleiç") ||
          idCenario !== null);

      const idQp = link.id_questionario_pergunta ?? link.id_pergunta * 1000 + idx;

      return {
        key: `${idQp}-${idCenario ?? "geral"}-${idx}`,
        idQuestionarioPergunta: idQp,
        idPergunta: link.id_pergunta,
        idCenario,
        cenarioNome,
        cenarioTipo,
        ordem: link.ordem ?? idx + 1,
        obrigatoria: Boolean(link.obrigatoria),
        texto,
        grupoNome: link.nome_grupo ?? p?.nome_grupo ?? null,
        tipoEscala: link.tipo_escala ?? p?.tipo_escala ?? null,
        opcoes,
        itensBateria: itensDaPergunta,
        isElectoral,
      };
    });
  }, [selectedQuestionarioId, qpLinks, perguntas, opcoesResposta, itensBateria, cenarios, scenarioList]);

  const currentQuestion = previewQuestions[stepIndex] ?? null;

  // Scenario associated with the current question (or fallback to sidebar-selected scenario only for unlinked electoral questions)
  const effectiveCartelaScenarioId = useMemo(() => {
    if (!currentQuestion) return null;
    // NEVER render a candidate cartela underneath standard Likert/categorical options
    if (currentQuestion.opcoes.length > 0) return null;
    if (currentQuestion.idCenario !== null) return currentQuestion.idCenario;
    if (currentQuestion.isElectoral) return selectedScenarioId;
    return null;
  }, [currentQuestion, selectedScenarioId]);

  const effectiveCartelaScenario = useMemo(
    () => cenarios.find((c) => c.id_cenario === effectiveCartelaScenarioId) ?? null,
    [cenarios, effectiveCartelaScenarioId],
  );

  // Ordered candidates for the active question's scenario with anti-bias disk rotation
  const rotatedCandidates = useMemo(() => {
    if (effectiveCartelaScenarioId === null) return [];
    const base = cenarioCandidatos
      .filter((cc) => cc.id_cenario === effectiveCartelaScenarioId)
      .sort((a, b) => (a.ordem_apresentacao ?? 999) - (b.ordem_apresentacao ?? 999));
    if (base.length <= 1) return base;
    const shift = ((rotationOffset % base.length) + base.length) % base.length;
    return [...base.slice(shift), ...base.slice(0, shift)];
  }, [cenarioCandidatos, effectiveCartelaScenarioId, rotationOffset]);

  const shouldShowCartela =
    currentQuestion !== null &&
    currentQuestion.opcoes.length === 0 &&
    currentQuestion.itensBateria.length === 0 &&
    rotatedCandidates.length > 0;

  const shouldShowFreeText =
    currentQuestion !== null &&
    currentQuestion.opcoes.length === 0 &&
    currentQuestion.itensBateria.length === 0 &&
    rotatedCandidates.length === 0;

  const highlightedScenarioId =
    currentQuestion?.idCenario !== null && currentQuestion?.idCenario !== undefined
      ? currentQuestion.idCenario
      : selectedScenarioId;

  const handleSelectQuestionario = (id: number): void => {
    setSelectedQuestionarioId(id);
    setStepIndex(0);
    setAnswers({});
    setBatteryAnswers({});
    setShowSummary(false);
    setSaveError(null);
    setSavedResult(null);
  };

  const handleSelectScenario = (id: number): void => {
    setSelectedScenarioId(id);
    setRotationOffset(0);
    setShowSummary(false);
    const firstIdx = previewQuestions.findIndex((q) => q.idCenario === id);
    if (firstIdx >= 0) {
      setStepIndex(firstIdx);
    }
  };

  const handleRotateDisk = (): void => {
    if (rotatedCandidates.length <= 1) return;
    setRotationOffset((prev) => prev + 1);
  };

  const handleSelectAnswer = (idQp: number, value: PreviewAnswerValue): void => {
    setAnswers((prev) => ({ ...prev, [idQp]: value }));
    setSavedResult(null);
    setSaveError(null);
  };

  const handleRestart = (): void => {
    setStepIndex(0);
    setAnswers({});
    setBatteryAnswers({});
    setShowSummary(false);
    setSaveError(null);
    setSavedResult(null);
  };

  const handleImageError = (url: string): void => {
    setFailedPhotoUrls((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  };

  const handleSaveInterview = async (): Promise<void> => {
    if (!selectedQuestionario || selectedQuestionario.id_pesquisa == null) {
      setSaveError("Questionário sem pesquisa vinculada.");
      return;
    }

    const batteryPayload = previewQuestions.flatMap((q) =>
      q.itensBateria
        .map((item) => {
          const ans = batteryAnswers[`${q.idQuestionarioPergunta}:${item.id}`];
          if (!ans) return null;
          return {
            id_questionario_pergunta: q.idQuestionarioPergunta,
            id_cenario: q.idCenario,
            id_opcao: ans.idOpcao,
            id_item_bateria: item.id,
            id_candidato_produto: null,
            tipo_registro: ans.tipoRegistro,
            codigo_especial: null,
            valor_texto: null,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    );

    const respostasSimples = previewQuestions
      .filter((q) => q.itensBateria.length === 0)
      .map((q) => {
        const ans = answers[q.idQuestionarioPergunta];
        if (!ans) return null;
        return {
          id_questionario_pergunta: q.idQuestionarioPergunta,
          id_cenario: q.idCenario ?? (ans.idCandidatoProduto != null ? selectedScenarioId : null),
          id_opcao: ans.idOpcao,
          id_candidato_produto: ans.idCandidatoProduto,
          tipo_registro: ans.tipoRegistro,
          codigo_especial: ans.codigoEspecial,
          valor_texto: ans.valorTexto,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const respostasPayload = [...respostasSimples, ...batteryPayload];

    if (respostasPayload.length === 0) {
      setSaveError("Responda pelo menos uma pergunta antes de salvar no banco.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSavedResult(null);
    try {
      const res = await fetch(API_ENTREVISTAS, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          id_pesquisa: selectedQuestionario.id_pesquisa,
          id_questionario: selectedQuestionario.id_questionario,
          respostas: respostasPayload,
        }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(errBody.detail ?? `Falha HTTP ${res.status} ao salvar entrevista.`);
      }
      const result = (await res.json()) as SavedInterviewResult;
      setSavedResult(result);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar entrevista no PostgreSQL.");
    } finally {
      setSaving(false);
    }
  };

  const isQuestionAnswered = (q: PreviewQuestionItem): boolean =>
    q.itensBateria.length > 0
      ? q.itensBateria.some((it) => Boolean(batteryAnswers[`${q.idQuestionarioPergunta}:${it.id}`]))
      : Boolean(answers[q.idQuestionarioPergunta]);

  const answeredCount = previewQuestions.filter(isQuestionAnswered).length;

  return (
    <div
      data-testid="survey-app-preview-page"
      style={{ display: "flex", flexDirection: "column", gap: "18px", width: "100%" }}
    >
      {/* Header */}
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
            Prévia do App do Eleitor
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: "13px", color: colors.textMuted }}>
            Fluxo completo de todas as perguntas por cenário, rotação anti-viés das cartelas e gravação real no PostgreSQL.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          style={{
            padding: "8px 14px",
            borderRadius: "10px",
            border: `1px solid ${colors.borderSubtle}`,
            backgroundColor: "transparent",
            color: colors.textPrimary,
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Atualizar Dados
        </button>
      </header>

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          style={{
            padding: "12px 14px",
            borderRadius: "12px",
            backgroundColor: "rgba(242, 139, 130, 0.12)",
            border: `1px solid ${colors.errorPastel}`,
            color: colors.errorPastel,
            fontSize: "13px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadData()}
            style={{
              padding: "5px 10px",
              borderRadius: "8px",
              border: `1px solid ${colors.errorPastel}`,
              backgroundColor: "transparent",
              color: colors.errorPastel,
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Split Master-Detail Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(280px, 340px) minmax(0, 1fr)",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* LEFT PANE: Questionnaire & Scenarios of its Pesquisa */}
        <aside
          style={{
            backgroundColor: colors.surfaceCard,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: "16px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Questionnaire Selector */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 600,
                color: colors.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "6px",
              }}
            >
              Questionário em Prévia
            </label>
            <select
              data-testid="select-preview-questionnaire"
              value={selectedQuestionarioId !== null ? String(selectedQuestionarioId) : ""}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (Number.isFinite(val) && val > 0) handleSelectQuestionario(val);
              }}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "9px 12px",
                borderRadius: "10px",
                border: `1px solid ${colors.borderSubtle}`,
                backgroundColor: colors.surfaceContainerLow,
                color: colors.textPrimary,
                fontSize: "13px",
                outline: "none",
              }}
            >
              {questionarios.length === 0 ? (
                <option value="">Nenhum questionário disponível</option>
              ) : (
                questionarios.map((q) => {
                  const ver = q.codigo_versao || q.versao;
                  return (
                    <option key={q.id_questionario} value={String(q.id_questionario)}>
                      {q.titulo?.trim() || `Questionário #${q.id_questionario}`}
                      {ver ? ` (${ver})` : ""}
                    </option>
                  );
                })
              )}
            </select>
            {selectedQuestionario?.pesquisa_nome && (
              <div style={{ marginTop: "6px", fontSize: "11px", color: colors.textMuted }}>
                Pesquisa: <strong style={{ color: colors.textPrimary }}>{selectedQuestionario.pesquisa_nome}</strong>
              </div>
            )}
          </div>

          {/* Scenarios List (filtered strictly to selected questionnaire's id_pesquisa) */}
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: colors.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "8px",
              }}
            >
              Cenários da Pesquisa ({scenarioList.length})
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ height: "54px", borderRadius: "12px", backgroundColor: colors.surfaceContainerHigh, opacity: 0.6 }} />
                <div style={{ height: "54px", borderRadius: "12px", backgroundColor: colors.surfaceContainerHigh, opacity: 0.4 }} />
              </div>
            ) : scenarioList.length === 0 ? (
              <div
                style={{
                  padding: "16px",
                  borderRadius: "12px",
                  border: `1px dashed ${colors.borderSubtle}`,
                  textAlign: "center",
                  color: colors.textMuted,
                  fontSize: "12px",
                }}
              >
                Nenhum cenário cadastrado para esta pesquisa.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {scenarioList.map((sc) => {
                  const candCount = cenarioCandidatos.filter(
                    (cc) => cc.id_cenario === sc.id_cenario,
                  ).length;
                  const questionCount = previewQuestions.filter(
                    (q) => q.idCenario === sc.id_cenario,
                  ).length;
                  const active = sc.id_cenario === highlightedScenarioId;
                  return (
                    <button
                      key={sc.id_cenario}
                      type="button"
                      data-testid={`preview-scenario-${sc.id_cenario}`}
                      onClick={() => handleSelectScenario(sc.id_cenario)}
                      style={{
                        textAlign: "left",
                        padding: "12px",
                        borderRadius: "12px",
                        border: `1px solid ${active ? colors.primaryContainer : colors.borderSubtle}`,
                        backgroundColor: active
                          ? "rgba(138, 180, 248, 0.1)"
                          : colors.surfaceContainerLow,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: active ? colors.primary : colors.textPrimary }}>
                          {sc.identificador?.trim() || `Cenário #${sc.id_cenario}`}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            padding: "2px 7px",
                            borderRadius: "9999px",
                            backgroundColor: colors.surfaceContainerHigh,
                            color: colors.textMuted,
                            textTransform: "uppercase",
                          }}
                        >
                          {sc.tipo_cenario || "estimulado"}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", fontSize: "11px" }}>
                        <span style={{ color: colors.primary, fontWeight: 500 }}>
                          {questionCount} pergunta(s)
                        </span>
                        <span style={{ color: colors.successPastel, fontWeight: 500 }}>
                          {candCount} candidato(s)
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT PANE: Interactive Mobile/Tablet Device Preview */}
        <section
          style={{
            backgroundColor: colors.surfaceCard,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: "16px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          {/* Device Frame */}
          <div
            data-testid="voter-app-device-frame"
            style={{
              width: "100%",
              maxWidth: "460px",
              minHeight: "540px",
              backgroundColor: colors.surfaceContainerLow,
              border: `2px solid ${colors.borderSubtle}`,
              borderRadius: "28px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: "16px",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35)",
            }}
          >
            {/* Device Top Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: `1px solid ${colors.borderSubtle}`,
                paddingBottom: "12px",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 700, color: colors.primary }}>
                PesquisaMaster • Campo
              </span>
              {!showSummary && previewQuestions.length > 0 && (
                <span style={{ fontSize: "11px", fontWeight: 600, color: colors.textMuted }}>
                  Pergunta {stepIndex + 1} de {previewQuestions.length}
                </span>
              )}
            </div>

            {/* Device Body */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "12px" }}>
                  <div style={{ height: "28px", borderRadius: "8px", backgroundColor: colors.surfaceContainerHigh, opacity: 0.6 }} />
                  <div style={{ height: "48px", borderRadius: "12px", backgroundColor: colors.surfaceContainerHigh, opacity: 0.4 }} />
                  <div style={{ height: "48px", borderRadius: "12px", backgroundColor: colors.surfaceContainerHigh, opacity: 0.3 }} />
                </div>
              ) : showSummary ? (
                <div data-testid="preview-simulation-summary" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ fontSize: "16px", fontWeight: 600, color: colors.textPrimary }}>
                    Resumo da Entrevista
                  </div>
                  <div style={{ fontSize: "12px", color: colors.textMuted }}>
                    {answeredCount} de {previewQuestions.length} pergunta(s) respondida(s).
                  </div>

                  {saveError && (
                    <div
                      role="alert"
                      style={{
                        padding: "10px 12px",
                        borderRadius: "10px",
                        backgroundColor: "rgba(242, 139, 130, 0.12)",
                        border: `1px solid ${colors.errorPastel}`,
                        color: colors.errorPastel,
                        fontSize: "12px",
                      }}
                    >
                      {saveError}
                    </div>
                  )}

                  {savedResult && (
                    <div
                      data-testid="preview-save-confirmation"
                      style={{
                        padding: "10px 12px",
                        borderRadius: "10px",
                        backgroundColor: "rgba(129, 201, 149, 0.14)",
                        border: `1px solid ${colors.successPastel}`,
                        color: colors.successPastel,
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      Entrevista salva no PostgreSQL! Sessão #{savedResult.id_questionario_pessoa} •{" "}
                      {savedResult.respostas_salvas} resposta(s) gravada(s).
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
                    {previewQuestions.map((q, idx) => {
                      const ans = answers[q.idQuestionarioPergunta];
                      return (
                        <div
                          key={q.key}
                          style={{
                            padding: "10px 12px",
                            borderRadius: "10px",
                            backgroundColor: colors.surfaceCard,
                            border: `1px solid ${colors.borderSubtle}`,
                          }}
                        >
                          <div style={{ fontSize: "10px", fontWeight: 700, color: colors.primary, textTransform: "uppercase", marginBottom: "2px" }}>
                            Cenário: {q.cenarioNome}
                          </div>
                          <div style={{ fontSize: "11px", color: colors.textMuted }}>
                            {idx + 1}. {q.texto}
                          </div>
                          {q.itensBateria.length > 0 ? (
                            q.itensBateria.map((it) => (
                              <div key={it.id} style={{ fontSize: "12px", marginTop: "3px", color: colors.textPrimary }}>
                                <span style={{ color: colors.textMuted }}>{it.label}: </span>
                                <strong>{batteryAnswers[`${q.idQuestionarioPergunta}:${it.id}`]?.label ?? "Não respondido"}</strong>
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: "13px", fontWeight: 600, color: ans ? colors.textPrimary : colors.textMuted, marginTop: "4px" }}>
                              {ans?.label ?? "Não respondida"}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : !currentQuestion ? (
                <div
                  style={{
                    padding: "32px 16px",
                    textAlign: "center",
                    color: colors.textMuted,
                    fontSize: "13px",
                  }}
                >
                  Nenhuma pergunta vinculada a este questionário. Selecione outro questionário ou vincule perguntas no Construtor.
                </div>
              ) : (
                <>
                  {/* Progress Bar */}
                  <div
                    style={{
                      width: "100%",
                      height: "4px",
                      borderRadius: "9999px",
                      backgroundColor: colors.surfaceContainerHigh,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.round(((stepIndex + 1) / previewQuestions.length) * 100)}%`,
                        height: "100%",
                        backgroundColor: colors.primaryContainer,
                        transition: "width 0.2s ease",
                      }}
                    />
                  </div>

                  {/* Scenario Badge */}
                  <div
                    data-testid="preview-current-scenario-badge"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      padding: "6px 10px",
                      borderRadius: "10px",
                      backgroundColor: "rgba(138, 180, 248, 0.12)",
                      border: `1px solid ${colors.primaryContainer}`,
                    }}
                  >
                    <span style={{ fontSize: "11px", fontWeight: 700, color: colors.primary }}>
                      {currentQuestion.idCenario !== null
                        ? `Cenário: ${currentQuestion.cenarioNome}`
                        : `Bloco Geral`}
                    </span>
                    {currentQuestion.cenarioTipo && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          padding: "1px 6px",
                          borderRadius: "9999px",
                          backgroundColor: colors.surfaceContainerHigh,
                          color: colors.textMuted,
                          textTransform: "uppercase",
                        }}
                      >
                        {currentQuestion.cenarioTipo}
                      </span>
                    )}
                  </div>

                  {/* Question Header */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      {currentQuestion.obrigatoria && (
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "9999px",
                            backgroundColor: colors.warningContainer,
                            color: colors.onWarningContainer,
                          }}
                        >
                          Obrigatória
                        </span>
                      )}
                      {currentQuestion.grupoNome && (
                        <span style={{ fontSize: "11px", color: colors.textMuted }}>
                          {currentQuestion.grupoNome}
                        </span>
                      )}
                    </div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "16px",
                        fontWeight: 600,
                        color: colors.textPrimary,
                        lineHeight: "22px",
                      }}
                    >
                      {currentQuestion.texto}
                    </h3>
                  </div>

                  {/* Standard Likert / Categorical Answer Options (NO Cartela underneath) */}
                  {currentQuestion.opcoes.length > 0 && currentQuestion.itensBateria.length > 0 && (
                    <div data-testid="preview-battery-matrix" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {currentQuestion.itensBateria.map((item) => {
                        const bKey = `${currentQuestion.idQuestionarioPergunta}:${item.id}`;
                        return (
                          <div
                            key={item.id}
                            style={{
                              padding: "10px 12px",
                              borderRadius: "12px",
                              border: `1px solid ${colors.borderSubtle}`,
                              backgroundColor: colors.surfaceCard,
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                            <div style={{ fontSize: "13px", fontWeight: 600, color: colors.textPrimary }}>{item.label}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                              {currentQuestion.opcoes.map((opt) => {
                                const selected = batteryAnswers[bKey]?.idOpcao === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                      setBatteryAnswers((prev) => ({
                                        ...prev,
                                        [bKey]: {
                                          label: opt.label,
                                          idOpcao: opt.id,
                                          idItemBateria: item.id,
                                          idCandidatoProduto: null,
                                          valorTexto: null,
                                          codigoEspecial: null,
                                          tipoRegistro: resolveOptionTipoRegistro(currentQuestion.tipoEscala, currentQuestion.texto),
                                        },
                                      }));
                                      setSavedResult(null);
                                      setSaveError(null);
                                    }}
                                    style={{
                                      padding: "6px 10px",
                                      borderRadius: "9999px",
                                      border: `1px solid ${selected ? colors.primaryContainer : colors.borderSubtle}`,
                                      backgroundColor: selected ? "rgba(138, 180, 248, 0.16)" : colors.surfaceContainerLow,
                                      color: selected ? colors.primary : colors.textPrimary,
                                      fontSize: "12px",
                                      fontWeight: selected ? 600 : 500,
                                      cursor: "pointer",
                                    }}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion.opcoes.length > 0 && currentQuestion.itensBateria.length === 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {currentQuestion.opcoes.map((opt) => {
                        const selected =
                          answers[currentQuestion.idQuestionarioPergunta]?.idOpcao === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              handleSelectAnswer(currentQuestion.idQuestionarioPergunta, {
                                label: opt.label,
                                idOpcao: opt.id,
                                idCandidatoProduto: null,
                                valorTexto: null,
                                codigoEspecial: null,
                                tipoRegistro: resolveOptionTipoRegistro(
                                  currentQuestion.tipoEscala,
                                  currentQuestion.texto,
                                ),
                              })
                            }
                            style={{
                              textAlign: "left",
                              padding: "11px 14px",
                              borderRadius: "12px",
                              border: `1px solid ${selected ? colors.primaryContainer : colors.borderSubtle}`,
                              backgroundColor: selected
                                ? "rgba(138, 180, 248, 0.16)"
                                : colors.surfaceCard,
                              color: selected ? colors.primary : colors.textPrimary,
                              fontSize: "13px",
                              fontWeight: selected ? 600 : 500,
                              cursor: "pointer",
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Candidate Disk / Cartela de Candidatos (ONLY when opcoes.length === 0 and scenario has candidates) */}
                  {shouldShowCartela && (
                    <div
                      data-testid="preview-candidate-cartela"
                      style={{
                        marginTop: "4px",
                        padding: "12px",
                        borderRadius: "14px",
                        backgroundColor: colors.surfaceCard,
                        border: `1px solid ${colors.borderSubtle}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase" }}>
                          Cartela: {effectiveCartelaScenario?.identificador || `Cenário #${effectiveCartelaScenarioId}`}
                        </span>
                        <button
                          type="button"
                          data-testid="btn-rotate-candidate-disk"
                          onClick={handleRotateDisk}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "8px",
                            border: `1px solid ${colors.borderSubtle}`,
                            backgroundColor: colors.surfaceContainerHigh,
                            color: colors.primary,
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Girar Disco
                        </button>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {rotatedCandidates.map((cand, idx) => {
                          const displayName =
                            cand.nome_urna_comercial || `Candidato #${cand.id_candidato_produto}`;
                          const label = `${displayName} (${cand.sigla_partido_marca || "Sem Partido"})`;
                          const selected =
                            answers[currentQuestion.idQuestionarioPergunta]?.idCandidatoProduto ===
                            cand.id_candidato_produto;
                          const photoUrl = resolveCandidatePhotoUrl(cand.id_candidato_produto, cand.foto_url);
                          const showImage = photoUrl !== null && !failedPhotoUrls[photoUrl];

                          return (
                            <button
                              key={cand.id_candidato_produto}
                              type="button"
                              onClick={() =>
                                handleSelectAnswer(currentQuestion.idQuestionarioPergunta, {
                                  label,
                                  idOpcao: null,
                                  idCandidatoProduto: cand.id_candidato_produto,
                                  valorTexto: null,
                                  codigoEspecial: null,
                                  tipoRegistro: resolveCandidateTipoRegistro(
                                    currentQuestion.cenarioTipo ?? effectiveCartelaScenario?.tipo_cenario ?? null,
                                    currentQuestion.texto,
                                  ),
                                })
                              }
                              style={{
                                textAlign: "left",
                                padding: "10px 12px",
                                borderRadius: "10px",
                                border: `1px solid ${selected ? colors.primaryContainer : colors.borderSubtle}`,
                                backgroundColor: selected
                                  ? "rgba(138, 180, 248, 0.16)"
                                  : colors.surfaceContainerLow,
                                cursor: "pointer",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                <div
                                  style={{
                                    width: "38px",
                                    height: "38px",
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    border: "1.5px solid var(--outline-variant, #424750)",
                                    backgroundColor: "var(--surface-elevated, #2a2a2a)",
                                    color: "var(--text-muted, #9aa0a6)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 700,
                                    fontSize: "12px",
                                    flexShrink: 0,
                                  }}
                                >
                                  {showImage ? (
                                    <img
                                      src={photoUrl}
                                      alt={displayName}
                                      onError={() => handleImageError(photoUrl)}
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        borderRadius: "50%",
                                        display: "block",
                                      }}
                                    />
                                  ) : (
                                    getCandidateInitials(displayName)
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontSize: "13px", fontWeight: 600, color: selected ? colors.primary : colors.textPrimary }}>
                                    {idx + 1}. {displayName}
                                  </div>
                                  {cand.cargo_categoria && (
                                    <div style={{ fontSize: "11px", color: colors.textMuted }}>
                                      {cand.cargo_categoria}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  padding: "2px 7px",
                                  borderRadius: "6px",
                                  backgroundColor: colors.surfaceContainerHigh,
                                  color: colors.warningPastel,
                                }}
                              >
                                {cand.sigla_partido_marca || "S/P"}
                              </span>
                            </button>
                          );
                        })}

                        {/* Fixed special electoral options */}
                        {(
                          [
                            { code: "BRANCO_NULO", label: "Branco / Nulo" },
                            { code: "NS_NR", label: "Não Sabe / Não Respondeu" },
                          ] as const
                        ).map((special) => {
                          const selected =
                            answers[currentQuestion.idQuestionarioPergunta]?.codigoEspecial ===
                            special.code;
                          return (
                            <button
                              key={special.code}
                              type="button"
                              onClick={() =>
                                handleSelectAnswer(currentQuestion.idQuestionarioPergunta, {
                                  label: special.label,
                                  idOpcao: null,
                                  idCandidatoProduto: null,
                                  valorTexto: null,
                                  codigoEspecial: special.code,
                                  tipoRegistro: resolveCandidateTipoRegistro(
                                    currentQuestion.cenarioTipo ?? effectiveCartelaScenario?.tipo_cenario ?? null,
                                    currentQuestion.texto,
                                  ),
                                })
                              }
                              style={{
                                textAlign: "left",
                                padding: "9px 12px",
                                borderRadius: "10px",
                                border: `1px solid ${selected ? colors.primaryContainer : colors.borderSubtle}`,
                                backgroundColor: selected
                                  ? "rgba(138, 180, 248, 0.16)"
                                  : colors.surfaceContainerLow,
                                color: selected ? colors.primary : colors.textMuted,
                                fontSize: "12px",
                                fontWeight: selected ? 600 : 500,
                                cursor: "pointer",
                              }}
                            >
                              {special.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Free-text input for spontaneous / open-ended questions */}
                  {shouldShowFreeText && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "11px", fontWeight: 600, color: colors.textMuted }}>
                        Resposta Espontânea / Texto Livre
                      </label>
                      <textarea
                        rows={3}
                        data-testid="preview-free-text-input"
                        placeholder="Digite a resposta do entrevistado..."
                        value={answers[currentQuestion.idQuestionarioPergunta]?.valorTexto ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.trim() === "") {
                            setAnswers((prev) => {
                              const next = { ...prev };
                              delete next[currentQuestion.idQuestionarioPergunta];
                              return next;
                            });
                          } else {
                            handleSelectAnswer(currentQuestion.idQuestionarioPergunta, {
                              label: val,
                              idOpcao: null,
                              idCandidatoProduto: null,
                              valorTexto: val,
                              codigoEspecial: null,
                              tipoRegistro: "texto",
                            });
                          }
                        }}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          padding: "10px 12px",
                          borderRadius: "10px",
                          border: `1px solid ${colors.borderSubtle}`,
                          backgroundColor: colors.surfaceCard,
                          color: colors.textPrimary,
                          fontSize: "13px",
                          resize: "vertical",
                          outline: "none",
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Device Footer Navigation */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: `1px solid ${colors.borderSubtle}`,
                paddingTop: "12px",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              {showSummary ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                  <button
                    type="button"
                    data-testid="btn-save-preview-interview"
                    disabled={saving || answeredCount === 0}
                    onClick={() => void handleSaveInterview()}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      borderRadius: "12px",
                      border: "none",
                      backgroundColor:
                        saving || answeredCount === 0
                          ? colors.surfaceContainerHigh
                          : colors.successPastel,
                      color: saving || answeredCount === 0 ? colors.textMuted : "#00391b",
                      fontSize: "13px",
                      fontWeight: 700,
                      cursor: saving || answeredCount === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    {saving ? "Salvando no PostgreSQL..." : "Salvar Entrevista no Banco (PostgreSQL)"}
                  </button>
                  <button
                    type="button"
                    data-testid="btn-restart-preview"
                    onClick={handleRestart}
                    style={{
                      width: "100%",
                      padding: "9px 16px",
                      borderRadius: "12px",
                      border: `1px solid ${colors.borderSubtle}`,
                      backgroundColor: "transparent",
                      color: colors.textPrimary,
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Reiniciar Simulação
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={stepIndex === 0}
                    onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
                    style={{
                      padding: "9px 14px",
                      borderRadius: "10px",
                      border: `1px solid ${colors.borderSubtle}`,
                      backgroundColor: "transparent",
                      color: colors.textPrimary,
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: stepIndex === 0 ? "not-allowed" : "pointer",
                      opacity: stepIndex === 0 ? 0.4 : 1,
                    }}
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    data-testid="btn-next-preview-step"
                    disabled={previewQuestions.length === 0}
                    onClick={() => {
                      if (stepIndex >= previewQuestions.length - 1) {
                        setShowSummary(true);
                      } else {
                        setStepIndex((prev) => prev + 1);
                      }
                    }}
                    style={{
                      padding: "9px 18px",
                      borderRadius: "10px",
                      border: "none",
                      backgroundColor: colors.primaryContainer,
                      color: colors.onPrimary,
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: previewQuestions.length === 0 ? "not-allowed" : "pointer",
                      opacity: previewQuestions.length === 0 ? 0.4 : 1,
                    }}
                  >
                    {stepIndex >= previewQuestions.length - 1 ? "Finalizar" : "Próxima"}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
