import React, { useState, useMemo, useEffect } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { ConfirmDialogModal } from "../../components/ui/ConfirmDialogModal";
import { NOCTURNE_BUTTON_STYLES } from "../../lib/designTokens";
import { useTerritorialStore, type FlattenedNeighborhoodRecord } from "./regionsStore";
import type { NeighborhoodItem } from "./regionsData";
import { fetchNeighborhoodsWithRegions } from "./neighborhoodsApi";
import { RegionsFeedbackToast } from "./RegionsCrudShared";
import { NeighborhoodDrawerForm } from "./TerritorialCrudDrawers";

interface PendingSaveNb {
  readonly regionId: string;
  readonly data: Omit<NeighborhoodItem, "id">;
  readonly editId?: string;
}

export function NeighborhoodsCrudScreen(): React.JSX.Element {
  const countries = useTerritorialStore((s) => s.countries);
  const defaultCountryId = useTerritorialStore((s) => s.defaultCountryId);
  const states = useTerritorialStore((s) => s.states);
  const municipalities = useTerritorialStore((s) => s.municipalities);
  const regions = useTerritorialStore((s) => s.regions);
  const setRegions = useTerritorialStore((s) => s.setRegions);
  const selectedRegionFilterId = useTerritorialStore((s) => s.selectedRegionFilterId);
  const setSelectedRegionFilterId = useTerritorialStore((s) => s.setSelectedRegionFilterId);
  const saveNeighborhood = useTerritorialStore((s) => s.saveNeighborhood);
  const deleteNeighborhood = useTerritorialStore((s) => s.deleteNeighborhood);

  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [filterStateId, setFilterStateId] = useState("ALL");
  const [filterMunicipalityId, setFilterMunicipalityId] = useState("ALL");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<FlattenedNeighborhoodRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FlattenedNeighborhoodRecord | null>(null);
  const [pendingSave, setPendingSave] = useState<PendingSaveNb | null>(null);

  useEffect(() => {
    fetchNeighborhoodsWithRegions()
      .then((loaded) => {
        if (loaded) setRegions(loaded);
      })
      .catch(() => undefined);
  }, [setRegions]);

  const allNeighborhoods = useMemo<readonly FlattenedNeighborhoodRecord[]>(() => {
    return regions.flatMap((r) =>
      r.neighborhoods.map((nb) => ({
        ...nb,
        regionId: r.id,
        regionCode: r.code,
        regionName: r.name,
        municipalityId: r.municipalityId,
        cityName: r.cityName,
        stateId: r.stateId,
        uf: r.uf,
        countryId: r.countryId,
      }))
    );
  }, [regions]);

  const filtered = useMemo(() => {
    return allNeighborhoods.filter((nb) => {
      if (filterStateId !== "ALL" && nb.stateId !== filterStateId) return false;
      if (filterMunicipalityId !== "ALL" && nb.municipalityId !== filterMunicipalityId) return false;
      if (selectedRegionFilterId !== "ALL" && nb.regionId !== selectedRegionFilterId) return false;
      if (activeTab === "SP" && nb.cityName !== "São Paulo") return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          nb.code.toLowerCase().includes(q) ||
          nb.name.toLowerCase().includes(q) ||
          nb.cityName.toLowerCase().includes(q) ||
          nb.regionCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allNeighborhoods, filterStateId, filterMunicipalityId, selectedRegionFilterId, activeTab, search]);

  const handleConfirmDelete = async (): Promise<void> => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    if (target.id_bairro) {
      try {
        await fetch(`http://127.0.0.1:8000/api/v1/bairros/${target.id_bairro}`, { method: "DELETE" });
      } catch { /* offline fallback */ }
    }
    deleteNeighborhood(target.regionId, target.id);
    setToast(`Bairro ${target.name} excluído com sucesso.`);
  };

  const handleConfirmSave = async (): Promise<void> => {
    if (!pendingSave) return;
    const { regionId, data, editId } = pendingSave;
    setPendingSave(null);
    saveNeighborhood(regionId, data, editId);

    try {
      const bodyJson = JSON.stringify({
        id_municipio: 1,
        id_regiao_zona: Number(regionId.replace(/^reg-/, "")) || 1,
        codigo_bairro_ibge: data.code,
        nome_bairro: data.name,
        populacao_total: data.estimatedVoters,
        eleitorado_total: data.estimatedVoters,
        renda_media_domiciliar: 3200.0,
        ativo: true,
      });

      if (data.id_bairro) {
        await fetch(`http://127.0.0.1:8000/api/v1/bairros/${data.id_bairro}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: bodyJson,
        });
      } else {
        await fetch("http://127.0.0.1:8000/api/v1/bairros", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: bodyJson,
        });
      }
    } catch { /* offline fallback */ }

    setToast(editId ? `Bairro ${data.name} atualizado.` : `Bairro ${data.name} cadastrado com sucesso.`);
    setDrawerOpen(false);
  };

  return (
    <div data-testid="neighborhoods-crud-page">
      <RegionsFeedbackToast message={toast} testId="neighborhoods-feedback-toast" />

      <EnterpriseCrudWorkspace<FlattenedNeighborhoodRecord>
        title="Cadastro de Bairros"
        subtitle="Cadastro Bairros: País -> Estado (UF) -> Município -> Bairros"
        globalActions={
          <button type="button" data-testid="btn-new-neighborhood" onClick={() => { setEditing(null); setDrawerOpen(true); }} style={NOCTURNE_BUTTON_STYLES.primary}>
            + Novo Bairro
          </button>
        }
        tabs={[
          { id: "ALL", label: "Todos os Bairros", count: allNeighborhoods.length },
          { id: "SP", label: "Capital (São Paulo)", count: allNeighborhoods.filter((n) => n.cityName === "São Paulo").length },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={[
          { id: "nk-1", label: "Bairros Cadastrados", value: allNeighborhoods.length, variant: "success" },
          { id: "nk-2", label: "Regiões Atendidas", value: regions.length, variant: "default" },
          { id: "nk-3", label: "Eleitores Estimados nos Bairros", value: allNeighborhoods.reduce((acc, n) => acc + n.estimatedVoters, 0).toLocaleString("pt-BR"), variant: "warning" },
        ]}
        searchPlaceholder="Buscar por código, nome do bairro, região ou município..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          { id: "state", label: "1. Estado (UF)", value: filterStateId, onChange: (v) => { setFilterStateId(v); setFilterMunicipalityId("ALL"); setSelectedRegionFilterId("ALL"); }, options: [{ value: "ALL", label: "Todos os Estados" }, ...states.map((s) => ({ value: s.id, label: `${s.uf} — ${s.name}` }))] },
          { id: "city", label: "2. Município", value: filterMunicipalityId, onChange: (v) => { setFilterMunicipalityId(v); setSelectedRegionFilterId("ALL"); }, options: [{ value: "ALL", label: "Todos os Municípios" }, ...municipalities.filter((m) => filterStateId === "ALL" || m.stateId === filterStateId).map((m) => ({ value: m.id, label: `${m.name} / ${m.uf}` }))] },
          { id: "region", label: "3. Região Municipal", value: selectedRegionFilterId, onChange: setSelectedRegionFilterId, options: [{ value: "ALL", label: "Todas as Regiões" }, ...regions.filter((r) => filterMunicipalityId === "ALL" || r.municipalityId === filterMunicipalityId).map((r) => ({ value: r.id, label: `${r.code} (${r.cityName})` }))] },
        ]}
        onClearFilters={() => { setSearch(""); setFilterStateId("ALL"); setFilterMunicipalityId("ALL"); setSelectedRegionFilterId("ALL"); }}
        columns={[
          { key: "code", header: "Código / Setor IBGE", render: (nb) => (<div><strong style={{ fontFamily: "monospace", color: "#8ab4f8", fontSize: "12px" }}>{nb.code}</strong><div style={{ fontSize: "11px", color: "#9aa0a6", fontFamily: "monospace" }}>IBGE {nb.ibgeCensusSectorPrefix}</div></div>) },
          { key: "name", header: "Bairro / Região & Município", render: (nb) => (<div><strong style={{ color: "#e5e2e1" }}>{nb.name}</strong><div style={{ fontSize: "11px", color: "#9aa0a6" }}>{nb.regionCode} • {nb.cityName}/{nb.uf}</div></div>) },
          { key: "income", header: "Faixa de Renda", render: (nb) => <span style={{ color: "#c3c6d1" }}>{nb.predominantIncomeBracket}</span> },
          { key: "voters", header: "Eleitores & Peso (%)", align: "right", render: (nb) => (<div style={{ fontFamily: "monospace" }}><strong>{nb.estimatedVoters.toLocaleString("pt-BR")}</strong><div style={{ fontSize: "11px", color: "#81c995" }}>{nb.electoralWeightPct}%</div></div>) },
        ]}
        data={filtered}
        keyExtractor={(nb) => nb.id}
        renderRowActions={(nb) => (
          <>
            <button type="button" data-testid={`btn-edit-neighborhood-${nb.id}`} onClick={() => { setEditing(nb); setDrawerOpen(true); }} style={NOCTURNE_BUTTON_STYLES.edit}>✏️ Editar</button>
            <button type="button" data-testid={`btn-delete-neighborhood-${nb.id}`} onClick={() => setPendingDelete(nb)} style={{ ...NOCTURNE_BUTTON_STYLES.danger, padding: "5px 10px", fontSize: "11px" }}>🗑️ Excluir</button>
          </>
        )}
      />

      <NeighborhoodDrawerForm
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editing={editing}
        countries={countries}
        states={states}
        municipalities={municipalities}
        regions={regions}
        defaultCountryId={defaultCountryId}
        defaultRegionId={selectedRegionFilterId !== "ALL" ? selectedRegionFilterId : "reg-001"}
        onSave={(regId, data, editId) => setPendingSave({ regionId: regId, data, editId })}
      />

      <ConfirmDialogModal
        isOpen={Boolean(pendingDelete)}
        title="Confirmar Exclusão de Bairro"
        message={pendingDelete ? `Deseja realmente excluir o bairro "${pendingDelete.name}" (${pendingDelete.code})? Esta ação removerá o registro do banco de dados.` : ""}
        confirmLabel="Sim, Excluir Bairro"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialogModal
        isOpen={Boolean(pendingSave)}
        title={pendingSave?.editId ? "Confirmar Atualização de Bairro" : "Confirmar Cadastro de Bairro"}
        message={
          pendingSave
            ? `Deseja realmente ${pendingSave.editId ? "atualizar os dados do" : "cadastrar o"} bairro "${pendingSave.data.name}" (${pendingSave.data.code})?`
            : ""
        }
        confirmLabel={pendingSave?.editId ? "Sim, Atualizar Bairro" : "Sim, Cadastrar Bairro"}
        cancelLabel="Cancelar"
        variant={pendingSave?.editId ? "warning" : "success"}
        onConfirm={handleConfirmSave}
        onCancel={() => setPendingSave(null)}
      />
    </div>
  );
}
