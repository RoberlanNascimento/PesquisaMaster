export interface HareNiemeyerQuotaCell {
  readonly id: string;
  readonly stratumLabel: string;
  readonly demographicLabel: string;
  readonly populationWeightPct: string;
  readonly exactQuotaDecimal: string;
  readonly integerPart: number;
  readonly remainderDecimal: string;
  readonly finalTargetCount: number;
  readonly assignedResearcher: string;
}

export interface PlannedSurveyItem {
  readonly id: string;
  readonly tseProtocolNumber: string;
  readonly title: string;
  readonly sphere: "FEDERAL" | "ESTADUAL" | "MUNICIPAL";
  readonly targetUf: string;
  readonly statisticianConre: string;
  readonly contractingCnpj: string;
  readonly plannedSampleSize: number;
  readonly confidenceLevel: string;
  readonly marginOfError: string;
  readonly status: "DRAFT" | "PUBLISHED_TSE" | "ACTIVE_FIELD" | "CONCLUDED";
}

export interface DynamicQuestionItem {
  readonly code: string;
  readonly type: "SPONTANEOUS" | "STIMULATED_DISC" | "REJECTION" | "DEMOGRAPHIC";
  readonly prompt: string;
  readonly rotateDisc: boolean;
  readonly skipLogicRule: string;
}

export const INITIAL_PLANNED_SURVEYS: readonly PlannedSurveyItem[] = [
  {
    id: "srv-plan-01",
    tseProtocolNumber: "BR-08421/2026",
    title: "Rodada Outubro/2026 — Eleições Gerais & Estaduais SP",
    sphere: "FEDERAL",
    targetUf: "SP",
    statisticianConre: "CONRE-3 nº 9482-A",
    contractingCnpj: "12.345.678/0001-90",
    plannedSampleSize: 2000,
    confidenceLevel: "95.0000",
    marginOfError: "2.2000",
    status: "ACTIVE_FIELD",
  },
  {
    id: "srv-plan-02",
    tseProtocolNumber: "SP-09910/2026",
    title: "Sondagem Municipal Capital SP — 2º Turno",
    sphere: "MUNICIPAL",
    targetUf: "SP",
    statisticianConre: "CONRE-3 nº 9482-A",
    contractingCnpj: "12.345.678/0001-90",
    plannedSampleSize: 1500,
    confidenceLevel: "95.0000",
    marginOfError: "2.5000",
    status: "DRAFT",
  },
];

export const INITIAL_DYNAMIC_QUESTIONS: readonly DynamicQuestionItem[] = [
  {
    code: "Q01_ESPONTANEA",
    type: "SPONTANEOUS",
    prompt: "Se a eleição fosse hoje, em quem você votaria para Presidente? (Espontânea)",
    rotateDisc: false,
    skipLogicRule: "SEMPRE_EXIBIR",
  },
  {
    code: "Q02_ESTIMULADA_DISCO",
    type: "STIMULATED_DISC",
    prompt: "Dentre estes nomes no disco eleitoral, em quem você votaria? (Estimulada)",
    rotateDisc: true,
    skipLogicRule: "ANCORAR_BRANCO_NS_FIM",
  },
  {
    code: "Q03_REJEICAO_MULTIPLA",
    type: "REJECTION",
    prompt: "Em quais destes candidatos você NÃO votaria de jeito nenhum?",
    rotateDisc: true,
    skipLogicRule: "PULAR_SE_Q02 == NENHUM",
  },
];

export const INITIAL_HARE_NIEMEYER_QUOTAS: readonly HareNiemeyerQuotaCell[] = [
  {
    id: "hn-01",
    stratumLabel: "Zona Sul — Setor 355030801",
    demographicLabel: "Feminino • 25 a 44 anos • Ensino Médio",
    populationWeightPct: "26.3500",
    exactQuotaDecimal: "527.0000",
    integerPart: 527,
    remainderDecimal: "0.0000",
    finalTargetCount: 527,
    assignedResearcher: "Carlos Eduardo Mendes (tablet-tse-sp-001)",
  },
  {
    id: "hn-02",
    stratumLabel: "Zona Leste — Setor 355030802",
    demographicLabel: "Masculino • 45 a 59 anos • Fundamental",
    populationWeightPct: "24.1800",
    exactQuotaDecimal: "483.6000",
    integerPart: 483,
    remainderDecimal: "0.6000 (+1 Maior Resto)",
    finalTargetCount: 484,
    assignedResearcher: "Fernanda Rocha Lima (tablet-tse-sp-002)",
  },
  {
    id: "hn-03",
    stratumLabel: "Centro — Setor 355030803",
    demographicLabel: "Feminino • 16 a 24 anos • Superior",
    populationWeightPct: "25.1200",
    exactQuotaDecimal: "502.4000",
    integerPart: 502,
    remainderDecimal: "0.4000",
    finalTargetCount: 502,
    assignedResearcher: "Marcos Vinícius Souza (tablet-tse-sp-003)",
  },
  {
    id: "hn-04",
    stratumLabel: "Campinas — Setor 350950201",
    demographicLabel: "Masculino • 25 a 44 anos • Ensino Médio",
    populationWeightPct: "24.3500",
    exactQuotaDecimal: "487.0000",
    integerPart: 487,
    remainderDecimal: "0.0000",
    finalTargetCount: 487,
    assignedResearcher: "Juliana Paiva Castro (tablet-tse-sp-004)",
  },
];

