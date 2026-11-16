import React, { useState, useMemo, useEffect } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { ConfirmDialogModal } from "../../components/ui/ConfirmDialogModal";
import { NOCTURNE_BUTTON_STYLES } from "../../lib/designTokens";
import { useUiSessionStore } from "../../lib/store";
import type { MunicipalRegionRecord, MunicipalRegionFormData, UrbanZoneType } from "./regionsData";
import {
  getRegionTabs,
  getRegionKpis,
  getRegionFilters,
  REGION_COLUMNS,
} from "./regionsConfig";
import { RegionDrawerForm } from "./RegionDrawerForm";
import { RegionsFeedbackToast } from "./RegionsCrudShared";
import { useTerritorialStore } from "./regionsStore";

export function MunicipalRegionsFeature(): React.JSX.Element {
  const countries = useTerritorialStore((s) => s.countries);
  const states = useTerritorialStore((s) => s.states);
  const municipalities = useTerritorialStore((s) => s.municipalities);
  const regions = useTerritorialStore((s) => s.regions);
  const setRegions = useTerritorialStore((s) => s.setRegions);
  const saveRegion = useTerritorialStore((s) => s.saveRegion);
  const deleteRegion = useTerritorialStore((s) => s.deleteRegion);
  const setSelectedRegionFilterId = useTerritorialStore((s) => s.setSelectedRegionFilterId);
  const setActiveTabGlobal = useUiSessionStore((s) => s.setActiveTab);

  const [filterStateId, setFilterStateId] = useState("ALL");
  const [filterMunicipalityId, setFilterMunicipalityId] = useState("ALL");
  const [filterZone, setFilterZone] = useState("ALL");
  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<MunicipalRegionRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingDeleteRegion, setPendingDeleteRegion] = useState<MunicipalRegionRecord | null>(null);
  const [pendingSaveData, setPendingSaveData] = useState<MunicipalRegionFormData | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/regioes")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Array<Record<string, unknown>> | null) => {
        if (data && Array.isArray(data) && data.length > 0) {
          const loaded: MunicipalRegionRecord[] = data.map((row, idx) => {
            const sigla = String(row.sigla ?? `R${idx + 1}`);
            const uf = String(row.uf ?? "PA");
            const zoneVal: UrbanZoneType = sigla.includes("S") ? "ZONA_SUL" : sigla.includes("N") ? "ZONA_NORTE" : sigla.includes("L") ? "ZONA_LESTE" : sigla.includes("O") ? "ZONA_OESTE" : "ZONA_CENTRAL";
            return {
              id: `reg-${row.id_regiao_zona}`,
              id_regiao_zona: Number(row.id_regiao_zona),
              countryId: "country-br",
              stateId: `state-${uf.toLowerCase()}`,
              municipalityId: `mun-${row.id_municipio ?? 1}`,
              code: `REG-${uf}-${sigla}`,
              name: String(row.nome_regiao ?? ""),
              cityName: String(row.municipio_nome ?? "Parauapebas"),
              uf,
              masterPlanZone: zoneVal,
              masterPlanLawRef: String(row.descricao ?? "Plano Diretor Municipal"),
              electorateTotal: 45000,
              electorateWeightPct: "10.0000",
              censusSectorsCount: 40,
              isActive: Boolean(row.ativo ?? true),
              neighborhoods: [],
            };
          });
          setRegions(loaded);
        }
      })
      .catch(() => undefined);
  }, [setRegions]);

  const filteredRegions = useMemo(() => {
    return regions.filter((r) => {
      if (filterStateId !== "ALL" && r.stateId !== filterStateId) return false;
      if (filterMunicipalityId !== "ALL" && r.municipalityId !== filterMunicipalityId) return false;
      if (filterZone !== "ALL" && r.masterPlanZone !== filterZone) return false;
      if (activeTab === "ACTIVE" && !r.isActive) return false;
      if (activeTab === "METROPOLITAN" && r.cityName !== "São Paulo") return false;
      if (activeTab === "WITH_NEIGHBORHOODS" && r.neighborhoods.length === 0) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.cityName.toLowerCase().includes(q) ||
          r.uf.toLowerCase().includes(q) ||
          r.neighborhoods.some((nb) => nb.name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [regions, filterStateId, filterMunicipalityId, filterZone, activeTab, search]);

  const tabs = useMemo(() => getRegionTabs(regions), [regions]);
  const kpis = useMemo(
    () => getRegionKpis(regions, states.length, municipalities.length),
    [regions, states.length, municipalities.length]
  );
  const filters = useMemo(
    () =>
      getRegionFilters(
        filterStateId,
        setFilterStateId,
        filterMunicipalityId,
        setFilterMunicipalityId,
        filterZone,
        setFilterZone,
        states,
        municipalities
      ),
    [filterStateId, filterMunicipalityId, filterZone, states, municipalities]
  );

  const handleConfirmDelete = async (): Promise<void> => {
    if (!pendingDeleteRegion) return;
    const target = pendingDeleteRegion;
    setPendingDeleteRegion(null);
    if (target.id_regiao_zona) {
      try {
        await fetch(`http://127.0.0.1:8000/api/v1/regioes/${target.id_regiao_zona}`, { method: "DELETE" });
      } catch { /* offline fallback */ }
    }
    deleteRegion(target.id);
    setToast(`Região municipal ${target.code} excluída.`);
  };

  const handleConfirmSave = async (): Promise<void> => {
    if (!pendingSaveData) return;
    const data = pendingSaveData;
    setPendingSaveData(null);
    saveRegion(data, editingRegion?.id);

    try {
      const bodyJson = JSON.stringify({
        id_municipio: 1,
        nome_regiao: data.name,
        sigla: data.code.replace(/^REG-[A-Z]+-/, "") || data.code,
        descricao: data.masterPlanLawRef,
        ativo: true,
      });
      if (editingRegion?.id_regiao_zona) {
        await fetch(`http://127.0.0.1:8000/api/v1/regioes/${editingRegion.id_regiao_zona}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: bodyJson,
        });
      } else {
        const resp = await fetch("http://127.0.0.1:8000/api/v1/regioes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: bodyJson,
        });
        if (resp.ok) {
          const created = await resp.json();
          if (created?.id_regiao_zona) {
            saveRegion({ ...data, id_regiao_zona: Number(created.id_regiao_zona) }, editingRegion?.id);
          }
        }
      }
    } catch { /* offline fallback */ }

    setToast(editingRegion ? `Região municipal ${data.code} atualizada.` : `Nova região municipal ${data.code} vinculada a ${data.cityName}/${data.uf}.`);
    setDrawerOpen(false);
  };

  return (
    <div data-testid="municipal-regions-page">
      <RegionsFeedbackToast message={toast} testId="regions-feedback-toast" />

      <EnterpriseCrudWorkspace<MunicipalRegionRecord>
        title="Gerenciamento de Regiões Municipais e Bairros (Plano Diretor)"
        subtitle="Cadastro exclusivo de Regiões Municipais com combobox em cascata: País (Brasil) -> Estado (UF) -> Município"
        globalActions={
          <button
            type="button"
            data-testid="btn-new-municipal-region"
            onClick={() => { setEditingRegion(null); setDrawerOpen(true); }}
            style={NOCTURNE_BUTTON_STYLES.primary}
          >
            + Nova Região Municipal
          </button>
        }
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={kpis}
        searchPlaceholder="Buscar por código, região, município, UF ou bairro..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={filters}
        onClearFilters={() => { setSearch(""); setFilterStateId("ALL"); setFilterMunicipalityId("ALL"); setFilterZone("ALL"); }}
        columns={REGION_COLUMNS}
        data={filteredRegions}
        keyExtractor={(r) => r.id}
        renderRowActions={(r) => (
          <>
            <button
              type="button"
              data-testid={`btn-manage-neighborhoods-${r.id}`}
              onClick={() => { setSelectedRegionFilterId(r.id); setActiveTabGlobal("regions-neighborhoods"); }}
              style={{ ...NOCTURNE_BUTTON_STYLES.secondary, padding: "5px 10px", fontSize: "11px" }}
            >
              🏘️ Bairros ({r.neighborhoods.length})
            </button>
            <button type="button" data-testid={`btn-edit-region-${r.id}`} onClick={() => { setEditingRegion(r); setDrawerOpen(true); }} style={NOCTURNE_BUTTON_STYLES.edit}>✏️ Editar</button>
            <button type="button" data-testid={`btn-delete-region-${r.id}`} onClick={() => setPendingDeleteRegion(r)} style={{ ...NOCTURNE_BUTTON_STYLES.danger, padding: "5px 10px", fontSize: "11px" }}>🗑️ Excluir</button>
          </>
        )}
      />

      <RegionDrawerForm
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        initialData={editingRegion}
        countries={countries}
        states={states}
        municipalities={municipalities}
        defaultMunicipalityId={filterMunicipalityId !== "ALL" ? filterMunicipalityId : undefined}
        onSave={(data) => setPendingSaveData(data)}
      />

      <ConfirmDialogModal
        isOpen={Boolean(pendingDeleteRegion)}
        title="Confirmar Exclusão de Região Municipal"
        message={pendingDeleteRegion ? `Deseja realmente excluir a região municipal "${pendingDeleteRegion.name}" (${pendingDeleteRegion.code})? Esta ação removerá o registro do banco de dados.` : ""}
        confirmLabel="Sim, Excluir Região"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteRegion(null)}
      />

      <ConfirmDialogModal
        isOpen={Boolean(pendingSaveData)}
        title={editingRegion ? "Confirmar Atualização de Região" : "Confirmar Cadastro de Região"}
        message={pendingSaveData ? `Deseja realmente ${editingRegion ? "atualizar" : "cadastrar"} a região "${pendingSaveData.name}" (${pendingSaveData.code}) vinculada a ${pendingSaveData.cityName}/${pendingSaveData.uf}?` : ""}
        confirmLabel={editingRegion ? "Sim, Atualizar Região" : "Sim, Cadastrar Região"}
        cancelLabel="Cancelar"
        variant={editingRegion ? "warning" : "success"}
        onConfirm={handleConfirmSave}
        onCancel={() => setPendingSaveData(null)}
      />
    </div>
  );
}
