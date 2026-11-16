import React from "react";
import { useUiSessionStore, type ActiveTab } from "../../lib/store";
import type { NavItemConfig } from "./SidebarNavItems";
import { SidebarIcon } from "./SidebarIcons";
import {
  GEO_DROPDOWN_ITEMS,
  ACCESS_DROPDOWN_ITEMS,
  CATALOG_DROPDOWN_ITEMS,
  AUDIT_DROPDOWN_ITEMS,
} from "./SidebarSettingsItems";

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
  "audit-reassignment",
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

  if (!isOpen) return null;

  const renderItem = (item: NavItemConfig): React.JSX.Element => {
    const isActive = activeTab === item.id;
    return (
      <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <button
          type="button"
          data-testid={`nav-${item.id}`}
          onClick={() => onNavigate(item.id, item.path)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 8px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: isActive ? "#1e293b" : "transparent",
            color: isActive ? "#8ab4f8" : "#cbd5e1",
            fontSize: "12px",
            fontWeight: isActive ? 600 : 400,
            cursor: "pointer",
            textAlign: "left",
            width: "100%",
            transition: "background 0.15s ease",
          }}
        >
          <span>{item.icon}</span>
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
        </button>
        {item.subItems?.map((sub) => {
          const isSubActive = activeTab === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              data-testid={`nav-${sub.id}`}
              onClick={() => onNavigate(sub.id, sub.path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px 4px 24px",
                borderRadius: "4px",
                border: "none",
                backgroundColor: isSubActive ? "#1e293b" : "transparent",
                color: isSubActive ? "#8ab4f8" : "#94a3b8",
                fontSize: "11px",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
              }}
            >
              <span>{sub.icon}</span>
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
  ): React.JSX.Element => (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span
        data-testid={testId}
        style={{ fontSize: "10.5px", fontWeight: 700, color: "#64748b", letterSpacing: "0.05em" }}
      >
        {title}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {items.map(renderItem)}
      </div>
    </div>
  );

  return (
    <div
      data-testid="sidebar-settings-dropdown"
      role="menu"
      aria-label="Painel de Configurações & Parametrização"
      style={{
        position: "fixed",
        bottom: "16px",
        left: isCollapsed ? "80px" : "272px",
        width: "min(960px, calc(100vw - 300px))",
        maxHeight: "86vh",
        overflowY: "auto",
        backgroundColor: "#0b1329",
        border: "1px solid #1e293b",
        borderRadius: "16px",
        padding: "16px 20px 20px",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.8)",
        zIndex: 500,
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #1e293b",
          paddingBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <SidebarIcon name="settings" size={16} style={{ color: "#94a3b8" }} />
          <span style={{ fontSize: "13px", fontWeight: 800, color: "#f8fafc", letterSpacing: "0.04em" }}>
            CONFIGURAÇÕES & PARAMETRIZAÇÃO
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Fechar menu"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              fontSize: "14px",
              padding: "2px 6px",
              borderRadius: "4px",
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(180px, 1fr))",
          gap: "16px",
        }}
      >
        {renderSection("Configurações", GEO_DROPDOWN_ITEMS, "sidebar-settings-group-label")}
        {renderSection("Empresa", ACCESS_DROPDOWN_ITEMS, "sidebar-company-group-label")}
        {renderSection("Catálogo", CATALOG_DROPDOWN_ITEMS)}
        {renderSection("Auditoria", AUDIT_DROPDOWN_ITEMS, "sidebar-audit-group-label")}
      </div>
    </div>
  );
}
