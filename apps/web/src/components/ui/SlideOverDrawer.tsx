import React, { useEffect } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

export interface SlideOverDrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly subtitle?: string;
  readonly children: React.ReactNode;
  readonly footerActions?: React.ReactNode;
  readonly width?: string;
}

const { colors, typography } = NOCTURNE_TOKENS;

export function SlideOverDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footerActions,
  width = "540px",
}: SlideOverDrawerProps): React.JSX.Element | null {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.68)",
        backdropFilter: "blur(6px)",
        padding: "20px",
        fontFamily: typography.fontFamily,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 48px)",
          backgroundColor: "#202124",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.75), 0 4px 16px rgba(0, 0, 0, 0.4)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            padding: "26px 28px 12px 28px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            backgroundColor: "transparent",
            borderBottom: "none",
          }}
        >
          <div style={{ flex: 1, minWidth: 0, paddingRight: "12px" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: 600,
                color: colors.textPrimary,
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "13px",
                  color: colors.textMuted,
                  lineHeight: "20px",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            style={{
              border: "none",
              backgroundColor: "transparent",
              borderRadius: "9999px",
              width: "32px",
              height: "32px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.textMuted,
              fontSize: "16px",
              flexShrink: 0,
              transition: "background-color 0.15s ease, color 0.15s ease",
            }}
          >
            ✕
          </button>
        </header>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px 28px 20px 28px",
            color: colors.textPrimary,
            fontSize: "14px",
          }}
        >
          {children}
        </div>

        {footerActions && (
          <footer
            style={{
              padding: "12px 28px 24px 28px",
              borderTop: "none",
              backgroundColor: "transparent",
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
            }}
          >
            {footerActions}
          </footer>
        )}
      </div>
    </div>
  );
}
