import React, { useEffect, useMemo, useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors } = NOCTURNE_TOKENS;
const PALETTE = [
  "#93c5fd",
  "#86efac",
  "#fcd34d",
  "#f9a8d4",
  "#c4b5fd",
  "#67e8f9",
  "#fdba74",
  "#cbd5e1",
];

function toPastelHex(rawHex: string | null | undefined, fallback: string): string {
  if (!rawHex || typeof rawHex !== "string") return fallback;
  const clean = rawHex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return fallback;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // Evita branco puro (#ffffff) invisível no PDF branco
  if (luminance > 0.9) return fallback;
  const mix = (ch: number) => Math.round(ch * 0.52 + 255 * 0.48);
  const toHex = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 11px",
  borderRadius: "9px",
  border: `1px solid ${colors.borderSubtle}`,
  backgroundColor: colors.surfaceContainer,
  color: colors.textPrimary,
  fontSize: "12.5px",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "11.5px",
  fontWeight: 600,
  color: colors.onSurfaceVariant,
  marginBottom: "5px",
};

interface ChartBarRow {
  readonly candidato: string;
  readonly partido: string;
  readonly votos: number;
  readonly pct: number;
  readonly color: string;
  readonly fotoUrl: string | null;
  readonly isCandidate: boolean;
}

interface QuestionChartBlock {
  readonly id: string;
  readonly ordem: number;
  readonly idCenario: number | null;
  readonly cenarioNome: string;
  readonly cenarioTipo: string | null;
  readonly questionText: string;
  readonly categoryLabel: string;
  readonly sourceLabel: string;
  readonly isRejection: boolean;
  readonly totalVotos: number;
  readonly rows: readonly ChartBarRow[];
}

interface ScenarioQuestionGroup {
  readonly key: string;
  readonly idCenario: number | null;
  readonly cenarioNome: string;
  readonly cenarioTipo: string | null;
  readonly questions: readonly QuestionChartBlock[];
}

interface DimensionCategoryRow {
  readonly categoria: string;
  readonly percentualMeta: number;
  readonly quantidadeMeta: number;
  readonly quantidadeColetada: number;
}

interface DimensionGroup {
  readonly id: number;
  readonly nome: string;
  readonly fonteDados: string;
  readonly ordem: number;
  readonly totalMeta: number;
  readonly totalColetado: number;
  readonly categorias: readonly DimensionCategoryRow[];
}

function normalizeName(text: string): string {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getInitials(name: string): string {
  const parts = name
    .replace(/[^a-zA-ZÀ-ÿ\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] ?? "?").slice(0, 2).toUpperCase();
  return `${(parts[0] ?? "")[0] ?? ""}${(parts[parts.length - 1] ?? "")[0] ?? ""}`.toUpperCase();
}

function isNonCandidateOption(name: string): boolean {
  return /branco|nulo|indeciso|n[ãa]o sabe|n[ãa]o respondeu|ningu[ée]m|n[ãa]o rejeita/i.test(name);
}

export function ClientPresentationReportFeature(): React.JSX.Element {
  const [pesquisas, setPesquisas] = useState<any[]>([]);
  const [candidatosDb, setCandidatosDb] = useState<any[]>([]);
  const [perguntasCatalogo, setPerguntasCatalogo] = useState<any[]>([]);
  const [surveyData, setSurveyData] = useState<{
    perguntas: any[];
    respostas_por_pergunta: any[];
    relatorios: any[];
    dimensoes: any[];
  }>({
    perguntas: [],
    respostas_por_pergunta: [],
    relatorios: [],
    dimensoes: [],
  });

  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("");
  const [clientName, setClientName] = useState("Apresentação Executiva — Cliente");
  const [subtitleText, setSubtitleText] = useState("Estudo Quantitativo de Opinião Pública e Intenção de Voto");
  const [executiveNotes, setExecutiveNotes] = useState(
    "Os resultados apresentados refletem exatamente os registros consolidados no banco de dados oficial."
  );
  const [includeFicha, setIncludeFicha] = useState(true);
  const [includeDimensoes, setIncludeDimensoes] = useState(true);
  const [includeCitacoes, setIncludeCitacoes] = useState(true);
  const [includeTable, setIncludeTable] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("http://127.0.0.1:8000/api/v1/campo-operacoes/dashboard-stats", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("http://127.0.0.1:8000/api/v1/questionarios-db/candidatos", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]).then(([stats, cands]) => {
      const pesqs = Array.isArray(stats?.pesquisas) ? stats.pesquisas : [];
      setPesquisas(pesqs);
      if (Array.isArray(stats?.perguntas)) {
        setPerguntasCatalogo(stats.perguntas);
      }
      if (pesqs.length > 0) {
        setSelectedSurveyId(String(pesqs[0].id_pesquisa));
      }
      if (Array.isArray(cands)) {
        setCandidatosDb(cands);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedSurveyId) {
      setSurveyData({ perguntas: [], respostas_por_pergunta: [], relatorios: [], dimensoes: [] });
      return;
    }
    fetch(`http://127.0.0.1:8000/api/v1/campo-operacoes/apresentacao-dados/${selectedSurveyId}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setSurveyData({
            perguntas: Array.isArray(d.perguntas) ? d.perguntas : [],
            respostas_por_pergunta: Array.isArray(d.respostas_por_pergunta) ? d.respostas_por_pergunta : [],
            relatorios: Array.isArray(d.relatorios) ? d.relatorios : [],
            dimensoes: Array.isArray(d.dimensoes) ? d.dimensoes : [],
          });
        } else {
          setSurveyData({ perguntas: [], respostas_por_pergunta: [], relatorios: [], dimensoes: [] });
        }
      })
      .catch(() => setSurveyData({ perguntas: [], respostas_por_pergunta: [], relatorios: [], dimensoes: [] }));
  }, [selectedSurveyId]);

  const selectedSurvey = useMemo(
    () => pesquisas.find((p) => String(p.id_pesquisa) === selectedSurveyId) ?? null,
    [pesquisas, selectedSurveyId]
  );

  // Mapa estrito de fotos: somente correspondência exata por ID ou nome_urna_comercial
  const photoLookup = useMemo(() => {
    const byName = new Map<string, string>();
    const byId = new Map<number, string>();
    for (const c of candidatosDb) {
      if (c.foto_url) {
        const url = String(c.foto_url);
        const id = Number(c.id_candidato_produto || 0);
        const name = String(c.nome_urna_comercial || "");
        if (id) byId.set(id, url);
        if (name) byName.set(normalizeName(name), url);
      }
    }
    return { byName, byId };
  }, [candidatosDb]);

  const questionCharts: readonly QuestionChartBlock[] = useMemo(() => {
    if (!selectedSurvey) return [];

    const { perguntas, respostas_por_pergunta: respostasAll, relatorios } = surveyData;
    const relPesq =
      relatorios.find((rel) => {
        const ct = rel?.configuracao_crosstab;
        return (
          ct &&
          (Array.isArray(ct.resultados_cenario_2) ||
            Array.isArray(ct.resultados) ||
            Array.isArray(ct.rejeicao))
        );
      }) ??
      relatorios[0] ??
      null;
    const crosstab = relPesq?.configuracao_crosstab ?? {};
    const hasDirectRespostasInSurvey = respostasAll.length > 0;

    const resolveExactFoto = (it: any, cleanName: string): string | null => {
      if (it.foto_url) return String(it.foto_url);
      if (it.id_candidato_produto && photoLookup.byId.has(Number(it.id_candidato_produto))) {
        return photoLookup.byId.get(Number(it.id_candidato_produto)) ?? null;
      }
      const norm = normalizeName(cleanName);
      return photoLookup.byName.get(norm) ?? null;
    };

    const mapDbResponseRows = (rows: any[], forceColor?: string): ChartBarRow[] => {
      const total = rows.reduce((acc, it) => acc + (Number(it.votos) || 0), 0);
      return rows
        .map((it, idx) => {
          const isCand = Boolean(it.id_candidato_produto);
          const rawText = typeof it.valor_texto === "string" ? it.valor_texto.trim() : "";
          const label =
            it.candidato_nome ||
            it.opcao_texto ||
            (it.codigo_especial ? String(it.codigo_especial).replace(/_/g, " ") : "") ||
            rawText ||
            "Sem resposta";
          const votos = Number(it.votos) || 0;
          const fallbackColor = PALETTE[idx % PALETTE.length] || "#93c5fd";
          return {
            candidato: String(label),
            partido: it.partido ? String(it.partido) : "",
            votos,
            pct: total > 0 ? (votos / total) * 100 : 0,
            color: forceColor || toPastelHex(it.cor_hex, fallbackColor),
            fotoUrl: isCand ? resolveExactFoto(it, String(label)) : null,
            isCandidate: isCand,
          };
        })
        .sort((a, b) => b.votos - a.votos);
    };

    const mapCrosstabRows = (items: any[], forceColor?: string): ChartBarRow[] => {
      const total = items.reduce((acc, it) => acc + (Number(it.votos) || 0), 0);
      return items
        .map((it, idx) => {
          const rawName = String(it.candidato ?? it.label ?? "Sem identificação");
          const match = rawName.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
          const cleanName = match?.[1]?.trim() ?? rawName;
          const votos = Number(it.votos) || 0;
          const isCand = !isNonCandidateOption(cleanName);
          const pct =
            it.percentual != null && !Number.isNaN(Number(it.percentual))
              ? Number(it.percentual)
              : total > 0
                ? (votos / total) * 100
                : 0;
          const fallbackColor = PALETTE[idx % PALETTE.length] || "#93c5fd";
          return {
            candidato: cleanName,
            partido: String(it.partido || match?.[2]?.trim() || ""),
            votos,
            pct,
            color: forceColor || toPastelHex(it.cor_hex, fallbackColor),
            fotoUrl: isCand ? resolveExactFoto(it, cleanName) : null,
            isCandidate: isCand,
          };
        })
        .sort((a, b) => b.votos - a.votos);
    };

    const crosstabVotes = Array.isArray(crosstab.resultados_cenario_2)
      ? crosstab.resultados_cenario_2
      : Array.isArray(crosstab.resultados)
        ? crosstab.resultados
        : [];
    const crosstabRej = Array.isArray(crosstab.rejeicao) ? crosstab.rejeicao : [];

    const blocks: QuestionChartBlock[] = [];

    if (perguntas.length > 0) {
      for (let i = 0; i < perguntas.length; i++) {
        const pg = perguntas[i];
        if (!pg) continue;
        const enunciado = String(pg.enunciado ?? `Pergunta ${i + 1}`);
        const idCenario = pg.id_cenario != null ? Number(pg.id_cenario) : null;
        const cenarioNome =
          (typeof pg.cenario_nome === "string" && pg.cenario_nome.trim()) ||
          (typeof pg.secao_bloco === "string" && pg.secao_bloco.trim()) ||
          "Bloco Geral";
        const cenarioTipo =
          typeof pg.cenario_tipo === "string" && pg.cenario_tipo.trim() ? pg.cenario_tipo.trim() : null;

        const directResps = respostasAll.filter((r) => {
          if (Number(r.id_questionario_pergunta) !== Number(pg.id_questionario_pergunta)) return false;
          if (idCenario != null && r.id_cenario != null) {
            return Number(r.id_cenario) === idCenario;
          }
          return true;
        });

        const isRej =
          cenarioTipo === "rejeicao" ||
          directResps.some((r) => r.tipo_registro === "rejeicao") ||
          /n[ãa]o votaria|rejei[çc][ãa]o/i.test(enunciado);
        const isVote = /votaria|candidato|disco|elei[çc][ãa]o/i.test(enunciado);

        let rows: ChartBarRow[] = [];
        let sourceLabel = "Tabela respostas (PostgreSQL)";
        const categoryLabel = isRej
          ? "Índice de Rejeição"
          : cenarioTipo === "espontaneo"
            ? "Pesquisa Espontânea"
            : cenarioTipo === "confronto_direto"
              ? "Confronto Direto"
              : cenarioTipo === "estimulado"
                ? /disco/i.test(enunciado)
                  ? "Estimulada (Disco)"
                  : "Pesquisa Estimulada"
                : isVote
                  ? /n[ãa]o ler|espont[âa]n/i.test(enunciado)
                    ? "Pesquisa Espontânea"
                    : /disco/i.test(enunciado)
                      ? "Estimulada (Disco)"
                      : "Pesquisa Estimulada"
                  : String(pg.tipo_questao || "Pergunta do Questionário");

        if (directResps.length > 0) {
          rows = mapDbResponseRows(directResps);
        } else if (!hasDirectRespostasInSurvey && isRej && crosstabRej.length > 0) {
          rows = mapCrosstabRows(crosstabRej);
          sourceLabel = "Tabela relatorios_tabulacao (PostgreSQL)";
        } else if (!hasDirectRespostasInSurvey && isVote && !isRej && crosstabVotes.length > 0) {
          rows = mapCrosstabRows(crosstabVotes);
          sourceLabel = "Tabela relatorios_tabulacao (PostgreSQL)";
        } else {
          rows = [];
          sourceLabel = "Sem respostas gravadas no banco";
        }

        blocks.push({
          id: `qp-${pg.id_questionario_pergunta ?? i}`,
          ordem: Number(pg.ordem) || i + 1,
          idCenario,
          cenarioNome,
          cenarioTipo,
          questionText: enunciado,
          categoryLabel,
          sourceLabel,
          isRejection: isRej,
          totalVotos: rows.reduce((a, b) => a + b.votos, 0),
          rows,
        });
      }
    } else {
      // Sem perguntas vinculadas diretamente: usa o texto real das perguntas do banco (mesma lógica do Dashboard)
      const pergsPesq = perguntasCatalogo.filter(
        (pg: any) => String(pg.id_pesquisa) === String(selectedSurvey.id_pesquisa)
      );
      const pergsPool = pergsPesq.length > 0 ? pergsPesq : perguntasCatalogo;
      const findQuestion = (regex: RegExp): string | undefined =>
        pergsPool.find((pg: any) => regex.test(String(pg.enunciado ?? "")))?.enunciado;

      const stimulatedTitle =
        findQuestion(/disco|em qual destes candidatos/i) ??
        findQuestion(/candidatos fossem estes/i) ??
        findQuestion(/em quem voc[êe] votaria/i);
      const rejectionTitle = findQuestion(/n[ãa]o votaria/i);

      if (crosstabVotes.length > 0) {
        const rows = mapCrosstabRows(crosstabVotes);
        blocks.push({
          id: `rel-vote-${relPesq?.id_relatorio ?? 0}`,
          ordem: 1,
          idCenario: null,
          cenarioNome: "Pesquisa Estimulada",
          cenarioTipo: "estimulado",
          questionText:
            stimulatedTitle || relPesq?.titulo_relatorio || "Intenção de Voto (relatorios_tabulacao)",
          categoryLabel: "Pesquisa Estimulada",
          sourceLabel: "Tabela relatorios_tabulacao (PostgreSQL)",
          isRejection: false,
          totalVotos: rows.reduce((a, b) => a + b.votos, 0),
          rows,
        });
      }
      if (crosstabRej.length > 0) {
        const rows = mapCrosstabRows(crosstabRej);
        blocks.push({
          id: `rel-rej-${relPesq?.id_relatorio ?? 0}`,
          ordem: blocks.length + 1,
          idCenario: null,
          cenarioNome: "Rejeição Eleitoral",
          cenarioTipo: "rejeicao",
          questionText: rejectionTitle || "Rejeição Eleitoral (relatorios_tabulacao)",
          categoryLabel: "Índice de Rejeição",
          sourceLabel: "Tabela relatorios_tabulacao (PostgreSQL)",
          isRejection: true,
          totalVotos: rows.reduce((a, b) => a + b.votos, 0),
          rows,
        });
      }
    }

    return blocks;
  }, [selectedSurvey, surveyData, photoLookup, perguntasCatalogo]);

  const scenarioGroups: readonly ScenarioQuestionGroup[] = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        idCenario: number | null;
        cenarioNome: string;
        cenarioTipo: string | null;
        questions: QuestionChartBlock[];
      }
    >();
    for (const q of questionCharts) {
      const key = q.idCenario != null ? `cenario-${q.idCenario}` : `geral-${q.cenarioNome}`;
      const existing = map.get(key);
      if (existing) {
        existing.questions.push(q);
      } else {
        map.set(key, {
          key,
          idCenario: q.idCenario,
          cenarioNome: q.cenarioNome,
          cenarioTipo: q.cenarioTipo,
          questions: [q],
        });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => {
        if (a.idCenario != null && b.idCenario == null) return -1;
        if (a.idCenario == null && b.idCenario != null) return 1;
        if (a.idCenario != null && b.idCenario != null) return a.idCenario - b.idCenario;
        return a.cenarioNome.localeCompare(b.cenarioNome, "pt-BR");
      })
      .map((g) => ({
        ...g,
        questions: [...g.questions].sort((a, b) => a.ordem - b.ordem),
      }));
  }, [questionCharts]);

  const dimensoesGroups: readonly DimensionGroup[] = useMemo(() => {
    const raw = surveyData.dimensoes;
    if (!Array.isArray(raw) || raw.length === 0) return [];
    const grouped = new Map<
      number,
      {
        id: number;
        nome: string;
        fonteDados: string;
        ordem: number;
        categorias: DimensionCategoryRow[];
      }
    >();
    for (const row of raw) {
      const id = Number(row.id_amostra_dimensao || 0);
      if (!grouped.has(id)) {
        grouped.set(id, {
          id,
          nome: String(row.nome_dimensao || "Dimensão"),
          fonteDados: String(row.fonte_dados || "Censo / TSE"),
          ordem: Number(row.ordem_exibicao || 0),
          categorias: [],
        });
      }
      if (row.categoria != null) {
        grouped.get(id)?.categorias.push({
          categoria: String(row.categoria),
          percentualMeta: Number(row.percentual_meta || 0),
          quantidadeMeta: Number(row.quantidade_meta || 0),
          quantidadeColetada: Number(row.quantidade_coletada || 0),
        });
      }
    }
    return Array.from(grouped.values())
      .sort((a, b) => a.ordem - b.ordem || a.id - b.id)
      .map((g) => {
        const sortedCats = [...g.categorias].sort((a, b) => b.percentualMeta - a.percentualMeta);
        return {
          id: g.id,
          nome: g.nome,
          fonteDados: g.fonteDados,
          ordem: g.ordem,
          totalMeta: sortedCats.reduce((acc, c) => acc + c.quantidadeMeta, 0),
          totalColetado: sortedCats.reduce((acc, c) => acc + c.quantidadeColetada, 0),
          categorias: sortedCats,
        };
      });
  }, [surveyData.dimensoes]);

  const citacoesSummary = useMemo(() => {
    const nonRejBlocks = questionCharts.filter(
      (q) => !q.isRejection && q.rows.length > 0 && q.rows.some((r) => r.isCandidate)
    );
    if (nonRejBlocks.length === 0) {
      return {
        rows: [] as readonly ChartBarRow[],
        totalCitacoes: 0,
        totalGeral: 0,
        totalNaoCitados: 0,
        fonte: "Sem citações registradas no banco",
      };
    }

    // Evita dupla contagem quando múltiplas perguntas referenciam o mesmo relatorios_tabulacao
    const directBlocks = nonRejBlocks.filter((b) => b.sourceLabel.includes("Tabela respostas"));
    const firstNonRej = nonRejBlocks[0];
    const blocksToAggregate =
      directBlocks.length > 0 ? directBlocks : firstNonRej ? [firstNonRej] : [];
    const fonte =
      directBlocks.length > 0
        ? `Tabela respostas (PostgreSQL • ${directBlocks.length} ${directBlocks.length === 1 ? "pergunta" : "perguntas"})`
        : (blocksToAggregate[0]?.sourceLabel ?? "Tabela relatorios_tabulacao (PostgreSQL)");

    const byCandidate = new Map<string, ChartBarRow>();
    let totalGeral = 0;
    let totalNaoCitados = 0;

    for (const block of blocksToAggregate) {
      for (const r of block.rows) {
        totalGeral += r.votos;
        if (!r.isCandidate) {
          totalNaoCitados += r.votos;
          continue;
        }
        const key = normalizeName(r.candidato);
        const existing = byCandidate.get(key);
        if (existing) {
          byCandidate.set(key, {
            ...existing,
            votos: existing.votos + r.votos,
            fotoUrl: existing.fotoUrl ?? r.fotoUrl,
            partido: existing.partido || r.partido,
          });
        } else {
          byCandidate.set(key, { ...r });
        }
      }
    }

    const totalCitacoes = Array.from(byCandidate.values()).reduce((acc, r) => acc + r.votos, 0);
    const rows: ChartBarRow[] = Array.from(byCandidate.values())
      .map((r) => ({
        ...r,
        pct: totalCitacoes > 0 ? (r.votos / totalCitacoes) * 100 : 0,
      }))
      .sort((a, b) => b.votos - a.votos);

    return {
      rows,
      totalCitacoes,
      totalGeral,
      totalNaoCitados,
      fonte,
    };
  }, [questionCharts]);

  const resolveInlineImages = async (): Promise<Map<string, string>> => {
    const urls = new Set<string>();
    for (const r of citacoesSummary.rows) {
      if (r.fotoUrl) urls.add(r.fotoUrl);
    }
    for (const q of questionCharts) {
      for (const r of q.rows) {
        if (r.fotoUrl) urls.add(r.fotoUrl);
      }
    }
    const map = new Map<string, string>();
    await Promise.all(
      Array.from(urls).map(async (url) => {
        try {
          const resp = await fetch(url);
          if (!resp.ok) return;
          const blob = await resp.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("read failed"));
            reader.readAsDataURL(blob);
          });
          if (dataUrl) map.set(url, dataUrl);
        } catch {
          // fallback para URL direta
        }
      })
    );
    return map;
  };

  const buildPresentationHtml = (inlineImages?: Map<string, string>): string => {
    if (!selectedSurvey) return "";
    const municipioLabel = selectedSurvey.municipio_nome
      ? `${selectedSurvey.municipio_nome} / ${selectedSurvey.uf || ""}`
      : "Município";
    const periodo = `${selectedSurvey.data_inicio || "—"} a ${selectedSurvey.data_fim || "—"}`;
    const amostraN = Number(selectedSurvey.tamanho_amostral || 0).toLocaleString("pt-BR");
    const margem = selectedSurvey.margem_erro != null ? `±${selectedSurvey.margem_erro}%` : "—";
    const confianca = selectedSurvey.nivel_confianca != null ? `${selectedSurvey.nivel_confianca}%` : "95%";
    const registroTse = selectedSurvey.numero_registro_tse || "Sem protocolo TSE";

    const renderVerticalColumnsHtml = (rows: readonly ChartBarRow[]): string => {
      if (rows.length === 0) {
        return `<div class="empty-db">Nenhuma resposta registrada no banco de dados para esta pergunta.</div>`;
      }
      const maxPct = Math.max(...rows.map((r) => r.pct), 1);
      const maxBarHeightPx = 190;
      return `
        <div class="vchart" style="grid-template-columns: repeat(${rows.length}, minmax(0, 1fr));">
          ${rows
            .map((r) => {
              const barH = Math.max(Math.round((r.pct / maxPct) * maxBarHeightPx), 16);
              const resolvedSrc = r.fotoUrl ? (inlineImages?.get(r.fotoUrl) ?? r.fotoUrl) : null;
              const photoHtml = r.isCandidate
                ? resolvedSrc
                  ? `<img class="cand-photo" src="${resolvedSrc}" alt="${r.candidato}" style="border-color:${r.color}" />`
                  : `<div class="cand-avatar" style="border-color:${r.color};color:${r.color}">${getInitials(r.candidato)}</div>`
                : `<div class="cand-avatar neutral">—</div>`;
              return `
                <div class="vcol">
                  <div class="vcol-top">
                    ${photoHtml}
                    <div class="vcol-pct" style="color:${r.color}">${r.pct.toFixed(1)}%</div>
                    <div class="vcol-bar" style="height:${barH}px;background:${r.color}"></div>
                  </div>
                  <div class="vcol-foot">
                    <strong>${r.candidato}</strong>
                    ${r.partido ? `<span>${r.partido}</span>` : ""}
                  </div>
                </div>`;
            })
            .join("")}
        </div>`;
    };

    const fichaSection = includeFicha
      ? `
      <section class="slide">
        <div class="badge">Metodologia & Ficha Técnica</div>
        <h2>Ficha Técnica da Pesquisa</h2>
        <div class="grid-4">
          <div class="metric"><label>Município / UF</label><strong>${municipioLabel}</strong></div>
          <div class="metric"><label>Amostra (N)</label><strong>${amostraN} entrevistas</strong></div>
          <div class="metric"><label>Margem / Confiança</label><strong>${margem} • ${confianca}</strong></div>
          <div class="metric"><label>Protocolo TSE</label><strong>${registroTse}</strong></div>
        </div>
        <div class="meta-line"><strong>Período de Campo:</strong> ${periodo} &nbsp;|&nbsp; <strong>Status:</strong> ${selectedSurvey.status || "—"} &nbsp;|&nbsp; <strong>Cenários:</strong> ${scenarioGroups.length} &nbsp;|&nbsp; <strong>Dimensões:</strong> ${dimensoesGroups.length} &nbsp;|&nbsp; <strong>Perguntas no Relatório:</strong> ${questionCharts.length}</div>
        ${executiveNotes.trim() ? `<div class="notes"><h3>Notas Executivas</h3><p>${executiveNotes.replace(/\n/g, "<br/>")}</p></div>` : ""}
      </section>`
      : "";

    const dimensoesSection = includeDimensoes
      ? `
      <section class="slide">
        <div class="badge">Perfil da Amostra • Dimensões</div>
        <h2>Dimensões e Cotas Amostrais</h2>
        <p class="sub">Fonte: Tabelas amostras_dimensao e amostras_cotas (PostgreSQL) &nbsp;•&nbsp; ${dimensoesGroups.length} ${dimensoesGroups.length === 1 ? "dimensão cadastrada" : "dimensões cadastradas"}</p>
        ${
          dimensoesGroups.length === 0
            ? `<div class="empty-db">Nenhuma dimensão amostral cadastrada no banco de dados para esta pesquisa.</div>`
            : `<div class="dim-grid">
                ${dimensoesGroups
                  .map(
                    (g, gIdx) => `
                  <div class="dim-card">
                    <div class="dim-head">
                      <strong>${g.nome}</strong>
                      <span>Fonte: ${g.fonteDados} • Meta N = ${g.totalMeta.toLocaleString("pt-BR")}</span>
                    </div>
                    ${g.categorias
                      .map((c, cIdx) => {
                        const barColor = PALETTE[(gIdx * 2 + cIdx) % PALETTE.length] || "#3b82f6";
                        const widthPct = Math.min(Math.max(c.percentualMeta, 2), 100);
                        return `
                        <div class="dim-row">
                          <div class="dim-row-top">
                            <span>${c.categoria}</span>
                            <strong>${c.percentualMeta.toFixed(2)}% <em>(Meta: ${c.quantidadeMeta.toLocaleString("pt-BR")} | Coletado: ${c.quantidadeColetada.toLocaleString("pt-BR")})</em></strong>
                          </div>
                          <div class="dim-track">
                            <div class="dim-fill" style="width:${widthPct}%;background:${barColor}"></div>
                          </div>
                        </div>`;
                      })
                      .join("")}
                  </div>`
                  )
                  .join("")}
              </div>`
        }
      </section>`
      : "";

    const citacoesSection = includeCitacoes
      ? `
      <section class="slide">
        <div class="badge">Panorama Inicial • Citações</div>
        <h2>Resumo de Citações aos Candidatos</h2>
        <p class="sub">Fonte: ${citacoesSummary.fonte} &nbsp;•&nbsp; Percentual sobre o total de citações válidas a candidatos</p>
        <div class="grid-4">
          <div class="metric"><label>Citações a Candidatos</label><strong>${citacoesSummary.totalCitacoes.toLocaleString("pt-BR")}</strong></div>
          <div class="metric"><label>Total de Respostas</label><strong>${citacoesSummary.totalGeral.toLocaleString("pt-BR")}</strong></div>
          <div class="metric"><label>Candidatos Citados</label><strong>${citacoesSummary.rows.length}</strong></div>
          <div class="metric"><label>Brancos / Nulos / Indecisos</label><strong>${citacoesSummary.totalNaoCitados.toLocaleString("pt-BR")}</strong></div>
        </div>
        ${renderVerticalColumnsHtml(citacoesSummary.rows)}
        ${
          includeTable && citacoesSummary.rows.length > 0
            ? `
          <table>
            <thead><tr><th>Candidato</th><th>Partido</th><th class="num">Citações</th><th class="num">% das Citações</th></tr></thead>
            <tbody>
              ${citacoesSummary.rows.map((r) => `<tr><td>${r.candidato}</td><td>${r.partido || "—"}</td><td class="num">${r.votos.toLocaleString("pt-BR")}</td><td class="num"><strong>${r.pct.toFixed(2)}%</strong></td></tr>`).join("")}
            </tbody>
          </table>`
            : ""
        }
      </section>`
      : "";

    const questionsSections = scenarioGroups
      .flatMap((group) =>
        group.questions.map(
          (q) => `
      <section class="slide">
        <div class="badge-row">
          <span class="badge scenario">Cenário: ${q.cenarioNome}</span>
          <span class="badge ${q.isRejection ? "danger" : ""}">Pergunta ${q.ordem} • ${q.categoryLabel}</span>
        </div>
        <h2>${q.questionText}</h2>
        <p class="sub">Fonte: ${q.sourceLabel} &nbsp;•&nbsp; Total de respostas: ${q.totalVotos.toLocaleString("pt-BR")}</p>
        ${renderVerticalColumnsHtml(q.rows)}
        ${
          includeTable && q.rows.length > 0
            ? `
          <table>
            <thead><tr><th>Candidato / Opção</th><th>Partido / Categoria</th><th class="num">Respostas</th><th class="num">Percentual</th></tr></thead>
            <tbody>
              ${q.rows.map((r) => `<tr><td>${r.candidato}</td><td>${r.partido || "—"}</td><td class="num">${r.votos}</td><td class="num"><strong>${r.pct.toFixed(2)}%</strong></td></tr>`).join("")}
            </tbody>
          </table>`
            : ""
        }
      </section>`
        )
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Apresentação — ${selectedSurvey.nome}</title>
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; background: #f1f5f9; color: #0f172a; }
    .slide { max-width: 1040px; margin: 24px auto; background: #ffffff; border-radius: 14px; padding: 34px 38px; box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08); page-break-after: always; break-after: page; }
    .cover { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color: #ffffff; min-height: 420px; display: flex; flex-direction: column; justify-content: center; }
    .cover .kicker { font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: #93c5fd; margin-bottom: 12px; font-weight: 700; }
    .cover h1 { margin: 0 0 10px; font-size: 32px; line-height: 1.2; }
    .cover p { margin: 0 0 24px; font-size: 16px; color: #dbeafe; }
    .cover .footer { font-size: 13px; color: #bfdbfe; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 14px; }
    h2 { margin: 0 0 8px; font-size: 20px; color: #0f172a; line-height: 1.3; }
    .sub { margin: 0 0 20px; font-size: 12.5px; color: #475569; }
    .badge-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 8px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 700; margin-bottom: 8px; }
    .badge-row .badge { margin-bottom: 0; }
    .badge.scenario { background: #ede9fe; color: #6d28d9; border: 1px solid #c4b5fd; }
    .badge.danger { background: #fee2e2; color: #b91c1c; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
    .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
    .metric label { display: block; font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
    .metric strong { font-size: 15px; color: #0f172a; }
    .meta-line { font-size: 13px; color: #334155; margin-bottom: 16px; }
    .notes { background: #f8fafc; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 6px; }
    .notes h3 { margin: 0 0 6px; font-size: 13px; color: #1e40af; }
    .notes p { margin: 0; font-size: 13px; line-height: 1.5; color: #334155; }
    .empty-db { padding: 24px; border: 1px dashed #cbd5e1; border-radius: 10px; text-align: center; color: #64748b; font-size: 13px; }
    .dim-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .dim-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
    .dim-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .dim-head strong { font-size: 14px; color: #0f172a; }
    .dim-head span { font-size: 11px; color: #64748b; }
    .dim-row { margin-bottom: 10px; }
    .dim-row:last-child { margin-bottom: 0; }
    .dim-row-top { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; margin-bottom: 4px; color: #1e293b; }
    .dim-row-top em { font-style: normal; font-weight: 400; color: #64748b; font-size: 11px; }
    .dim-track { width: 100%; height: 10px; background: #e2e8f0; border-radius: 999px; overflow: hidden; }
    .dim-fill { height: 100%; border-radius: 999px; }

    /* Gráfico de Barras Verticais Largas + Foto Quadrada (borda fina 1px) */
    .vchart { display: grid; gap: 14px; align-items: end; padding: 14px 8px 0; border-bottom: 2px solid #cbd5e1; margin-bottom: 16px; }
    .vcol { display: flex; flex-direction: column; align-items: center; min-width: 0; }
    .vcol-top { width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
    .cand-photo { width: 76%; max-width: 82px; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1; margin-bottom: 6px; background: #f8fafc; }
    .cand-avatar { width: 76%; max-width: 82px; aspect-ratio: 1 / 1; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px; margin-bottom: 6px; }
    .cand-avatar.neutral { color: #94a3b8; font-size: 16px; }
    .vcol-pct { font-size: 15px; font-weight: 800; margin-bottom: 6px; }
    .vcol-bar { width: 84%; border-radius: 8px 8px 0 0; min-height: 16px; }
    .vcol-foot { width: 100%; text-align: center; padding: 8px 2px 4px; font-size: 11.5px; line-height: 1.25; }
    .vcol-foot strong { display: block; color: #0f172a; word-break: break-word; }
    .vcol-foot span { display: block; font-size: 10.5px; color: #64748b; margin-top: 2px; }

    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
    th, td { padding: 7px 9px; border-bottom: 1px solid #e2e8f0; text-align: left; }
    th { background: #f8fafc; color: #475569; font-weight: 700; }
    .num { text-align: right; }
    @page { size: A4 landscape; margin: 10mm; }
    @media print {
      body { background: #ffffff; }
      .slide { box-shadow: none; margin: 0; border-radius: 0; max-width: none; padding: 18px 24px; }
    }
  </style>
</head>
<body>
  <section class="slide cover">
    <div class="kicker">${clientName}</div>
    <h1>${selectedSurvey.nome}</h1>
    <p>${subtitleText}</p>
    <div class="footer">${municipioLabel} &nbsp;•&nbsp; Amostra N = ${amostraN} &nbsp;•&nbsp; ${scenarioGroups.length} ${scenarioGroups.length === 1 ? "cenário" : "cenários"} &nbsp;•&nbsp; ${questionCharts.length} blocos &nbsp;•&nbsp; Gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
  </section>
  ${fichaSection}
  ${dimensoesSection}
  ${citacoesSection}
  ${questionsSections}
</body>
</html>`;
  };

  const handlePrintPdf = async (): Promise<void> => {
    if (!selectedSurvey) return;
    setExporting(true);
    setStatusMessage("Carregando e incorporando fotos dos candidatos para o PDF...");
    try {
      const inlineImages = await resolveInlineImages();
      const html = buildPresentationHtml(inlineImages);
      if (!html) return;
      const win = window.open("", "_blank", "width=1180,height=800");
      if (!win) {
        setStatusMessage("Permita pop-ups no navegador para abrir a visualização de impressão/PDF.");
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();

      const imgs = Array.from(win.document.images);
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              })
        )
      );
      setTimeout(() => win.print(), 250);
      setStatusMessage("Apresentação aberta em paisagem (A4) com dados exatos do banco — selecione 'Salvar como PDF'.");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadHtml = async (): Promise<void> => {
    if (!selectedSurvey) return;
    setExporting(true);
    setStatusMessage("Gerando arquivo HTML com dados exatos do banco...");
    try {
      const inlineImages = await resolveInlineImages();
      const html = buildPresentationHtml(inlineImages);
      if (!html) return;
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = String(selectedSurvey.nome || "apresentacao").replace(/[^a-zA-Z0-9]+/g, "_");
      a.href = url;
      a.download = `Apresentacao_${slug}.html`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage(`Arquivo Apresentacao_${slug}.html baixado com sucesso.`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", color: colors.textPrimary }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "20px" }}>Relatório de Apresentação para o Cliente</h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: colors.onSurfaceVariant }}>
            Espelho fiel dos dados registrados no PostgreSQL para a pesquisa selecionada, sem dados simulados.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={!selectedSurvey || exporting}
            onClick={() => void handleDownloadHtml()}
            style={{
              padding: "9px 14px",
              borderRadius: "8px",
              border: `1px solid ${colors.borderSubtle}`,
              backgroundColor: colors.surfaceContainer,
              color: "#81c995",
              fontWeight: 700,
              fontSize: "12.5px",
              cursor: selectedSurvey && !exporting ? "pointer" : "not-allowed",
            }}
          >
            {exporting ? "Preparando..." : "Baixar HTML"}
          </button>
          <button
            type="button"
            disabled={!selectedSurvey || exporting}
            onClick={() => void handlePrintPdf()}
            style={{
              padding: "9px 16px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#8ab4f8",
              color: "#003061",
              fontWeight: 700,
              fontSize: "12.5px",
              cursor: selectedSurvey && !exporting ? "pointer" : "not-allowed",
            }}
          >
            {exporting ? "Preparando fotos..." : "Gerar PDF / Imprimir Apresentação"}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            backgroundColor: "rgba(129, 201, 149, 0.14)",
            border: "1px solid rgba(129, 201, 149, 0.35)",
            color: "#81c995",
            fontSize: "12.5px",
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* PAINEL DE CONFIGURAÇÃO */}
      <div
        style={{
          backgroundColor: colors.surfaceContainerLow,
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: "14px",
          padding: "18px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.2fr", gap: "12px" }}>
          <div>
            <label style={LABEL_STYLE}>Pesquisa (PostgreSQL) *</label>
            <select
              style={INPUT_STYLE}
              value={selectedSurveyId}
              onChange={(e) => setSelectedSurveyId(e.target.value)}
            >
              {pesquisas.length === 0 && <option value="">Nenhuma pesquisa encontrada</option>}
              {pesquisas.map((p) => (
                <option key={p.id_pesquisa} value={p.id_pesquisa}>
                  #{p.id_pesquisa} — {p.nome} ({p.municipio_nome || "Município"}/{p.uf || ""})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={LABEL_STYLE}>Cliente / Contratante</label>
            <input style={INPUT_STYLE} value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          <div>
            <label style={LABEL_STYLE}>Subtítulo da Capa</label>
            <input style={INPUT_STYLE} value={subtitleText} onChange={(e) => setSubtitleText(e.target.value)} />
          </div>
        </div>

        <div>
          <label style={LABEL_STYLE}>Notas Executivas / Síntese para o Cliente</label>
          <textarea
            style={{ ...INPUT_STYLE, minHeight: "60px", resize: "vertical", fontFamily: "inherit" }}
            value={executiveNotes}
            onChange={(e) => setExecutiveNotes(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", fontSize: "12.5px", color: colors.textPrimary }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input type="checkbox" checked={includeFicha} onChange={(e) => setIncludeFicha(e.target.checked)} />
            Incluir Ficha Técnica & Notas
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input type="checkbox" checked={includeDimensoes} onChange={(e) => setIncludeDimensoes(e.target.checked)} />
            Incluir Dimensões Amostrais
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input type="checkbox" checked={includeCitacoes} onChange={(e) => setIncludeCitacoes(e.target.checked)} />
            Incluir Resumo de Citações
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input type="checkbox" checked={includeTable} onChange={(e) => setIncludeTable(e.target.checked)} />
            Incluir Tabela Consolidada abaixo de cada gráfico
          </label>
          <span style={{ color: "#8ab4f8", fontWeight: 600 }}>
            Cenários: {scenarioGroups.length} • Dimensões: {dimensoesGroups.length} • Citações: {citacoesSummary.totalCitacoes.toLocaleString("pt-BR")} • Blocos: {questionCharts.length}
          </span>
        </div>
      </div>

      {/* PRÉVIA AO VIVO DE TODOS OS GRÁFICOS REAIS DO BANCO */}
      {selectedSurvey && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* 1. DIMENSÕES AMOSTRAIS NO INÍCIO DA APRESENTAÇÃO */}
          {includeDimensoes && (
            <div
              style={{
                backgroundColor: colors.surfaceContainerLow,
                border: `1px solid ${colors.borderSubtle}`,
                borderRadius: "14px",
                padding: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 700,
                    backgroundColor: "rgba(129, 201, 149, 0.16)",
                    color: "#81c995",
                  }}
                >
                  Início da Apresentação • Dimensões da Amostra
                </span>
                <span style={{ fontSize: "11.5px", color: colors.onSurfaceVariant }}>
                  Tabelas amostras_dimensao / amostras_cotas (PostgreSQL) • {dimensoesGroups.length}{" "}
                  {dimensoesGroups.length === 1 ? "dimensão" : "dimensões"}
                </span>
              </div>
              <h3 style={{ margin: "0 0 14px", fontSize: "15.5px", color: colors.textPrimary }}>
                Dimensões e Cotas Amostrais
              </h3>

              {dimensoesGroups.length === 0 ? (
                <div
                  style={{
                    padding: "18px",
                    borderRadius: "10px",
                    border: `1px dashed ${colors.borderSubtle}`,
                    textAlign: "center",
                    fontSize: "12.5px",
                    color: colors.onSurfaceVariant,
                  }}
                >
                  Nenhuma dimensão amostral cadastrada no banco de dados para esta pesquisa.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "14px",
                  }}
                >
                  {dimensoesGroups.map((g, gIdx) => (
                    <div
                      key={g.id}
                      style={{
                        backgroundColor: colors.surfaceContainer,
                        border: `1px solid ${colors.borderSubtle}`,
                        borderRadius: "10px",
                        padding: "14px 16px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          gap: "8px",
                          paddingBottom: "8px",
                          marginBottom: "10px",
                          borderBottom: `1px solid ${colors.borderSubtle}`,
                        }}
                      >
                        <strong style={{ fontSize: "13.5px", color: colors.textPrimary }}>{g.nome}</strong>
                        <span style={{ fontSize: "11px", color: colors.onSurfaceVariant }}>
                          Fonte: {g.fonteDados} • Meta N = {g.totalMeta.toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                        {g.categorias.map((c, cIdx) => {
                          const barColor = PALETTE[(gIdx * 2 + cIdx) % PALETTE.length] || "#3b82f6";
                          const widthPct = Math.min(Math.max(c.percentualMeta, 2), 100);
                          return (
                            <div key={c.categoria}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: "8px",
                                  fontSize: "12px",
                                  marginBottom: "4px",
                                }}
                              >
                                <span style={{ color: colors.textPrimary }}>{c.categoria}</span>
                                <span style={{ color: colors.onSurfaceVariant }}>
                                  <strong style={{ color: barColor }}>{c.percentualMeta.toFixed(2)}%</strong>{" "}
                                  (Meta: {c.quantidadeMeta.toLocaleString("pt-BR")} | Coletado:{" "}
                                  {c.quantidadeColetada.toLocaleString("pt-BR")})
                                </span>
                              </div>
                              <div
                                style={{
                                  width: "100%",
                                  height: "8px",
                                  borderRadius: "999px",
                                  backgroundColor: colors.surfaceContainerLow,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${widthPct}%`,
                                    height: "100%",
                                    borderRadius: "999px",
                                    backgroundColor: barColor,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. RESUMO DE CITAÇÕES NO INÍCIO DA APRESENTAÇÃO */}
          {includeCitacoes && (
            <div
              style={{
                backgroundColor: colors.surfaceContainerLow,
                border: `1px solid ${colors.borderSubtle}`,
                borderRadius: "14px",
                padding: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: "999px",
                    fontSize: "11px",
                    fontWeight: 700,
                    backgroundColor: "rgba(168, 85, 247, 0.16)",
                    color: "#c084fc",
                  }}
                >
                  Início da Apresentação • Citações
                </span>
                <span style={{ fontSize: "11.5px", color: colors.onSurfaceVariant }}>
                  {citacoesSummary.fonte}
                </span>
              </div>
              <h3 style={{ margin: "0 0 14px", fontSize: "15.5px", color: colors.textPrimary }}>
                Resumo de Citações aos Candidatos
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: "10px",
                  marginBottom: "16px",
                }}
              >
                <div style={{ backgroundColor: colors.surfaceContainer, border: `1px solid ${colors.borderSubtle}`, borderRadius: "10px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "10.5px", textTransform: "uppercase", color: colors.onSurfaceVariant }}>Citações a Candidatos</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#8ab4f8", marginTop: "2px" }}>
                    {citacoesSummary.totalCitacoes.toLocaleString("pt-BR")}
                  </div>
                </div>
                <div style={{ backgroundColor: colors.surfaceContainer, border: `1px solid ${colors.borderSubtle}`, borderRadius: "10px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "10.5px", textTransform: "uppercase", color: colors.onSurfaceVariant }}>Total de Respostas</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: colors.textPrimary, marginTop: "2px" }}>
                    {citacoesSummary.totalGeral.toLocaleString("pt-BR")}
                  </div>
                </div>
                <div style={{ backgroundColor: colors.surfaceContainer, border: `1px solid ${colors.borderSubtle}`, borderRadius: "10px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "10.5px", textTransform: "uppercase", color: colors.onSurfaceVariant }}>Candidatos Citados</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#81c995", marginTop: "2px" }}>
                    {citacoesSummary.rows.length}
                  </div>
                </div>
                <div style={{ backgroundColor: colors.surfaceContainer, border: `1px solid ${colors.borderSubtle}`, borderRadius: "10px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "10.5px", textTransform: "uppercase", color: colors.onSurfaceVariant }}>Brancos / Nulos / Indecisos</div>
                  <div style={{ fontSize: "18px", fontWeight: 800, color: "#f59e0b", marginTop: "2px" }}>
                    {citacoesSummary.totalNaoCitados.toLocaleString("pt-BR")}
                  </div>
                </div>
              </div>

              {citacoesSummary.rows.length === 0 ? (
                <div
                  style={{
                    padding: "18px",
                    borderRadius: "10px",
                    border: `1px dashed ${colors.borderSubtle}`,
                    textAlign: "center",
                    fontSize: "12.5px",
                    color: colors.onSurfaceVariant,
                  }}
                >
                  Nenhuma citação a candidatos registrada no banco de dados para esta pesquisa.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${citacoesSummary.rows.length}, minmax(0, 1fr))`,
                    gap: "12px",
                    alignItems: "end",
                    padding: "12px 6px 0",
                    borderBottom: `2px solid ${colors.borderSubtle}`,
                  }}
                >
                  {citacoesSummary.rows.map((r, idx) => {
                    const maxPct = Math.max(...citacoesSummary.rows.map((x) => x.pct), 1);
                    const barHeight = Math.max(Math.round((r.pct / maxPct) * 170), 16);
                    return (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
                        {r.fotoUrl ? (
                          <img
                            src={r.fotoUrl}
                            alt={r.candidato}
                            style={{
                              width: "76%",
                              maxWidth: "82px",
                              aspectRatio: "1 / 1",
                              objectFit: "cover",
                              borderRadius: "8px",
                              border: `1px solid ${r.color}`,
                              marginBottom: "6px",
                              backgroundColor: colors.surfaceContainer,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "76%",
                              maxWidth: "82px",
                              aspectRatio: "1 / 1",
                              borderRadius: "8px",
                              border: `1px solid ${r.color}`,
                              backgroundColor: colors.surfaceContainer,
                              color: r.color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 800,
                              fontSize: "17px",
                              marginBottom: "6px",
                            }}
                          >
                            {getInitials(r.candidato)}
                          </div>
                        )}
                        <div style={{ fontSize: "14px", fontWeight: 800, color: r.color }}>
                          {r.pct.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: "11px", color: colors.onSurfaceVariant, marginBottom: "6px" }}>
                          {r.votos.toLocaleString("pt-BR")} citações
                        </div>
                        <div
                          style={{
                            width: "84%",
                            height: `${barHeight}px`,
                            backgroundColor: r.color,
                            borderRadius: "8px 8px 0 0",
                          }}
                        />
                        <div style={{ textAlign: "center", padding: "8px 2px 6px", fontSize: "11.5px", lineHeight: 1.25 }}>
                          <strong style={{ display: "block", color: colors.textPrimary }}>{r.candidato}</strong>
                          {r.partido && (
                            <span style={{ fontSize: "10.5px", color: colors.onSurfaceVariant }}>{r.partido}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {questionCharts.length === 0 && (
            <div
              style={{
                backgroundColor: colors.surfaceContainerLow,
                border: `1px dashed ${colors.borderSubtle}`,
                borderRadius: "14px",
                padding: "24px",
                textAlign: "center",
                color: colors.onSurfaceVariant,
                fontSize: "13px",
              }}
            >
              Nenhuma pergunta ou relatório consolidado encontrado no banco de dados para esta pesquisa.
            </div>
          )}

          {scenarioGroups.map((group) => (
            <div key={group.key} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                  padding: "10px 16px",
                  borderRadius: "10px",
                  backgroundColor: "rgba(168, 85, 247, 0.10)",
                  border: `1px solid ${colors.borderSubtle}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      padding: "3px 10px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: 700,
                      backgroundColor: "rgba(168, 85, 247, 0.22)",
                      color: "#d8b4fe",
                    }}
                  >
                    Cenário: {group.cenarioNome}
                  </span>
                  {group.cenarioTipo && (
                    <span style={{ fontSize: "11.5px", color: colors.onSurfaceVariant }}>
                      Tipo: {group.cenarioTipo.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: "11.5px", color: colors.onSurfaceVariant }}>
                  {group.questions.length} {group.questions.length === 1 ? "pergunta" : "perguntas"}
                </span>
              </div>

              {group.questions.map((q) => {
                const maxPct = Math.max(...q.rows.map((r) => r.pct), 1);
                return (
                  <div
                    key={q.id}
                    style={{
                      backgroundColor: colors.surfaceContainerLow,
                      border: `1px solid ${colors.borderSubtle}`,
                      borderRadius: "14px",
                      padding: "20px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: 700,
                            backgroundColor: "rgba(168, 85, 247, 0.16)",
                            color: "#c084fc",
                            border: "1px solid rgba(168, 85, 247, 0.35)",
                          }}
                        >
                          Cenário: {q.cenarioNome}
                        </span>
                        <span
                          style={{
                            padding: "3px 10px",
                            borderRadius: "999px",
                            fontSize: "11px",
                            fontWeight: 700,
                            backgroundColor: q.isRejection ? "rgba(239, 68, 68, 0.16)" : "rgba(59, 130, 246, 0.16)",
                            color: q.isRejection ? "#f87171" : "#8ab4f8",
                          }}
                        >
                          Pergunta {q.ordem} • {q.categoryLabel}
                        </span>
                      </div>
                      <span style={{ fontSize: "11.5px", color: colors.onSurfaceVariant }}>
                        {q.sourceLabel} • Total: {q.totalVotos.toLocaleString("pt-BR")} respostas
                      </span>
                    </div>
                    <h3 style={{ margin: "0 0 18px", fontSize: "15.5px", color: colors.textPrimary }}>{q.questionText}</h3>

                    {q.rows.length === 0 ? (
                      <div
                        style={{
                          padding: "20px",
                          borderRadius: "10px",
                          border: `1px dashed ${colors.borderSubtle}`,
                          textAlign: "center",
                          fontSize: "12.5px",
                          color: colors.onSurfaceVariant,
                        }}
                      >
                        Nenhuma resposta registrada no banco de dados para esta pergunta.
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: `repeat(${q.rows.length}, minmax(0, 1fr))`,
                          gap: "12px",
                          alignItems: "end",
                          padding: "12px 6px 0",
                          borderBottom: `2px solid ${colors.borderSubtle}`,
                        }}
                      >
                        {q.rows.map((r, idx) => {
                          const barHeight = Math.max(Math.round((r.pct / maxPct) * 180), 16);
                          return (
                            <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
                              {r.isCandidate ? (
                                r.fotoUrl ? (
                                  <img
                                    src={r.fotoUrl}
                                    alt={r.candidato}
                                    style={{
                                      width: "76%",
                                      maxWidth: "82px",
                                      aspectRatio: "1 / 1",
                                      objectFit: "cover",
                                      borderRadius: "8px",
                                      border: `1px solid ${r.color}`,
                                      marginBottom: "6px",
                                      backgroundColor: colors.surfaceContainer,
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: "76%",
                                      maxWidth: "82px",
                                      aspectRatio: "1 / 1",
                                      borderRadius: "8px",
                                      border: `1px solid ${r.color}`,
                                      backgroundColor: colors.surfaceContainer,
                                      color: r.color,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: 800,
                                      fontSize: "17px",
                                      marginBottom: "6px",
                                    }}
                                  >
                                    {getInitials(r.candidato)}
                                  </div>
                                )
                              ) : (
                                <div
                                  style={{
                                    width: "76%",
                                    maxWidth: "82px",
                                    aspectRatio: "1 / 1",
                                    borderRadius: "8px",
                                    border: `1px dashed ${colors.borderSubtle}`,
                                    backgroundColor: colors.surfaceContainer,
                                    color: colors.onSurfaceVariant,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 700,
                                    fontSize: "14px",
                                    marginBottom: "6px",
                                  }}
                                >
                                  —
                                </div>
                              )}

                              <div style={{ fontSize: "14px", fontWeight: 800, color: r.color, marginBottom: "6px" }}>
                                {r.pct.toFixed(1)}%
                              </div>

                              <div
                                style={{
                                  width: "84%",
                                  height: `${barHeight}px`,
                                  backgroundColor: r.color,
                                  borderRadius: "8px 8px 0 0",
                                }}
                              />

                              <div style={{ textAlign: "center", padding: "8px 2px 6px", fontSize: "11.5px", lineHeight: 1.25 }}>
                                <strong style={{ display: "block", color: colors.textPrimary }}>{r.candidato}</strong>
                                {r.partido && (
                                  <span style={{ fontSize: "10.5px", color: colors.onSurfaceVariant }}>{r.partido}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
