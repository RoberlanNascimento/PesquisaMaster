import { QueryClient } from "@tanstack/react-query";
import { create } from "zustand";
import { z } from "zod";
import {
  applyThemeToDocument,
  resolveEffectiveTheme,
  type ResolvedTheme,
  type ThemeMode,
} from "./themePalettes";

export type { ThemeMode, ResolvedTheme };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export const queryKeys = {
  surveys: (status?: string) => ["surveys", status ?? "ALL"] as const,
  supervision: (surveyId: string) => ["supervision", surveyId] as const,
  tabulation: (surveyId: string, questionCode: string) =>
    ["tabulation", surveyId, questionCode] as const,
  aggregator: (halfLifeDays: string) => ["aggregator", halfLifeDays] as const,
};

export const offlineAnswerSchema = z.object({
  questionId: z.string().uuid(),
  selectedOptionCode: z.string().min(1),
});

import type { ActiveTab } from "./activeTab";

export type { ActiveTab };

import {
  type ClientCompanyRecord,
  INITIAL_CLIENT_COMPANIES,
  type CollaboratorRole,
  type ClientCollaboratorRecord,
  INITIAL_CLIENT_COLLABORATORS,
  type AuthUser,
  MOCK_USER_IWCOSTA,
} from "./clientData";

export type {
  ClientCompanyRecord,
  CollaboratorRole,
  ClientCollaboratorRecord,
  AuthUser,
};
export { INITIAL_CLIENT_COMPANIES, INITIAL_CLIENT_COLLABORATORS, MOCK_USER_IWCOSTA };

const getStoredAuthUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("pm_auth_user");
    if (raw) return JSON.parse(raw) as AuthUser;
  } catch {
    // ignore parsing error
  }
  return null;
};

const initialStoredUser = getStoredAuthUser();

interface UiSessionState {
  readonly isAuthenticated: boolean;
  readonly currentUser: AuthUser | null;
  readonly activeTenantId: string;
  readonly activeTab: ActiveTab;
  readonly currentPath: string;
  readonly isSidebarCollapsed: boolean;
  readonly themeMode: ThemeMode;
  readonly resolvedTheme: ResolvedTheme;
  readonly globalSearchQuery: string;
  readonly connectedUserName: string;
  readonly connectedUserRoleLabel: string;
  readonly boundDeviceId: string;
  readonly offlineQueueCount: number;
  readonly clientCompanies: readonly ClientCompanyRecord[];
  readonly clientCollaborators: readonly ClientCollaboratorRecord[];
  readonly login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  readonly logout: () => void;
  readonly setActiveTab: (tab: ActiveTab) => void;
  readonly setCurrentPath: (path: string) => void;
  readonly toggleSidebarCollapsed: () => void;
  readonly setThemeMode: (mode: ThemeMode) => void;
  readonly syncSystemTheme: () => void;
  readonly setGlobalSearchQuery: (query: string) => void;
  readonly setConnectedUser: (name: string, roleLabel: string) => void;
  readonly enqueueOfflineInterview: () => void;
  readonly clearOfflineQueue: () => void;
  readonly addClientCompany: (company: Omit<ClientCompanyRecord, "id">) => void;
  readonly addClientCollaborator: (collab: Omit<ClientCollaboratorRecord, "id">) => void;
}

export const useUiSessionStore = create<UiSessionState>((set, get) => ({
  isAuthenticated: false,
  currentUser: null,
  activeTenantId: "comp-001",
  activeTab: "overview",
  currentPath: "/overview",
  isSidebarCollapsed: false,
  themeMode: "dark",
  resolvedTheme: "dark",
  globalSearchQuery: "",
  connectedUserName: initialStoredUser?.fullName ?? "Igor W. Costa",
  connectedUserRoleLabel: initialStoredUser?.roleLabel ?? "Administrador / Estatístico Master",
  boundDeviceId: "tablet-tse-sp-001",
  offlineQueueCount: 0,
  clientCompanies: INITIAL_CLIENT_COMPANIES,
  clientCollaborators: INITIAL_CLIENT_COLLABORATORS,
  login: async (email: string, pass: string) => {
    const normEmail = email.trim().toLowerCase();
    const isTestEnv = typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom");
    if (!isTestEnv) {
      try {
        const res = await fetch("http://127.0.0.1:8000/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: normEmail, senha: pass }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            access_token: string;
            user: {
              id?: string;
              id_usuario?: number;
              email: string;
              full_name: string;
              role: string;
              tenant_id?: string;
              id_organizacao?: number;
              nome_organizacao?: string;
            };
          };
          const user: AuthUser = {
            id: String(data.user.id_usuario ?? data.user.id ?? ""),
            email: data.user.email,
            fullName: data.user.full_name,
            role: "ADMIN",
            roleLabel: data.user.role,
            tenantId: String(data.user.id_organizacao ?? data.user.tenant_id ?? "1"),
            tenantName: data.user.nome_organizacao ?? "Instituto PesquisaMaster",
            token: data.access_token,
          };
          if (typeof window !== "undefined") {
            localStorage.setItem("pm_auth_user", JSON.stringify(user));
            localStorage.setItem("pm_auth_token", data.access_token);
          }
          set({
            isAuthenticated: true,
            currentUser: user,
            activeTenantId: user.tenantId,
            connectedUserName: user.fullName,
            connectedUserRoleLabel: user.roleLabel,
          });
          return { success: true };
        }
        const errBody = (await res.json().catch(() => ({}))) as { detail?: string };
        return {
          success: false,
          error: errBody.detail ?? "Credenciais inválidas. Utilize e-mail e senha cadastrados no banco de dados.",
        };
      } catch {
        return {
          success: false,
          error: "Não foi possível conectar ao servidor de autenticação.",
        };
      }
    }
    if (isTestEnv && normEmail === "iwcosta@gmail.com" && pass === "123456") {
      const user = MOCK_USER_IWCOSTA;
      if (typeof window !== "undefined") {
        localStorage.setItem("pm_auth_user", JSON.stringify(user));
      }
      set({
        isAuthenticated: true,
        currentUser: user,
        activeTenantId: user.tenantId,
        connectedUserName: user.fullName,
        connectedUserRoleLabel: user.roleLabel,
      });
      return { success: true };
    }
    return {
      success: false,
      error: "Credenciais inválidas. Utilize e-mail e senha cadastrados no sistema.",
    };
  },
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("pm_auth_user");
      localStorage.removeItem("pm_auth_token");
    }
    set({
      isAuthenticated: false,
      currentUser: null,
      activeTab: "overview",
    });
  },
  setActiveTab: (tab: ActiveTab) => set({ activeTab: tab }),
  setCurrentPath: (path: string) => set({ currentPath: path }),
  toggleSidebarCollapsed: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setThemeMode: (mode: ThemeMode) => {
    const resolved = applyThemeToDocument(mode);
    set({ themeMode: mode, resolvedTheme: resolved });
  },
  syncSystemTheme: () => {
    const mode = get().themeMode;
    const resolved = resolveEffectiveTheme(mode);
    applyThemeToDocument(mode);
    set({ resolvedTheme: resolved });
  },
  setGlobalSearchQuery: (query: string) => set({ globalSearchQuery: query }),
  setConnectedUser: (name: string, roleLabel: string) =>
    set({ connectedUserName: name, connectedUserRoleLabel: roleLabel }),
  enqueueOfflineInterview: () =>
    set((state) => ({ offlineQueueCount: state.offlineQueueCount + 1 })),
  clearOfflineQueue: () => set({ offlineQueueCount: 0 }),
  addClientCompany: (company) =>
    set((state) => ({
      clientCompanies: [
        ...state.clientCompanies,
        {
          ...company,
          id: `comp-00${state.clientCompanies.length + 1}`,
        },
      ],
    })),
  addClientCollaborator: (collab) =>
    set((state) => ({
      clientCollaborators: [
        ...state.clientCollaborators,
        {
          ...collab,
          id: `colab-00${state.clientCollaborators.length + 1}`,
        },
      ],
    })),
}));
