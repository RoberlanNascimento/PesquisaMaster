import React, { useState, useMemo } from "react";
import { EnterpriseCrudWorkspace } from "../../components/ui/EnterpriseCrudWorkspace";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { NOCTURNE_BUTTON_STYLES } from "../../lib/designTokens";
import type { CountryRecord } from "./regionsData";
import { useTerritorialStore } from "./regionsStore";
import { CRUD_INPUT_STYLE, CRUD_LABEL_STYLE, RegionsFeedbackToast } from "./RegionsCrudShared";

export function CountriesCrudScreen(): React.JSX.Element {
  const countries = useTerritorialStore((s) => s.countries);
  const defaultCountryId = useTerritorialStore((s) => s.defaultCountryId);
  const states = useTerritorialStore((s) => s.states);
  const saveCountry = useTerritorialStore((s) => s.saveCountry);
  const setDefaultCountry = useTerritorialStore((s) => s.setDefaultCountry);
  const deleteCountry = useTerritorialStore((s) => s.deleteCountry);

  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CountryRecord | null>(null);
  const [isoCode, setIsoCode] = useState("BR");
  const [name, setName] = useState("Brasil");
  const [authority, setAuthority] = useState("TSE — Tribunal Superior Eleitoral");
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return countries.filter((c) => {
      if (activeTab === "DEFAULT" && c.id !== defaultCountryId) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          c.isoCode.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.electoralAuthority.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [countries, activeTab, defaultCountryId, search]);

  const defaultCountry = countries.find((c) => c.id === defaultCountryId) ?? countries[0];

  const openCreate = (): void => {
    setEditing(null);
    setIsoCode("PT");
    setName("Portugal");
    setAuthority("CNE — Comissão Nacional de Eleições");
    setDrawerOpen(true);
  };

  const openEdit = (c: CountryRecord): void => {
    setEditing(c);
    setIsoCode(c.isoCode);
    setName(c.name);
    setAuthority(c.electoralAuthority);
    setDrawerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!isoCode.trim() || !name.trim()) return;
    saveCountry(
      {
        isoCode: isoCode.trim().toUpperCase(),
        name: name.trim(),
        electoralAuthority: authority.trim(),
        isDefault: editing ? editing.isDefault : false,
      },
      editing?.id
    );
    setToast(
      editing
        ? `País ${name} (${isoCode.toUpperCase()}) atualizado.`
        : `País ${name} (${isoCode.toUpperCase()}) cadastrado com sucesso.`
    );
    setDrawerOpen(false);
  };

  return (
    <div data-testid="countries-crud-page">
      <RegionsFeedbackToast message={toast} testId="countries-feedback-toast" />

      <EnterpriseCrudWorkspace<CountryRecord>
        title="Gerenciamento de Países (Jurisdição Eleitoral)"
        subtitle="Cadastro soberano de países para vinculação de Estados (UF) — Brasil configurado por padrão"
        globalActions={
          <button type="button" data-testid="btn-new-country" onClick={openCreate} style={NOCTURNE_BUTTON_STYLES.primary}>
            + Novo País
          </button>
        }
        tabs={[
          { id: "ALL", label: "Todos os Países", count: countries.length },
          { id: "DEFAULT", label: "País Padrão Ativo", count: 1 },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        kpis={[
          {
            id: "ck-1",
            label: "País Padrão Configurado",
            value: `${defaultCountry?.name ?? "Brasil"} (${defaultCountry?.isoCode ?? "BR"})`,
            variant: "success",
          },
          { id: "ck-2", label: "Países Cadastrados", value: countries.length, variant: "default" },
          {
            id: "ck-3",
            label: "Estados Vinculados ao Padrão",
            value: states.filter((s) => s.countryId === defaultCountryId).length,
            variant: "default",
          },
          { id: "ck-4", label: "Autoridade Eleitoral Padrão", value: "TSE (Res. 23.600)", variant: "warning" },
        ]}
        searchPlaceholder="Buscar por código ISO, nome do país ou autoridade eleitoral..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[]}
        onClearFilters={() => setSearch("")}
        columns={[
          {
            key: "iso",
            header: "Código ISO",
            render: (c) => <strong style={{ fontFamily: "monospace", color: "#8ab4f8", fontSize: "13px" }}>{c.isoCode}</strong>,
          },
          {
            key: "name",
            header: "País",
            render: (c) => (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <strong style={{ color: "#e5e2e1" }}>{c.name}</strong>
                {c.id === defaultCountryId && (
                  <span
                    data-testid="default-country-badge"
                    style={{
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      fontSize: "10px",
                      fontWeight: 700,
                      backgroundColor: "#183724",
                      color: "#a8dab5",
                      border: "1px solid #81c995",
                    }}
                  >
                    ⭐ Padrão Configurado
                  </span>
                )}
              </div>
            ),
          },
          { key: "authority", header: "Órgão / Jurisdição Eleitoral", render: (c) => <span style={{ color: "#c3c6d1" }}>{c.electoralAuthority}</span> },
          {
            key: "statesCount",
            header: "Estados Vinculados",
            align: "center",
            render: (c) => (
              <span style={{ fontFamily: "monospace", color: "#81c995", fontWeight: 700 }}>
                {states.filter((s) => s.countryId === c.id).length} UFs
              </span>
            ),
          },
        ]}
        data={filtered}
        keyExtractor={(c) => c.id}
        renderRowActions={(c) => (
          <>
            {c.id !== defaultCountryId && (
              <button
                type="button"
                data-testid={`btn-default-country-${c.id}`}
                onClick={() => { setDefaultCountry(c.id); setToast(`${c.name} definido como País Padrão.`); }}
                style={{ ...NOCTURNE_BUTTON_STYLES.secondary, padding: "5px 10px", fontSize: "11px" }}
              >
                ⭐ Tornar Padrão
              </button>
            )}
            <button type="button" data-testid={`btn-edit-country-${c.id}`} onClick={() => openEdit(c)} style={NOCTURNE_BUTTON_STYLES.edit}>
              ✏️ Editar
            </button>
            <button
              type="button"
              data-testid={`btn-delete-country-${c.id}`}
              onClick={() => { deleteCountry(c.id); setToast(`País ${c.name} excluído.`); }}
              style={{ ...NOCTURNE_BUTTON_STYLES.danger, padding: "5px 10px", fontSize: "11px" }}
            >
              🗑️ Excluir
            </button>
          </>
        )}
      />

      <SlideOverDrawer
        isOpen={drawerOpen}
        title={editing ? `Editar País (${editing.isoCode})` : "Novo País"}
        subtitle="Configure o código ISO e a jurisdição eleitoral nacional"
        onClose={() => setDrawerOpen(false)}
        footerActions={
          <>
            <button type="button" onClick={() => setDrawerOpen(false)} style={NOCTURNE_BUTTON_STYLES.ghost}>Cancelar</button>
            <button type="submit" form="country-crud-form" data-testid="btn-save-country" style={NOCTURNE_BUTTON_STYLES.primary}>💾 Salvar País</button>
          </>
        }
      >
        <form id="country-crud-form" onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
          <div>
            <label style={CRUD_LABEL_STYLE}>Código ISO</label>
            <input data-testid="input-country-iso" value={isoCode} onChange={(e) => setIsoCode(e.target.value)} style={CRUD_INPUT_STYLE} required />
          </div>
          <div>
            <label style={CRUD_LABEL_STYLE}>Nome do País</label>
            <input data-testid="input-country-name" value={name} onChange={(e) => setName(e.target.value)} style={CRUD_INPUT_STYLE} required />
          </div>
          <div>
            <label style={CRUD_LABEL_STYLE}>Autoridade Eleitoral</label>
            <input data-testid="input-country-authority" value={authority} onChange={(e) => setAuthority(e.target.value)} style={CRUD_INPUT_STYLE} required />
          </div>
        </form>
      </SlideOverDrawer>
    </div>
  );
}
