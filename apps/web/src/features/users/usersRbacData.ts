import { z } from "zod";
import type { AppRole } from "../../components/security/RbacGuard";

export interface UserAccountRecord {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: AppRole;
  readonly conreOrCred: string;
  readonly isActive: boolean;
  readonly isMasterOwner?: boolean;
  readonly photoUrl?: string | null;
  readonly boundDeviceId: string | null;
  readonly lastLoginAt: string;
  readonly auditChainHash: string;
}

export const userAccountSchema = z.object({
  email: z.string().email("E-mail corporativo inválido"),
  fullName: z.string().min(3, "Nome completo obrigatório"),
  role: z.enum([
    "ADMIN_SISTEMA",
    "ESTATISTICO_RESPONSAVEL",
    "COORDENADOR_CAMPO",
    "PESQUISADOR_CAMPO",
    "ANALISTA_TABULACAO",
    "AUDITOR_TSE",
    "VISITANTE",
  ]),
  idNivelAcesso: z.union([z.number(), z.string()]).optional(),
  conreOrCred: z.string().min(2, "Credencial ou Registro obrigatório"),
  boundDeviceId: z.string().optional(),
});

export type UserAccountFormData = z.infer<typeof userAccountSchema>;

export const INITIAL_USERS: readonly UserAccountRecord[] = [
  {
    id: "usr-001",
    email: "admin@pesquisamaster.local",
    fullName: "Administrador Central da Plataforma",
    role: "ADMIN_SISTEMA",
    conreOrCred: "ADMIN-GLOBAL-KEY",
    isActive: true,
    boundDeviceId: null,
    lastLoginAt: "Há 2 minutos",
    auditChainHash: "8f2a1b9c4d3e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
  },
  {
    id: "usr-002",
    email: "helena.vasconcelos@pesquisamaster.local",
    fullName: "Dra. Helena Vasconcelos",
    role: "ESTATISTICO_RESPONSAVEL",
    conreOrCred: "CONRE-3 nº 9482-A",
    isActive: true,
    boundDeviceId: null,
    lastLoginAt: "Há 18 minutos",
    auditChainHash: "1d2e3f4a5b6c7d8e9f0a8f2a1b9c4d3e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
  },
  {
    id: "usr-003",
    email: "carlos.mendes@pesquisamaster.local",
    fullName: "Carlos Eduardo Mendes",
    role: "COORDENADOR_CAMPO",
    conreOrCred: "SUPERVISOR-SP-01",
    isActive: true,
    boundDeviceId: "laptop-coord-01",
    lastLoginAt: "Há 1 hora",
    auditChainHash: "7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a8f2a1b9c4d3e5f6a",
  },
  {
    id: "usr-004",
    email: "juliana.castro@pesquisamaster.local",
    fullName: "Juliana Paiva Castro",
    role: "PESQUISADOR_CAMPO",
    conreOrCred: "FIELD-COLLECTOR-SP",
    isActive: true,
    boundDeviceId: "tablet-tse-sp-001",
    lastLoginAt: "Há 4 minutos",
    auditChainHash: "5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a8f2a1b9c4d3e",
  },
  {
    id: "usr-005",
    email: "auditor.externo@tse.jus.br",
    fullName: "Dr. Marcelo Fagundes (Auditor TSE)",
    role: "AUDITOR_TSE",
    conreOrCred: "TSE-PESQELE-AUDIT-2026",
    isActive: true,
    boundDeviceId: null,
    lastLoginAt: "Ontem às 16:45",
    auditChainHash: "3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a8f2a1b9c4d3e5f6a7b8c9d0e1f2a",
  },
];

