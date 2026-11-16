import type { NavItemConfig } from "./SidebarNavItems";

export const GEO_DROPDOWN_ITEMS: readonly NavItemConfig[] = [
  {
    id: "sampling",
    path: "/plano-amostral",
    label: "Planejamento Amostral",
    subtitle: "Amostras",
    icon: "◩",
  },
  {
    id: "regions-municipalities",
    path: "/regioes/municipios",
    label: "Municípios",
    subtitle: "Municipios",
    icon: "🏙️",
  },
  {
    id: "regions-group",
    path: "/regioes-municipais",
    label: "Regiões e Zonas",
    subtitle: "Regiao_Zonas",
    icon: "🗺️",
    subItems: [
      { id: "regions-country", path: "/regioes/pais", label: "País", icon: "◎" },
      { id: "regions-states", path: "/regioes/estados", label: "Estados", icon: "🏛️" },
      { id: "regions", path: "/regioes-municipais", label: "Regiões", icon: "🗺️" },
    ],
  },
  {
    id: "regions-neighborhoods",
    path: "/regioes/bairros",
    label: "Bairros",
    subtitle: "Bairros_IBGE",
    icon: "🏘️",
  },
  {
    id: "geo-demography-ibge",
    path: "/geografia/demografia-ibge",
    label: "Perfil Demográfico",
    subtitle: "Demografia_IBGE",
    icon: "📊",
  },
  {
    id: "geo-electorate-tse",
    path: "/geografia/eleitorado-tse",
    label: "Histórico do Eleitorado",
    subtitle: "Eleitorado_TSE",
    icon: "🏛️",
  },
];

export const ACCESS_DROPDOWN_ITEMS: readonly NavItemConfig[] = [
  {
    id: "users-rbac",
    path: "/usuarios-rbac",
    label: "Usuários do Sistema",
    subtitle: "Usuarios",
    icon: "👤",
  },
  {
    id: "researchers",
    path: "/pesquisadores",
    label: "Profissionais de Campo",
    subtitle: "Profissionais",
    icon: "👥",
  },
  {
    id: "client-company",
    path: "/clientes",
    label: "Empresas Clientes",
    subtitle: "Empresas_SaaS",
    icon: "🏢",
  },
];

export const CATALOG_DROPDOWN_ITEMS: readonly NavItemConfig[] = [
  {
    id: "catalog-candidates",
    path: "/catalogo/candidatos-produtos",
    label: "Candidatos & Marcas",
    subtitle: "Candidatos_Produtos",
    icon: "🏷️",
  },
  {
    id: "catalog-questions",
    path: "/catalogo/perguntas",
    label: "Banco de Perguntas",
    subtitle: "Perguntas",
    icon: "❓",
  },
  {
    id: "catalog-battery-items",
    path: "/catalogo/itens-bateria",
    label: "Itens de Bateria",
    subtitle: "Itens_Bateria",
    icon: "🔋",
  },
  {
    id: "catalog-scales",
    path: "/catalogo/escalas",
    label: "Réguas e Escalas",
    subtitle: "Grupos_Opcoes",
    icon: "📏",
  },
  {
    id: "catalog-answer-options",
    path: "/catalogo/opcoes-resposta",
    label: "Alternativas de Resposta",
    subtitle: "Opcoes_Resposta",
    icon: "🔘",
  },
];

export const AUDIT_DROPDOWN_ITEMS: readonly NavItemConfig[] = [
  {
    id: "audit-reassignment",
    path: "/auditoria/reatribuicao",
    label: "Reatribuição de Entrevistas",
    subtitle: "Historico_Reatribuicao_Questionarios",
    icon: "🔄",
  },
  {
    id: "security-audit",
    path: "/auditoria/desbloqueios",
    label: "Desbloqueios Master",
    subtitle: "Historico_Desbloqueio_Pesquisas",
    icon: "🔓",
  },
];

export const SETTINGS_DROPDOWN_ITEMS = GEO_DROPDOWN_ITEMS;
export const COMPANY_DROPDOWN_ITEMS = ACCESS_DROPDOWN_ITEMS;
