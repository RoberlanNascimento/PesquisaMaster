import React, { createContext, useContext, useState, useMemo } from "react";

export type AppRole =
  | "ADMIN_SISTEMA"
  | "ESTATISTICO_RESPONSAVEL"
  | "COORDENADOR_CAMPO"
  | "PESQUISADOR_CAMPO"
  | "ANALISTA_TABULACAO"
  | "AUDITOR_TSE";

export interface RoleInfo {
  readonly code: AppRole;
  readonly label: string;
  readonly badgeColor: string;
  readonly description: string;
}

export const APP_ROLES: readonly RoleInfo[] = [
  {
    code: "ADMIN_SISTEMA",
    label: "Administrador do Sistema",
    badgeColor: "#7c3aed",
    description: "Acesso irrestrito a configurações, auditoria e gestão de usuários",
  },
  {
    code: "ESTATISTICO_RESPONSAVEL",
    label: "Estatístico Responsável (CONRE)",
    badgeColor: "#2563eb",
    description: "Homologação de planos amostrais, raking e assinatura PesqEle",
  },
  {
    code: "COORDENADOR_CAMPO",
    label: "Coordenador de Campo",
    badgeColor: "#059669",
    description: "Supervisão de pesquisadores, cotas e homologação de pacotes",
  },
  {
    code: "PESQUISADOR_CAMPO",
    label: "Pesquisador de Campo",
    badgeColor: "#d97706",
    description: "Aplicação de questionários via PWA e sincronização offline",
  },
  {
    code: "ANALISTA_TABULACAO",
    label: "Analista de Tabulação",
    badgeColor: "#0891b2",
    description: "Geração de relatórios cruzados, gráficos e exportações",
  },
  {
    code: "AUDITOR_TSE",
    label: "Auditor Externo / TSE",
    badgeColor: "#dc2626",
    description: "Inspeção de hashes SHA-256, telemetria GPS e expurgos",
  },
];

interface RbacContextValue {
  readonly currentRole: AppRole;
  readonly setCurrentRole: (role: AppRole) => void;
  readonly hasPermission: (allowed: readonly AppRole[]) => boolean;
}

const RbacContext = createContext<RbacContextValue | null>(null);

export function RbacProvider({
  children,
  initialRole = "ADMIN_SISTEMA",
}: {
  readonly children: React.ReactNode;
  readonly initialRole?: AppRole;
}): React.JSX.Element {
  const [currentRole, setCurrentRole] = useState<AppRole>(initialRole);

  const value = useMemo<RbacContextValue>(() => {
    return {
      currentRole,
      setCurrentRole,
      hasPermission: (allowed: readonly AppRole[]) =>
        currentRole === "ADMIN_SISTEMA" || allowed.includes(currentRole),
    };
  }, [currentRole]);

  return <RbacContext.Provider value={value}>{children}</RbacContext.Provider>;
}

export function usePermissions(): RbacContextValue {
  const ctx = useContext(RbacContext);
  if (!ctx) {
    return {
      currentRole: "ADMIN_SISTEMA",
      setCurrentRole: () => undefined,
      hasPermission: () => true,
    };
  }
  return ctx;
}

export interface RbacGuardProps {
  readonly allowedRoles: readonly AppRole[];
  readonly children: React.ReactNode;
  readonly fallback?: React.ReactNode;
}

export function RbacGuard({
  allowedRoles,
  children,
  fallback = null,
}: RbacGuardProps): React.JSX.Element | null {
  const { hasPermission } = usePermissions();
  if (!hasPermission(allowedRoles)) {
    return fallback ? <>{fallback}</> : null;
  }
  return <>{children}</>;
}

