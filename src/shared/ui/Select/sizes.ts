// src/shared/ui/Select/sizes.ts
import type { SelectSize } from "./Select.types";

type SelectSizeShape = {
  label: string;
  trigger: string;
  chevron: string;
  badge: string;
  actionBtn: string;
  filterInput: string;
  item: string;
  rowHeight: number;
  iconBox: string;
  iconSize: string;
  triggerIconBox: string;
  triggerIconSize: string;
  empty: string;
};

export const SELECT_SIZE: Record<SelectSize, SelectSizeShape> = {
  xs: {
    label: "text-[10px]",
    trigger: "h-7 px-2.5 text-[11px] rounded-md",
    chevron: "w-3.5 h-3.5",
    badge: "min-w-[1.25rem] h-4 px-1 text-[10px]",
    actionBtn: "h-6 px-2 text-[10px] rounded-md",
    filterInput: "h-7 pl-7 pr-2 text-[11px] rounded-md",
    item: "px-2.5 py-2 text-[11px]",
    rowHeight: 32,
    iconBox: "h-5 w-5",
    iconSize: "h-3.5 w-3.5",
    triggerIconBox: "h-4.5 w-4.5",
    triggerIconSize: "h-3.5 w-3.5",
    empty: "px-3 py-8 text-[11px]",
  },
  sm: {
    label: "text-[10.5px]",
    trigger: "h-8 px-3 text-xs rounded-md",
    chevron: "w-4 h-4",
    badge: "min-w-[1.5rem] h-5 px-1.5 text-[10px]",
    actionBtn: "h-6.5 px-2 text-[11px] rounded-md",
    filterInput: "h-7.5 pl-7 pr-2 text-[12px] rounded-md",
    item: "px-3 py-2 text-xs",
    rowHeight: 34,
    iconBox: "h-5 w-5",
    iconSize: "h-3.5 w-3.5",
    triggerIconBox: "h-5 w-5",
    triggerIconSize: "h-3.5 w-3.5",
    empty: "px-3 py-8 text-[12px]",
  },
  md: {
    label: "text-[10.5px]",
    trigger: "h-8 px-4 text-xs rounded-md",
    chevron: "w-4 h-4",
    badge: "min-w-[1.5rem] h-5 px-1.5 text-[10px]",
    actionBtn: "h-7 px-2 text-[11px] rounded-md",
    filterInput: "h-8 pl-7 pr-2 text-[12px] rounded-md",
    item: "px-3 py-2 text-xs",
    rowHeight: 36,
    iconBox: "h-5.5 w-5.5",
    iconSize: "h-4 w-4",
    triggerIconBox: "h-5.5 w-5.5",
    triggerIconSize: "h-4 w-4",
    empty: "px-3 py-8 text-[12px]",
  },
  lg: {
    label: "text-[11px]",
    trigger: "h-10 px-4 text-[13px] rounded-lg",
    chevron: "w-4 h-4",
    badge: "min-w-[1.75rem] h-6 px-2 text-[11px]",
    actionBtn: "h-8 px-3 text-[12px] rounded-md",
    filterInput: "h-9 pl-8 pr-3 text-[13px] rounded-md",
    item: "px-4 py-3 text-[13px]",
    rowHeight: 40,
    iconBox: "h-6 w-6",
    iconSize: "h-4 w-4",
    triggerIconBox: "h-6 w-6",
    triggerIconSize: "h-4 w-4",
    empty: "px-3 py-8 text-[12px]",
  },
  xl: {
    label: "text-[12px]",
    trigger: "h-11 px-5 text-[15px] rounded-xl",
    chevron: "w-5 h-5",
    badge: "min-w-[2rem] h-7 px-2.5 text-[12px]",
    actionBtn: "h-9 px-3.5 text-[13px] rounded-md",
    filterInput: "h-10 pl-9 pr-3 text-[14px] rounded-md",
    item: "px-5 py-3.5 text-[14px]",
    rowHeight: 44,
    iconBox: "h-7 w-7",
    iconSize: "h-4.5 w-4.5",
    triggerIconBox: "h-6.5 w-6.5",
    triggerIconSize: "h-4.5 w-4.5",
    empty: "px-3 py-8 text-[12px]",
  },
};