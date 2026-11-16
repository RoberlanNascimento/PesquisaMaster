import React, { useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";

export interface OptionRecord {
  readonly id: number;
  readonly groupName: string;
  readonly label: string;
  readonly numericCode: number;
  readonly displayOrder: number;
  readonly isNeutral: boolean;
  readonly colorHex: string;
  readonly active: boolean;
}

const INITIAL_OPTIONS: readonly OptionRecord[] = [
  { id: 1, groupName: "Escala Likert 5 Pontos", label: "Ótimo", numericCode: 5, displayOrder: 1, isNeutral: false, colorHex: "#10b981", active: true },
  { id: 2, groupName: "Escala Likert 5 Pontos", label: "Bom", numericCode: 4, displayOrder: 2, isNeutral: false, colorHex: "#3b82f6", active: true },
  { id: 3, groupName: "Escala Likert 5 Pontos", label: "Regular", numericCode: 3, displayOrder: 3, isNeutral: false, colorHex: "#f59e0b", active: true },
  { id: 4, groupName: "Escala Likert 5 Pontos", label: "Ruim", numericCode: 2, displayOrder: 4, isNeutral: false, colorHex: "#f97316", active: true },
  { id: 5, groupName: "Escala Likert 5 Pontos", label: "Péssimo", numericCode: 1, displayOrder: 5, isNeutral: false, colorHex: "#ef4444", active: true },
  { id: 6, groupName: "Geral", label: "Não Sabe / Não Respondeu", numericCode: 99, displayOrder: 98, isNeutral: true, colorHex: "#64748b", active: true },
  { id: 7, groupName: "Geral", label: "Branco / Nulo", numericCode: 98, displayOrder: 99, isNeutral: true, colorHex: "#475569", active: true },
];

export function AnswerOptionsCatalogFeature(): React.JSX.Element {
  const [options, setOptions] = useState<readonly OptionRecord[]>(INITIAL_OPTIONS);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/opcoes-resposta")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: any[]) => {
        if (items && items.length > 0) {
          setOptions(
            items.map((o) => ({
              id: o.id_opcao,
              groupName: o.nome_grupo || `Grupo #${o.id_grupo_opcao}`,
              label: o.rotulo,
              numericCode: o.codigo_valor,
              displayOrder: o.ordem_exibicao ?? 1,
              isNeutral: Boolean(o.eh_neutro_invalido),
              colorHex: o.cor_hex || "#3b82f6",
              active: o.ativo ?? true,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return options.filter((o) => {
      if (activeTab === "NEUTROS" && !o.isNeutral) return false;
      if (activeTab === "VALORATIVOS" && o.isNeutral) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return o.label.toLowerCase().includes(q) || o.groupName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [options, activeTab, search]);

  return (
    <EnterpriseCrudWorkspace<OptionRecord>
      title="Alternativas de Resposta"
      subtitle="Cadastro e calibração de rótulos, códigos numéricos e paleta de cores — Tabela opcoes_resposta"
      tabs={[
        { id: "TODOS", label: "Todas as Alternativas", count: options.length },
        { id: "VALORATIVOS", label: "Alternativas Válidas", count: options.filter((o) => !o.isNeutral).length },
        { id: "NEUTROS", label: "Neutros / Inválidos (NS/NR/Branco)", count: options.filter((o) => o.isNeutral).length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-opt-total", label: "Total de Alternativas", value: options.length, helperText: "Tabela opcoes_resposta", variant: "default" },
        { id: "kpi-opt-neutral", label: "Filtros de Abstenção", value: "NS/NR & Nulo", helperText: "Validação estatística", variant: "default" },
        { id: "kpi-opt-palette", label: "Cores Padronizadas", value: "HEX Ativo", helperText: "Renderização CAPI / Gráficos", variant: "success" },
      ]}
      searchPlaceholder="Buscar por rótulo ou grupo de opção..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "Código", key: "numericCode", render: (o) => <span style={{ fontWeight: 700, color: "#38bdf8" }}>Cod: {o.numericCode}</span> },
        { header: "Rótulo da Opção", key: "label", render: (o) => (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: o.colorHex, border: "1px solid rgba(255,255,255,0.2)" }} />
            <span style={{ fontWeight: 600, color: "#f8fafc" }}>{o.label}</span>
          </div>
        ) },
        { header: "Grupo / Régua Pertencente", key: "groupName", render: (o) => <span style={{ color: "#94a3b8" }}>{o.groupName}</span> },
        { header: "Ordem Base", key: "displayOrder", render: (o) => <span style={{ color: "#cbd5e1" }}>Posição {o.displayOrder}</span> },
        { header: "Classificação", key: "isNeutral", render: (o) => (
          <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", backgroundColor: o.isNeutral ? "#334155" : "#1e293b", color: o.isNeutral ? "#94a3b8" : "#38bdf8" }}>
            {o.isNeutral ? "Neutro / Inválido" : "Válido / Pontuado"}
          </span>
        ) },
      ]}
      data={filtered}
      keyExtractor={(o) => String(o.id)}
    />
  );
}

