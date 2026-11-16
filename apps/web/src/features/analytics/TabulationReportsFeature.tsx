import React, { useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";

export interface TabulationReportRecord {
  readonly id: number;
  readonly surveyName: string;
  readonly authorName: string;
  readonly title: string;
  readonly crosstabConfig: string;
  readonly createdAt: string;
}

const INITIAL_REPORTS: readonly TabulationReportRecord[] = [
  { id: 1, surveyName: "Pesquisa Eleitoral Belém 2026", authorName: "Roberto Alencar (Estatístico)", title: "Cruzamento Voto Estimulado x Sexo x Renda", crosstabConfig: "Dimensões: Sexo, Renda (Filtro: Válidos)", createdAt: "12/11/2026" },
  { id: 2, surveyName: "Pesquisa Eleitoral Belém 2026", authorName: "Roberto Alencar (Estatístico)", title: "Matriz de Rejeição por Bairro e Faixa Etária", crosstabConfig: "Dimensões: Bairro, Faixa Etária (Rejeição)", createdAt: "11/11/2026" },
  { id: 3, surveyName: "Avaliação da Gestão Municipal", authorName: "Dra. Helena Vasconcelos", title: "Aprovação do Prefeito x Grau de Escolaridade", crosstabConfig: "Dimensões: Escolaridade (Escala Likert)", createdAt: "10/11/2026" },
];

export function TabulationReportsFeature(): React.JSX.Element {
  const [reports, setReports] = useState<readonly TabulationReportRecord[]>(INITIAL_REPORTS);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/relatorios-tabulacao")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: any[]) => {
        if (items && items.length > 0) {
          setReports(
            items.map((r) => ({
              id: r.id_relatorio,
              surveyName: r.pesquisa_nome || `Pesquisa #${r.id_pesquisa}`,
              authorName: r.usuario_nome || `Usuário #${r.id_usuario}`,
              title: r.titulo_relatorio || `Relatório #${r.id_relatorio}`,
              crosstabConfig: r.configuracao_crosstab ? JSON.stringify(r.configuracao_crosstab) : "Cruzamento padrão TSE",
              createdAt: r.criado_em ? new Date(r.criado_em).toLocaleDateString("pt-BR") : "Recentemente",
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return r.title.toLowerCase().includes(q) || r.surveyName.toLowerCase().includes(q) || r.authorName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [reports, search]);

  return (
    <EnterpriseCrudWorkspace<TabulationReportRecord>
      title="Relatórios Salvos & Cruzamentos Estatísticos"
      subtitle="Configurações de cruzamentos demográficos (crosstabs), filtros e modelos de tabulação — Tabela relatorios_tabulacao"
      tabs={[
        { id: "TODOS", label: "Todos os Relatórios Salvos", count: reports.length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-rep-total", label: "Relatórios Armazenados", value: reports.length, helperText: "Tabela relatorios_tabulacao", variant: "default" },
        { id: "kpi-rep-crosstab", label: "Matriz de Contingência", value: "Multi-Eixo", helperText: "Sexo, Idade, Escolaridade", variant: "success" },
        { id: "kpi-rep-tse", label: "Conformidade TSE", value: "Res. 23.600", helperText: "Exportação direta PDF/XLSX", variant: "success" },
      ]}
      searchPlaceholder="Buscar por título, pesquisa ou autor..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "ID", key: "id", render: (r) => <span style={{ fontWeight: 700, color: "#38bdf8" }}>#{r.id}</span> },
        { header: "Título do Relatório", key: "title", render: (r) => <span style={{ fontWeight: 600, color: "#f8fafc" }}>{r.title}</span> },
        { header: "Pesquisa Vinculada", key: "surveyName", render: (r) => <span style={{ color: "#94a3b8" }}>{r.surveyName}</span> },
        { header: "Configuração do Crosstab", key: "crosstabConfig", render: (r) => <span style={{ color: "#cbd5e1", fontSize: "11px", fontFamily: "monospace" }}>{r.crosstabConfig}</span> },
        { header: "Autor / Estatístico", key: "authorName", render: (r) => <span style={{ color: "#a78bfa" }}>{r.authorName}</span> },
        { header: "Data de Criação", key: "createdAt", render: (r) => <span style={{ color: "#64748b", fontSize: "11px" }}>{r.createdAt}</span> },
      ]}
      data={filtered}
      keyExtractor={(r) => String(r.id)}
    />
  );
}

