import {
  useState,
  useRef,
  useEffect,
  useId,
  useMemo,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { SelectDropdownProps } from "./SelectDropdown.types";
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemElsRef = useRef<Array<HTMLDivElement | null>>([]);

  const id = useId();
  const panelId = `${id}-panel`;
  const effectiveSingleSelect = singleSelect || hideCheckboxes;

  /** Abrir ao focar apenas quando veio por teclado (Tab/Shift+Tab) */
  const lastFocusByTabRef = useRef(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") lastFocusByTabRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Tab") lastFocusByTabRef.current = false;
    };
    const onMouseDown = () => {
      lastFocusByTabRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("mousedown", onMouseDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("mousedown", onMouseDown, true);
    };
  }, []);

  const toggleDropdown = () => {
    if (!disabled) setIsOpen((p) => !p);
  };

  /** Fechar ao clicar fora + fechar com ESC sem vazar pro modal */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
        setActiveIndex(null);
        if (clearOnClickOutside) onChange([]);
      }
    };
    const handleDocKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        // evita que o modal/escopo pai também processe o ESC
        event.stopImmediatePropagation?.();
        event.stopPropagation();
        event.preventDefault();
        setIsOpen(false);
        setSearchTerm("");
        setActiveIndex(null);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleDocKeyDown, { passive: false });
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleDocKeyDown);
    };
  }, [isOpen, onChange, clearOnClickOutside]);

  /** Filtragem + agrupamento */
  const filteredItems = useMemo(() => {
    const st = searchTerm.trim().toLowerCase();
    if (!st) return items;
    return items.filter((item) => getItemLabel(item).toLowerCase().includes(st));
  }, [items, searchTerm, getItemLabel]);

  const groupedItems: Record<string, T[]> = useMemo(() => {
    if (!groupBy) return {};
    const acc: Record<string, T[]> = {};
    filteredItems.forEach((it) => {
      const g = groupBy(it);
      (acc[g] ??= []).push(it);
    });
    return acc;
  }, [filteredItems, groupBy]);

  /** Lista "plana" para navegação por setas */
  const flatItems: T[] = useMemo(() => {
    return groupBy ? Object.values(groupedItems).flat() : filteredItems;
  }, [groupedItems, filteredItems, groupBy]);

  /** Ao abrir, define item ativo e foco inicial */
  useEffect(() => {
    if (!isOpen) return;

    let idx: number | null = null;
    if (flatItems.length > 0) {
      if (selected.length > 0) {
        const firstKey = getItemKey(selected[0]);
        const found = flatItems.findIndex((it) => getItemKey(it) === firstKey);
        idx = found >= 0 ? found : 0;
      } else {
        idx = 0;
      }
    }
    setActiveIndex(idx);

    if (!hideFilter && searchInputRef.current) {
      searchInputRef.current.focus();
    } else {
      panelRef.current?.focus();
    }
  }, [isOpen, flatItems, selected, getItemKey, hideFilter]);

  /** Mantém item ativo visível */
  useEffect(() => {
    if (!isOpen || activeIndex == null) return;
    const el = itemElsRef.current[activeIndex];
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  /** Ajusta activeIndex se a lista mudar de tamanho */
  useEffect(() => {
    if (activeIndex == null) return;
    if (flatItems.length === 0) {
      setActiveIndex(null);
    } else if (activeIndex > flatItems.length - 1) {
      setActiveIndex(flatItems.length - 1);
    }
  }, [flatItems, activeIndex]);

  /** Seleção */
  const handleCheckboxChange = (item: T) => {
    const itemKey = getItemKey(item);
    const isCurrentlySelected = selected.some((s) => getItemKey(s) === itemKey);
    let updated: T[];
    if (effectiveSingleSelect) {
      updated = isCurrentlySelected ? [] : [item];
    } else {
      updated = isCurrentlySelected
        ? selected.filter((s) => getItemKey(s) !== itemKey)
        : [...selected, item];
    }
    onChange(updated);
    if (hideCheckboxes || effectiveSingleSelect) setIsOpen(false);
  };

  const selectAll = () => {
    if (!effectiveSingleSelect) onChange([...items]);
  };

  const deselectAll = () => {
    if (!effectiveSingleSelect) onChange([]);
  };

  const handleGroupToggle = (groupItems: T[]) => {
    if (effectiveSingleSelect) return;
    const allSelected = groupItems.every((it) =>
      selected.some((sel) => getItemKey(sel) === getItemKey(it))
    );
    let updated: T[];
    if (allSelected) {
      updated = selected.filter(
        (sel) => !groupItems.some((it) => getItemKey(sel) === getItemKey(it))
      );
    } else {
      const newOnes = groupItems.filter(
        (it) => !selected.some((sel) => getItemKey(sel) === getItemKey(it))
      );
      updated = [...selected, ...newOnes];
    }
    onChange(updated);
  };

  /** Seletores de foco para Tab/Shift+Tab sair do dropdown */
  const TABBABLE_SELECTOR =
    'a[href],area[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"])';

  const isVisible = (el: HTMLElement) =>
    !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

  const getTabbables = (root: HTMLElement | Document) => {
    const container = (root as Document).body ?? (root as HTMLElement);
    return Array.from(container.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1 && isVisible(el)
    );
  };

  const focusRelativeToTrigger = (dir: -1 | 1) => {
    const trigger = buttonRef.current;
    if (!trigger) return;
    const dialogScope =
      (dropdownRef.current?.closest('[role="dialog"]') as HTMLElement | null) || document;
    const tabbables = getTabbables(dialogScope);
    const idx = tabbables.indexOf(trigger);
    const target = tabbables[idx + dir];
    // Deixa o React fechar/renderizar primeiro
    setTimeout(() => {
      target?.focus();
    }, 0);
  };

  /** Teclado no botão: abre com ↓, Enter, Space; abrir ao focar via Tab */
  const handleButtonKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleButtonFocus = () => {
    if (!disabled && lastFocusByTabRef.current) setIsOpen(true);
  };

  /** Teclado dentro do painel (lista) */
  const handlePanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) return;

    // Tab e Shift+Tab → sair do dropdown para o anterior/próximo ao botão
    if (e.key === "Tab") {
      e.preventDefault();
      setIsOpen(false);
      if (e.shiftKey) {
        focusRelativeToTrigger(-1);
      } else {
        focusRelativeToTrigger(1);
      }
      return;
    }

    const handled = ["ArrowDown", "ArrowUp", "Home", "End", "Enter"];
    if (!handled.includes(e.key)) return;

    e.preventDefault();
    if (flatItems.length === 0) return;

    if (e.key === "Home") {
      setActiveIndex(0);
      return;
    }
    if (e.key === "End") {
      setActiveIndex(flatItems.length - 1);
      return;
    }
    if (e.key === "ArrowDown") {
      setActiveIndex((p) => (p == null ? 0 : Math.min(p + 1, flatItems.length - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      setActiveIndex((p) => (p == null ? flatItems.length - 1 : Math.max(p - 1, 0)));
      return;
    }
    if (e.key === "Enter" && activeIndex != null) {
      handleCheckboxChange(flatItems[activeIndex]);
    }
  };

  /** Render de item da lista */
  const renderItem = (item: T, flatIndex: number) => {
    const key = getItemKey(item);
    const label = getItemLabel(item);
    const isChecked = selected.some((s) => getItemKey(s) === key);
    const isActive = activeIndex === flatIndex;
    const optionId = `${id}-opt-${flatIndex}`;

    return (
      <div
        key={key}
        id={optionId}
        ref={(el) => (itemElsRef.current[flatIndex] = el)}
        onClick={() => handleCheckboxChange(item)}
        className={`flex items-center text-[10px] p-2.5 font-normal transition duration-300 ease-in-out gap-1 select-none cursor-pointer
          ${hideCheckboxes && isChecked ? "bg-blue-100 text-blue-900 font-semibold" : ""}
          ${isActive ? "bg-orange-100 bg-opacity-30" : "bg-white hover:bg-orange-100 hover:bg-opacity-20"}
        `}
        role="option"
        aria-selected={isChecked}
        tabIndex={-1}
        data-active={isActive ? "true" : undefined}
      >
        {!hideCheckboxes && (
          <Checkbox
            checked={isChecked}
            onClick={(e) => e.stopPropagation()}
            onChange={() => handleCheckboxChange(item)}
            size="small"
          />
        )}
        <span className={`${!hideCheckboxes ? "pl-2" : ""} user-select-none`}>{label}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full gap-[4px]">
      {label && (
        <label className="text-[10px] py-[5px] font-bold select-none text-gray-700">
          {label}
        </label>
      )}

      <div
        ref={dropdownRef}
        className="relative w-full select-none"
        data-select-open={isOpen ? "true" : undefined}
      >
        <button
          ref={buttonRef}
          onClick={toggleDropdown}
          onKeyDown={handleButtonKeyDown}
          onFocus={handleButtonFocus}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={panelId}
          className={`flex justify-between items-center py-3 px-4 w-full h-[42px] text-xs rounded-[5px] transition-all duration-200 ease-in-out outline-none
            ${
              disabled
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : `${
                    isOpen ? "bg-gray-50 border border-gray-400"
                           : "bg-white border border-gray-300 hover:bg-gray-50"
                  } focus-visible:bg-gray-100 focus-visible:border-gray-400`
            }
          `}
        >
          <span className="truncate overflow-hidden whitespace-nowrap max-w-[90%] text-left text-gray-400">
            {selected.length === 0
              ? buttonLabel
              : effectiveSingleSelect
              ? getItemLabel(selected[0])
              : selected.map((it) => getItemLabel(it)).join(", ")}
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div
            id={panelId}
            role="listbox"
            aria-labelledby={id}
            aria-multiselectable={!effectiveSingleSelect}
            aria-activedescendant={
              activeIndex != null && flatItems.length > 0 ? `${id}-opt-${activeIndex}` : undefined
            }
            ref={panelRef}
            tabIndex={-1}
            onKeyDown={handlePanelKeyDown}
            className="absolute bg-white max-w-[300px] shadow-lg border border-gray-300 border-t-0 overflow-y-auto rounded-lg w-full z-[9999] outline-none"
            style={customStyles}
          >
            {!effectiveSingleSelect && !hideCheckboxes && (
              <div className="flex flex-row p-2.5 pb-0 text-center select-none">
                <button
                  type="button"
                  onClick={selectAll}
                  className="bg-white border border-gray-300 m-0.5 p-1 w-full transition-all duration-200 font-semibold text-[11px] rounded hover:bg-blue-100"
                  tabIndex={-1}
                >
                  Marcar Tudo
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="bg-white border border-gray-300 m-0.5 p-1 w-full transition-all duration-200 font-semibold text-[11px] rounded hover:bg-blue-100"
                  tabIndex={-1}
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
                ref={searchInputRef}
                className="border-b border-gray-300 w-full p-1 pl-5 box-sizing border-box text-[12px]"
                onKeyDown={(e) => {
                  // evita submit acidental ao pressionar Enter dentro do input
                  if (e.key === "Enter") e.preventDefault();
                }}
              />
            )}

            <div className="flex flex-col py-2.5">
              {groupBy
                ? Object.entries(groupedItems).map(([groupName, groupItems]) => (
                    <div key={groupName}>
                      <div
                        className={`font-bold px-2.5 text-xs mt-2 mb-1 ${
                          !effectiveSingleSelect ? "cursor-pointer" : ""
                        }`}
                        onClick={() => handleGroupToggle(groupItems)}
                      >
                        {groupName}
                      </div>
                      {groupItems.map((item) => {
                        const idx = flatItems.findIndex(
                          (fi) => getItemKey(fi) === getItemKey(item)
                        );
                        return renderItem(item, idx);
                      })}
                    </div>
                  ))
                : flatItems.map((item, idx) => renderItem(item, idx))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SelectDropdown;
