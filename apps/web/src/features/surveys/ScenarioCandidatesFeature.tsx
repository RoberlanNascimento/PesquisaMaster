import React, { useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";

export interface ScenarioCandidateRecord {
  readonly id: number;
  readonly scenarioId: number;
  readonly candidateName: string;
  readonly partyAcronym: string;
  readonly roleCategory: string;
  readonly displayOrder: number;
}

const INITIAL_SCENARIO_CANDIDATES: readonly ScenarioCandidateRecord[] = [
  { id: 1, scenarioId: 1, candidateName: "Tarcísio de Freitas", partyAcronym: "REPUBLICANOS", roleCategory: "Governador", displayOrder: 1 },
  { id: 2, scenarioId: 1, candidateName: "Guilherme Boulos", partyAcronym: "PSOL", roleCategory: "Prefeito", displayOrder: 2 },
  { id: 3, scenarioId: 1, candidateName: "Tabata Amaral", partyAcronym: "PSB", roleCategory: "Prefeito", displayOrder: 3 },
  { id: 4, scenarioId: 1, candidateName: "Ricardo Nunes", partyAcronym: "MDB", roleCategory: "Prefeito", displayOrder: 4 },
  { id: 5, scenarioId: 2, candidateName: "Guilherme Boulos", partyAcronym: "PSOL", roleCategory: "Prefeito (2º Turno)", displayOrder: 1 },
  { id: 6, scenarioId: 2, candidateName: "Ricardo Nunes", partyAcronym: "MDB", roleCategory: "Prefeito (2º Turno)", displayOrder: 2 },
];

export function ScenarioCandidatesFeature(): React.JSX.Element {
  const [records, setRecords] = useState<readonly ScenarioCandidateRecord[]>(INITIAL_SCENARIO_CANDIDATES);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/cenario-candidatos")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: any[]) => {
        if (items && items.length > 0) {
          setRecords(
            items.map((c) => ({
              id: c.id_cenario_candidato,
              scenarioId: c.id_cenario,
              candidateName: c.nome_urna_comercial || `Candidato #${c.id_candidato_produto}`,
              partyAcronym: c.sigla_partido_marca || "Sem Partido",
              roleCategory: c.cargo_categoria || "Geral",
              displayOrder: c.ordem_apresentacao ?? 1,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (activeTab === "CENARIO_1" && r.scenarioId !== 1) return false;
      if (activeTab === "CENARIO_2" && r.scenarioId !== 2) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return r.candidateName.toLowerCase().includes(q) || r.partyAcronym.toLowerCase().includes(q);
      }
      return true;
    });
  }, [records, activeTab, search]);

  return (
    <EnterpriseCrudWorkspace<ScenarioCandidateRecord>
      title="Cartelas de Candidatos por Cenário"
      subtitle="Associação dos candidatos que compõem cada cartela de teste e ordem de exibição — Tabela cenario_candidatos"
      tabs={[
        { id: "TODOS", label: "Todas as Cartelas", count: records.length },
        { id: "CENARIO_1", label: "Cenário 1 (1º Turno)", count: records.filter((r) => r.scenarioId === 1).length },
        { id: "CENARIO_2", label: "Cenário 2 (2º Turno)", count: records.filter((r) => r.scenarioId === 2).length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-sc-total", label: "Candidatos em Cartelas", value: records.length, helperText: "Tabela cenario_candidatos", variant: "default" },
        { id: "kpi-sc-scenarios", label: "Cenários Configurados", value: new Set(records.map((r) => r.scenarioId)).size, helperText: "Espontânea / Estimulada", variant: "success" },
        { id: "kpi-sc-rotation", label: "Disco de Rotação", value: "Aleatorizado", helperText: "Equilíbrio de probabilidade", variant: "success" },
      ]}
      searchPlaceholder="Buscar por candidato ou partido..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "Cenário", key: "scenarioId", render: (r) => <span style={{ fontWeight: 700, color: "#a78bfa" }}>Cenário #{r.scenarioId}</span> },
        { header: "Ordem Base", key: "displayOrder", render: (r) => <span style={{ fontWeight: 700, color: "#38bdf8" }}>Posição #{r.displayOrder}</span> },
        { header: "Nome de Urna", key: "candidateName", render: (r) => <span style={{ fontWeight: 600, color: "#f8fafc" }}>{r.candidateName}</span> },
        { header: "Partido / Legenda", key: "partyAcronym", render: (r) => <span style={{ padding: "2px 8px", borderRadius: "6px", backgroundColor: "#1e293b", color: "#fde047", fontSize: "11px", fontWeight: 600 }}>{r.partyAcronym}</span> },
        { header: "Cargo / Disputa", key: "roleCategory", render: (r) => <span style={{ color: "#94a3b8" }}>{r.roleCategory}</span> },
      ]}
      data={filtered}
      keyExtractor={(r) => String(r.id)}
    />
  );
}

