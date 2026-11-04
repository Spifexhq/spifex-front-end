import type { ReactNode } from "react";
export type Column<T> = { key: string; label: string; header?: ReactNode; mobile?: boolean; render(item: T): ReactNode };
export type Pager = { index: number; pageSize: number; setPageSize(size: number): void; totalCount?: number; items: unknown[]; canPrev: boolean; canNext: boolean; loading: boolean; prev(): unknown; next(): unknown };
export type DataTableProps<T> = {
 initialWidths?: number[]; rowClassName?(item:T):string; items: T[]; columns: Column<T>[]; pager?: Pager; previewFields?: Column<T>[];
 emptyLabel: string; editLabel?: string; translationNamespace?: string; className?: string;
 summary?: ReactNode; busy?: boolean; error?: string | null; errorContent?: ReactNode;
 canEdit?: boolean; canDelete?: boolean; selectable?: boolean;
 onEdit?(item:T):void; onInspect?(item:T):void;
 onDelete?(item:T):Promise<unknown>; onDeleted?(ids:string[]):unknown;
 actions?(item:T):ReactNode; pagination?: boolean; inspectable?: boolean;
};
