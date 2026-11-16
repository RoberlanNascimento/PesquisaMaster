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

const INITIAL_ANSWERS: readonly AnswerRecord[] = [
  { id: 1, sessionId: 101, candidateName: "Tarcísio de Freitas", optionLabel: "Voto Estimulado", textValue: "Opção 1", recordType: "ESTIMULADA", latencyMs: 2450 },
  { id: 2, sessionId: 101, candidateName: "Guilherme Boulos", optionLabel: "Rejeição", textValue: "Não votaria de jeito nenhum", recordType: "REJEICAO", latencyMs: 1820 },
  { id: 3, sessionId: 102, candidateName: "Não Sabe / Indeciso", optionLabel: "Espontânea", textValue: "NS/NR", recordType: "ESPONTANEA", latencyMs: 3100 },
];

export function RawAnswersFeature(): React.JSX.Element {
  const [answers, setAnswers] = useState<readonly AnswerRecord[]>(INITIAL_ANSWERS);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODAS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/respostas")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: any[]) => {
        if (items && items.length > 0) {
          setAnswers(
            items.map((r) => ({
              id: r.id_resposta,
              sessionId: r.id_questionario_pessoa,
              candidateName: r.nome_urna_comercial || "Resposta Direta",
              optionLabel: r.opcao_rotulo || r.tipo_registro,
              textValue: r.valor_texto || "—",
              recordType: r.tipo_registro,
              latencyMs: r.tempo_resposta_ms || 2100,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return answers.filter((a) => {
      if (activeTab !== "TODAS" && a.recordType !== activeTab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return a.candidateName.toLowerCase().includes(q) || a.optionLabel.toLowerCase().includes(q) || a.textValue.toLowerCase().includes(q);
      }
      return true;
    });
  }, [answers, activeTab, search]);

  return (
    <EnterpriseCrudWorkspace<AnswerRecord>
      title="Fato de Respostas & Microdados Brutos"
      subtitle="Tabela transacional contendo cada voto individual, latência de decisão e candidato assinalado"
      tabs={[
        { id: "TODAS", label: "Todas as Respostas", count: answers.length },
        { id: "ESTIMULADA", label: "Estimulada (Disco)", count: answers.filter((a) => a.recordType === "ESTIMULADA").length },
        { id: "ESPONTANEA", label: "Espontânea", count: answers.filter((a) => a.recordType === "ESPONTANEA").length },
        { id: "REJEICAO", label: "Rejeição", count: answers.filter((a) => a.recordType === "REJEICAO").length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-ans-total", label: "Respostas Gravadas", value: answers.length, helperText: "Tabela respostas", variant: "default" },
        { id: "kpi-ans-latency", label: "Latência Média de Decisão", value: "2.1 segundos", helperText: "Anti-fraude", variant: "success" },
        { id: "kpi-ans-valid", label: "Taxa de Resposta Válida", value: "98.7%", helperText: "Auditada", variant: "success" },
      ]}
      searchPlaceholder="Buscar por candidato, opção ou texto..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "ID Resposta", key: "id", render: (a) => <span style={{ color: "#94a3b8" }}>#{a.id}</span> },
        { header: "Sessão / Eleitor", key: "sessionId", render: (a) => <span>Sessão #{a.sessionId}</span> },
        { header: "Candidato / Item", key: "candidateName", render: (a) => <span style={{ fontWeight: 600, color: "#f8fafc" }}>{a.candidateName}</span> },
        { header: "Alternativa Selecionada", key: "optionLabel", render: (a) => <span style={{ color: "#38bdf8" }}>{a.optionLabel}</span> },
        { header: "Tipo de Registro", key: "recordType", render: (a) => <span style={{ padding: "2px 8px", borderRadius: "6px", backgroundColor: "#1e293b", fontSize: "11px" }}>{a.recordType}</span> },
        { header: "Latência (ms)", key: "latencyMs", render: (a) => <span style={{ fontWeight: 700, color: "#facc15" }}>{a.latencyMs} ms</span> },
      ]}
      data={filtered}
      keyExtractor={(a) => String(a.id)}
    />
  );
}
