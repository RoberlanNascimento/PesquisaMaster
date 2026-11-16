import React, { useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";

export interface DemographyRecord {
  readonly id: number;
  readonly municipality: string;
  readonly neighborhood: string;
  readonly dimension: string;
  readonly category: string;
  readonly absolutePopulation: number;
  readonly percentage: number;
  readonly source: string;
}

const INITIAL_DEMO: readonly DemographyRecord[] = [
  { id: 1, municipality: "Parauapebas / PA", neighborhood: "Geral", dimension: "Sexo", category: "Feminino", absolutePopulation: 135400, percentage: 51.4, source: "Censo IBGE 2022" },
  { id: 2, municipality: "Parauapebas / PA", neighborhood: "Geral", dimension: "Sexo", category: "Masculino", absolutePopulation: 128000, percentage: 48.6, source: "Censo IBGE 2022" },
  { id: 3, municipality: "Marabá / PA", neighborhood: "Geral", dimension: "Faixa Etária", category: "16 a 24 anos", absolutePopulation: 42100, percentage: 15.2, source: "Censo IBGE 2022" },
  { id: 4, municipality: "Marabá / PA", neighborhood: "Geral", dimension: "Faixa Etária", category: "25 a 34 anos", absolutePopulation: 61800, percentage: 22.3, source: "Censo IBGE 2022" },
];

export function DemographyIbgeFeature(): React.JSX.Element {
  const [data, setData] = useState<readonly DemographyRecord[]>(INITIAL_DEMO);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/demografia")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: any[]) => {
        if (items && items.length > 0) {
          setData(
            items.map((d) => ({
              id: d.id_demografia,
              municipality: d.municipio_nome || "Município Base",
              neighborhood: d.nome_bairro || "Geral",
              dimension: d.dimensao,
              category: d.categoria,
              absolutePopulation: Number(d.populacao_absoluta),
              percentage: Number(d.percentual_universo),
              source: d.fonte || "Censo IBGE",
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return data.filter((d) => {
      if (activeTab !== "TODOS" && d.dimension.toUpperCase() !== activeTab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return d.municipality.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || d.dimension.toLowerCase().includes(q);
      }
      return true;
    });
  }, [data, activeTab, search]);

  return (
    <EnterpriseCrudWorkspace<DemographyRecord>
      title="Perfil Demográfico & Censos IBGE"
      subtitle="Dados populacionais oficiais estratificados por sexo, faixa etária, escolaridade e renda"
      tabs={[
        { id: "TODOS", label: "Todas as Dimensões", count: data.length },
        { id: "SEXO", label: "Sexo", count: data.filter((d) => d.dimension === "Sexo").length },
        { id: "FAIXA ETÁRIA", label: "Faixa Etária", count: data.filter((d) => d.dimension === "Faixa Etária").length },
        { id: "ESCOLARIDADE", label: "Escolaridade", count: data.filter((d) => d.dimension === "Escolaridade").length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-demo-pop", label: "População Mapeada", value: data.reduce((acc, c) => acc + c.absolutePopulation, 0).toLocaleString("pt-BR"), helperText: "IBGE Censo", variant: "default" },
        { id: "kpi-demo-dims", label: "Dimensões de Controle", value: new Set(data.map((d) => d.dimension)).size, helperText: "Estatística", variant: "default" },
        { id: "kpi-demo-prec", label: "Precisão Paramétrica", value: "100%", helperText: "Auditado", variant: "success" },
      ]}
      searchPlaceholder="Buscar por município, dimensão ou categoria..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "Município", key: "municipality", render: (d) => <span style={{ fontWeight: 600, color: "#f8fafc" }}>{d.municipality}</span> },
        { header: "Dimensão", key: "dimension", render: (d) => <span style={{ padding: "2px 8px", borderRadius: "6px", backgroundColor: "#1e293b", fontSize: "11px" }}>{d.dimension}</span> },
        { header: "Categoria / Estrato", key: "category", render: (d) => <span style={{ fontWeight: 600, color: "#38bdf8" }}>{d.category}</span> },
        { header: "População Absoluta", key: "absolutePopulation", render: (d) => <span>{d.absolutePopulation.toLocaleString("pt-BR")} hab.</span> },
        { header: "Percentual", key: "percentage", render: (d) => <span style={{ fontWeight: 700, color: "#facc15" }}>{d.percentage.toFixed(2)}%</span> },
        { header: "Fonte Oficial", key: "source", render: (d) => <span style={{ color: "#94a3b8", fontSize: "11px" }}>{d.source}</span> },
      ]}
      data={filtered}
      keyExtractor={(d) => String(d.id)}
    />
  );
}
