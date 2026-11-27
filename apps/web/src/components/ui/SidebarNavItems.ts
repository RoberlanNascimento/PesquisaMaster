import type { ActiveTab } from "../../lib/store";

export interface NavItemConfig {
  readonly id: ActiveTab;
  readonly path: string;
  readonly label: string;
  readonly icon: string;
  readonly subtitle?: string;
  readonly subItems?: readonly NavItemConfig[];
}

export * from "./SidebarStyles";
export * from "./SidebarSettingsItems";
export * from "./SidebarIcons";

/* ─────────────────────────────────────────────────────────────
 * MENU LATERAL PRINCIPAL (Sidebarnav) - Ícones Monocromáticos
 * ───────────────────────────────────────────────────────────── */
export const PRIMARY_NAV_ITEMS: readonly NavItemConfig[] = [
  {
    id: "overview",
    path: "/overview",
    label: "Dashboard",
    icon: "overview",
  },
  {
    id: "surveys-group",
    path: "/pesquisas",
    label: "Pesquisas",
    icon: "surveys",
    subItems: [
      {
        id: "surveys",
        path: "/pesquisas",
        label: "Cadastro & Registro",
        icon: "dot",
      },
      {
        id: "survey-composition",
        path: "/composicao-pesquisas",
        label: "Cenários de Teste",
        icon: "dot",
      },
      {
        id: "survey-scenario-candidates",
        path: "/pesquisas/cenario-candidatos",
        label: "Cartelas de Candidatos",
        icon: "dot",
      },
      {
        id: "survey-candidate-disc",
        path: "/pesquisas/disco-candidatos",
        label: "Disco de Candidatos",
        icon: "dot",
      },
      {
        id: "survey-app-preview",
        path: "/pesquisas/previa-app",
        label: "Prévia do App (Eleitor)",
        icon: "dot",
      },
    ],
  },
  {
    id: "sampling-group",
    path: "/plano-amostral",
    label: "Amostragem",
    icon: "sampling",
    subItems: [
      {
        id: "sampling",
        path: "/plano-amostral",
        label: "Planos Amostrais",
        icon: "dot",
      },
      {
        id: "sampling-dimensions",
        path: "/amostragem/variaveis-controle",
        label: "Variáveis de Controle",
        icon: "dot",
      },
      {
        id: "sampling-quotas",
        path: "/amostragem/matriz-cotas",
        label: "Matriz de Cotas",
        icon: "dot",
      },
      {
        id: "sampling-tse-ibge",
        path: "/amostragem/registros-tse-ibge",
        label: "Registros TSE / IBGE",
        icon: "dot",
      },
    ],
  },
  {
    id: "questionnaires-group",
    path: "/questionarios",
    label: "Formulários",
    icon: "questionnaires",
    subItems: [
      {
        id: "questionnaires",
        path: "/questionarios",
        label: "Gerenciador de Questionários",
        icon: "dot",
      },
      {
        id: "questionnaires-routing",
        path: "/questionarios/roteamento",
        label: "Roteamento & Saltos",
        icon: "dot",
      },
    ],
  },
  {
    id: "distribution",
    path: "/distribuicao",
    label: "Distribuição",
    icon: "sampling",
    subItems: [
      {
        id: "distribution",
        path: "/distribuicao",
        label: "Alocar Pesquisadores",
        icon: "dot",
      },
      {
        id: "audit-reassignment",
        path: "/auditoria/reatribuicao",
        label: "Realocar",
        icon: "dot",
      },
    ],
  },
  {
    id: "fieldwork-group",
    path: "/logistica/metas",
    label: "Logística de Campo",
    icon: "fieldwork",
    subItems: [
      {
        id: "field-metas",
        path: "/logistica/metas",
        label: "Distribuição de Metas",
        icon: "dot",
      },
      {
        id: "field-transfer",
        path: "/logistica/transferencia-saldo",
        label: "Transferência de Saldo",
        icon: "dot",
      },
      {
        id: "field-pwa",
        path: "/coleta-pwa",
        label: "Coleta PWA",
        icon: "dot",
      },
      {
        id: "homologation",
        path: "/homologacao-campo",
        label: "Homologação de Campo",
        icon: "dot",
      },
    ],
  },
  {
    id: "tabulation-group",
    path: "/tabulacao-tse",
    label: "Tabulação",
    icon: "tabulation",
    subItems: [
      {
        id: "tabulation-voter-card",
        path: "/tabulacao/ficha-eleitor",
        label: "Respondentes",
        icon: "dot",
      },
      {
        id: "tabulation-field-sessions",
        path: "/tabulacao/sessoes-campo",
        label: "Sessões de Campo",
        icon: "dot",
      },
      {
        id: "tabulation-raw-answers",
        path: "/tabulacao/respostas",
        label: "Fato de Respostas",
        icon: "dot",
      },
      {
        id: "tabulation-reports",
        path: "/tabulacao/relatorios",
        label: "Relatórios Salvos",
        icon: "dot",
      },
      {
        id: "tabulation",
        path: "/tabulacao-tse",
        label: "Relatórios Cruzados",
        icon: "dot",
      },
    ],
  },
  {
    id: "dispatch-tse-group",
    path: "/despacho-tse",
    label: "Relatórios",
    icon: "dispatch-tse",
    subItems: [
      {
        id: "tse-planning",
        path: "/despacho-tse",
        label: "Entregar ao STF",
        icon: "dot",
      },
      {
        id: "client-presentation",
        path: "/relatorios/apresentacao",
        label: "Apresentação",
        icon: "dot",
      },
    ],
  },
];
