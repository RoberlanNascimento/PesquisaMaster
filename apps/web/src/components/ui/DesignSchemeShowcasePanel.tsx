import React, { useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { useUiSessionStore } from "../../lib/store";
import { THEME_PALETTES, type ResolvedTheme } from "../../lib/themePalettes";
import { ThemeModeSwitcher } from "./ThemeModeSwitcher";

const { rounded, typography } = NOCTURNE_TOKENS;

function SwatchList({
  scheme,
}: {
  readonly scheme: ResolvedTheme;
}): React.JSX.Element {
  const palette = THEME_PALETTES[scheme];
  const swatches = [
    { name: "surfaceBase", hex: palette.surfaceBase, label: "Base Canvas" },
    { name: "surfaceCard", hex: palette.surfaceCard, label: "Card Surface" },
    { name: "surfaceElevated", hex: palette.surfaceElevated, label: "Elevated / Drawer" },
    { name: "primaryContainer", hex: palette.primaryContainer, label: "Primário (#8ab4f8)" },
    { name: "successPastel", hex: palette.successPastel, label: "Sucesso (#81c995)" },
    { name: "warningPastel", hex: palette.warningPastel, label: "Editar / Alerta (#fde293)" },
    { name: "errorPastel", hex: palette.errorPastel, label: "Erro / Expurgo (#f28b82)" },
  ];

  return (
    <div
      data-testid={`design-scheme-card-${scheme}`}
      style={{
        backgroundColor: palette.surfaceCard,
        color: palette.textPrimary,
        border: `1px solid ${palette.borderSubtle}`,
        borderRadius: rounded.lg,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: "13px", color: palette.textPrimary }}>
          {scheme === "dark" ? "🌙 Esquema Escuro" : "☀️ Esquema Claro"} — {palette.label}
        </strong>
        <span
          style={{
            fontSize: "10px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: rounded.full,
            backgroundColor: palette.warningContainer,
            color: palette.onWarningContainer,
            border: `1px solid ${palette.warningPastel}`,
          }}
        >
          06-ui-design-system.md
        </span>
      </div>
      <p style={{ margin: 0, fontSize: "11px", color: palette.textMuted }}>
        {palette.description}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(115px, 1fr))",
          gap: "8px",
        }}
      >
        {swatches.map((sw) => (
          <div
            key={sw.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 8px",
              borderRadius: rounded.DEFAULT,
              backgroundColor: palette.surfaceElevated,
              border: `1px solid ${palette.borderSubtle}`,
            }}
          >
            <span
              style={{
                width: "16px",
                height: "16px",
                borderRadius: "4px",
                backgroundColor: sw.hex,
                border: `1px solid ${palette.outlineVariant}`,
                flexShrink: 0,
              }}
            />
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, color: palette.textPrimary }}>
                {sw.label}
              </div>
              <div style={{ fontSize: "10px", fontFamily: "monospace", color: palette.textMuted }}>
                {sw.hex}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DesignSchemeShowcasePanel(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const themeMode = useUiSessionStore((state) => state.themeMode);
  const resolvedTheme = useUiSessionStore((state) => state.resolvedTheme);
  const activePalette = THEME_PALETTES[resolvedTheme];

  return (
    <div style={{ fontFamily: typography.fontFamily }}>
      <button
        type="button"
        data-testid="btn-toggle-design-showcase"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          padding: "5px 10px",
          borderRadius: rounded.md,
          backgroundColor: activePalette.warningContainer,
          color: activePalette.onWarningContainer,
          border: `1px solid ${activePalette.warningPastel}`,
          fontSize: "11px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        🎨 {isOpen ? "Ocultar Esquemas" : "Apresentar Design (Escuro / Claro / Sistema)"}
      </button>

      {isOpen && (
        <section
          data-testid="design-scheme-showcase-panel"
          aria-label="Apresentação dos Esquemas Escuro, Claro e Sistema (06-ui-design-system.md)"
          style={{
            marginTop: "12px",
            padding: "16px",
            borderRadius: rounded.lg,
            backgroundColor: activePalette.surfaceElevated,
            border: `1px solid ${activePalette.outlineVariant}`,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: activePalette.textPrimary }}>
                Apresentação do Design System Nocturne Editorial — Escuro, Claro e Sistema
              </div>
              <div style={{ fontSize: "12px", color: activePalette.textMuted }}>
                Modo selecionado: <strong>{themeMode.toUpperCase()}</strong> • Tema efetivo aplicado:{" "}
                <strong>{activePalette.label}</strong>
              </div>
            </div>
            <ThemeModeSwitcher testIdPrefix="showcase-theme-switcher" />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
              gap: "12px",
            }}
          >
            <SwatchList scheme="dark" />
            <SwatchList scheme="light" />
          </div>
        </section>
      )}
    </div>
  );
}

