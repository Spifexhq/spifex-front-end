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

  // Nova prop
  singleSelect = false,
}: SelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const id = useId();

  /** Toggles the dropdown open/closed. */
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  };

  /** Fecha o dropdown ao clicar fora dele */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onChange([]);
      }
    }
  
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onChange]);

  /** Adiciona/Remove um item da lista `selected`. */
  const handleCheckboxChange = (item: T) => {
    const itemKey = getItemKey(item);
    const isCurrentlySelected = selected.some(
      (selectedItem) => getItemKey(selectedItem) === itemKey
    );

    let updatedSelected: T[];

    if (singleSelect) {
      // Se for singleSelect, só pode ter 0 ou 1 item.
      if (isCurrentlySelected) {
        // Se o usuário clicou de novo no mesmo item, desmarca tudo
        updatedSelected = [];
      } else {
        // Seleciona apenas este item
        updatedSelected = [item];
      }
    } else {
      // Múltipla seleção (comportamento original)
      if (isCurrentlySelected) {
        updatedSelected = selected.filter(
          (selectedItem) => getItemKey(selectedItem) !== itemKey
        );
      } else {
        updatedSelected = [...selected, item];
      }
    }

    onChange(updatedSelected);
  };

  /** Seleciona todos (somente se não for singleSelect). */
  const selectAll = () => {
    if (!singleSelect) {
      onChange([...items]);
    }
  };

  /** Remove todos (somente se não for singleSelect). */
  const deselectAll = () => {
    if (!singleSelect) {
      onChange([]);
    }
  };

  // Filtra itens conforme o termo digitado
  const filteredItems = searchTerm
    ? items.filter((item) =>
        getItemLabel(item).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items;

  return (
    <div className="flex flex-col w-full gap-[4px]">
      {label && <label htmlFor={id} className={styles.label}>{label}</label>}
      <div ref={dropdownRef} className="relative w-full select-none z-10">
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
          {buttonLabel}
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
          <div className="absolute bg-white max-w-[300px] shadow-lg border border-gray-300 border-t-0 max-h-[250px] overflow-y-auto rounded-lg w-full">
            {/* Botões de "Marcar/Desmarcar Tudo" só fazem sentido se NÃO for singleSelect */}
            {!singleSelect && (
              <div className="flex flex-row p-2.5 pb-0 text-center select-none">
                <button
                  onClick={selectAll}
                  className="bg-white border border-gray-300 m-0.5 p-1 w-full transition-all duration-200 font-semibold text-[11px] rounded hover:bg-blue-100"
                >
                  Marcar Tudo
                </button>
                <button
                  onClick={deselectAll}
                  className="bg-white border border-gray-300 m-0.5 p-1 w-full transition-all duration-200 font-semibold text-[11px] rounded hover:bg-blue-100"
                >
                  Desmarcar Tudo
                </button>
              </div>
            )}

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
                    <span className="pl-2 user-select-none">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SelectDropdown;
