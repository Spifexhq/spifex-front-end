import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { EntryFilters, ChipKey, Visualization, LocalFilters } from "@/models/components/filterBar";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useBankOptions } from "./hooks/useBankOptions";
import { useCashflowCategories } from "./hooks/useCategories";
import { useSavedViews } from "./hooks/useSavedViews";
import { buildClearedLocalFilters, buildInitialLocalFilters, toEntryFilters } from "./FilterBar.utils";
import type { FilterDefinition } from "./FilterBar.types";
import { getFilterDefinitions } from "./filters/registry";
import type { MenuEntry } from "./ui/Menu";

function normalizeIdArray(v?: string[]): string[] {
  return Array.isArray(v) ? [...v].map(String).sort() : [];
}

function normalizeNumString(v?: string): string {
  if (!v) return "";
  const normalized = String(v).trim().replace(/\s+/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? String(n) : "";
}

function filtersSignature(filters: EntryFilters): string {
  const sig = {
    settlement_status: !!filters.settlement_status,
    start_date: filters.start_date ?? "",
    end_date: filters.end_date ?? "",
    description: filters.description ?? "",
    observation: filters.observation ?? "",
    tx_type: filters.tx_type ?? "",
    amount_min: normalizeNumString(filters.amount_min),
    amount_max: normalizeNumString(filters.amount_max),
    bank_id: normalizeIdArray(filters.bank_id),
    cashflow_category_id: normalizeIdArray(filters.cashflow_category_id),
  };

  return JSON.stringify(sig);
}

export function useActivityFilters({ initial, onApply, contextSettlement, shortcutsEnabled = true, enabled }: {
 initial: EntryFilters; onApply(payload: {filters: EntryFilters}): void; contextSettlement: boolean; shortcutsEnabled?: boolean; enabled: boolean;
}) {
  const { t } = useTranslation(["filterBar"]);
  const isMobile = useMediaQuery("(max-width: 639px)");

  const bankOptions = useBankOptions(true, enabled);
  const allCategories = useCashflowCategories(enabled);
  const { views: savedViews, loaded: viewsLoaded, refresh: refreshViews } = useSavedViews(contextSettlement, enabled);

  const scopedViews = useMemo(() => savedViews, [savedViews]);

  const [localFilters, setLocalFilters] = useState<LocalFilters>(() =>
    buildInitialLocalFilters(initial, contextSettlement)
  );

  const filterDefs = useMemo<FilterDefinition[]>(() => getFilterDefinitions(), []);
  const defsByKey = useMemo(() => {
    const map = new Map<ChipKey, FilterDefinition>();
    filterDefs.forEach((d) => map.set(d.key, d));
    return map;
  }, [filterDefs]);

  const [openEditor, setOpenEditor] = useState<ChipKey | null>(null);
  const [addFilterMenuOpen, setAddFilterMenuOpen] = useState(false);
  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);

  const addFilterMenuRef = useRef<HTMLDivElement>(null);
  const viewsMenuRef = useRef<HTMLDivElement>(null);

  const configPermission = contextSettlement
    ? "view_settlement_entry_view"
    : "view_cash_flow_entry_view";

  const editorAnchorRef = useRef<HTMLElement | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [lastAppliedSig, setLastAppliedSig] = useState<string | null>(null);
  const closeEditorsAndMenus = useCallback(() => {
    setOpenEditor(null);
    setViewsMenuOpen(false);
    setAddFilterMenuOpen(false);
  }, []);

  const removeChip = useCallback(
    (key: ChipKey) => {
      const def = defsByKey.get(key);
      if (!def) return;
      setLocalFilters((prev) => def.clear(prev));
    },
    [defsByKey]
  );

  const selectedBanks = useMemo(() => {
    const selected = new Set(localFilters.bank_id.map(String));
    return bankOptions.filter((b) => selected.has(String(b.id)));
  }, [bankOptions, localFilters.bank_id]);

  const selectedCategories = useMemo(() => {
    const selected = new Set(localFilters.cashflow_category_id.map(String));
    return allCategories.filter((c) => selected.has(String(c.id)));
  }, [allCategories, localFilters.cashflow_category_id]);

  const categoriesForPicker = useMemo(() => {
    const selectedIds = new Set(localFilters.cashflow_category_id.map(String));
    const selected = allCategories.filter((c) => selectedIds.has(String(c.id)));

    const wanted = localFilters.tx_type;
    if (!wanted) return allCategories;

    const wantedHint = wanted === "credit" ? 1 : wanted === "debit" ? -1 : null;
    if (wantedHint === null) return allCategories;

    const filtered = allCategories.filter((c) => Number(c.tx_type_hint ?? 0) === wantedHint);
    return [...selected, ...filtered.filter((c) => !selectedIds.has(String(c.id)))];
  }, [allCategories, localFilters.cashflow_category_id, localFilters.tx_type]);

  const hasActiveFilters = useMemo(() => {
    const anyRegistryActive = filterDefs.some((d) => d.isActive(localFilters));
    return anyRegistryActive || !!localFilters.description;
  }, [filterDefs, localFilters]);

  const activeFiltersCount = useMemo(() => {
    const c = filterDefs.reduce((acc, d) => acc + (d.isActive(localFilters) ? 1 : 0), 0);
    return c + (localFilters.description ? 1 : 0);
  }, [filterDefs, localFilters]);

  const currentSig = useMemo(() => filtersSignature(toEntryFilters(localFilters)), [localFilters]);

  const canApply = useMemo(() => {
    if (lastAppliedSig === null) return hasActiveFilters;
    return currentSig !== lastAppliedSig;
  }, [lastAppliedSig, hasActiveFilters, currentSig]);

  const tryApplyCurrentFilters = useCallback(() => {
    const next = toEntryFilters(localFilters);
    const nextSig = filtersSignature(next);

    const shouldApply = lastAppliedSig === null ? hasActiveFilters : nextSig !== lastAppliedSig;
    if (!shouldApply) return false;

    onApply({ filters: next });
    setLastAppliedSig(nextSig);
    return true;
  }, [localFilters, lastAppliedSig, hasActiveFilters, onApply]);

  const closeEditorsAndApply = useCallback(() => {
    const applied = tryApplyCurrentFilters();
    if (applied || !canApply) setOpenEditor(null);
  }, [tryApplyCurrentFilters, canApply]);

  const clearAll = useCallback(() => {
    const cleared = buildClearedLocalFilters(contextSettlement);
    const next = toEntryFilters(cleared);
    const nextSig = filtersSignature(next);

    setLocalFilters(cleared);
    closeEditorsAndMenus();

    if (nextSig === lastAppliedSig) return;

    onApply({ filters: next });
    setLastAppliedSig(nextSig);
  }, [closeEditorsAndMenus, contextSettlement, lastAppliedSig, onApply]);

  const escEnabled =
    enabled && shortcutsEnabled &&
    (saveModalOpen || configModalOpen || openEditor !== null || viewsMenuOpen || addFilterMenuOpen);

  const onEsc = useCallback(() => {
    if (saveModalOpen) return void setSaveModalOpen(false);
    if (configModalOpen) return void setConfigModalOpen(false);
    if (openEditor !== null) {
      setOpenEditor(null);
      const trigger = editorAnchorRef.current;
      (trigger?.matches("button") ? trigger : trigger?.querySelector("button"))?.focus();
      return;
    }
    if (viewsMenuOpen) { setViewsMenuOpen(false); viewsMenuRef.current?.querySelector("button")?.focus(); return; }
    if (addFilterMenuOpen) { setAddFilterMenuOpen(false); addFilterMenuRef.current?.querySelector("button")?.focus(); }
  }, [addFilterMenuOpen, configModalOpen, openEditor, saveModalOpen, viewsMenuOpen]);

  window.useGlobalEsc(escEnabled, onEsc);

  useEffect(() => {
    if (!enabled || !shortcutsEnabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      const cmdOrCtrl = e.metaKey || e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (cmdOrCtrl && (e.key === "Enter" || e.code === "Enter")) {
        e.preventDefault();
        void tryApplyCurrentFilters();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, shortcutsEnabled, tryApplyCurrentFilters]);

  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (bootstrappedRef.current) return;
    if (!viewsLoaded) return;

    const defaultView = scopedViews.find((v) => v.is_default);

    if (defaultView) {
      const nextLocal = buildInitialLocalFilters(defaultView.filters, contextSettlement);
      nextLocal.settlement_status = !!defaultView.settlement_status;

      const next = toEntryFilters(nextLocal);
      const sig = filtersSignature(next);

      setLocalFilters(nextLocal);
      onApply({ filters: next });
      setLastAppliedSig(sig);
    } else {
      const next = toEntryFilters(localFilters);
      const sig = filtersSignature(next);

      onApply({ filters: next });
      setLastAppliedSig(sig);
    }

    bootstrappedRef.current = true;
  }, [viewsLoaded, scopedViews, onApply, localFilters, contextSettlement]);

  const applyViewToForm = useCallback(
    (view: Visualization) => {
      const next = buildInitialLocalFilters(view.filters, contextSettlement);
      next.settlement_status = !!view.settlement_status;
      setLocalFilters(next);
    },
    [contextSettlement]
  );

  const addFilterItems = useMemo<MenuEntry[]>(() => {
    const sorted = [...filterDefs].sort((a, b) => a.menuGroup - b.menuGroup);
    const out: MenuEntry[] = [];

    let lastGroup: number | null = null;
    for (const d of sorted) {
      if (lastGroup !== null && d.menuGroup !== lastGroup) out.push({ sep: true });
      lastGroup = d.menuGroup;

      out.push({
        key: d.key,
        label: t(d.menuLabelKey),
        onAction: () => { editorAnchorRef.current = addFilterMenuRef.current; setOpenEditor(d.key); },
      });
    }

    return out;
  }, [filterDefs, t]);

  const activeEditorDef = openEditor ? defsByKey.get(openEditor) ?? null : null;

  return { isMobile, localFilters, setLocalFilters, filterDefs, setOpenEditor, addFilterMenuOpen, setAddFilterMenuOpen, viewsMenuOpen, setViewsMenuOpen, addFilterMenuRef, viewsMenuRef, configPermission, editorAnchorRef, searchInputRef, configModalOpen, setConfigModalOpen, saveModalOpen, setSaveModalOpen, selectedBanks, selectedCategories, categoriesForPicker, hasActiveFilters, activeFiltersCount, canApply, tryApplyCurrentFilters, closeEditorsAndApply, clearAll, applyViewToForm, addFilterItems, activeEditorDef, scopedViews, refreshViews, bankOptions, removeChip };
}
