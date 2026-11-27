import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { useUiSessionStore, type ActiveTab } from "../../lib/store";
import { OfficeSectionCard } from "./OverviewCharts";
import type { OverviewSurveyDataset, CandidateStatPoint, ScenarioDataset } from "./overviewData";
import { ExecutiveDossierModal } from "./ExecutiveDossierModal";

const { colors } = NOCTURNE_TOKENS;

const GUIDED_FLOW_STEPS: readonly {
  readonly step: string;
  readonly label: string;
  readonly tab: ActiveTab;
}[] = [
  { step: "1", label: "Território & Eleitorado", tab: "geo-electorate-tse" },
  { step: "2", label: "Formulários & Perguntas", tab: "questionnaires" },
  { step: "3", label: "Amostragem & Cotas", tab: "sampling" },
  { step: "4", label: "Pesquisas & Cenários", tab: "surveys" },
  { step: "5", label: "Distribuição & Campo", tab: "distribution" },
  { step: "6", label: "Tabulação & Relatórios", tab: "tabulation" },
];

const NOCTURNE_CHART_PALETTE: readonly string[] = [
  colors.primaryContainer,
  colors.successPastel,
  colors.warningPastel,
  colors.errorPastel,
  colors.secondary,
  colors.tertiary,
  colors.outline,
];

export function Dashboard(): React.JSX.Element {
  const [selectedDate, setSelectedDate] = useState<string>("ALL");
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("");
  const [dossierOpen, setDossierOpen] = useState<boolean>(false);
  const [dbStats, setDbStats] = useState<any>({
    total_pesquisas: 0,
    total_cidades: 0,
    populacao_municipios: 0,
    total_entrevistas: 0,
    entrevistas_realizadas: 0,
    pesquisas: [],
    resultados_votos: [],
    rejeicao_votos: [],
    relatorios: [],
  });

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/campo-operacoes/dashboard-stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setDbStats(d);
      })
      .catch(() => {});
  }, []);

  const dbSurveysCatalog: OverviewSurveyDataset[] = useMemo(() => {
    const pesqs = Array.isArray(dbStats.pesquisas) ? dbStats.pesquisas : [];
    const votosAll = Array.isArray(dbStats.resultados_votos) ? dbStats.resultados_votos : [];
    const rejeicaoAll = Array.isArray(dbStats.rejeicao_votos) ? dbStats.rejeicao_votos : [];
    const relatoriosAll = Array.isArray(dbStats.relatorios) ? dbStats.relatorios : [];
    const perguntasAll = Array.isArray(dbStats.perguntas) ? dbStats.perguntas : [];

    const PASTEL_REJECTION = colors.errorPastel;

    const parseCrosstabRows = (items: any[]): any[] =>
      items.map((item: any, idx: number) => {
        const rawName = String(item.candidato ?? "Sem identificação");
        const match = rawName.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
        const tokenColor = NOCTURNE_CHART_PALETTE[idx % NOCTURNE_CHART_PALETTE.length] ?? colors.primaryContainer;
        return {
          candidato: match?.[1]?.trim() ?? rawName,
          partido: match?.[2]?.trim() ?? "NS/NR",
          votos: Number(item.votos) || 0,
          cor_hex: tokenColor,
        };
      });

    const toPoints = (rows: any[], prefix: string, forceColor?: string): CandidateStatPoint[] => {
      const total = rows.reduce((acc: number, v: any) => acc + (Number(v.votos) || 0), 0);
      return rows.map((v: any, idx: number) => {
        const qtd = Number(v.votos) || 0;
        const pct = total > 0 ? (qtd / total) * 100 : 0;
        const tokenColor = NOCTURNE_CHART_PALETTE[idx % NOCTURNE_CHART_PALETTE.length] ?? colors.primaryContainer;
        return {
          code: `${prefix}-${idx + 1}`,
          name: v.candidato,
          party: v.partido,
          quantity: qtd,
          frequency: `${qtd}`,
          percentage: pct.toFixed(2),
          color: forceColor || tokenColor,
        };
      });
    };

    return pesqs.map((p: any) => {
      const votosPesq = votosAll.filter((v: any) => v.id_pesquisa === p.id_pesquisa);
      const relPesq = relatoriosAll.find((rel: any) => rel.id_pesquisa === p.id_pesquisa);
      const crosstab = relPesq?.configuracao_crosstab ?? {};

      const scenMap = new Map<string, { title: string; tipo: string; rows: any[] }>();
      for (const v of votosPesq) {
        const key = String(v.id_cenario ?? "default");
        const entry = scenMap.get(key) ?? {
          title: String(v.cenario_nome ?? "Cenário Principal"),
          tipo: String(v.tipo_cenario ?? "estimulado"),
          rows: [],
        };
        entry.rows.push(v);
        scenMap.set(key, entry);
      }

      if (scenMap.size === 0) {
        const fallbackResults = Array.isArray(crosstab.resultados_cenario_2)
          ? crosstab.resultados_cenario_2
          : Array.isArray(crosstab.resultados)
            ? crosstab.resultados
            : [];
        if (fallbackResults.length > 0) {
          const parsed = parseCrosstabRows(fallbackResults);
          scenMap.set("consolidado-1", {
            title: relPesq?.titulo_relatorio || "Cenário Consolidado (TSE)",
            tipo: "estimulado",
            rows: parsed,
          });
        }
      }

      const scenariosList = Array.from(scenMap.entries());
      const spontEntry = scenariosList.find(([, s]) => s.tipo === "espontaneo") ?? scenariosList[0];
      const stimEntry = scenariosList.find(([, s]) => s.tipo === "estimulado") ?? scenariosList[0];

      const spontaneousPoints = spontEntry ? toPoints(spontEntry[1].rows, `P${p.id_pesquisa}-SP`) : [];
      const stimulatedPoints = stimEntry ? toPoints(stimEntry[1].rows, `P${p.id_pesquisa}-ST`) : [];
      const scenarios: ScenarioDataset[] = scenariosList.map(([scenId, s]) => ({
        scenarioId: scenId,
        scenarioTitle: s.title,
        points: toPoints(s.rows, `P${p.id_pesquisa}-S${scenId}`),
      }));

      const rejRowsRaw = rejeicaoAll.filter((v: any) => v.id_pesquisa === p.id_pesquisa);
      const rejRows =
        rejRowsRaw.length > 0
          ? rejRowsRaw
          : Array.isArray(crosstab.rejeicao)
            ? parseCrosstabRows(crosstab.rejeicao)
            : [];
      const rejectionPoints = toPoints(rejRows, `P${p.id_pesquisa}-REJ`, PASTEL_REJECTION);
      const sampleCount = stimulatedPoints.reduce((acc, pt) => acc + pt.quantity, 0);

      const pergsPesq = perguntasAll.filter((pg: any) => pg.id_pesquisa === p.id_pesquisa);
      const pergsPool = pergsPesq.length > 0 ? pergsPesq : perguntasAll;
      const findQuestion = (regex: RegExp): string | undefined =>
        pergsPool.find((pg: any) => regex.test(String(pg.enunciado ?? "")))?.enunciado;

      const spontaneousTitle =
        findQuestion(/n[ãa]o ler op[çc][õo]es|espont[âa]n/i) ??
        findQuestion(/em quem voc[êe] votaria/i);
      const stimulatedTitle =
        findQuestion(/disco|em qual destes candidatos/i) ??
        findQuestion(/candidatos fossem estes/i);
      const scenarioQuestionTitle =
        findQuestion(/candidatos fossem estes/i) ?? stimulatedTitle;
      const rejectionTitle = findQuestion(/n[ãa]o votaria/i);

      const scenariosWithQuestion: ScenarioDataset[] = scenarios.map((sc) => ({
        ...sc,
        scenarioTitle: scenarioQuestionTitle ?? sc.scenarioTitle,
      }));

      return {
        id: String(p.id_pesquisa),
        protocolTse: p.numero_registro_tse || `PESQ-${p.id_pesquisa}`,
        surveyName: p.nome,
        surveyDate: p.data_inicio || "2026-11-10",
        sampleSize: Number(p.tamanho_amostral) || sampleCount,
        marginOfError: String(p.margem_erro ?? "3.0"),
        offices: [
          {
            officeCode: "PREFEITO",
            officeLabel: `Prefeito — ${p.municipio_nome || "Município"}/${p.uf || ""}`,
            spontaneousTitle,
            stimulatedTitle,
            rejectionTitle,
            spontaneous: spontaneousPoints,
            stimulated: stimulatedPoints,
            scenarios: scenariosWithQuestion,
            rejection: rejectionPoints,
            citations: stimulatedPoints,
          },
        ],
      };
    });
  }, [dbStats]);

  const availableDates = useMemo(
    () => Array.from(new Set(dbSurveysCatalog.map((s) => s.surveyDate))),
    [dbSurveysCatalog],
  );

  const filteredSurveys = useMemo(
    () =>
      selectedDate === "ALL"
        ? dbSurveysCatalog
        : dbSurveysCatalog.filter((s) => s.surveyDate === selectedDate),
    [dbSurveysCatalog, selectedDate],
  );

  const activeSurvey = useMemo(
    () =>
      filteredSurveys.find((s) => s.id === selectedSurveyId) ??
      filteredSurveys[0] ??
      dbSurveysCatalog[0],
    [filteredSurveys, selectedSurveyId, dbSurveysCatalog],
  );

  const relatoriosList = useMemo(() => {
    if (!activeSurvey) return [];
    return (dbStats.relatorios ?? []).filter(
      (rel: any) => String(rel.id_pesquisa) === activeSurvey.id
    );
  }, [dbStats.relatorios, activeSurvey]);

  return (
    <section data-testid="integrated-overview-page" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Fluxo Guiado de Operação (Passo a Passo) */}
      <div
        data-testid="dashboard-guided-flow"
        style={{
          backgroundColor: colors.surfaceCard,
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: "16px",
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Fluxo Guiado de Operação (Passo a Passo)
          </span>
          <span style={{ fontSize: "11px", color: colors.textMuted }}>
            Clique em qualquer etapa para navegar diretamente
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))",
            gap: "8px",
          }}
        >
          {GUIDED_FLOW_STEPS.map((item) => (
            <button
              key={item.tab}
              type="button"
              data-testid={`guided-step-${item.step}`}
              onClick={() => useUiSessionStore.getState().setActiveTab(item.tab)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 11px",
                borderRadius: "10px",
                border: `1px solid ${colors.borderSubtle}`,
                backgroundColor: colors.surfaceContainerLow,
                color: colors.textPrimary,
                fontSize: "12px",
                fontWeight: 600,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "9999px",
                  backgroundColor: "rgba(138, 180, 248, 0.16)",
                  color: colors.primary,
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {item.step}
              </span>
              <span style={{ lineHeight: "15px" }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
        {[
          { label: "PESQUISAS CADASTRADAS", value: dbStats.total_pesquisas.toLocaleString("pt-BR"), color: colors.primaryContainer },
          { label: "CIDADES CADASTRADAS", value: dbStats.total_cidades.toLocaleString("pt-BR"), color: colors.successPastel },
          { label: "POPULAÇÃO DOS MUNICÍPIOS", value: dbStats.populacao_municipios.toLocaleString("pt-BR"), color: colors.textPrimary },
          { label: "TOTAL DE ENTREVISTAS", value: dbStats.total_entrevistas.toLocaleString("pt-BR"), color: colors.warningPastel },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              backgroundColor: colors.surfaceContainerLow,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: "14px",
              padding: "16px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: colors.textMuted, letterSpacing: "0.04em" }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: kpi.color, marginTop: "6px" }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <Card
        title="Dashboard - Pesquisas Eleitorais (Banco de Dados)"
        subtitle="Dados oficiais apurados diretamente das tabelas pesquisas, respostas e relatorios_tabulacao"
        badgeText={activeSurvey ? `Protocolo ${activeSurvey.protocolTse}` : undefined}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
            alignItems: "end",
          }}
        >
          <div>
            <label htmlFor="select-survey-date" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
              Filtrar por Data da Pesquisa
            </label>
            <select
              id="select-survey-date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: `1px solid ${colors.borderSubtle}`, fontSize: "13px", backgroundColor: colors.surfaceElevated, color: colors.textPrimary }}
            >
              <option value="ALL">Todas as Datas ({availableDates.length} rodadas)</option>
              {availableDates.map((dt) => (
                <option key={dt} value={dt}>{dt}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="select-survey-name" style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>
              Escolher Nome da Pesquisa (Protocolo TSE)
            </label>
            <select
              id="select-survey-name"
              value={activeSurvey?.id ?? ""}
              onChange={(e) => setSelectedSurveyId(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: `1px solid ${colors.borderSubtle}`, fontSize: "13px", backgroundColor: colors.surfaceElevated, color: colors.textPrimary }}
            >
              {filteredSurveys.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.surveyName} [{srv.protocolTse}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeSurvey && (
          <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: `1px solid ${colors.borderSubtle}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", fontSize: "12px", color: colors.onSurfaceVariant }}>
            <div style={{ display: "flex", gap: "18px", flexWrap: "wrap" }}>
              <span><strong>Pesquisa:</strong> {activeSurvey.surveyName}</span>
              <span><strong>Data:</strong> {activeSurvey.surveyDate}</span>
              <span><strong>Amostra (N):</strong> {activeSurvey.sampleSize} eleitores</span>
              <span><strong>Entrevistas Apuradas:</strong> {dbStats.entrevistas_realizadas}</span>
              <span><strong>Margem de Erro:</strong> ±{activeSurvey.marginOfError}%</span>
            </div>

            <button
              type="button"
              data-testid="btn-generate-executive-pdf"
              onClick={() => setDossierOpen(true)}
              style={{ padding: "9px 16px", backgroundColor: colors.primaryContainer, color: colors.onPrimary, border: "none", borderRadius: "10px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
            >
              📄 Gerar Dossiê Executivo PDF (TSE)
            </button>
          </div>
        )}

        {relatoriosList.length > 0 && (
          <div style={{ marginTop: "10px", fontSize: "12px", color: colors.successPastel }}>
            Relatório Consolidado: <strong>{relatoriosList[0].titulo_relatorio}</strong>
          </div>
        )}
      </Card>

      {activeSurvey?.offices.map((office) => (
        <OfficeSectionCard key={office.officeCode} office={office} />
      ))}

      {dossierOpen && activeSurvey && (
        <ExecutiveDossierModal survey={activeSurvey} onClose={() => setDossierOpen(false)} />
      )}
    </section>
  );
}

export { Dashboard as IntegratedOverviewFeature };
