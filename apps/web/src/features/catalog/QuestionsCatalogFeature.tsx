import React, { useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";

export interface QuestionRecord {
  readonly id: number;
  readonly text: string;
  readonly type: string;
  readonly category: string;
  readonly scaleGroup: string;
  readonly isMandatory: boolean;
}

const INITIAL_QUESTIONS: readonly QuestionRecord[] = [
  { id: 1, text: "Se a eleição para Prefeito fosse hoje, em quem você votaria? (Espontânea)", type: "ESPONTANEA", category: "Intenção de Voto", scaleGroup: "Livre / Candidatos", isMandatory: true },
  { id: 2, text: "Desses nomes apresentados neste disco, em quem você votaria? (Estimulada)", type: "ESTIMULADA", category: "Intenção de Voto", scaleGroup: "Disco Oficial TSE", isMandatory: true },
  { id: 3, text: "E em qual destes candidatos você NÃO votaria de jeito nenhum? (Rejeição)", type: "REJEICAO", category: "Rejeição Eleitoral", scaleGroup: "Múltipla / Disco", isMandatory: true },
  { id: 4, text: "Como você avalia a atual administração do Prefeito municipal?", type: "ESCALA", category: "Avaliação de Gestão", scaleGroup: "Escala Likert 5 Pontos (Ótimo a Péssimo)", isMandatory: true },
  { id: 5, text: "Você aprova ou desaprova a forma como o Governador vem administrando o Estado?", type: "DICOTOMICA", category: "Aprovação de Governo", scaleGroup: "Binária (Aprova / Desaprova)", isMandatory: true },
];

export function QuestionsCatalogFeature(): React.JSX.Element {
  const [questions, setQuestions] = useState<readonly QuestionRecord[]>(INITIAL_QUESTIONS);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/perguntas")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: any[]) => {
        if (items && items.length > 0) {
          setQuestions(
            items.map((q) => ({
              id: q.id_pergunta,
              text: q.texto_pergunta,
              type: q.tipo_pergunta || "ESTIMULADA",
              category: q.categoria || "Geral",
              scaleGroup: q.nome_grupo || q.tipo_escala || "Opções Padrão",
              isMandatory: Boolean(q.obrigatoria),
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (activeTab === "VOTO" && !q.category.toLowerCase().includes("voto")) return false;
      if (activeTab === "GESTAO" && !q.category.toLowerCase().includes("gestão") && !q.category.toLowerCase().includes("governo")) return false;
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          q.text.toLowerCase().includes(query) ||
          q.category.toLowerCase().includes(query) ||
          q.type.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [questions, activeTab, search]);

  return (
    <EnterpriseCrudWorkspace<QuestionRecord>
      title="Banco de Perguntas & Catálogo de Itens"
      subtitle="Repositório central de enunciados, baterias de avaliação e escalas para questionários eleitorais"
      tabs={[
        { id: "TODOS", label: "Todas as Perguntas", count: questions.length },
        { id: "VOTO", label: "Intenção de Voto", count: questions.filter((q) => q.category.toLowerCase().includes("voto")).length },
        { id: "GESTAO", label: "Avaliação & Aprovação", count: questions.filter((q) => q.category.toLowerCase().includes("gestão") || q.category.toLowerCase().includes("governo")).length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-q-total", label: "Perguntas Cadastradas", value: questions.length, helperText: "Tabela perguntas", variant: "default" },
        { id: "kpi-q-likert", label: "Baterias Integradas", value: "Escala Likert", helperText: "Validadas TSE", variant: "success" },
        { id: "kpi-q-bias", label: "Padrão Metodológico", value: "Auditado", helperText: "Blindagem de viés", variant: "success" },
      ]}
      searchPlaceholder="Buscar por enunciado, categoria ou tipo..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "ID", key: "id", render: (q) => <span style={{ fontWeight: 700, color: "#38bdf8" }}>#{q.id}</span> },
        { header: "Enunciado da Pergunta", key: "text", render: (q) => <span style={{ fontWeight: 600, color: "#f8fafc" }}>{q.text}</span> },
        { header: "Categoria Metodológica", key: "category", render: (q) => <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", backgroundColor: "#1e293b", color: "#e2e8f0" }}>{q.category}</span> },
        { header: "Tipo / Formato", key: "type", render: (q) => <span style={{ color: "#a78bfa", fontWeight: 600 }}>{q.type}</span> },
        { header: "Régua / Escala", key: "scaleGroup", render: (q) => <span style={{ color: "#94a3b8" }}>{q.scaleGroup}</span> },
      ]}
      data={filtered}
      keyExtractor={(q) => String(q.id)}
    />
  );
}
