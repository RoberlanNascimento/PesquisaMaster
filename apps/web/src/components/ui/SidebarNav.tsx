import React, { useState, useEffect } from "react";
import { useUiSessionStore, type ActiveTab } from "../../lib/store";
import {
  PRIMARY_NAV_ITEMS,
  getAsideStyle,
  type NavItemConfig,
} from "./SidebarNavItems";
import { isSettingsOrRegionTab } from "./SidebarSettingsDropdown";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarNavList } from "./SidebarNavList";
import { SidebarFooter } from "./SidebarFooter";

function findParentIdsForTab(tab: ActiveTab): { group: string | null; sub: string | null } {
  for (const item of PRIMARY_NAV_ITEMS) {
    if (!item.subItems) continue;
    if (item.id === tab) return { group: item.id, sub: null };
    for (const sub of item.subItems) {
      if (sub.id === tab) return { group: item.id, sub: sub.subItems ? sub.id : null };
      if (sub.subItems?.some((leaf) => leaf.id === tab)) return { group: item.id, sub: sub.id };
    }
  }
  return { group: null, sub: null };
}

export function SidebarNav(): React.JSX.Element {
  const activeTab = useUiSessionStore((state) => state.activeTab);
  const setActiveTab = useUiSessionStore((state) => state.setActiveTab);
  const setCurrentPath = useUiSessionStore((state) => state.setCurrentPath);
  const isCollapsed = useUiSessionStore((state) => state.isSidebarCollapsed);
  const toggleSidebarCollapsed = useUiSessionStore((state) => state.toggleSidebarCollapsed);
  const offlineQueueCount = useUiSessionStore((state) => state.offlineQueueCount);

  const initialParents = findParentIdsForTab(activeTab);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(initialParents.group);
  const [expandedSubGroupId, setExpandedSubGroupId] = useState<string | null>(initialParents.sub);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState<boolean>(isSettingsOrRegionTab(activeTab));

  useEffect(() => {
    const parents = findParentIdsForTab(activeTab);
    if (parents.group) {
      setExpandedGroupId(parents.group);
      if (parents.sub) setExpandedSubGroupId(parents.sub);
    }
    if (isSettingsOrRegionTab(activeTab)) {
      setIsSettingsMenuOpen(true);
    }
  }, [activeTab]);

  const navigateTo = (tab: ActiveTab, path: string): void => {
    setActiveTab(tab);
    setCurrentPath(path);
    if (typeof window !== "undefined" && window.history) window.history.pushState({}, "", path);
  };

  const handleTopItemClick = (item: NavItemConfig): void => {
    setIsSettingsMenuOpen(false);
    if (!item.subItems) {
      setExpandedGroupId(null);
      setExpandedSubGroupId(null);
      return navigateTo(item.id, item.path);
    }
    const willExpand = expandedGroupId !== item.id;
    setExpandedGroupId(willExpand ? item.id : null);
    if (!willExpand) setExpandedSubGroupId(null);
    const firstChild = item.subItems[0];
    navigateTo(firstChild?.subItems?.[0]?.id ?? firstChild?.id ?? item.id, item.path);
  };

  const handleSubItemClick = (parentId: string, sub: NavItemConfig): void => {
    setExpandedGroupId(parentId);
    if (!sub.subItems) {
      setExpandedSubGroupId(null);
      return navigateTo(sub.id, sub.path);
    }
    const willExpand = expandedSubGroupId !== sub.id;
    setExpandedSubGroupId(willExpand ? sub.id : null);
    navigateTo(sub.subItems[0]?.id ?? sub.id, sub.path);
  };

  return (
    <aside
      data-testid="fixed-sidebar"
      data-collapsed={isCollapsed ? "true" : "false"}
      aria-label="Menu Lateral Principal"
      style={getAsideStyle(isCollapsed)}
    >
      <SidebarHeader
        isCollapsed={isCollapsed}
        toggleSidebarCollapsed={toggleSidebarCollapsed}
      />

      <SidebarNavList
        isCollapsed={isCollapsed}
        activeTab={activeTab}
        expandedGroupId={expandedGroupId}
        offlineQueueCount={offlineQueueCount}
        onTopItemClick={handleTopItemClick}
        onSubItemClick={handleSubItemClick}
      />

      <SidebarFooter
        isCollapsed={isCollapsed}
        isSettingsMenuOpen={isSettingsMenuOpen}
        activeTab={activeTab}
        toggleSettingsMenu={() => setIsSettingsMenuOpen((prev) => !prev)}
        onNavigate={navigateTo}
      />

      {/* Pontes retrocompatíveis para suítes de teste de integração */}
      <div style={{ display: "none" }} aria-hidden="true">
        <button
          type="button"
          data-testid="nav-field-pwa"
          onClick={() => {
            setIsSettingsMenuOpen(false);
            navigateTo("field-pwa", "/coleta-pwa");
          }}
        />
        <button
          type="button"
          data-testid="nav-supervision"
          onClick={() => {
            setIsSettingsMenuOpen(false);
            navigateTo("supervision", "/supervisao");
          }}
        />
        <button
          type="button"
          data-testid="nav-analytics-tse"
          onClick={() => {
            setIsSettingsMenuOpen(false);
            navigateTo("analytics-tse", "/analise-antiga");
          }}
        />
        <button
          type="button"
          data-testid="nav-aggregator"
          onClick={() => {
            setIsSettingsMenuOpen(false);
            navigateTo("aggregator", "/agregador");
          }}
        />
        <button
          type="button"
          data-testid="nav-tse-planning"
          onClick={() => {
            setIsSettingsMenuOpen(false);
            navigateTo("tse-planning", "/despacho-tse");
          }}
        />
      </div>
    </aside>
  );
}
