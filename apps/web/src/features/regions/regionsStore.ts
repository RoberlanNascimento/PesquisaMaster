import { create } from "zustand";
import {
  INITIAL_COUNTRIES,
  INITIAL_STATES,
  INITIAL_MUNICIPALITIES,
  INITIAL_MUNICIPAL_REGIONS,
  type CountryRecord,
  type StateRecord,
  type MunicipalityRecord,
  type MunicipalRegionRecord,
  type MunicipalRegionFormData,
  type NeighborhoodItem,
} from "./regionsData";

export interface FlattenedNeighborhoodRecord extends NeighborhoodItem {
  readonly regionId: string;
  readonly regionCode: string;
  readonly regionName: string;
  readonly municipalityId: string;
  readonly cityName: string;
  readonly stateId: string;
  readonly uf: string;
  readonly countryId: string;
}

interface TerritorialStoreState {
  readonly countries: readonly CountryRecord[];
  readonly defaultCountryId: string;
  readonly states: readonly StateRecord[];
  readonly municipalities: readonly MunicipalityRecord[];
  readonly regions: readonly MunicipalRegionRecord[];
  readonly selectedRegionFilterId: string;
  readonly setSelectedRegionFilterId: (id: string) => void;
  readonly saveCountry: (data: Omit<CountryRecord, "id">, editId?: string) => void;
  readonly setDefaultCountry: (id: string) => void;
  readonly deleteCountry: (id: string) => void;
  readonly setStates: (states: readonly StateRecord[]) => void;
  readonly saveState: (data: Omit<StateRecord, "id">, editId?: string) => void;
  readonly deleteState: (id: string) => void;
  readonly saveMunicipality: (data: Omit<MunicipalityRecord, "id">, editId?: string) => void;
  readonly deleteMunicipality: (id: string) => void;
  readonly setRegions: (regions: readonly MunicipalRegionRecord[]) => void;
  readonly saveRegion: (data: MunicipalRegionFormData, editId?: string) => void;
  readonly deleteRegion: (id: string) => void;
  readonly saveNeighborhood: (
    regionId: string,
    data: Omit<NeighborhoodItem, "id">,
    editId?: string
  ) => void;
  readonly deleteNeighborhood: (regionId: string, neighborhoodId: string) => void;
}

export const useTerritorialStore = create<TerritorialStoreState>((set) => ({
  countries: INITIAL_COUNTRIES,
  defaultCountryId: "country-br",
  states: INITIAL_STATES,
  municipalities: INITIAL_MUNICIPALITIES,
  regions: INITIAL_MUNICIPAL_REGIONS,
  selectedRegionFilterId: "ALL",

  setSelectedRegionFilterId: (id) => set({ selectedRegionFilterId: id }),

  saveCountry: (data, editId) =>
    set((state) => {
      if (editId) {
        return {
          countries: state.countries.map((c) => (c.id === editId ? { ...c, ...data } : c)),
        };
      }
      const next: CountryRecord = { id: `country-${Date.now()}`, ...data };
      return { countries: [...state.countries, next] };
    }),

  setDefaultCountry: (id) =>
    set((state) => ({
      defaultCountryId: id,
      countries: state.countries.map((c) => ({ ...c, isDefault: c.id === id })),
    })),

  deleteCountry: (id) =>
    set((state) => ({
      countries: state.countries.filter((c) => c.id !== id),
    })),

  setStates: (states) => set({ states }),

  saveState: (data, editId) =>
    set((state) => {
      if (editId) {
        const exists = state.states.some((s) => s.id === editId);
        if (exists) {
          return {
            states: state.states.map((s) => (s.id === editId ? { ...s, ...data } : s)),
          };
        }
        return { states: [...state.states, { id: editId, ...data }] };
      }
      const next: StateRecord = { id: `state-${Date.now()}`, ...data };
      return { states: [...state.states, next] };
    }),

  deleteState: (id) =>
    set((state) => ({
      states: state.states.filter((s) => s.id !== id),
      municipalities: state.municipalities.filter((m) => m.stateId !== id),
      regions: state.regions.filter((r) => r.stateId !== id),
    })),

  saveMunicipality: (data, editId) =>
    set((state) => {
      if (editId) {
        return {
          municipalities: state.municipalities.map((m) =>
            m.id === editId ? { ...m, ...data } : m
          ),
          regions: state.regions.map((r) =>
            r.municipalityId === editId ? { ...r, cityName: data.name, uf: data.uf } : r
          ),
        };
      }
      const next: MunicipalityRecord = { id: `mun-${Date.now()}`, ...data };
      return { municipalities: [...state.municipalities, next] };
    }),

  deleteMunicipality: (id) =>
    set((state) => ({
      municipalities: state.municipalities.filter((m) => m.id !== id),
      regions: state.regions.filter((r) => r.municipalityId !== id),
    })),

  setRegions: (regions) => set({ regions }),

  saveRegion: (data, editId) =>
    set((state) => {
      if (editId) {
        return {
          regions: state.regions.map((r) => (r.id === editId ? { ...r, ...data } : r)),
        };
      }
      const next: MunicipalRegionRecord = {
        id: `reg-00${state.regions.length + 1}`,
        ...data,
        isActive: true,
        neighborhoods: [],
      };
      return { regions: [next, ...state.regions] };
    }),

  deleteRegion: (id) =>
    set((state) => ({
      regions: state.regions.filter((r) => r.id !== id),
    })),

  saveNeighborhood: (regionId, nbData, editId) =>
    set((state) => ({
      regions: state.regions.map((r) => {
        if (r.id !== regionId) return r;
        const exists = editId ? r.neighborhoods.some((nb) => nb.id === editId) : false;
        const neighborhoods = editId
          ? exists
            ? r.neighborhoods.map((nb) => (nb.id === editId ? { ...nb, ...nbData } : nb))
            : [...r.neighborhoods, { ...nbData, id: editId }]
          : [...r.neighborhoods, { ...nbData, id: `nb-${Date.now()}` }];
        return { ...r, neighborhoods };
      }),
    })),

  deleteNeighborhood: (regionId, neighborhoodId) =>
    set((state) => ({
      regions: state.regions.map((r) =>
        r.id === regionId
          ? { ...r, neighborhoods: r.neighborhoods.filter((nb) => nb.id !== neighborhoodId) }
          : r
      ),
    })),
}));

