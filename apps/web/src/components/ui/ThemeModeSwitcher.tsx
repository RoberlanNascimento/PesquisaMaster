import React from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { useUiSessionStore, type ThemeMode } from "../../lib/store";
import { THEME_PALETTES } from "../../lib/themePalettes";

const { colors, rounded, typography } = NOCTURNE_TOKENS;

interface ThemeOption {
  readonly mode: ThemeMode;
  readonly icon: string;
  readonly label: string;
  readonly shortLabel: string;
}

const THEME_OPTIONS: readonly ThemeOption[] = [
  { mode: "dark", icon: "🌙", label: "Escuro", shortLabel: "Escuro" },
  { mode: "light", icon: "☀️", label: "Claro", shortLabel: "Claro" },
  { mode: "system", icon: "💻", label: "Sistema", shortLabel: "Sistema" },
];

export interface ThemeModeSwitcherProps {
  readonly compact?: boolean;
  readonly showResolvedBadge?: boolean;
  readonly testIdPrefix?: string;
}

/**
 * Seletor de Esquema de Tema (Escuro, Claro e Sistema) — Nocturne Editorial (06-ui-design-system.md)
 * Permite alternar e apresentar o design nos modos Escuro (dark), Claro (light) e Sistema (system).
 */
export function ThemeModeSwitcher({
  compact = false,
  showResolvedBadge = true,
  testIdPrefix = "theme-switcher",
}: ThemeModeSwitcherProps): React.JSX.Element {
  const themeMode = useUiSessionStore((state) => state.themeMode);
  const resolvedTheme = useUiSessionStore((state) => state.resolvedTheme);
  const setThemeMode = useUiSessionStore((state) => state.setThemeMode);

  const activePalette = THEME_PALETTES[resolvedTheme];

  return (
    <div
      data-testid={testIdPrefix}
      data-theme-mode={themeMode}
      data-resolved-theme={resolvedTheme}
      role="group"
      aria-label="Esquema de Tema (Escuro, Claro e Sistema)"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px",
        borderRadius: rounded.full,
        backgroundColor: colors.surfaceContainerLow,
        border: `1px solid ${colors.borderSubtle}`,
        fontFamily: typography.fontFamily,
      }}
    >
      {THEME_OPTIONS.map((opt) => {
        const isSelected = themeMode === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            data-testid={`${testIdPrefix}-btn-${opt.mode}`}
            aria-pressed={isSelected}
            title={`Alternar para esquema ${opt.label}${opt.mode === "system" ? ` (${activePalette.label})` : ""}`}
            onClick={() => setThemeMode(opt.mode)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: compact ? "4px 8px" : "4px 10px",
              borderRadius: rounded.full,
              border: isSelected
                ? `1px solid ${colors.primaryContainer}`
                : "1px solid transparent",
              backgroundColor: isSelected
                ? colors.primaryContainer
                : "transparent",
              color: isSelected ? colors.onPrimary : colors.textPrimary,
              fontSize: "11px",
              fontWeight: isSelected ? 700 : 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
              lineHeight: 1.2,
            }}
          >
            <span aria-hidden="true">{opt.icon}</span>
            {!compact && <span>{opt.label}</span>}
          </button>
        );
      })}

      {showResolvedBadge && !compact && (
        <span
          data-testid={`${testIdPrefix}-resolved-badge`}
          style={{
            padding: "2px 8px",
            borderRadius: rounded.full,
            fontSize: "10px",
            fontWeight: 600,
            backgroundColor: colors.warningContainer,
            color: colors.onWarningContainer,
            border: `1px solid ${colors.warningPastel}`,
            marginLeft: "2px",
            whiteSpace: "nowrap",
          }}
        >
          {themeMode === "system"
            ? `Sistema (${resolvedTheme === "light" ? "Claro" : "Escuro"})`
            : resolvedTheme === "light"
              ? "Claro Ativo"
              : "Escuro Ativo"}
        </span>
      )}
    </div>
  );
}

