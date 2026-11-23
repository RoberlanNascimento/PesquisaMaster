import { z } from "zod";

export type SurveyOffice = "Presidente" | "Governador" | "Senador" | "Prefeito";
export type SurveyStatus = "RASCUNHO" | "REGISTRADA_PESQELE" | "EM_CAMPO" | "CONSOLIDADA";

export interface SamplePlanPreset {
  readonly id: string;
  readonly label: string;
  readonly sampleSize: number;
  readonly confidenceLevel: string;
  readonly marginOfError: string;
}

export const SAMPLE_PLAN_PRESETS: readonly SamplePlanPreset[] = [
  { id: "smp-1200", label: "Plano Municipal (N = 1.200 • IC 95% • ±2,83 p.p.)", sampleSize: 1200, confidenceLevel: "95%", marginOfError: "2,83 p.p." },
  { id: "smp-1500", label: "Plano Capital / Regional (N = 1.500 • IC 95% • ±2,53 p.p.)", sampleSize: 1500, confidenceLevel: "95%", marginOfError: "2,53 p.p." },
  { id: "smp-1800", label: "Plano Estadual Senado (N = 1.800 • IC 95% • ±2,31 p.p.)", sampleSize: 1800, confidenceLevel: "95%", marginOfError: "2,31 p.p." },
  { id: "smp-2000", label: "Plano Estadual Padrão TSE (N = 2.000 • IC 95% • ±2,19 p.p.)", sampleSize: 2000, confidenceLevel: "95%", marginOfError: "2,19 p.p." },
  { id: "smp-3500", label: "Plano Nacional Presidencial (N = 3.500 • IC 95% • ±1,66 p.p.)", sampleSize: 3500, confidenceLevel: "95%", marginOfError: "1,66 p.p." },
];

export interface LinkedSampleSummary {
  readonly idAmostra: number;
  readonly descricao: string;
  readonly tamanhoAmostral: number;
  readonly margemErro: string;
  readonly nivelConfianca: string;
}

export interface SurveyRecord {
  readonly id: string;
  readonly dbId?: number;
  readonly dbMunicipioId?: number;
  readonly dbAmostraId?: number;
  readonly dbProfissionalId?: number;
  readonly createdByUserId?: number;
  readonly createdByName?: string;
  readonly isBloqueada?: boolean;
  readonly amostraResumo?: LinkedSampleSummary;
  readonly protocolTse: string;
  readonly title: string;
  readonly office: SurveyOffice;
  readonly stateId?: string;
  readonly municipalityId?: string;
  readonly collaboratorId?: string;
  readonly samplePlanId?: string;
  readonly connectedUserName?: string;
  readonly cityUf: string;
  readonly statisticianName: string;
  readonly conreNumber: string;
  readonly sampleTarget: number;
  readonly sampleCollected: number;
  readonly fieldStartDate: string;
  readonly fieldEndDate: string;
  readonly status: SurveyStatus;
  readonly sha256Hash: string;
  readonly tseReceiptPdf?: string;
}

export const surveyFormSchema = z.object({
  protocolTse: z.string().min(5, "Protocolo TSE obrigatório (ex: BR-2026-001)"),
  title: z.string().min(5, "Título da pesquisa deve ter no mínimo 5 caracteres"),
  office: z.enum(["Presidente", "Governador", "Senador", "Prefeito"]),
  stateId: z.string().min(1, "Estado (FK) é obrigatório"),
  municipalityId: z.string().min(1, "Município (FK) é obrigatório"),
  collaboratorId: z.string().min(1, "Colaborador / Estatístico (FK) é obrigatório"),
  samplePlanId: z.string().min(1, "Plano de Tamanho da Amostra (FK) é obrigatório"),
  connectedUserName: z.string().optional(),
  cityUf: z.string().min(2, "UF ou Município é obrigatório"),
  statisticianName: z.string().min(3, "Nome do Estatístico obrigatório"),
  conreNumber: z.string().min(3, "Registro CONRE obrigatório"),
  sampleTarget: z.coerce.number().min(100, "Amostra mínima de 100 eleitores"),
  fieldStartDate: z.string().min(10, "Data inicial obrigatória"),
  fieldEndDate: z.string().min(10, "Data final obrigatória"),
  tseReceiptPdf: z.string().optional(),
});

export type SurveyFormData = z.infer<typeof surveyFormSchema>;

export const INITIAL_SURVEYS: readonly SurveyRecord[] = [
  {
    id: "surv-001",
    protocolTse: "SP-05190/2026",
    title: "Eleições 2026 — Intenção de Voto Governador SP 1º Turno",
    office: "Governador",
    cityUf: "São Paulo / SP",
    statisticianName: "Dra. Helena Vasconcelos",
    conreNumber: "CONRE-3 nº 9482-A",
    sampleTarget: 2000,
    sampleCollected: 2000,
    fieldStartDate: "2026-10-15",
    fieldEndDate: "2026-10-19",
    status: "CONSOLIDADA",
    sha256Hash: "3a9f8b2c1d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a",
    tseReceiptPdf: "Espelho_PesqEle_SP_05190_2026.pdf",
  },
  {
    id: "surv-002",
    protocolTse: "BR-08421/2026",
    title: "Eleição Presidencial 2026 — Sondagem de Cenários & Rejeição",
    office: "Presidente",
    cityUf: "BR - Nacional",
    statisticianName: "Dra. Helena Vasconcelos",
    conreNumber: "CONRE-3 nº 9482-A",
    sampleTarget: 3500,
    sampleCollected: 2480,
    fieldStartDate: "2026-10-24",
    fieldEndDate: "2026-10-28",
    status: "EM_CAMPO",
    sha256Hash: "b7e2c9a1d4f6e8a0b2c4d6f8a0c2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8",
    tseReceiptPdf: "Espelho_PesqEle_BR_08421_2026.pdf",
  },
  {
    id: "surv-003",
    protocolTse: "RJ-01124/2026",
    title: "Prefeitura RJ — Cenários de 2º Turno e Avaliação",
    office: "Prefeito",
    cityUf: "Rio de Janeiro / RJ",
    statisticianName: "Dr. Roberto Albuquerque",
    conreNumber: "CONRE-1 nº 3120-B",
    sampleTarget: 1200,
    sampleCollected: 0,
    fieldStartDate: "2026-11-01",
    fieldEndDate: "2026-11-05",
    status: "REGISTRADA_PESQELE",
    sha256Hash: "9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e",
    tseReceiptPdf: "Espelho_PesqEle_RJ_01124_2026.pdf",
  },
  {
    id: "surv-004",
    protocolTse: "MG-00982/2026",
    title: "Senado Federal MG — Estudo de Espontânea & Cotas",
    office: "Senador",
    cityUf: "Minas Gerais / MG",
    statisticianName: "Dr. Roberto Albuquerque",
    conreNumber: "CONRE-1 nº 3120-B",
    sampleTarget: 1800,
    sampleCollected: 0,
    fieldStartDate: "2026-11-10",
    fieldEndDate: "2026-11-14",
    status: "RASCUNHO",
    sha256Hash: "Pendência de Trava Criptográfica",
  },
];

