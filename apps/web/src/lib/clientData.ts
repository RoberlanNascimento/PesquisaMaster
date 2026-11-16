export interface ClientCompanyRecord {
  readonly id: string;
  readonly corporateName: string;
  readonly tradeName: string;
  readonly cnpj: string;
  readonly tseOriginFunds: "RECURSOS_PROPRIOS" | "FUNDO_PARTIDARIO" | "FEFC";
  readonly legalRepresentative: string;
  readonly contactEmail: string;
  readonly cityUf: string;
}

export const INITIAL_CLIENT_COMPANIES: readonly ClientCompanyRecord[] = [
  {
    id: "comp-001",
    corporateName: "Grupo Editorial & Comunicação Paulista S.A.",
    tradeName: "Diário Metropolitano SP",
    cnpj: "12.345.678/0001-90",
    tseOriginFunds: "RECURSOS_PROPRIOS",
    legalRepresentative: "Roberto Albuquerque",
    contactEmail: "juridico@diariometropolitano.com.br",
    cityUf: "São Paulo / SP",
  },
];

export type CollaboratorRole = "ESTATISTICO" | "PESQUISADOR" | "AUDITOR" | "ADMINISTRADOR";

export interface ClientCollaboratorRecord {
  readonly id: string;
  readonly companyId: string;
  readonly companyName: string;
  readonly fullName: string;
  readonly email: string;
  readonly cpf: string;
  readonly role: CollaboratorRole;
  readonly credentialOrDevice: string;
}

export const INITIAL_CLIENT_COLLABORATORS: readonly ClientCollaboratorRecord[] = [
  {
    id: "colab-001",
    companyId: "comp-001",
    companyName: "Grupo Editorial & Comunicação Paulista S.A.",
    fullName: "Dra. Helena Vasconcelos",
    email: "helena@diariometropolitano.com.br",
    cpf: "284.910.448-12",
    role: "ESTATISTICO",
    credentialOrDevice: "CONRE-3 nº 9482-A",
  },
  {
    id: "colab-002",
    companyId: "comp-001",
    companyName: "Grupo Editorial & Comunicação Paulista S.A.",
    fullName: "Carlos Eduardo Mendes",
    email: "carlos.campo@diariometropolitano.com.br",
    cpf: "391.822.108-45",
    role: "PESQUISADOR",
    credentialOrDevice: "tablet-tse-sp-001",
  },
  {
    id: "colab-003",
    companyId: "comp-001",
    companyName: "Grupo Editorial & Comunicação Paulista S.A.",
    fullName: "Marcos Aurélio Silveira",
    email: "auditoria@diariometropolitano.com.br",
    cpf: "119.402.888-09",
    role: "AUDITOR",
    credentialOrDevice: "AUDITOR-TSE-KEY-01",
  },
  {
    id: "colab-004",
    companyId: "comp-001",
    companyName: "Grupo Editorial & Comunicação Paulista S.A.",
    fullName: "Roberto Albuquerque",
    email: "roberto.admin@diariometropolitano.com.br",
    cpf: "045.881.298-77",
    role: "ADMINISTRADOR",
    credentialOrDevice: "ADMIN-MASTER",
  },
];

export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: string;
  readonly roleLabel: string;
  readonly tenantId: string;
  readonly tenantName: string;
  readonly token: string;
}

export const MOCK_USER_IWCOSTA: AuthUser = {
  id: "user-iwcosta-master",
  email: "iwcosta@gmail.com",
  fullName: "Igor W. Costa",
  role: "ADMIN",
  roleLabel: "Administrador / Estatístico Master",
  tenantId: "comp-001",
  tenantName: "Grupo Editorial & Comunicação Paulista S.A.",
  token: "jwt-master-iwcosta-2026-tse",
};

