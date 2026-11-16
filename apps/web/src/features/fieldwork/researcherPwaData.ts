import type { QuestionOptionSchema } from "../../api-client";

export interface PwaSurveyQuestionnaire {
  readonly surveyId: string;
  readonly surveyLabel: string;
  readonly spontaneousPrompt: string;
  readonly stimulatedPrompt: string;
  readonly defaultSpontaneous: string;
  readonly options: readonly QuestionOptionSchema[];
}

export const PWA_SURVEY_CATALOG: readonly PwaSurveyQuestionnaire[] = [
  {
    surveyId: "BR-08421/2026",
    surveyLabel: "BR-08421/2026 — Eleição Presidencial 2026 (Nacional)",
    spontaneousPrompt:
      "1. Pergunta Espontânea (Sem apresentação de nomes): Em quem você votaria para Presidente hoje?",
    stimulatedPrompt:
      "2. Pergunta Estimulada (Rodízio de Disco TSE): Dentre estes candidatos a Presidente, em quem você votaria?",
    defaultSpontaneous: "Candidato Alfa",
    options: [
      { code: "CAND_A", label: "Candidato Alfa (PSD — 55)", is_fixed: false },
      { code: "CAND_B", label: "Candidato Beta (PL — 22)", is_fixed: false },
      { code: "CAND_C", label: "Candidato Gama (MDB — 15)", is_fixed: false },
      { code: "BRANCO_NULO", label: "Branco / Nulo", is_fixed: true },
      { code: "NS_NR", label: "Não Sabe / Não Respondeu", is_fixed: true },
    ],
  },
  {
    surveyId: "SP-05190/2026",
    surveyLabel: "SP-05190/2026 — Governador de São Paulo 1º Turno",
    spontaneousPrompt:
      "1. Pergunta Espontânea: Se a eleição para Governador de SP fosse hoje, em quem você votaria?",
    stimulatedPrompt:
      "2. Pergunta Estimulada (Disco Governador SP): Se os candidatos fossem estes, em quem votaria?",
    defaultSpontaneous: "Alexandre Silveira",
    options: [
      { code: "GOV_A", label: "Alexandre Silveira (Republicanos — 10)", is_fixed: false },
      { code: "GOV_B", label: "Beatriz Alcantara (PSB — 40)", is_fixed: false },
      { code: "GOV_C", label: "Cláudio Novaes (PSDB — 45)", is_fixed: false },
      { code: "BRANCO_NULO", label: "Branco / Nulo", is_fixed: true },
      { code: "NS_NR", label: "Não Sabe / Não Respondeu", is_fixed: true },
    ],
  },
];

