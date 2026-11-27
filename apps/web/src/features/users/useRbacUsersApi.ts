import type { UserAccountFormData, UserAccountRecord } from "./usersRbacData";

export interface AccessLevelOption {
  readonly id_nivel_acesso: number;
  readonly codigo: string;
  readonly nome: string;
  readonly nivel_hierarquia: number;
  readonly descricao?: string | null;
}

export const FALLBACK_ACCESS_LEVELS: readonly AccessLevelOption[] = [
  { id_nivel_acesso: 1, codigo: "master", nome: "Administrador Master", nivel_hierarquia: 100 },
  { id_nivel_acesso: 2, codigo: "administrador", nome: "Administrador do Sistema", nivel_hierarquia: 80 },
  { id_nivel_acesso: 3, codigo: "estatistico", nome: "Estatístico Responsável CONRE", nivel_hierarquia: 60 },
  { id_nivel_acesso: 4, codigo: "coordenador", nome: "Coordenador de Campo", nivel_hierarquia: 40 },
  { id_nivel_acesso: 5, codigo: "analista", nome: "Analista de Tabulação", nivel_hierarquia: 30 },
  { id_nivel_acesso: 6, codigo: "pesquisador", nome: "Pesquisador de Campo", nivel_hierarquia: 20 },
  { id_nivel_acesso: 7, codigo: "visitante", nome: "Visualizador / Acesso Mínimo", nivel_hierarquia: 10 },
];

export async function fetchAccessLevelsFromApi(): Promise<readonly AccessLevelOption[]> {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/niveis-acesso");
    if (!res.ok) return FALLBACK_ACCESS_LEVELS;
    const items = (await res.json()) as AccessLevelOption[];
    if (!Array.isArray(items) || items.length === 0) return FALLBACK_ACCESS_LEVELS;
    return items;
  } catch {
    return FALLBACK_ACCESS_LEVELS;
  }
}

export function mapCargoToRole(cargo: string): UserAccountRecord["role"] {
  const c = cargo.toLowerCase();
  if (c.includes("master") || c.includes("admin") || c.includes("diretor")) return "ADMIN_SISTEMA";
  if (c.includes("estat")) return "ESTATISTICO_RESPONSAVEL";
  if (c.includes("coord") || c.includes("superv")) return "COORDENADOR_CAMPO";
  if (c.includes("auditor")) return "AUDITOR_TSE";
  if (c.includes("analista") || c.includes("tabul")) return "ANALISTA_TABULACAO";
  if (c.includes("visit") || c.includes("viewer")) return "VISITANTE";
  return "PESQUISADOR_CAMPO";
}

export async function fetchUsersFromApi(): Promise<UserAccountRecord[] | null> {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/usuarios", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const items = (await res.json()) as Array<Record<string, unknown>>;
    if (!Array.isArray(items)) return null;
    return items.map((u) => {
      const cargo = String(u.cargo ?? "");
      const nivelCodigo = String(u.nivel_codigo ?? "");
      const isMasterOwner =
        cargo.trim().toLowerCase() === "master" ||
        nivelCodigo.trim().toLowerCase() === "master";
      return {
        id: String(u.id_usuario),
        email: String(u.email ?? ""),
        fullName: String(u.nome ?? ""),
        role: mapCargoToRole(nivelCodigo || cargo),
        conreOrCred: String(u.nivel_nome || cargo || "Usuário do Sistema"),
        isActive: Boolean(u.ativo) && !Boolean(u.revogado),
        isMasterOwner,
        photoUrl: typeof u.foto_url === "string" && u.foto_url ? u.foto_url : null,
        boundDeviceId: null,
        lastLoginAt: "Ativo no Banco",
        auditChainHash: `db-usr-${u.id_usuario}`,
      };
    });
  } catch {
    return null;
  }
}

export async function createUserInApi(data: UserAccountFormData): Promise<UserAccountRecord | null> {
  try {
    const parsedNivelId =
      data.idNivelAcesso !== undefined && data.idNivelAcesso !== ""
        ? Number(data.idNivelAcesso)
        : undefined;
    const res = await fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: data.fullName,
        email: data.email,
        cargo: data.conreOrCred || data.role,
        ...(parsedNivelId && Number.isFinite(parsedNivelId)
          ? { id_nivel_acesso: parsedNivelId }
          : {}),
      }),
    });
    if (!res.ok) return null;
    const created = (await res.json()) as Record<string, unknown>;
    return {
      id: String(created.id_usuario),
      email: String(created.email ?? data.email),
      fullName: String(created.nome ?? data.fullName),
      role: mapCargoToRole(String(created.cargo ?? "")),
      conreOrCred: String(created.cargo || data.conreOrCred),
      isActive: Boolean(created.ativo),
      boundDeviceId: data.boundDeviceId || null,
      lastLoginAt: "Nunca",
      auditChainHash: `db-usr-${created.id_usuario}`,
    };
  } catch {
    return null;
  }
}

