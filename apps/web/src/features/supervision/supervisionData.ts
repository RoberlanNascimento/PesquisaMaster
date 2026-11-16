export type PackageAuditStatus = "PENDING" | "FLAGGED" | "VALIDATED" | "REJECTED";

export type AntifraudAlertType =
  | "NONE"
  | "GPS_FORA_DO_SETOR"
  | "SPEEDING_TEMPO_CURTO"
  | "STRAIGHT_LINING_PADRAO";

export interface PackageAnswerSample {
  readonly questionCode: string;
  readonly questionText: string;
  readonly responseType: "ESPONTANEA" | "ESTIMULADA" | "REJEICAO" | "PERFIL";
  readonly selectedAnswer: string;
  readonly durationSec: number;
}

export interface GpsPointCoordinate {
  readonly id: string;
  readonly lat: string;
  readonly lon: string;
  readonly insideSector: boolean;
  readonly relXPercent: number;
  readonly relYPercent: number;
}

export interface FieldPackageItem {
  readonly id: string;
  readonly packageProtocol: string;
  readonly surveyId: string;
  readonly surveyLabel: string;
  readonly researcherName: string;
  readonly deviceHash: string;
  readonly regionSector: string;
  readonly quotaCellLabel: string;
  readonly quotaCurrentFilled: number;
  readonly quotaTargetTotal: number;
  readonly interviewsCount: number;
  readonly avgDurationSeconds: number;
  readonly gpsPrecisionMeters: string;
  readonly gpsAlert: boolean;
  readonly antifraudAlert: AntifraudAlertType;
  readonly antifraudDetail: string;
  readonly status: PackageAuditStatus;
  readonly submittedAt: string;
  readonly gpsPoints: readonly GpsPointCoordinate[];
  readonly sampleAnswers: readonly PackageAnswerSample[];
}

export const INITIAL_FIELD_PACKAGES: readonly FieldPackageItem[] = [
  {
    id: "pkg-001",
    packageProtocol: "PK-BR08421-001",
    surveyId: "BR-08421/2026",
    surveyLabel: "BR-08421/2026 — Eleições Gerais & Estaduais SP",
    researcherName: "Carlos Eduardo Mendes",
    deviceHash: "sha256:9f86d081884c7d65",
    regionSector: "Zona Sul — Setor 355030801",
    quotaCellLabel: "Feminino • 25 a 44 anos • Ensino Médio",
    quotaCurrentFilled: 18,
    quotaTargetTotal: 25,
    interviewsCount: 35,
    avgDurationSeconds: 142,
    gpsPrecisionMeters: "4.20",
    gpsAlert: false,
    antifraudAlert: "NONE",
    antifraudDetail: "Dentro do polígono IBGE • Assinatura HMAC íntegra",
    status: "PENDING",
    submittedAt: "2026-10-28 14:20",
    gpsPoints: [
      { id: "pt-101", lat: "-23.6214", lon: "-46.6382", insideSector: true, relXPercent: 42, relYPercent: 48 },
      { id: "pt-102", lat: "-23.6229", lon: "-46.6395", insideSector: true, relXPercent: 56, relYPercent: 52 },
      { id: "pt-103", lat: "-23.6208", lon: "-46.6371", insideSector: true, relXPercent: 49, relYPercent: 39 },
    ],
    sampleAnswers: [
      { questionCode: "Q01_ESP", questionText: "Em quem você votaria para Presidente (Espontânea)?", responseType: "ESPONTANEA", selectedAnswer: "Candidato Alfa (PSD)", durationSec: 34 },
      { questionCode: "Q02_EST", questionText: "Dentre estes nomes no disco, em quem votaria para Presidente?", responseType: "ESTIMULADA", selectedAnswer: "CAND_A — Candidato Alfa", durationSec: 48 },
      { questionCode: "Q03_REJ", questionText: "Em qual destes candidatos você NÃO votaria de jeito nenhum?", responseType: "REJEICAO", selectedAnswer: "CAND_B — Candidato Beta", durationSec: 32 },
      { questionCode: "Q04_GOV", questionText: "Para Governador do Estado (Estimulada)?", responseType: "ESTIMULADA", selectedAnswer: "GOV_1 — Governador Delta", durationSec: 28 },
    ],
  },
  {
    id: "int-fraud-02",
    packageProtocol: "PK-BR08421-002",
    surveyId: "BR-08421/2026",
    surveyLabel: "BR-08421/2026 — Eleições Gerais & Estaduais SP",
    researcherName: "Fernanda Rocha Lima",
    deviceHash: "sha256:4b227777d4dd1fc6",
    regionSector: "Zona Leste — Setor 355030802",
    quotaCellLabel: "Masculino • 45 a 59 anos • Fundamental",
    quotaCurrentFilled: 14,
    quotaTargetTotal: 20,
    interviewsCount: 28,
    avgDurationSeconds: 20,
    gpsPrecisionMeters: "85.00",
    gpsAlert: true,
    antifraudAlert: "GPS_FORA_DO_SETOR",
    antifraudDetail: "FORA_DO_PERIMETRO_GEOGRAFICO_SETOR (1.84km); TEMPO_ABAIXO_DO_MINIMO (20s < 45s)",
    status: "FLAGGED",
    submittedAt: "2026-10-28 15:05",
    gpsPoints: [
      { id: "pt-201", lat: "-23.5410", lon: "-46.4712", insideSector: false, relXPercent: 88, relYPercent: 16 },
      { id: "pt-202", lat: "-23.5398", lon: "-46.4690", insideSector: false, relXPercent: 91, relYPercent: 22 },
      { id: "pt-203", lat: "-23.5512", lon: "-46.4890", insideSector: true, relXPercent: 52, relYPercent: 58 },
    ],
    sampleAnswers: [
      { questionCode: "Q01_ESP", questionText: "Em quem você votaria para Presidente (Espontânea)?", responseType: "ESPONTANEA", selectedAnswer: "Não sabe / Indeciso", durationSec: 4 },
      { questionCode: "Q02_EST", questionText: "Dentre estes nomes no disco, em quem votaria para Presidente?", responseType: "ESTIMULADA", selectedAnswer: "CAND_B — Candidato Beta", durationSec: 6 },
      { questionCode: "Q03_REJ", questionText: "Em qual destes candidatos você NÃO votaria de jeito nenhum?", responseType: "REJEICAO", selectedAnswer: "CAND_A — Candidato Alfa", durationSec: 5 },
      { questionCode: "Q04_GOV", questionText: "Para Governador do Estado (Estimulada)?", responseType: "ESTIMULADA", selectedAnswer: "GOV_2 — Candidata Épsilon", durationSec: 5 },
    ],
  },
  {
    id: "pkg-003",
    packageProtocol: "PK-BR08421-003",
    surveyId: "BR-08421/2026",
    surveyLabel: "BR-08421/2026 — Eleições Gerais & Estaduais SP",
    researcherName: "Marcos Vinícius Souza",
    deviceHash: "sha256:e3b0c44298fc1c14",
    regionSector: "Centro — Setor 355030803",
    quotaCellLabel: "Feminino • 16 a 24 anos • Superior",
    quotaCurrentFilled: 12,
    quotaTargetTotal: 15,
    interviewsCount: 40,
    avgDurationSeconds: 165,
    gpsPrecisionMeters: "3.50",
    gpsAlert: false,
    antifraudAlert: "NONE",
    antifraudDetail: "Geofencing PostGIS validado • Sem anomalias",
    status: "VALIDATED",
    submittedAt: "2026-10-28 16:12",
    gpsPoints: [
      { id: "pt-301", lat: "-23.5505", lon: "-46.6333", insideSector: true, relXPercent: 46, relYPercent: 45 },
      { id: "pt-302", lat: "-23.5519", lon: "-46.6341", insideSector: true, relXPercent: 54, relYPercent: 51 },
    ],
    sampleAnswers: [
      { questionCode: "Q01_ESP", questionText: "Em quem você votaria para Presidente (Espontânea)?", responseType: "ESPONTANEA", selectedAnswer: "Candidato Alfa", durationSec: 42 },
      { questionCode: "Q02_EST", questionText: "Dentre estes nomes no disco, em quem votaria para Presidente?", responseType: "ESTIMULADA", selectedAnswer: "CAND_A — Candidato Alfa", durationSec: 55 },
    ],
  },
  {
    id: "pkg-004",
    packageProtocol: "PK-SP05190-004",
    surveyId: "SP-05190/2026",
    surveyLabel: "SP-05190/2026 — Intenção de Voto Capital & Interior",
    researcherName: "Juliana Paiva Castro",
    deviceHash: "sha256:7f83b1657ff1fc53",
    regionSector: "Campinas — Setor 350950201",
    quotaCellLabel: "Masculino • 25 a 44 anos • Ensino Médio",
    quotaCurrentFilled: 19,
    quotaTargetTotal: 25,
    interviewsCount: 30,
    avgDurationSeconds: 31,
    gpsPrecisionMeters: "42.10",
    gpsAlert: true,
    antifraudAlert: "SPEEDING_TEMPO_CURTO",
    antifraudDetail: "Tempo médio 31s (< 45s) • Desvio de precisão GPS > 30m",
    status: "PENDING",
    submittedAt: "2026-09-15 11:40",
    gpsPoints: [
      { id: "pt-401", lat: "-22.9056", lon: "-47.0608", insideSector: true, relXPercent: 48, relYPercent: 52 },
      { id: "pt-402", lat: "-22.9120", lon: "-47.0750", insideSector: false, relXPercent: 82, relYPercent: 20 },
    ],
    sampleAnswers: [
      { questionCode: "Q01_ESP", questionText: "Em quem você votaria para Presidente (Espontânea)?", responseType: "ESPONTANEA", selectedAnswer: "Candidato Beta", durationSec: 12 },
      { questionCode: "Q02_EST", questionText: "Dentre estes nomes no disco, em quem votaria para Presidente?", responseType: "ESTIMULADA", selectedAnswer: "CAND_B — Candidato Beta", durationSec: 19 },
    ],
  },
  {
    id: "pkg-005",
    packageProtocol: "PK-SP05190-005",
    surveyId: "SP-05190/2026",
    surveyLabel: "SP-05190/2026 — Intenção de Voto Capital & Interior",
    researcherName: "Carlos Eduardo Mendes",
    deviceHash: "sha256:9f86d081884c7d65",
    regionSector: "Zona Norte — Setor 355030804",
    quotaCellLabel: "Feminino • 60+ anos • Fundamental",
    quotaCurrentFilled: 9,
    quotaTargetTotal: 15,
    interviewsCount: 25,
    avgDurationSeconds: 118,
    gpsPrecisionMeters: "6.80",
    gpsAlert: false,
    antifraudAlert: "STRAIGHT_LINING_PADRAO",
    antifraudDetail: "Padrão repetitivo idêntico detectado em 92% das baterias",
    status: "REJECTED",
    submittedAt: "2026-09-15 17:30",
    gpsPoints: [
      { id: "pt-501", lat: "-23.5012", lon: "-46.6250", insideSector: true, relXPercent: 50, relYPercent: 50 },
    ],
    sampleAnswers: [
      { questionCode: "Q01_ESP", questionText: "Em quem você votaria para Presidente (Espontânea)?", responseType: "ESPONTANEA", selectedAnswer: "Branco / Nulo", durationSec: 30 },
    ],
  },
];

export const STATUS_BADGE_MAP: Record<
  PackageAuditStatus,
  { readonly label: string; readonly bg: string; readonly color: string }
> = {
  PENDING: { label: "PENDENTE", bg: "#fef3c7", color: "#92400e" },
  FLAGGED: { label: "FLAGGED", bg: "#fee2e2", color: "#991b1b" },
  VALIDATED: { label: "VALIDADO", bg: "#dcfce7", color: "#166534" },
  REJECTED: { label: "PURGED", bg: "#e2e8f0", color: "#334155" },
};
