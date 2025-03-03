// multi-select-dropdown/MultiSelectDropdown.types.ts

export interface MultiSelectDropdownProps<T> {
    /** The list of items to display in the dropdown. */
    items: T[];
  
    /** The array of currently selected items. */
    selected: T[];
  
    /**
     * Callback when the selected items change,
     * providing the new array of selected items.
     */
    onChange: (selected: T[]) => void;
  
    /**
     * A function to retrieve a *unique* key from an item,
     * e.g. `(item) => item.id`.
     */
    getItemKey: (item: T) => string | number;
  
    /**
     * A function to retrieve the label that should be displayed,
     * e.g. `(item) => item.name`.
     */
    getItemLabel: (item: T) => string;
  
    /**
     * (Optional) The label to show on the button.
     * Defaults to "Select Items".
     */
    buttonLabel?: string;
  
    /**
     * (Optional) Whether the dropdown is disabled.
     * Defaults to false.
     */
    disabled?: boolean;
  }
  