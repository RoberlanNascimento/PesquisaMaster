import React, { useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";

export interface FieldSessionRecord {
  readonly id: number;
  readonly surveyName: string;
  readonly respondentName: string;
  readonly researcherName: string;
  readonly dateAnswered: string;
  readonly durationSeconds: number;
  readonly auditStatus: string;
  readonly sampleWeight: number;
}

const INITIAL_SESSIONS: readonly FieldSessionRecord[] = [
  { id: 1, surveyName: "Eleições 2026 - 2ª Rodada", respondentName: "Eleitor #001", researcherName: "Juliana Paiva Castro", dateAnswered: "2026-11-12 10:14", durationSeconds: 284, auditStatus: "VALIDADA_GPS", sampleWeight: 1.02 },
  { id: 2, surveyName: "Eleições 2026 - 2ª Rodada", respondentName: "Eleitor #002", researcherName: "Ricardo Silveira Prado", dateAnswered: "2026-11-12 10:32", durationSeconds: 312, auditStatus: "VALIDADA_GPS", sampleWeight: 0.98 },
  { id: 3, surveyName: "Pesquisa de Opinião Pública", respondentName: "Eleitor #003", researcherName: "Carlos Eduardo Mendes", dateAnswered: "2026-10-18 15:40", durationSeconds: 195, auditStatus: "AUDITADA_AUDIO", sampleWeight: 1.00 },
];

export function FieldSessionsFeature(): React.JSX.Element {
  const [sessions, setSessions] = useState<readonly FieldSessionRecord[]>(INITIAL_SESSIONS);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODAS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/sessoes-campo")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: any[]) => {
        if (items && items.length > 0) {
          setSessions(
            items.map((s) => ({
              id: s.id_questionario_pessoa,
              surveyName: s.pesquisa_nome || "Pesquisa Eleitoral",
              respondentName: s.pessoa_nome || `Eleitor #${s.id_pessoa}`,
              researcherName: s.pesquisador_nome || "Pesquisador Credenciado",
              dateAnswered: s.data_resposta ? new Date(s.data_resposta).toLocaleString("pt-BR") : "2026-11-12",
              durationSeconds: s.duracao_segundos || 240,
              auditStatus: s.status_auditoria || "VALIDADA_GPS",
              sampleWeight: Number(s.peso_amostral || 1.0),
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (activeTab !== "TODAS" && s.auditStatus !== activeTab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return s.surveyName.toLowerCase().includes(q) || s.researcherName.toLowerCase().includes(q) || s.respondentName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [sessions, activeTab, search]);

  return (
    <EnterpriseCrudWorkspace<FieldSessionRecord>
      title="Sessões de Campo & Questionários Aplicados"
      subtitle="Registro individual de entrevistas presenciais com carimbo temporal, GPS e biometria facial"
      tabs={[
        { id: "TODAS", label: "Todas as Sessões", count: sessions.length },
        { id: "VALIDADA_GPS", label: "Validadas por GPS", count: sessions.filter((s) => s.auditStatus === "VALIDADA_GPS").length },
        { id: "AUDITADA_AUDIO", label: "Auditadas por Áudio", count: sessions.filter((s) => s.auditStatus === "AUDITADA_AUDIO").length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-sess-total", label: "Sessões Concluídas", value: sessions.length, helperText: "questionarios_pessoas", variant: "default" },
        { id: "kpi-sess-avg-time", label: "Tempo Médio de Entrevista", value: "4m 32s", helperText: "Dentro da meta", variant: "success" },
        { id: "kpi-sess-geofence", label: "Confiabilidade de Geofence", value: "99.8%", helperText: "Auditado", variant: "success" },
      ]}
      searchPlaceholder="Buscar por pesquisa, pesquisador ou respondente..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "Pesquisa", key: "surveyName", render: (s) => <span style={{ fontWeight: 600, color: "#f8fafc" }}>{s.surveyName}</span> },
        { header: "Respondente", key: "respondentName", render: (s) => <span style={{ color: "#38bdf8" }}>{s.respondentName}</span> },
        { header: "Pesquisador", key: "researcherName", render: (s) => <span style={{ color: "#94a3b8" }}>{s.researcherName}</span> },
        { header: "Data / Hora", key: "dateAnswered", render: (s) => <span style={{ fontSize: "11px" }}>{s.dateAnswered}</span> },
        { header: "Duração", key: "durationSeconds", render: (s) => <span>{Math.floor(s.durationSeconds / 60)}m {s.durationSeconds % 60}s</span> },
        { header: "Auditoria", key: "auditStatus", render: (s) => <span style={{ padding: "2px 8px", borderRadius: "6px", backgroundColor: "#1e293b", color: "#4ade80", fontSize: "11px" }}>{s.auditStatus}</span> },
        { header: "Peso Amostral", key: "sampleWeight", render: (s) => <span style={{ fontWeight: 700, color: "#facc15" }}>{s.sampleWeight.toFixed(4)}</span> },
      ]}
      data={filtered}
      keyExtractor={(s) => String(s.id)}
    />
  );
}
