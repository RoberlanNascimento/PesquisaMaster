import type React from "react";
import type { CollaboratorRole } from "../../lib/store";

export const ROLE_CONFIG: Record<
  CollaboratorRole,
  { readonly label: string; readonly bg: string; readonly color: string; readonly hint: string }
> = {
  ESTATISTICO: { label: "Estatístico (CONRE)", bg: "#2a2a2a", color: "#8ab4f8", hint: "Registro CONRE (ex: CONRE-3 nº 9482-A)" },
  PESQUISADOR: { label: "Pesquisador de Campo", bg: "#183724", color: "#a8dab5", hint: "ID do Tablet Vinculado (ex: tablet-tse-sp-005)" },
  AUDITOR: { label: "Auditor / Fiscal", bg: "#2a2a2a", color: "#fdd663", hint: "Credencial de Auditoria (ex: AUDITOR-TSE-02)" },
  ADMINISTRADOR: { label: "Administrador do Cliente", bg: "#2a2a2a", color: "#ffbfb8", hint: "Escopo Administrativo (ex: ADMIN-GERAL)" },
};

export const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  fontSize: "13px",
  boxSizing: "border-box",
};

export const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  marginBottom: "4px",
};

