import React, { useState, useEffect } from "react";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { NOCTURNE_BUTTON_STYLES } from "../../lib/designTokens";
import type { CountryRecord, StateRecord, MunicipalityRecord } from "./regionsData";
import { CRUD_INPUT_STYLE, CRUD_LABEL_STYLE } from "./RegionsCrudShared";

export function MunicipalityDrawerForm({
  isOpen,
  onClose,
  editing,
  countries,
  states,
  defaultCountryId,
  defaultStateId,
  onSave,
}: {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly editing: MunicipalityRecord | null;
  readonly countries: readonly CountryRecord[];
  readonly states: readonly StateRecord[];
  readonly defaultCountryId: string;
  readonly defaultStateId: string;
  readonly onSave: (data: Omit<MunicipalityRecord, "id">, editId?: string) => void;
}): React.JSX.Element {
  const [countryId, setCountryId] = useState(defaultCountryId);
  const [stateId, setStateId] = useState("state-sp");
  const [ibgeCode, setIbgeCode] = useState("3548708");
  const [name, setName] = useState("São Bernardo do Campo");
  const [masterPlanLawRef, setMasterPlanLawRef] = useState(
    "Lei Municipal nº 6.184/2011 (Plano Diretor SBC)"
  );
  const [electorateTotal, setElectorateTotal] = useState(618400);

  useEffect(() => {
    if (editing) {
      const st = states.find((s) => s.id === editing.stateId);
      setCountryId(st?.countryId ?? defaultCountryId);
      setStateId(editing.stateId);
      setIbgeCode(editing.ibgeCode);
      setName(editing.name);
      setMasterPlanLawRef(editing.masterPlanLawRef);
      setElectorateTotal(editing.electorateTotal);
    } else {
      const firstSt =
        states.find((s) => s.id === defaultStateId) ??
        states.find((s) => s.countryId === defaultCountryId) ??
        states[0];
      setCountryId(firstSt?.countryId ?? defaultCountryId);
      setStateId(firstSt?.id ?? "state-sp");
      setIbgeCode("3548708");
      setName("São Bernardo do Campo");
      setMasterPlanLawRef("Lei Municipal nº 6.184/2011 (Plano Diretor SBC)");
      setElectorateTotal(618400);
    }
  }, [editing, isOpen, states, defaultCountryId, defaultStateId]);

  const drawerStates = states.filter((s) => s.countryId === countryId);
  const selectedState = states.find((s) => s.id === stateId) ?? drawerStates[0] ?? states[0];

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!name.trim() || !ibgeCode.trim()) return;
    onSave(
      {
        stateId: selectedState?.id ?? stateId,
        ibgeCode: ibgeCode.trim(),
        name: name.trim(),
        uf: selectedState?.uf ?? "SP",
        masterPlanLawRef: masterPlanLawRef.trim(),
        electorateTotal,
      },
      editing?.id
    );
    onClose();
  };

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      title={editing ? `Editar Município (${editing.name}/${editing.uf})` : "Novo Município vinculado ao Estado"}
      subtitle="Selecione País e Estado (UF) no combobox e defina a Lei do Plano Diretor Municipal"
      onClose={onClose}
      footerActions={
        <>
          <button type="button" onClick={onClose} style={NOCTURNE_BUTTON_STYLES.ghost}>Cancelar</button>
          <button type="submit" form="municipality-crud-form" data-testid="btn-save-municipality" style={NOCTURNE_BUTTON_STYLES.primary}>💾 Salvar Município</button>
        </>
      }
    >
      <form id="municipality-crud-form" onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "12px" }}>
          <div>
            <label style={CRUD_LABEL_STYLE}>1. País (Combobox)</label>
            <select
              data-testid="select-municipality-country"
              value={countryId}
              onChange={(e) => {
                const nextC = e.target.value;
                setCountryId(nextC);
                const firstSt = states.find((s) => s.countryId === nextC);
                if (firstSt) setStateId(firstSt.id);
              }}
              style={CRUD_INPUT_STYLE}
            >
              {countries.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.isoCode})</option>)}
            </select>
          </div>
          <div>
            <label style={CRUD_LABEL_STYLE}>2. Estado / UF (Combobox)</label>
            <select data-testid="select-municipality-state" value={stateId} onChange={(e) => setStateId(e.target.value)} style={CRUD_INPUT_STYLE}>
              {drawerStates.map((s) => <option key={s.id} value={s.id}>{s.uf} — {s.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "12px" }}>
          <div>
            <label style={CRUD_LABEL_STYLE}>Código IBGE (7 dígitos)</label>
            <input data-testid="input-municipality-ibge" value={ibgeCode} onChange={(e) => setIbgeCode(e.target.value)} style={CRUD_INPUT_STYLE} required />
          </div>
          <div>
            <label style={CRUD_LABEL_STYLE}>Nome do Município</label>
            <input data-testid="input-municipality-name" value={name} onChange={(e) => setName(e.target.value)} style={CRUD_INPUT_STYLE} required />
          </div>
        </div>
        <div>
          <label style={CRUD_LABEL_STYLE}>Referência Legal do Plano Diretor Municipal</label>
          <input data-testid="input-municipality-law" value={masterPlanLawRef} onChange={(e) => setMasterPlanLawRef(e.target.value)} style={CRUD_INPUT_STYLE} required />
        </div>
        <div>
          <label style={CRUD_LABEL_STYLE}>Eleitorado Homologado TSE</label>
          <input type="number" value={electorateTotal} onChange={(e) => setElectorateTotal(Number(e.target.value))} style={CRUD_INPUT_STYLE} required />
        </div>
      </form>
    </SlideOverDrawer>
  );
}

