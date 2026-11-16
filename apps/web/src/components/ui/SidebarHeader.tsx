import React, { useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import { useUiSessionStore } from "../../lib/store";
import {
  SIDEBAR_SEARCH_INPUT_STYLE,
  getHeaderIconBtnStyle,
} from "./SidebarNavItems";

const { colors } = NOCTURNE_TOKENS;

interface SidebarHeaderProps {
  readonly isCollapsed: boolean;
  readonly toggleSidebarCollapsed: () => void;
}

export function SidebarHeader({
  isCollapsed,
  toggleSidebarCollapsed,
}: SidebarHeaderProps): React.JSX.Element {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const globalSearchQuery = useUiSessionStore((state) => state.globalSearchQuery);
  const setGlobalSearchQuery = useUiSessionStore((state) => state.setGlobalSearchQuery);

  return (
    <div
      data-testid="sidebar-header-region"
      style={{
        padding: isCollapsed ? "16px 8px" : "16px 14px 14px",
        backgroundColor: colors.surfaceContainerLow,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          flexDirection: "row",
          gap: "8px",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            minWidth: 0,
            flex: isCollapsed ? undefined : 1,
            cursor: isCollapsed ? "pointer" : "default",
          }}
          onClick={isCollapsed ? toggleSidebarCollapsed : undefined}
          onKeyDown={
            isCollapsed
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") toggleSidebarCollapsed();
                }
              : undefined
          }
          role={isCollapsed ? "button" : undefined}
          tabIndex={isCollapsed ? 0 : undefined}
          aria-label={isCollapsed ? "Expandir menu lateral" : undefined}
        >
          {/* Logo Ícone Estilo DataOpinion / PesquisaMaster */}
          <div
            data-testid="sidebar-brand-logo"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 800,
              color: "#ffffff",
              boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
              flexShrink: 0,
            }}
            title="PesquisaMaster SaaS"
          >
            PM
          </div>

          {!isCollapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
              <div
                data-testid="sidebar-company-name"
                style={{
                  fontWeight: 800,
                  fontSize: "15px",
                  color: "#f8fafc",
                  letterSpacing: "-0.02em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                PesquisaMaster
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#60a5fa",
                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                  letterSpacing: "0.02em",
                }}
              >
                SaaS
              </span>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "4px",
              flexShrink: 0,
              marginLeft: "auto",
            }}
          >
            <button
              type="button"
              data-testid="btn-sidebar-search"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              title="Pesquisar módulo"
              aria-label="Pesquisar módulo"
              aria-expanded={isSearchOpen}
              style={getHeaderIconBtnStyle(isSearchOpen)}
            >
              ⌕
            </button>
            <button
              type="button"
              data-testid="btn-toggle-sidebar"
              onClick={toggleSidebarCollapsed}
              title="Recolher menu lateral"
              aria-label="Recolher menu lateral"
              aria-expanded={true}
              style={getHeaderIconBtnStyle(false)}
            >
              ◧
            </button>
          </div>
        )}
      </div>

      {isSearchOpen && !isCollapsed && (
        <input
          type="text"
          data-testid="sidebar-search-input"
          value={globalSearchQuery}
          onChange={(e) => setGlobalSearchQuery(e.target.value)}
          placeholder="Buscar módulo ou funcionalidade..."
          aria-label="Campo de pesquisa no menu lateral"
          style={SIDEBAR_SEARCH_INPUT_STYLE}
          autoFocus
        />
      )}
    </div>
  );
}
