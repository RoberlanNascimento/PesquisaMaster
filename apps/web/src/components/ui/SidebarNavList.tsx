import React from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import type { ActiveTab } from "../../lib/store";
import {
  PRIMARY_NAV_ITEMS,
  getNavBtnStyle,
  getSubNavBtnStyle,
  type NavItemConfig,
  SidebarIcon,
} from "./SidebarNavItems";

const { colors, rounded } = NOCTURNE_TOKENS;

interface SidebarNavListProps {
  readonly isCollapsed: boolean;
  readonly activeTab: ActiveTab;
  readonly expandedGroupId: string | null;
  readonly offlineQueueCount: number;
  readonly onTopItemClick: (item: NavItemConfig) => void;
  readonly onSubItemClick: (parentId: string, sub: NavItemConfig) => void;
}

export function SidebarNavList({
  isCollapsed,
  activeTab,
  expandedGroupId,
  offlineQueueCount,
  onTopItemClick,
  onSubItemClick,
}: SidebarNavListProps): React.JSX.Element {
  return (
    <nav
      aria-label="Módulos do Sistema"
      style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        padding: isCollapsed ? "8px" : "8px 12px",
      }}
    >
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "6px" }}>
        {PRIMARY_NAV_ITEMS.map((item) => {
          const isTseDispatch = item.id === "dispatch-tse-group";
          const isDashboard = item.id === "overview";
          const isActive =
            activeTab === item.id ||
            Boolean(
              item.subItems?.some(
                (sub) =>
                  sub.id === activeTab ||
                  Boolean(sub.subItems?.some((leaf) => leaf.id === activeTab)),
              ),
            );
          const isGroupOpen = !isCollapsed && expandedGroupId === item.id;

          // Estilo especial do Despacho TSE (Card Dourado/Oliva)
          if (isTseDispatch && !isCollapsed) {
            return (
              <li key={item.id} style={{ marginTop: "6px" }}>
                <button
                  type="button"
                  title={item.label}
                  data-testid={`nav-${item.id}`}
                  onClick={() => onTopItemClick(item)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "9px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(234, 179, 8, 0.4)",
                    background: "linear-gradient(135deg, rgba(38, 42, 20, 0.85) 0%, rgba(52, 56, 24, 0.85) 100%)",
                    color: "#fef08a",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.15s ease",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                  }}
                >
                  <SidebarIcon name={item.icon} size={18} style={{ color: "#facc15" }} />
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "#fef08a" }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: "10.5px", color: "#eab308", opacity: 0.9 }}>
                      {item.subtitle}
                    </span>
                  </div>
                </button>
              </li>
            );
          }

          // Estilo especial do Dashboard com subtítulo
          if (isDashboard && !isCollapsed) {
            return (
              <li key={item.id}>
                <button
                  type="button"
                  title={item.label}
                  data-testid={`nav-${item.id}`}
                  onClick={() => onTopItemClick(item)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: isActive ? `1px solid ${colors.borderSubtle}` : "1px solid transparent",
                    backgroundColor: isActive ? "#1e293b" : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "background 0.15s ease",
                  }}
                >
                  <SidebarIcon
                    name="overview"
                    size={18}
                    style={{ color: isActive ? "#38bdf8" : "#94a3b8" }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontSize: "13.5px", fontWeight: 700, color: colors.textPrimary }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: "10.5px", color: colors.textMuted }}>
                      {item.subtitle}
                    </span>
                  </div>
                </button>
              </li>
            );
          }

          return (
            <li key={item.id}>
              <button
                type="button"
                title={item.label}
                data-testid={`nav-${item.id}`}
                aria-expanded={item.subItems ? isGroupOpen : undefined}
                onClick={() => onTopItemClick(item)}
                style={getNavBtnStyle(isActive, isCollapsed)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <SidebarIcon
                    name={item.icon}
                    size={17}
                    style={{
                      color: isActive ? "#38bdf8" : "#94a3b8",
                      transition: "color 0.15s ease",
                    }}
                  />
                  {!isCollapsed && (
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontWeight: 700,
                        fontSize: "13px",
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </div>
                {!isCollapsed &&
                  (item.id === "fieldwork-group" || item.id === "field-pwa") &&
                  offlineQueueCount > 0 && (
                    <span
                      data-testid="sidebar-offline-badge"
                      style={{
                        backgroundColor: colors.warningAmber,
                        color: "#302000",
                        borderRadius: rounded.full,
                        padding: "1px 7px",
                        fontSize: "10px",
                        fontWeight: 700,
                      }}
                    >
                      {offlineQueueCount}
                    </span>
                  )}
              </button>

              {/* Árvore com Linha-Guia Lateral */}
              {isGroupOpen && item.subItems && (
                <ul
                  style={{
                    listStyle: "none",
                    margin: "3px 0 6px 14px",
                    paddingLeft: "12px",
                    borderLeft: "1.5px solid rgba(51, 65, 85, 0.7)",
                    display: "grid",
                    gap: "2px",
                  }}
                >
                  {item.subItems.map((sub) => {
                    const isSubActive =
                      activeTab === sub.id ||
                      Boolean(sub.subItems?.some((leaf) => leaf.id === activeTab));
                    return (
                      <li key={sub.id}>
                        <button
                          type="button"
                          title={sub.label}
                          data-testid={`nav-${sub.id}`}
                          onClick={() => onSubItemClick(item.id, sub)}
                          style={{
                            ...getSubNavBtnStyle(isSubActive),
                            fontSize: "12px",
                            padding: "6px 8px",
                            color: isSubActive ? "#ffffff" : "#94a3b8",
                            fontWeight: isSubActive ? 600 : 400,
                          }}
                        >
                          <span
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {sub.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
