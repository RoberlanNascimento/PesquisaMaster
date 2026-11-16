import React, { useState, useMemo, useEffect } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { ConfirmDialogModal } from "../../components/ui/ConfirmDialogModal";
import { NOCTURNE_BUTTON_STYLES } from "../../lib/designTokens";
import type { StateRecord } from "./regionsData";
import { useTerritorialStore } from "./regionsStore";
import { RegionsFeedbackToast } from "./RegionsCrudShared";
import { StateDrawerForm } from "./StateDrawerForm";

interface PendingSaveState {
  readonly isEdit: boolean;
  readonly id?: string;
  readonly id_estado?: number;
  readonly payload: Omit<StateRecord, "id">;
}

export function StatesCrudScreen(): React.JSX.Element {
  const countries = useTerritorialStore((s) => s.countries);
  const defaultCountryId = useTerritorialStore((s) => s.defaultCountryId);
  const states = useTerritorialStore((s) => s.states);
  const municipalities = useTerritorialStore((s) => s.municipalities);
  const setStates = useTerritorialStore((s) => s.setStates);
  const saveState = useTerritorialStore((s) => s.saveState);
  const deleteState = useTerritorialStore((s) => s.deleteState);

  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [filterCountryId, setFilterCountryId] = useState(defaultCountryId);
  const [filterMacro, setFilterMacro] = useState("ALL");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<StateRecord | null>(null);
  const [countryId, setCountryId] = useState(defaultCountryId);
  const [uf, setUf] = useState("PR");
  const [name, setName] = useState("Paraná");
  const [ibgeCode, setIbgeCode] = useState("41");
  const [macroRegion, setMacroRegion] = useState("Sul");
  const [populacaoTotal, setPopulacaoTotal] = useState(11443208);
  const [electorateTotal, setElectorateTotal] = useState(8645524);
  const [toast, setToast] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<StateRecord | null>(null);
  const [pendingSave, setPendingSave] = useState<PendingSaveState | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/estados")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Array<Record<string, unknown>> | null) => {
        if (data && Array.isArray(data) && data.length > 0) {
          const loaded: StateRecord[] = data.map((row) => ({
            id: `state-${String(row.sigla ?? "").toLowerCase()}`,
            id_estado: Number(row.id_estado),
            countryId: "country-br",
            uf: String(row.sigla ?? "").toUpperCase(),
            name: String(row.nome ?? ""),
            ibgeCode: String(row.codigo_ibge ?? ""),
            macroRegion: String(row.regiao ?? "Sudeste"),
            populacaoTotal: Number(row.populacao_total ?? 0),
            electorateTotal: Number(row.eleitorado_total ?? 0),
          }));
          setStates(loaded);
        }
      })
      .catch(() => undefined);
  }, [setStates]);

  const filtered = useMemo(() => {
    return states.filter((s) => {
      if (filterCountryId !== "ALL" && s.countryId !== filterCountryId) return false;
      if (filterMacro !== "ALL" && s.macroRegion !== filterMacro) return false;
      if (activeTab === "SUDESTE" && s.macroRegion !== "Sudeste") return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return s.uf.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.ibgeCode.includes(q);
      }
      return true;
    });
  }, [states, filterCountryId, filterMacro, activeTab, search]);

  const openCreate = (): void => {
    setEditing(null);
    setCountryId(filterCountryId !== "ALL" ? filterCountryId : defaultCountryId);
    setUf(""); setName(""); setIbgeCode(""); setMacroRegion("Sudeste");
    setPopulacaoTotal(0); setElectorateTotal(0); setDrawerOpen(true);
  };

  const openEdit = (s: StateRecord): void => {
    setEditing(s);
    setCountryId(s.countryId);
    setUf(s.uf); setName(s.name); setIbgeCode(s.ibgeCode); setMacroRegion(s.macroRegion);
    setPopulacaoTotal(s.populacaoTotal ?? 0); setElectorateTotal(s.electorateTotal);
    setDrawerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!uf.trim() || !name.trim()) return;
    const cleanUf = uf.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanIbge = ibgeCode.trim();

    setPendingSave({
      isEdit: Boolean(editing),
      id: editing?.id,
      id_estado: editing?.id_estado,
      payload: { countryId, uf: cleanUf, name: cleanName, ibgeCode: cleanIbge, macroRegion, populacaoTotal, electorateTotal, id_estado: editing?.id_estado },
    });
  };

  const handleConfirmSave = async (): Promise<void> => {
    if (!pendingSave) return;
    const { isEdit, id, id_estado, payload } = pendingSave;
    setPendingSave(null);
    saveState(payload, id);

    try {
      const bodyJson = JSON.stringify({
        sigla: payload.uf, nome: payload.name, codigo_ibge: Number(payload.ibgeCode) || 0,
        regiao: payload.macroRegion, populacao_total: payload.populacaoTotal ?? 0, eleitorado_total: payload.electorateTotal,
      });

      if (isEdit && id_estado) {
        await fetch(`http://127.0.0.1:8000/api/v1/estados/${id_estado}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: bodyJson });
      } else {
        const resp = await fetch("http://127.0.0.1:8000/api/v1/estados", { method: "POST", headers: { "Content-Type": "application/json" }, body: bodyJson });
        if (resp.ok) {
          const created = await resp.json();
          if (created?.id_estado) saveState({ ...payload, id_estado: Number(created.id_estado) }, id ?? `state-${payload.uf.toLowerCase()}`);
        }
      }
    } catch { /* offline fallback */ }

    setToast(isEdit ? `Estado ${payload.name} (${payload.uf}) atualizado com sucesso.` : `Estado ${payload.name} (${payload.uf}) cadastrado no banco.`);
    setDrawerOpen(false);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    if (target.id_estado) {
      try { await fetch(`http://127.0.0.1:8000/api/v1/estados/${target.id_estado}`, { method: "DELETE" }); } catch { /* offline fallback */ }
    }
    deleteState(target.id);
    setToast(`Estado ${target.name} (${target.uf}) excluído com sucesso.`);
  };

  return (
    <div data-testid="states-crud-page">
      <RegionsFeedbackToast message={toast} testId="states-feedback-toast" />

      <EnterpriseCrudWorkspace<StateRecord>
        title="Gerenciamento de Estados (Tabela estados)"
        subtitle="Sincronização bidirecional com a tabela 'estados' do PostgreSQL (27 UFs)"
        globalActions={
          <button type="button" data-testid="btn-new-state" onClick={openCreate} style={NOCTURNE_BUTTON_STYLES.primary}>
            + Novo Estado (UF)
          </button>
        }
        tabs={[
          { id: "ALL", label: "Todos os Estados (27 UFs)", count: states.length },
          { id: "SUDESTE", label: "Macrorregião Sudeste", count: states.filter((s) => s.macroRegion === "Sudeste").length },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={[
          { id: "sk-1", label: "UFs no Banco de Dados", value: `${states.length} Estados`, variant: "default" },
          { id: "sk-2", label: "Municípios Vinculados", value: municipalities.length, variant: "success" },
          { id: "sk-3", label: "Eleitorado Consolidado", value: states.reduce((acc, s) => acc + s.electorateTotal, 0).toLocaleString("pt-BR"), variant: "warning" },
        ]}
        searchPlaceholder="Buscar por sigla UF, nome do estado ou código IBGE..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          { id: "country", label: "País", value: filterCountryId, onChange: setFilterCountryId, options: [{ value: "ALL", label: "Todos os Países" }, ...countries.map((c) => ({ value: c.id, label: `${c.name} (${c.isoCode})` }))] },
          { id: "macro", label: "Macrorregião", value: filterMacro, onChange: setFilterMacro, options: [{ value: "ALL", label: "Todas as Regiões" }, { value: "Sudeste", label: "Sudeste" }, { value: "Sul", label: "Sul" }, { value: "Nordeste", label: "Nordeste" }, { value: "Centro-Oeste", label: "Centro-Oeste" }, { value: "Norte", label: "Norte" }] },
        ]}
        onClearFilters={() => { setSearch(""); setFilterCountryId(defaultCountryId); setFilterMacro("ALL"); }}
        columns={[
          { key: "uf", header: "UF / IBGE", render: (s) => (<div><strong style={{ fontFamily: "monospace", color: "#8ab4f8", fontSize: "14px" }}>{s.uf}</strong><div style={{ fontSize: "11px", color: "#9aa0a6" }}>IBGE {s.ibgeCode}</div></div>) },
          { key: "name", header: "Nome da Unidade Federativa", render: (s) => (<div><strong style={{ color: "#e5e2e1", fontSize: "13.5px" }}>{s.name}</strong><div style={{ fontSize: "11px", color: "#9aa0a6" }}>Região {s.macroRegion}</div></div>) },
          { key: "macro", header: "Macrorregião", render: (s) => <span style={{ color: "#c3c6d1" }}>{s.macroRegion}</span> },
          { key: "pop", header: "População Censo", align: "right", render: (s) => <span style={{ fontFamily: "monospace" }}>{(s.populacaoTotal ?? 0).toLocaleString("pt-BR")}</span> },
          { key: "electorate", header: "Eleitorado TSE", align: "right", render: (s) => <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#8ab4f8" }}>{s.electorateTotal.toLocaleString("pt-BR")}</span> },
          { key: "cities", header: "Municípios", align: "center", render: (s) => <span style={{ fontFamily: "monospace", color: "#81c995", fontWeight: 700 }}>{municipalities.filter((m) => m.stateId === s.id).length} mun.</span> },
        ]}
        data={filtered}
        keyExtractor={(s) => s.id}
        renderRowActions={(s) => (
          <>
            <button type="button" data-testid={`btn-edit-state-${s.id}`} onClick={() => openEdit(s)} style={NOCTURNE_BUTTON_STYLES.edit}>✏️ Editar</button>
            <button type="button" data-testid={`btn-delete-state-${s.id}`} onClick={() => setPendingDelete(s)} style={{ ...NOCTURNE_BUTTON_STYLES.danger, padding: "5px 10px", fontSize: "11px" }}>🗑️ Excluir</button>
          </>
        )}
      />

      <StateDrawerForm
        isOpen={drawerOpen}
        editing={editing}
        countries={countries}
        countryId={countryId}
        uf={uf}
        name={name}
        ibgeCode={ibgeCode}
        macroRegion={macroRegion}
        populacaoTotal={populacaoTotal}
        electorateTotal={electorateTotal}
        onCountryChange={setCountryId}
        onUfChange={setUf}
        onNameChange={setName}
        onIbgeCodeChange={setIbgeCode}
        onMacroRegionChange={setMacroRegion}
        onPopulacaoTotalChange={setPopulacaoTotal}
        onElectorateTotalChange={setElectorateTotal}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialogModal
        isOpen={Boolean(pendingDelete)}
        title="Confirmar Exclusão de Estado"
        message={pendingDelete ? `Deseja realmente excluir o estado "${pendingDelete.name} (${pendingDelete.uf})"? Esta ação removerá o registro da tabela 'estados' do PostgreSQL.` : ""}
        confirmLabel="Sim, Excluir Estado"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialogModal
        isOpen={Boolean(pendingSave)}
        title={pendingSave?.isEdit ? "Confirmar Atualização de Estado" : "Confirmar Cadastro de Estado"}
        message={
          pendingSave
            ? `Deseja realmente ${pendingSave.isEdit ? "atualizar os dados do" : "cadastrar o"} estado "${pendingSave.payload.name} (${pendingSave.payload.uf})"? As alterações serão salvas na tabela 'estados' do PostgreSQL.`
            : ""
        }
        confirmLabel={pendingSave?.isEdit ? "Sim, Atualizar Estado" : "Sim, Cadastrar Estado"}
        cancelLabel="Cancelar"
        variant={pendingSave?.isEdit ? "warning" : "success"}
        onConfirm={handleConfirmSave}
        onCancel={() => setPendingSave(null)}
      />
    </div>
  );
}
