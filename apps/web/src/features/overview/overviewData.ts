export interface CandidateStatPoint {
  readonly code: string;
  readonly name: string;
  readonly party: string;
  readonly quantity: number;
  readonly frequency: string;
  readonly percentage: string;
  readonly color: string;
}

export interface ScenarioDataset {
  readonly scenarioId: string;
  readonly scenarioTitle: string;
  readonly points: readonly CandidateStatPoint[];
}

export interface OfficeResearchReport {
  readonly officeCode: string;
  readonly officeLabel: string;
  readonly spontaneous: readonly CandidateStatPoint[];
  readonly stimulated: readonly CandidateStatPoint[];
  readonly scenarios: readonly ScenarioDataset[];
  readonly rejection: readonly CandidateStatPoint[];
  readonly citations: readonly CandidateStatPoint[];
}

export interface OverviewSurveyDataset {
  readonly id: string;
  readonly protocolTse: string;
  readonly surveyName: string;
  readonly surveyDate: string;
  readonly sampleSize: number;
  readonly marginOfError: string;
  readonly offices: readonly OfficeResearchReport[];
}

export const OVERVIEW_SURVEYS_CATALOG: readonly OverviewSurveyDataset[] = [
  {
    id: "srv-2026-10",
    protocolTse: "BR-08421/2026",
    surveyName: "Rodada Outubro/2026 — Eleições Gerais & Estaduais SP",
    surveyDate: "2026-10-28",
    sampleSize: 2000,
    marginOfError: "2.2000",
    offices: [
      {
        officeCode: "PRESIDENTE",
        officeLabel: "Presidente da República",
        spontaneous: [
          { code: "CAND_A", name: "Candidato Alfa", party: "PSD", quantity: 620, frequency: "0.3100", percentage: "31.0000", color: "#2563eb" },
          { code: "CAND_B", name: "Candidato Beta", party: "PL", quantity: 540, frequency: "0.2700", percentage: "27.0000", color: "#16a34a" },
          { code: "CAND_C", name: "Candidato Gama", party: "MDB", quantity: 180, frequency: "0.0900", percentage: "9.0000", color: "#d97706" },
          { code: "INDECISO", name: "Não Sabe / Indeciso", party: "—", quantity: 660, frequency: "0.3300", percentage: "33.0000", color: "#64748b" },
        ],
        stimulated: [
          { code: "CAND_A", name: "Candidato Alfa", party: "PSD", quantity: 840, frequency: "0.4200", percentage: "42.0000", color: "#2563eb" },
          { code: "CAND_B", name: "Candidato Beta", party: "PL", quantity: 720, frequency: "0.3600", percentage: "36.0000", color: "#16a34a" },
          { code: "CAND_C", name: "Candidato Gama", party: "MDB", quantity: 240, frequency: "0.1200", percentage: "12.0000", color: "#d97706" },
          { code: "BRANCO_NULO", name: "Branco / Nulo / NS", party: "—", quantity: 200, frequency: "0.1000", percentage: "10.0000", color: "#64748b" },
        ],
        scenarios: [
          {
            scenarioId: "CEN_1",
            scenarioTitle: "Cenário 1 — 2º Turno (Alfa vs Beta)",
            points: [
              { code: "CAND_A", name: "Candidato Alfa", party: "PSD", quantity: 980, frequency: "0.4900", percentage: "49.0000", color: "#2563eb" },
              { code: "CAND_B", name: "Candidato Beta", party: "PL", quantity: 860, frequency: "0.4300", percentage: "43.0000", color: "#16a34a" },
              { code: "BRANCO_NULO", name: "Branco / Nulo", party: "—", quantity: 160, frequency: "0.0800", percentage: "8.0000", color: "#64748b" },
            ],
          },
          {
            scenarioId: "CEN_2",
            scenarioTitle: "Cenário 2 — 2º Turno (Alfa vs Gama)",
            points: [
              { code: "CAND_A", name: "Candidato Alfa", party: "PSD", quantity: 1040, frequency: "0.5200", percentage: "52.0000", color: "#2563eb" },
              { code: "CAND_C", name: "Candidato Gama", party: "MDB", quantity: 740, frequency: "0.3700", percentage: "37.0000", color: "#d97706" },
              { code: "BRANCO_NULO", name: "Branco / Nulo", party: "—", quantity: 220, frequency: "0.1100", percentage: "11.0000", color: "#64748b" },
            ],
          },
        ],
        rejection: [
          { code: "CAND_B", name: "Candidato Beta", party: "PL", quantity: 760, frequency: "0.3800", percentage: "38.0000", color: "#dc2626" },
          { code: "CAND_A", name: "Candidato Alfa", party: "PSD", quantity: 680, frequency: "0.3400", percentage: "34.0000", color: "#ef4444" },
          { code: "CAND_C", name: "Candidato Gama", party: "MDB", quantity: 380, frequency: "0.1900", percentage: "19.0000", color: "#f97316" },
        ],
        citations: [
          { code: "CAND_A", name: "Candidato Alfa", party: "PSD", quantity: 1120, frequency: "0.5600", percentage: "56.0000", color: "#0284c7" },
          { code: "CAND_B", name: "Candidato Beta", party: "PL", quantity: 990, frequency: "0.4950", percentage: "49.5000", color: "#0369a1" },
          { code: "CAND_C", name: "Candidato Gama", party: "MDB", quantity: 510, frequency: "0.2550", percentage: "25.5000", color: "#0ea5e9" },
        ],
      },
      {
        officeCode: "GOVERNADOR",
        officeLabel: "Governador do Estado (SP)",
        spontaneous: [
          { code: "GOV_1", name: "Governador Delta", party: "REPUBLICANOS", quantity: 580, frequency: "0.2900", percentage: "29.0000", color: "#2563eb" },
          { code: "GOV_2", name: "Candidata Épsilon", party: "PT", quantity: 420, frequency: "0.2100", percentage: "21.0000", color: "#16a34a" },
          { code: "INDECISO", name: "Não Sabe / Indeciso", party: "—", quantity: 1000, frequency: "0.5000", percentage: "50.0000", color: "#64748b" },
        ],
        stimulated: [
          { code: "GOV_1", name: "Governador Delta", party: "REPUBLICANOS", quantity: 900, frequency: "0.4500", percentage: "45.0000", color: "#2563eb" },
          { code: "GOV_2", name: "Candidata Épsilon", party: "PT", quantity: 660, frequency: "0.3300", percentage: "33.0000", color: "#16a34a" },
          { code: "GOV_3", name: "Candidato Zeta", party: "PSDB", quantity: 260, frequency: "0.1300", percentage: "13.0000", color: "#d97706" },
          { code: "BRANCO_NULO", name: "Branco / Nulo / NS", party: "—", quantity: 180, frequency: "0.0900", percentage: "9.0000", color: "#64748b" },
        ],
        scenarios: [
          {
            scenarioId: "CEN_GOV_1",
            scenarioTitle: "Cenário Único 2º Turno (Delta vs Épsilon)",
            points: [
              { code: "GOV_1", name: "Governador Delta", party: "REPUBLICANOS", quantity: 1060, frequency: "0.5300", percentage: "53.0000", color: "#2563eb" },
              { code: "GOV_2", name: "Candidata Épsilon", party: "PT", quantity: 780, frequency: "0.3900", percentage: "39.0000", color: "#16a34a" },
              { code: "BRANCO_NULO", name: "Branco / Nulo", party: "—", quantity: 160, frequency: "0.0800", percentage: "8.0000", color: "#64748b" },
            ],
          },
        ],
        rejection: [
          { code: "GOV_2", name: "Candidata Épsilon", party: "PT", quantity: 700, frequency: "0.3500", percentage: "35.0000", color: "#dc2626" },
          { code: "GOV_1", name: "Governador Delta", party: "REPUBLICANOS", quantity: 520, frequency: "0.2600", percentage: "26.0000", color: "#ef4444" },
          { code: "GOV_3", name: "Candidato Zeta", party: "PSDB", quantity: 440, frequency: "0.2200", percentage: "22.0000", color: "#f97316" },
        ],
        citations: [
          { code: "GOV_1", name: "Governador Delta", party: "REPUBLICANOS", quantity: 1240, frequency: "0.6200", percentage: "62.0000", color: "#0284c7" },
          { code: "GOV_2", name: "Candidata Épsilon", party: "PT", quantity: 920, frequency: "0.4600", percentage: "46.0000", color: "#0369a1" },
          { code: "GOV_3", name: "Candidato Zeta", party: "PSDB", quantity: 480, frequency: "0.2400", percentage: "24.0000", color: "#0ea5e9" },
        ],
      },
      {
        officeCode: "SENADOR",
        officeLabel: "Senador da República (SP)",
        spontaneous: [
          { code: "SEN_1", name: "Senador Ômega", party: "UNIÃO", quantity: 480, frequency: "0.2400", percentage: "24.0000", color: "#2563eb" },
          { code: "SEN_2", name: "Senadora Sigma", party: "PSB", quantity: 410, frequency: "0.2050", percentage: "20.5000", color: "#16a34a" },
          { code: "INDECISO", name: "Não Sabe / Indeciso", party: "—", quantity: 1110, frequency: "0.5550", percentage: "55.5000", color: "#64748b" },
        ],
        stimulated: [
          { code: "SEN_1", name: "Senador Ômega", party: "UNIÃO", quantity: 780, frequency: "0.3900", percentage: "39.0000", color: "#2563eb" },
          { code: "SEN_2", name: "Senadora Sigma", party: "PSB", quantity: 710, frequency: "0.3550", percentage: "35.5000", color: "#16a34a" },
          { code: "BRANCO_NULO", name: "Branco / Nulo / NS", party: "—", quantity: 510, frequency: "0.2550", percentage: "25.5000", color: "#64748b" },
        ],
        scenarios: [
          {
            scenarioId: "CEN_SEN_1",
            scenarioTitle: "Cenário Estimulado — Vaga Única ao Senado",
            points: [
              { code: "SEN_1", name: "Senador Ômega", party: "UNIÃO", quantity: 780, frequency: "0.3900", percentage: "39.0000", color: "#2563eb" },
              { code: "SEN_2", name: "Senadora Sigma", party: "PSB", quantity: 710, frequency: "0.3550", percentage: "35.5000", color: "#16a34a" },
            ],
          },
        ],
        rejection: [
          { code: "SEN_1", name: "Senador Ômega", party: "UNIÃO", quantity: 590, frequency: "0.2950", percentage: "29.5000", color: "#dc2626" },
          { code: "SEN_2", name: "Senadora Sigma", party: "PSB", quantity: 530, frequency: "0.2650", percentage: "26.5000", color: "#ef4444" },
        ],
        citations: [
          { code: "SEN_1", name: "Senador Ômega", party: "UNIÃO", quantity: 1020, frequency: "0.5100", percentage: "51.0000", color: "#0284c7" },
          { code: "SEN_2", name: "Senadora Sigma", party: "PSB", quantity: 960, frequency: "0.4800", percentage: "48.0000", color: "#0369a1" },
        ],
      },
    ],
  },
  {
    id: "srv-2026-09",
    protocolTse: "SP-05190/2026",
    surveyName: "Rodada Setembro/2026 — Intenção de Voto Capital & Interior",
    surveyDate: "2026-09-15",
    sampleSize: 1500,
    marginOfError: "2.5000",
    offices: [
      {
        officeCode: "PRESIDENTE",
        officeLabel: "Presidente da República",
        spontaneous: [
          { code: "CAND_A", name: "Candidato Alfa", party: "PSD", quantity: 435, frequency: "0.2900", percentage: "29.0000", color: "#2563eb" },
          { code: "CAND_B", name: "Candidato Beta", party: "PL", quantity: 420, frequency: "0.2800", percentage: "28.0000", color: "#16a34a" },
          { code: "INDECISO", name: "Não Sabe / Indeciso", party: "—", quantity: 645, frequency: "0.4300", percentage: "43.0000", color: "#64748b" },
        ],
        stimulated: [
          { code: "CAND_A", name: "Candidato Alfa", party: "PSD", quantity: 600, frequency: "0.4000", percentage: "40.0000", color: "#2563eb" },
          { code: "CAND_B", name: "Candidato Beta", party: "PL", quantity: 570, frequency: "0.3800", percentage: "38.0000", color: "#16a34a" },
          { code: "BRANCO_NULO", name: "Branco / Nulo / NS", party: "—", quantity: 330, frequency: "0.2200", percentage: "22.0000", color: "#64748b" },
        ],
        scenarios: [
          {
            scenarioId: "CEN_SET_1",
            scenarioTitle: "Cenário 1 — 2º Turno (Alfa vs Beta)",
            points: [
              { code: "CAND_A", name: "Candidato Alfa", party: "PSD", quantity: 705, frequency: "0.4700", percentage: "47.0000", color: "#2563eb" },
              { code: "CAND_B", name: "Candidato Beta", party: "PL", quantity: 675, frequency: "0.4500", percentage: "45.0000", color: "#16a34a" },
            ],
          },
        ],
        rejection: [
          { code: "CAND_B", name: "Candidato Beta", party: "PL", quantity: 585, frequency: "0.3900", percentage: "39.0000", color: "#dc2626" },
          { code: "CAND_A", name: "Candidato Alfa", party: "PSD", quantity: 525, frequency: "0.3500", percentage: "35.0000", color: "#ef4444" },
        ],
        citations: [
          { code: "CAND_A", name: "Candidato Alfa", party: "PSD", quantity: 810, frequency: "0.5400", percentage: "54.0000", color: "#0284c7" },
          { code: "CAND_B", name: "Candidato Beta", party: "PL", quantity: 765, frequency: "0.5100", percentage: "51.0000", color: "#0369a1" },
        ],
      },
    ],
  },
];

