import React, { useEffect, useRef, useState } from "react";
import { usePermissions } from "../security/RbacGuard";
import { useUiSessionStore, type ActiveTab } from "../../lib/store";
import type { NavItemConfig } from "./SidebarNavItems";
import {
  GEO_DROPDOWN_ITEMS,
  ACCESS_DROPDOWN_ITEMS,
  CATALOG_DROPDOWN_ITEMS,
  AUDIT_DROPDOWN_ITEMS,
} from "./SidebarSettingsItems";
import { ThemeModeSwitcher } from "./ThemeModeSwitcher";

export interface SidebarSettingsDropdownProps {
  readonly isOpen: boolean;
  readonly isCollapsed?: boolean;
  readonly activeTab: ActiveTab;
  readonly onNavigate: (tab: ActiveTab, path: string) => void;
  readonly onClose?: () => void;
}

const REGION_TAB_IDS: readonly ActiveTab[] = [
  "regions-group",
  "regions-country",
  "regions-states",
  "regions-municipalities",
  "regions",
  "regions-neighborhoods",
  "geo-demography-ibge",
  "geo-electorate-tse",
];

const SETTINGS_DROPDOWN_TABS: readonly ActiveTab[] = [
  ...REGION_TAB_IDS,
  "users-rbac",
  "researchers",
  "client-company",
  "company",
  "catalog-candidates",
  "catalog-questions",
  "catalog-battery-items",
  "catalog-scales",
  "catalog-answer-options",
  "security-audit",
  "settings",
];

export function isSettingsOrRegionTab(tab: ActiveTab): boolean {
  return SETTINGS_DROPDOWN_TABS.includes(tab);
}

export function SidebarSettingsDropdown({
  isOpen,
  isCollapsed = false,
  activeTab,
  onNavigate,
  onClose,
}: SidebarSettingsDropdownProps): React.JSX.Element | null {
  const clientCompaniesCount = useUiSessionStore((state) => state.clientCompanies.length);
  const logout = useUiSessionStore((state) => state.logout);
  const { hasPermission } = usePermissions();
  const isAdmin = hasPermission(["ADMIN_SISTEMA"]);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Configurações: true,
    Empresa: true,
    Catálogo: true,
    Auditoria: true,
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-testid="sidebar-settings-toggle"], [aria-label*="Configurações"]')) {
        return;
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const renderItem = (item: NavItemConfig): React.JSX.Element => {
    const isActive = activeTab === item.id;
    const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
    const isExpanded = Boolean(expandedItems[item.id]);
    return (
      <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <button
          type="button"
          data-testid={`nav-${item.id}`}
          onClick={() => {
            if (hasSubItems) {
              setExpandedItems((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
            } else {
              onNavigate(item.id, item.path);
              onClose?.();
            }
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 8px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: isActive ? "#1e293b" : "transparent",
            color: isActive ? "#8ab4f8" : "#cbd5e1",
            fontSize: "14px",
            fontWeight: isActive ? 600 : 400,
            cursor: "pointer",
            textAlign: "left",
            width: "100%",
            transition: "background 0.15s ease",
          }}
        >
          <span style={{ filter: "grayscale(1) brightness(1.15)", display: "inline-flex" }}>{item.icon}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.label}
          </span>
          {item.id === "client-company" && (
            <span
              data-testid="sidebar-clients-badge"
              style={{
                marginLeft: "auto",
                backgroundColor: "#3b82f6",
                color: "#ffffff",
                fontSize: "10px",
                fontWeight: 700,
                borderRadius: "9999px",
                padding: "1px 6px",
              }}
            >
              {clientCompaniesCount}
            </span>
          )}
          {hasSubItems && (
            <span style={{ marginLeft: "auto", fontSize: "11px", color: "#94a3b8" }}>
              {isExpanded ? "⌄" : "›"}
            </span>
          )}
        </button>
        {hasSubItems && isExpanded && item.subItems?.map((sub) => {
          const isSubActive = activeTab === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              data-testid={`nav-${sub.id}`}
              onClick={() => {
                onNavigate(sub.id, sub.path);
                onClose?.();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px 4px 24px",
                borderRadius: "4px",
                border: "none",
                backgroundColor: isSubActive ? "#1e293b" : "transparent",
                color: isSubActive ? "#8ab4f8" : "#94a3b8",
                fontSize: "13px",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
              }}
            >
              <span style={{ filter: "grayscale(1) brightness(1.15)", display: "inline-flex" }}>{sub.icon}</span>
              <span>{sub.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderSection = (
    title: string,
    items: readonly NavItemConfig[],
    testId?: string
  ): React.JSX.Element => {
    const isSectionOpen = Boolean(expandedSections[title]);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <button
          type="button"
          data-testid={testId}
          onClick={() =>
            setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }))
          }
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: "8px 10px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: isSectionOpen ? "#282a2c" : "transparent",
            color: isSectionOpen ? "#f8fafc" : "#94a3b8",
            fontSize: "16px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span>{title}</span>
          <span style={{ fontSize: "12px" }}>{isSectionOpen ? "⌄" : "›"}</span>
        </button>
        {isSectionOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", paddingLeft: "6px" }}>
            {items.map(renderItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={dropdownRef}
      data-testid="sidebar-settings-dropdown"
      role="menu"
      aria-label="Painel de Configurações & Parametrização"
      style={{
        position: "fixed",
        bottom: "16px",
        left: isCollapsed ? "80px" : "272px",
        width: "320px",
        maxWidth: "calc(100vw - 32px)",
        maxHeight: "82vh",
        overflowY: "auto",
        backgroundColor: "#1e1f20",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "16px",
        padding: "16px 20px 20px",
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.55)",
        zIndex: 500,
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? "translateY(0) scale(1)" : "translateY(8px) scale(0.97)",
        pointerEvents: isOpen ? "auto" : "none",
        transition: "opacity 180ms ease, transform 180ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {renderSection("Demografia", GEO_DROPDOWN_ITEMS, "sidebar-settings-group-label")}
        {isAdmin && renderSection("Empresa", ACCESS_DROPDOWN_ITEMS, "sidebar-company-group-label")}
        {renderSection("Catálogo", CATALOG_DROPDOWN_ITEMS)}
        {isAdmin && renderSection("Auditoria", AUDIT_DROPDOWN_ITEMS, "sidebar-audit-group-label")}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          paddingTop: "10px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "#94a3b8",
          }}
        >
          Tema
        </span>
        <ThemeModeSwitcher showResolvedBadge={false} testIdPrefix="sidebar-settings-theme" />
      </div>

      <button
        type="button"
        onClick={() => {
          onClose?.();
          logout();
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          padding: "8px 10px",
          borderRadius: "8px",
          border: "none",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "transparent",
          color: "#f28b82",
          fontSize: "15px",
          fontWeight: 600,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span>⎋</span>
        <span>Sair</span>
      </button>
    </div>
  );
}
