import React, { useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";

export interface FieldAssignmentRecord {
  readonly id: number;
  readonly surveyName: string;
  readonly researcherName: string;
  readonly neighborhoodName: string;
  readonly target: number;
  readonly completed: number;
  readonly date: string;
  readonly status: string;
}

const INITIAL_ASSIGNMENTS: readonly FieldAssignmentRecord[] = [
  { id: 1, surveyName: "Pesquisa Eleitoral Belém 2026", researcherName: "Ana Paula de Souza", neighborhoodName: "Marco", target: 50, completed: 42, date: "10/11/2026", status: "Em Andamento" },
  { id: 2, surveyName: "Pesquisa Eleitoral Belém 2026", researcherName: "Carlos Eduardo Silva", neighborhoodName: "Umarizal", target: 40, completed: 40, date: "10/11/2026", status: "Concluído" },
  { id: 3, surveyName: "Pesquisa Eleitoral Belém 2026", researcherName: "Marcos Vinicius Lima", neighborhoodName: "Guamá", target: 60, completed: 25, date: "11/11/2026", status: "Em Andamento" },
  { id: 4, surveyName: "Pesquisa Eleitoral Belém 2026", researcherName: "Juliana Mendes", neighborhoodName: "Pedreira", target: 45, completed: 10, date: "12/11/2026", status: "Em Andamento" },
];

export function FieldDistributionFeature(): React.JSX.Element {
  const [assignments, setAssignments] = useState<readonly FieldAssignmentRecord[]>(INITIAL_ASSIGNMENTS);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/atribuicoes")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: any[]) => {
        if (items && items.length > 0) {
          setAssignments(
            items.map((a) => ({
              id: a.id_atribuicao,
              surveyName: a.pesquisa_nome || `Pesquisa #${a.id_pesquisa}`,
              researcherName: a.pesquisador_nome || `Pesquisador #${a.id_profissional}`,
              neighborhoodName: a.nome_bairro || `Bairro #${a.id_bairro}`,
              target: a.quantidade_meta ?? 0,
              completed: a.quantidade_realizada ?? 0,
              date: a.data_atribuicao ? new Date(a.data_atribuicao).toLocaleDateString("pt-BR") : "Recentemente",
              status: (a.quantidade_realizada ?? 0) >= (a.quantidade_meta ?? 1) ? "Concluído" : "Em Andamento",
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return assignments.filter((a) => {
      if (activeTab === "CONCLUIDAS" && a.status !== "Concluído") return false;
      if (activeTab === "ANDAMENTO" && a.status !== "Em Andamento") return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          a.researcherName.toLowerCase().includes(q) ||
          a.neighborhoodName.toLowerCase().includes(q) ||
          a.surveyName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [assignments, activeTab, search]);

  const totalTarget = useMemo(() => assignments.reduce((acc, a) => acc + a.target, 0), [assignments]);
  const totalCompleted = useMemo(() => assignments.reduce((acc, a) => acc + a.completed, 0), [assignments]);
  const progressPct = totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0;

  return (
    <EnterpriseCrudWorkspace<FieldAssignmentRecord>
      title="Distribuição de Metas & Logística de Campo"
      subtitle="Alocação e acompanhamento de cotas de entrevistas por pesquisador e setor censitário"
      tabs={[
        { id: "TODOS", label: "Todas as Alocações", count: assignments.length },
        { id: "ANDAMENTO", label: "Em Coleta", count: assignments.filter((a) => a.status === "Em Andamento").length },
        { id: "CONCLUIDAS", label: "Metas Batidas", count: assignments.filter((a) => a.status === "Concluído").length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-field-target", label: "Meta Total Amostral", value: totalTarget, helperText: "Tabela atribuicao_pesquisadores", variant: "default" },
        { id: "kpi-field-completed", label: "Coleta Realizada", value: totalCompleted, helperText: `${progressPct}% concluído`, variant: "success" },
        { id: "kpi-field-active", label: "Pesquisadores em Campo", value: new Set(assignments.map((a) => a.researcherName)).size, helperText: "Equipe ativa", variant: "default" },
      ]}
      searchPlaceholder="Buscar por pesquisador, bairro ou pesquisa..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "Pesquisador", key: "researcherName", render: (a) => <span style={{ fontWeight: 600, color: "#f8fafc" }}>{a.researcherName}</span> },
        { header: "Pesquisa", key: "surveyName", render: (a) => <span style={{ color: "#cbd5e1" }}>{a.surveyName}</span> },
        { header: "Bairro / Setor", key: "neighborhoodName", render: (a) => <span style={{ color: "#38bdf8", fontWeight: 600 }}>{a.neighborhoodName}</span> },
        { header: "Meta / Realizado", key: "target", render: (a) => <span>{a.completed} / {a.target}</span> },
        {
          header: "Progresso",
          key: "status",
          render: (a) => {
            const pct = a.target > 0 ? Math.min(100, Math.round((a.completed / a.target) * 100)) : 0;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "60px", height: "6px", borderRadius: "3px", backgroundColor: "#334155", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", backgroundColor: pct >= 100 ? "#4ade80" : "#38bdf8" }} />
                </div>
                <span style={{ fontSize: "11px", color: pct >= 100 ? "#4ade80" : "#94a3b8" }}>{pct}%</span>
              </div>
            );
          },
        },
        { header: "Data Atribuição", key: "date", render: (a) => <span style={{ fontSize: "12px", color: "#94a3b8" }}>{a.date}</span> },
      ]}
      data={filtered}
      keyExtractor={(a) => String(a.id)}
    />
  );
}
