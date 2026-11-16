import React, { useState, useMemo, useEffect } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { ConfirmDialogModal } from "../../components/ui/ConfirmDialogModal";
import {
  INITIAL_RESEARCHERS,
  type ResearcherRecord,
  type ResearcherFormData,
} from "./researchersData";
import {
  getResearcherTabs,
  getResearcherKpis,
  getResearcherFilters,
  RESEARCHER_COLUMNS,
} from "./researchersConfig";
import { ResearcherDrawerForm } from "./ResearcherDrawerForm";

export function ResearchersManagementFeature(): React.JSX.Element {
  const [researchers, setResearchers] = useState<readonly ResearcherRecord[]>(INITIAL_RESEARCHERS);
  const [activeTab, setActiveTab] = useState<string>("ATIVOS");
  const [search, setSearch] = useState<string>("");
  const [filterDevice, setFilterDevice] = useState<string>("ALL");
  const [filterSector, setFilterSector] = useState<string>("ALL");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [suspendingTarget, setSuspendingTarget] = useState<ResearcherRecord | null>(null);
  const [bindingTarget, setBindingTarget] = useState<ResearcherRecord | null>(null);
  const [editingResearcher, setEditingResearcher] = useState<ResearcherRecord | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/profissionais")
      .then((res) => (res.ok ? res.json() : []))
      .then((items: any[]) => {
        if (Array.isArray(items) && items.length > 0) {
          setResearchers(
            items.map((p) => ({
              id: String(p.id_profissional),
              fullName: p.nome,
              maskedCpf: p.cpf_cnpj || "---",
              coordinatorName: p.tipo_profissional === "supervisor_campo" ? "Supervisor" : "Coordenação",
              assignedSector: p.especialidade || "Campo Geral",
              boundDeviceId: p.dispositivo_uuid || null,
              deviceStatus: !p.ativo ? "BLOQUEADO" : p.dispositivo_uuid ? "VINCULADO" : "SEM_APARELHO",
              validatedCount: 0,
              targetCount: 150,
              rejectionRate: 0.0,
              lastSyncAt: p.ultimo_login ? new Date(p.ultimo_login).toLocaleString("pt-BR") : "Nunca",
              isSuspended: !Boolean(p.ativo),
              auditAlertsCount: 0,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const filteredResearchers = useMemo(() => {
    return researchers.filter((r) => {
      if (activeTab === "ATIVOS" && (r.isSuspended || r.deviceStatus !== "VINCULADO")) return false;
      if (activeTab === "PENDENTES" && r.deviceStatus !== "SEM_APARELHO") return false;
      if (activeTab === "ALERTAS" && r.auditAlertsCount === 0) return false;
      if (activeTab === "BLOQUEADOS" && !r.isSuspended) return false;

      if (filterDevice !== "ALL" && r.deviceStatus !== filterDevice) return false;
      if (filterSector !== "ALL" && !r.assignedSector.includes(filterSector)) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        if (!r.fullName.toLowerCase().includes(query) && !r.maskedCpf.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [researchers, activeTab, filterDevice, filterSector, search]);

  const tabs = useMemo(() => getResearcherTabs(researchers), [researchers]);
  const kpis = useMemo(() => getResearcherKpis(researchers), [researchers]);
  const filters = useMemo(
    () => getResearcherFilters(filterDevice, setFilterDevice, filterSector, setFilterSector),
    [filterDevice, filterSector]
  );

  const handleSave = async (data: ResearcherFormData): Promise<void> => {
    const masked = `${data.cpf.slice(0, 3)}.***.***-${data.cpf.slice(-2)}`;
    if (editingResearcher) {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/v1/pesquisas-tabelas/profissionais/${editingResearcher.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nome: data.fullName,
              cpf_cnpj: data.cpf,
              especialidade: data.assignedSector,
              tipo_profissional: "pesquisador_campo",
            }),
          }
        );
        if (res.ok) {
          setResearchers((prev) =>
            prev.map((r) =>
              r.id === editingResearcher.id
                ? {
                    ...r,
                    fullName: data.fullName,
                    maskedCpf: data.cpf || masked,
                    coordinatorName: data.coordinatorName,
                    assignedSector: data.assignedSector,
                    targetCount: data.targetCount,
                  }
                : r
            )
          );
          setEditingResearcher(null);
          return;
        }
      } catch {
        // Fallback to local state update
      }
      setResearchers((prev) =>
        prev.map((r) =>
          r.id === editingResearcher.id
            ? {
                ...r,
                fullName: data.fullName,
                maskedCpf: data.cpf || masked,
                coordinatorName: data.coordinatorName,
                assignedSector: data.assignedSector,
                targetCount: data.targetCount,
              }
            : r
        )
      );
      setEditingResearcher(null);
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/profissionais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: data.fullName,
          cpf_cnpj: data.cpf,
          especialidade: data.assignedSector,
          tipo_profissional: "pesquisador_campo",
        }),
      });
      if (res.ok) {
        const created = await res.json();
        const newRes: ResearcherRecord = {
          id: String(created.id_profissional),
          fullName: created.nome,
          maskedCpf: created.cpf_cnpj || masked,
          coordinatorName: data.coordinatorName,
          assignedSector: created.especialidade || data.assignedSector,
          boundDeviceId: null,
          deviceStatus: "SEM_APARELHO",
          validatedCount: 0,
          targetCount: data.targetCount,
          rejectionRate: 0.0,
          lastSyncAt: "Nunca",
          isSuspended: false,
          auditAlertsCount: 0,
        };
        setResearchers((prev) => [newRes, ...prev]);
        return;
      }
    } catch {
      // Fallback local se offline
    }

    const newRes: ResearcherRecord = {
      id: `res-00${researchers.length + 1}`,
      fullName: data.fullName,
      maskedCpf: masked,
      coordinatorName: data.coordinatorName,
      assignedSector: data.assignedSector,
      boundDeviceId: null,
      deviceStatus: "SEM_APARELHO",
      validatedCount: 0,
      targetCount: data.targetCount,
      rejectionRate: 0.0,
      lastSyncAt: "Nunca",
      isSuspended: false,
      auditAlertsCount: 0,
    };
    setResearchers((prev) => [newRes, ...prev]);
  };

  const handleToggleSuspend = async (_reason?: string): Promise<void> => {
    if (!suspendingTarget) return;
    if (/^\d+$/.test(suspendingTarget.id)) {
      try {
        await fetch(
          `http://127.0.0.1:8000/api/v1/pesquisas-tabelas/profissionais/${suspendingTarget.id}/status`,
          { method: "PATCH" }
        );
      } catch {
        // Fallback local
      }
    }
    setResearchers((prev) =>
      prev.map((r) =>
        r.id === suspendingTarget.id
          ? {
              ...r,
              isSuspended: !r.isSuspended,
              deviceStatus: r.isSuspended ? "VINCULADO" : "BLOQUEADO",
            }
          : r
      )
    );
    setSuspendingTarget(null);
  };

  const handleConfirmBinding = (): void => {
    if (!bindingTarget) return;
    const newDevId = `tablet-tse-sp-${Math.floor(Math.random() * 80 + 10)}`;
    setResearchers((prev) =>
      prev.map((r) =>
        r.id === bindingTarget.id
          ? { ...r, boundDeviceId: newDevId, deviceStatus: "VINCULADO" }
          : r
      )
    );
    setBindingTarget(null);
  };

  return (
    <>
      <EnterpriseCrudWorkspace<ResearcherRecord>
        title="Controle de Pesquisadores e Vínculo de Aparelhos"
        subtitle="Credenciamento de equipe de campo, vínculo criptográfico de hardware (Device Binding) e metas"
        globalActions={
          <button
            type="button"
            onClick={() => {
              setEditingResearcher(null);
              setDrawerOpen(true);
            }}
            style={{
              padding: "9px 18px",
              backgroundColor: "#8ab4f8",
              color: "#003061",
              fontSize: "13px",
              fontWeight: 600,
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
            }}
          >
            + Cadastrar Pesquisador
          </button>
        }
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={kpis}
        searchPlaceholder="Buscar pesquisador por nome ou CPF..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        columns={RESEARCHER_COLUMNS}
        data={filteredResearchers}
        keyExtractor={(r) => r.id}
        renderRowActions={(r) => (
          <>
            <button
              type="button"
              onClick={() => {
                setEditingResearcher(r);
                setDrawerOpen(true);
              }}
              style={{
                padding: "5px 10px",
                border: "1px solid #353535",
                backgroundColor: "#2a2a2a",
                color: "#8ab4f8",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✏️ Editar
            </button>
            <button
              type="button"
              onClick={() => setBindingTarget(r)}
              style={{
                padding: "5px 10px",
                border: "1px solid #353535",
                backgroundColor: "#2a2a2a",
                color: "#e5e2e1",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              📱 Aparelho
            </button>
            <button
              type="button"
              onClick={() => setSuspendingTarget(r)}
              style={{
                padding: "5px 10px",
                border: "none",
                backgroundColor: r.isSuspended ? "#81c995" : "#f28b82",
                color: r.isSuspended ? "#00391b" : "#690005",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {r.isSuspended ? "Reativar" : "🚫 Suspender"}
            </button>
          </>
        )}
      />

      <ResearcherDrawerForm
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingResearcher(null);
        }}
        onSave={handleSave}
        editingResearcher={editingResearcher}
      />

      <ConfirmDialogModal
        isOpen={Boolean(suspendingTarget)}
        title={
          suspendingTarget?.isSuspended
            ? "Reativar Acesso do Pesquisador"
            : "Suspender Pesquisador e Revogar Sessões"
        }
        message={`Deseja alterar o status de acesso de "${suspendingTarget?.fullName}"?`}
        confirmLabel={suspendingTarget?.isSuspended ? "Reativar" : "🚫 Suspender Acesso"}
        variant={suspendingTarget?.isSuspended ? "success" : "danger"}
        requireReason={!suspendingTarget?.isSuspended}
        onConfirm={handleToggleSuspend}
        onCancel={() => setSuspendingTarget(null)}
      />

      <ConfirmDialogModal
        isOpen={Boolean(bindingTarget)}
        title="Vincular Novo Aparelho (Device Binding)"
        message={`Deseja gerar uma nova chave de hardware criptográfica para o pesquisador "${bindingTarget?.fullName}"?`}
        confirmLabel="📱 Gerar Vínculo de Hardware"
        variant="info"
        onConfirm={handleConfirmBinding}
        onCancel={() => setBindingTarget(null)}
      />
    </>
  );
}
