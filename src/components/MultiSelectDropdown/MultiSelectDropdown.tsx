import { useState, useRef, useEffect } from "react";
import { MultiSelectDropdownProps } from "./MultiSelectDropdown.types";
import Checkbox from "@/components/Checkbox";

function MultiSelectDropdown<T>({
  items,
  selected,
  onChange,
  getItemKey,
  getItemLabel,
  buttonLabel = "Select Items",
  disabled = false,
}: MultiSelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null); // Create ref for dropdown container

  /** Toggles the dropdown open/closed. */
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  };

  /** Handles clicks outside of the dropdown to close it */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  /** Adds or removes an item from `selected`. */
  const handleCheckboxChange = (item: T) => {
    const itemKey = getItemKey(item);
    const isCurrentlySelected = selected.some(
      (selectedItem) => getItemKey(selectedItem) === itemKey
    );

    let updatedSelected: T[];
    if (isCurrentlySelected) {
      updatedSelected = selected.filter(
        (selectedItem) => getItemKey(selectedItem) !== itemKey
      );
    } else {
      updatedSelected = [...selected, item];
    }

    onChange(updatedSelected);
  };

  /** Selects all items. */
  const selectAll = () => {
    onChange([...items]);
  };

  /** Deselects all items. */
  const deselectAll = () => {
    onChange([]);
  };

  // Filter items based on search term.
  const filteredItems = searchTerm
    ? items.filter((item) =>
        getItemLabel(item).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items;

  return (
    <div ref={dropdownRef} className="inline-block relative w-full select-none z-10">
      <button
        onClick={toggleDropdown}
        className={`flex justify-center items-center py-3 px-4 w-full text-xs rounded-md transition-all duration-200 ease-in-out outline-none ${
          disabled
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-white border border-gray-300 text-gray-800 hover:bg-gray-100"
        }`}
        type="button"
        disabled={disabled}
        style={{ userSelect: "none" }}
      >
        {buttonLabel}
        <svg
          className="w-2.5 h-2.5 ml-3"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 10 6"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="m1 1 4 4 4-4"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bg-white max-w-[300px] shadow-lg border border-gray-300 border-t-0 max-h-[250px] overflow-y-auto rounded-lg w-full">
          <div className="flex flex-row p-2.5 pb-0 text-center select-none">
            <button
              onClick={selectAll}
              className="bg-white border border-gray-300 m-0.5 p-1 w-full transition-all duration-200 font-semibold text-[11px] rounded hover:bg-blue-100"
              style={{ userSelect: "none" }}
            >
              Marcar Tudo
            </button>
            <button
              onClick={deselectAll}
              className="bg-white border border-gray-300 m-0.5 p-1 w-full transition-all duration-200 font-semibold text-[11px] rounded hover:bg-blue-100"
              style={{ userSelect: "none" }}
            >
              Desmarcar Tudo
            </button>
          </div>

          <input
            type="text"
            placeholder="Filtrar"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border-b border-gray-300 w-full p-1 pl-5 box-border text-[12px]"
          />

          <div className="flex flex-col px-2.5 pb-2.5">
            {filteredItems.map((item) => {
              const key = getItemKey(item);
              const label = getItemLabel(item);
              const isChecked = selected.some(
                (selectedItem) => getItemKey(selectedItem) === key
              );

              return (
                <div
                  key={key}
                  onClick={() => handleCheckboxChange(item)}
                  className="flex items-center text-[10px] p-2.5 font-normal bg-white transition duration-300 ease-in-out hover:bg-orange-100 hover:bg-opacity-20 gap-1 select-none cursor-pointer"
                >
                  <Checkbox
                    checked={isChecked}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onChange={() => handleCheckboxChange(item)}
                    size="small"
                  />

                  <span style={{ paddingLeft: "5px", userSelect: "none" }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default MultiSelectDropdown;
