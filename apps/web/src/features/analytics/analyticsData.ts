import type { QuestionTabulationResponseSchema } from "../../api-client";

export type DemographicDimensionKey = "SEXO" | "FAIXA_ETARIA" | "ESCOLARIDADE" | "RENDA_FAMILIAR";

export interface RakingCalibrationSummary {
  readonly iterationsRun: number;
  readonly converged: boolean;
  readonly maxAbsDelta: string;
  readonly kishDeff: string;
  readonly effectiveSampleSize: string;
  readonly nominalMarginOfError: string;
  readonly adjustedMarginOfError: string;
  readonly minWeightApplied: string;
  readonly maxWeightApplied: string;
}

export interface OptionWithRejection {
  readonly option_code: string;
  readonly option_label: string;
  readonly party: string;
  readonly is_non_valid_option: boolean;
  readonly raw_count: number;
  readonly weighted_count: string;
  readonly total_votes_percentage: string;
  readonly valid_votes_percentage: string | null;
  readonly rejection_percentage: string;
  readonly stratum_margin_error: string;
}

export interface CrosstabDemographicRow {
  readonly categoryLabel: string;
  readonly populationTargetPct: string;
  readonly sampleWeightedPct: string;
  readonly candAPct: string;
  readonly candBPct: string;
  readonly candCPct: string;
  readonly brancoNuloPct: string;
}

export interface RunoffSimulationMatchup {
  readonly id: string;
  readonly label: string;
  readonly candAName: string;
  readonly candATotalPct: string;
  readonly candAValidPct: string;
  readonly candBName: string;
  readonly candBTotalPct: string;
  readonly candBValidPct: string;
  readonly undecidedBrancoPct: string;
}

export interface AnalyticsSurveyDataset {
  readonly id: string;
  readonly protocolTse: string;
  readonly title: string;
  readonly statisticianConre: string;
  readonly rakingSummary: RakingCalibrationSummary;
  readonly tabulation: QuestionTabulationResponseSchema;
  readonly enrichedOptions: readonly OptionWithRejection[];
  readonly crosstabs: Record<DemographicDimensionKey, readonly CrosstabDemographicRow[]>;
  readonly runoffMatchups: readonly RunoffSimulationMatchup[];
  readonly integritySha256: string;
}

export const ANALYTICS_SURVEYS_LIST: readonly AnalyticsSurveyDataset[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    protocolTse: "SP-01234/2026",
    title: "SP-01234/2026 — Intenção de Voto Estadual & Simulação de 2º Turno",
    statisticianConre: "CONRE-3 nº 9482-A",
    rakingSummary: {
      iterationsRun: 14,
      converged: true,
      maxAbsDelta: "0.0001",
      kishDeff: "1.1240",
      effectiveSampleSize: "1334.5196",
      nominalMarginOfError: "2.5000",
      adjustedMarginOfError: "2.6505",
      minWeightApplied: "0.6420",
      maxWeightApplied: "1.4890",
    },
    tabulation: {
      survey_id: "00000000-0000-0000-0000-000000000001",
      question_id: "00000000-0000-0000-0000-000000000010",
      question_code: "Q2_ESTIMULADA",
      question_type: "STIMULATED_SINGLE",
      total_valid_interviews: 1500,
      kish_deff: "1.1240",
      effective_sample_size: "1334.5196",
      adjusted_margin_of_error: "2.6505",
      options: [
        {
          option_code: "CAND_A",
          option_label: "Candidato Alfa",
          is_non_valid_option: false,
          raw_count: 610,
          weighted_count: "630.0000",
          total_votes_percentage: "42.0000",
          valid_votes_percentage: "48.8372",
        },
        {
          option_code: "CAND_B",
          option_label: "Candidato Beta",
          is_non_valid_option: false,
          raw_count: 500,
          weighted_count: "480.0000",
          total_votes_percentage: "32.0000",
          valid_votes_percentage: "37.2093",
        },
        {
          option_code: "CAND_C",
          option_label: "Candidato Gama",
          is_non_valid_option: false,
          raw_count: 180,
          weighted_count: "180.0000",
          total_votes_percentage: "12.0000",
          valid_votes_percentage: "13.9535",
        },
        {
          option_code: "BRANCO_NULO",
          option_label: "Branco / Nulo / Indeciso",
          is_non_valid_option: true,
          raw_count: 210,
          weighted_count: "210.0000",
          total_votes_percentage: "14.0000",
          valid_votes_percentage: null,
        },
      ],
    },
    enrichedOptions: [
      {
        option_code: "CAND_A",
        option_label: "Candidato Alfa",
        party: "PSD",
        is_non_valid_option: false,
        raw_count: 610,
        weighted_count: "630.0000",
        total_votes_percentage: "42.0000",
        valid_votes_percentage: "48.8372",
        rejection_percentage: "28.4000",
        stratum_margin_error: "2.6100",
      },
      {
        option_code: "CAND_B",
        option_label: "Candidato Beta",
        party: "PL",
        is_non_valid_option: false,
        raw_count: 500,
        weighted_count: "480.0000",
        total_votes_percentage: "32.0000",
        valid_votes_percentage: "37.2093",
        rejection_percentage: "36.8000",
        stratum_margin_error: "2.4900",
      },
      {
        option_code: "CAND_C",
        option_label: "Candidato Gama",
        party: "MDB",
        is_non_valid_option: false,
        raw_count: 180,
        weighted_count: "180.0000",
        total_votes_percentage: "12.0000",
        valid_votes_percentage: "13.9535",
        rejection_percentage: "18.5000",
        stratum_margin_error: "1.7400",
      },
      {
        option_code: "BRANCO_NULO",
        option_label: "Branco / Nulo / Indeciso",
        party: "—",
        is_non_valid_option: true,
        raw_count: 210,
        weighted_count: "210.0000",
        total_votes_percentage: "14.0000",
        valid_votes_percentage: null,
        rejection_percentage: "0.0000",
        stratum_margin_error: "1.8500",
      },
    ],
    crosstabs: {
      SEXO: [
        { categoryLabel: "Feminino (IBGE 52,4%)", populationTargetPct: "52.4000", sampleWeightedPct: "52.4000", candAPct: "45.2000", candBPct: "29.1000", candCPct: "11.5000", brancoNuloPct: "14.2000" },
        { categoryLabel: "Masculino (IBGE 47,6%)", populationTargetPct: "47.6000", sampleWeightedPct: "47.6000", candAPct: "38.5000", candBPct: "35.2000", candCPct: "12.5000", brancoNuloPct: "13.8000" },
      ],
      FAIXA_ETARIA: [
        { categoryLabel: "16 a 24 anos", populationTargetPct: "14.5000", sampleWeightedPct: "14.5000", candAPct: "40.0000", candBPct: "30.0000", candCPct: "16.0000", brancoNuloPct: "14.0000" },
        { categoryLabel: "25 a 44 anos", populationTargetPct: "38.2000", sampleWeightedPct: "38.2000", candAPct: "43.1000", candBPct: "31.9000", candCPct: "11.5000", brancoNuloPct: "13.5000" },
        { categoryLabel: "45 a 59 anos", populationTargetPct: "26.1000", sampleWeightedPct: "26.1000", candAPct: "41.0000", candBPct: "34.0000", candCPct: "11.0000", brancoNuloPct: "14.0000" },
        { categoryLabel: "60 anos ou mais", populationTargetPct: "21.2000", sampleWeightedPct: "21.2000", candAPct: "42.6000", candBPct: "31.4000", candCPct: "11.0000", brancoNuloPct: "15.0000" },
      ],
      ESCOLARIDADE: [
        { categoryLabel: "Até Ensino Fundamental", populationTargetPct: "31.0000", sampleWeightedPct: "31.0000", candAPct: "47.5000", candBPct: "27.5000", candCPct: "9.0000", brancoNuloPct: "16.0000" },
        { categoryLabel: "Ensino Médio Completo", populationTargetPct: "46.0000", sampleWeightedPct: "46.0000", candAPct: "40.8000", candBPct: "33.7000", candCPct: "12.5000", brancoNuloPct: "13.0000" },
        { categoryLabel: "Ensino Superior", populationTargetPct: "23.0000", sampleWeightedPct: "23.0000", candAPct: "37.0000", candBPct: "34.6000", candCPct: "15.0000", brancoNuloPct: "13.4000" },
      ],
      RENDA_FAMILIAR: [
        { categoryLabel: "Até 2 Salários Mínimos", populationTargetPct: "51.0000", sampleWeightedPct: "51.0000", candAPct: "46.0000", candBPct: "28.5000", candCPct: "10.5000", brancoNuloPct: "15.0000" },
        { categoryLabel: "De 2 a 5 Salários Mínimos", populationTargetPct: "34.0000", sampleWeightedPct: "34.0000", candAPct: "39.0000", candBPct: "35.5000", candCPct: "13.0000", brancoNuloPct: "12.5000" },
        { categoryLabel: "Mais de 5 Salários Mínimos", populationTargetPct: "15.0000", sampleWeightedPct: "15.0000", candAPct: "35.2000", candBPct: "36.0000", candCPct: "14.8000", brancoNuloPct: "14.0000" },
      ],
    },
    runoffMatchups: [
      {
        id: "RUNOFF_AB",
        label: "Cenário 1 — 2º Turno: Candidato Alfa (PSD) vs Candidato Beta (PL)",
        candAName: "Candidato Alfa (PSD)",
        candATotalPct: "49.2000",
        candAValidPct: "54.0659",
        candBName: "Candidato Beta (PL)",
        candBTotalPct: "41.8000",
        candBValidPct: "45.9341",
        undecidedBrancoPct: "9.0000",
      },
      {
        id: "RUNOFF_AC",
        label: "Cenário 2 — 2º Turno: Candidato Alfa (PSD) vs Candidato Gama (MDB)",
        candAName: "Candidato Alfa (PSD)",
        candATotalPct: "53.5000",
        candAValidPct: "59.4444",
        candBName: "Candidato Gama (MDB)",
        candBTotalPct: "36.5000",
        candBValidPct: "40.5556",
        undecidedBrancoPct: "10.0000",
      },
    ],
    integritySha256: "sha256:8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
  },
];
