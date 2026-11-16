import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { App } from "../src/App";
import { useUiSessionStore } from "../src/lib/store";

describe("Telas dos 6 Pilares e 28 Tabelas do Banco de Dados", () => {
  beforeEach(() => {
    useUiSessionStore.setState({ isAuthenticated: true });
  });

  afterEach(() => {
    cleanup();
  });

  const remainingScreens = [
    {
      tab: "survey-scenario-candidates" as const,
      expectedH1: "Cartelas de Candidatos por Cenário",
    },
    {
      tab: "tabulation-reports" as const,
      expectedH1: "Relatórios Salvos & Cruzamentos Estatísticos",
    },
    {
      tab: "catalog-scales" as const,
      expectedH1: "Réguas e Escalas de Resposta",
    },
    {
      tab: "catalog-answer-options" as const,
      expectedH1: "Alternativas de Resposta",
    },
    {
      tab: "catalog-battery-items" as const,
      expectedH1: "Itens de Bateria & Matrizes de Avaliação",
    },
    {
      tab: "field-transfer" as const,
      expectedH1: "Transferência de Saldo de Metas",
    },
  ];

  for (const { tab, expectedH1 } of remainingScreens) {
    it(`renderiza com integridade a tela [${tab}] com h1 e grade`, () => {
      useUiSessionStore.setState({ activeTab: tab });
      const { container } = render(<App />);

      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1.textContent).toContain(expectedH1);

      const table = container.querySelector("table");
      expect(table).not.toBeNull();

      const standardPage = screen.getByTestId("standard-page-template");
      expect(standardPage.getAttribute("data-design-system")).toBe("Nocturne Editorial");
    });
  }
});
