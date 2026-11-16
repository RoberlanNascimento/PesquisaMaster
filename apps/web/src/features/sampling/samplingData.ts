export type DemographicDimension = "Sexo" | "Faixa Etária" | "Escolaridade" | "Renda";

export interface QuotaStratumRecord {
  readonly id: string;
  readonly dimension: DemographicDimension;
  readonly stratumName: string;
  readonly officialPercentage: number; // ex: 52.3
  readonly exactFractionalQuota: number; // ex: 1046.0
  readonly hareNiemeyerQuota: number; // alocação inteira
  readonly collected: number;
  readonly validated: number;
  readonly region: string;
}

export const INITIAL_QUOTA_STRATA: readonly QuotaStratumRecord[] = [
  // Sexo
  {
    id: "strata-01",
    dimension: "Sexo",
    stratumName: "Feminino",
    officialPercentage: 52.8,
    exactFractionalQuota: 1056.0,
    hareNiemeyerQuota: 1056,
    collected: 1056,
    validated: 1056,
    region: "Geral",
  },
  {
    id: "strata-02",
    dimension: "Sexo",
    stratumName: "Masculino",
    officialPercentage: 47.2,
    exactFractionalQuota: 944.0,
    hareNiemeyerQuota: 944,
    collected: 944,
    validated: 944,
    region: "Geral",
  },
  // Faixa Etária
  {
    id: "strata-03",
    dimension: "Faixa Etária",
    stratumName: "16 a 24 anos",
    officialPercentage: 14.5,
    exactFractionalQuota: 290.0,
    hareNiemeyerQuota: 290,
    collected: 290,
    validated: 290,
    region: "Geral",
  },
  {
    id: "strata-04",
    dimension: "Faixa Etária",
    stratumName: "25 a 34 anos",
    officialPercentage: 21.2,
    exactFractionalQuota: 424.0,
    hareNiemeyerQuota: 424,
    collected: 424,
    validated: 424,
    region: "Geral",
  },
  {
    id: "strata-05",
    dimension: "Faixa Etária",
    stratumName: "35 a 44 anos",
    officialPercentage: 21.0,
    exactFractionalQuota: 420.0,
    hareNiemeyerQuota: 420,
    collected: 420,
    validated: 420,
    region: "Geral",
  },
  {
    id: "strata-06",
    dimension: "Faixa Etária",
    stratumName: "45 a 59 anos",
    officialPercentage: 24.8,
    exactFractionalQuota: 496.0,
    hareNiemeyerQuota: 496,
    collected: 496,
    validated: 496,
    region: "Geral",
  },
  {
    id: "strata-07",
    dimension: "Faixa Etária",
    stratumName: "60 anos ou mais",
    officialPercentage: 18.5,
    exactFractionalQuota: 370.0,
    hareNiemeyerQuota: 370,
    collected: 370,
    validated: 370,
    region: "Geral",
  },
  // Escolaridade
  {
    id: "strata-08",
    dimension: "Escolaridade",
    stratumName: "Fundamental Completo / Incompleto",
    officialPercentage: 31.4,
    exactFractionalQuota: 628.0,
    hareNiemeyerQuota: 628,
    collected: 628,
    validated: 628,
    region: "Geral",
  },
  {
    id: "strata-09",
    dimension: "Escolaridade",
    stratumName: "Médio Completo / Incompleto",
    officialPercentage: 44.6,
    exactFractionalQuota: 892.0,
    hareNiemeyerQuota: 892,
    collected: 892,
    validated: 892,
    region: "Geral",
  },
  {
    id: "strata-10",
    dimension: "Escolaridade",
    stratumName: "Superior Completo / Incompleto",
    officialPercentage: 24.0,
    exactFractionalQuota: 480.0,
    hareNiemeyerQuota: 480,
    collected: 480,
    validated: 480,
    region: "Geral",
  },
];

/**
 * Algoritmo de Maior Resto (Hare-Niemeyer) para alocação inteira sem perdas
 */
export function calculateHareNiemeyer(
  totalN: number,
  items: readonly QuotaStratumRecord[]
): readonly QuotaStratumRecord[] {
  const sumPct = items.reduce((acc, curr) => acc + curr.officialPercentage, 0);
  if (sumPct === 0) return items;

  const calculated = items.map((item) => {
    const exact = (item.officialPercentage / sumPct) * totalN;
    const integerPart = Math.floor(exact);
    const remainder = exact - integerPart;
    return { item, exact, integerPart, remainder };
  });

  const sumIntegers = calculated.reduce((acc, curr) => acc + curr.integerPart, 0);
  const seatsToDistribute = totalN - sumIntegers;

  // Ordena decrescente pelo maior resto fracionário
  const sorted = [...calculated].sort((a, b) => b.remainder - a.remainder);
  const allocatedIds = new Set<string>();

  for (let i = 0; i < seatsToDistribute && i < sorted.length; i++) {
    const s = sorted[i];
    if (s) allocatedIds.add(s.item.id);
  }

  return calculated.map(({ item, exact, integerPart }) => {
    const bonus = allocatedIds.has(item.id) ? 1 : 0;
    const finalAllocated = integerPart + bonus;
    return {
      ...item,
      exactFractionalQuota: Number(exact.toFixed(2)),
      hareNiemeyerQuota: finalAllocated,
    };
  });
}

