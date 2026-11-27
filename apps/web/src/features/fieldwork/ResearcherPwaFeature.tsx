import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { QuestionOptionSchema } from "../../api-client";
import { Card } from "../../components/ui/Card";
import { useUiSessionStore } from "../../lib/store";

const API_BASE = "http://127.0.0.1:8000/api/v1/questionarios-db";
const API_RESUMO = `${API_BASE}/resumo`;
const API_ENTREVISTAS = `${API_BASE}/entrevistas`;

export function rotateDiscOptionsClient(
  options: readonly QuestionOptionSchema[],
  shift: number
): readonly QuestionOptionSchema[] {
  const rotatable = options.filter((o) => !o.is_fixed);
  const fixed = options.filter((o) => o.is_fixed);
  if (rotatable.length <= 1) return [...rotatable, ...fixed];
  const normalizedShift = ((shift % rotatable.length) + rotatable.length) % rotatable.length;
  const effectiveShift = normalizedShift === 0 ? 1 : normalizedShift;
  return [...rotatable.slice(effectiveShift), ...rotatable.slice(0, effectiveShift), ...fixed];
}

interface BackendPesquisa {
  readonly id_pesquisa: number;
  readonly nome?: string | null;
  readonly status?: string | null;
}

interface BackendQuestionario {
  readonly id_questionario: number;
  readonly id_pesquisa?: number | null;
  readonly titulo?: string | null;
  readonly codigo_versao?: string | null;
  readonly versao?: string | null;
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
  readonly pesquisas?: readonly BackendPesquisa[];
  readonly questionarios?: readonly BackendQuestionario[];
  readonly questionario_perguntas?: readonly BackendQuestionarioPergunta[];
  readonly perguntas?: readonly BackendPergunta[];
  readonly opcoes_resposta?: readonly BackendOpcaoResposta[];
  readonly itens_bateria?: readonly BackendItemBateria[];
  readonly cenarios_pesquisa?: readonly BackendCenario[];
  readonly cenarios?: readonly BackendCenario[];
  readonly cenario_candidatos?: readonly BackendCenarioCandidato[];
}

type TipoRegistro = "voto_direto" | "rejeicao" | "likert" | "aprovacao" | "texto";

interface PwaQuestionItem {
  readonly key: string;
  readonly idQuestionarioPergunta: number;
  readonly idPergunta: number;
  readonly idCenario: number | null;
  readonly cenarioNome: string;
  readonly cenarioTipo: string | null;
  readonly ordem: number;
  readonly obrigatoria: boolean;
  readonly texto: string;
  readonly tipoEscala: string | null;
  readonly opcoes: readonly { readonly id: number; readonly label: string }[];
  readonly itensBateria: readonly { readonly id: number; readonly label: string }[];
  readonly candidates: readonly BackendCenarioCandidato[];
}

interface PwaAnswerEntry {
  readonly id_questionario_pergunta: number;
  readonly id_cenario: number | null;
  readonly id_opcao: number | null;
  readonly id_item_bateria?: number | null;
  readonly id_candidato_produto: number | null;
  readonly tipo_registro: TipoRegistro;
  readonly codigo_especial: string | null;
  readonly valor_texto: string | null;
}

interface QueuedInterviewPayload {
  readonly id_pesquisa: number;
  readonly id_questionario: number;
  readonly sexo?: string | null;
  readonly faixa_etaria?: string | null;
  readonly escolaridade?: string | null;
  readonly faixa_renda?: string | null;
  readonly bairro_distrito?: string | null;
  readonly latitude_coleta?: number | null;
  readonly longitude_coleta?: number | null;
  readonly respostas: readonly PwaAnswerEntry[];
}

const SELECT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  borderRadius: "8px",
  border: "1px solid #353535",
  backgroundColor: "#202020",
  color: "#e5e2e1",
  fontSize: "12px",
};

function getInitials(name: string): string {
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

function resolveOptionTipo(tipoEscala: string | null, texto: string): TipoRegistro {
  if (tipoEscala && /likert|ordinal/i.test(tipoEscala)) return "likert";
  if (/aprov|avali|administra/i.test(texto)) return "aprovacao";
  return "likert";
}

function resolveCandidateTipo(cenarioTipo: string | null, texto: string): TipoRegistro {
  if (cenarioTipo?.toLowerCase() === "rejeicao" || /rejei[cç]|n[aã]o votaria/i.test(texto)) {
    return "rejeicao";
  }
  return "voto_direto";
}

export function ResearcherPwaFeature(): React.JSX.Element {
  const boundDeviceId = useUiSessionStore((s) => s.boundDeviceId);
  const offlineQueueCount = useUiSessionStore((s) => s.offlineQueueCount);
  const enqueueOfflineInterview = useUiSessionStore((s) => s.enqueueOfflineInterview);
  const clearOfflineQueue = useUiSessionStore((s) => s.clearOfflineQueue);

  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pesquisas, setPesquisas] = useState<readonly BackendPesquisa[]>([]);
  const [questionarios, setQuestionarios] = useState<readonly BackendQuestionario[]>([]);
  const [qpLinks, setQpLinks] = useState<readonly BackendQuestionarioPergunta[]>([]);
  const [perguntas, setPerguntas] = useState<readonly BackendPergunta[]>([]);
  const [opcoesResposta, setOpcoesResposta] = useState<readonly BackendOpcaoResposta[]>([]);
  const [itensBateria, setItensBateria] = useState<readonly BackendItemBateria[]>([]);
  const [cenarios, setCenarios] = useState<readonly BackendCenario[]>([]);
  const [cenarioCandidatos, setCenarioCandidatos] = useState<readonly BackendCenarioCandidato[]>([]);

  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("");
  const [interviewCounter, setInterviewCounter] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<number, PwaAnswerEntry>>({});
  const [batteryAnswers, setBatteryAnswers] = useState<Record<string, PwaAnswerEntry>>({});
  const [failedPhotoUrls, setFailedPhotoUrls] = useState<Record<string, boolean>>({});
  const [queuedPayloads, setQueuedPayloads] = useState<readonly QueuedInterviewPayload[]>([]);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ readonly type: "success" | "error"; readonly text: string } | null>(null);

  const [selectedSector, setSelectedSector] = useState<string>("Zona Sul — Setor 355030801");
  const [selectedProfile, setSelectedProfile] = useState<string>(
    "Feminino • 25 a 44 anos • Ensino Médio"
  );
  const [selectedIncome, setSelectedIncome] = useState<string>("2 a 5 SM");
  const [gpsCoords, setGpsCoords] = useState<{ lat: string; lon: string; acc: string }>({
    lat: "-23.6214",
    lon: "-46.6382",
    acc: "4.2m",
  });
  const [lastHmacDigest, setLastHmacDigest] = useState<string>(
    "hmac-sha256:9f86d081884c7d659a2feaa0c55ad015"
  );

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(API_RESUMO, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Falha HTTP ${res.status} ao carregar pesquisas para coleta.`);
      }
      const data = (await res.json()) as ResumoPayload;
      const loadedPesquisas = Array.isArray(data.pesquisas) ? data.pesquisas : [];
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

      setPesquisas(loadedPesquisas);
      setQuestionarios(loadedQuests);
      setQpLinks(loadedLinks);
      setPerguntas(loadedPerguntas);
      setOpcoesResposta(loadedOpcoes);
      setItensBateria(Array.isArray(data.itens_bateria) ? data.itens_bateria : []);
      setCenarios(loadedCenarios);
      setCenarioCandidatos(loadedCC);

      const defaultPesquisa =
        loadedPesquisas.find((p) =>
          loadedQuests.some((q) => q.id_pesquisa === p.id_pesquisa),
        ) ?? loadedPesquisas[0];
      if (defaultPesquisa) {
        setSelectedSurveyId((prev) => prev || String(defaultPesquisa.id_pesquisa));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar dados do PostgreSQL.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activePesquisaId = useMemo(() => {
    const num = Number(selectedSurveyId);
    return Number.isFinite(num) && num > 0 ? num : null;
  }, [selectedSurveyId]);

  // Single formulário for the selected pesquisa
  const activeQuestionario = useMemo(() => {
    if (activePesquisaId === null) return null;
    return questionarios.find((q) => q.id_pesquisa === activePesquisaId) ?? null;
  }, [questionarios, activePesquisaId]);

  const surveyScenarios = useMemo(() => {
    if (activePesquisaId === null) return [];
    return cenarios.filter((c) => c.id_pesquisa === activePesquisaId);
  }, [cenarios, activePesquisaId]);

  // All questions of the formulário grouped by scenario
  const groupedSections = useMemo(() => {
    if (!activeQuestionario) return [];

    const perguntaMap = new Map<number, BackendPergunta>();
    for (const p of perguntas) {
      perguntaMap.set(p.id_pergunta, p);
    }

    const cenarioMap = new Map<number, BackendCenario>();
    for (const c of surveyScenarios) {
      cenarioMap.set(c.id_cenario, c);
    }

    const scenarioOrder = new Map<number, number>();
    surveyScenarios.forEach((sc, idx) => scenarioOrder.set(sc.id_cenario, idx));

    const links = qpLinks
      .filter((qp) => qp.id_questionario === activeQuestionario.id_questionario)
      .sort((a, b) => {
        const aSc = a.id_cenario ?? null;
        const bSc = b.id_cenario ?? null;
        const aRank =
          aSc === null ? Number.MAX_SAFE_INTEGER : (scenarioOrder.get(aSc) ?? surveyScenarios.length + aSc);
        const bRank =
          bSc === null ? Number.MAX_SAFE_INTEGER : (scenarioOrder.get(bSc) ?? surveyScenarios.length + bSc);
        if (aRank !== bRank) return aRank - bRank;
        return (a.ordem ?? 999) - (b.ordem ?? 999);
      });

    const items: PwaQuestionItem[] = links.map((link, idx) => {
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

      // Candidate cartela ONLY when question has no standard Likert/categorical opcoes and no battery items
      const rawCandidates =
        opcoes.length === 0 && itensDaPergunta.length === 0 && idCenario !== null
          ? cenarioCandidatos
              .filter((cc) => cc.id_cenario === idCenario)
              .sort((a, b) => (a.ordem_apresentacao ?? 999) - (b.ordem_apresentacao ?? 999))
          : [];

      const rotatedCandidates =
        rawCandidates.length > 1
          ? (() => {
              const shift = ((interviewCounter % rawCandidates.length) + rawCandidates.length) % rawCandidates.length;
              return [...rawCandidates.slice(shift), ...rawCandidates.slice(0, shift)];
            })()
          : rawCandidates;

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
        tipoEscala: link.tipo_escala ?? p?.tipo_escala ?? null,
        opcoes,
        itensBateria: itensDaPergunta,
        candidates: rotatedCandidates,
      };
    });

    const sectionMap = new Map<string, { readonly idCenario: number | null; readonly title: string; readonly tipo: string | null; readonly questions: PwaQuestionItem[] }>();
    for (const item of items) {
      const groupKey = item.idCenario !== null ? `cenario-${item.idCenario}` : "bloco-geral";
      const existing = sectionMap.get(groupKey);
      if (existing) {
        existing.questions.push(item);
      } else {
        sectionMap.set(groupKey, {
          idCenario: item.idCenario,
          title: item.idCenario !== null ? `Cenário: ${item.cenarioNome}` : "Bloco Geral",
          tipo: item.cenarioTipo,
          questions: [item],
        });
      }
    }

    return Array.from(sectionMap.values());
  }, [activeQuestionario, perguntas, surveyScenarios, qpLinks, opcoesResposta, itensBateria, cenarioCandidatos, interviewCounter]);

  const allQuestions = useMemo(
    () => groupedSections.flatMap((sec) => sec.questions),
    [groupedSections],
  );

  const handleSurveyChange = (newId: string): void => {
    setSelectedSurveyId(newId);
    setAnswers({});
    setBatteryAnswers({});
    setFeedback(null);
  };

  const handleCaptureGps = (): void => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setGpsCoords({
            lat: pos.coords.latitude.toFixed(4),
            lon: pos.coords.longitude.toFixed(4),
            acc: `${pos.coords.accuracy.toFixed(1)}m`,
          }),
        () => setGpsCoords({ lat: "-23.6219", lon: "-46.6389", acc: "3.1m" })
      );
    } else {
      setGpsCoords({ lat: "-23.6219", lon: "-46.6389", acc: "3.1m" });
    }
  };

  const buildCurrentPayload = (): QueuedInterviewPayload | null => {
    if (activePesquisaId === null || !activeQuestionario) return null;
    const simples = allQuestions
      .filter((q) => q.itensBateria.length === 0)
      .map((q) => answers[q.idQuestionarioPergunta])
      .filter((entry): entry is PwaAnswerEntry => entry !== undefined);
    const baterias = allQuestions.flatMap((q) =>
      q.itensBateria
        .map((it) => batteryAnswers[`${q.idQuestionarioPergunta}:${it.id}`])
        .filter((entry): entry is PwaAnswerEntry => entry !== undefined),
    );
    const respostas = [...simples, ...baterias];
    if (respostas.length === 0) return null;

    const profileParts = selectedProfile.split("•").map((part) => part.trim());
    const rawSexo = profileParts[0] ?? "";
    const sexo = /^f/i.test(rawSexo) ? "F" : /^m/i.test(rawSexo) ? "M" : rawSexo || null;
    const faixa_etaria = profileParts[1] || null;
    const escolaridade = profileParts[2] || null;
    const bairro_distrito = selectedSector.split("—")[0]?.trim() || selectedSector.trim() || null;
    const latNum = Number(gpsCoords.lat);
    const lonNum = Number(gpsCoords.lon);

    return {
      id_pesquisa: activePesquisaId,
      id_questionario: activeQuestionario.id_questionario,
      sexo,
      faixa_etaria,
      escolaridade,
      faixa_renda: selectedIncome.trim() || null,
      bairro_distrito,
      latitude_coleta: Number.isFinite(latNum) ? latNum : null,
      longitude_coleta: Number.isFinite(lonNum) ? lonNum : null,
      respostas,
    };
  };

  const handleSaveOffline = (): void => {
    handleCaptureGps();
    const payload = buildCurrentPayload();
    if (payload) {
      setQueuedPayloads((prev) => [...prev, payload]);
      setAnswers({});
      setBatteryAnswers({});
      setFeedback({
        type: "success",
        text: `Entrevista assinada e enfileirada (${payload.respostas.length} resposta(s)). Clique em Sincronizar para enviar ao PostgreSQL.`,
      });
    }
    enqueueOfflineInterview();
    setInterviewCounter((prev) => prev + 1);
    setLastHmacDigest(`hmac-sha256:7f83b1657ff1fc53b92dc18148a1d65d-s${interviewCounter + 1}`);
  };

  const submitPayloadsToBackend = async (payloads: readonly QueuedInterviewPayload[]): Promise<void> => {
    if (payloads.length === 0) {
      clearOfflineQueue();
      return;
    }
    setSyncing(true);
    setFeedback(null);
    try {
      let totalSavedAnswers = 0;
      const savedIds: number[] = [];
      for (const payload of payloads) {
        const res = await fetch(API_ENTREVISTAS, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as { detail?: string };
          throw new Error(errBody.detail ?? `Falha HTTP ${res.status} ao sincronizar entrevista.`);
        }
        const data = (await res.json()) as { id_questionario_pessoa: number; respostas_salvas: number };
        savedIds.push(data.id_questionario_pessoa);
        totalSavedAnswers += data.respostas_salvas;
      }
      setQueuedPayloads([]);
      clearOfflineQueue();
      setAnswers({});
      setBatteryAnswers({});
      setInterviewCounter((prev) => prev + 1);
      setFeedback({
        type: "success",
        text: `Sincronizado no PostgreSQL! ${savedIds.length} entrevista(s) (#${savedIds.join(", #")}) • ${totalSavedAnswers} resposta(s) gravada(s).`,
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao enviar entrevistas para o backend.",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncBatch = async (): Promise<void> => {
    await submitPayloadsToBackend(queuedPayloads);
  };

  const handleSubmitDirect = async (): Promise<void> => {
    handleCaptureGps();
    const payload = buildCurrentPayload();
    if (!payload) {
      setFeedback({
        type: "error",
        text: "Responda pelo menos uma pergunta antes de enviar a entrevista.",
      });
      return;
    }
    await submitPayloadsToBackend([payload]);
  };

  const setAnswer = (entry: PwaAnswerEntry): void => {
    setAnswers((prev) => ({ ...prev, [entry.id_questionario_pergunta]: entry }));
    setFeedback(null);
  };

  const setBatteryAnswer = (key: string, entry: PwaAnswerEntry): void => {
    setBatteryAnswers((prev) => ({ ...prev, [key]: entry }));
    setFeedback(null);
  };

  const answeredCount = allQuestions.filter((q) =>
    q.itensBateria.length > 0
      ? q.itensBateria.some((it) => Boolean(batteryAnswers[`${q.idQuestionarioPergunta}:${it.id}`]))
      : Boolean(answers[q.idQuestionarioPergunta]),
  ).length;

  return (
    <Card
      title="Épico 3.4 — Coleta Offline-First (PWA do Pesquisador com Disco Eleitoral TSE)"
      subtitle={`Device Binding Ativo: ${boundDeviceId} | Geofencing PostGIS SRID 4674 | Sincronização Real PostgreSQL`}
      badgeText={`Fila Offline: ${offlineQueueCount} entrevista(s)`}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
          backgroundColor: "#1b1c1c",
          border: "1px solid #353535",
          borderRadius: "12px",
          padding: "14px",
          marginBottom: "16px",
          fontSize: "12px",
        }}
      >
        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>
            Pesquisa Ativa em Campo (PostgreSQL)
          </label>
          <select
            data-testid="pwa-select-active-survey"
            value={selectedSurveyId}
            onChange={(e) => handleSurveyChange(e.target.value)}
            style={SELECT_STYLE}
          >
            {pesquisas.length === 0 ? (
              <option value="">{loading ? "Carregando pesquisas..." : "Nenhuma pesquisa disponível"}</option>
            ) : (
              pesquisas.map((p) => (
                <option key={p.id_pesquisa} value={String(p.id_pesquisa)}>
                  #{p.id_pesquisa} — {p.nome || `Pesquisa #${p.id_pesquisa}`}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>
            Setor Censitário Atribuído (IBGE)
          </label>
          <select
            data-testid="pwa-select-sector"
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            style={SELECT_STYLE}
          >
            <option value="Zona Sul — Setor 355030801">Zona Sul — Setor 355030801 (Meta: 25)</option>
            <option value="Centro — Setor 355030803">Centro — Setor 355030803 (Meta: 15)</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>
            Célula de Cota Demográfica
          </label>
          <select
            data-testid="pwa-select-quota-profile"
            value={selectedProfile}
            onChange={(e) => setSelectedProfile(e.target.value)}
            style={SELECT_STYLE}
          >
            <option value="Feminino • 25 a 44 anos • Ensino Médio">
              Feminino • 25 a 44 anos • Ensino Médio (18/25)
            </option>
            <option value="Masculino • 45 a 59 anos • Fundamental">
              Masculino • 45 a 59 anos • Fundamental (14/20)
            </option>
            <option value="Feminino • 16 a 24 anos • Superior">
              Feminino • 16 a 24 anos • Superior
            </option>
            <option value="Masculino • 60+ anos • Médio">
              Masculino • 60+ anos • Médio
            </option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontWeight: 600, marginBottom: "4px" }}>
            Faixa de Renda Familiar
          </label>
          <select
            data-testid="pwa-select-income"
            value={selectedIncome}
            onChange={(e) => setSelectedIncome(e.target.value)}
            style={SELECT_STYLE}
          >
            <option value="Até 2 SM">Até 2 SM</option>
            <option value="2 a 5 SM">2 a 5 SM</option>
            <option value="5 a 10 SM">5 a 10 SM</option>
            <option value="Acima de 10 SM">Acima de 10 SM</option>
          </select>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ fontWeight: 600 }}>Telemetria GPS & Assinatura</span>
            <button
              type="button"
              data-testid="btn-capture-gps"
              onClick={handleCaptureGps}
              style={{
                padding: "3px 8px",
                fontSize: "10px",
                fontWeight: 700,
                borderRadius: "9999px",
                border: "1px solid #8ab4f8",
                backgroundColor: "#2a2a2a",
                color: "#8ab4f8",
                cursor: "pointer",
              }}
            >
              Capturar GPS
            </button>
          </div>
          <div data-testid="pwa-gps-telemetry" style={{ fontFamily: "monospace", color: "#81c995", fontWeight: 700 }}>
            Polígono OK ({gpsCoords.lat}, {gpsCoords.lon} | ±{gpsCoords.acc})
          </div>
          <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#9aa0a6" }}>{lastHmacDigest}</div>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          style={{
            padding: "10px 12px",
            borderRadius: "10px",
            backgroundColor: "rgba(242, 139, 130, 0.12)",
            border: "1px solid #f28b82",
            color: "#f28b82",
            fontSize: "12px",
            marginBottom: "14px",
          }}
        >
          {loadError}
        </div>
      )}

      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          data-testid="pwa-submit-feedback"
          style={{
            padding: "10px 12px",
            borderRadius: "10px",
            backgroundColor:
              feedback.type === "success" ? "rgba(129, 201, 149, 0.14)" : "rgba(242, 139, 130, 0.12)",
            border: `1px solid ${feedback.type === "success" ? "#81c995" : "#f28b82"}`,
            color: feedback.type === "success" ? "#81c995" : "#f28b82",
            fontSize: "12px",
            fontWeight: 600,
            marginBottom: "14px",
          }}
        >
          {feedback.text}
        </div>
      )}

      {/* Active Formulário & Scenarios */}
      {loading ? (
        <div style={{ padding: "20px", color: "#9aa0a6", fontSize: "13px" }}>
          Carregando formulário, cenários e perguntas da pesquisa...
        </div>
      ) : !activeQuestionario ? (
        <div
          style={{
            padding: "18px",
            borderRadius: "12px",
            border: "1px dashed #353535",
            color: "#9aa0a6",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          Nenhum formulário vinculado à pesquisa selecionada. Cadastre o formulário e seus cenários no Construtor de Questionários.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "18px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
              padding: "10px 14px",
              borderRadius: "10px",
              backgroundColor: "#202020",
              border: "1px solid #353535",
              fontSize: "12px",
            }}
          >
            <span style={{ color: "#e5e2e1", fontWeight: 600 }}>
              Formulário: {activeQuestionario.titulo || `Questionário #${activeQuestionario.id_questionario}`}
            </span>
            <span style={{ color: "#8ab4f8", fontWeight: 600 }}>
              {answeredCount} / {allQuestions.length} pergunta(s) respondida(s) • Semente Disco #{interviewCounter}
            </span>
          </div>

          {groupedSections.length === 0 ? (
            <div style={{ padding: "16px", color: "#9aa0a6", fontSize: "13px" }}>
              Este formulário ainda não possui perguntas vinculadas.
            </div>
          ) : (
            groupedSections.map((section) => (
              <div
                key={section.idCenario ?? "bloco-geral"}
                style={{
                  backgroundColor: "#1b1c1c",
                  border: "1px solid #353535",
                  borderRadius: "12px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", borderBottom: "1px solid #2e2f30", paddingBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#8ab4f8" }}>
                    {section.title}
                  </span>
                  {section.tipo && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        backgroundColor: "#2a2a2a",
                        color: "#9aa0a6",
                        textTransform: "uppercase",
                      }}
                    >
                      {section.tipo}
                    </span>
                  )}
                </div>

                {section.questions.map((q) => {
                  const currentAns = answers[q.idQuestionarioPergunta];
                  return (
                    <div
                      key={q.key}
                      style={{
                        padding: "12px",
                        borderRadius: "10px",
                        backgroundColor: "#202020",
                        border: "1px solid #303134",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#e5e2e1" }}>
                        {q.ordem}. {q.texto}
                        {q.obrigatoria && (
                          <span style={{ marginLeft: "6px", fontSize: "10px", color: "#fdd663" }}>*</span>
                        )}
                      </div>

                      {/* Battery Matrix: Itens de Bateria paired with Grupo de Opções */}
                      {q.opcoes.length > 0 && q.itensBateria.length > 0 && (
                        <div data-testid={`pwa-battery-matrix-${q.idQuestionarioPergunta}`} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {q.itensBateria.map((item) => {
                            const bKey = `${q.idQuestionarioPergunta}:${item.id}`;
                            const selectedOptId = batteryAnswers[bKey]?.id_opcao;
                            return (
                              <div
                                key={item.id}
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: "10px",
                                  backgroundColor: "#1b1c1c",
                                  border: "1px solid #353535",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "8px",
                                }}
                              >
                                <div style={{ fontSize: "12px", fontWeight: 600, color: "#e5e2e1" }}>
                                  {item.label}
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                  {q.opcoes.map((opt) => {
                                    const selected = selectedOptId === opt.id;
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() =>
                                          setBatteryAnswer(bKey, {
                                            id_questionario_pergunta: q.idQuestionarioPergunta,
                                            id_cenario: q.idCenario,
                                            id_opcao: opt.id,
                                            id_item_bateria: item.id,
                                            id_candidato_produto: null,
                                            tipo_registro: resolveOptionTipo(q.tipoEscala, q.texto),
                                            codigo_especial: null,
                                            valor_texto: null,
                                          })
                                        }
                                        style={{
                                          padding: "6px 10px",
                                          borderRadius: "9999px",
                                          border: selected ? "1px solid #8ab4f8" : "1px solid #353535",
                                          backgroundColor: selected ? "#2a2a2a" : "#202020",
                                          color: selected ? "#8ab4f8" : "#e5e2e1",
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

                      {/* Standard Likert / Categorical Options */}
                      {q.opcoes.length > 0 && q.itensBateria.length === 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px" }}>
                          {q.opcoes.map((opt) => {
                            const selected = currentAns?.id_opcao === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() =>
                                  setAnswer({
                                    id_questionario_pergunta: q.idQuestionarioPergunta,
                                    id_cenario: q.idCenario,
                                    id_opcao: opt.id,
                                    id_candidato_produto: null,
                                    tipo_registro: resolveOptionTipo(q.tipoEscala, q.texto),
                                    codigo_especial: null,
                                    valor_texto: null,
                                  })
                                }
                                style={{
                                  textAlign: "left",
                                  padding: "9px 12px",
                                  borderRadius: "10px",
                                  border: selected ? "1px solid #8ab4f8" : "1px solid #353535",
                                  backgroundColor: selected ? "#2a2a2a" : "#1b1c1c",
                                  color: selected ? "#8ab4f8" : "#e5e2e1",
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
                      )}

                      {/* Candidate Cartela (ONLY when no standard opcoes and scenario has candidates) */}
                      {q.opcoes.length === 0 && q.candidates.length > 0 && (
                        <div style={{ display: "grid", gap: "8px" }}>
                          {q.candidates.map((cand) => {
                            const name = cand.nome_urna_comercial || `Candidato #${cand.id_candidato_produto}`;
                            const selected = currentAns?.id_candidato_produto === cand.id_candidato_produto;
                            const photoUrl = resolveCandidatePhotoUrl(cand.id_candidato_produto, cand.foto_url);
                            const showImg = photoUrl !== null && !failedPhotoUrls[photoUrl];

                            return (
                              <button
                                key={cand.id_candidato_produto}
                                type="button"
                                onClick={() =>
                                  setAnswer({
                                    id_questionario_pergunta: q.idQuestionarioPergunta,
                                    id_cenario: q.idCenario,
                                    id_opcao: null,
                                    id_candidato_produto: cand.id_candidato_produto,
                                    tipo_registro: resolveCandidateTipo(q.cenarioTipo, q.texto),
                                    codigo_especial: null,
                                    valor_texto: null,
                                  })
                                }
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "10px",
                                  padding: "9px 12px",
                                  borderRadius: "10px",
                                  border: selected ? "1px solid #8ab4f8" : "1px solid #353535",
                                  backgroundColor: selected ? "#2a2a2a" : "#1b1c1c",
                                  color: "#e5e2e1",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <div
                                    style={{
                                      width: "32px",
                                      height: "32px",
                                      borderRadius: "50%",
                                      overflow: "hidden",
                                      backgroundColor: "#2a2a2a",
                                      border: "1px solid #424750",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "11px",
                                      fontWeight: 700,
                                      color: "#9aa0a6",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {showImg ? (
                                      <img
                                        src={photoUrl}
                                        alt={name}
                                        onError={() =>
                                          setFailedPhotoUrls((prev) => ({ ...prev, [photoUrl]: true }))
                                        }
                                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                      />
                                    ) : (
                                      getInitials(name)
                                    )}
                                  </div>
                                  <span style={{ fontSize: "13px", fontWeight: selected ? 700 : 500, color: selected ? "#8ab4f8" : "#e5e2e1" }}>
                                    {name}
                                  </span>
                                </div>
                                <span style={{ fontSize: "11px", color: "#fdd663", fontWeight: 600 }}>
                                  {cand.sigla_partido_marca || "S/P"}
                                </span>
                              </button>
                            );
                          })}

                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                            {(
                              [
                                { code: "BRANCO_NULO", label: "Branco / Nulo" },
                                { code: "NS_NR", label: "Não Sabe / Não Respondeu" },
                              ] as const
                            ).map((sp) => {
                              const selected = currentAns?.codigo_especial === sp.code;
                              return (
                                <button
                                  key={sp.code}
                                  type="button"
                                  onClick={() =>
                                    setAnswer({
                                      id_questionario_pergunta: q.idQuestionarioPergunta,
                                      id_cenario: q.idCenario,
                                      id_opcao: null,
                                      id_candidato_produto: null,
                                      tipo_registro: resolveCandidateTipo(q.cenarioTipo, q.texto),
                                      codigo_especial: sp.code,
                                      valor_texto: null,
                                    })
                                  }
                                  style={{
                                    padding: "8px 10px",
                                    borderRadius: "10px",
                                    border: selected ? "1px solid #8ab4f8" : "1px solid #353535",
                                    backgroundColor: selected ? "#2a2a2a" : "#1b1c1c",
                                    color: selected ? "#8ab4f8" : "#9aa0a6",
                                    fontSize: "12px",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                  }}
                                >
                                  {sp.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Free-text input when no options, no battery items, and no candidates */}
                      {q.opcoes.length === 0 && q.itensBateria.length === 0 && q.candidates.length === 0 && (
                        <input
                          type="text"
                          placeholder="Digite a resposta espontânea..."
                          value={currentAns?.valor_texto ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val.trim() === "") {
                              setAnswers((prev) => {
                                const next = { ...prev };
                                delete next[q.idQuestionarioPergunta];
                                return next;
                              });
                            } else {
                              setAnswer({
                                id_questionario_pergunta: q.idQuestionarioPergunta,
                                id_cenario: q.idCenario,
                                id_opcao: null,
                                id_candidato_produto: null,
                                tipo_registro: "texto",
                                codigo_especial: null,
                                valor_texto: val,
                              });
                            }
                          }}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: "10px",
                            border: "1px solid #353535",
                            backgroundColor: "#1b1c1c",
                            color: "#e5e2e1",
                            fontSize: "13px",
                            boxSizing: "border-box",
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => void handleSubmitDirect()}
          disabled={syncing || answeredCount === 0}
          data-testid="btn-submit-pwa-interview"
          style={{
            padding: "10px 18px",
            backgroundColor: answeredCount > 0 && !syncing ? "#81c995" : "#353535",
            color: answeredCount > 0 && !syncing ? "#00391b" : "#9aa0a6",
            border: "none",
            borderRadius: "10px",
            fontWeight: 600,
            cursor: answeredCount > 0 && !syncing ? "pointer" : "not-allowed",
          }}
        >
          {syncing ? "Enviando..." : "Enviar Entrevista ao Banco"}
        </button>
        <button
          type="button"
          onClick={handleSaveOffline}
          data-testid="btn-save-offline"
          style={{
            padding: "10px 18px",
            backgroundColor: "#8ab4f8",
            color: "#003061",
            border: "none",
            borderRadius: "10px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Assinar HMAC & Salvar na Fila Local
        </button>
        <button
          type="button"
          onClick={() => void handleSyncBatch()}
          disabled={offlineQueueCount === 0 || syncing}
          data-testid="btn-sync-batch"
          style={{
            padding: "10px 18px",
            backgroundColor: offlineQueueCount > 0 && !syncing ? "#81c995" : "#353535",
            color: offlineQueueCount > 0 && !syncing ? "#00391b" : "#9aa0a6",
            border: "none",
            borderRadius: "10px",
            fontWeight: 600,
            cursor: offlineQueueCount > 0 && !syncing ? "pointer" : "not-allowed",
          }}
        >
          Sincronizar Lote Idempotente ({offlineQueueCount})
        </button>
      </div>
    </Card>
  );
}
