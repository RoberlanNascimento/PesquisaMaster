import React from "react";
import type { UserAccountRecord } from "./usersRbacData";

interface RbacUserRowActionsProps {
  readonly user: UserAccountRecord;
  readonly onEdit: (user: UserAccountRecord) => void;
  readonly onRevoke: (user: UserAccountRecord) => void;
}

export function RbacUserRowActions({
  user: u,
  onEdit,
  onRevoke,
}: RbacUserRowActionsProps): React.JSX.Element {
  return (
    <div style={{ display: "flex", gap: "6px" }}>
      <button
        type="button"
        onClick={() => onEdit(u)}
        style={{
          padding: "5px 10px",
          border: "1px solid #334155",
          backgroundColor: "#1e293b",
          color: "#93c5fd",
          borderRadius: "8px",
          fontSize: "11px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        ✏️ Editar Cadastro
      </button>
      {u.isMasterOwner || (u.role === "ADMIN_SISTEMA" && u.isActive) ? (
        <span
          data-testid="badge-master-protected"
          style={{
            padding: "5px 10px",
            borderRadius: "8px",
            fontSize: "11px",
            fontWeight: 600,
            backgroundColor: "#1e293b",
            color: "#94a3b8",
          }}
        >
          🛡️ Master Protegido
        </span>
      ) : (
        <button
          type="button"
          onClick={() => onRevoke(u)}
          style={{
            padding: "5px 10px",
            border: "none",
            backgroundColor: u.isActive ? "#f28b82" : "#81c995",
            color: u.isActive ? "#690005" : "#062e14",
            borderRadius: "8px",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {u.isActive ? "🔑 Revogar Sessão" : "✅ Autorizar Acesso"}
        </button>
      )}
    </div>
  );
}

