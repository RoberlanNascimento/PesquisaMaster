import React, { useState, useEffect } from "react";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { NOCTURNE_BUTTON_STYLES } from "../../lib/designTokens";
import type {
  CountryRecord,
  StateRecord,
  MunicipalityRecord,
  MunicipalRegionFormData,
  MunicipalRegionRecord,
  UrbanZoneType,
} from "./regionsData";

const FIELD_LABEL_STYLE: React.CSSProperties = { display: "block", fontSize: "12px", fontWeight: 600, color: "#c3c6d1", marginBottom: "6px" };
const INPUT_STYLE: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: "12px", border: "1px solid #353535", backgroundColor: "#202020", color: "#e5e2e1", fontSize: "13px", boxSizing: "border-box" };

export function RegionDrawerForm({
  isOpen,
  onClose,
  initialData,
  countries,
  states,
  municipalities,
  defaultMunicipalityId,
  onSave,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly initialData: MunicipalRegionRecord | null;
  readonly countries: readonly CountryRecord[];
  readonly states: readonly StateRecord[];
  readonly municipalities: readonly MunicipalityRecord[];
  readonly defaultMunicipalityId?: string;
  readonly onSave: (data: MunicipalRegionFormData) => void;
}): React.JSX.Element {
  const [countryId, setCountryId] = useState("país");
  const [stateId, setStateId] = useState("estado");
  const [municipalityId, setMunicipalityId] = useState("municipio");
  const [code, setCode] = useState("Código");
  const [name, setName] = useState("Zonas Municipais");
  const [masterPlanZone, setMasterPlanZone] = useState<UrbanZoneType>("ZONA_NORTE");
  const [masterPlanLawRef, setMasterPlanLawRef] = useState("Plano Diretor");
  const [electorateTotal, setElectorateTotal] = useState(0);
  const [electorateWeightPct, setElectorateWeightPct] = useState("0.000");
  const [censusSectorsCount, setCensusSectorsCount] = useState(310);

  useEffect(() => {
    if (initialData) {
      setCountryId(initialData.countryId);
      setStateId(initialData.stateId);
      setMunicipalityId(initialData.municipalityId);
      setCode(initialData.code);
      setName(initialData.name);
      setMasterPlanZone(initialData.masterPlanZone);
      setMasterPlanLawRef(initialData.masterPlanLawRef);
      setElectorateTotal(initialData.electorateTotal);
      setElectorateWeightPct(initialData.electorateWeightPct);
      setCensusSectorsCount(initialData.censusSectorsCount);
    } else {
      const targetMun =
        municipalities.find((m) => m.id === defaultMunicipalityId) ?? municipalities[0];
      const targetState = states.find((s) => s.id === targetMun?.stateId) ?? states[0];
      setCountryId(targetState?.countryId ?? countries[0]?.id ?? "country-br");
      setStateId(targetState?.id ?? "state-sp");
      setMunicipalityId(targetMun?.id ?? "mun-sp");
      setCode("Código");
      setName("Nome da Zona Municipal");
      setMasterPlanZone("ZONA_NORTE");
      setMasterPlanLawRef(targetMun?.masterPlanLawRef ?? "Lei Municipal");
      setElectorateTotal(0);
      setElectorateWeightPct("0.000");
      setCensusSectorsCount(310);
    }
  }, [initialData, isOpen, countries, states, municipalities, defaultMunicipalityId]);

  const availableStates = states.filter((s) => s.countryId === countryId);
  const availableMunicipalities = municipalities.filter((m) => m.stateId === stateId);
  const selectedMunicipality =
    municipalities.find((m) => m.id === municipalityId) ?? availableMunicipalities[0] ?? municipalities[0];

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    onSave({
      countryId,
      stateId,
      municipalityId: selectedMunicipality?.id ?? municipalityId,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      cityName: selectedMunicipality?.name ?? "São Paulo",
      uf: selectedMunicipality?.uf ?? "SP",
      masterPlanZone,
      masterPlanLawRef: masterPlanLawRef.trim(),
      electorateTotal,
      electorateWeightPct,
      censusSectorsCount,
      id_regiao_zona: initialData?.id_regiao_zona,
    });
    onClose();
  };

  const handleSaveClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    const form = document.getElementById("region-drawer-form") as HTMLFormElement | null;
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }
    handleSubmit(e);
  };

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      title={initialData ? `Editar Zona Municipal (${initialData.code})` : "Zonas Municipais"}
      subtitle="Selecione País -> Estado (UF) -> Município e defina a macrozona do Plano Diretor"
      onClose={onClose}
      footerActions={
        <>
          <button type="button" data-testid="btn-cancel-region" onClick={onClose} style={NOCTURNE_BUTTON_STYLES.ghost}>Cancelar</button>
          <button
            type="submit"
            form="region-drawer-form"
            data-testid="btn-save-region"
            onClick={handleSaveClick}
            style={NOCTURNE_BUTTON_STYLES.primary}
          >
            💾 Salvar Região Municipal
          </button>
        </>
      }
    >
      <form id="region-drawer-form" onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr", gap: "10px" }}>
          <div>
            <label style={FIELD_LABEL_STYLE}>1. País</label>
            <select
              data-testid="select-region-country"
              value={countryId}
              onChange={(e) => {
                const nextCountry = e.target.value;
                setCountryId(nextCountry);
                const firstState = states.find((s) => s.countryId === nextCountry);
                if (firstState) {
                  setStateId(firstState.id);
                  const firstMun = municipalities.find((m) => m.stateId === firstState.id);
                  if (firstMun) {
                    setMunicipalityId(firstMun.id);
                    setMasterPlanLawRef(firstMun.masterPlanLawRef);
                  }
                }
              }}
              style={INPUT_STYLE}
            >
              {countries.map((c) => (
                <option key={c.id} value={c.id}>{c.isoCode} — {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={FIELD_LABEL_STYLE}>2. Estado (UF)</label>
            <select
              data-testid="select-region-state"
              value={stateId}
              onChange={(e) => {
                const nextState = e.target.value;
                setStateId(nextState);
                const firstMun = municipalities.find((m) => m.stateId === nextState);
                if (firstMun) {
                  setMunicipalityId(firstMun.id);
                  setMasterPlanLawRef(firstMun.masterPlanLawRef);
                }
              }}
              style={INPUT_STYLE}
            >
              {availableStates.map((s) => (
                <option key={s.id} value={s.id}>{s.uf} — {s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={FIELD_LABEL_STYLE}>3. Município</label>
            <select
              data-testid="select-region-municipality"
              value={municipalityId}
              onChange={(e) => {
                const nextMunId = e.target.value;
                setMunicipalityId(nextMunId);
                const mun = municipalities.find((m) => m.id === nextMunId);
                if (mun) setMasterPlanLawRef(mun.masterPlanLawRef);
              }}
              style={INPUT_STYLE}
            >
              {availableMunicipalities.map((m) => (
                <option key={m.id} value={m.id}>{m.name} / {m.uf}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={FIELD_LABEL_STYLE}>Nome da Zona</label>
          <input type="text" data-testid="input-region-name" value={name} onChange={(e) => setName(e.target.value)} style={INPUT_STYLE} required />
        </div>

        <div>
          <label style={FIELD_LABEL_STYLE}>Referência Legal do Plano Diretor do Município</label>
          <input type="text" value={masterPlanLawRef} onChange={(e) => setMasterPlanLawRef(e.target.value)} style={INPUT_STYLE} required />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <div>
            <label style={FIELD_LABEL_STYLE}>Eleitorado (TSE)</label>
            <input type="number" value={electorateTotal} onChange={(e) => setElectorateTotal(Number(e.target.value))} style={INPUT_STYLE} required />
          </div>
          <div>
            <label style={FIELD_LABEL_STYLE}>Peso Eleitoral (%)</label>
            <input type="text" value={electorateWeightPct} onChange={(e) => setElectorateWeightPct(e.target.value)} style={INPUT_STYLE} required />
          </div>
          <div>
            <label style={FIELD_LABEL_STYLE}>Setores IBGE</label>
            <input type="number" value={censusSectorsCount} onChange={(e) => setCensusSectorsCount(Number(e.target.value))} style={INPUT_STYLE} required />
          </div>
        </div>
      </form>
    </SlideOverDrawer>
  );
}
