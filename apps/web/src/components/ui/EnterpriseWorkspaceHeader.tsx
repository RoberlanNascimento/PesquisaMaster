import React from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import type {
  WorkspaceTab,
  WorkspaceKpi,
  KpiVariant,
} from "./EnterpriseCrudWorkspaceTypes";

const { colors, typography, rounded } = NOCTURNE_TOKENS;

const KPI_STYLES: Record<KpiVariant, { border: string; bg: string; text: string; tag: string }> = {
  default: {
    border: colors.borderSubtle,
    bg: colors.surfaceCard,
    text: colors.textPrimary,
    tag: colors.primaryContainer,
  },
  success: {
    border: "rgba(129, 201, 149, 0.35)",
    bg: colors.surfaceCard,
    text: colors.successPastelTint,
    tag: colors.successPastel,
  },
  warning: {
    border: "rgba(253, 214, 99, 0.35)",
    bg: colors.surfaceCard,
    text: colors.warningAmber,
    tag: colors.warningAmber,
  },
  danger: {
    border: "rgba(242, 139, 130, 0.35)",
    bg: colors.surfaceCard,
    text: colors.errorPastel,
    tag: colors.errorPastel,
  },
};

export function EnterpriseWorkspaceHeader({
  title,
  subtitle,
  globalActions,
  tabs,
  activeTab,
  onTabChange,
  kpis,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly globalActions?: React.ReactNode;
  readonly tabs?: readonly WorkspaceTab[];
  readonly activeTab?: string;
  readonly onTabChange?: (tabId: string) => void;
  readonly kpis?: readonly WorkspaceKpi[];
}): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: typography.headlineLg.fontSize,
              fontWeight: typography.headlineLg.fontWeight,
              lineHeight: typography.headlineLg.lineHeight,
              letterSpacing: typography.headlineLg.letterSpacing,
              color: colors.textPrimary,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: typography.bodyMd.fontSize,
                lineHeight: typography.bodyMd.lineHeight,
                color: colors.textMuted,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {globalActions && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>{globalActions}</div>
        )}
      </header>

      {tabs && tabs.length > 0 && (
        <nav
          aria-label="Guias do Módulo"
          style={{
            display: "flex",
            gap: "8px",
            borderBottom: `1px solid ${colors.borderSubtle}`,
            paddingBottom: "2px",
            overflowX: "auto",
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange?.(tab.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 16px",
                  fontSize: typography.labelMd.fontSize,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? colors.primaryContainer : colors.textMuted,
                  backgroundColor: "transparent",
                  border: "none",
                  borderBottom: isActive
                    ? `2px solid ${colors.primaryContainer}`
                    : "2px solid transparent",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  fontFamily: "inherit",
                }}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: rounded.full,
                      fontSize: "11px",
                      fontWeight: 600,
                      backgroundColor: isActive ? colors.successContainer : colors.surfaceElevated,
                      color: isActive ? colors.onSuccessContainer : colors.onSurfaceVariant,
                      border: isActive
                        ? "1px solid rgba(129, 201, 149, 0.3)"
                        : `1px solid ${colors.borderSubtle}`,
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {kpis && kpis.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px",
          }}
        >
          {kpis.map((kpi) => {
            const style = KPI_STYLES[kpi.variant ?? "default"];
            return (
              <div
                key={kpi.id}
                style={{
                  padding: "16px 18px",
                  backgroundColor: style.bg,
                  border: `1px solid ${style.border}`,
                  borderRadius: rounded.lg,
                }}
              >
                <div
                  style={{
                    fontSize: typography.caption.fontSize,
                    fontWeight: 600,
                    color: style.tag,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                  }}
                >
                  {kpi.label}
                </div>
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: 600,
                    color: style.text,
                    marginTop: "6px",
                    letterSpacing: "-0.015em",
                  }}
                >
                  {kpi.value}
                </div>
                {kpi.helperText && (
                  <div style={{ fontSize: "12px", color: colors.textMuted, marginTop: "4px" }}>
                    {kpi.helperText}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
