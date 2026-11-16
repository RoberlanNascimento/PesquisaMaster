import React from "react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import type { UserAccountFormData } from "./usersRbacData";

const { colors } = NOCTURNE_TOKENS;

export const USER_RBAC_INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  borderRadius: "10px",
  border: `1px solid ${colors.borderSubtle}`,
  fontSize: "13px",
  backgroundColor: colors.surfaceContainerLow,
  color: colors.textPrimary,
};

export const USER_RBAC_LABEL_STYLE: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: colors.onSurfaceVariant,
  marginBottom: "5px",
  display: "block",
};

interface UserRbacFormFieldsProps {
  readonly register: UseFormRegister<UserAccountFormData>;
  readonly errors: FieldErrors<UserAccountFormData>;
}

export function UserRbacFormFields({ register, errors }: UserRbacFormFieldsProps): React.JSX.Element {
  return (
    <>
      <div>
        <label style={USER_RBAC_LABEL_STYLE}>Nome Completo *</label>
        <input
          {...register("fullName", { required: true })}
          placeholder="Ex: Dra. Mariana Vasconcelos"
          style={USER_RBAC_INPUT_STYLE}
        />
        {errors.fullName && (
          <span style={{ fontSize: "11px", color: "#e11d48" }}>{errors.fullName.message}</span>
        )}
      </div>

      <div>
        <label style={USER_RBAC_LABEL_STYLE}>E-mail Corporativo (Login JWT) *</label>
        <input
          {...register("email", { required: true })}
          placeholder="Ex: usuario@instituto.com.br"
          style={USER_RBAC_INPUT_STYLE}
        />
        {errors.email && (
          <span style={{ fontSize: "11px", color: "#e11d48" }}>{errors.email.message}</span>
        )}
      </div>

      <div>
        <label style={USER_RBAC_LABEL_STYLE}>Papel RBAC Oficial *</label>
        <select {...register("role")} style={USER_RBAC_INPUT_STYLE}>
          <option value="ADMIN_SISTEMA">Administrador do Sistema</option>
          <option value="ESTATISTICO_RESPONSAVEL">Estatístico Responsável (CONRE)</option>
          <option value="COORDENADOR_CAMPO">Coordenador de Campo</option>
          <option value="PESQUISADOR_CAMPO">Pesquisador de Campo</option>
          <option value="ANALISTA_TABULACAO">Analista de Tabulação</option>
          <option value="AUDITOR_TSE">Auditor Externo / TSE</option>
        </select>
      </div>

      <div>
        <label style={USER_RBAC_LABEL_STYLE}>Registro Profissional / Chave Credencial *</label>
        <input
          {...register("conreOrCred", { required: true })}
          placeholder="Ex: CONRE-3 nº 9999 ou OAB/TSE-KEY"
          style={USER_RBAC_INPUT_STYLE}
        />
      </div>

      <div>
        <label style={USER_RBAC_LABEL_STYLE}>ID do Dispositivo Móvel (Opcional - Device Binding)</label>
        <input
          {...register("boundDeviceId")}
          placeholder="Ex: tablet-tse-sp-010"
          style={USER_RBAC_INPUT_STYLE}
        />
      </div>
    </>
  );
}

