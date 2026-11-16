import React, { useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";

export interface ScaleRecord {
  readonly id: number;
  readonly name: string;
  readonly scaleType: string;
  readonly description: string;
  readonly totalOptions: number;
}

const INITIAL_SCALES: readonly ScaleRecord[] = [
  { id: 1, name: "Escala Likert 5 Pontos", scaleType: "LIKERT_5", description: "Ótimo, Bom, Regular, Ruim, Péssimo", totalOptions: 5 },
  { id: 2, name: "Escala Dicotômica de Aprovação", scaleType: "BINARIA", description: "Aprova / Desaprova a gestão", totalOptions: 2 },
  { id: 3, name: "Disco Estimulado de Candidatos", scaleType: "DISCO_CIRCULAR", description: "Candidatos registrados com rotação aleatória", totalOptions: 8 },
  { id: 4, name: "Escala de Rejeição Múltipla", scaleType: "REJEICAO", description: "Não votaria de jeito nenhum (múltipla escolha)", totalOptions: 8 },
  { id: 5, name: "Escala de Certeza de Voto", scaleType: "LIKERT_3", description: "Definitivo, Pode Mudar, Não Sabe", totalOptions: 3 },
];

export function ScalesCatalogFeature(): React.JSX.Element {
  const [scales, setScales] = useState<readonly ScaleRecord[]>(INITIAL_SCALES);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/escalas")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: any[]) => {
        if (items && items.length > 0) {
          setScales(
            items.map((s) => ({
              id: s.id_grupo_opcao,
              name: s.nome_grupo || `Escala #${s.id_grupo_opcao}`,
              scaleType: s.tipo_escala || "PADRAO",
              description: s.descricao || "Régua padronizada de opções",
              totalOptions: Number(s.total_opcoes || 0),
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return scales.filter((s) => {
      if (activeTab === "LIKERT" && !s.scaleType.includes("LIKERT")) return false;
      if (activeTab === "BINARIA" && s.scaleType !== "BINARIA") return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.scaleType.toLowerCase().includes(q);
      }
      return true;
    });
  }, [scales, activeTab, search]);

  return (
    <EnterpriseCrudWorkspace<ScaleRecord>
      title="Réguas e Escalas de Resposta"
      subtitle="Padronização de réguas psicométricas (Likert, dicotômicas e discos) — Tabela grupos_opcoes"
      tabs={[
        { id: "TODOS", label: "Todas as Escalas", count: scales.length },
        { id: "LIKERT", label: "Escalas Likert", count: scales.filter((s) => s.scaleType.includes("LIKERT")).length },
        { id: "BINARIA", label: "Dicotômicas (Aprova/Desaprova)", count: scales.filter((s) => s.scaleType === "BINARIA").length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-scales-total", label: "Réguas Cadastradas", value: scales.length, helperText: "Tabela grupos_opcoes", variant: "default" },
        { id: "kpi-scales-likert", label: "Padrão Internacional", value: "Likert & CAPI", helperText: "Norma ISO / TSE", variant: "success" },
        { id: "kpi-scales-neutral", label: "Neutros Mapeados", value: "NS/NR & Branco", helperText: "Tratamento de não-resposta", variant: "default" },
      ]}
      searchPlaceholder="Buscar por nome da escala, tipo ou descrição..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "ID", key: "id", render: (s) => <span style={{ fontWeight: 700, color: "#38bdf8" }}>#{s.id}</span> },
        { header: "Nome da Régua / Grupo", key: "name", render: (s) => <span style={{ fontWeight: 600, color: "#f8fafc" }}>{s.name}</span> },
        { header: "Tipo da Escala", key: "scaleType", render: (s) => <span style={{ padding: "2px 8px", borderRadius: "6px", backgroundColor: "#1e293b", color: "#a78bfa", fontWeight: 600, fontSize: "11px" }}>{s.scaleType}</span> },
        { header: "Descrição das Opções", key: "description", render: (s) => <span style={{ color: "#94a3b8" }}>{s.description}</span> },
        { header: "Total de Alternativas", key: "totalOptions", render: (s) => <span style={{ fontWeight: 700, color: "#34d399" }}>{s.totalOptions} opções</span> },
      ]}
      data={filtered}
      keyExtractor={(s) => String(s.id)}
    />
  );
}

