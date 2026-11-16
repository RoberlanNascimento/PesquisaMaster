import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import {
  userAccountSchema,
  type UserAccountFormData,
  type UserAccountRecord,
} from "./usersRbacData";
import { UserRbacFormFields } from "./UserRbacFormFields";

const { colors } = NOCTURNE_TOKENS;

export function UserRbacDrawerForm({
  isOpen,
  editingUser,
  onClose,
  onSave,
  onNewUser,
  onOpenRbacPermissions,
  onOpenChangePassword,
  onOpenOrganization,
}: {
  readonly isOpen: boolean;
  readonly editingUser?: UserAccountRecord | null;
  readonly onClose: () => void;
  readonly onSave: (data: UserAccountFormData) => void;
  readonly onNewUser?: () => void;
  readonly onOpenRbacPermissions?: () => void;
  readonly onOpenChangePassword?: () => void;
  readonly onOpenOrganization?: () => void;
}): React.JSX.Element {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserAccountFormData>({
    defaultValues: {
      email: "",
      fullName: "",
      role: "AUDITOR_TSE",
      conreOrCred: "",
      boundDeviceId: "",
    },
  });

  useEffect(() => {
    if (editingUser) {
      reset({
        email: editingUser.email,
        fullName: editingUser.fullName,
        role: editingUser.role,
        conreOrCred: editingUser.conreOrCred,
        boundDeviceId: editingUser.boundDeviceId ?? "",
      });
    } else {
      reset({
        email: "",
        fullName: "",
        role: "AUDITOR_TSE",
        conreOrCred: "",
        boundDeviceId: "",
      });
    }
  }, [editingUser, isOpen, reset]);

  const handleNewClick = (): void => {
    reset({
      email: "",
      fullName: "",
      role: "AUDITOR_TSE",
      conreOrCred: "",
      boundDeviceId: "",
    });
    onNewUser?.();
  };

  const onSubmit = (values: UserAccountFormData): void => {
    const parsed = userAccountSchema.safeParse(values);
    if (!parsed.success) return;
    onSave(parsed.data);
    reset();
    onClose();
  };

  return (
    <SlideOverDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={editingUser ? "Editar Cadastro de Usuário" : "Convidar Usuário / Auditor Externo"}
      subtitle="Defina o papel RBAC oficial, credencial de acesso e escopo de auditoria"
      footerActions={
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleNewClick}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: `1px solid ${colors.borderSubtle}`,
                backgroundColor: "#1e293b",
                color: "#e2e8f0",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ➕ Novo
            </button>
            {onOpenRbacPermissions && (
              <button
                type="button"
                onClick={onOpenRbacPermissions}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: `1px solid ${colors.borderSubtle}`,
                  backgroundColor: "#1e293b",
                  color: "#93c5fd",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🛡️ Permissões RBAC
              </button>
            )}
            {onOpenChangePassword && (
              <button
                type="button"
                onClick={onOpenChangePassword}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: `1px solid ${colors.borderSubtle}`,
                  backgroundColor: "#1e293b",
                  color: "#fcd34d",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🔑 Trocar Minha Senha
              </button>
            )}
            {onOpenOrganization && (
              <button
                type="button"
                onClick={onOpenOrganization}
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: `1px solid ${colors.borderSubtle}`,
                  backgroundColor: "#1e293b",
                  color: "#86efac",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🏢 Organização
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: `1px solid ${colors.borderSubtle}`,
                backgroundColor: colors.surfaceContainerHigh,
                color: colors.textPrimary,
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit)}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: colors.primaryContainer,
              color: colors.onPrimary,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {editingUser ? "Salvar Alterações" : "Emitir Convite & Registrar"}
          </button>
          </div>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: "14px" }}
      >
        <UserRbacFormFields register={register} errors={errors} />
      </form>
    </SlideOverDrawer>
  );
}

