import React, { useState, useEffect, useMemo, useCallback } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { NOCTURNE_BUTTON_STYLES } from "../../lib/designTokens";
import {
  ReassignResearcherDialogModal,
  type MovimentacaoPayload,
} from "./ReassignResearcherDialogModal";

export interface ReassignmentRecord {
  readonly id: number;
  readonly sessionId: number;
  readonly surveyTitle: string;
  readonly previousResearcher: string;
  readonly newResearcher: string;
  readonly authorizer: string;
  readonly date: string;
  readonly reason: string;
}

const API_BASE = "http://127.0.0.1:8000/api/v1/pesquisas-tabelas";

export function AuditReassignmentFeature(): React.JSX.Element {
  const [records, setRecords] = useState<readonly ReassignmentRecord[]>([]);
  const [municipiosAtivos, setMunicipiosAtivos] = useState<any[]>([]);
  const [pesquisasAtivas, setPesquisasAtivas] = useState<any[]>([]);
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("TODOS");
  const [modalOpen, setModalOpen] = useState(false);

  const loadAll = useCallback(async (): Promise<void> => {
    const [histData, opData] = await Promise.all([
      fetch(`${API_BASE}/historico-reatribuicoes`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
      fetch(`${API_BASE}/movimentacao-opcoes`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ]);

    if (Array.isArray(histData)) {
      setRecords(
        histData.map((r: any) => ({
          id: Number(r.id_historico_reatribuicao),
          sessionId: Number(r.id_questionario_pessoa),
          surveyTitle: r.pesquisa_titulo || "",
          previousResearcher: r.pesquisador_anterior_nome || `Pesquisador #${r.id_pesquisador_anterior}`,
          newResearcher: r.pesquisador_novo_nome || `Pesquisador #${r.id_pesquisador_novo}`,
          authorizer: r.autorizador_nome || `Usuário #${r.id_usuario_autorizador}`,
          date: r.data_reatribuicao ? new Date(r.data_reatribuicao).toLocaleString("pt-BR") : "—",
          reason: r.motivo || r.justificativa || "—",
        }))
      );
    } else {
      setRecords([]);
    }

    if (opData) {
      setMunicipiosAtivos(Array.isArray(opData.municipios_ativos) ? opData.municipios_ativos : []);
      setPesquisasAtivas(Array.isArray(opData.pesquisas_ativas) ? opData.pesquisas_ativas : []);
      setSessoes(Array.isArray(opData.sessoes) ? opData.sessoes : []);
      setProfissionais(Array.isArray(opData.profissionais) ? opData.profissionais : []);
      setUsuarios(Array.isArray(opData.usuarios) ? opData.usuarios : []);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleSubmitMovimentacao = async (payload: MovimentacaoPayload): Promise<void> => {
    const res = await fetch(`${API_BASE}/historico-reatribuicoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || "Não foi possível registrar a movimentação de pesquisador.");
    }
    await loadAll();
  };

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          String(r.sessionId).includes(q) ||
          r.surveyTitle.toLowerCase().includes(q) ||
          r.previousResearcher.toLowerCase().includes(q) ||
          r.newResearcher.toLowerCase().includes(q) ||
          r.authorizer.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, search]);

  return (
    <>
      <EnterpriseCrudWorkspace<ReassignmentRecord>
        title="Reatribuição de Entrevistas & Custódia"
        subtitle="Trilha de auditoria forense para transferência e movimentação de pesquisadores em campo (PostgreSQL)"
        globalActions={
          <button
            type="button"
            data-testid="btn-new-reassignment"
            onClick={() => setModalOpen(true)}
            style={NOCTURNE_BUTTON_STYLES.primary}
          >
            + Movimentar Pesquisador
          </button>
        }
        tabs={[
          { id: "TODOS", label: "Todas as Reatribuições", count: records.length },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={[
          {
            id: "kpi-reassign-total",
            label: "Total de Reatribuições",
            value: records.length,
            helperText: "Tabela historico_reatribuicao_questionarios",
            variant: "default",
          },
          {
            id: "kpi-reassign-sessions",
            label: "Sessões em Campo",
            value: sessoes.length,
            helperText: "questionarios_pessoas vinculados",
            variant: "success",
          },
          {
            id: "kpi-reassign-researchers",
            label: "Pesquisadores Ativos",
            value: profissionais.length,
            helperText: "Disponíveis para movimentação",
            variant: "success",
          },
        ]}
        searchPlaceholder="Buscar por sessão, pesquisa, pesquisador, autorizador ou motivo..."
        searchValue={search}
        onSearchChange={setSearch}
        columns={[
          {
            header: "ID Sessão",
            key: "sessionId",
            render: (r) => (
              <div>
                <span style={{ fontWeight: 700, color: "#38bdf8" }}>#{r.sessionId}</span>
                {r.surveyTitle && (
                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>{r.surveyTitle}</div>
                )}
              </div>
            ),
          },
          {
            header: "Pesquisador Anterior",
            key: "previousResearcher",
            render: (r) => <span style={{ color: "#f87171" }}>{r.previousResearcher}</span>,
          },
          {
            header: "Novo Pesquisador",
            key: "newResearcher",
            render: (r) => <span style={{ color: "#4ade80", fontWeight: 600 }}>{r.newResearcher}</span>,
          },
          {
            header: "Autorizado por",
            key: "authorizer",
            render: (r) => <span style={{ color: "#cbd5e1" }}>{r.authorizer}</span>,
          },
          {
            header: "Data/Hora",
            key: "date",
            render: (r) => <span style={{ fontSize: "12px", color: "#94a3b8" }}>{r.date}</span>,
          },
          {
            header: "Justificativa",
            key: "reason",
            render: (r) => <span style={{ fontSize: "12px", color: "#e2e8f0" }}>{r.reason}</span>,
          },
        ]}
        data={filtered}
        keyExtractor={(r) => String(r.id)}
      />

      <ReassignResearcherDialogModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmitMovimentacao}
        municipiosAtivos={municipiosAtivos}
        pesquisasAtivas={pesquisasAtivas}
        sessoes={sessoes}
        profissionais={profissionais}
        usuarios={usuarios}
      />
    </>
  );
}
