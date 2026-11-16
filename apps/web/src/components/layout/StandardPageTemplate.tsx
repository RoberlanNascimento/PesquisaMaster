import React from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { useUiSessionStore } from "../../lib/store";

export interface StandardPageTemplateProps {
  readonly activeTab: string;
  readonly domainLabel: string;
  readonly pageLabel: string;
  readonly children: React.ReactNode;
}

/**
 * Página Padrão Corporativa (Nocturne Editorial — 06-ui-design-system.md & 07-design.md)
 * Envolve todas as telas da plataforma na área central abaixo da TopNavbar fixa:
 * - Surface Level 0 (`var(--surface-base)`) e tipografia uniforme `Roboto Flex`
 * - Esquemas Escuro (`dark`), Claro (`light`) e Sistema (`system`) aplicados via variáveis CSS
 * - Grid máximo de 1280px com margens e espaçamentos do sistema 8pt (`space-md` / `space-lg`)
 */
export function StandardPageTemplate({
  activeTab,
  domainLabel,
  pageLabel,
  children,
}: StandardPageTemplateProps): React.JSX.Element {
  const { colors, typography, spacing } = NOCTURNE_TOKENS;
  const themeMode = useUiSessionStore((state) => state.themeMode);
  const resolvedTheme = useUiSessionStore((state) => state.resolvedTheme);

  return (
    <div
      data-testid="standard-page-template"
      data-design-system={NOCTURNE_TOKENS.name}
      data-theme-mode={themeMode}
      data-resolved-theme={resolvedTheme}
      data-active-tab={activeTab}
      data-domain-label={domainLabel}
      data-page-label={pageLabel}
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: colors.surfaceBase,
        color: colors.textPrimary,
        fontFamily: typography.fontFamily,
        padding: `${spacing.spaceLg} ${spacing.marginDesktop}`,
        maxWidth: "1280px",
        width: "100%",
        boxSizing: "border-box",
        transition: "background-color 0.2s ease, color 0.2s ease",
      }}
    >
      {/* Container de Conteúdo Padronizado para Todas as Telas */}
      <div
        data-testid="standard-page-body"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: spacing.spaceLg,
        }}
      >
        {children}
      </div>
    </div>
  );
}

