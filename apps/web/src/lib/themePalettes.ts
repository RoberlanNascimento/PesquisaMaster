export type ThemeMode = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

export interface ThemePaletteSpec {
  readonly mode: ResolvedTheme;
  readonly label: string;
  readonly description: string;
  readonly surfaceBase: string;
  readonly surfaceContainerLow: string;
  readonly surfaceCard: string;
  readonly surfaceElevated: string;
  readonly borderSubtle: string;
  readonly outlineVariant: string;
  readonly textPrimary: string;
  readonly textMuted: string;
  readonly primaryContainer: string;
  readonly onPrimary: string;
  readonly successPastel: string;
  readonly successContainer: string;
  readonly onSuccessContainer: string;
  readonly warningPastel: string;
  readonly warningAmber: string;
  readonly warningContainer: string;
  readonly onWarningContainer: string;
  readonly errorPastel: string;
  readonly onError: string;
}

export const THEME_PALETTES: Record<ResolvedTheme, ThemePaletteSpec> = {
  dark: {
    mode: "dark",
    label: "Escuro (Nocturne Dark)",
    description: "Superfícies em camadas de carvão profundo (#131313 → #202020) com realces pastéis de baixa fadiga visual.",
    surfaceBase: "#131313",
    surfaceContainerLow: "#1b1c1c",
    surfaceCard: "#202020",
    surfaceElevated: "#2a2a2a",
    borderSubtle: "#353535",
    outlineVariant: "#424750",
    textPrimary: "#e5e2e1",
    textMuted: "#9aa0a6",
    primaryContainer: "#8ab4f8",
    onPrimary: "#003061",
    successPastel: "#81c995",
    successContainer: "#183724",
    onSuccessContainer: "#a8dab5",
    warningPastel: "#fde293",
    warningAmber: "#fdd663",
    warningContainer: "#3b2e08",
    onWarningContainer: "#fde293",
    errorPastel: "#f28b82",
    onError: "#690005",
  },
  light: {
    mode: "light",
    label: "Claro (Nocturne Daylight)",
    description: "Superfícies editoriais claras de papel marfim/quartzo (#f8f9fa → #ffffff) com contraste otimizado para ambientes iluminados.",
    surfaceBase: "#f8f9fa",
    surfaceContainerLow: "#f1f3f5",
    surfaceCard: "#ffffff",
    surfaceElevated: "#f3f5f8",
    borderSubtle: "#dce0e5",
    outlineVariant: "#c4c9d0",
    textPrimary: "#1b1c1c",
    textMuted: "#5f6368",
    primaryContainer: "#8ab4f8",
    onPrimary: "#003061",
    successPastel: "#81c995",
    successContainer: "#e6f4ea",
    onSuccessContainer: "#137333",
    warningPastel: "#fde293",
    warningAmber: "#fdd663",
    warningContainer: "#3b2e08",
    onWarningContainer: "#fde293",
    errorPastel: "#f28b82",
    onError: "#690005",
  },
} as const;

export function resolveSystemTheme(): ResolvedTheme {
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    try {
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      return prefersLight ? "light" : "dark";
    } catch {
      return "dark";
    }
  }
  return "dark";
}

export function resolveEffectiveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") {
    return resolveSystemTheme();
  }
  return mode;
}

export function applyThemeToDocument(mode: ThemeMode): ResolvedTheme {
  const resolved = resolveEffectiveTheme(mode);
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.setAttribute("data-theme-mode", mode);
    document.documentElement.style.colorScheme = resolved;
  }
  return resolved;
}

