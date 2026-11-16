import { z } from "zod";

export type QuestionType =
  | "COTA_DEMOGRAFICA"
  | "ESPONTANEA"
  | "ESTIMULADA_DISCO"
  | "REJEICAO_MULTIPLA"
  | "AVALIACAO_GOVERNO";

export interface QuestionnaireItem {
  readonly id: string;
  readonly order: number;
  readonly code: string;
  readonly text: string;
  readonly type: QuestionType;
  readonly isMandatory: boolean;
  readonly rotationRule: "CIRCULAR_OFFSET" | "RANDOM" | "NONE";
  readonly minDurationSeconds: number;
  readonly options: readonly string[];
}

export const questionFormSchema = z.object({
  code: z.string().min(2, "Código obrigatório (ex: P01)"),
  text: z.string().min(5, "Enunciado deve ter no mínimo 5 caracteres"),
  type: z.enum([
    "COTA_DEMOGRAFICA",
    "ESPONTANEA",
    "ESTIMULADA_DISCO",
    "REJEICAO_MULTIPLA",
    "AVALIACAO_GOVERNO",
  ]),
  isMandatory: z.boolean(),
  rotationRule: z.enum(["CIRCULAR_OFFSET", "RANDOM", "NONE"]),
  minDurationSeconds: z.coerce.number().min(3, "Tempo mínimo de 3 segundos"),
  optionsRaw: z.string().min(2, "Insira ao menos uma opção por linha"),
});

export type QuestionFormData = z.infer<typeof questionFormSchema>;

export const INITIAL_QUESTIONS: readonly QuestionnaireItem[] = [
  {
    id: "q-01",
    order: 1,
    code: "P01",
    text: "Qual é a sua faixa etária?",
    type: "COTA_DEMOGRAFICA",
    isMandatory: true,
    rotationRule: "NONE",
    minDurationSeconds: 4,
    options: ["16 a 24 anos", "25 a 34 anos", "35 a 44 anos", "45 a 59 anos", "60 anos ou mais"],
  },
  {
    id: "q-02",
    order: 2,
    code: "P02",
    text: "Se a eleição para Governador fosse hoje, em quem você votaria? (Espontânea)",
    type: "ESPONTANEA",
    isMandatory: true,
    rotationRule: "NONE",
    minDurationSeconds: 8,
    options: ["Candidato A", "Candidato B", "Candidato C", "Indeciso / NS", "Branco / Nulo"],
  },
  {
    id: "q-03",
    order: 3,
    code: "P03",
    text: "Se os candidatos fossem estes apresentados no disco, em quem você votaria?",
    type: "ESTIMULADA_DISCO",
    isMandatory: true,
    rotationRule: "CIRCULAR_OFFSET",
    minDurationSeconds: 12,
    options: [
      "Alexandre Silveira",
      "Beatriz Alcantara",
      "Cláudio Novaes",
      "Daniela Fontes",
      "Branco / Nulo",
      "Não sabe / Não respondeu",
    ],
  },
  {
    id: "q-04",
    order: 4,
    code: "P04",
    text: "E entre estes mesmos nomes, em qual deles você NÃO votaria de jeito nenhum? (Rejeição)",
    type: "REJEICAO_MULTIPLA",
    isMandatory: true,
    rotationRule: "CIRCULAR_OFFSET",
    minDurationSeconds: 10,
    options: [
      "Alexandre Silveira",
      "Beatriz Alcantara",
      "Cláudio Novaes",
      "Daniela Fontes",
      "Rejeita Todos",
      "Não Rejeita Nenhum",
    ],
  },
  {
    id: "q-05",
    order: 5,
    code: "P05",
    text: "Como você avalia a atual gestão do governo estadual?",
    type: "AVALIACAO_GOVERNO",
    isMandatory: false,
    rotationRule: "NONE",
    minDurationSeconds: 5,
    options: ["Ótima", "Boa", "Regular", "Ruim", "Péssima", "Não sabe avaliar"],
  },
];

