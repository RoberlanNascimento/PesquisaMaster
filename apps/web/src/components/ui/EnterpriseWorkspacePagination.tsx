import React from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";

const { colors, rounded } = NOCTURNE_TOKENS;

export function EnterpriseWorkspacePagination({
  total,
  pageSize,
  onPageSizeChange,
  currentPage,
  totalPages,
  onPageChange,
}: {
  readonly total: number;
  readonly pageSize: number;
  readonly onPageSizeChange?: (size: number) => void;
  readonly currentPage: number;
  readonly totalPages: number;
  readonly onPageChange?: (page: number) => void;
}): React.JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderTop: `1px solid ${colors.borderSubtle}`,
        backgroundColor: colors.surfaceContainerLow,
        fontSize: "12px",
        color: colors.textMuted,
        flexWrap: "wrap",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span>
          Total: <strong style={{ color: colors.textPrimary }}>{total}</strong> registros
        </span>
        {onPageSizeChange && (
          <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span>Por página:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{
                padding: "4px 8px",
                borderRadius: rounded.DEFAULT,
                border: `1px solid ${colors.borderSubtle}`,
                backgroundColor: colors.surfaceCard,
                color: colors.textPrimary,
                fontSize: "12px",
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span>
          Página <strong style={{ color: colors.textPrimary }}>{currentPage}</strong> de{" "}
          <strong style={{ color: colors.textPrimary }}>{totalPages}</strong>
        </span>
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange?.(currentPage - 1)}
          style={{
            padding: "5px 12px",
            borderRadius: rounded.DEFAULT,
            border: `1px solid ${colors.borderSubtle}`,
            backgroundColor: colors.surfaceElevated,
            color: colors.textPrimary,
            cursor: currentPage <= 1 ? "not-allowed" : "pointer",
            opacity: currentPage <= 1 ? 0.45 : 1,
          }}
        >
          Anterior
        </button>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange?.(currentPage + 1)}
          style={{
            padding: "5px 12px",
            borderRadius: rounded.DEFAULT,
            border: `1px solid ${colors.borderSubtle}`,
            backgroundColor: colors.surfaceElevated,
            color: colors.textPrimary,
            cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
            opacity: currentPage >= totalPages ? 0.45 : 1,
          }}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
