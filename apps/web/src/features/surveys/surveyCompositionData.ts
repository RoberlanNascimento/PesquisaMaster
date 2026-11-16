import { create } from "zustand";

export interface QuestionnaireBlockTemplate {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly category:
    | "SOCIOECONOMICO_TSE"
    | "INTENCAO_VOTO"
    | "REJEICAO_SIMULACAO"
    | "AVALIACAO_GESTAO";
  readonly questionsCount: number;
  readonly estimatedSeconds: number;
  readonly hasCircularRotation: boolean;
  readonly description: string;
}

export interface SurveyCompositionRecord {
  readonly id: string;
  readonly surveyId: string;
  readonly surveyProtocolTse: string;
  readonly surveyTitle: string;
  readonly office: "Presidente" | "Governador" | "Senador" | "Prefeito";
  readonly cityUf: string;
  readonly compositionVersion: string;
  readonly questionnaireIds: readonly string[];
  readonly status: "EM_MONTAGEM" | "HOMOLOGADA_TSE" | "TRAVADA_SHA256";
  readonly sha256Signature: string;
  readonly updatedAt: string;
}

export interface SurveyCompositionFormData {
  readonly surveyId: string;
  readonly compositionVersion: string;
  readonly questionnaireIds: readonly string[];
  readonly status: "EM_MONTAGEM" | "HOMOLOGADA_TSE" | "TRAVADA_SHA256";
}

export const QUESTIONNAIRE_TEMPLATES: readonly QuestionnaireBlockTemplate[] = [
  {
    id: "qblk-01",
    code: "Q-TSE-COTAS",
    title: "Bloco Sociodemográfico Obrigatório (TSE / IBGE)",
    category: "SOCIOECONOMICO_TSE",
    questionsCount: 4,
    estimatedSeconds: 25,
    hasCircularRotation: false,
    description: "Sexo, Faixa Etária, Grau de Instrução e Renda Domiciliar (Res. TSE 23.600).",
  },
  {
    id: "qblk-02",
    code: "Q-ESPONT-MAJ",
    title: "Bloco Intenção de Voto Espontânea Majoritária",
    category: "INTENCAO_VOTO",
    questionsCount: 2,
    estimatedSeconds: 20,
    hasCircularRotation: false,
    description: "Pergunta aberta sem apresentação de disco e consolidação de indecisos.",
  },
  {
    id: "qblk-03",
    code: "Q-DISCO-1T",
    title: "Bloco Estimulada 1º Turno (Rodízio Circular de Disco)",
    category: "INTENCAO_VOTO",
    questionsCount: 3,
    estimatedSeconds: 45,
    hasCircularRotation: true,
    description: "Cartão estimulado com semente determinística SHA-256 e âncoras fixas no fim.",
  },
  {
    id: "qblk-04",
    code: "Q-REJ-MULT",
    title: "Bloco Rejeição Múltipla e Teto Eleitoral",
    category: "REJEICAO_SIMULACAO",
    questionsCount: 2,
    estimatedSeconds: 30,
    hasCircularRotation: true,
    description: "Múltipla escolha de rejeição com rodízio neutro espelhado no disco principal.",
  },
  {
    id: "qblk-05",
    code: "Q-CENARIO-2T",
    title: "Bloco Simulação de 2º Turno (Confrontos Diretos)",
    category: "REJEICAO_SIMULACAO",
    questionsCount: 3,
    estimatedSeconds: 40,
    hasCircularRotation: true,
    description: "Confrontos diretos binários entre os líderes com lógica de salto condicional.",
  },
  {
    id: "qblk-06",
    code: "Q-AVAL-GOV",
    title: "Bloco Avaliação de Gestão & Problemas Prioritários",
    category: "AVALIACAO_GESTAO",
    questionsCount: 3,
    estimatedSeconds: 35,
    hasCircularRotation: false,
    description: "Escala Likert de aprovação administrativa e percepção de áreas críticas.",
  },
];

export const INITIAL_COMPOSITIONS: readonly SurveyCompositionRecord[] = [
  {
    id: "comp-surv-001",
    surveyId: "surv-001",
    surveyProtocolTse: "SP-05190/2026",
    surveyTitle: "Eleições 2026 — Intenção de Voto Governador SP 1º Turno",
    office: "Governador",
    cityUf: "São Paulo / SP",
    compositionVersion: "v2.1-TSE",
    questionnaireIds: ["qblk-01", "qblk-02", "qblk-03", "qblk-04", "qblk-06"],
    status: "TRAVADA_SHA256",
    sha256Signature: "sha256-3a9f8b2c1d4e6f7a8b9c0d1e",
    updatedAt: "2026-10-14",
  },
  {
    id: "comp-surv-002",
    surveyId: "surv-002",
    surveyProtocolTse: "BR-08421/2026",
    surveyTitle: "Eleição Presidencial 2026 — Sondagem de Cenários & Rejeição",
    office: "Presidente",
    cityUf: "BR - Nacional",
    compositionVersion: "v1.4-NAC",
    questionnaireIds: ["qblk-01", "qblk-02", "qblk-03", "qblk-04", "qblk-05"],
    status: "HOMOLOGADA_TSE",
    sha256Signature: "sha256-b7e2c9a1d4f6e8a0b2c4d6f8",
    updatedAt: "2026-10-22",
  },
  {
    id: "comp-surv-003",
    surveyId: "surv-003",
    surveyProtocolTse: "RJ-01124/2026",
    surveyTitle: "Prefeitura RJ — Cenários de 2º Turno e Avaliação",
    office: "Prefeito",
    cityUf: "Rio de Janeiro / RJ",
    compositionVersion: "v1.0-RJ",
    questionnaireIds: ["qblk-01", "qblk-03", "qblk-05", "qblk-06"],
    status: "HOMOLOGADA_TSE",
    sha256Signature: "sha256-9f8e7d6c5b4a3f2e1d0c9b8a",
    updatedAt: "2026-10-30",
  },
  {
    id: "comp-surv-004",
    surveyId: "surv-004",
    surveyProtocolTse: "MG-00982/2026",
    surveyTitle: "Senado Federal MG — Estudo de Espontânea & Cotas",
    office: "Senador",
    cityUf: "Minas Gerais / MG",
    compositionVersion: "v0.9-DRAFT",
    questionnaireIds: ["qblk-01", "qblk-02"],
    status: "EM_MONTAGEM",
    sha256Signature: "Pendente de Homologação",
    updatedAt: "2026-11-05",
  },
];

interface SurveyCompositionStoreState {
  readonly compositions: readonly SurveyCompositionRecord[];
  readonly upsertComposition: (record: SurveyCompositionRecord) => void;
  readonly deleteComposition: (id: string) => void;
}

export const useSurveyCompositionStore = create<SurveyCompositionStoreState>((set) => ({
  compositions: INITIAL_COMPOSITIONS,
  upsertComposition: (record) =>
    set((state) => {
      const exists = state.compositions.some((c) => c.id === record.id);
      return {
        compositions: exists
          ? state.compositions.map((c) => (c.id === record.id ? record : c))
          : [record, ...state.compositions],
      };
    }),
  deleteComposition: (id) =>
    set((state) => ({
      compositions: state.compositions.filter((c) => c.id !== id),
    })),
}));

