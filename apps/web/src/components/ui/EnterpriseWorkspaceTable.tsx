import React from "react";
import { NOCTURNE_TOKENS } from "../../lib/designTokens";
import type {
  WorkspaceColumn,
  BatchAction,
} from "./EnterpriseCrudWorkspaceTypes";

const { colors } = NOCTURNE_TOKENS;

export function EnterpriseWorkspaceTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading,
  emptyTitle,
  emptyDescription,
  emptyAction,
  batchActions,
  selectedKeys,
  isAllSelected,
  toggleSelectAll,
  toggleSelectKey,
  renderRowActions,
}: {
  readonly columns: readonly WorkspaceColumn<T>[];
  readonly data: readonly T[];
  readonly keyExtractor: (item: T) => string;
  readonly isLoading: boolean;
  readonly emptyTitle: string;
  readonly emptyDescription: string;
  readonly emptyAction?: React.ReactNode;
  readonly batchActions?: readonly BatchAction<T>[];
  readonly selectedKeys: ReadonlySet<string>;
  readonly isAllSelected: boolean;
  readonly toggleSelectAll: () => void;
  readonly toggleSelectKey: (key: string) => void;
  readonly renderRowActions?: (item: T) => React.ReactNode;
}): React.JSX.Element {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left",
          fontSize: "13px",
          color: colors.textPrimary,
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: colors.surfaceContainerLow,
              borderBottom: `1px solid ${colors.borderSubtle}`,
            }}
          >
            {batchActions && (
              <th style={{ width: "40px", padding: "12px 16px" }}>
                <input
                  type="checkbox"
                  aria-label="Selecionar todos os itens da página"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: colors.textMuted,
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  textAlign: col.align ?? "left",
                  width: col.width,
                }}
              >
                {col.header}
              </th>
            ))}
            {renderRowActions && (
              <th
                style={{
                  padding: "12px 16px",
                  fontWeight: 600,
                  color: colors.textMuted,
                  fontSize: "11px",
                  textTransform: "uppercase",
                  textAlign: "right",
                  width: "160px",
                }}
              >
                Ações
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={`skeleton-${i}`} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                <td
                  colSpan={columns.length + (batchActions ? 1 : 0) + (renderRowActions ? 1 : 0)}
                  style={{ padding: "16px" }}
                >
                  <div
                    style={{
                      height: "16px",
                      backgroundColor: colors.surfaceElevated,
                      borderRadius: "4px",
                    }}
                  />
                </td>
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (batchActions ? 1 : 0) + (renderRowActions ? 1 : 0)}
                style={{ padding: "48px 16px", textAlign: "center" }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "32px" }}>🔍</span>
                  <strong style={{ fontSize: "15px", color: colors.textPrimary }}>
                    {emptyTitle}
                  </strong>
                  <p style={{ margin: 0, fontSize: "13px", color: colors.textMuted }}>
                    {emptyDescription}
                  </p>
                  {emptyAction && <div style={{ marginTop: "12px" }}>{emptyAction}</div>}
                </div>
              </td>
            </tr>
          ) : (
            data.map((item) => {
              const key = keyExtractor(item);
              const isSelected = selectedKeys.has(key);
              return (
                <tr
                  key={key}
                  onClick={() => toggleSelectKey(key)}
                  style={{
                    borderBottom: `1px solid ${colors.borderSubtle}`,
                    backgroundColor: isSelected ? "#1e293b" : colors.surfaceCard,
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                  }}
                >
                  {batchActions && (
                    <td style={{ padding: "12px 16px" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectKey(key)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: "12px 16px",
                        textAlign: col.align ?? "left",
                        color: colors.textPrimary,
                      }}
                    >
                      {col.render(item)}
                    </td>
                  ))}
                  {renderRowActions && (
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: "6px",
                          justifyContent: "flex-end",
                        }}
                      >
                        {renderRowActions(item)}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
