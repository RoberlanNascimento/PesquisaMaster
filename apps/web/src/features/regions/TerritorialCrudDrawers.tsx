import React, { useState, useEffect } from "react";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { NOCTURNE_BUTTON_STYLES } from "../../lib/designTokens";
import type {
  CountryRecord,
  StateRecord,
  MunicipalityRecord,
  MunicipalRegionRecord,
  NeighborhoodItem,
} from "./regionsData";
import type { FlattenedNeighborhoodRecord } from "./regionsStore";
import { CRUD_INPUT_STYLE, CRUD_LABEL_STYLE } from "./RegionsCrudShared";

export function NeighborhoodDrawerForm({
  isOpen,
  onClose,
  editing,
  countries,
  states,
  municipalities,
  regions,
  defaultCountryId,
  defaultRegionId,
  onSave,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly editing: FlattenedNeighborhoodRecord | null;
  readonly countries: readonly CountryRecord[];
  readonly states: readonly StateRecord[];
  readonly municipalities: readonly MunicipalityRecord[];
  readonly regions: readonly MunicipalRegionRecord[];
  readonly defaultCountryId: string;
  readonly defaultRegionId: string;
  readonly onSave: (regionId: string, data: Omit<NeighborhoodItem, "id">, editId?: string) => void;
}): React.JSX.Element {
  const [countryId, setCountryId] = useState(defaultCountryId);
  const [stateId, setStateId] = useState("state-sp");
  const [municipalityId, setMunicipalityId] = useState("mun-sp");
  const [regionId, setRegionId] = useState("reg-001");
  const [code, setCode] = useState("BAIRRO-MOEMA");
  const [name, setName] = useState("Moema / Vila Mariana");
  const [sectorPrefix, setSectorPrefix] = useState("35503089900");
  const [incomeBracket, setIncomeBracket] = useState("Acima de 5 Salários Mínimos");
  const [estimatedVoters, setEstimatedVoters] = useState(54200);
  const [weightPct, setWeightPct] = useState("0.6100");

  useEffect(() => {
    if (editing) {
      setCountryId(editing.countryId);
      setStateId(editing.stateId);
      setMunicipalityId(editing.municipalityId);
      setRegionId(editing.regionId);
      setCode(editing.code);
      setName(editing.name);
      setSectorPrefix(editing.ibgeCensusSectorPrefix);
      setIncomeBracket(editing.predominantIncomeBracket);
      setEstimatedVoters(editing.estimatedVoters);
      setWeightPct(editing.electoralWeightPct);
    } else {
      const targetReg = regions.find((r) => r.id === defaultRegionId) ?? regions[0];
      setCountryId(targetReg?.countryId ?? defaultCountryId);
      setStateId(targetReg?.stateId ?? "state-sp");
      setMunicipalityId(targetReg?.municipalityId ?? "mun-sp");
      setRegionId(targetReg?.id ?? "reg-001");
      setCode("BAIRRO-MOEMA");
      setName("Moema / Vila Mariana");
      setSectorPrefix("35503089900");
      setIncomeBracket("Acima de 5 Salários Mínimos");
      setEstimatedVoters(54200);
      setWeightPct("0.6100");
    }
  }, [editing, isOpen, regions, defaultCountryId, defaultRegionId]);

  const drawerStates = states.filter((s) => s.countryId === countryId);
  const drawerMunicipalities = municipalities.filter((m) => m.stateId === stateId);
  const drawerRegions = regions.filter((r) => r.municipalityId === municipalityId);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    const effectiveRegionId = drawerRegions.some((r) => r.id === regionId)
      ? regionId
      : (drawerRegions[0]?.id ?? regions[0]?.id ?? "reg-001");
    onSave(
      effectiveRegionId,
      {
        id_bairro: editing?.id_bairro,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        ibgeCensusSectorPrefix: sectorPrefix.trim(),
        predominantIncomeBracket: incomeBracket,
        estimatedVoters,
        electoralWeightPct: weightPct,
      },
      editing?.id
    );
    onClose();
  };

  const handleSaveClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    const form = document.getElementById("neighborhood-crud-form") as HTMLFormElement | null;
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }
    handleSubmit(e);
  };

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      title={editing ? `Editar Bairro (${editing.code})` : "Novo Bairro vinculado ao Município e Região"}
      subtitle="Selecione: País -> Estado (UF) -> Município -> Bairro"
      onClose={onClose}
      footerActions={
        <>
          <button type="button" onClick={onClose} style={NOCTURNE_BUTTON_STYLES.ghost}>Cancelar</button>
          <button
            type="submit"
            form="neighborhood-crud-form"
            data-testid="btn-save-neighborhood"
            onClick={handleSaveClick}
            style={NOCTURNE_BUTTON_STYLES.primary}
          >
            💾 Salvar Bairro
          </button>
        </>
      }
    >
      <form id="neighborhood-crud-form" onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={CRUD_LABEL_STYLE}>País</label>
            <select
              data-testid="select-neighborhood-country"
              value={countryId}
              onChange={(e) => {
                const nextC = e.target.value;
                setCountryId(nextC);
                const st = states.find((s) => s.countryId === nextC);
                if (st) {
                  setStateId(st.id);
                  const mun = municipalities.find((m) => m.stateId === st.id);
                  if (mun) {
                    setMunicipalityId(mun.id);
                    const reg = regions.find((r) => r.municipalityId === mun.id);
                    if (reg) setRegionId(reg.id);
                  }
                }
              }}
              style={CRUD_INPUT_STYLE}
            >
              {countries.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.isoCode})</option>)}
            </select>
          </div>
          <div>
            <label style={CRUD_LABEL_STYLE}>Estado / UF</label>
            <select
              data-testid="select-neighborhood-state"
              value={stateId}
              onChange={(e) => {
                const nextSt = e.target.value;
                setStateId(nextSt);
                const mun = municipalities.find((m) => m.stateId === nextSt);
                if (mun) {
                  setMunicipalityId(mun.id);
                  const reg = regions.find((r) => r.municipalityId === mun.id);
                  if (reg) setRegionId(reg.id);
                }
              }}
              style={CRUD_INPUT_STYLE}
            >
              {drawerStates.map((s) => <option key={s.id} value={s.id}>{s.uf} — {s.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={CRUD_LABEL_STYLE}>Município</label>
            <select
              data-testid="select-neighborhood-municipality"
              value={municipalityId}
              onChange={(e) => {
                const nextMun = e.target.value;
                setMunicipalityId(nextMun);
                const reg = regions.find((r) => r.municipalityId === nextMun);
                if (reg) setRegionId(reg.id);
              }}
              style={CRUD_INPUT_STYLE}
            >
              {drawerMunicipalities.map((m) => <option key={m.id} value={m.id}>{m.name} / {m.uf}</option>)}
            </select>
          </div>
          <div>
            <label style={CRUD_LABEL_STYLE}>Zonas</label>
            <select data-testid="select-neighborhood-region" value={regionId} onChange={(e) => setRegionId(e.target.value)} style={CRUD_INPUT_STYLE}>
              {drawerRegions.map((r) => <option key={r.id} value={r.id}>{r.code} — {r.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "10px" }}>
          <div>
            <label style={CRUD_LABEL_STYLE}>Código do Bairro</label>
            <input data-testid="input-neighborhood-code" value={code} onChange={(e) => setCode(e.target.value)} style={CRUD_INPUT_STYLE} required />
          </div>
          <div>
            <label style={CRUD_LABEL_STYLE}>Nome do Bairro / Distrito</label>
            <input data-testid="input-neighborhood-name" value={name} onChange={(e) => setName(e.target.value)} style={CRUD_INPUT_STYLE} required />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          <div>
            <label style={CRUD_LABEL_STYLE}>Prefixo IBGE</label>
            <input value={sectorPrefix} onChange={(e) => setSectorPrefix(e.target.value)} style={CRUD_INPUT_STYLE} required />
          </div>
          <div>
            <label style={CRUD_LABEL_STYLE}>Eleitores</label>
            <input type="number" value={estimatedVoters} onChange={(e) => setEstimatedVoters(Number(e.target.value))} style={CRUD_INPUT_STYLE} required />
          </div>
          <div>
            <label style={CRUD_LABEL_STYLE}>Peso (%)</label>
            <input value={weightPct} onChange={(e) => setWeightPct(e.target.value)} style={CRUD_INPUT_STYLE} required />
          </div>
        </div>
      </form>
    </SlideOverDrawer>
  );
}
