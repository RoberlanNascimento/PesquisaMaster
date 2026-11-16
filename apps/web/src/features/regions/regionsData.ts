export {
  INITIAL_COUNTRIES,
  INITIAL_STATES,
  INITIAL_MUNICIPALITIES,
  type CountryRecord,
  type StateRecord,
  type MunicipalityRecord,
} from "./regionsHierarchyData";

export type UrbanZoneType =
  | "ZONA_CENTRAL"
  | "ZONA_NORTE"
  | "ZONA_SUL"
  | "ZONA_LESTE"
  | "ZONA_OESTE"
  | "ZONA_EXPANSAO_URBANA"
  | "ZONA_RURAL";

export interface NeighborhoodItem {
  readonly id: string;
  readonly id_bairro?: number;
  readonly code: string;
  readonly name: string;
  readonly ibgeCensusSectorPrefix: string;
  readonly predominantIncomeBracket: string;
  readonly estimatedVoters: number;
  readonly electoralWeightPct: string;
}

export interface MunicipalRegionRecord {
  readonly id: string;
  readonly id_regiao_zona?: number;
  readonly countryId: string;
  readonly stateId: string;
  readonly municipalityId: string;
  readonly code: string;
  readonly name: string;
  readonly cityName: string;
  readonly uf: string;
  readonly masterPlanZone: UrbanZoneType;
  readonly masterPlanLawRef: string;
  readonly electorateTotal: number;
  readonly electorateWeightPct: string;
  readonly censusSectorsCount: number;
  readonly isActive: boolean;
  readonly neighborhoods: readonly NeighborhoodItem[];
}

export interface MunicipalRegionFormData {
  readonly countryId: string;
  readonly stateId: string;
  readonly municipalityId: string;
  readonly code: string;
  readonly name: string;
  readonly cityName: string;
  readonly uf: string;
  readonly masterPlanZone: UrbanZoneType;
  readonly masterPlanLawRef: string;
  readonly electorateTotal: number;
  readonly electorateWeightPct: string;
  readonly censusSectorsCount: number;
  readonly id_regiao_zona?: number;
}

export const INITIAL_MUNICIPAL_REGIONS: readonly MunicipalRegionRecord[] = [
  {
    id: "reg-001",
    countryId: "country-br",
    stateId: "state-sp",
    municipalityId: "mun-sp",
    code: "REG-SP-CENTRO",
    name: "Macrozona de Estruturação Metropolitana — Centro Histórico",
    cityName: "São Paulo",
    uf: "SP",
    masterPlanZone: "ZONA_CENTRAL",
    masterPlanLawRef: "Lei Municipal nº 16.050/2014 (PDE-SP)",
    electorateTotal: 790400,
    electorateWeightPct: "8.9000",
    censusSectorsCount: 185,
    isActive: true,
    neighborhoods: [
      {
        id: "nb-001",
        code: "BAIRRO-BELA-VISTA",
        name: "Bela Vista / Bixiga",
        ibgeCensusSectorPrefix: "35503080500",
        predominantIncomeBracket: "3 a 5 Salários Mínimos",
        estimatedVoters: 64200,
        electoralWeightPct: "0.7200",
      },
      {
        id: "nb-002",
        code: "BAIRRO-REPUBLICA",
        name: "República / Santa Ifigênia",
        ibgeCensusSectorPrefix: "35503086600",
        predominantIncomeBracket: "2 a 5 Salários Mínimos",
        estimatedVoters: 58900,
        electoralWeightPct: "0.6600",
      },
    ],
  },
  {
    id: "reg-002",
    countryId: "country-br",
    stateId: "state-sp",
    municipalityId: "mun-sp",
    code: "REG-SP-SUL",
    name: "Macrozona Sul — Santo Amaro, Campo Limpo & Capela do Socorro",
    cityName: "São Paulo",
    uf: "SP",
    masterPlanZone: "ZONA_SUL",
    masterPlanLawRef: "Lei Municipal nº 16.050/2014 (PDE-SP)",
    electorateTotal: 1845200,
    electorateWeightPct: "21.4500",
    censusSectorsCount: 412,
    isActive: true,
    neighborhoods: [
      {
        id: "nb-003",
        code: "BAIRRO-SANTO-AMARO",
        name: "Santo Amaro / Chácara Santo Antônio",
        ibgeCensusSectorPrefix: "35503087100",
        predominantIncomeBracket: "Acima de 5 Salários Mínimos",
        estimatedVoters: 112400,
        electoralWeightPct: "1.2600",
      },
      {
        id: "nb-004",
        code: "BAIRRO-GRAJAU",
        name: "Grajaú / Cidade Dutra",
        ibgeCensusSectorPrefix: "35503083000",
        predominantIncomeBracket: "Até 2 Salários Mínimos",
        estimatedVoters: 284500,
        electoralWeightPct: "3.2000",
      },
    ],
  },
  {
    id: "reg-003",
    countryId: "country-br",
    stateId: "state-sp",
    municipalityId: "mun-sp",
    code: "REG-SP-LESTE",
    name: "Macrozona Leste — Itaquera, Penha & São Mateus",
    cityName: "São Paulo",
    uf: "SP",
    masterPlanZone: "ZONA_LESTE",
    masterPlanLawRef: "Lei Municipal nº 16.050/2014 (PDE-SP)",
    electorateTotal: 2190800,
    electorateWeightPct: "25.1000",
    censusSectorsCount: 510,
    isActive: true,
    neighborhoods: [
      {
        id: "nb-005",
        code: "BAIRRO-ITAQUERA",
        name: "Itaquera / Parque do Carmo",
        ibgeCensusSectorPrefix: "35503083700",
        predominantIncomeBracket: "2 a 3 Salários Mínimos",
        estimatedVoters: 176300,
        electoralWeightPct: "1.9800",
      },
    ],
  },
  {
    id: "reg-004",
    countryId: "country-br",
    stateId: "state-sp",
    municipalityId: "mun-campinas",
    code: "REG-CAMP-NORTE",
    name: "Macrozona de Estruturação Urbana Norte — Barão Geraldo",
    cityName: "Campinas",
    uf: "SP",
    masterPlanZone: "ZONA_EXPANSAO_URBANA",
    masterPlanLawRef: "Lei Complementar nº 189/2018 (Plano Diretor Campinas)",
    electorateTotal: 194500,
    electorateWeightPct: "18.2000",
    censusSectorsCount: 68,
    isActive: true,
    neighborhoods: [
      {
        id: "nb-006",
        code: "BAIRRO-BARAO-GERALDO",
        name: "Barão Geraldo / Cidade Universitária",
        ibgeCensusSectorPrefix: "35095020500",
        predominantIncomeBracket: "Acima de 5 Salários Mínimos",
        estimatedVoters: 48200,
        electoralWeightPct: "4.5100",
      },
    ],
  },
];
