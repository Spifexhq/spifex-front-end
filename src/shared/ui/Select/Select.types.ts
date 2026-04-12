// src/shared/ui/Select/Select.types.ts
import type React from "react";

export type SelectSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface SelectProps<T> {
  label?: React.ReactNode;
  items: T[];
  selected: T[];
  onChange: (selected: T[]) => void;
  getItemKey: (item: T) => string | number;
  getItemLabel: (item: T) => string;
  getItemIcon?: (item: T) => React.ReactNode;
  buttonLabel?: string;
  disabled?: boolean;
  singleSelect?: boolean;
  clearOnClickOutside?: boolean;
  customStyles?: React.CSSProperties;
  groupBy?: (item: T) => string;
  hideCheckboxes?: boolean;
  hideFilter?: boolean;
  virtualize?: boolean;
  virtualThreshold?: number;
  virtualRowHeight?: number;
  size?: SelectSize;
}