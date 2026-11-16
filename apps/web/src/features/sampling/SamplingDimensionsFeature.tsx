import React, { useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";

export interface DimensionRecord {
  readonly id: number;
  readonly sampleName: string;
  readonly name: string;
  readonly source: string;
  readonly isMandatory: boolean;
  readonly order: number;
}

const INITIAL_DIMENSIONS: readonly DimensionRecord[] = [
  { id: 1, sampleName: "Amostra Padrão Belém 2026 (N=1000)", name: "Gênero (Sexo Biológico)", source: "TSE", isMandatory: true, order: 1 },
  { id: 2, sampleName: "Amostra Padrão Belém 2026 (N=1000)", name: "Faixa Etária", source: "IBGE Censo 2022", isMandatory: true, order: 2 },
  { id: 3, sampleName: "Amostra Padrão Belém 2026 (N=1000)", name: "Grau de Escolaridade", source: "TSE / IBGE", isMandatory: true, order: 3 },
  { id: 4, sampleName: "Amostra Padrão Belém 2026 (N=1000)", name: "Faixa de Renda Familiar", source: "IBGE", isMandatory: false, order: 4 },
  { id: 5, sampleName: "Amostra Padrão Belém 2026 (N=1000)", name: "Região / Setor Censitário", source: "Divisão Geográfica Municipal", isMandatory: true, order: 5 },
];

export function SamplingDimensionsFeature(): React.JSX.Element {
  const [dimensions, setDimensions] = useState<readonly DimensionRecord[]>(INITIAL_DIMENSIONS);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/dimensoes")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: any[]) => {
        if (items && items.length > 0) {
          setDimensions(
            items.map((d) => ({
              id: d.id_amostra_dimensao,
              sampleName: d.amostra_descricao || `Plano Amostral #${d.id_amostra}`,
              name: d.nome_dimensao,
              source: d.fonte_dados || "IBGE / TSE",
              isMandatory: Boolean(d.obrigatoria),
              order: d.ordem_exibicao ?? 1,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return dimensions.filter((d) => {
      if (activeTab === "OBRIGATORIAS" && !d.isMandatory) return false;
      if (activeTab === "OPCIONAIS" && d.isMandatory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.source.toLowerCase().includes(q) ||
          d.sampleName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [dimensions, activeTab, search]);

  return (
    <EnterpriseCrudWorkspace<DimensionRecord>
      title="Variáveis de Controle Amostral"
      subtitle="Estratificação de quotas sociodemográficas e geográficas da tabela amostras_dimensao"
      tabs={[
        { id: "TODOS", label: "Todas as Dimensões", count: dimensions.length },
        { id: "OBRIGATORIAS", label: "Obrigatórias", count: dimensions.filter((d) => d.isMandatory).length },
        { id: "OPCIONAIS", label: "Estratificadoras", count: dimensions.filter((d) => !d.isMandatory).length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-dim-total", label: "Variáveis Parametrizadas", value: dimensions.length, helperText: "Tabela amostras_dimensao", variant: "default" },
        { id: "kpi-dim-sources", label: "Fontes Oficiais", value: "IBGE & TSE", helperText: "Bases validadas", variant: "success" },
        { id: "kpi-dim-order", label: "Ordem de Ponderação", value: "Estrita", helperText: "Raking / Pós-estratificação", variant: "default" },
      ]}
      searchPlaceholder="Buscar por variável, fonte de dados ou plano amostral..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "Ordem", key: "order", render: (d) => <span style={{ fontWeight: 700, color: "#38bdf8" }}>#{d.order}</span> },
        { header: "Nome da Variável", key: "name", render: (d) => <span style={{ fontWeight: 600, color: "#f8fafc" }}>{d.name}</span> },
        { header: "Plano Amostral Vinculado", key: "sampleName", render: (d) => <span style={{ color: "#cbd5e1" }}>{d.sampleName}</span> },
        { header: "Fonte de Dados", key: "source", render: (d) => <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", backgroundColor: "#1e293b", color: "#94a3b8" }}>{d.source}</span> },
        {
          header: "Status de Controle",
          key: "isMandatory",
          render: (d) => (
            <span style={{ fontSize: "12px", fontWeight: 600, color: d.isMandatory ? "#4ade80" : "#facc15" }}>
              {d.isMandatory ? "● Cota Rígida" : "○ Estratificadora"}
            </span>
          ),
        },
      ]}
      data={filtered}
      keyExtractor={(d) => String(d.id)}
    />
  );
}
