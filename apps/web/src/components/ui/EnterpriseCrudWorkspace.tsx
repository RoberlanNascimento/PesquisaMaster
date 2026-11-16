import React, { useState } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import type { EnterpriseCrudWorkspaceProps } from "./EnterpriseCrudWorkspaceTypes";
import { EnterpriseWorkspaceFilters } from "./EnterpriseWorkspaceFilters";
import { EnterpriseWorkspaceHeader } from "./EnterpriseWorkspaceHeader";
import { EnterpriseWorkspaceTable } from "./EnterpriseWorkspaceTable";
import { EnterpriseWorkspacePagination } from "./EnterpriseWorkspacePagination";

const { colors, rounded, typography } = NOCTURNE_TOKENS;

export function EnterpriseCrudWorkspace<T>({
  title,
  subtitle,
  globalActions,
  tabs,
  activeTab,
  onTabChange,
  kpis,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filters,
  onClearFilters,
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyTitle = "Nenhum registro encontrado",
  emptyDescription = "Tente ajustar os comboboxes de filtro ou a busca.",
  emptyAction,
  batchActions,
  pageSize = 10,
  onPageSizeChange,
  currentPage = 1,
  totalItems,
  onPageChange,
  renderRowActions,
}: EnterpriseCrudWorkspaceProps<T>): React.JSX.Element {
  const [selectedKeys, setSelectedKeys] = useState<ReadonlySet<string>>(new Set());

  const total = totalItems ?? data.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const allKeys = data.map(keyExtractor);
  const isAllSelected = data.length > 0 && allKeys.every((k) => selectedKeys.has(k));

  const toggleSelectAll = (): void => {
    if (isAllSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(allKeys));
    }
  };

  const toggleSelectKey = (key: string): void => {
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedKeys(next);
  };

  const selectedItems = data.filter((item) => selectedKeys.has(keyExtractor(item)));

  return (
    <div style={{ display: "flex", flexDirection: "column", fontFamily: typography.fontFamily }}>
      <EnterpriseWorkspaceHeader
        title={title}
        subtitle={subtitle}
        globalActions={globalActions}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        kpis={kpis}
      />

      <EnterpriseWorkspaceFilters
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        filters={filters}
        onClearFilters={onClearFilters}
      />

      {batchActions && selectedKeys.size > 0 && (
        <div
          data-testid="batch-actions-bar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            backgroundColor: colors.surfaceElevated,
            border: `1px solid ${colors.primaryContainer}`,
            borderRadius: rounded.lg,
            marginBottom: "14px",
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 600, color: colors.primary }}>
            {selectedKeys.size} item(ns) selecionado(s)
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            {batchActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => {
                  action.onExecute(selectedItems);
                  setSelectedKeys(new Set());
                }}
                style={{
                  padding: "7px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderRadius: rounded.md,
                  border: "none",
                  cursor: "pointer",
                  backgroundColor:
                    action.variant === "danger"
                      ? colors.errorPastel
                      : action.variant === "success"
                        ? colors.successPastel
                        : colors.primaryContainer,
                  color:
                    action.variant === "danger"
                      ? colors.onError
                      : action.variant === "success"
                        ? colors.onSecondary
                        : colors.onPrimary,
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          backgroundColor: colors.surfaceCard,
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: rounded.lg,
          overflow: "hidden",
        }}
      >
        <EnterpriseWorkspaceTable<T>
          columns={columns}
          data={data}
          keyExtractor={keyExtractor}
          isLoading={isLoading}
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
          emptyAction={emptyAction}
          batchActions={batchActions}
          selectedKeys={selectedKeys}
          isAllSelected={isAllSelected}
          toggleSelectAll={toggleSelectAll}
          toggleSelectKey={toggleSelectKey}
          renderRowActions={renderRowActions}
        />

        <EnterpriseWorkspacePagination
          total={total}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
