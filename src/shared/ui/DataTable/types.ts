import type { ReactNode } from "react";
export type Column<T> = {
    key: string;
    label: string;
    header?: ReactNode;
    mobile?: boolean;
    mobileWidth?: string;
    render(item: T): ReactNode;
};
export type Pager = {
    index: number;
    pageSize: number;
    setPageSize(size: number): void;
    totalCount?: number;
    items: unknown[];
    canPrev: boolean;
    canNext: boolean;
    loading: boolean;
    prev(): unknown;
    next(): unknown;
};
export type TableSelection<T> = {
    ids: string[];
    items: T[];
    clear(): void;
};
export type DataTableProps<T> = {
    getRowName?(item: T): string;
    fillHeight?: boolean;
    /** Render the full table without an inner vertical scroll. Use for compact overview tables. */
    fitContent?: boolean;
    virtualize?: boolean;
    rowHeight?: number | ((item: T) => number);
    loadingMore?: boolean;
    onEndReached?(): void;
    /** Distance from the scroll end that starts loading the next page, in pixels. */
    endReachedThreshold?: number;
    /** Extra rows rendered above and below the viewport in virtual mode. */
    virtualOverscan?: number;
    selectionPadding?: number;
    canSelect?: boolean;
    /** "all" makes the header checkbox select every item, not only the current page. */
    selectAllMode?: "page" | "all";
    rowKind?(item: T): "record" | "summary";
    clearSelectionToken?: number;
    selectionActions?(selection: TableSelection<T>): ReactNode;
    initialWidths?: number[];
    rowClassName?(item: T): string;
    items: T[];
    columns: Column<T>[];
    pager?: Pager;
    previewFields?: Column<T>[];
    previewColumns?: Column<T>[];
    loadPreview?(item: T): Promise<T>;
    emptyLabel: string;
    editLabel?: string;
    deleteLabel?: string;
    deleteConfirmText?: (count: number) => string;
    deleteConfirmLabel?: string;
    className?: string;
    summary?: ReactNode;
    busy?: boolean;
    error?: string | null;
    errorContent?: ReactNode;
    canEdit?: boolean;
    rowCanEdit?(item: T): boolean;
    rowCanDelete?(item: T): boolean;
    canDelete?: boolean;
    selectable?: boolean;
    onEdit?(item: T): void;
    onInspect?(item: T): void;
    onDelete?(item: T): Promise<unknown>;
    /** Atomic multi-record deletion. Used instead of per-record onDelete calls. */
    onDeleteMany?(items: T[]): Promise<unknown>;
    onDeleted?(ids: string[]): unknown;
    actions?(item: T): ReactNode;
    mobileActions?: boolean;
    pagination?: boolean;
    inspectable?: boolean;
};
