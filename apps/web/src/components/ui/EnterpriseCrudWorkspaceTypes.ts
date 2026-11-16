import React from "react";

export type KpiVariant = "default" | "success" | "warning" | "danger";

export interface WorkspaceKpi {
  readonly id: string;
  readonly label: string;
  readonly value: string | number;
  readonly helperText?: string;
  readonly variant?: KpiVariant;
}

export interface WorkspaceTab {
  readonly id: string;
  readonly label: string;
  readonly count?: number;
}

export interface WorkspaceFilterOption {
  readonly label: string;
  readonly value: string;
}

export interface WorkspaceFilterConfig {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly options: readonly WorkspaceFilterOption[];
  readonly onChange: (value: string) => void;
}

export interface WorkspaceColumn<T> {
  readonly key: string;
  readonly header: string;
  readonly render: (item: T) => React.ReactNode;
  readonly align?: "left" | "center" | "right";
  readonly width?: string;
}

export interface BatchAction<T> {
  readonly id: string;
  readonly label: string;
  readonly variant?: "primary" | "success" | "danger" | "warning" | "secondary";
  readonly onExecute: (selectedItems: readonly T[]) => void;
}

export interface EnterpriseCrudWorkspaceProps<T> {
  readonly title: string;
  readonly subtitle?: string;
  readonly globalActions?: React.ReactNode;
  readonly tabs?: readonly WorkspaceTab[];
  readonly activeTab?: string;
  readonly onTabChange?: (tabId: string) => void;
  readonly kpis?: readonly WorkspaceKpi[];
  readonly searchPlaceholder?: string;
  readonly searchValue?: string;
  readonly onSearchChange?: (val: string) => void;
  readonly filters?: readonly WorkspaceFilterConfig[];
  readonly onClearFilters?: () => void;
  readonly columns: readonly WorkspaceColumn<T>[];
  readonly data: readonly T[];
  readonly keyExtractor: (item: T) => string;
  readonly isLoading?: boolean;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly emptyAction?: React.ReactNode;
  readonly batchActions?: readonly BatchAction<T>[];
  readonly pageSize?: number;
  readonly onPageSizeChange?: (size: number) => void;
  readonly currentPage?: number;
  readonly totalItems?: number;
  readonly onPageChange?: (page: number) => void;
  readonly renderRowActions?: (item: T) => React.ReactNode;
}

