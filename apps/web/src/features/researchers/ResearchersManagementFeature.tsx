import React, { useState, useMemo, useEffect } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { ConfirmDialogModal } from "../../components/ui/ConfirmDialogModal";
import {
  getResearcherTabs,
  getResearcherKpis,
  getResearcherFilters,
  RESEARCHER_COLUMNS,
} from "./researchersConfig";
import {
  ResearcherDrawerForm,
  type ExtendedResearcherFormData,
  type ExtendedResearcherRecord,
} from "./ResearcherDrawerForm";

const API_PROFISSIONAIS = "http://127.0.0.1:8000/api/v1/pesquisas-tabelas/profissionais";

interface BackendProfissionalRow {
  readonly id_profissional: number;
  readonly nome: string;
  readonly cpf_cnpj?: string | null;
  readonly tipo_profissional?: string | null;
  readonly registro_profissional?: string | null;
  readonly telefone?: string | null;
  readonly especialidade?: string | null;
  readonly dispositivo_uuid?: string | null;
  readonly ultimo_login?: string | null;
  readonly ativo?: boolean | null;
}

function roleLabelForCoordinator(tipo?: string | null, registro?: string | null): string {
  if (tipo === "estatistico_responsavel") {
    return registro ? `Estatístico (${registro})` : "Estatístico Responsável";
  }
  if (tipo === "supervisor_campo") return "Supervisor de Campo";
  return "Pesquisador de Campo";
}

function mapBackendProfissional(p: BackendProfissionalRow): ExtendedResearcherRecord {
  const ativo = Boolean(p.ativo ?? true);
  return {
    id: String(p.id_profissional),
    fullName: p.nome,
    maskedCpf: p.cpf_cnpj || "---",
    coordinatorName: roleLabelForCoordinator(p.tipo_profissional, p.registro_profissional),
    assignedSector: p.especialidade || "Campo Geral",
    boundDeviceId: p.dispositivo_uuid || null,
    deviceStatus: !ativo ? "BLOQUEADO" : p.dispositivo_uuid ? "VINCULADO" : "SEM_APARELHO",
    validatedCount: 0,
    targetCount: 150,
    rejectionRate: 0.0,
    lastSyncAt: p.ultimo_login ? new Date(p.ultimo_login).toLocaleString("pt-BR") : "Nunca",
    isSuspended: !ativo,
    auditAlertsCount: 0,
    tipoProfissional: p.tipo_profissional ?? "pesquisador_campo",
    registroProfissional: p.registro_profissional ?? null,
    telefone: p.telefone ?? null,
  };
}

export function ResearchersManagementFeature(): React.JSX.Element {
  const [researchers, setResearchers] = useState<readonly ExtendedResearcherRecord[]>([]);
  const [activeTab, setActiveTab] = useState<string>("ATIVOS");
  const [search, setSearch] = useState<string>("");
  const [filterDevice, setFilterDevice] = useState<string>("ALL");
  const [filterSector, setFilterSector] = useState<string>("ALL");
  const [apiError, setApiError] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [suspendingTarget, setSuspendingTarget] = useState<ExtendedResearcherRecord | null>(null);
  const [bindingTarget, setBindingTarget] = useState<ExtendedResearcherRecord | null>(null);
  const [editingResearcher, setEditingResearcher] = useState<ExtendedResearcherRecord | null>(null);

  useEffect(() => {
    fetch(API_PROFISSIONAIS, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((items: unknown) => {
        if (!Array.isArray(items)) return;
        setResearchers((items as BackendProfissionalRow[]).map(mapBackendProfissional));
      })
      .catch(() => {
        setResearchers([]);
      });
  }, []);

  const filteredResearchers = useMemo(() => {
    return researchers.filter((r) => {
      // Newly created active professionals (ativo === true) appear immediately in ATIVOS even before device binding
      if (activeTab === "ATIVOS" && r.isSuspended) return false;
      if (activeTab === "PENDENTES" && (r.isSuspended || r.deviceStatus !== "SEM_APARELHO")) return false;
      if (activeTab === "ALERTAS" && r.auditAlertsCount === 0) return false;
      if (activeTab === "BLOQUEADOS" && !r.isSuspended) return false;

      if (filterDevice !== "ALL" && r.deviceStatus !== filterDevice) return false;
      if (filterSector !== "ALL" && !r.assignedSector.includes(filterSector)) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        if (
          !r.fullName.toLowerCase().includes(query) &&
          !r.maskedCpf.includes(query) &&
          !(r.registroProfissional ?? "").toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [researchers, activeTab, filterDevice, filterSector, search]);

  const tabs = useMemo(
    () =>
      getResearcherTabs(researchers).map((tab) =>
        tab.id === "ATIVOS"
          ? { ...tab, count: researchers.filter((r) => !r.isSuspended).length }
          : tab.id === "PENDENTES"
            ? {
                ...tab,
                count: researchers.filter((r) => !r.isSuspended && r.deviceStatus === "SEM_APARELHO").length,
              }
            : tab,
      ),
    [researchers],
  );
  const kpis = useMemo(() => getResearcherKpis(researchers), [researchers]);
  const filters = useMemo(
    () => getResearcherFilters(filterDevice, setFilterDevice, filterSector, setFilterSector),
    [filterDevice, filterSector]
  );

  const handleSave = async (data: ExtendedResearcherFormData): Promise<void> => {
    setApiError(null);
    const bodyPayload = {
      nome: data.fullName.trim(),
      cpf_cnpj: data.cpf.trim(),
      especialidade: data.assignedSector.trim(),
      tipo_profissional: data.tipoProfissional,
      registro_profissional: data.registroProfissional.trim() || null,
      telefone: data.telefone.trim() || null,
    };

    if (editingResearcher) {
      try {
        const res = await fetch(`${API_PROFISSIONAIS}/${editingResearcher.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(bodyPayload),
        });
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as { detail?: string };
          setApiError(errBody.detail ?? `Falha HTTP ${res.status} ao atualizar profissional.`);
          return;
        }
        const updated = (await res.json()) as BackendProfissionalRow;
        const mapped = mapBackendProfissional(updated);
        setResearchers((prev) =>
          prev.map((r) =>
            r.id === editingResearcher.id
              ? { ...mapped, targetCount: data.targetCount }
              : r,
          ),
        );
        setEditingResearcher(null);
      } catch (err) {
        setApiError(err instanceof Error ? err.message : "Erro de conexão ao atualizar profissional.");
      }
      return;
    }

    try {
      const res = await fetch(API_PROFISSIONAIS, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { detail?: string };
        setApiError(errBody.detail ?? `Falha HTTP ${res.status} ao cadastrar profissional.`);
        return;
      }
      const created = (await res.json()) as BackendProfissionalRow;
      const mapped = mapBackendProfissional(created);
      setResearchers((prev) => [{ ...mapped, targetCount: data.targetCount }, ...prev]);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erro de conexão ao cadastrar profissional.");
    }
  };

  const handleToggleSuspend = async (_reason?: string): Promise<void> => {
    if (!suspendingTarget) return;
    setApiError(null);
    if (/^\d+$/.test(suspendingTarget.id)) {
      try {
        const res = await fetch(`${API_PROFISSIONAIS}/${suspendingTarget.id}/status`, {
          method: "PATCH",
        });
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as { detail?: string };
          setApiError(errBody.detail ?? `Falha HTTP ${res.status} ao alterar status.`);
          setSuspendingTarget(null);
          return;
        }
      } catch (err) {
        setApiError(err instanceof Error ? err.message : "Erro de conexão ao alterar status.");
        setSuspendingTarget(null);
        return;
      }
    }
    setResearchers((prev) =>
      prev.map((r) =>
        r.id === suspendingTarget.id
          ? {
              ...r,
              isSuspended: !r.isSuspended,
              deviceStatus: r.isSuspended
                ? r.boundDeviceId
                  ? "VINCULADO"
                  : "SEM_APARELHO"
                : "BLOQUEADO",
            }
          : r,
      ),
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
          : r,
      ),
    );
    setBindingTarget(null);
  };

  return (
    <>
      {apiError && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            borderRadius: "10px",
            backgroundColor: "rgba(242, 139, 130, 0.12)",
            border: "1px solid #f28b82",
            color: "#f28b82",
            fontSize: "12px",
            fontWeight: 600,
            marginBottom: "14px",
          }}
        >
          {apiError}
        </div>
      )}

      <EnterpriseCrudWorkspace<ExtendedResearcherRecord>
        title="Controle de Profissionais, Estatísticos e Vínculo de Aparelhos"
        subtitle="Credenciamento de pesquisadores de campo, estatísticos responsáveis (CONRE) e supervisores"
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
            + Cadastrar Profissional
          </button>
        }
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={kpis}
        searchPlaceholder="Buscar profissional por nome, CPF ou CONRE..."
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
              Editar
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
              Aparelho
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
              {r.isSuspended ? "Reativar" : "Suspender"}
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
            ? "Reativar Acesso do Profissional"
            : "Suspender Profissional e Revogar Sessões"
        }
        message={`Deseja alterar o status de acesso de "${suspendingTarget?.fullName}"?`}
        confirmLabel={suspendingTarget?.isSuspended ? "Reativar" : "Suspender Acesso"}
        variant={suspendingTarget?.isSuspended ? "success" : "danger"}
        requireReason={!suspendingTarget?.isSuspended}
        onConfirm={handleToggleSuspend}
        onCancel={() => setSuspendingTarget(null)}
      />

      <ConfirmDialogModal
        isOpen={Boolean(bindingTarget)}
        title="Vincular Novo Aparelho (Device Binding)"
        message={`Deseja gerar uma nova chave de hardware criptográfica para "${bindingTarget?.fullName}"?`}
        confirmLabel="Gerar Vínculo de Hardware"
        variant="info"
        onConfirm={handleConfirmBinding}
        onCancel={() => setBindingTarget(null)}
      />
    </>
  );
}
