// multi-select-dropdown/SelectDropdown.types.ts

export interface SelectDropdownProps<T> {
    label?: string;
    items: T[];
    selected: T[];
    onChange: (selected: T[]) => void;
    getItemKey: (item: T) => string | number;
    getItemLabel: (item: T) => string;
    buttonLabel?: string;
    disabled?: boolean;
    singleSelect?: boolean;
    clearOnClickOutside?: boolean;
    customStyles?: React.CSSProperties;
}
  