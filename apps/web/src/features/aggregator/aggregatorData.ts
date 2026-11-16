export interface InstituteCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly cnpj: string;
  readonly methodologicalWeight: string;
  readonly houseEffectAdjustment: string;
}

export interface ExternalPollEntry {
  readonly id: string;
  readonly instituteName: string;
  readonly tseProtocolNumber: string;
  readonly fieldMedianDate: string;
  readonly sampleSize: number;
  readonly marginOfError: string;
  readonly methodologicalWeight: string;
  readonly houseEffectAdjustment: string;
  readonly sqrtSampleWeight: string;
  readonly temporalDecayWeight: string;
  readonly candAPct: string;
  readonly candBPct: string;
  readonly candCPct: string;
}

export interface HistoricalTrendPoint {
  readonly dateLabel: string;
  readonly candAAvg: string;
  readonly candBAvg: string;
  readonly candCAvg: string;
}

export interface CandidateAggregateDetail {
  readonly candidateCode: string;
  readonly candidateName: string;
  readonly party: string;
  readonly weightedAveragePct: string;
  readonly confidenceBandLow: string;
  readonly confidenceBandHigh: string;
  readonly houseAdjustedDelta: string;
  readonly color: string;
}

export const INITIAL_INSTITUTES: readonly InstituteCatalogEntry[] = [
  {
    id: "inst-01",
    name: "Instituto DataBrasil Opinião",
    cnpj: "11.222.333/0001-44",
    methodologicalWeight: "1.2000",
    houseEffectAdjustment: "-0.4000",
  },
  {
    id: "inst-02",
    name: "Quaestus Inteligência Eleitoral",
    cnpj: "22.333.444/0001-55",
    methodologicalWeight: "1.1500",
    houseEffectAdjustment: "+0.2500",
  },
  {
    id: "inst-03",
    name: "Atlas Político & Métrica Digital",
    cnpj: "33.444.555/0001-66",
    methodologicalWeight: "1.0500",
    houseEffectAdjustment: "+0.1500",
  },
  {
    id: "inst-04",
    name: "PesquisaMaster Fieldwork (Interno)",
    cnpj: "44.555.666/0001-77",
    methodologicalWeight: "1.3000",
    houseEffectAdjustment: "0.0000",
  },
];

export const INITIAL_EXTERNAL_POLLS: readonly ExternalPollEntry[] = [
  {
    id: "poll-101",
    instituteName: "PesquisaMaster Fieldwork (Interno)",
    tseProtocolNumber: "BR-08421/2026",
    fieldMedianDate: "2026-10-28",
    sampleSize: 2000,
    marginOfError: "2.2000",
    methodologicalWeight: "1.3000",
    houseEffectAdjustment: "0.0000",
    sqrtSampleWeight: "1.0000",
    temporalDecayWeight: "1.0000",
    candAPct: "43.0000",
    candBPct: "36.0000",
    candCPct: "12.0000",
  },
  {
    id: "poll-102",
    instituteName: "Instituto DataBrasil Opinião",
    tseProtocolNumber: "BR-07912/2026",
    fieldMedianDate: "2026-10-24",
    sampleSize: 2500,
    marginOfError: "2.0000",
    methodologicalWeight: "1.2000",
    houseEffectAdjustment: "-0.4000",
    sqrtSampleWeight: "1.1180",
    temporalDecayWeight: "0.8203",
    candAPct: "43.5000",
    candBPct: "35.8000",
    candCPct: "11.7000",
  },
  {
    id: "poll-103",
    instituteName: "Quaestus Inteligência Eleitoral",
    tseProtocolNumber: "BR-07105/2026",
    fieldMedianDate: "2026-10-18",
    sampleSize: 2000,
    marginOfError: "2.2000",
    methodologicalWeight: "1.1500",
    houseEffectAdjustment: "+0.2500",
    sqrtSampleWeight: "1.0000",
    temporalDecayWeight: "0.6095",
    candAPct: "42.1000",
    candBPct: "36.9000",
    candCPct: "12.2000",
  },
  {
    id: "poll-104",
    instituteName: "Atlas Político & Métrica Digital",
    tseProtocolNumber: "BR-06490/2026",
    fieldMedianDate: "2026-10-10",
    sampleSize: 1600,
    marginOfError: "2.5000",
    methodologicalWeight: "1.0500",
    houseEffectAdjustment: "+0.1500",
    sqrtSampleWeight: "0.8944",
    temporalDecayWeight: "0.4101",
    candAPct: "41.8000",
    candBPct: "37.1000",
    candCPct: "12.4000",
  },
];

export const HISTORICAL_TREND_SERIES: readonly HistoricalTrendPoint[] = [
  { dateLabel: "15/Set", candAAvg: "40.2000", candBAvg: "37.8000", candCAvg: "13.1000" },
  { dateLabel: "01/Out", candAAvg: "41.1000", candBAvg: "37.2000", candCAvg: "12.6000" },
  { dateLabel: "15/Out", candAAvg: "42.0000", candBAvg: "36.8000", candCAvg: "12.2000" },
  { dateLabel: "28/Out", candAAvg: "42.8000", candBAvg: "36.4000", candCAvg: "11.9500" },
];

export const AGGREGATED_CANDIDATES_BY_HALFLIFE: Record<
  string,
  readonly CandidateAggregateDetail[]
> = {
  "7.0000": [
    {
      candidateCode: "CAND_A",
      candidateName: "Candidato Alfa",
      party: "PSD",
      weightedAveragePct: "43.1200",
      confidenceBandLow: "41.8200",
      confidenceBandHigh: "44.4200",
      houseAdjustedDelta: "-0.1200",
      color: "#2563eb",
    },
    {
      candidateCode: "CAND_B",
      candidateName: "Candidato Beta",
      party: "PL",
      weightedAveragePct: "36.1500",
      confidenceBandLow: "34.8500",
      confidenceBandHigh: "37.4500",
      houseAdjustedDelta: "+0.1000",
      color: "#16a34a",
    },
    {
      candidateCode: "CAND_C",
      candidateName: "Candidato Gama",
      party: "MDB",
      weightedAveragePct: "11.8800",
      confidenceBandLow: "10.7800",
      confidenceBandHigh: "12.9800",
      houseAdjustedDelta: "+0.0200",
      color: "#d97706",
    },
  ],
  "14.0000": [
    {
      candidateCode: "CAND_A",
      candidateName: "Candidato Alfa",
      party: "PSD",
      weightedAveragePct: "42.8000",
      confidenceBandLow: "41.4500",
      confidenceBandHigh: "44.1500",
      houseAdjustedDelta: "-0.1500",
      color: "#2563eb",
    },
    {
      candidateCode: "CAND_B",
      candidateName: "Candidato Beta",
      party: "PL",
      weightedAveragePct: "36.4000",
      confidenceBandLow: "35.0500",
      confidenceBandHigh: "37.7500",
      houseAdjustedDelta: "+0.1200",
      color: "#16a34a",
    },
    {
      candidateCode: "CAND_C",
      candidateName: "Candidato Gama",
      party: "MDB",
      weightedAveragePct: "11.9500",
      confidenceBandLow: "10.8000",
      confidenceBandHigh: "13.1000",
      houseAdjustedDelta: "+0.0300",
      color: "#d97706",
    },
  ],
  "30.0000": [
    {
      candidateCode: "CAND_A",
      candidateName: "Candidato Alfa",
      party: "PSD",
      weightedAveragePct: "42.4500",
      confidenceBandLow: "41.1000",
      confidenceBandHigh: "43.8000",
      houseAdjustedDelta: "-0.1800",
      color: "#2563eb",
    },
    {
      candidateCode: "CAND_B",
      candidateName: "Candidato Beta",
      party: "PL",
      weightedAveragePct: "36.6800",
      confidenceBandLow: "35.3300",
      confidenceBandHigh: "38.0300",
      houseAdjustedDelta: "+0.1400",
      color: "#16a34a",
    },
    {
      candidateCode: "CAND_C",
      candidateName: "Candidato Gama",
      party: "MDB",
      weightedAveragePct: "12.0500",
      confidenceBandLow: "10.9000",
      confidenceBandHigh: "13.2000",
      houseAdjustedDelta: "+0.0400",
      color: "#d97706",
    },
  ],
};

