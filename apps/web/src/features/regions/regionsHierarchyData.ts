export interface CountryRecord {
  readonly id: string;
  readonly isoCode: string;
  readonly name: string;
  readonly electoralAuthority: string;
  readonly isDefault?: boolean;
}

export interface StateRecord {
  readonly id: string;
  readonly id_estado?: number;
  readonly countryId: string;
  readonly uf: string;
  readonly name: string;
  readonly ibgeCode: string;
  readonly macroRegion: string;
  readonly populacaoTotal?: number;
  readonly electorateTotal: number;
}

export interface MunicipalityRecord {
  readonly id: string;
  readonly stateId: string;
  readonly ibgeCode: string;
  readonly name: string;
  readonly uf: string;
  readonly masterPlanLawRef: string;
  readonly electorateTotal: number;
}

export const DEFAULT_COUNTRY_BR: CountryRecord = {
  id: "country-br",
  isoCode: "BR",
  name: "Brasil",
  electoralAuthority: "TSE — Tribunal Superior Eleitoral",
  isDefault: true,
};

export const INITIAL_COUNTRIES: readonly CountryRecord[] = [DEFAULT_COUNTRY_BR];

const RAW_STATES_DB: readonly [number, number, string, string, string, number, number][] = [
  [1, 11, "RO", "Rondônia", "Norte", 1581196, 1230987],
  [2, 12, "AC", "Acre", "Norte", 830026, 588433],
  [3, 13, "AM", "Amazonas", "Norte", 3941175, 2647828],
  [4, 14, "RR", "Roraima", "Norte", 636303, 389863],
  [5, 15, "PA", "Pará", "Norte", 8116132, 6082912],
  [6, 16, "AP", "Amapá", "Norte", 733508, 571248],
  [7, 17, "TO", "Tocantins", "Norte", 1511459, 1171342],
  [8, 21, "MA", "Maranhão", "Nordeste", 6775152, 5187809],
  [9, 22, "PI", "Piauí", "Nordeste", 3269200, 2698764],
  [10, 23, "CE", "Ceará", "Nordeste", 8791688, 6934440],
  [11, 24, "RN", "Rio Grande do Norte", "Nordeste", 3302406, 2644248],
  [12, 25, "PB", "Paraíba", "Nordeste", 3974495, 3225312],
  [13, 26, "PE", "Pernambuco", "Nordeste", 9058155, 7152871],
  [14, 27, "AL", "Alagoas", "Nordeste", 3127511, 2415278],
  [15, 28, "SE", "Sergipe", "Nordeste", 2209558, 1729352],
  [16, 29, "BA", "Bahia", "Nordeste", 14136417, 11283507],
  [17, 31, "MG", "Minas Gerais", "Sudeste", 20538718, 16469155],
  [18, 32, "ES", "Espírito Santo", "Sudeste", 3833486, 2978105],
  [19, 33, "RJ", "Rio de Janeiro", "Sudeste", 16054524, 13034929],
  [20, 35, "SP", "São Paulo", "Sudeste", 44420459, 34403844],
  [21, 41, "PR", "Paraná", "Sul", 11443208, 8645524],
  [22, 42, "SC", "Santa Catarina", "Sul", 7609601, 5633505],
  [23, 43, "RS", "Rio Grande do Sul", "Sul", 10880506, 8682546],
  [24, 50, "MS", "Mato Grosso do Sul", "Centro-Oeste", 2756700, 2032417],
  [25, 51, "MT", "Mato Grosso", "Centro-Oeste", 3658813, 2569439],
  [26, 52, "GO", "Goiás", "Centro-Oeste", 7055228, 4870354],
  [27, 53, "DF", "Distrito Federal", "Centro-Oeste", 2817068, 2206196],
];

export const INITIAL_STATES: readonly StateRecord[] = RAW_STATES_DB.map(
  ([id_estado, codigo_ibge, sigla, nome, regiao, pop, eleit]) => ({
    id: `state-${sigla.toLowerCase()}`,
    id_estado,
    countryId: "country-br",
    uf: sigla,
    name: nome,
    ibgeCode: String(codigo_ibge),
    macroRegion: regiao,
    populacaoTotal: pop,
    electorateTotal: eleit,
  })
);

export const INITIAL_MUNICIPALITIES: readonly MunicipalityRecord[] = [
  {
    id: "mun-sp",
    stateId: "state-sp",
    ibgeCode: "3550308",
    name: "São Paulo",
    uf: "SP",
    masterPlanLawRef: "Lei Municipal nº 16.050/2014 (PDE-SP)",
    electorateTotal: 8940000,
  },
  {
    id: "mun-campinas",
    stateId: "state-sp",
    ibgeCode: "3509502",
    name: "Campinas",
    uf: "SP",
    masterPlanLawRef: "Lei Complementar nº 189/2018 (Plano Diretor Campinas)",
    electorateTotal: 890500,
  },
  {
    id: "mun-rj",
    stateId: "state-rj",
    ibgeCode: "3304557",
    name: "Rio de Janeiro",
    uf: "RJ",
    masterPlanLawRef: "Lei Complementar nº 270/2024 (Plano Diretor RJ)",
    electorateTotal: 5009000,
  },
  {
    id: "mun-bh",
    stateId: "state-mg",
    ibgeCode: "3106200",
    name: "Belo Horizonte",
    uf: "MG",
    masterPlanLawRef: "Lei Municipal nº 11.181/2019 (Plano Diretor BH)",
    electorateTotal: 1992000,
  },
  {
    id: "mun-parauapebas",
    stateId: "state-pa",
    ibgeCode: "1505536",
    name: "Parauapebas",
    uf: "PA",
    masterPlanLawRef: "Plano Diretor Municipal",
    electorateTotal: 198420,
  },
];
