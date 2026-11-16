import React, { useState, useEffect } from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import type { WorkspaceFilterConfig } from "./EnterpriseCrudWorkspaceTypes";

const { colors, rounded, typography } = NOCTURNE_TOKENS;

export function EnterpriseWorkspaceFilters({
  searchPlaceholder = "Buscar...",
  searchValue = "",
  onSearchChange,
  filters,
  onClearFilters,
}: {
  readonly searchPlaceholder?: string;
  readonly searchValue?: string;
  readonly onSearchChange?: (val: string) => void;
  readonly filters?: readonly WorkspaceFilterConfig[];
  readonly onClearFilters?: () => void;
}): React.JSX.Element {
  const [localSearch, setLocalSearch] = useState(searchValue);

  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  useEffect(() => {
    if (!onSearchChange) return;
    const timer = setTimeout(() => {
      if (localSearch !== searchValue) {
        onSearchChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange, searchValue]);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "12px",
        padding: "16px",
        backgroundColor: colors.surfaceCard,
        border: `1px solid ${colors.borderSubtle}`,
        borderRadius: rounded.lg,
        marginBottom: "16px",
      }}
    >
      <div style={{ flex: "1 1 220px", minWidth: "180px" }}>
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder={searchPlaceholder}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "10px 14px",
            fontSize: typography.bodyMd.fontSize,
            borderRadius: rounded.md,
            border: `1px solid ${colors.borderSubtle}`,
            outline: "none",
            backgroundColor: colors.surfaceContainerLow,
            color: colors.textPrimary,
          }}
        />
      </div>

      {filters &&
        filters.map((filter) => (
          <div
            key={filter.id}
            style={{ display: "flex", flexDirection: "column", gap: "4px" }}
          >
            <label
              htmlFor={`filter-${filter.id}`}
              style={{
                fontSize: typography.caption.fontSize,
                fontWeight: 500,
                color: colors.textMuted,
              }}
            >
              {filter.label}
            </label>
            <select
              id={`filter-${filter.id}`}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              style={{
                padding: "9px 12px",
                fontSize: "13px",
                borderRadius: rounded.md,
                border: `1px solid ${colors.borderSubtle}`,
                backgroundColor: colors.surfaceContainerLow,
                color: colors.textPrimary,
                cursor: "pointer",
              }}
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          style={{
            alignSelf: "flex-end",
            padding: "9px 16px",
            fontSize: "12px",
            fontWeight: 500,
            borderRadius: rounded.md,
            border: `1px solid ${colors.borderSubtle}`,
            backgroundColor: colors.surfaceElevated,
            color: colors.textPrimary,
            cursor: "pointer",
            marginTop: "auto",
          }}
        >
          Limpar Filtros
        </button>
      )}
    </div>
  );
}
