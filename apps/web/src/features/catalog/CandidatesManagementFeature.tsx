import React, { useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";

export interface CandidateRecord {
  readonly id: number;
  readonly urnName: string;
  readonly fullName: string;
  readonly partyNumber: number | null;
  readonly partyAcronym: string | null;
  readonly roleCategory: string;
  readonly colorHex: string;
  readonly active: boolean;
}

const INITIAL_CANDIDATES: readonly CandidateRecord[] = [
  { id: 1, urnName: "Tarcísio de Freitas", fullName: "Tarcísio Gomes de Freitas", partyNumber: 10, partyAcronym: "REPUBLICANOS", roleCategory: "Governador", colorHex: "#2563eb", active: true },
  { id: 2, urnName: "Guilherme Boulos", fullName: "Guilherme Castro Boulos", partyNumber: 50, partyAcronym: "PSOL", roleCategory: "Prefeito", colorHex: "#dc2626", active: true },
  { id: 3, urnName: "Tabata Amaral", fullName: "Tabata Claudia Amaral de Pontes", partyNumber: 40, partyAcronym: "PSB", roleCategory: "Prefeito", colorHex: "#f59e0b", active: true },
  { id: 4, urnName: "Ricardo Nunes", fullName: "Ricardo Luis Reis Nunes", partyNumber: 15, partyAcronym: "MDB", roleCategory: "Prefeito", colorHex: "#16a34a", active: true },
];

export function CandidatesManagementFeature(): React.JSX.Element {
  const [candidates, setCandidates] = useState<readonly CandidateRecord[]>(INITIAL_CANDIDATES);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/candidatos")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: any[]) => {
        if (data && data.length > 0) {
          setCandidates(
            data.map((c) => ({
              id: c.id_candidato_produto,
              urnName: c.nome_urna_comercial,
              fullName: c.nome_completo_razao,
              partyNumber: c.numero_partido,
              partyAcronym: c.sigla_partido_marca,
              roleCategory: c.cargo_categoria,
              colorHex: c.cor_hex || "#3b82f6",
              active: c.ativo,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (activeTab === "ATIVOS" && !c.active) return false;
      if (activeTab === "INATIVOS" && c.active) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return c.urnName.toLowerCase().includes(q) || c.fullName.toLowerCase().includes(q) || (c.partyAcronym?.toLowerCase().includes(q) ?? false);
      }
      return true;
    });
  }, [candidates, activeTab, search]);

  return (
    <EnterpriseCrudWorkspace<CandidateRecord>
      title="Catálogo de Candidatos & Marcas"
      subtitle="Cadastro oficial de candidatos, partidos, discos de rotação e produtos pesquisados"
      tabs={[
        { id: "TODOS", label: "Todos os Candidatos", count: candidates.length },
        { id: "ATIVOS", label: "Em Disputa Ativa", count: candidates.filter((c) => c.active).length },
        { id: "INATIVOS", label: "Inativos / Indeferidos", count: candidates.filter((c) => !c.active).length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-cand-total", label: "Candidatos Cadastrados", value: candidates.length, helperText: "Tabela candidatos_produtos", variant: "default" },
        { id: "kpi-cand-parties", label: "Partidos Representados", value: new Set(candidates.map((c) => c.partyAcronym).filter(Boolean)).size, helperText: "TSE", variant: "default" },
        { id: "kpi-cand-discs", label: "Discos Parametrizados", value: "Rotação 360°", helperText: "Anti-viés de ordem", variant: "success" },
      ]}
      searchPlaceholder="Buscar por nome de urna, nome completo ou partido..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "Nome de Urna", key: "urnName", render: (c) => <span style={{ fontWeight: 700, color: "#f8fafc" }}>{c.urnName}</span> },
        { header: "Nome Completo", key: "fullName", render: (c) => <span style={{ color: "#94a3b8" }}>{c.fullName}</span> },
        { header: "Partido / Número", key: "partyAcronym", render: (c) => <span style={{ fontWeight: 600, color: c.colorHex }}>{c.partyAcronym ? `${c.partyAcronym} (${c.partyNumber})` : "Sem Partido"}</span> },
        { header: "Cargo / Categoria", key: "roleCategory", render: (c) => <span style={{ padding: "2px 8px", borderRadius: "6px", backgroundColor: "#1e293b", fontSize: "11px" }}>{c.roleCategory}</span> },
        { header: "Status", key: "active", render: (c) => <span style={{ color: c.active ? "#4ade80" : "#f87171" }}>{c.active ? "● Ativo" : "○ Inativo"}</span> },
      ]}
      data={filtered}
      keyExtractor={(c) => String(c.id)}
    />
  );
}
