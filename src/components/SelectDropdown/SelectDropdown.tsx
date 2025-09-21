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

  // 🔹 Novas props
  virtualize = true,
  virtualThreshold = 300,
  virtualRowHeight = 36,
}: SelectDropdownProps<T>) {
  // ---------------------------------------------------------------------------
  // State & refs
  // ---------------------------------------------------------------------------
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemElsRef = useRef<Array<HTMLDivElement | null>>([]);

  // 🔹 virtual scroll states
  const [scrollTop, setScrollTop] = useState(0);

  const id = useId();
  const panelId = `${id}-panel`;
  const effectiveSingleSelect = singleSelect || hideCheckboxes;

  // Detecta foco via Tab (para abrir ao focar)
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

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const keyToStr = (k: string | number) => String(k);

  const selectedKeys = useMemo(
    () => new Set(selected.map((s) => keyToStr(getItemKey(s)))),
    [selected, getItemKey]
  );

  // Filtragem
  const filteredItems = useMemo(() => {
    const st = searchTerm.trim().toLowerCase();
    if (!st) return items;
    return items.filter((item) => (getItemLabel(item) || "").toLowerCase().includes(st));
  }, [items, searchTerm, getItemLabel]);

  // Agrupamento opcional
  const groupedItems: Record<string, T[]> = useMemo(() => {
    if (!groupBy) return {};
    const acc: Record<string, T[]> = {};
    filteredItems.forEach((it) => {
      const g = groupBy(it);
      (acc[g] ??= []).push(it);
    });
    return acc;
  }, [filteredItems, groupBy]);

  // Lista plana (para navegação/virtualização)
  const flatItems: T[] = useMemo(() => {
    return groupBy ? Object.values(groupedItems).flat() : filteredItems;
  }, [groupedItems, filteredItems, groupBy]);

  // Mapa key -> idx
  const flatKeyIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    flatItems.forEach((it, i) => map.set(keyToStr(getItemKey(it)), i));
    return map;
  }, [flatItems, getItemKey]);

  // ---------------------------------------------------------------------------
  // “Última interação vence” (mouse x teclado)
  // ---------------------------------------------------------------------------
  const lastSourceRef = useRef<"keyboard" | "mouse" | null>(null);
  const suppressMouseUntilTsRef = useRef(0);

  const setActiveFrom = (idx: number | null, source: "keyboard" | "mouse") => {
    lastSourceRef.current = source;
    setActiveIndex(idx);
    if (source === "keyboard") {
      suppressMouseUntilTsRef.current = performance.now() + 120;
    }
  };

  // ---------------------------------------------------------------------------
  // Abertura/fechamento
  // ---------------------------------------------------------------------------
  const toggleDropdown = () => {
    if (!disabled) setIsOpen((p) => !p);
  };

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

  // Define item ativo e foco **apenas ao abrir**
  useEffect(() => {
    if (!isOpen) return;

    let idx: number | null = null;
    if (flatItems.length > 0) {
      if (selected.length > 0) {
        const firstKey = keyToStr(getItemKey(selected[0]));
        const found = flatKeyIndexMap.get(firstKey);
        idx = typeof found === "number" ? found : 0;
      } else {
        idx = 0;
      }
    }
    setActiveIndex(idx);

    if (!hideFilter && searchInputRef.current) {
      (searchInputRef.current as HTMLInputElement).focus?.({ preventScroll: true });
    } else {
      panelRef.current?.focus?.({ preventScroll: true });
    }

    // zera scroll para listas grandes
    setScrollTop(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Mantém item ativo visível
  useEffect(() => {
    if (!isOpen || activeIndex == null) return;
    const panel = panelRef.current;
    if (!panel) return;

    const rowH = virtualRowHeight ?? 36;
    const hasGroup = !!groupBy;
    const shouldVirtualize =
      virtualize !== false && !hasGroup && flatItems.length > virtualThreshold;

    if (shouldVirtualize) {
      const panelH = panel.clientHeight || 320;
      const itemTop = activeIndex * rowH;
      const itemBottom = itemTop + rowH;
      const viewTop = panel.scrollTop;
      const viewBottom = viewTop + panelH;

      if (itemTop < viewTop) {
        panel.scrollTop = itemTop;
      } else if (itemBottom > viewBottom) {
        panel.scrollTop = itemBottom - panelH;
      }
      return;
    }

    // modo normal (sem virtualização): usa a ref do item renderizado
    const el = itemElsRef.current[activeIndex];
    if (!el) return;

    const panelRect = panel.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const above = elRect.top < panelRect.top;
    const below = elRect.bottom > panelRect.bottom;
    if (above || below) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, isOpen, flatItems.length, virtualRowHeight, virtualize, virtualThreshold, groupBy]);

  // Ajusta activeIndex se a lista mudar de tamanho
  useEffect(() => {
    if (activeIndex == null) return;
    if (flatItems.length === 0) {
      setActiveIndex(null);
    } else if (activeIndex > flatItems.length - 1) {
      setActiveIndex(flatItems.length - 1);
    }
  }, [flatItems, activeIndex]);

  // ---------------------------------------------------------------------------
  // Seleção
  // ---------------------------------------------------------------------------
  const handleCheckboxChange = (item: T) => {
    const k = keyToStr(getItemKey(item));
    const isCurrentlySelected = selectedKeys.has(k);

    // Snapshot do scroll antes da atualização
    const panel = panelRef.current;
    const prevScrollTop = panel?.scrollTop ?? 0;

    let updated: T[];
    if (effectiveSingleSelect) {
      updated = isCurrentlySelected ? [] : [item];
    } else {
      updated = isCurrentlySelected
        ? selected.filter((s) => keyToStr(getItemKey(s)) !== k)
        : [...selected, item];
    }

    onChange(updated);

    if (hideCheckboxes || effectiveSingleSelect) {
      setIsOpen(false);
    } else {
      requestAnimationFrame(() => {
        if (panel) {
          panel.scrollTop = prevScrollTop;
          panel.focus?.({ preventScroll: true });
        }
      });
    }
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
      selectedKeys.has(keyToStr(getItemKey(it)))
    );

    let updated: T[];
    if (allSelected) {
      const groupSet = new Set(groupItems.map((it) => keyToStr(getItemKey(it))));
      updated = selected.filter((sel) => !groupSet.has(keyToStr(getItemKey(sel))));
    } else {
      const existing = new Set(selected.map((s) => keyToStr(getItemKey(s))));
      const newOnes = groupItems.filter((it) => !existing.has(keyToStr(getItemKey(it))));
      updated = [...selected, ...newOnes];
    }
    onChange(updated);
  };

  // ---------------------------------------------------------------------------
  // Acessibilidade de Tab (sair do dropdown para vizinhos do trigger)
  // ---------------------------------------------------------------------------
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
    setTimeout(() => {
      target?.focus();
    }, 0);
  };

  // ---------------------------------------------------------------------------
  // Interação de teclado
  // ---------------------------------------------------------------------------
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

  const handlePanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) return;

    // Tab e Shift+Tab → sair para anterior/próximo do botão
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
      setActiveFrom(0, "keyboard");
      return;
    }
    if (e.key === "End") {
      setActiveFrom(flatItems.length - 1, "keyboard");
      return;
    }
    if (e.key === "ArrowDown") {
      const next =
        activeIndex == null ? 0 : Math.min(activeIndex + 1, flatItems.length - 1);
      setActiveFrom(next, "keyboard");
      return;
    }
    if (e.key === "ArrowUp") {
      const prev =
        activeIndex == null ? flatItems.length - 1 : Math.max(activeIndex - 1, 0);
      setActiveFrom(prev, "keyboard");
      return;
    }
    if (e.key === "Enter" && activeIndex != null) {
      handleCheckboxChange(flatItems[activeIndex]);
    }
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const renderItem = (item: T, flatIndex: number) => {
    const k = keyToStr(getItemKey(item));
    const label = getItemLabel(item);
    const isChecked = selectedKeys.has(k);
    const isActive = activeIndex === flatIndex;
    const optionId = `${id}-opt-${flatIndex}`;

    const handleMouseEnter = () => {
      const now = performance.now();
      if (now < suppressMouseUntilTsRef.current) return;
      setActiveFrom(flatIndex, "mouse");
    };

    const handleMouseMove = () => {
      const now = performance.now();
      if (now < suppressMouseUntilTsRef.current) return;
      if (activeIndex !== flatIndex) setActiveFrom(flatIndex, "mouse");
    };

    return (
      <div
        key={k}
        id={optionId}
        ref={(el) => (itemElsRef.current[flatIndex] = el)}
        onClick={() => handleCheckboxChange(item)}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        className={`flex items-center text-[10px] p-2.5 font-normal transition duration-300 ease-in-out gap-1 select-none cursor-pointer
          ${hideCheckboxes && isChecked ? "bg-blue-100 text-blue-900 font-semibold" : ""}
          ${isActive ? "bg-orange-100 bg-opacity-30" : "bg-white hover:bg-orange-100 hover:bg-opacity-20"}`}
        role="option"
        aria-selected={isChecked}
        tabIndex={-1}
        data-active={isActive ? "true" : undefined}
        style={{ height: virtualRowHeight }} /* mantém altura consistente */
      >
        {!hideCheckboxes && (
          <Checkbox
            checked={isChecked}
            onClick={(e) => e.stopPropagation()}
            onChange={() => handleCheckboxChange(item)}
            size="small"
          />
        )}
        <span className={`${!hideCheckboxes ? "pl-2" : ""} select-none`}>{label}</span>
      </div>
    );
  };

  const selectedLabel =
    selected.length === 0
      ? buttonLabel
      : effectiveSingleSelect
      ? getItemLabel(selected[0])
      : selected.map((it) => getItemLabel(it)).join(", ");

  // Virtualização: somente quando não há groupBy (lista plana)
  const hasGroup = !!groupBy;
  const shouldVirtualize =
    virtualize !== false && !hasGroup && flatItems.length > virtualThreshold;

  const onPanelScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (shouldVirtualize) setScrollTop(e.currentTarget.scrollTop);
  };

  const panelStyle = customStyles;

  return (
    <div className="flex flex-col w-full gap-[4px]">
      {label && (
        <label className="text-[10px] py-[5px] font-bold select-none text-gray-700" htmlFor={id}>
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
                : `${isOpen ? "bg-gray-50 border border-gray-400"
                            : "bg-white border border-gray-300 hover:bg-gray-50"} focus-visible:bg-gray-100 focus-visible:border-gray-400`
            }`}
        >
          <span className="truncate overflow-hidden whitespace-nowrap max-w-[90%] text-left text-gray-400">
            {selectedLabel}
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
            aria-multiselectable={!effectiveSingleSelect || undefined}
            aria-activedescendant={
              activeIndex != null && flatItems.length > 0 ? `${id}-opt-${activeIndex}` : undefined
            }
            ref={panelRef}
            tabIndex={-1}
            onKeyDown={handlePanelKeyDown}
            onScroll={onPanelScroll}
            className="absolute bg-white max-w-[300px] shadow-lg border border-gray-300 border-t-0 overflow-y-auto rounded-lg w-full z-[9999] outline-none"
            style={panelStyle}
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
                className="border-b border-gray-300 w-full p-1 pl-5 box-border text-[12px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
              />
            )}

            {/* Lista */}
            <div className="flex flex-col py-2.5">
              {shouldVirtualize ? (
                // ---------- Virtualizado (flat) ----------
                (() => {
                  const panelH = panelRef.current?.clientHeight || 320;
                  const rowH = virtualRowHeight || 36;
                  const overscan = 8;

                  const total = flatItems.length;
                  const totalHeight = total * rowH;

                  const start = Math.max(0, Math.floor(scrollTop / rowH) - overscan);
                  const visibleCount = Math.ceil(panelH / rowH) + overscan * 2;
                  const end = Math.min(total, start + visibleCount);

                  const slice = flatItems.slice(start, end);

                  return (
                    <div style={{ height: totalHeight, position: "relative" }}>
                      <div
                        style={{
                          position: "absolute",
                          top: start * rowH,
                          left: 0,
                          right: 0,
                        }}
                      >
                        {slice.map((item, idx) => {
                          const flatIndex = start + idx;
                          return renderItem(item, flatIndex);
                        })}
                      </div>
                    </div>
                  );
                })()
              ) : groupBy ? (
                // ---------- Agrupado (sem virtualização) ----------
                Object.entries(groupedItems).map(([groupName, groupItems]) => (
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
                      const idx = flatKeyIndexMap.get(keyToStr(getItemKey(item))) ?? -1;
                      return idx >= 0 ? renderItem(item, idx) : null;
                    })}
                  </div>
                ))
              ) : (
                // ---------- Plano (sem virtualização) ----------
                flatItems.map((item, idx) => renderItem(item, idx))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SelectDropdown;
