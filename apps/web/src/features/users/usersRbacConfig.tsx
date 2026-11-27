import React, { useEffect, useState } from "react";
import type {
  WorkspaceTab,
  WorkspaceKpi,
  WorkspaceFilterConfig,
  WorkspaceColumn,
} from "../../components/ui/EnterpriseCrudWorkspaceTypes";
import type { UserAccountRecord } from "./usersRbacData";

function getInitials(name: string): string {
  const parts = name.replace(/^(Dr\.|Dra\.|Prof\.|Sr\.|Sra\.)\s+/i, "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  if (!first) return "US";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? "";
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function UserRowAvatar({
  fullName,
  photoUrl,
}: {
  readonly fullName: string;
  readonly photoUrl?: string | null;
}): React.JSX.Element {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [photoUrl]);

  return (
    <span
      data-testid="user-row-avatar"
      style={{
        width: "96px",
        height: "96px",
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
        border: "2px solid #475569",
        color: "#f8fafc",
        fontSize: "26px",
        fontWeight: 700,
      }}
    >
      {photoUrl && !imgFailed ? (
        <img
          src={photoUrl}
          alt={fullName}
          onError={() => setImgFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "50%",
            display: "block",
          }}
        />
      ) : (
        getInitials(fullName)
      )}
    </span>
  );
}

export function getUserTabs(users: readonly UserAccountRecord[]): readonly WorkspaceTab[] {
  return [
    {
      id: "ATIVOS",
      label: "Usuários Ativos",
      count: users.filter((u) => u.isActive).length,
    },
    {
      id: "CONRE",
      label: "Estatísticos (CONRE)",
      count: users.filter((u) => u.role === "ESTATISTICO_RESPONSAVEL").length,
    },
    {
      id: "AUDITORES",
      label: "Auditores Externos Temporários",
      count: users.filter((u) => u.role === "AUDITOR_TSE").length,
    },
    { id: "TRILHA", label: "Trilha de Auditoria SHA-256" },
  ];
}

export function getUserKpis(users: readonly UserAccountRecord[]): readonly WorkspaceKpi[] {
  return [
    { id: "k1", label: "Total Usuários", value: users.length, variant: "default" },
    {
      id: "k2",
      label: "Estatísticos CONRE",
      value: users.filter((u) => u.role === "ESTATISTICO_RESPONSAVEL").length,
      variant: "success",
    },
    {
      id: "k3",
      label: "Auditores TSE",
      value: users.filter((u) => u.role === "AUDITOR_TSE").length,
      variant: "default",
    },
    { id: "k4", label: "Sessões JWT Ativas", value: 8, variant: "success" },
  ];
}

export function getUserFilters(
  filterRole: string,
  setFilterRole: (v: string) => void,
  filterStatus: string,
  setFilterStatus: (v: string) => void,
): readonly WorkspaceFilterConfig[] {
  return [
    {
      id: "role",
      label: "Papel RBAC",
      value: filterRole,
      options: [
        { label: "Todos os Papéis", value: "ALL" },
        { label: "Administrador do Sistema", value: "ADMIN_SISTEMA" },
        { label: "Estatístico Responsável", value: "ESTATISTICO_RESPONSAVEL" },
        { label: "Coordenador de Campo", value: "COORDENADOR_CAMPO" },
        { label: "Pesquisador de Campo", value: "PESQUISADOR_CAMPO" },
        { label: "Auditor Externo TSE", value: "AUDITOR_TSE" },
      ],
      onChange: setFilterRole,
    },
    {
      id: "status",
      label: "Status da Conta",
      value: filterStatus,
      options: [
        { label: "Todos os Status", value: "ALL" },
        { label: "Ativa", value: "ACTIVE" },
        { label: "Inativa / Bloqueada", value: "INACTIVE" },
      ],
      onChange: setFilterStatus,
    },
  ];
}

export const USER_COLUMNS: readonly WorkspaceColumn<UserAccountRecord>[] = [
  {
    key: "fullName",
    header: "Usuário & E-mail",
    render: (u) => (
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <UserRowAvatar fullName={u.fullName} photoUrl={u.photoUrl} />
        <div style={{ minWidth: 0 }}>
          <strong>{u.fullName}</strong>
          <div style={{ fontSize: "11px", color: "#64748b" }}>{u.email}</div>
        </div>
      </div>
    ),
  },
  {
    key: "role",
    header: "Papel RBAC",
    width: "190px",
    render: (u) => (
      <span
        style={{
          fontSize: "11px",
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: "4px",
          backgroundColor: "#f1f5f9",
          color: "#1e293b",
        }}
      >
        {u.role}
      </span>
    ),
  },
  { key: "cred", header: "Credencial / CONRE", width: "170px", render: (u) => u.conreOrCred },
  {
    key: "hash",
    header: "Hash SHA-256",
    width: "140px",
    render: (u) => (
      <code style={{ fontSize: "10px", color: "#64748b" }}>{u.auditChainHash.slice(0, 12)}...</code>
    ),
  },
  { key: "lastLogin", header: "Último Acesso", width: "130px", render: (u) => u.lastLoginAt },
];
