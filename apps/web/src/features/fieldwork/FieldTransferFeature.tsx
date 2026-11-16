import React, { useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";

export interface TransferRecord {
  readonly id: number;
  readonly surveyName: string;
  readonly originResearcher: string;
  readonly destResearcher: string;
  readonly transferredQuantity: number;
  readonly reason: string;
  readonly date: string;
}

const INITIAL_TRANSFERS: readonly TransferRecord[] = [
  { id: 1, surveyName: "Pesquisa Eleitoral Belém 2026", originResearcher: "Ana Paula de Souza", destResearcher: "Carlos Eduardo Silva", transferredQuantity: 15, reason: "Redistribuição por tempestade no setor", date: "12/11/2026 14:20" },
  { id: 2, surveyName: "Pesquisa Eleitoral Belém 2026", originResearcher: "Marcos Vinicius Lima", destResearcher: "Juliana Mendes", transferredQuantity: 20, reason: "Aceleração de coleta no Bairro Marco", date: "11/11/2026 09:30" },
  { id: 3, surveyName: "Pesquisa de Avaliação Municipal", originResearcher: "Roberto Silva", destResearcher: "Fernanda Costa", transferredQuantity: 10, reason: "Ajuste de cota por término de jornada", date: "10/11/2026 17:05" },
];

export function FieldTransferFeature(): React.JSX.Element {
  const [transfers, setTransfers] = useState<readonly TransferRecord[]>(INITIAL_TRANSFERS);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODAS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/transferencias")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: any[]) => {
        if (items && items.length > 0) {
          setTransfers(
            items.map((t) => ({
              id: t.id_transferencia,
              surveyName: t.pesquisa_nome || `Pesquisa #${t.id_pesquisa}`,
              originResearcher: t.pesquisador_origem_nome || `Pesquisador #${t.id_pesquisador_origem}`,
              destResearcher: t.pesquisador_destino_nome || `Pesquisador #${t.id_pesquisador_destino}`,
              transferredQuantity: t.quantidade_transferida ?? 0,
              reason: t.motivo || "Transferência de saldo de campo",
              date: t.data_transferencia ? new Date(t.data_transferencia).toLocaleString("pt-BR") : "Recentemente",
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return transfers.filter((t) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          t.surveyName.toLowerCase().includes(q) ||
          t.originResearcher.toLowerCase().includes(q) ||
          t.destResearcher.toLowerCase().includes(q) ||
          t.reason.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transfers, search]);

  const totalTransferred = useMemo(() => transfers.reduce((acc, t) => acc + t.transferredQuantity, 0), [transfers]);

  return (
    <EnterpriseCrudWorkspace<TransferRecord>
      title="Transferência de Saldo de Metas"
      subtitle="Repasse transacional e auditável de quotas entre pesquisadores — Tabela transferencias_atribuicao"
      tabs={[
        { id: "TODAS", label: "Todas as Transferências", count: transfers.length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-tr-count", label: "Repasses Realizados", value: transfers.length, helperText: "Tabela transferencias_atribuicao", variant: "default" },
        { id: "kpi-tr-volume", label: "Entrevistas Transferidas", value: `${totalTransferred} un`, helperText: "Saldo reequilibrado", variant: "success" },
        { id: "kpi-tr-audit", label: "Chave Transacional", value: "Auditado", helperText: "Histórico imutável de campo", variant: "success" },
      ]}
      searchPlaceholder="Buscar por pesquisador, pesquisa ou motivo..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "ID", key: "id", render: (t) => <span style={{ fontWeight: 700, color: "#38bdf8" }}>#{t.id}</span> },
        { header: "Pesquisa", key: "surveyName", render: (t) => <span style={{ fontWeight: 600, color: "#f8fafc" }}>{t.surveyName}</span> },
        { header: "Pesquisador Origem (Cedeu)", key: "originResearcher", render: (t) => <span style={{ color: "#f87171" }}>← {t.originResearcher}</span> },
        { header: "Pesquisador Destino (Recebeu)", key: "destResearcher", render: (t) => <span style={{ color: "#4ade80", fontWeight: 600 }}>→ {t.destResearcher}</span> },
        { header: "Qtd Transferida", key: "transferredQuantity", render: (t) => <span style={{ fontWeight: 700, color: "#fde047" }}>{t.transferredQuantity} cotas</span> },
        { header: "Justificativa / Motivo", key: "reason", render: (t) => <span style={{ color: "#94a3b8" }}>{t.reason}</span> },
        { header: "Data / Hora", key: "date", render: (t) => <span style={{ color: "#cbd5e1", fontSize: "11px" }}>{t.date}</span> },
      ]}
      data={filtered}
      keyExtractor={(t) => String(t.id)}
    />
  );
}

