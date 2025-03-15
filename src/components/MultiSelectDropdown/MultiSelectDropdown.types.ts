// multi-select-dropdown/MultiSelectDropdown.types.ts

export interface MultiSelectDropdownProps<T> {
    label?: string;
    items: T[];
    selected: T[];
    onChange: (selected: T[]) => void;
    getItemKey: (item: T) => string | number;
    getItemLabel: (item: T) => string;
    buttonLabel?: string;
    disabled?: boolean;
  }
  