import React, { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SidebarNav } from "./components/ui/SidebarNav";
import { StandardPageTemplate } from "./components/layout/StandardPageTemplate";
import { WorkspaceTabResolver } from "./components/layout/WorkspaceTabResolver";
import { RbacProvider } from "./components/security/RbacGuard";
import { LoginFeature } from "./features/auth/LoginFeature";
import { NOCTURNE_TOKENS } from "./lib/designTokens";
import { queryClient, useUiSessionStore } from "./lib/store";
import { PATH_TO_TAB, TAB_METADATA } from "./lib/appRoutes";

function MainWorkspace(): React.JSX.Element {
  const isAuthenticated = useUiSessionStore((state) => state.isAuthenticated);
  const activeTab = useUiSessionStore((state) => state.activeTab);
  const setActiveTab = useUiSessionStore((state) => state.setActiveTab);
  const isSidebarCollapsed = useUiSessionStore((state) => state.isSidebarCollapsed);
  const themeMode = useUiSessionStore((state) => state.themeMode);
  const syncSystemTheme = useUiSessionStore((state) => state.syncSystemTheme);

  useEffect(() => {
    syncSystemTheme();
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    const handleChange = (): void => {
      syncSystemTheme();
    };
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handleChange);
      return () => mql.removeEventListener("change", handleChange);
    }
    return undefined;
  }, [themeMode, syncSystemTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const pathname = window.location.pathname;
    const matched = PATH_TO_TAB[pathname];
    if (matched) {
      setActiveTab(matched);
    }

    const handlePopState = (): void => {
      const p = window.location.pathname;
      const tab = PATH_TO_TAB[p];
      if (tab) setActiveTab(tab);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [setActiveTab]);

  if (!isAuthenticated) {
    return <LoginFeature />;
  }

  const meta = TAB_METADATA[activeTab] ?? {
    domain: "Plataforma Eleitoral TSE",
    label: activeTab,
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: NOCTURNE_TOKENS.colors.surfaceBase,
        color: NOCTURNE_TOKENS.colors.textPrimary,
        fontFamily: NOCTURNE_TOKENS.typography.fontFamily,
      }}
    >
      <SidebarNav />
      <main
        data-testid="central-page-presentation-area"
        style={{
          marginLeft: isSidebarCollapsed ? "72px" : "260px",
          flex: 1,
          minWidth: 0,
          display: "flex",
          justifyContent: "center",
          backgroundColor: NOCTURNE_TOKENS.colors.surfaceBase,
          transition: "margin-left 0.2s ease",
        }}
      >
        <StandardPageTemplate
          activeTab={activeTab}
          domainLabel={meta.domain}
          pageLabel={meta.label}
        >
          <WorkspaceTabResolver activeTab={activeTab} />
        </StandardPageTemplate>
      </main>
    </div>
  );
}

export function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <RbacProvider>
        <MainWorkspace />
      </RbacProvider>
    </QueryClientProvider>
  );
}
