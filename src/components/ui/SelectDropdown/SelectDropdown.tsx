import {
  useState, useRef, useEffect, useId, useMemo,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { SelectDropdownProps } from "./SelectDropdown.types";
import Checkbox from "src/components/ui/Checkbox";

/**
 * SelectDropdown — Minimal & Fluid
 * - Compact visual language, no heavy shadows, light borders only.
 * - Sticky filter + actions, scroll-shadows for context.
 * - Smooth open/close with transform/opacity, no layout jank.
 * - Better focus ring, clearer states, no hover flicker.
 * - Virtualization preserved for large lists.
 * - Keeps your prop API intact.
 */
function SelectDropdown<T>({
  label,
  items,
  selected,
  onChange,
  getItemKey,
  getItemLabel,
  buttonLabel,
  disabled = false,
  singleSelect = false,
  clearOnClickOutside = false,
  customStyles = {},
  groupBy,
  hideCheckboxes = false,
  hideFilter = false,

  // Virtualization
  virtualize = true,
  virtualThreshold = 300,
  virtualRowHeight = 36,
}: SelectDropdownProps<T>) {
  const { t } = useTranslation("selectDropdown");

  // ---------------------------------------------------------------------------
  // State & refs
  // ---------------------------------------------------------------------------
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hasTopShadow, setHasTopShadow] = useState(false);
  const [hasBottomShadow, setHasBottomShadow] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemElsRef = useRef<Array<HTMLDivElement | null>>([]);

  // Virtual scroll
  const [scrollTop, setScrollTop] = useState(0);

  const id = useId();
  const panelId = `${id}-panel`;
  const effectiveSingleSelect = singleSelect || hideCheckboxes;

  // detect focus by Tab (auto-open on focus)
  const lastFocusByTabRef = useRef(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Tab") lastFocusByTabRef.current = true; };
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === "Tab") lastFocusByTabRef.current = false; };
    const onMouseDown = () => { lastFocusByTabRef.current = false; };
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

  // Filtering
  const filteredItems = useMemo(() => {
    const st = searchTerm.trim().toLowerCase();
    if (!st) return items;
    return items.filter((item) => (getItemLabel(item) || "").toLowerCase().includes(st));
  }, [items, searchTerm, getItemLabel]);

  // Optional grouping
  const groupedItems: Record<string, T[]> = useMemo(() => {
    if (!groupBy) return {};
    const acc: Record<string, T[]> = {};
    filteredItems.forEach((it) => {
      const g = groupBy(it);
      (acc[g] ??= []).push(it);
    });
    return acc;
  }, [filteredItems, groupBy]);

  // Flat list for nav/virtualization
  const flatItems: T[] = useMemo(
    () => (groupBy ? Object.values(groupedItems).flat() : filteredItems),
    [groupedItems, filteredItems, groupBy]
  );

  // key -> index map
  const flatKeyIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    flatItems.forEach((it, i) => map.set(keyToStr(getItemKey(it)), i));
    return map;
  }, [flatItems, getItemKey]);

  // “last interaction wins” (mouse vs keyboard)
  const lastSourceRef = useRef<"keyboard" | "mouse" | null>(null);
  const suppressMouseUntilTsRef = useRef(0);
  const setActiveFrom = (idx: number | null, source: "keyboard" | "mouse") => {
    lastSourceRef.current = source;
    setActiveIndex(idx);
    if (source === "keyboard") suppressMouseUntilTsRef.current = performance.now() + 120;
  };

  // ---------------------------------------------------------------------------
  // Open/close
  // ---------------------------------------------------------------------------
  const toggleDropdown = () => { if (!disabled) setIsOpen((p) => !p); };

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

  // set active item & focus on open
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

    // Prefer focusing filter; otherwise the panel to keep roving focus
    if (!hideFilter && searchInputRef.current) {
      searchInputRef.current.focus?.({ preventScroll: true });
    } else {
      panelRef.current?.focus?.({ preventScroll: true });
    }

    // Reset virtual scroll & shadows
    setScrollTop(0);
    requestAnimationFrame(() => {
      const p = panelRef.current;
      if (!p) return;
      setHasTopShadow(p.scrollTop > 0);
      setHasBottomShadow(p.scrollHeight - p.clientHeight - p.scrollTop > 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Keep active item visible
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

      if (itemTop < viewTop) panel.scrollTop = itemTop;
      else if (itemBottom > viewBottom) panel.scrollTop = itemBottom - panelH;
      return;
    }

    const el = itemElsRef.current[activeIndex];
    if (!el) return;
    const panelRect = panel.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    if (elRect.top < panelRect.top || elRect.bottom > panelRect.bottom) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, isOpen, flatItems.length, virtualRowHeight, virtualize, virtualThreshold, groupBy]);

  // Clamp activeIndex when list length changes
  useEffect(() => {
    if (activeIndex == null) return;
    if (flatItems.length === 0) setActiveIndex(null);
    else if (activeIndex > flatItems.length - 1) setActiveIndex(flatItems.length - 1);
  }, [flatItems, activeIndex]);

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------
  const handleCheckboxChange = (item: T) => {
    const k = keyToStr(getItemKey(item));
    const isCurrentlySelected = selectedKeys.has(k);

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

  const selectAll = () => { if (!effectiveSingleSelect) onChange([...items]); };
  const deselectAll = () => { if (!effectiveSingleSelect) onChange([]); };

  const handleGroupToggle = (groupItems: T[]) => {
    if (effectiveSingleSelect) return;
    const allSelected = groupItems.every((it) => selectedKeys.has(keyToStr(getItemKey(it))));
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
  // Tab accessibility (leaving dropdown goes to neighbors of trigger)
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
    setTimeout(() => { target?.focus(); }, 0);
  };

  // ---------------------------------------------------------------------------
  // Keyboard interaction
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

    // Tab / Shift+Tab → move focus around trigger
    if (e.key === "Tab") {
      e.preventDefault();
      setIsOpen(false);
      if (e.shiftKey) focusRelativeToTrigger(-1);
      else focusRelativeToTrigger(1);
      return;
    }

    const handled = ["ArrowDown", "ArrowUp", "Home", "End", "Enter", "PageDown", "PageUp"];
    if (!handled.includes(e.key)) return;

    e.preventDefault();
    if (flatItems.length === 0) return;

    const lastIdx = flatItems.length - 1;
    const page = Math.max(1, Math.floor((panelRef.current?.clientHeight || 240) / (virtualRowHeight || 36)));

    if (e.key === "Home") { setActiveFrom(0, "keyboard"); return; }
    if (e.key === "End") { setActiveFrom(lastIdx, "keyboard"); return; }
    if (e.key === "PageDown") {
      const next = Math.min((activeIndex ?? -1) + page, lastIdx);
      setActiveFrom(next < 0 ? 0 : next, "keyboard"); return;
    }
    if (e.key === "PageUp") {
      const prev = Math.max((activeIndex ?? flatItems.length) - page, 0);
      setActiveFrom(prev, "keyboard"); return;
    }
    if (e.key === "ArrowDown") {
      const next = activeIndex == null ? 0 : Math.min(activeIndex + 1, lastIdx);
      setActiveFrom(next, "keyboard"); return;
    }
    if (e.key === "ArrowUp") {
      const prev = activeIndex == null ? lastIdx : Math.max(activeIndex - 1, 0);
      setActiveFrom(prev, "keyboard"); return;
    }
    if (e.key === "Enter" && activeIndex != null) handleCheckboxChange(flatItems[activeIndex]);
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
        className={[
          "flex items-center gap-2 px-3 py-2.5 text-xs cursor-pointer select-none transition-colors",
          "focus:outline-none",
          isActive ? "bg-gray-100" : "hover:bg-gray-50",
          hideCheckboxes && isChecked ? "bg-gray-100 font-medium" : "",
        ].join(" ")}
        role="option"
        aria-selected={isChecked}
        tabIndex={-1}
        data-active={isActive ? "true" : undefined}
        style={{ height: virtualRowHeight }}
      >
        {!hideCheckboxes && (
          <Checkbox
            checked={isChecked}
            onClick={(e) => e.stopPropagation()}
            onChange={() => handleCheckboxChange(item)}
            size="small"
          />
        )}
        <span className="truncate">{label}</span>
      </div>
    );
  };

  const selectedLabel =
    selected.length === 0
      ? buttonLabel || (effectiveSingleSelect ? t("button.single") : t("button.multi"))
      : effectiveSingleSelect
      ? getItemLabel(selected[0])
      : `${t("count.selected", { count: selected.length })}`;

  // Virtualization only for flat lists
  const hasGroup = !!groupBy;
  const shouldVirtualize =
    virtualize !== false && !hasGroup && flatItems.length > virtualThreshold;

  const onPanelScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (shouldVirtualize) setScrollTop(e.currentTarget.scrollTop);

    // Scroll-shadows toggling
    const p = e.currentTarget;
    setHasTopShadow(p.scrollTop > 0);
    setHasBottomShadow(p.scrollHeight - p.clientHeight - p.scrollTop > 1);
  };

  const panelStyle = {
    ...customStyles,
    // subtle scroll-shadows via mask to keep it minimal
    WebkitMaskImage: hasTopShadow || hasBottomShadow
      ? `linear-gradient(to bottom, rgba(0,0,0,${hasTopShadow ? 0 : 1}) 0, rgba(0,0,0,1) 12px, rgba(0,0,0,1) calc(100% - 12px), rgba(0,0,0,${hasBottomShadow ? 0 : 1}) 100%)`
      : undefined,
    maskImage: hasTopShadow || hasBottomShadow
      ? `linear-gradient(to bottom, rgba(0,0,0,${hasTopShadow ? 0 : 1}) 0, rgba(0,0,0,1) 12px, rgba(0,0,0,1) calc(100% - 12px), rgba(0,0,0,${hasBottomShadow ? 0 : 1}) 100%)`
      : undefined,
  } as React.CSSProperties;

  const hasSelection = selected.length > 0;

  return (
    <div className="flex flex-col w-full gap-1.5">
      {label && (
        <label className="text-[10.5px] font-semibold text-gray-700 select-none" htmlFor={id}>
          {label}
        </label>
      )}

      <div ref={dropdownRef} className="relative w-full select-none" data-select-open={isOpen ? "true" : undefined}>
        {/* Trigger */}
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
          aria-label={t("aria.trigger")}
          className={[
            "group flex items-center justify-between w-full h-10 rounded-md border text-xs px-3",
            "transition-colors outline-none",
            disabled
              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-300",
          ].join(" ")}
        >
          <span
            className={[
              "truncate text-left",
              hasSelection ? "text-gray-800" : "text-gray-400",
            ].join(" ")}
          >
            {selectedLabel}
          </span>

          <span className="ml-2 flex items-center gap-2">
            {!effectiveSingleSelect && selected.length > 0 && (
              <span
                className="min-w-[1.5rem] h-5 px-1.5 inline-flex items-center justify-center text-[10px] rounded-full bg-gray-100 text-gray-700"
                aria-hidden="true"
              >
                {selected.length}
              </span>
            )}
            <svg
              className={[
                "w-4 h-4 transition-transform duration-200 ease-out",
                isOpen ? "rotate-180" : "rotate-0",
              ].join(" ")}
              aria-hidden="true" viewBox="0 0 24 24" fill="none"
            >
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {/* Panel */}
        <div
          className={[
            "absolute left-0 right-0 top-full origin-top rounded-md border border-gray-200 bg-white z-[60]",
            "transition-all duration-150 ease-out",
            isOpen
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-1 pointer-events-none",
          ].join(" ")}
          style={{ maxWidth: 360 }}
        >
          <div
            id={panelId}
            role="listbox"
            aria-labelledby={id}
            aria-label={t("aria.listbox")}
            aria-multiselectable={!effectiveSingleSelect || undefined}
            aria-activedescendant={
              isOpen && activeIndex != null && flatItems.length > 0 ? `${id}-opt-${activeIndex}` : undefined
            }
            ref={panelRef}
            tabIndex={isOpen ? 0 : -1}
            onKeyDown={handlePanelKeyDown}
            onScroll={onPanelScroll}
            className={[
              // Panel body box (scroll region)
              "max-h-[44vh] overflow-y-auto outline-none",
            ].join(" ")}
            style={panelStyle}
          >
            {/* Sticky controls */}
            {!effectiveSingleSelect && !hideCheckboxes && (
              <div className="sticky top-0 z-10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75 border-b border-gray-200">
                <div className="flex gap-1 p-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="h-7 px-2 rounded border border-gray-200 text-[11px] font-medium hover:bg-gray-50"
                    tabIndex={-1}
                    aria-label={t("actions.selectAll")}
                  >
                    {t("actions.selectAll")}
                  </button>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="h-7 px-2 rounded border border-gray-200 text-[11px] font-medium hover:bg-gray-50"
                    tabIndex={-1}
                    aria-label={t("actions.clearAll")}
                  >
                    {t("actions.clearAll")}
                  </button>
                </div>
              </div>
            )}

            {!hideFilter && (
              <div className="sticky top-[var(--sticky-offset,0px)] z-10 bg-white border-b border-gray-200 px-2 py-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={t("filter.placeholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    ref={searchInputRef}
                    className="w-full h-8 pl-7 pr-2 rounded border border-gray-200 text-[12px] outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                    aria-label={t("filter.aria")}
                  />
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
                    fill="none"
                  >
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
                  </svg>
                </div>
              </div>
            )}

            {/* Empty / List */}
            <div className="py-1">
              {flatItems.length === 0 ? (
                <div className="px-3 py-8 text-center text-[12px] text-gray-500">
                  {searchTerm ? t("empty.search") : t("empty.default")}
                </div>
              ) : shouldVirtualize ? (
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
                      <div style={{ position: "absolute", top: start * rowH, left: 0, right: 0 }}>
                        {slice.map((item, idx) => renderItem(item, start + idx))}
                      </div>
                    </div>
                  );
                })()
              ) : groupBy ? (
                Object.entries(groupedItems).map(([groupName, groupItems]) => (
                  <div key={groupName}>
                    <div
                      className={[
                        "px-3 py-2 text-[11px] text-gray-600",
                        !effectiveSingleSelect ? "cursor-pointer hover:bg-gray-50" : "",
                        "font-semibold",
                      ].join(" ")}
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
                flatItems.map((item, idx) => renderItem(item, idx))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SelectDropdown;
