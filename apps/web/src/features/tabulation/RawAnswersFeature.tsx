import React, { useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";

export interface AnswerRecord {
  readonly id: number;
  readonly sessionId: number;
  readonly candidateName: string;
  readonly optionLabel: string;
  readonly textValue: string;
  readonly recordType: string;
  readonly latencyMs: number;
}

export function RawAnswersFeature(): React.JSX.Element {
  const [answers, setAnswers] = useState<readonly AnswerRecord[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODAS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/respostas", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((items: unknown) => {
        if (Array.isArray(items)) {
          setAnswers(
            items.map((r: any) => ({
              id: Number(r.id_resposta ?? 0),
              sessionId: Number(r.id_questionario_pessoa ?? 0),
              candidateName: String(
                r.nome_urna_comercial ||
                  (r.codigo_especial ? String(r.codigo_especial).replace(/_/g, " ") : "Resposta Direta")
              ),
              optionLabel: String(r.opcao_rotulo || r.valor_texto || r.tipo_registro || "—"),
              textValue: String(r.valor_texto || "—"),
              recordType: String(r.tipo_registro || "").trim().toLowerCase(),
              latencyMs: Number(r.tempo_resposta_ms ?? 0),
            }))
          );
        } else {
          setAnswers([]);
        }
      })
      .catch(() => setAnswers([]));
  }, []);

  const filtered = useMemo(() => {
    return answers.filter((a) => {
      if (activeTab !== "TODAS" && a.recordType !== activeTab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          a.candidateName.toLowerCase().includes(q) ||
          a.optionLabel.toLowerCase().includes(q) ||
          a.textValue.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [answers, activeTab, search]);

  const avgLatencyLabel = useMemo(() => {
    const withLatency = answers.filter((a) => a.latencyMs > 0);
    if (withLatency.length === 0) return "—";
    const avgMs = withLatency.reduce((acc, a) => acc + a.latencyMs, 0) / withLatency.length;
    return `${(avgMs / 1000).toFixed(2)} s`;
  }, [answers]);

  const uniqueSessionsCount = useMemo(
    () => new Set(answers.map((a) => a.sessionId)).size,
    [answers]
  );

  return (
    <EnterpriseCrudWorkspace<AnswerRecord>
      title="Fato de Respostas & Microdados Brutos"
      subtitle="Tabela transacional contendo cada voto individual, latência de decisão e candidato assinalado"
      tabs={[
        { id: "TODAS", label: "Todas as Respostas", count: answers.length },
        { id: "voto_direto", label: "Voto Direto", count: answers.filter((a) => a.recordType === "voto_direto").length },
        { id: "rejeicao", label: "Rejeição", count: answers.filter((a) => a.recordType === "rejeicao").length },
        { id: "likert", label: "Escala Likert", count: answers.filter((a) => a.recordType === "likert").length },
        { id: "aprovacao", label: "Aprovação", count: answers.filter((a) => a.recordType === "aprovacao").length },
        { id: "texto", label: "Texto Livre", count: answers.filter((a) => a.recordType === "texto").length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-ans-total", label: "Respostas Gravadas", value: answers.length, helperText: "Tabela respostas", variant: "default" },
        { id: "kpi-ans-latency", label: "Latência Média de Decisão", value: avgLatencyLabel, helperText: "Média registrada no BD", variant: "success" },
        { id: "kpi-ans-sessions", label: "Sessões com Respostas", value: uniqueSessionsCount, helperText: "questionarios_pessoas", variant: "default" },
      ]}
      searchPlaceholder="Buscar por candidato, opção ou texto..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "ID Resposta", key: "id", render: (a) => <span style={{ color: "#94a3b8" }}>#{a.id}</span> },
        { header: "Sessão / Eleitor", key: "sessionId", render: (a) => <span>Sessão #{a.sessionId}</span> },
        { header: "Candidato / Item", key: "candidateName", render: (a) => <span style={{ fontWeight: 600, color: "#f8fafc" }}>{a.candidateName}</span> },
        { header: "Alternativa Selecionada", key: "optionLabel", render: (a) => <span style={{ color: "#38bdf8" }}>{a.optionLabel}</span> },
        { header: "Tipo de Registro", key: "recordType", render: (a) => <span style={{ padding: "2px 8px", borderRadius: "6px", backgroundColor: "#1e293b", fontSize: "11px" }}>{a.recordType || "—"}</span> },
        { header: "Latência (ms)", key: "latencyMs", render: (a) => <span style={{ fontWeight: 700, color: "#facc15" }}>{a.latencyMs > 0 ? `${a.latencyMs} ms` : "—"}</span> },
      ]}
      data={filtered}
      keyExtractor={(a) => String(a.id)}
    />
  );
}
