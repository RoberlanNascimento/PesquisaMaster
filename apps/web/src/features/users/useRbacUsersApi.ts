import type { UserAccountFormData, UserAccountRecord } from "./usersRbacData";

export function mapCargoToRole(cargo: string): UserAccountRecord["role"] {
  const c = cargo.toLowerCase();
  if (c.includes("master") || c.includes("admin") || c.includes("diretor")) return "ADMIN_SISTEMA";
  if (c.includes("estat")) return "ESTATISTICO_RESPONSAVEL";
  if (c.includes("coord") || c.includes("superv")) return "COORDENADOR_CAMPO";
  if (c.includes("auditor")) return "AUDITOR_TSE";
  if (c.includes("tabul")) return "ANALISTA_TABULACAO";
  return "PESQUISADOR_CAMPO";
}

export async function fetchUsersFromApi(): Promise<UserAccountRecord[] | null> {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/usuarios");
    if (!res.ok) return null;
    const items = (await res.json()) as Array<Record<string, unknown>>;
    if (!Array.isArray(items) || items.length === 0) return null;
    return items.map((u) => ({
      id: String(u.id_usuario),
      email: String(u.email ?? ""),
      fullName: String(u.nome ?? ""),
      role: mapCargoToRole(String(u.cargo ?? "")),
      conreOrCred: String(u.cargo || "Usuário do Sistema"),
      isActive: Boolean(u.ativo) && !Boolean(u.revogado),
      boundDeviceId: null,
      lastLoginAt: "Ativo no Banco",
      auditChainHash: `db-usr-${u.id_usuario}`,
    }));
  } catch {
    return null;
  }
}

export async function createUserInApi(data: UserAccountFormData): Promise<UserAccountRecord | null> {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/v1/pesquisas-tabelas/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: data.fullName,
        email: data.email,
        cargo: data.conreOrCred || data.role,
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

