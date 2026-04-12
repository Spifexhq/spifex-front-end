// src/shared/ui/Select/Select.tsx
import {
  useState,
  useRef,
  useEffect,
  useId,
  useMemo,
  useCallback,
  useLayoutEffect,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { SelectProps } from "./Select.types";
import { SELECT_SIZE } from "./sizes";
import Checkbox from "@/shared/ui/Checkbox";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

type DropdownPlacement = "bottom" | "top";

type FloatingPanelPosition = {
  left: number;
  width: number;
  maxHeight: number;
  placement: DropdownPlacement;
  top?: number;
  bottom?: number;
};

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const CLOSE_MS = 150;

function Select<T>({
  label,
  items,
  selected,
  onChange,
  getItemKey,
  getItemLabel,
  getItemIcon,
  buttonLabel,
  disabled = false,
  singleSelect = false,
  clearOnClickOutside = false,
  customStyles = {},
  groupBy,
  hideCheckboxes = false,
  hideFilter = false,
  size = "md",
  virtualize = true,
  virtualThreshold = 300,
  virtualRowHeight,
}: SelectProps<T>) {
  const { t } = useTranslation("select");

  const sz = SELECT_SIZE[size];
  const effectiveRowHeight = virtualRowHeight ?? sz.rowHeight;
  const effectiveSingleSelect = singleSelect || hideCheckboxes;

  const [isOpen, setIsOpen] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [hasTopShadow, setHasTopShadow] = useState(false);
  const [hasBottomShadow, setHasBottomShadow] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [portalReady, setPortalReady] = useState(false);
  const [panelPosition, setPanelPosition] = useState<FloatingPanelPosition | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rowsScrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemElsRef = useRef<Array<HTMLDivElement | null>>([]);
  const closeTimerRef = useRef<number | null>(null);
  const openRafRef = useRef<number | null>(null);

  const id = useId();
  const panelId = `${id}-panel`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPortalReady(true);

    return () => {
      if (openRafRef.current != null) window.cancelAnimationFrame(openRafRef.current);
      if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileViewport(media.matches);

    sync();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }

    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

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

  const keyToStr = (k: string | number) => String(k);

  const selectedKeys = useMemo(
    () => new Set(selected.map((s) => keyToStr(getItemKey(s)))),
    [selected, getItemKey]
  );

  const filteredItems = useMemo(() => {
    const st = searchTerm.trim().toLowerCase();
    if (!st) return items;
    return items.filter((item) => (getItemLabel(item) || "").toLowerCase().includes(st));
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

  const flatItems: T[] = useMemo(
    () => (groupBy ? Object.values(groupedItems).flat() : filteredItems),
    [groupedItems, filteredItems, groupBy]
  );

  const flatKeyIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    flatItems.forEach((it, i) => map.set(keyToStr(getItemKey(it)), i));
    return map;
  }, [flatItems, getItemKey]);

  const suppressMouseUntilTsRef = useRef(0);

  const setActiveFrom = (idx: number | null, source: "keyboard" | "mouse") => {
    setActiveIndex(idx);
    if (source === "keyboard") suppressMouseUntilTsRef.current = performance.now() + 120;
  };

  const resolvePreferredMaxHeight = useCallback(() => {
    if (typeof customStyles.maxHeight === "number") return customStyles.maxHeight;
    if (
      typeof customStyles.maxHeight === "string" &&
      customStyles.maxHeight.trim().endsWith("px")
    ) {
      const parsed = Number.parseFloat(customStyles.maxHeight);
      return Number.isFinite(parsed) ? parsed : Math.round(window.innerHeight * 0.44);
    }
    return Math.round(window.innerHeight * 0.44);
  }, [customStyles.maxHeight]);

  const updateFloatingPosition = useCallback(() => {
    const wrapper = dropdownRef.current;
    if (!wrapper || typeof window === "undefined") return;

    const rect = wrapper.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 8;

    const preferredMaxHeight = Math.min(
      resolvePreferredMaxHeight(),
      Math.round(viewportHeight * 0.5)
    );
    const spaceBelow = Math.max(0, viewportHeight - rect.bottom - gap);
    const spaceAbove = Math.max(0, rect.top - gap);

    const nextPlacement: DropdownPlacement =
      spaceBelow >= preferredMaxHeight || spaceBelow >= spaceAbove ? "bottom" : "top";

    const availableSpace = nextPlacement === "bottom" ? spaceBelow : spaceAbove;
    const maxHeight = Math.max(56, Math.min(preferredMaxHeight, availableSpace));

    const width = Math.min(rect.width, viewportWidth - gap * 2);
    const left = Math.min(Math.max(gap, rect.left), viewportWidth - width - gap);

    const nextPosition: FloatingPanelPosition =
      nextPlacement === "bottom"
        ? {
            left,
            width,
            maxHeight,
            placement: nextPlacement,
            top: Math.min(viewportHeight - gap, rect.bottom + gap),
          }
        : {
            left,
            width,
            maxHeight,
            placement: nextPlacement,
            bottom: Math.min(viewportHeight - gap, viewportHeight - rect.top + gap),
          };

    setPanelPosition(nextPosition);
  }, [resolvePreferredMaxHeight]);

  const focusTrigger = useCallback(() => {
    requestAnimationFrame(() => {
      buttonRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const TABBABLE_SELECTOR =
    'a[href],area[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),[tabindex]:not([tabindex="-1"])';

  const isVisible = (el: HTMLElement) =>
    !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

  const getTabbables = useCallback((root: HTMLElement | Document) => {
    const container = (root as Document).body ?? (root as HTMLElement);
    return Array.from(container.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1 && isVisible(el)
    );
  }, []);

  const focusRelativeToTrigger = useCallback(
    (dir: -1 | 1) => {
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
    },
    [getTabbables]
  );

  const openDropdown = useCallback(() => {
    if (disabled) return;

    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    updateFloatingPosition();
    setIsRendered(true);

    if (openRafRef.current != null) {
      window.cancelAnimationFrame(openRafRef.current);
    }

    openRafRef.current = window.requestAnimationFrame(() => {
      setIsOpen(true);
    });
  }, [disabled, updateFloatingPosition]);

  const closeDropdown = useCallback((after?: () => void) => {
    setIsOpen(false);

    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
    }

    closeTimerRef.current = window.setTimeout(() => {
      setIsRendered(false);
      setSearchTerm("");
      setActiveIndex(null);
      setHasTopShadow(false);
      setHasBottomShadow(false);
      setScrollTop(0);
      after?.();
    }, CLOSE_MS);
  }, []);

  const closeAndKeepFocus = useCallback(() => {
    closeDropdown(() => {
      focusTrigger();
    });
  }, [closeDropdown, focusTrigger]);

  const closeAndFocusNext = useCallback(() => {
    closeDropdown(() => {
      focusRelativeToTrigger(1);
    });
  }, [closeDropdown, focusRelativeToTrigger]);

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isRendered || !isOpen) {
      openDropdown();
      return;
    }
    closeAndKeepFocus();
  };

  useEffect(() => {
    if (!isRendered) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (dropdownRef.current?.contains(target)) return;
      if (floatingRef.current?.contains(target)) return;

      closeDropdown(() => {
        if (clearOnClickOutside) onChange([]);
      });
    };

    document.addEventListener("mousedown", handleClickOutside, true);
    window.addEventListener("resize", updateFloatingPosition);
    window.addEventListener("scroll", updateFloatingPosition, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      window.removeEventListener("resize", updateFloatingPosition);
      window.removeEventListener("scroll", updateFloatingPosition, true);
    };
  }, [isRendered, onChange, clearOnClickOutside, updateFloatingPosition, closeDropdown]);

  window.useGlobalEsc?.(isRendered, () => {
    closeAndKeepFocus();
  });

  useIsomorphicLayoutEffect(() => {
    if (!isRendered) return;
    updateFloatingPosition();
  }, [isRendered, updateFloatingPosition]);

  useEffect(() => {
    if (!isRendered) return;

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
    setScrollTop(0);

    requestAnimationFrame(() => {
      updateFloatingPosition();

      if (!isMobileViewport && !hideFilter && searchInputRef.current) {
        searchInputRef.current.focus?.({ preventScroll: true });
      } else {
        panelRef.current?.focus?.({ preventScroll: true });
      }

      const rowsPanel = rowsScrollRef.current;
      if (!rowsPanel) return;
      setHasTopShadow(rowsPanel.scrollTop > 0);
      setHasBottomShadow(rowsPanel.scrollHeight - rowsPanel.clientHeight - rowsPanel.scrollTop > 1);
    });
  }, [
    isRendered,
    flatItems,
    selected,
    getItemKey,
    flatKeyIndexMap,
    isMobileViewport,
    hideFilter,
    updateFloatingPosition,
  ]);

  useEffect(() => {
    if (!isRendered || activeIndex == null) return;
    const rowsPanel = rowsScrollRef.current;
    if (!rowsPanel) return;

    const rowH = effectiveRowHeight;
    const hasGroup = !!groupBy;
    const shouldVirtualize = virtualize !== false && !hasGroup && flatItems.length > virtualThreshold;

    if (shouldVirtualize) {
      const panelH = rowsPanel.clientHeight || 320;
      const itemTop = activeIndex * rowH;
      const itemBottom = itemTop + rowH;
      const viewTop = rowsPanel.scrollTop;
      const viewBottom = viewTop + panelH;

      if (itemTop < viewTop) rowsPanel.scrollTop = itemTop;
      else if (itemBottom > viewBottom) rowsPanel.scrollTop = itemBottom - panelH;
      return;
    }

    const el = itemElsRef.current[activeIndex];
    if (!el) return;

    const panelRect = rowsPanel.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    if (elRect.top < panelRect.top || elRect.bottom > panelRect.bottom) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, isRendered, flatItems.length, effectiveRowHeight, virtualize, virtualThreshold, groupBy]);

  useEffect(() => {
    if (activeIndex == null) return;
    if (flatItems.length === 0) setActiveIndex(null);
    else if (activeIndex > flatItems.length - 1) setActiveIndex(flatItems.length - 1);
  }, [flatItems, activeIndex]);

  const handleCheckboxChange = (item: T, options?: { moveFocusNext?: boolean }) => {
    const k = keyToStr(getItemKey(item));
    const isCurrentlySelected = selectedKeys.has(k);

    const rowsPanel = rowsScrollRef.current;
    const prevScrollTop = rowsPanel?.scrollTop ?? 0;

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
      if (options?.moveFocusNext) closeAndFocusNext();
      else closeAndKeepFocus();
    } else {
      requestAnimationFrame(() => {
        if (rowsPanel) {
          rowsPanel.scrollTop = prevScrollTop;
          rowsPanel.focus?.({ preventScroll: true });
          updateFloatingPosition();
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

  const handleButtonKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openDropdown();
    }

    if (e.key === "Escape" && isRendered) {
      e.preventDefault();
      closeAndKeepFocus();
    }
  };

  const handleButtonFocus = () => {
    if (!disabled && lastFocusByTabRef.current) {
      openDropdown();
    }
  };

  const handlePanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!isRendered) return;

    if (e.key === "Escape") {
      e.preventDefault();
      closeAndKeepFocus();
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      closeDropdown(() => {
        if (e.shiftKey) focusRelativeToTrigger(-1);
        else focusRelativeToTrigger(1);
      });
      return;
    }

    const handled = ["ArrowDown", "ArrowUp", "Home", "End", "Enter", "PageDown", "PageUp"];
    if (!handled.includes(e.key)) return;

    e.preventDefault();
    if (flatItems.length === 0) return;

    const lastIdx = flatItems.length - 1;
    const page = Math.max(
      1,
      Math.floor((rowsScrollRef.current?.clientHeight || 240) / effectiveRowHeight)
    );

    if (e.key === "Home") {
      setActiveFrom(0, "keyboard");
      return;
    }

    if (e.key === "End") {
      setActiveFrom(lastIdx, "keyboard");
      return;
    }

    if (e.key === "PageDown") {
      const next = Math.min((activeIndex ?? -1) + page, lastIdx);
      setActiveFrom(next < 0 ? 0 : next, "keyboard");
      return;
    }

    if (e.key === "PageUp") {
      const prev = Math.max((activeIndex ?? flatItems.length) - page, 0);
      setActiveFrom(prev, "keyboard");
      return;
    }

    if (e.key === "ArrowDown") {
      const next = activeIndex == null ? 0 : Math.min(activeIndex + 1, lastIdx);
      setActiveFrom(next, "keyboard");
      return;
    }

    if (e.key === "ArrowUp") {
      const prev = activeIndex == null ? lastIdx : Math.max(activeIndex - 1, 0);
      setActiveFrom(prev, "keyboard");
      return;
    }

    if (e.key === "Enter" && activeIndex != null) {
      handleCheckboxChange(flatItems[activeIndex], { moveFocusNext: effectiveSingleSelect });
    }
  };

  const renderItem = (item: T, flatIndex: number) => {
    const k = keyToStr(getItemKey(item));
    const itemLabel = getItemLabel(item);
    const itemIcon = getItemIcon?.(item);
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
        onClick={() => handleCheckboxChange(item, { moveFocusNext: false })}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        className={cn(
          "flex cursor-pointer select-none items-center gap-2 transition-colors focus:outline-none",
          sz.item,
          isActive ? "bg-gray-100" : "hover:bg-gray-50",
          hideCheckboxes && isChecked ? "bg-gray-100 font-medium" : ""
        )}
        role="option"
        aria-selected={isChecked}
        tabIndex={-1}
        data-active={isActive ? "true" : undefined}
        style={{ height: effectiveRowHeight }}
      >
        {!hideCheckboxes && (
          <Checkbox
            checked={isChecked}
            onClick={(e) => e.stopPropagation()}
            onChange={() => handleCheckboxChange(item, { moveFocusNext: false })}
            size="small"
          />
        )}

        {itemIcon ? (
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-md text-gray-500",
              sz.iconBox
            )}
          >
            <span className={cn("inline-flex items-center justify-center", sz.iconSize)}>
              {itemIcon}
            </span>
          </span>
        ) : null}

        <span className="min-w-0 truncate">{itemLabel}</span>
      </div>
    );
  };

  const selectedLabel =
    selected.length === 0
      ? buttonLabel || (effectiveSingleSelect ? t("button.single") : t("button.multi"))
      : effectiveSingleSelect
        ? getItemLabel(selected[0])
        : `${t("count.selected", { count: selected.length })}`;

  const selectedIcon =
    effectiveSingleSelect && selected.length === 1 ? getItemIcon?.(selected[0]) : null;

  const hasGroup = !!groupBy;
  const shouldVirtualize = virtualize !== false && !hasGroup && flatItems.length > virtualThreshold;

  const onRowsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (shouldVirtualize) setScrollTop(e.currentTarget.scrollTop);

    const p = e.currentTarget;
    setHasTopShadow(p.scrollTop > 0);
    setHasBottomShadow(p.scrollHeight - p.clientHeight - p.scrollTop > 1);

    updateFloatingPosition();
  };

  const panelStyle: CSSProperties = {
    ...customStyles,
    maxHeight: panelPosition?.maxHeight ?? customStyles.maxHeight,
    WebkitMaskImage:
      hasTopShadow || hasBottomShadow
        ? `linear-gradient(to bottom, rgba(0,0,0,${hasTopShadow ? 0 : 1}) 0, rgba(0,0,0,1) 12px, rgba(0,0,0,1) calc(100% - 12px), rgba(0,0,0,${hasBottomShadow ? 0 : 1}) 100%)`
        : undefined,
    maskImage:
      hasTopShadow || hasBottomShadow
        ? `linear-gradient(to bottom, rgba(0,0,0,${hasTopShadow ? 0 : 1}) 0, rgba(0,0,0,1) 12px, rgba(0,0,0,1) calc(100% - 12px), rgba(0,0,0,${hasBottomShadow ? 0 : 1}) 100%)`
        : undefined,
  };

  const hasSelection = selected.length > 0;
  const showActions = !effectiveSingleSelect && !hideCheckboxes;
  const showFilter = !hideFilter;

  const floatingPanel =
    isRendered && portalReady && panelPosition
      ? createPortal(
          <div
            ref={floatingRef}
            className={cn(
              "fixed overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg",
              "origin-top transition-all duration-150 ease-out",
              isOpen
                ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                : "opacity-0 -translate-y-1 scale-[0.985] pointer-events-none"
            )}
            style={{
              zIndex: 10050,
              left: panelPosition.left,
              width: panelPosition.width,
              top: panelPosition.top,
              bottom: panelPosition.bottom,
            }}
            data-select-open={isOpen ? "true" : "false"}
          >
            <div
              id={panelId}
              role="listbox"
              aria-labelledby={id}
              aria-label={t("aria.listbox")}
              aria-multiselectable={!effectiveSingleSelect || undefined}
              aria-activedescendant={
                activeIndex != null && flatItems.length > 0 ? `${id}-opt-${activeIndex}` : undefined
              }
              ref={panelRef}
              tabIndex={0}
              onKeyDown={handlePanelKeyDown}
              className="flex outline-none"
              style={panelStyle}
            >
              <div className="flex min-h-0 w-full flex-col">
                {showActions && (
                  <div
                    className={cn(
                      "z-10 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75",
                      !showFilter ? "rounded-t-md" : ""
                    )}
                  >
                    <div className="flex gap-1 rounded-t-md p-2">
                      <button
                        type="button"
                        onClick={selectAll}
                        className={cn(
                          "rounded border border-gray-200 font-medium hover:bg-gray-50",
                          sz.actionBtn
                        )}
                        tabIndex={-1}
                        aria-label={t("actions.selectAll")}
                      >
                        {t("actions.selectAll")}
                      </button>
                      <button
                        type="button"
                        onClick={deselectAll}
                        className={cn(
                          "rounded border border-gray-200 font-medium hover:bg-gray-50",
                          sz.actionBtn
                        )}
                        tabIndex={-1}
                        aria-label={t("actions.clearAll")}
                      >
                        {t("actions.clearAll")}
                      </button>
                    </div>
                  </div>
                )}

                {showFilter && (
                  <div
                    className={cn(
                      "z-10 border-b border-gray-200 bg-white px-2 py-2",
                      !showActions ? "rounded-t-md" : ""
                    )}
                  >
                    <div className="relative rounded-t-md">
                      <input
                        type="text"
                        placeholder={t("filter.placeholder")}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        ref={searchInputRef}
                        className={cn(
                          "w-full border border-gray-200 outline-none focus:border-gray-300 focus:ring-2 focus:ring-gray-200",
                          sz.filterInput
                        )}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.preventDefault();
                          if (e.key === "Escape") {
                            e.preventDefault();
                            e.stopPropagation();
                            closeAndKeepFocus();
                          }
                        }}
                        aria-label={t("filter.aria")}
                      />
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className={cn(
                          "absolute left-2 top-1/2 -translate-y-1/2 text-gray-400",
                          size === "xl" ? "h-5 w-5" : "h-4 w-4"
                        )}
                        fill="none"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                        />
                      </svg>
                    </div>
                  </div>
                )}

                <div
                  ref={rowsScrollRef}
                  onScroll={onRowsScroll}
                  className="min-h-0 flex-1 overflow-y-auto"
                  tabIndex={-1}
                >
                  <div className="py-1">
                    {flatItems.length === 0 ? (
                      <div className={cn("text-center text-gray-500", sz.empty)}>
                        {searchTerm ? t("empty.search") : t("empty.default")}
                      </div>
                    ) : shouldVirtualize ? (
                      (() => {
                        const panelH = rowsScrollRef.current?.clientHeight || 320;
                        const rowH = effectiveRowHeight;
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
                              {slice.map((item, idx) => renderItem(item, start + idx))}
                            </div>
                          </div>
                        );
                      })()
                    ) : groupBy ? (
                      Object.entries(groupedItems).map(([groupName, groupItems]) => (
                        <div key={groupName}>
                          <div
                            className={cn(
                              "font-semibold text-gray-600",
                              size === "xl" ? "px-5 py-3 text-[13px]" : "px-3 py-2 text-[11px]",
                              !effectiveSingleSelect ? "cursor-pointer hover:bg-gray-50" : ""
                            )}
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
          </div>,
          document.body
        )
      : null;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label className={cn("select-none font-semibold text-gray-700", sz.label)} htmlFor={id}>
          {label}
        </label>
      )}

      <div
        ref={dropdownRef}
        className="relative w-full select-none"
        data-select-open={isRendered ? "true" : undefined}
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
          aria-expanded={isRendered}
          aria-controls={panelId}
          aria-label={t("aria.trigger")}
          className={cn(
            "group flex w-full items-center justify-between border outline-none transition-colors",
            sz.trigger,
            disabled
              ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
              : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-gray-300"
          )}
        >
          <span className="flex min-w-0 items-center gap-2 overflow-hidden text-left">
            {selectedIcon ? (
              <span
                aria-hidden="true"
                className={cn(
                  "inline-flex shrink-0 items-center justify-center rounded-md text-gray-600",
                  sz.triggerIconBox
                )}
              >
                <span className={cn("inline-flex items-center justify-center", sz.triggerIconSize)}>
                  {selectedIcon}
                </span>
              </span>
            ) : null}

            <span
              className={cn(
                "truncate",
                disabled ? "text-gray-400" : hasSelection ? "text-gray-800" : "text-gray-400"
              )}
            >
              {selectedLabel}
            </span>
          </span>

          <span className="ml-2 flex items-center gap-2">
            {!effectiveSingleSelect && selected.length > 0 && (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-700",
                  sz.badge
                )}
                aria-hidden="true"
              >
                {selected.length}
              </span>
            )}

            <svg
              className={cn(
                "transition-transform duration-200 ease-out",
                sz.chevron,
                isOpen ? "rotate-180" : "rotate-0"
              )}
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </span>
        </button>
      </div>

      {floatingPanel}
    </div>
  );
}

export default Select;
export { Select };