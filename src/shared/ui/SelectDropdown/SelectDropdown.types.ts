import type React from "react";

export interface SelectDropdownProps<T> {
  label?: string;
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
  size?: string;
}
