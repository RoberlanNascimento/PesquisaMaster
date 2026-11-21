import React, { useState, useMemo, useEffect } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { NOCTURNE_BUTTON_STYLES } from "../../lib/designTokens";
import type { MunicipalityRecord, StateRecord } from "./regionsData";
import { useTerritorialStore } from "./regionsStore";
import { RegionsFeedbackToast } from "./RegionsCrudShared";
import { MunicipalityDrawerForm } from "./MunicipalityDrawerForm";

export function MunicipalitiesCrudScreen(): React.JSX.Element {
  const countries = useTerritorialStore((s) => s.countries);
  const defaultCountryId = useTerritorialStore((s) => s.defaultCountryId);
  const states = useTerritorialStore((s) => s.states);
  const municipalities = useTerritorialStore((s) => s.municipalities);
  const regions = useTerritorialStore((s) => s.regions);
  const setStates = useTerritorialStore((s) => s.setStates);
  const setMunicipalities = useTerritorialStore((s) => s.setMunicipalities);
  const saveMunicipality = useTerritorialStore((s) => s.saveMunicipality);
  const deleteMunicipality = useTerritorialStore((s) => s.deleteMunicipality);

  useEffect(() => {
    Promise.all([
      fetch("http://127.0.0.1:8000/api/v1/estados", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("http://127.0.0.1:8000/api/v1/amostragem/opcoes", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([estData, opData]: [Array<Record<string, unknown>> | null, Record<string, unknown> | null]) => {
      if (Array.isArray(estData) && estData.length > 0) {
        const loadedStates: StateRecord[] = estData.map((row) => ({
          id: `state-${String(row.sigla ?? "").toLowerCase()}`,
          id_estado: Number(row.id_estado),
          countryId: "country-br",
          uf: String(row.sigla ?? "").toUpperCase(),
          name: String(row.nome ?? ""),
          ibgeCode: String(row.codigo_ibge ?? ""),
          macroRegion: String(row.regiao ?? "Brasil"),
          populacaoTotal: Number(row.populacao_total ?? 0),
          electorateTotal: Number(row.eleitorado_total ?? 0),
        }));
        setStates(loadedStates);
      }

      const rawMuns = Array.isArray(opData?.municipios)
        ? (opData.municipios as Array<Record<string, unknown>>)
        : [];
      if (rawMuns.length > 0) {
        const loadedMuns: MunicipalityRecord[] = rawMuns.map((row) => {
          const uf = String(row.uf ?? "").toUpperCase();
          return {
            id: `mun-${row.id_municipio}`,
            stateId: `state-${uf.toLowerCase()}`,
            uf,
            name: String(row.nome ?? ""),
            ibgeCode: String(row.codigo_ibge ?? ""),
            populacaoTotal: Number(row.populacao_total ?? 0),
            electorateTotal: Number(row.eleitorado_total ?? 0),
            masterPlanLawRef: "Base Oficial IBGE",
          };
        });
        setMunicipalities(loadedMuns);
      }
    });
  }, [setStates, setMunicipalities]);

  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [filterCountryId, setFilterCountryId] = useState(defaultCountryId);
  const [filterStateId, setFilterStateId] = useState("ALL");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<MunicipalityRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const visibleStates = useMemo(
    () => (filterCountryId === "ALL" ? states : states.filter((s) => s.countryId === filterCountryId)),
    [states, filterCountryId]
  );

  const filtered = useMemo(() => {
    const validStateIds = new Set(visibleStates.map((s) => s.id));
    return municipalities.filter((m) => {
      if (filterCountryId !== "ALL" && !validStateIds.has(m.stateId)) return false;
      if (filterStateId !== "ALL" && m.stateId !== filterStateId) return false;
      if (activeTab === "SP" && m.uf !== "SP") return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.uf.toLowerCase().includes(q) ||
          m.ibgeCode.includes(q) ||
          m.masterPlanLawRef.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [municipalities, visibleStates, filterCountryId, filterStateId, activeTab, search]);

  return (
    <div data-testid="municipalities-crud-page">
      <RegionsFeedbackToast message={toast} testId="municipalities-feedback-toast" />

      <EnterpriseCrudWorkspace<MunicipalityRecord>
        title="Gerenciamento de Municípios e Planos Diretores"
        subtitle="Cadastro exclusivo de Municípios vinculados em cascata ao País (Brasil) e Estado (UF)"
        globalActions={
          <button
            type="button"
            data-testid="btn-new-municipality"
            onClick={() => { setEditing(null); setDrawerOpen(true); }}
            style={NOCTURNE_BUTTON_STYLES.primary}
          >
            + Novo Município
          </button>
        }
        tabs={[
          { id: "ALL", label: "Todos os Municípios", count: municipalities.length },
          { id: "SP", label: "Estado de São Paulo", count: municipalities.filter((m) => m.uf === "SP").length },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={[
          { id: "mk-1", label: "Municípios Cadastrados", value: municipalities.length, variant: "default" },
          { id: "mk-2", label: "Regiões Municipais Vinculadas", value: regions.length, variant: "success" },
          {
            id: "mk-3",
            label: "Eleitorado Municipal Consolidado",
            value: municipalities.reduce((acc, m) => acc + m.electorateTotal, 0).toLocaleString("pt-BR"),
            variant: "warning",
          },
        ]}
        searchPlaceholder="Buscar por nome do município, UF, código IBGE ou Lei do Plano Diretor..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            id: "country",
            label: "1. País",
            value: filterCountryId,
            onChange: (val) => { setFilterCountryId(val); setFilterStateId("ALL"); },
            options: [{ value: "ALL", label: "Todos os Países" }, ...countries.map((c) => ({ value: c.id, label: `${c.name} (${c.isoCode})` }))],
          },
          {
            id: "state",
            label: "2. Estado (UF)",
            value: filterStateId,
            onChange: setFilterStateId,
            options: [{ value: "ALL", label: "Todos os Estados (UFs)" }, ...visibleStates.map((s) => ({ value: s.id, label: `${s.uf} — ${s.name}` }))],
          },
        ]}
        onClearFilters={() => { setSearch(""); setFilterCountryId(defaultCountryId); setFilterStateId("ALL"); }}
        columns={[
          {
            key: "ibge",
            header: "Código IBGE / UF",
            render: (m) => (
              <div>
                <strong style={{ fontFamily: "monospace", color: "#8ab4f8", fontSize: "13px" }}>{m.ibgeCode}</strong>
                <div style={{ fontSize: "11px", color: "#9aa0a6" }}>Estado: {m.uf}</div>
              </div>
            ),
          },
          {
            key: "name",
            header: "Município & Lei do Plano Diretor",
            render: (m) => (
              <div>
                <strong style={{ color: "#e5e2e1" }}>{m.name} / {m.uf}</strong>
                <div style={{ fontSize: "11px", color: "#9aa0a6" }}>{m.masterPlanLawRef}</div>
              </div>
            ),
          },
          {
            key: "populacaoTotal",
            header: "População Total",
            align: "right",
            render: (m) => (
              <span style={{ fontFamily: "monospace", fontWeight: 600 }}>
                {(m.populacaoTotal ?? 0).toLocaleString("pt-BR")}
              </span>
            ),
          },
          {
            key: "electorate",
            header: "Eleitorado TSE",
            align: "right",
            render: (m) => <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{m.electorateTotal.toLocaleString("pt-BR")}</span>,
          },
          {
            key: "regionsCount",
            header: "Regiões Vinculadas",
            align: "center",
            render: (m) => (
              <span style={{ fontFamily: "monospace", color: "#81c995", fontWeight: 700 }}>
                {regions.filter((r) => r.municipalityId === m.id).length} regiões
              </span>
            ),
          },
        ]}
        data={filtered}
        keyExtractor={(m) => m.id}
        renderRowActions={(m) => (
          <>
            <button
              type="button"
              data-testid={`btn-edit-municipality-${m.id}`}
              onClick={() => { setEditing(m); setDrawerOpen(true); }}
              style={NOCTURNE_BUTTON_STYLES.edit}
            >
              ✏️ Editar
            </button>
            <button
              type="button"
              data-testid={`btn-delete-municipality-${m.id}`}
              onClick={() => { deleteMunicipality(m.id); setToast(`Município ${m.name}/${m.uf} excluído.`); }}
              style={{ ...NOCTURNE_BUTTON_STYLES.danger, padding: "5px 10px", fontSize: "11px" }}
            >
              🗑️ Excluir
            </button>
          </>
        )}
      />

      <MunicipalityDrawerForm
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editing={editing}
        countries={countries}
        states={states}
        defaultCountryId={filterCountryId !== "ALL" ? filterCountryId : defaultCountryId}
        defaultStateId={filterStateId}
        onSave={(data, editId) => {
          saveMunicipality(data, editId);
          setToast(
            editId
              ? `Município ${data.name}/${data.uf} atualizado.`
              : `Município ${data.name}/${data.uf} vinculado ao estado.`
          );
        }}
      />
    </div>
  );
}
