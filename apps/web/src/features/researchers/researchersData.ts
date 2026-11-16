import { z } from "zod";

export type DeviceStatus = "VINCULADO" | "SEM_APARELHO" | "BLOQUEADO";

export interface ResearcherRecord {
  readonly id: string;
  readonly fullName: string;
  readonly maskedCpf: string;
  readonly coordinatorName: string;
  readonly assignedSector: string;
  readonly boundDeviceId: string | null;
  readonly deviceStatus: DeviceStatus;
  readonly validatedCount: number;
  readonly targetCount: number;
  readonly rejectionRate: number; // ex: 1.8%
  readonly lastSyncAt: string;
  readonly isSuspended: boolean;
  readonly auditAlertsCount: number;
}

export const researcherFormSchema = z.object({
  fullName: z.string().min(3, "Nome completo obrigatório"),
  cpf: z.string().min(11, "CPF deve ter no mínimo 11 dígitos"),
  coordinatorName: z.string().min(3, "Coordenador responsável obrigatório"),
  assignedSector: z.string().min(2, "Setor ou Bairro obrigatório"),
  targetCount: z.coerce.number().min(10, "Meta mínima de 10 entrevistas"),
});

export type ResearcherFormData = z.infer<typeof researcherFormSchema>;

export const INITIAL_RESEARCHERS: readonly ResearcherRecord[] = [
  {
    id: "res-001",
    fullName: "Juliana Paiva Castro",
    maskedCpf: "318.***.***-40",
    coordinatorName: "Carlos Eduardo Mendes",
    assignedSector: "São Paulo — Zona Sul (Setor 014)",
    boundDeviceId: "tablet-tse-sp-001",
    deviceStatus: "VINCULADO",
    validatedCount: 142,
    targetCount: 150,
    rejectionRate: 0.7,
    lastSyncAt: "Há 4 minutos",
    isSuspended: false,
    auditAlertsCount: 0,
  },
  {
    id: "res-002",
    fullName: "Ricardo Silveira Prado",
    maskedCpf: "089.***.***-22",
    coordinatorName: "Carlos Eduardo Mendes",
    assignedSector: "São Paulo — Centro (Setor 002)",
    boundDeviceId: "tablet-tse-sp-002",
    deviceStatus: "VINCULADO",
    validatedCount: 110,
    targetCount: 150,
    rejectionRate: 1.2,
    lastSyncAt: "Há 12 minutos",
    isSuspended: false,
    auditAlertsCount: 0,
  },
  {
    id: "res-003",
    fullName: "Aline Ferreira Santos",
    maskedCpf: "412.***.***-98",
    coordinatorName: "Carlos Eduardo Mendes",
    assignedSector: "São Paulo — Zona Leste (Setor 089)",
    boundDeviceId: "tablet-tse-sp-003",
    deviceStatus: "VINCULADO",
    validatedCount: 78,
    targetCount: 150,
    rejectionRate: 6.4,
    lastSyncAt: "Há 35 minutos",
    isSuspended: false,
    auditAlertsCount: 3,
  },
  {
    id: "res-004",
    fullName: "Lucas Morais Antunes",
    maskedCpf: "540.***.***-11",
    coordinatorName: "Carlos Eduardo Mendes",
    assignedSector: "São Paulo — Zona Norte (Setor 033)",
    boundDeviceId: null,
    deviceStatus: "SEM_APARELHO",
    validatedCount: 0,
    targetCount: 120,
    rejectionRate: 0.0,
    lastSyncAt: "Nunca",
    isSuspended: false,
    auditAlertsCount: 0,
  },
  {
    id: "res-005",
    fullName: "Patrícia Gomes Rocha",
    maskedCpf: "771.***.***-05",
    coordinatorName: "Carlos Eduardo Mendes",
    assignedSector: "São Paulo — Zona Oeste (Setor 050)",
    boundDeviceId: "tablet-tse-sp-009",
    deviceStatus: "BLOQUEADO",
    validatedCount: 22,
    targetCount: 100,
    rejectionRate: 18.2,
    lastSyncAt: "Ontem às 18:30",
    isSuspended: true,
    auditAlertsCount: 5,
  },
];

