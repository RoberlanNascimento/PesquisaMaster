import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { App } from "../src/App";
import { NOCTURNE_TOKENS, NOCTURNE_BUTTON_STYLES } from "../src/lib/designTokens";
import { useUiSessionStore } from "../src/lib/store";

describe("UI Completeness — Arquitetura de Telas e Design System das 7 Rotas Obrigatórias", () => {
  beforeEach(() => {
    useUiSessionStore.setState({ isAuthenticated: true });
  });

  afterEach(() => {
    cleanup();
  });

  const routes = [
    {
      tab: "surveys" as const,
      expectedH1: "Gestão de Pesquisas Eleitorais e Registro TSE",
    },
    {
      tab: "survey-composition" as const,
      expectedH1: "Composição de Pesquisas e Junção de Questionários TSE",
    },
    {
      tab: "questionnaires" as const,
      expectedH1: "Construtor de Questionários Dinâmicos e Rodízio de Disco",
    },
    {
      tab: "sampling" as const,
      expectedH1: "Planejamento Amostral e Cotas Hare-Niemeyer",
    },
    {
      tab: "regions" as const,
      expectedH1: "Gerenciamento de Regiões Municipais e Bairros (Plano Diretor)",
    },
    {
      tab: "researchers" as const,
      expectedH1: "Controle de Pesquisadores e Vínculo de Aparelhos",
    },
    {
      tab: "homologation" as const,
      expectedH1: "Mesa de Homologação de Campo e Antifraude",
    },
    {
      tab: "tabulation" as const,
      expectedH1: "Motor de Tabulação TSE, Raking (IPF) e Relatórios Cruzados",
    },
    {
      tab: "users-rbac" as const,
      expectedH1: "Controle de Usuários RBAC e Trilha Criptográfica",
    },
  ];

  for (const { tab, expectedH1 } of routes) {
    it(`renderiza com integridade a tela [${tab}] com h1, comboboxes e grade`, () => {
      useUiSessionStore.setState({ activeTab: tab });
      const { container } = render(<App />);

      // 0. Página Padrão (StandardPageTemplate) com sistema Nocturne Editorial (07-design.md)
      const standardPage = screen.getByTestId("standard-page-template");
      expect(standardPage.getAttribute("data-design-system")).toBe("Nocturne Editorial");
      expect(NOCTURNE_TOKENS.colors.warningPastel).toBe("#fde293");
      expect(NOCTURNE_BUTTON_STYLES.edit.color).toBe("#fde293");
      expect(screen.queryByTestId("standard-page-header")).toBeNull();
      expect(screen.getByTestId("standard-page-body")).toBeDefined();

      // 1. Cabeçalho H1 obrigatório
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1.textContent).toContain(expectedH1);

      // 2. Comboboxes de filtragem (selects)
      const selects = container.querySelectorAll("select");
      expect(selects.length).toBeGreaterThan(0);

      // 3. Mostrador em grade (table)
      const table = container.querySelector("table");
      expect(table).not.toBeNull();

      // 4. Botões de ação
      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  }

  it("executa operações CRUD completas no Construtor de Questionários", () => {
    useUiSessionStore.setState({ activeTab: "questionnaires" });
    render(<App />);

    // 1. Verifica presença dos botões globais e de linha
    expect(screen.getByTestId("btn-add-question")).toBeDefined();
    expect(screen.getByTestId("btn-export-questionnaire")).toBeDefined();
    expect(screen.getByTestId("btn-edit-question-P01")).toBeDefined();
    expect(screen.getByTestId("btn-duplicate-question-P01")).toBeDefined();
    expect(screen.getByTestId("btn-delete-question-P01")).toBeDefined();

    // 2. Duplica pergunta P01 (Cria P01B)
    fireEvent.click(screen.getByTestId("btn-duplicate-question-P01"));
    expect(screen.getByText("P01B")).toBeDefined();

    // 3. Abre gaveta de edição de P01B
    fireEvent.click(screen.getByTestId("btn-edit-question-P01B"));
    expect(screen.getByTestId("btn-save-question")).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-cancel-question"));

    // 4. Exclui a pergunta duplicada com modal de confirmação
    fireEvent.click(screen.getByTestId("btn-delete-question-P01B"));
    expect(screen.getByText("Remover Pergunta do Questionário")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /Remover Pergunta/i }));
    expect(screen.queryByText("P01B")).toBeNull();
  });

  it("gerencia assinatura, cotas e faturas no módulo comercial SaaS da Empresa", () => {
    useUiSessionStore.setState({ activeTab: "client-company" });
    render(<App />);

    // 1. Clica na sub-aba de Assinatura SaaS
    fireEvent.click(screen.getByTestId("subtab-client-subscription"));
    expect(screen.getByTestId("saas-subscription-subscreen")).toBeDefined();

    // 2. Verifica presença de planos e métricas de consumo
    expect(screen.getByText("Starter Regional")).toBeDefined();
    expect(screen.getByText("Enterprise Majoritária")).toBeDefined();
    expect(screen.getByText("FAT-2026-09")).toBeDefined();

    // 3. Simula troca de plano para Enterprise
    fireEvent.click(screen.getByTestId("btn-select-plan-enterprise"));
    expect(screen.getByTestId("saas-feedback-toast")).toBeDefined();

    // 4. Simula download de fatura NF-e
    fireEvent.click(screen.getByTestId("btn-download-nfe-FAT-2026-09"));
    expect(screen.getByText(/Download da NF-e FAT-2026-09 iniciado/i)).toBeDefined();
  });

  it("valida Etapas 2 a 7: Espelho PDF TSE, Branching, PWA Dinâmico/GPS, Áudio/Biometria, XLSX e Dossiê PDF", () => {
    // Etapa 2: Anexar Espelho PDF TSE na pesquisa surv-004 e validar FKs no formulário de Nova Pesquisa
    useUiSessionStore.setState({ activeTab: "surveys" });
    const { unmount: u1 } = render(<App />);
    fireEvent.click(screen.getByTestId("btn-attach-pdf-surv-004"));
    expect(screen.getByText(/Espelho_PesqEle_MG_00982_2026\.pdf/i)).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-new-survey-tse"));
    expect(screen.getByTestId("select-survey-state")).toBeDefined();
    expect(screen.getByTestId("select-survey-municipality")).toBeDefined();
    expect(screen.getByTestId("select-survey-collaborator")).toBeDefined();
    expect(screen.getByTestId("select-survey-sample-plan")).toBeDefined();
    u1();

    // Etapa 3: Editor Visual de Lógica de Salto (Branching)
    useUiSessionStore.setState({ activeTab: "questionnaires" });
    const { unmount: u2 } = render(<App />);
    fireEvent.click(screen.getByTestId("btn-open-branching"));
    expect(screen.getByTestId("questionnaire-branching-editor")).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-add-branching-rule"));
    expect(screen.getByTestId("branching-feedback")).toBeDefined();
    u2();

    // Etapa 4: Carga Dinâmica de Pesquisa e Captura GPS no PWA
    useUiSessionStore.setState({ activeTab: "field-pwa" });
    const { unmount: u3 } = render(<App />);
    fireEvent.change(screen.getByTestId("pwa-select-active-survey"), {
      target: { value: "SP-05190/2026" },
    });
    expect(screen.getByText(/Alexandre Silveira/i)).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-capture-gps"));
    expect(screen.getByTestId("pwa-gps-telemetry").textContent).toContain("-23.6219");
    u3();

    // Etapa 5: Auditoria de Áudio e Assinatura Digital na Mesa de Homologação
    useUiSessionStore.setState({ activeTab: "homologation" });
    const { unmount: u4 } = render(<App />);
    fireEvent.click(screen.getByTestId("btn-inspect-pkg-001"));
    expect(screen.getByTestId("drawer-biometric-audio-section")).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-toggle-audio-snippet"));
    expect(screen.getByText(/Reproduzindo confirmação/i)).toBeDefined();
    u4();

    // Etapa 6: Exportação de Matriz de Contingência XLSX na Tabulação TSE
    useUiSessionStore.setState({ activeTab: "tabulation" });
    const { unmount: u5 } = render(<App />);
    fireEvent.click(screen.getByTestId("btn-export-xlsx"));
    expect(screen.getByTestId("tabulation-feedback").textContent).toContain("XLSX Jornalística");
    u5();

    // Etapa 7: Geração de Dossiê Executivo PDF com Ficha Técnica TSE na Visão Geral
    useUiSessionStore.setState({ activeTab: "overview", isSidebarCollapsed: false });
    render(<App />);
    const sidebar = screen.getByTestId("fixed-sidebar");
    expect(sidebar.getAttribute("data-collapsed")).toBe("false");
    fireEvent.click(screen.getByTestId("btn-toggle-sidebar"));
    expect(sidebar.getAttribute("data-collapsed")).toBe("true");
    expect(screen.queryByTestId("btn-toggle-sidebar")).toBeNull();
    expect(screen.queryByTestId("btn-sidebar-search")).toBeNull();
    fireEvent.click(screen.getByTestId("sidebar-brand-logo"));
    expect(sidebar.getAttribute("data-collapsed")).toBe("false");
    fireEvent.click(screen.getByTestId("btn-generate-executive-pdf"));
    expect(screen.getByTestId("executive-dossier-modal")).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-download-dossier-pdf"));
    expect(screen.getByTestId("dossier-download-confirmation")).toBeDefined();
  });

  it("gerencia 5 telas exclusivas de CRUD em Regiões (País, Estados, Municípios, Regiões e Bairros) com combobox em cascata", () => {
    // 1. Tela exclusiva de País (Brasil configurado por padrão)
    useUiSessionStore.setState({ activeTab: "regions-country" });
    render(<App />);
    expect(screen.getByTestId("countries-crud-page")).toBeDefined();
    expect(screen.getByTestId("default-country-badge")).toBeDefined();
    expect(screen.getByTestId("nav-regions-country")).toBeDefined();
    expect(screen.getByTestId("nav-regions-states")).toBeDefined();
    expect(screen.getByTestId("nav-regions-municipalities")).toBeDefined();
    expect(screen.getByTestId("nav-regions")).toBeDefined();
    expect(screen.getByTestId("nav-regions-neighborhoods")).toBeDefined();

    // 2. Tela exclusiva de Estados (combobox de País)
    fireEvent.click(screen.getByTestId("nav-regions-states"));
    expect(screen.getByTestId("states-crud-page")).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-new-state"));
    expect(screen.getByTestId("select-state-country")).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-save-state"));
    expect(screen.getAllByText(/Paraná/i).length).toBeGreaterThan(0);

    // 3. Tela exclusiva de Municípios (comboboxes País -> Estado)
    fireEvent.click(screen.getByTestId("nav-regions-municipalities"));
    expect(screen.getByTestId("municipalities-crud-page")).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-new-municipality"));
    expect(screen.getByTestId("select-municipality-country")).toBeDefined();
    expect(screen.getByTestId("select-municipality-state")).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-save-municipality"));
    expect(screen.getAllByText(/São Bernardo do Campo/i).length).toBeGreaterThan(0);

    // 4. Tela exclusiva de Regiões (comboboxes País -> Estado -> Município)
    fireEvent.click(screen.getByTestId("nav-regions"));
    expect(screen.getByTestId("municipal-regions-page")).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-new-municipal-region"));
    expect(screen.getByTestId("select-region-country")).toBeDefined();
    expect(screen.getByTestId("select-region-state")).toBeDefined();
    expect(screen.getByTestId("select-region-municipality")).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-save-region"));
    expect(screen.getAllByText(/REG-SP-NORTE/i).length).toBeGreaterThan(0);

    // 5. Tela exclusiva de Bairros (comboboxes País -> Estado -> Município -> Região)
    fireEvent.click(screen.getByTestId("nav-regions-neighborhoods"));
    expect(screen.getByTestId("neighborhoods-crud-page")).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-new-neighborhood"));
    expect(screen.getByTestId("select-neighborhood-country")).toBeDefined();
    expect(screen.getByTestId("select-neighborhood-state")).toBeDefined();
    expect(screen.getByTestId("select-neighborhood-municipality")).toBeDefined();
    expect(screen.getByTestId("select-neighborhood-region")).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-save-neighborhood"));
    expect(screen.getAllByText(/Moema \/ Vila Mariana/i).length).toBeGreaterThan(0);

    // 6. Submenu Composição de Pesquisas em Gestão de Pesquisas TSE (expande o menu pai e recolhe o anterior)
    fireEvent.click(screen.getByTestId("nav-surveys-group"));
    expect(screen.queryByTestId("nav-regions-neighborhoods")).toBeNull();
    fireEvent.click(screen.getByTestId("nav-survey-composition"));
    expect(screen.getByTestId("survey-composition-page")).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-new-survey-composition"));
    expect(screen.getByTestId("select-composition-survey")).toBeDefined();
    expect(screen.getByTestId("select-composition-questionnaire")).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-append-questionnaire-to-survey"));
    fireEvent.click(screen.getByTestId("btn-save-composition"));
    expect(screen.getByTestId("survey-composition-toast")).toBeDefined();
  });
});

