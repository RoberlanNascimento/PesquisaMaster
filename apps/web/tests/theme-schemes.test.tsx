import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { App } from "../src/App";
import { DesignSchemeShowcasePanel } from "../src/components/ui/DesignSchemeShowcasePanel";
import { useUiSessionStore } from "../src/lib/store";
import { THEME_PALETTES } from "../src/lib/themePalettes";

describe("Theme Schemes (Escuro, Claro e Sistema) — 06-ui-design-system.md", () => {
  beforeEach(() => {
    useUiSessionStore.setState({ isAuthenticated: true });
  });

  afterEach(() => {
    cleanup();
    useUiSessionStore.getState().setThemeMode("dark");
  });

  it("alterna entre Escuro (dark), Claro (light) e Sistema (system) e valida que o cabeçalho e a navbar foram removidos", () => {
    useUiSessionStore.setState({ activeTab: "overview", themeMode: "dark", resolvedTheme: "dark" });
    render(<App />);

    const page = screen.getByTestId("standard-page-template");
    expect(screen.queryByTestId("standard-page-header")).toBeNull();
    expect(screen.queryByTestId("top-corporate-navbar")).toBeNull();
    expect(page.getAttribute("data-theme-mode")).toBe("dark");
    expect(page.getAttribute("data-resolved-theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    // Valida paleta e showcase de design isolado
    const { unmount } = render(<DesignSchemeShowcasePanel />);
    fireEvent.click(screen.getByTestId("btn-toggle-design-showcase"));
    expect(screen.getByTestId("design-scheme-showcase-panel")).toBeDefined();

    // Alterna para Esquema Claro (light) via ThemeModeSwitcher do Showcase
    fireEvent.click(screen.getByTestId("showcase-theme-switcher-btn-light"));
    expect(page.getAttribute("data-theme-mode")).toBe("light");
    expect(page.getAttribute("data-resolved-theme")).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    // Alterna para Esquema Sistema (system) via ThemeModeSwitcher do Showcase
    fireEvent.click(screen.getByTestId("showcase-theme-switcher-btn-system"));
    expect(page.getAttribute("data-theme-mode")).toBe("system");
    expect(document.documentElement.getAttribute("data-theme-mode")).toBe("system");
    expect(screen.getByTestId("showcase-theme-switcher-resolved-badge").textContent).toContain(
      "Sistema"
    );
    expect(screen.getByTestId("design-scheme-card-dark")).toBeDefined();
    expect(screen.getByTestId("design-scheme-card-light")).toBeDefined();
    expect(THEME_PALETTES.dark.surfaceBase).toBe("#131313");
    expect(THEME_PALETTES.light.surfaceBase).toBe("#f8f9fa");
    expect(THEME_PALETTES.dark.warningPastel).toBe("#fde293");
    expect(THEME_PALETTES.light.warningPastel).toBe("#fde293");

    // Alterna de volta para Escuro usando o switcher dentro do painel de apresentação
    fireEvent.click(screen.getByTestId("showcase-theme-switcher-btn-dark"));
    expect(page.getAttribute("data-theme-mode")).toBe("dark");
    expect(page.getAttribute("data-resolved-theme")).toBe("dark");
    unmount();
  });

  it("renderiza a SidebarNav fixa no topo e rodapé fixo com usuário conectado e botão de configurações, ocultando a pesquisa quando recolhida", () => {
    useUiSessionStore.setState({
      activeTab: "overview",
      isSidebarCollapsed: false,
      globalSearchQuery: "",
    });
    render(<App />);

    expect(screen.queryByTestId("top-corporate-navbar")).toBeNull();

    const sidebar = screen.getByTestId("fixed-sidebar");
    expect((sidebar as HTMLElement).style.position).toBe("fixed");
    expect((sidebar as HTMLElement).style.top).toBe("0px");

    // Verifica logo, nome da empresa, ausência do subtítulo antigo e presença da lupa de pesquisa quando expandido
    expect(screen.getByTestId("sidebar-brand-logo").textContent).toBe("PM");
    expect(screen.getByTestId("sidebar-company-name").textContent).toBe("PesquisaMaster");
    expect(screen.queryByText(/Nocturne • Res\. TSE 23\.600/i)).toBeNull();

    const searchBtn = screen.getByTestId("btn-sidebar-search");
    expect(searchBtn).toBeDefined();
    fireEvent.click(searchBtn);

    const searchInput = screen.getByTestId("sidebar-search-input");
    fireEvent.change(searchInput, { target: { value: "BR-08421" } });
    expect(useUiSessionStore.getState().globalSearchQuery).toBe("BR-08421");

    // Verifica barra inferior fixa: apenas avatar + nome do usuário à esquerda e botão de configurações à direita
    expect(screen.getByTestId("sidebar-footer-region")).toBeDefined();
    expect(screen.getByTestId("sidebar-user-avatar").textContent).toBe("HV");
    expect(screen.getByTestId("sidebar-user-name").textContent).toBe("Dra. Helena Vasconcelos");
    expect(screen.getByTestId("btn-sidebar-footer-settings")).toBeDefined();

    // Quando o menu recolher, os botões de pesquisar e recolher ficam ocultos, restando apenas o logo
    fireEvent.click(screen.getByTestId("btn-toggle-sidebar"));
    expect(screen.queryByTestId("btn-sidebar-search")).toBeNull();
    expect(screen.queryByTestId("btn-toggle-sidebar")).toBeNull();
    expect(screen.getByTestId("sidebar-brand-logo")).toBeDefined();
    expect(screen.getByTestId("sidebar-footer-region").style.flexDirection).toBe("column-reverse");

    // Com o sidebar recolhido, ao clicar no logo da empresa, a navbar expande novamente
    fireEvent.click(screen.getByTestId("sidebar-brand-logo"));
    expect(screen.getByTestId("btn-sidebar-search")).toBeDefined();
    expect(screen.getByTestId("btn-toggle-sidebar")).toBeDefined();

    // Verifica comportamento de acordeão (expande ao clicar no menu com subitens e recolhe ao clicar nele mesmo ou em outro menu)
    expect(screen.queryByTestId("nav-surveys")).toBeNull();
    fireEvent.click(screen.getByTestId("nav-surveys-group"));
    expect(screen.getByTestId("nav-surveys")).toBeDefined();
    fireEvent.click(screen.getByTestId("nav-surveys-group"));
    expect(screen.queryByTestId("nav-surveys")).toBeNull();

    // Expande novamente e clica em outro menu ("overview"), verificando que o submenu anterior recolhe
    fireEvent.click(screen.getByTestId("nav-surveys-group"));
    expect(screen.getByTestId("nav-surveys")).toBeDefined();
    fireEvent.click(screen.getByTestId("nav-overview"));
    expect(screen.queryByTestId("nav-surveys")).toBeNull();

    // Verifica que Configurações, Empresa (Gerenciar, Usuários, Pesquisadores) e Auditoria foram removidos da lista principal da sidebarnav e agora abrem em menu suspenso pelo botão do rodapé
    expect(screen.queryByTestId("nav-settings")).toBeNull();
    expect(screen.queryByTestId("nav-company")).toBeNull();
    expect(screen.queryByTestId("nav-researchers")).toBeNull();
    expect(screen.queryByTestId("nav-security-audit")).toBeNull();
    expect(screen.queryByTestId("sidebar-settings-dropdown")).toBeNull();
    fireEvent.click(screen.getByTestId("btn-sidebar-footer-settings"));
    expect(screen.getByTestId("sidebar-settings-dropdown")).toBeDefined();
    expect(screen.getByTestId("sidebar-settings-group-label").textContent).toBe("Configurações");
    expect(screen.getByTestId("sidebar-company-group-label").textContent).toBe("Empresa");
    expect(screen.getByTestId("sidebar-audit-group-label").textContent).toBe("Auditoria");
    expect(screen.getByTestId("nav-sampling")).toBeDefined();
    expect(screen.getByTestId("nav-regions-group")).toBeDefined();
    expect(screen.getByTestId("nav-client-company")).toBeDefined();
    expect(screen.getByTestId("nav-users-rbac")).toBeDefined();
    expect(screen.getByTestId("nav-researchers")).toBeDefined();
    expect(screen.getByTestId("nav-security-audit")).toBeDefined();

    // Clica em Regiões no menu suspenso para apresentar País, Estados, Municípios, Regiões, Bairros
    fireEvent.click(screen.getByTestId("nav-regions-group"));
    expect(screen.getByTestId("nav-regions-country")).toBeDefined();
    expect(screen.getByTestId("nav-regions-states")).toBeDefined();
    expect(screen.getByTestId("nav-regions-municipalities")).toBeDefined();
    expect(screen.getByTestId("nav-regions")).toBeDefined();
    expect(screen.getByTestId("nav-regions-neighborhoods")).toBeDefined();

    expect(screen.getByTestId("central-page-presentation-area")).toBeDefined();
    expect(screen.getByTestId("standard-page-template")).toBeDefined();
  });
});

