import { useState, useRef, useEffect, useId } from "react";
import { SelectDropdownProps } from "./SelectDropdown.types";
import styles from './SelectDropdown.module.css';
import Checkbox from "@/components/Checkbox";

function SelectDropdown<T>({
  label,
  items,
  selected,
  onChange,
  getItemKey,
  getItemLabel,
  buttonLabel = "Select Items",
  disabled = false,
  singleSelect = false,
  clearOnClickOutside = false,
  customStyles = {},
  groupBy,
  hideCheckboxes = false,
  hideFilter = false,
}: SelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const effectiveSingleSelect = singleSelect || hideCheckboxes;

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (clearOnClickOutside) {
          onChange([]);
        }
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onChange, clearOnClickOutside]);

  const handleCheckboxChange = (item: T) => {
    const itemKey = getItemKey(item);
    const isCurrentlySelected = selected.some(
      (selectedItem) => getItemKey(selectedItem) === itemKey
    );

    let updatedSelected: T[];

    if (effectiveSingleSelect) {
      updatedSelected = isCurrentlySelected ? [] : [item];
    } else {
      updatedSelected = isCurrentlySelected
        ? selected.filter((selectedItem) => getItemKey(selectedItem) !== itemKey)
        : [...selected, item];
    }

    onChange(updatedSelected);

    if (hideCheckboxes) {
      setIsOpen(false);
    }
  };

  const selectAll = () => {
    if (!effectiveSingleSelect) {
      onChange([...items]);
    }
  };

  const deselectAll = () => {
    if (!effectiveSingleSelect) {
      onChange([]);
    }
  };

  const filteredItems = searchTerm
    ? items.filter((item) =>
        getItemLabel(item).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items;

  const groupedItems: Record<string, T[]> = {};

  if (groupBy) {
    filteredItems.forEach(item => {
      const group = groupBy(item);
      if (!groupedItems[group]) {
        groupedItems[group] = [];
      }
      groupedItems[group].push(item);
    });
  }

  const handleGroupToggle = (groupItems: T[]) => {
    if (effectiveSingleSelect) return;

    const allSelected = groupItems.every((item) =>
      selected.some((sel) => getItemKey(sel) === getItemKey(item))
    );

    let updatedSelected: T[];

    if (allSelected) {
      updatedSelected = selected.filter(
        (sel) =>
          !groupItems.some((item) => getItemKey(sel) === getItemKey(item))
      );
    } else {
      const newItems = groupItems.filter(
        (item) =>
          !selected.some((sel) => getItemKey(sel) === getItemKey(item))
      );
      updatedSelected = [...selected, ...newItems];
    }

    onChange(updatedSelected);
  };

  const renderItem = (item: T) => {
    const key = getItemKey(item);
    const label = getItemLabel(item);
    const isChecked = selected.some(
      (selectedItem) => getItemKey(selectedItem) === key
    );

    return (
      <div
        key={key}
        onClick={() => handleCheckboxChange(item)}
        className={`flex items-center text-[10px] p-2.5 font-normal transition duration-300 ease-in-out gap-1 select-none cursor-pointer
          ${hideCheckboxes && isChecked ? "bg-blue-100 text-blue-900 font-semibold" : "bg-white hover:bg-orange-100 hover:bg-opacity-20"}
        `}
      >
        {!hideCheckboxes && (
          <Checkbox
            checked={isChecked}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onChange={() => handleCheckboxChange(item)}
            size="small"
          />
        )}
        <span className={`${!hideCheckboxes ? "pl-2" : ""} user-select-none`}>
          {label}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full gap-[4px]">
      {label && <label className={styles.label}>{label}</label>}
      <div ref={dropdownRef} className="relative w-full select-none">
        <button
          onClick={toggleDropdown}
          id={id}
          className={`flex justify-between items-center py-3 px-4 w-full h-[42px] text-xs rounded-[5px] transition-all duration-200 ease-in-out outline-none ${
            disabled
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-white border border-gray-300 text-gray-800 hover:bg-gray-100"
          }`}
          type="button"
          disabled={disabled}
        >
          <span className="truncate overflow-hidden whitespace-nowrap max-w-[90%] text-left text-gray-400">
            {selected.length === 0
              ? buttonLabel
              : effectiveSingleSelect
              ? getItemLabel(selected[0])
              : selected
                  .map((item) => getItemLabel(item))
                  .join(", ")}
          </span>
          <svg
            className={`w-4 h-4 ml-3 transition-transform duration-200 ease-in-out ${
              isOpen ? "rotate-0" : "rotate-180"
            }`}
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div 
            className="absolute bg-white max-w-[300px] shadow-lg border border-gray-300 border-t-0 overflow-y-auto rounded-lg w-full z-[9999]"
            style={customStyles}
          >
            {!effectiveSingleSelect && !hideCheckboxes && (
              <div className="flex flex-row p-2.5 pb-0 text-center select-none">
                <button
                  type="button"
                  onClick={selectAll}
                  className="bg-white border border-gray-300 m-0.5 p-1 w-full transition-all duration-200 font-semibold text-[11px] rounded hover:bg-blue-100"
                >
                  Marcar Tudo
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="bg-white border border-gray-300 m-0.5 p-1 w-full transition-all duration-200 font-semibold text-[11px] rounded hover:bg-blue-100"
                >
                  Desmarcar Tudo
                </button>
              </div>
            )}

            {!hideFilter && (
              <input
                type="text"
                placeholder="Filtrar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-b border-gray-300 w-full p-1 pl-5 box-border text-[12px]"
              />
            )}

            <div className="flex flex-col py-2.5">
              {groupBy ? (
                Object.entries(groupedItems).map(([groupName, groupItems]) => {
                  return (
                    <div key={groupName}>
                      <div
                        className={`font-bold px-2.5 text-xs mt-2 mb-1 ${
                          !effectiveSingleSelect ? "cursor-pointer" : ""
                        }`}
                        onClick={() => handleGroupToggle(groupItems)}
                      >
                        {groupName}
                      </div>
                      {groupItems.map((item) => renderItem(item))}
                    </div>
                  );
                })
              ) : (
                filteredItems.map((item) => renderItem(item))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SelectDropdown;
