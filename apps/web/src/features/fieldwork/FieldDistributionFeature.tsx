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

interface BackendAtribuicaoRow {
  readonly id_atribuicao: number;
  readonly id_pesquisa?: number | null;
  readonly id_profissional?: number | null;
  readonly id_bairro?: number | null;
  readonly pesquisa_nome?: string | null;
  readonly pesquisador_nome?: string | null;
  readonly nome_bairro?: string | null;
  readonly lote_setor?: string | null;
  readonly meta_entrevistas?: number | null;
  readonly quantidade_meta?: number | null;
  readonly quantidade_realizada?: number | null;
  readonly entrevistas_realizadas?: number | null;
  readonly data_inicio?: string | null;
  readonly data_limite?: string | null;
  readonly data_atribuicao?: string | null;
  readonly status_atribuicao?: string | null;
}

function formatDateBr(raw?: string | null): string | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString("pt-BR");
}

function formatPeriodLabel(row: BackendAtribuicaoRow): string {
  const start = formatDateBr(row.data_inicio ?? row.data_atribuicao);
  const end = formatDateBr(row.data_limite);
  if (start && end) return `${start} — ${end}`;
  return start ?? end ?? "—";
}

export function FieldDistributionFeature(): React.JSX.Element {
  const [assignments, setAssignments] = useState<readonly FieldAssignmentRecord[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/atribuicoes", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((items: unknown) => {
        if (!Array.isArray(items)) return;
        setAssignments(
          (items as BackendAtribuicaoRow[]).map((a) => {
            const target = Number(a.meta_entrevistas ?? a.quantidade_meta ?? 0);
            const completed = Number(a.quantidade_realizada ?? a.entrevistas_realizadas ?? 0);
            const rawStatus = (a.status_atribuicao ?? "").toLowerCase();
            const isConcluded =
              rawStatus === "concluida" ||
              rawStatus === "concluído" ||
              (target > 0 && completed >= target);

            return {
              id: a.id_atribuicao,
              surveyName: a.pesquisa_nome || `Pesquisa #${a.id_pesquisa ?? "?"}`,
              researcherName: a.pesquisador_nome || `Pesquisador #${a.id_profissional ?? "?"}`,
              neighborhoodName:
                a.nome_bairro ||
                a.lote_setor ||
                (a.id_bairro ? `Bairro #${a.id_bairro}` : "Setor Geral"),
              target,
              completed,
              date: formatPeriodLabel(a),
              status: isConcluded ? "Concluído" : "Em Andamento",
            };
          }),
        );
      })
      .catch(() => {
        setAssignments([]);
      });
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
        { header: "Período (Início — Limite)", key: "date", render: (a) => <span style={{ fontSize: "12px", color: "#94a3b8" }}>{a.date}</span> },
      ]}
      data={filtered}
      keyExtractor={(a) => String(a.id)}
    />
  );
}
