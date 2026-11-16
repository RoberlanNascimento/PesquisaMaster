export interface SaasPlan {
  readonly id: string;
  readonly name: string;
  readonly price: string;
  readonly description: string;
  readonly maxSurveys: number;
  readonly maxInterviews: number;
  readonly maxDevices: number;
  readonly isPopular?: boolean;
}

export const SAAS_PLANS: readonly SaasPlan[] = [
  {
    id: "starter",
    name: "Starter Regional",
    price: "R$ 1.900,00/mês",
    description: "Ideal para institutos municipais e pesquisas locais de pequeno porte",
    maxSurveys: 3,
    maxInterviews: 5000,
    maxDevices: 10,
  },
  {
    id: "pro",
    name: "Pro Eleitoral (Plano Atual)",
    price: "R$ 4.850,00/mês",
    description: "Para institutos estaduais com rodízio TSE, Raking IPF e supervisão GPS",
    maxSurveys: 10,
    maxInterviews: 20000,
    maxDevices: 25,
    isPopular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise Majoritária",
    price: "R$ 9.500,00/mês",
    description: "Cobertura nacional ilimitada, suporte CONRE prioritário e auditoria full",
    maxSurveys: 999,
    maxInterviews: 100000,
    maxDevices: 100,
  },
];

export interface SaasInvoice {
  readonly id: string;
  readonly period: string;
  readonly amount: string;
  readonly status: "PAGO" | "PENDENTE";
  readonly date: string;
}

export const INITIAL_INVOICES: readonly SaasInvoice[] = [
  { id: "FAT-2026-09", period: "Setembro / 2026", amount: "R$ 4.850,00", status: "PAGO", date: "05/09/2026" },
  { id: "FAT-2026-08", period: "Agosto / 2026", amount: "R$ 4.850,00", status: "PAGO", date: "05/08/2026" },
  { id: "FAT-2026-07", period: "Julho / 2026", amount: "R$ 4.850,00", status: "PAGO", date: "05/07/2026" },
];

