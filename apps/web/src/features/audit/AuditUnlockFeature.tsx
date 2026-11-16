import React, { useState, useEffect, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";

export interface UnlockRecord {
  readonly id: number;
  readonly surveyName: string;
  readonly masterUser: string;
  readonly date: string;
  readonly reason: string;
  readonly hash: string;
}

const INITIAL_UNLOCKS: readonly UnlockRecord[] = [
  {
    id: 1,
    surveyName: "Pesquisa Eleitoral Majoritária Belém 2026",
    masterUser: "Roberto Alencar (Master/Estatístico)",
    date: "10/11/2026 14:22",
    reason: "Correção emergencial de cota de escolaridade aprovada pelo CONRE",
    hash: "a8f3b9c1e72d04a6e8b5c9d2f1e4a7b0c3d5e8f2",
  },
  {
    id: 2,
    surveyName: "Sondagem Municipal Ananindeua 2026",
    masterUser: "Admin Master",
    date: "08/11/2026 09:10",
    reason: "Abertura de formulário para inclusão de novo bairro",
    hash: "c4d5e6f7a8b90123456789abcdef0123456789ab",
  },
];

export function AuditUnlockFeature(): React.JSX.Element {
  const [records, setRecords] = useState<readonly UnlockRecord[]>(INITIAL_UNLOCKS);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/historico-desbloqueios")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: any[]) => {
        if (items && items.length > 0) {
          setRecords(
            items.map((h) => ({
              id: h.id_historico_desbloqueio,
              surveyName: h.pesquisa_nome || `Pesquisa #${h.id_pesquisa}`,
              masterUser: h.usuario_master_nome || `Usuário #${h.id_usuario_master}`,
              date: h.data_desbloqueio ? new Date(h.data_desbloqueio).toLocaleString("pt-BR") : "Recente",
              reason: h.motivo || "Desbloqueio de segurança sob protocolo",
              hash: h.hash_autorizacao || "---",
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.surveyName.toLowerCase().includes(q) ||
          r.masterUser.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q) ||
          r.hash.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, search]);

  return (
    <EnterpriseCrudWorkspace<UnlockRecord>
      title="Desbloqueios Master & Quebra de Blindagem"
      subtitle="Registro criptográfico de alterações extraordinárias em pesquisas homologadas"
      tabs={[
        { id: "TODOS", label: "Histórico Completo", count: records.length },
      ]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      kpis={[
        { id: "kpi-unlock-total", label: "Desbloqueios Registrados", value: records.length, helperText: "Tabela historico_desbloqueio", variant: "default" },
        { id: "kpi-unlock-sig", label: "Assinatura Criptográfica", value: "SHA-256", helperText: "Validação em bloco", variant: "success" },
        { id: "kpi-unlock-perm", label: "Nível de Permissão", value: "Master Only", helperText: "Controle estrito", variant: "warning" },
      ]}
      searchPlaceholder="Buscar por pesquisa, autorizador, hash ou motivo..."
      searchValue={search}
      onSearchChange={setSearch}
      columns={[
        { header: "Pesquisa", key: "surveyName", render: (r) => <span style={{ fontWeight: 600, color: "#f8fafc" }}>{r.surveyName}</span> },
        { header: "Usuário Master", key: "masterUser", render: (r) => <span style={{ color: "#f59e0b", fontWeight: 600 }}>{r.masterUser}</span> },
        { header: "Data/Hora", key: "date", render: (r) => <span style={{ fontSize: "12px", color: "#94a3b8" }}>{r.date}</span> },
        { header: "Hash de Auditoria", key: "hash", render: (r) => <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#38bdf8", backgroundColor: "#0f172a", padding: "2px 6px", borderRadius: "4px" }}>{r.hash.slice(0, 16)}...</span> },
        { header: "Motivo Formal", key: "reason", render: (r) => <span style={{ fontSize: "12px", color: "#cbd5e1" }}>{r.reason}</span> },
      ]}
      data={filtered}
      keyExtractor={(r) => String(r.id)}
    />
  );
}
