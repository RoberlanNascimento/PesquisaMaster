import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { App } from "../src/App";
import { useUiSessionStore } from "../src/lib/store";
import { rotateDiscOptionsClient } from "../src/features/fieldwork/ResearcherPwaFeature";
import type { QuestionOptionSchema } from "../src/api-client";

describe("PesquisaMaster Frontend — Fluxo Completo E2E & Componentes", () => {
  beforeEach(() => {
    useUiSessionStore.setState({ isAuthenticated: true });
  });
  it("mantém opções fixas (Branco/Nulo e NS/NR) no final durante o rodízio de disco", () => {
    const sampleOptions: readonly QuestionOptionSchema[] = [
      { code: "CAND_A", label: "Candidato Alfa", is_fixed: false },
      { code: "CAND_B", label: "Candidato Beta", is_fixed: false },
      { code: "CAND_C", label: "Candidato Gama", is_fixed: false },
      { code: "BRANCO_NULO", label: "Branco / Nulo", is_fixed: true },
      { code: "NS_NR", label: "NS / NR", is_fixed: true },
    ];

    const rotated = rotateDiscOptionsClient(sampleOptions, 1);
    expect(rotated.map((o) => o.code)).toEqual([
      "CAND_B",
      "CAND_C",
      "CAND_A",
      "BRANCO_NULO",
      "NS_NR",
    ]);
  });

  it("executa o fluxo Visão Geral (Gráficos por Cargo) -> Coleta Offline -> Supervisão -> Tabulação TSE -> Cadastro Cliente", () => {
    render(<App />);

    // 0. Verifica Visão Geral Integrada exclusiva (combobox de data/nome e gráficos por cargo)
    expect(screen.getByTestId("fixed-sidebar")).toBeDefined();
    expect(screen.getByTestId("standard-page-template").getAttribute("data-active-tab")).toBe(
      "overview"
    );
    expect(screen.getByTestId("integrated-overview-page")).toBeDefined();
    expect(screen.getByTestId("select-survey-date")).toBeDefined();
    expect(screen.getByTestId("select-survey-name")).toBeDefined();
    expect(screen.queryByTestId("btn-save-offline")).toBeNull();

    // Verifica gráficos de Presidente, Governador e Senador (Espontânea, Estimulada, Cenários, Rejeição e Citações)
    expect(screen.getByTestId("chart-spontaneous-PRESIDENTE")).toBeDefined();
    expect(screen.getByTestId("chart-stimulated-PRESIDENTE")).toBeDefined();
    expect(screen.getByTestId("chart-rejection-PRESIDENTE")).toBeDefined();
    expect(screen.getByTestId("citations-panel-PRESIDENTE")).toBeDefined();
    expect(screen.getByTestId("office-section-GOVERNADOR")).toBeDefined();
    expect(screen.getByTestId("office-section-SENADOR")).toBeDefined();

    // Filtra por data no combobox da Visão Geral Integrada
    fireEvent.change(screen.getByTestId("select-survey-date"), {
      target: { value: "2026-09-15" },
    });
    expect(screen.queryByTestId("office-section-GOVERNADOR")).toBeNull();

    // 1. Navega para Coleta Offline-First (PWA) e Fila de Sync
    fireEvent.click(screen.getByTestId("nav-field-pwa"));
    const saveBtn = screen.getByTestId("btn-save-offline");
    const syncBtn = screen.getByTestId("btn-sync-batch");
    expect(syncBtn.textContent).toContain("(0)");

    fireEvent.click(saveBtn);
    expect(syncBtn.textContent).toContain("(1)");
    expect(screen.getByTestId("sidebar-offline-badge").textContent).toBe("1");

    fireEvent.click(syncBtn);
    expect(syncBtn.textContent).toContain("(0)");

    // 2. Navega para Supervisão de Campo (Épico 3: Grade, Totalizadores, Filtros, Gaveta e Estorno de Cota)
    fireEvent.click(screen.getByTestId("nav-supervision"));
    expect(screen.getByTestId("total-received").textContent).toContain("5");
    expect(screen.getByTestId("total-pending").textContent).toContain("3");
    expect(screen.getByTestId("total-gps-alerts").textContent).toContain("2");
    expect(screen.getByTestId("total-validated").textContent).toContain("1");

    const statusBadge = screen.getByTestId("flagged-status");
    expect(statusBadge.textContent).toBe("FLAGGED");

    // Abre a Gaveta de Inspeção (Drawer) para ver mapa GPS e respostas do pacote
    fireEvent.click(screen.getByTestId("btn-inspect-int-fraud-02"));
    expect(screen.getByTestId("package-inspection-drawer")).toBeDefined();
    expect(screen.getByTestId("drawer-gps-map")).toBeDefined();
    expect(screen.getByTestId("drawer-answers-table")).toBeDefined();
    expect(screen.getByTestId("drawer-quota-count").textContent).toBe("14 / 20");

    // Reprova o pacote dentro da Gaveta e verifica estorno automático da cota (14 -> 13)
    fireEvent.click(screen.getByTestId("btn-drawer-reject"));
    expect(statusBadge.textContent).toBe("PURGED");
    expect(screen.getByTestId("drawer-quota-count").textContent).toBe("13 / 20");
    fireEvent.click(screen.getByTestId("btn-close-drawer"));
    expect(screen.queryByTestId("package-inspection-drawer")).toBeNull();

    // Aprova pacote pendente pkg-001
    fireEvent.click(screen.getByTestId("btn-approve-pkg-001"));
    expect(screen.getByTestId("total-validated").textContent).toContain("2");

    // Testa filtro de Pesquisa Em Andamento e Regiões Censitárias
    fireEvent.change(screen.getByTestId("filter-survey"), {
      target: { value: "SP-05190/2026 — Intenção de Voto Capital & Interior" },
    });
    expect(screen.queryByText("PK-BR08421-003")).toBeNull();
    expect(screen.getByText("PK-SP05190-004")).toBeDefined();

    fireEvent.change(screen.getByTestId("filter-survey"), {
      target: { value: "ALL" },
    });
    expect(screen.getByText("PK-BR08421-003")).toBeDefined();

    // 3. Navega para Dashboard Analítico TSE (Épico 4: Raking IPF, Votos Válidos, Crosstabs, 2º Turno e Exportação)
    fireEvent.click(screen.getByTestId("nav-analytics-tse"));
    expect(screen.getByTestId("raking-calibration-panel")).toBeDefined();
    expect(screen.getByTestId("raking-iterations-val").textContent).toBe("14");
    fireEvent.click(screen.getByTestId("btn-run-raking"));
    expect(screen.getByTestId("raking-iterations-val").textContent).toBe("15");

    expect(screen.getByText("Branco / Nulo / Indeciso")).toBeDefined();
    fireEvent.click(screen.getByTestId("toggle-valid-votes"));
    expect(screen.queryByText("Branco / Nulo / Indeciso")).toBeNull();

    // Crosstabs demográficos e exportação de pacote TSE
    fireEvent.change(screen.getByTestId("select-crosstab-dimension"), {
      target: { value: "ESCOLARIDADE" },
    });
    expect(screen.getByText("Ensino Médio Completo")).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-export-tse-package"));
    expect(screen.getByTestId("analytics-export-toast").textContent).toContain("TSE_PESQELE");

    // 4. Navegação para Cadastro de Empresa Cliente (abre o menu suspenso de Configurações -> Grupo Empresa -> Gerenciar)
    fireEvent.click(screen.getByTestId("btn-sidebar-footer-settings"));
    expect(screen.getByTestId("sidebar-company-group-label").textContent).toBe("Empresa");
    fireEvent.click(screen.getByTestId("nav-client-company"));
    expect(screen.getByTestId("standard-page-template").getAttribute("data-active-tab")).toBe(
      "client-company"
    );
    expect(screen.getByTestId("sidebar-clients-badge").textContent).toBe("1");

    fireEvent.change(screen.getByTestId("input-corporate-name"), {
      target: { value: "Editora Nacional de Opinião S.A." },
    });
    fireEvent.change(screen.getByTestId("input-cnpj"), {
      target: { value: "98.765.432/0001-10" },
    });
    fireEvent.click(screen.getByTestId("btn-submit-client-company"));

    expect(screen.getByTestId("sidebar-clients-badge").textContent).toBe("2");
    expect(screen.getAllByText("Editora Nacional de Opinião S.A.").length).toBeGreaterThan(0);

    // Subtela de Colaboradores do Cliente (Estatístico, Pesquisador, Auditor e Administradores)
    fireEvent.click(screen.getByTestId("subtab-client-collaborators"));
    expect(screen.getByTestId("client-collaborators-subscreen")).toBeDefined();
    expect(screen.getByTestId("collaborators-table")).toBeDefined();

    fireEvent.change(screen.getByTestId("select-collab-role"), {
      target: { value: "ESTATISTICO" },
    });
    fireEvent.change(screen.getByTestId("input-collab-name"), {
      target: { value: "Dr. Paulo Henrique Silva" },
    });
    fireEvent.change(screen.getByTestId("input-collab-email"), {
      target: { value: "paulo.conre@editoranacional.com.br" },
    });
    fireEvent.change(screen.getByTestId("input-collab-credential"), {
      target: { value: "CONRE-3 nº 11204-A" },
    });
    fireEvent.click(screen.getByTestId("btn-submit-collaborator"));
    expect(screen.getByText("Dr. Paulo Henrique Silva")).toBeDefined();
    expect(screen.getByText("CONRE-3 nº 11204-A")).toBeDefined();

    // 5. Navega para o Agregador Eleitoral (Épico 5: Cadastro Pesquisa, Meia-vida, Curva de Tendência e Tabela)
    fireEvent.click(screen.getByTestId("nav-aggregator"));
    expect(screen.getByTestId("standard-page-template").getAttribute("data-active-tab")).toBe(
      "aggregator"
    );
    expect(
      screen.getByText("5.3 Painel Visual do Agregador de Pesquisas Eleitorais (Polling Aggregator)")
    ).toBeDefined();
    expect(screen.getByTestId("aggregator-moving-average-panel")).toBeDefined();
    expect(screen.getByTestId("aggregator-trend-curve")).toBeDefined();
    expect(screen.getByTestId("aggregator-institutes-table")).toBeDefined();

    fireEvent.change(screen.getByTestId("select-aggregator-halflife"), {
      target: { value: "7.0000" },
    });
    expect(screen.getByText("43.1200%")).toBeDefined();

    fireEvent.change(screen.getByTestId("input-poll-protocol"), {
      target: { value: "BR-09555/2026" },
    });
    fireEvent.click(screen.getByTestId("btn-submit-external-poll"));
    expect(screen.getByText("BR-09555/2026")).toBeDefined();

    // 6. Navega para Planejamento TSE & Cotas Hare-Niemeyer (Épico 2)
    fireEvent.click(screen.getByTestId("nav-tse-planning"));
    expect(screen.getByTestId("tse-planning-page")).toBeDefined();
    expect(screen.getByTestId("survey-status-srv-plan-02").textContent).toContain("DRAFT");
    fireEvent.click(screen.getByTestId("btn-lock-tse-srv-plan-02"));
    expect(screen.getByTestId("survey-status-srv-plan-02").textContent).toContain("PUBLISHED_TSE");
    expect(screen.getByTestId("hare-niemeyer-table")).toBeDefined();

    // 7. Navega para Segurança RBAC & Hash-Chain SHA-256 (Épico 1) via menu suspenso de Configurações (Grupo Auditoria -> Botão Auditoria)
    expect(screen.queryByTestId("nav-security-audit")).toBeNull();
    fireEvent.click(screen.getByTestId("btn-sidebar-footer-settings"));
    expect(screen.getByTestId("sidebar-audit-group-label").textContent).toBe("Auditoria");
    fireEvent.click(screen.getByTestId("nav-security-audit"));
    expect(screen.getByTestId("security-audit-page")).toBeDefined();
    expect(screen.getByTestId("rbac-users-table")).toBeDefined();
    fireEvent.click(screen.getByTestId("btn-rebind-u-03"));
    expect(screen.getByTestId("device-binding-u-03").textContent).toBe("tablet-tse-sp-009-rebound");
    fireEvent.click(screen.getByTestId("btn-verify-hash-chain"));
    expect(screen.getByTestId("audit-chain-status-msg").textContent).toContain("SHA-256");
  });
});
