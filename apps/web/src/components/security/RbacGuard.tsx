import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useUiSessionStore } from "../../lib/store";

export type AppRole =
  | "ADMIN_SISTEMA"
  | "ESTATISTICO_RESPONSAVEL"
  | "COORDENADOR_CAMPO"
  | "PESQUISADOR_CAMPO"
  | "ANALISTA_TABULACAO"
  | "AUDITOR_TSE"
  | "VISITANTE";

export function mapDbRoleToAppRole(role?: string | null): AppRole {
  const r = (role ?? "").trim().toLowerCase();
  if (!r) return "VISITANTE";
  if (r === "admin_sistema" || r.includes("master") || r.includes("admin") || r.includes("diretor")) {
    return "ADMIN_SISTEMA";
  }
  if (r === "estatistico_responsavel" || r.includes("estat")) return "ESTATISTICO_RESPONSAVEL";
  if (r === "coordenador_campo" || r.includes("coord") || r.includes("superv")) return "COORDENADOR_CAMPO";
  if (r === "analista_tabulacao" || r.includes("analista") || r.includes("tabul")) return "ANALISTA_TABULACAO";
  if (r === "auditor_tse" || r.includes("auditor")) return "AUDITOR_TSE";
  if (r === "pesquisador_campo" || r.includes("pesquisador")) return "PESQUISADOR_CAMPO";
  if (r === "visitante" || r.includes("visit") || r.includes("viewer")) return "VISITANTE";
  return "VISITANTE";
}

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
  {
    code: "VISITANTE",
    label: "Visualizador / Acesso Mínimo",
    badgeColor: "#64748b",
    description: "Acesso restrito somente leitura sem permissões administrativas",
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
  const sessionRole = useUiSessionStore((state) => state.currentUser?.role);
  const [currentRole, setCurrentRole] = useState<AppRole>(
    sessionRole ? mapDbRoleToAppRole(sessionRole) : initialRole,
  );

  useEffect(() => {
    if (sessionRole) {
      setCurrentRole(mapDbRoleToAppRole(sessionRole));
    }
  }, [sessionRole]);

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

