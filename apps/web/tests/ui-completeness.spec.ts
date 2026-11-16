import { test, expect } from "@playwright/test";

const ROUTES_TO_TEST = [
  { path: "/pesquisas", title: "Gestão de Pesquisas Eleitorais e Registro TSE" },
  { path: "/questionarios", title: "Construtor de Questionários Dinâmicos e Rodízio de Disco" },
  { path: "/plano-amostral", title: "Planejamento Amostral e Cotas Hare-Niemeyer" },
  { path: "/pesquisadores", title: "Controle de Pesquisadores e Vínculo de Aparelhos" },
  { path: "/homologacao-campo", title: "Mesa de Homologação de Campo e Antifraude" },
  { path: "/tabulacao-tse", title: "Motor de Tabulação TSE, Raking (IPF) e Relatórios Cruzados" },
  { path: "/agregador", title: "Agregador de Pesquisas Eleitorais (Polling Aggregator)" },
  { path: "/usuarios-rbac", title: "Controle de Usuários RBAC e Trilha Criptográfica" },
];

test.describe("UI Completeness & Enterprise Design System Quality Gate", () => {
  for (const route of ROUTES_TO_TEST) {
    test(`valida arquitetura completa na rota ${route.path}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(route.path);
      await page.waitForLoadState("domcontentloaded");

      // 1. Cabeçalho H1 com título corporativo
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(route.title);

      // 2. Guias de Contexto (Tabs)
      const tabsNav = page.locator("nav[aria-label='Guias do Módulo']");
      if (await tabsNav.count()) {
        await expect(tabsNav).toBeVisible();
      }

      // 3. Comboboxes de Filtro (Selects)
      const selects = page.locator("select");
      expect(await selects.count()).toBeGreaterThan(0);

      // 4. Mostrador em Grade (Table)
      const table = page.locator("table");
      await expect(table).toBeVisible();

      // 5. Botões de Ação
      const buttons = page.locator("button");
      expect(await buttons.count()).toBeGreaterThan(0);

      // 6. Ausência total de erros no console
      expect(consoleErrors).toEqual([]);
    });
  }
});

