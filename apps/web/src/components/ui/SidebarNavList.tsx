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
                    size={19}
                    style={{
                      color: isActive ? "#d1d5db" : "#ffffff",
                      transition: "color 0.15s ease",
                      flexShrink: 0,
                    }}
                  />
                  {!isCollapsed && (
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontWeight: 700,
                        fontSize: "16px",
                        lineHeight: "22px",
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
                            fontSize: "14px",
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
