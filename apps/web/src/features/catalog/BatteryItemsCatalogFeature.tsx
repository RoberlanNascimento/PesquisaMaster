import React, { useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";

export interface BatteryItemRecord {
  readonly id: number;
  readonly questionId: number;
  readonly questionText: string;
  readonly itemDescription: string;
  readonly order: number;
}

const INITIAL_BATTERY_ITEMS: readonly BatteryItemRecord[] = [
  { id: 1, questionId: 4, questionText: "Avalie cada um dos seguintes serviços públicos do município:", itemDescription: "Saúde Pública e Postos de Saúde (UBS)", order: 1 },
  { id: 2, questionId: 4, questionText: "Avalie cada um dos seguintes serviços públicos do município:", itemDescription: "Educação Básica e Creches Municipais", order: 2 },
  { id: 3, questionId: 4, questionText: "Avalie cada um dos seguintes serviços públicos do município:", itemDescription: "Segurança Pública e Policiamento Preventivo", order: 3 },
  { id: 4, questionId: 4, questionText: "Avalie cada um dos seguintes serviços públicos do município:", itemDescription: "Asfalto, Tapa-Buracos e Drenagem Urbana", order: 4 },
  { id: 5, questionId: 4, questionText: "Avalie cada um dos seguintes serviços públicos do município:", itemDescription: "Limpeza Urbana e Coleta de Lixo", order: 5 },
  { id: 6, questionId: 4, questionText: "Avalie cada um dos seguintes serviços públicos do município:", itemDescription: "Transporte Coletivo e Ônibus", order: 6 },
];

export function BatteryItemsCatalogFeature(): React.JSX.Element {
  const [items, setItems] = useState<readonly BatteryItemRecord[]>(INITIAL_BATTERY_ITEMS);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/itens-bateria")
      .then((res) => (res.ok ? res.json() : []))
      .then((raw: any[]) => {
        if (raw && raw.length > 0) {
          setItems(
            raw.map((b) => ({
              id: b.id_item_bateria,
              questionId: b.id_pergunta,
              questionText: b.texto_pergunta || `Pergunta Matriz #${b.id_pergunta}`,
              itemDescription: b.descricao_item,
              order: b.ordem ?? 1,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return items.filter((b) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return b.itemDescription.toLowerCase().includes(q) || b.questionText.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, search]);

  return (
    <EnterpriseCrudWorkspace<BatteryItemRecord>
      title="Itens de Bateria & Matrizes de Avaliação"
      subtitle="Subitens avaliados em lote sob a mesma escala (Saúde, Educação, etc.) — Tabela itens_bateria"
      tabs={[
        { id: "TODOS", label: "Todos os Itens", count: items.length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-battery-total", label: "Itens de Avaliação", value: items.length, helperText: "Tabela itens_bateria", variant: "default" },
        { id: "kpi-battery-matrix", label: "Estrutura CAPI", value: "Matriz em Grade", helperText: "Avaliação sequencial", variant: "success" },
        { id: "kpi-battery-order", label: "Rodízio Parametrizável", value: "Ativo", helperText: "Previne cansaço do respondente", variant: "default" },
      ]}
      searchPlaceholder="Buscar por item avaliado ou pergunta matriz..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "Ordem", key: "order", render: (b) => <span style={{ fontWeight: 700, color: "#38bdf8" }}>#{b.order}</span> },
        { header: "Subitem / Área Avaliada", key: "itemDescription", render: (b) => <span style={{ fontWeight: 600, color: "#f8fafc" }}>{b.itemDescription}</span> },
        { header: "Pergunta Matriz Vinculada", key: "questionText", render: (b) => <span style={{ color: "#94a3b8" }}>{b.questionText}</span> },
        { header: "Identificador Pergunta", key: "questionId", render: (b) => <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", backgroundColor: "#1e293b", color: "#a78bfa" }}>Pergunta #{b.questionId}</span> },
      ]}
      data={filtered}
      keyExtractor={(b) => String(b.id)}
    />
  );
}

