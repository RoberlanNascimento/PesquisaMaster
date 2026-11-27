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

function normalizeAuditStatus(raw: unknown): string {
  return String(raw ?? "pendente").trim().toLowerCase();
}

function getAuditStatusStyle(status: string): { label: string; color: string } {
  switch (status) {
    case "aprovada":
      return { label: "aprovada", color: "#4ade80" };
    case "pendente":
      return { label: "pendente", color: "#facc15" };
    case "reprovada":
      return { label: "reprovada", color: "#f87171" };
    case "expurgada":
      return { label: "expurgada", color: "#fb923c" };
    default:
      return { label: status || "desconhecido", color: "#94a3b8" };
  }
}

export function FieldSessionsFeature(): React.JSX.Element {
  const [sessions, setSessions] = useState<readonly FieldSessionRecord[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODAS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/sessoes-campo", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((items: unknown) => {
        if (Array.isArray(items)) {
          setSessions(
            items.map((s: any) => ({
              id: Number(s.id_questionario_pessoa ?? 0),
              surveyName: String(s.pesquisa_nome || `Pesquisa #${s.id_pesquisa ?? "?"}`),
              respondentName: `Entrevistado #${s.id_pessoa ?? s.id_questionario_pessoa ?? "?"}`,
              researcherName: String(s.pesquisador_nome || "Pesquisador Credenciado"),
              dateAnswered: s.data_resposta ? new Date(s.data_resposta).toLocaleString("pt-BR") : "—",
              durationSeconds: Number(s.duracao_segundos ?? 0),
              auditStatus: normalizeAuditStatus(s.status_auditoria),
              sampleWeight: Number(s.peso_amostral ?? 1.0),
            }))
          );
        } else {
          setSessions([]);
        }
      })
      .catch(() => setSessions([]));
  }, []);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (activeTab !== "TODAS" && s.auditStatus !== activeTab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.surveyName.toLowerCase().includes(q) ||
          s.researcherName.toLowerCase().includes(q) ||
          s.respondentName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sessions, activeTab, search]);

  const approvedCount = useMemo(
    () => sessions.filter((s) => s.auditStatus === "aprovada").length,
    [sessions]
  );

  const avgDurationLabel = useMemo(() => {
    const withDur = sessions.filter((s) => s.durationSeconds > 0);
    if (withDur.length === 0) return "—";
    const avg = Math.round(withDur.reduce((acc, s) => acc + s.durationSeconds, 0) / withDur.length);
    return `${Math.floor(avg / 60)}m ${avg % 60}s`;
  }, [sessions]);

  const approvalRateLabel = useMemo(() => {
    if (sessions.length === 0) return "0%";
    return `${((approvedCount / sessions.length) * 100).toFixed(1)}%`;
  }, [approvedCount, sessions.length]);

  return (
    <EnterpriseCrudWorkspace<FieldSessionRecord>
      title="Sessões de Campo & Questionários Aplicados"
      subtitle="Registro individual de entrevistas presenciais com carimbo temporal, GPS e auditoria"
      tabs={[
        { id: "TODAS", label: "Todas as Sessões", count: sessions.length },
        { id: "aprovada", label: "Aprovadas", count: approvedCount },
        { id: "pendente", label: "Pendentes", count: sessions.filter((s) => s.auditStatus === "pendente").length },
        { id: "reprovada", label: "Reprovadas", count: sessions.filter((s) => s.auditStatus === "reprovada").length },
        { id: "expurgada", label: "Expurgadas", count: sessions.filter((s) => s.auditStatus === "expurgada").length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-sess-total", label: "Sessões Concluídas", value: sessions.length, helperText: "questionarios_pessoas", variant: "default" },
        { id: "kpi-sess-approved", label: "Taxa de Aprovação", value: approvalRateLabel, helperText: `${approvedCount} aprovadas`, variant: "success" },
        { id: "kpi-sess-avg-time", label: "Tempo Médio de Entrevista", value: avgDurationLabel, helperText: "Média registrada no BD", variant: "default" },
      ]}
      searchPlaceholder="Buscar por pesquisa, pesquisador ou respondente..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "Pesquisa", key: "surveyName", render: (s) => <span style={{ fontWeight: 600, color: "#f8fafc" }}>{s.surveyName}</span> },
        { header: "Respondente", key: "respondentName", render: (s) => <span style={{ color: "#38bdf8" }}>{s.respondentName}</span> },
        { header: "Pesquisador", key: "researcherName", render: (s) => <span style={{ color: "#94a3b8" }}>{s.researcherName}</span> },
        { header: "Data / Hora", key: "dateAnswered", render: (s) => <span style={{ fontSize: "11px" }}>{s.dateAnswered}</span> },
        {
          header: "Duração",
          key: "durationSeconds",
          render: (s) => (
            <span>{s.durationSeconds > 0 ? `${Math.floor(s.durationSeconds / 60)}m ${s.durationSeconds % 60}s` : "—"}</span>
          ),
        },
        {
          header: "Auditoria",
          key: "auditStatus",
          render: (s) => {
            const st = getAuditStatusStyle(s.auditStatus);
            return (
              <span style={{ padding: "2px 8px", borderRadius: "6px", backgroundColor: "#1e293b", color: st.color, fontSize: "11px", fontWeight: 600 }}>
                {st.label}
              </span>
            );
          },
        },
        { header: "Peso Amostral", key: "sampleWeight", render: (s) => <span style={{ fontWeight: 700, color: "#facc15" }}>{s.sampleWeight.toFixed(4)}</span> },
      ]}
      data={filtered}
      keyExtractor={(s) => String(s.id)}
    />
  );
}
