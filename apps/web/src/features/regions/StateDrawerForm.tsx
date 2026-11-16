import React from "react";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { NOCTURNE_BUTTON_STYLES } from "../../lib/designTokens";
import type { CountryRecord, StateRecord } from "./regionsData";
import { CRUD_INPUT_STYLE, CRUD_LABEL_STYLE } from "./RegionsCrudShared";

export interface StateDrawerFormProps {
  readonly isOpen: boolean;
  readonly editing: StateRecord | null;
  readonly countries: readonly CountryRecord[];
  readonly countryId: string;
  readonly uf: string;
  readonly name: string;
  readonly ibgeCode: string;
  readonly macroRegion: string;
  readonly populacaoTotal: number;
  readonly electorateTotal: number;
  readonly onCountryChange: (val: string) => void;
  readonly onUfChange: (val: string) => void;
  readonly onNameChange: (val: string) => void;
  readonly onIbgeCodeChange: (val: string) => void;
  readonly onMacroRegionChange: (val: string) => void;
  readonly onPopulacaoTotalChange: (val: number) => void;
  readonly onElectorateTotalChange: (val: number) => void;
  readonly onClose: () => void;
  readonly onSubmit: (e: React.FormEvent) => void;
}

export function StateDrawerForm(props: StateDrawerFormProps): React.JSX.Element {
  const {
    isOpen, editing, countries, countryId, uf, name, ibgeCode, macroRegion,
    populacaoTotal, electorateTotal, onCountryChange, onUfChange, onNameChange,
    onIbgeCodeChange, onMacroRegionChange, onPopulacaoTotalChange, onElectorateTotalChange,
    onClose, onSubmit,
  } = props;

  const handleSaveClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    const form = document.getElementById("state-crud-form") as HTMLFormElement | null;
    if (form) {
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
    }
    onSubmit(e);
  };

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      title={editing ? `Editar Estado (${editing.uf}) — Tabela 'estados'` : "Novo Estado — Tabela 'estados' (PostgreSQL)"}
      subtitle="Campos mapeados: sigla, codigo_ibge, nome, regiao, populacao_total e eleitorado_total"
      onClose={onClose}
      footerActions={
        <>
          <button type="button" onClick={onClose} style={NOCTURNE_BUTTON_STYLES.ghost}>Cancelar</button>
          <button
            type="submit"
            form="state-crud-form"
            data-testid="btn-save-state"
            onClick={handleSaveClick}
            style={NOCTURNE_BUTTON_STYLES.primary}
          >
            💾 Salvar Estado
          </button>
        </>
      }
    >
      <form id="state-crud-form" onSubmit={onSubmit} style={{ display: "grid", gap: "14px" }}>
        <div>
          <label style={CRUD_LABEL_STYLE}>País de Origem</label>
          <select data-testid="select-state-country" value={countryId} onChange={(e) => onCountryChange(e.target.value)} style={CRUD_INPUT_STYLE}>
            {countries.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.isoCode})</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={CRUD_LABEL_STYLE}>Sigla UF (sigla)</label>
            <input data-testid="input-state-uf" maxLength={2} value={uf} onChange={(e) => onUfChange(e.target.value)} placeholder="Ex: PR" style={CRUD_INPUT_STYLE} required />
          </div>
          <div>
            <label style={CRUD_LABEL_STYLE}>Código IBGE (codigo_ibge)</label>
            <input data-testid="input-state-ibge" value={ibgeCode} onChange={(e) => onIbgeCodeChange(e.target.value)} placeholder="Ex: 41" style={CRUD_INPUT_STYLE} required />
          </div>
        </div>
        <div>
          <label style={CRUD_LABEL_STYLE}>Nome do Estado (nome)</label>
          <input data-testid="input-state-name" value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="Ex: Paraná" style={CRUD_INPUT_STYLE} required />
        </div>
        <div>
          <label style={CRUD_LABEL_STYLE}>Macrorregião Geográfica (regiao)</label>
          <select value={macroRegion} onChange={(e) => onMacroRegionChange(e.target.value)} style={CRUD_INPUT_STYLE}>
            <option value="Norte">Norte</option>
            <option value="Nordeste">Nordeste</option>
            <option value="Centro-Oeste">Centro-Oeste</option>
            <option value="Sudeste">Sudeste</option>
            <option value="Sul">Sul</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={CRUD_LABEL_STYLE}>População Censitária (populacao_total)</label>
            <input type="number" value={populacaoTotal} onChange={(e) => onPopulacaoTotalChange(Number(e.target.value))} style={CRUD_INPUT_STYLE} />
          </div>
          <div>
            <label style={CRUD_LABEL_STYLE}>Eleitorado TSE (eleitorado_total)</label>
            <input type="number" value={electorateTotal} onChange={(e) => onElectorateTotalChange(Number(e.target.value))} style={CRUD_INPUT_STYLE} required />
          </div>
        </div>
      </form>
    </SlideOverDrawer>
  );
}

