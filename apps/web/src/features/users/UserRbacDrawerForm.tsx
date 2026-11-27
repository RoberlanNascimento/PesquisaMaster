import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { SlideOverDrawer } from "../../components/ui/SlideOverDrawer";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import {
  userAccountSchema,
  type UserAccountFormData,
  type UserAccountRecord,
} from "./usersRbacData";
import { UserRbacFormFields } from "./UserRbacFormFields";
import {
  FALLBACK_ACCESS_LEVELS,
  fetchAccessLevelsFromApi,
  type AccessLevelOption,
} from "./useRbacUsersApi";

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
  const [accessLevels, setAccessLevels] = useState<readonly AccessLevelOption[]>(FALLBACK_ACCESS_LEVELS);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoImgFailed, setPhotoImgFailed] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  useEffect(() => {
    setPhotoImgFailed(false);
  }, [photoUrl]);

  useEffect(() => {
    setPhotoUrl(editingUser?.photoUrl ?? null);
    setPhotoError(null);
    setPhotoImgFailed(false);
  }, [editingUser, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    fetchAccessLevelsFromApi().then((levels) => {
      setAccessLevels(levels);
    });
  }, [isOpen]);

  const isNumericUserId = Boolean(editingUser?.id && /^\d+$/.test(editingUser.id));

  const handlePhotoFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editingUser || !isNumericUserId) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setPhotoError("Formato inválido. Envie PNG, JPEG ou WEBP.");
      return;
    }

    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `http://127.0.0.1:8000/api/v1/pesquisas-tabelas/usuarios/${editingUser.id}/foto`,
        {
          method: "POST",
          body: formData,
        },
      );
      const data = (await res.json().catch(() => ({}))) as { foto_url?: string; detail?: string };
      if (!res.ok || !data.foto_url) {
        setPhotoError(data.detail || `Erro ao enviar foto (HTTP ${res.status}).`);
        return;
      }
      setPhotoUrl(data.foto_url);
      setPhotoImgFailed(false);
      window.dispatchEvent(
        new CustomEvent("pm_user_photo_updated", {
          detail: { userId: String(editingUser.id), photoUrl: data.foto_url },
        }),
      );
    } catch {
      setPhotoError("Erro de conexão ao enviar foto para o GCS.");
    } finally {
      setUploadingPhoto(false);
    }
  };

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
        <div
          data-testid="user-photo-container"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
            paddingBottom: "14px",
            borderBottom: `1px solid ${colors.borderSubtle}`,
          }}
        >
          <input
            ref={photoInputRef}
            data-testid="input-user-photo-file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={(e) => void handlePhotoFileChange(e)}
          />
          <button
            type="button"
            data-testid="btn-user-photo-circle"
            disabled={!isNumericUserId || uploadingPhoto}
            onClick={() => photoInputRef.current?.click()}
            title={
              isNumericUserId
                ? "Clique para enviar/alterar a foto do usuário (GCS)"
                : "Salve o usuário primeiro para enviar a foto"
            }
            style={{
              width: "80px",
              height: "80px",
              padding: 0,
              borderRadius: "50%",
              overflow: "hidden",
              border: `2px solid ${colors.borderSubtle}`,
              backgroundColor: colors.surfaceContainerLow,
              color: colors.textMuted,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              fontWeight: 700,
              cursor: isNumericUserId ? (uploadingPhoto ? "wait" : "pointer") : "default",
            }}
          >
            {photoUrl && !photoImgFailed ? (
              <img
                data-testid="preview-user-photo"
                src={photoUrl}
                alt={editingUser?.fullName || "Foto do Usuário"}
                onError={() => setPhotoImgFailed(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", display: "block" }}
              />
            ) : (
              (editingUser?.fullName || "US").slice(0, 2).toUpperCase()
            )}
          </button>
          {isNumericUserId ? (
            <button
              type="button"
              data-testid="btn-upload-user-photo"
              disabled={uploadingPhoto}
              onClick={() => photoInputRef.current?.click()}
              style={{
                padding: "5px 12px",
                borderRadius: "8px",
                border: `1px solid ${colors.borderSubtle}`,
                backgroundColor: colors.surfaceContainerHigh,
                color: colors.textPrimary,
                fontSize: "12px",
                fontWeight: 600,
                cursor: uploadingPhoto ? "wait" : "pointer",
              }}
            >
              {uploadingPhoto ? "Enviando..." : "Enviar Foto (GCS)"}
            </button>
          ) : (
            <span style={{ fontSize: "11px", color: colors.textMuted }}>
              Salve o usuário para habilitar o upload da foto (GCS)
            </span>
          )}
          {photoError && (
            <span style={{ fontSize: "11px", color: "#f28b82" }}>{photoError}</span>
          )}
        </div>
        <UserRbacFormFields register={register} errors={errors} accessLevels={accessLevels} />
      </form>
    </SlideOverDrawer>
  );
}

