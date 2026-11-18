import React, { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { OfficeSectionCard } from "./OverviewCharts";
import type { OverviewSurveyDataset, CandidateStatPoint, ScenarioDataset } from "./overviewData";
import { ExecutiveDossierModal } from "./ExecutiveDossierModal";

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

    const toPoints = (rows: any[], prefix: string): CandidateStatPoint[] => {
      const total = rows.reduce((acc: number, v: any) => acc + (Number(v.votos) || 0), 0);
      return rows.map((v: any, idx: number) => {
        const qtd = Number(v.votos) || 0;
        const pct = total > 0 ? (qtd / total) * 100 : 0;
        return {
          code: `${prefix}-${idx + 1}`,
          name: v.candidato,
          party: v.partido,
          quantity: qtd,
          frequency: `${qtd}`,
          percentage: pct.toFixed(2),
          color: v.cor_hex || (idx === 0 ? "#8ab4f8" : idx === 1 ? "#81c995" : "#94a3b8"),
        };
      });
    };

    return pesqs.map((p: any) => {
      const votosPesq = votosAll.filter((v: any) => v.id_pesquisa === p.id_pesquisa);
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

      const rejRows = rejeicaoAll.filter((v: any) => v.id_pesquisa === p.id_pesquisa);
      const rejectionPoints = toPoints(rejRows, `P${p.id_pesquisa}-REJ`);
      const sampleCount = stimulatedPoints.reduce((acc, pt) => acc + pt.quantity, 0);

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
            spontaneous: spontaneousPoints,
            stimulated: stimulatedPoints,
            scenarios,
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
        {[
          { label: "PESQUISAS CADASTRADAS", value: dbStats.total_pesquisas.toLocaleString("pt-BR"), color: "#8ab4f8" },
          { label: "CIDADES CADASTRADAS", value: dbStats.total_cidades.toLocaleString("pt-BR"), color: "#81c995" },
          { label: "POPULAÇÃO DOS MUNICÍPIOS", value: dbStats.populacao_municipios.toLocaleString("pt-BR"), color: "#f8fafc" },
          { label: "TOTAL DE ENTREVISTAS", value: dbStats.total_entrevistas.toLocaleString("pt-BR"), color: "#fde293" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              backgroundColor: "#1b1c1d",
              border: "1px solid #2d2f31",
              borderRadius: "14px",
              padding: "16px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", letterSpacing: "0.04em" }}>
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
              style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: "1px solid #353535", fontSize: "13px", backgroundColor: "#252628", color: "#f8fafc" }}
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
              style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: "1px solid #353535", fontSize: "13px", backgroundColor: "#252628", color: "#f8fafc" }}
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
          <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid #353535", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap", fontSize: "12px", color: "#c3c6d1" }}>
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
              style={{ padding: "9px 16px", backgroundColor: "#8ab4f8", color: "#003061", border: "none", borderRadius: "10px", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
            >
              📄 Gerar Dossiê Executivo PDF (TSE)
            </button>
          </div>
        )}

        {relatoriosList.length > 0 && (
          <div style={{ marginTop: "10px", fontSize: "12px", color: "#81c995" }}>
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
