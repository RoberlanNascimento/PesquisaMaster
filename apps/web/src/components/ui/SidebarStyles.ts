import type React from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors, typography, rounded } = NOCTURNE_TOKENS;

export function getAsideStyle(isCollapsed: boolean): React.CSSProperties {
  return {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: isCollapsed ? "72px" : "285px",
    backgroundColor: colors.surfaceContainerLow,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: 0,
    boxSizing: "border-box",
    borderRight: `1px solid ${colors.borderSubtle}`,
    zIndex: 100,
    overflow: "hidden",
    transition: "width 0.2s ease",
  };
}

export const SUBMENU_UL_STYLE: React.CSSProperties = {
  listStyle: "none",
  margin: "2px 0 4px 0",
  paddingLeft: "18px",
  borderLeft: "none",
  display: "grid",
  gap: "2px",
};

export const NESTED_SUBMENU_UL_STYLE: React.CSSProperties = {
  listStyle: "none",
  margin: "2px 0 4px 0",
  paddingLeft: "16px",
  borderLeft: "none",
  display: "grid",
  gap: "2px",
};

export function getNavBtnStyle(isActive: boolean, isCollapsed: boolean): React.CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    padding: isCollapsed ? "10px 0" : "9px 14px",
    borderRadius: rounded.full,
    border: "1px solid transparent",
    backgroundColor: isActive ? colors.surfaceElevated : "transparent",
    color: isActive ? colors.textMuted : "#ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: isCollapsed ? "center" : "space-between",
    fontSize: "14px",
    fontWeight: isActive ? 600 : 500,
    fontFamily: "inherit",
    transition: "background 0.15s ease, color 0.15s ease",
  };
}

export function getSubNavBtnStyle(isActive: boolean): React.CSSProperties {
  return {
    width: "100%",
    textAlign: "left",
    padding: "7px 12px",
    borderRadius: rounded.full,
    border: "1px solid transparent",
    backgroundColor: isActive ? colors.surfaceCard : "transparent",
    color: isActive ? colors.textMuted : "#ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "13px",
    fontWeight: isActive ? 600 : 400,
    fontFamily: "inherit",
    transition: "background 0.15s ease, color 0.15s ease",
  };
}

export function getHeaderIconBtnStyle(active = false): React.CSSProperties {
  return {
    backgroundColor: active ? colors.surfaceElevated : "transparent",
    border: "1px solid transparent",
    color: active ? colors.textPrimary : colors.textMuted,
    borderRadius: rounded.full,
    width: "28px",
    height: "28px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: "13px",
    flexShrink: 0,
  };
}

export const SIDEBAR_LOGO_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "24px",
  borderRadius: "6px",
  backgroundColor: colors.primaryContainer,
  fontWeight: 700,
  fontSize: "10px",
  color: colors.onPrimary,
  flexShrink: 0,
};

export const SIDEBAR_SEARCH_INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "6px 10px",
  fontSize: "12px",
  borderRadius: rounded.full,
  border: `1px solid ${colors.borderSubtle}`,
  backgroundColor: colors.surfaceCard,
  color: colors.textPrimary,
  boxSizing: "border-box",
};

export const SIDEBAR_AVATAR_STYLE: React.CSSProperties = {
  width: "26px",
  height: "26px",
  borderRadius: rounded.full,
  backgroundColor: colors.surfaceElevated,
  border: `1px solid ${colors.borderSubtle}`,
  color: colors.textPrimary,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "10px",
  fontWeight: 700,
  flexShrink: 0,
};

