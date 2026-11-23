import React, { useState, useEffect, useMemo, useCallback } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors } = NOCTURNE_TOKENS;
const API_RESUMO = "http://127.0.0.1:8000/api/v1/questionarios-db/resumo";

interface BackendQuestionario {
  readonly id_questionario: number;
  readonly titulo?: string | null;
  readonly versao?: string | null;
  readonly id_pesquisa?: number | null;
  readonly pesquisa_nome?: string | null;
}

interface BackendQuestionarioPergunta {
  readonly id_questionario: number;
  readonly id_pergunta: number;
  readonly ordem?: number | null;
  readonly obrigatoria?: boolean | null;
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

function getCandidateInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "?";
  const last = parts[parts.length - 1];
  if (parts.length === 1 || !last) return first.slice(0, 2).toUpperCase();
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

interface ResumoPayload {
  readonly questionarios?: readonly BackendQuestionario[];
  readonly questionario_perguntas?: readonly BackendQuestionarioPergunta[];
  readonly perguntas?: readonly BackendPergunta[];
  readonly opcoes_resposta?: readonly BackendOpcaoResposta[];
  readonly cenarios_pesquisa?: readonly BackendCenario[];
  readonly cenario_candidatos?: readonly BackendCenarioCandidato[];
}

interface PreviewQuestionItem {
  readonly idPergunta: number;
  readonly ordem: number;
  readonly obrigatoria: boolean;
  readonly texto: string;
  readonly grupoNome: string | null;
  readonly tipoEscala: string | null;
  readonly opcoes: readonly { readonly id: string; readonly label: string }[];
  readonly isElectoral: boolean;
}

export function SurveyAppPreviewFeature(): React.JSX.Element {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [questionarios, setQuestionarios] = useState<readonly BackendQuestionario[]>([]);
  const [qpLinks, setQpLinks] = useState<readonly BackendQuestionarioPergunta[]>([]);
  const [perguntas, setPerguntas] = useState<readonly BackendPergunta[]>([]);
  const [opcoesResposta, setOpcoesResposta] = useState<readonly BackendOpcaoResposta[]>([]);
  const [cenarios, setCenarios] = useState<readonly BackendCenario[]>([]);
  const [cenarioCandidatos, setCenarioCandidatos] = useState<readonly BackendCenarioCandidato[]>([]);

  const [selectedScenarioId, setSelectedScenarioId] = useState<number | null>(null);
  const [selectedQuestionarioId, setSelectedQuestionarioId] = useState<number | null>(null);

  // Interactive simulation state
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [rotationOffset, setRotationOffset] = useState<number>(0);
  const [showSummary, setShowSummary] = useState<boolean>(false);

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
      const loadedCenarios = Array.isArray(data.cenarios_pesquisa) ? data.cenarios_pesquisa : [];
      const loadedCC = Array.isArray(data.cenario_candidatos) ? data.cenario_candidatos : [];

      setQuestionarios(loadedQuests);
      setQpLinks(loadedLinks);
      setPerguntas(loadedPerguntas);
      setOpcoesResposta(loadedOpcoes);
      setCenarios(loadedCenarios);
      setCenarioCandidatos(loadedCC);

      const scenariosWithCands = loadedCenarios.filter((c) =>
        loadedCC.some((cc) => cc.id_cenario === c.id_cenario),
      );
      const defaultScenario = scenariosWithCands[0] ?? loadedCenarios[0] ?? null;
      setSelectedScenarioId((prev) => prev ?? defaultScenario?.id_cenario ?? null);
      setSelectedQuestionarioId((prev) => prev ?? loadedQuests[0]?.id_questionario ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar prévia do app.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Scenarios that have candidates in cenario_candidatos (or all if none linked yet)
  const scenarioList = useMemo(() => {
    const withCands = cenarios.filter((c) =>
      cenarioCandidatos.some((cc) => cc.id_cenario === c.id_cenario),
    );
    return withCands.length > 0 ? withCands : cenarios;
  }, [cenarios, cenarioCandidatos]);

  const selectedScenario = useMemo(
    () => cenarios.find((c) => c.id_cenario === selectedScenarioId) ?? null,
    [cenarios, selectedScenarioId],
  );

  // Ordered candidates for selected scenario with anti-bias disk rotation
  const rotatedCandidates = useMemo(() => {
    if (selectedScenarioId === null) return [];
    const base = cenarioCandidatos
      .filter((cc) => cc.id_cenario === selectedScenarioId)
      .sort((a, b) => (a.ordem_apresentacao ?? 999) - (b.ordem_apresentacao ?? 999));
    if (base.length <= 1) return base;
    const shift = ((rotationOffset % base.length) + base.length) % base.length;
    return [...base.slice(shift), ...base.slice(0, shift)];
  }, [cenarioCandidatos, selectedScenarioId, rotationOffset]);

  // Ordered questions for selected questionnaire
  const previewQuestions: readonly PreviewQuestionItem[] = useMemo(() => {
    if (selectedQuestionarioId === null) return [];
    const perguntaMap = new Map<number, BackendPergunta>();
    for (const p of perguntas) {
      perguntaMap.set(p.id_pergunta, p);
    }

    const orderedLinks = qpLinks
      .filter((qp) => qp.id_questionario === selectedQuestionarioId)
      .sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999));

    return orderedLinks.map((link, idx) => {
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
              .map((o) => ({
                id: String(o.id_opcao),
                label: o.texto_opcao?.trim() || o.rotulo?.trim() || o.descricao?.trim() || `Opção #${o.id_opcao}`,
              }))
          : [];
      const lowerText = texto.toLowerCase();
      const isElectoral =
        lowerText.includes("voto") ||
        lowerText.includes("candidat") ||
        lowerText.includes("prefeit") ||
        lowerText.includes("governador") ||
        lowerText.includes("presidente") ||
        lowerText.includes("senador") ||
        lowerText.includes("eleiç") ||
        opcoes.length === 0;

      return {
        idPergunta: link.id_pergunta,
        ordem: link.ordem ?? idx + 1,
        obrigatoria: Boolean(link.obrigatoria),
        texto,
        grupoNome: link.nome_grupo ?? p?.nome_grupo ?? null,
        tipoEscala: link.tipo_escala ?? p?.tipo_escala ?? null,
        opcoes,
        isElectoral,
      };
    });
  }, [selectedQuestionarioId, qpLinks, perguntas, opcoesResposta]);

  const currentQuestion = previewQuestions[stepIndex] ?? null;

  const handleSelectQuestionario = (id: number): void => {
    setSelectedQuestionarioId(id);
    setStepIndex(0);
    setAnswers({});
    setShowSummary(false);
  };

  const handleSelectScenario = (id: number): void => {
    setSelectedScenarioId(id);
    setRotationOffset(0);
  };

  const handleRotateDisk = (): void => {
    if (rotatedCandidates.length <= 1) return;
    setRotationOffset((prev) => prev + 1);
  };

  const handleSelectAnswer = (questionId: number, label: string): void => {
    setAnswers((prev) => ({ ...prev, [questionId]: label }));
  };

  const handleRestart = (): void => {
    setStepIndex(0);
    setAnswers({});
    setShowSummary(false);
  };

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
            Simulação interativa do questionário em campo e teste de rotação anti-viés das cartelas de candidatos.
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
        {/* LEFT PANE: Scenarios & Questionnaire Selector */}
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
                questionarios.map((q) => (
                  <option key={q.id_questionario} value={String(q.id_questionario)}>
                    {q.titulo?.trim() || `Questionário #${q.id_questionario}`}
                    {q.versao ? ` (${q.versao})` : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Scenarios List */}
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
              Cenários com Cartela ({scenarioList.length})
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
                Nenhum cenário cadastrado.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {scenarioList.map((sc) => {
                  const candCount = cenarioCandidatos.filter(
                    (cc) => cc.id_cenario === sc.id_cenario,
                  ).length;
                  const active = sc.id_cenario === selectedScenarioId;
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
                      {sc.pesquisa_nome && (
                        <div style={{ fontSize: "11px", color: colors.textMuted }}>
                          {sc.pesquisa_nome}
                        </div>
                      )}
                      <div style={{ fontSize: "11px", color: colors.successPastel, fontWeight: 500 }}>
                        {candCount} candidato(s) na cartela
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
                    Resumo da Simulação
                  </div>
                  <div style={{ fontSize: "12px", color: colors.textMuted }}>
                    {Object.keys(answers).length} de {previewQuestions.length} pergunta(s) respondida(s).
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "340px", overflowY: "auto" }}>
                    {previewQuestions.map((q, idx) => (
                      <div
                        key={q.idPergunta}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "10px",
                          backgroundColor: colors.surfaceCard,
                          border: `1px solid ${colors.borderSubtle}`,
                        }}
                      >
                        <div style={{ fontSize: "11px", color: colors.textMuted }}>
                          {idx + 1}. {q.texto}
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: colors.primary, marginTop: "4px" }}>
                          {answers[q.idPergunta] ?? "Não respondida"}
                        </div>
                      </div>
                    ))}
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

                  {/* Standard Answer Options */}
                  {currentQuestion.opcoes.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {currentQuestion.opcoes.map((opt) => {
                        const selected = answers[currentQuestion.idPergunta] === opt.label;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleSelectAnswer(currentQuestion.idPergunta, opt.label)}
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

                  {/* Candidate Disk / Cartela de Candidatos */}
                  {(currentQuestion.isElectoral || rotatedCandidates.length > 0) &&
                    rotatedCandidates.length > 0 && (
                      <div
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
                            Cartela: {selectedScenario?.identificador || `Cenário #${selectedScenarioId}`}
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
                            const label = `${cand.nome_urna_comercial || `Candidato #${cand.id_candidato_produto}`} (${cand.sigla_partido_marca || "Sem Partido"})`;
                            const selected = answers[currentQuestion.idPergunta] === label;
                            return (
                              <button
                                key={cand.id_candidato_produto}
                                type="button"
                                onClick={() => handleSelectAnswer(currentQuestion.idPergunta, label)}
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
                                    {cand.foto_url ? (
                                      <img
                                        src={cand.foto_url}
                                        alt={cand.nome_urna_comercial || `Candidato #${cand.id_candidato_produto}`}
                                        style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", display: "block" }}
                                      />
                                    ) : (
                                      getCandidateInitials(cand.nome_urna_comercial || `C${cand.id_candidato_produto}`)
                                    )}
                                  </div>
                                  <div>
                                    <div style={{ fontSize: "13px", fontWeight: 600, color: selected ? colors.primary : colors.textPrimary }}>
                                      {idx + 1}. {cand.nome_urna_comercial || `Candidato #${cand.id_candidato_produto}`}
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
                        </div>
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
              }}
            >
              {showSummary ? (
                <button
                  type="button"
                  data-testid="btn-restart-preview"
                  onClick={handleRestart}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: colors.primaryContainer,
                    color: colors.onPrimary,
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Reiniciar Simulação
                </button>
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
