import React, { useState, useMemo, useEffect, useCallback } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { NOCTURNE_BUTTON_STYLES } from "../../lib/designTokens";
import type { MunicipalityRecord, StateRecord } from "./regionsData";
import { useTerritorialStore } from "./regionsStore";
import { RegionsFeedbackToast } from "./RegionsCrudShared";
import { MunicipalityDrawerForm } from "./MunicipalityDrawerForm";

interface DbMunicipalityRecord extends MunicipalityRecord {
  readonly idMunicipioDb?: number;
  readonly codigoTse?: string;
  readonly regioesCount: number;
}

export function MunicipalitiesCrudScreen(): React.JSX.Element {
  const countries = useTerritorialStore((s) => s.countries);
  const defaultCountryId = useTerritorialStore((s) => s.defaultCountryId);
  const states = useTerritorialStore((s) => s.states);
  const setStates = useTerritorialStore((s) => s.setStates);
  const setMunicipalities = useTerritorialStore((s) => s.setMunicipalities);
  const saveMunicipality = useTerritorialStore((s) => s.saveMunicipality);
  const deleteMunicipality = useTerritorialStore((s) => s.deleteMunicipality);

  const [dbMunicipalities, setDbMunicipalities] = useState<DbMunicipalityRecord[]>([]);

  const loadFromDb = useCallback(async (): Promise<void> => {
    const [estData, munData] = await Promise.all([
      fetch("http://127.0.0.1:8000/api/v1/estados", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("http://127.0.0.1:8000/api/v1/amostragem/municipios?somente_com_eleitorado=true", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);

    if (Array.isArray(estData) && estData.length > 0) {
      const loadedStates: StateRecord[] = estData.map((row: Record<string, unknown>) => ({
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

    if (Array.isArray(munData)) {
      const loadedMuns: DbMunicipalityRecord[] = (munData as Array<Record<string, unknown>>)
        .filter((row) => Number(row.eleitorado_total ?? 0) > 0)
        .map((row) => {
          const uf = String(row.uf ?? "").toUpperCase();
          return {
            id: `mun-${row.id_municipio}`,
            idMunicipioDb: Number(row.id_municipio),
            stateId: `state-${uf.toLowerCase()}`,
            uf,
            name: String(row.nome ?? ""),
            ibgeCode: String(row.codigo_ibge ?? ""),
            codigoTse: row.codigo_tse ? String(row.codigo_tse) : "",
            populacaoTotal: Number(row.populacao_total ?? 0),
            electorateTotal: Number(row.eleitorado_total ?? 0),
            masterPlanLawRef: row.codigo_tse ? `Código TSE: ${row.codigo_tse}` : "Base Oficial IBGE / TSE",
            regioesCount: Number(row.regioes_count ?? 0),
          };
        });
      setDbMunicipalities(loadedMuns);
      setMunicipalities(loadedMuns);
    }
  }, [setStates, setMunicipalities]);

  useEffect(() => {
    void loadFromDb();
  }, [loadFromDb]);

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

  const ufTabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of dbMunicipalities) {
      counts.set(m.uf, (counts.get(m.uf) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([uf, count]) => ({ id: uf, label: `Estado ${uf}`, count }));
  }, [dbMunicipalities]);

  const filtered = useMemo(() => {
    const validStateIds = new Set(visibleStates.map((s) => s.id));
    return dbMunicipalities.filter((m) => {
      if (m.electorateTotal <= 0) return false;
      if (filterCountryId !== "ALL" && validStateIds.size > 0 && !validStateIds.has(m.stateId)) return false;
      if (filterStateId !== "ALL" && m.stateId !== filterStateId) return false;
      if (activeTab !== "ALL" && m.uf !== activeTab) return false;
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
  }, [dbMunicipalities, visibleStates, filterCountryId, filterStateId, activeTab, search]);

  const totalRegioesVinculadas = useMemo(
    () => dbMunicipalities.reduce((acc, m) => acc + m.regioesCount, 0),
    [dbMunicipalities]
  );

  return (
    <div data-testid="municipalities-crud-page">
      <RegionsFeedbackToast message={toast} testId="municipalities-feedback-toast" />

      <EnterpriseCrudWorkspace<DbMunicipalityRecord>
        title="Gerenciamento de Municípios e Planos Diretores"
        subtitle="Municípios ativos no banco de dados com eleitorado cadastrado (eleitorado_total > 0)"
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
          { id: "ALL", label: "Todos os Municípios", count: dbMunicipalities.length },
          ...ufTabs,
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={[
          { id: "mk-1", label: "Municípios com Eleitorado", value: dbMunicipalities.length, variant: "default" },
          { id: "mk-2", label: "Regiões Municipais Vinculadas", value: totalRegioesVinculadas, variant: "success" },
          {
            id: "mk-3",
            label: "Eleitorado Municipal Consolidado",
            value: dbMunicipalities.reduce((acc, m) => acc + m.electorateTotal, 0).toLocaleString("pt-BR"),
            variant: "warning",
          },
        ]}
        searchPlaceholder="Buscar por nome do município, UF, código IBGE ou código TSE..."
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
        onClearFilters={() => { setSearch(""); setFilterCountryId(defaultCountryId); setFilterStateId("ALL"); setActiveTab("ALL"); }}
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
            header: "Município & Referência TSE/IBGE",
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
                {m.regioesCount} {m.regioesCount === 1 ? "região" : "regiões"}
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
              onClick={() => {
                deleteMunicipality(m.id);
                setDbMunicipalities((prev) => prev.filter((item) => item.id !== m.id));
                setToast(`Município ${m.name}/${m.uf} excluído.`);
              }}
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
          setDbMunicipalities((prev) => {
            if (editId) {
              return prev.map((item) => (item.id === editId ? { ...item, ...data } : item));
            }
            const created: DbMunicipalityRecord = {
              id: `mun-${Date.now()}`,
              ...data,
              regioesCount: 0,
            };
            return created.electorateTotal > 0 ? [created, ...prev] : prev;
          });
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
