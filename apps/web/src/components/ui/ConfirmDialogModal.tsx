import React, { useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

export type ConfirmVariant = "danger" | "warning" | "success" | "info";

export interface ConfirmDialogModalProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly variant?: ConfirmVariant;
  readonly requireReason?: boolean;
  readonly reasonPlaceholder?: string;
  readonly onConfirm: (reason?: string) => void;
  readonly onCancel: () => void;
}

const { colors, rounded, typography } = NOCTURNE_TOKENS;

const VARIANT_COLORS: Record<ConfirmVariant, { bg: string; text: string }> = {
  danger: { bg: colors.errorPastel, text: colors.onError },
  warning: { bg: colors.warningAmber, text: "#332200" },
  success: { bg: colors.successPastel, text: colors.onSecondary },
  info: { bg: colors.primaryContainer, text: colors.onPrimary },
};

export function ConfirmDialogModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  requireReason = false,
  reasonPlaceholder = "Insira a justificativa técnica para registro na trilha de auditoria...",
  onConfirm,
  onCancel,
}: ConfirmDialogModalProps): React.JSX.Element | null {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const btnColors = VARIANT_COLORS[variant];

  const handleConfirm = (): void => {
    if (requireReason && !reason.trim()) {
      setError("A justificativa é obrigatória para esta operação.");
      return;
    }
    setError(null);
    onConfirm(reason.trim() || undefined);
    setReason("");
  };

  const handleCancel = (): void => {
    setError(null);
    setReason("");
    onCancel();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(14, 14, 14, 0.72)",
        backdropFilter: "blur(3px)",
        fontFamily: typography.fontFamily,
      }}
    >
      <div
        style={{
          width: "480px",
          maxWidth: "92vw",
          backgroundColor: colors.surfaceElevated,
          border: `1px solid ${colors.outlineVariant}`,
          borderRadius: rounded.lg,
          padding: "24px",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: colors.textPrimary }}>
          {title}
        </h3>
        <p style={{ margin: 0, fontSize: "14px", color: colors.textMuted, lineHeight: 1.5 }}>
          {message}
        </p>

        {requireReason && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label
              htmlFor="confirm-reason"
              style={{ fontSize: "13px", fontWeight: 600, color: colors.textPrimary }}
            >
              Justificativa Obrigatória (Auditoria TSE)
            </label>
            <textarea
              id="confirm-reason"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder={reasonPlaceholder}
              style={{
                width: "100%",
                boxSizing: "border-box",
                borderRadius: rounded.md,
                border: error ? `1px solid ${colors.errorPastel}` : `1px solid ${colors.borderSubtle}`,
                backgroundColor: colors.surfaceCard,
                color: colors.textPrimary,
                padding: "8px 12px",
                fontSize: "13px",
                fontFamily: "inherit",
              }}
            />
            {error && <span style={{ fontSize: "12px", color: colors.errorPastel }}>{error}</span>}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: "9px 16px",
              borderRadius: rounded.md,
              border: `1px solid ${colors.borderSubtle}`,
              backgroundColor: "transparent",
              color: colors.textPrimary,
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: "9px 18px",
              borderRadius: rounded.md,
              border: "none",
              backgroundColor: btnColors.bg,
              color: btnColors.text,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
