/* --------------------------------------------------------------------------
 * File: src/components/FilterBar/FilterBar.tsx
 * -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  ChevronUp,
  ChevronDown,
  Settings,
  Save,
  Eye,
  Star,
} from "lucide-react";

import Button from "@/shared/ui/Button";

import type { EntryFilters, ChipKey, Visualization, LocalFilters } from "@/models/components/filterBar";

import { useMediaQuery } from "./hooks/useMediaQuery";
import { useOnClickOutside } from "./hooks/useOnClickOutside";
import { useBankOptions } from "./hooks/useBankOptions";
import { useLedgerAccounts } from "./hooks/useLedgerAccounts";
import { useSavedViews } from "./hooks/useSavedViews";

import { buildClearedLocalFilters, buildInitialLocalFilters, toEntryFilters } from "./FilterBar.utils";
import type { FilterDefinition } from "./FilterBar.types";

import { getFilterDefinitions } from "./filters/registry";
import { ChipsSearchBar } from "./sections/ChipsSearchBar";
import { Popover } from "./ui/Popover";
import { Menu, type MenuEntry } from "./ui/Menu";

import { ViewsConfigModal } from "./modals/ViewsConfigModal";
import { SaveViewModal } from "./modals/SaveViewModal";

/* --------------------------------- Helpers -------------------------------- */

function normalizeIdArray(v?: string[]): string[] {
  return Array.isArray(v) ? [...v].map(String).sort() : [];
}

function normalizeNumString(v?: string): string {
  if (!v) return "";
  const normalized = String(v).trim().replace(/\s+/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? String(n) : "";
}

/**
 * Canonical signature to detect "same filter as last applied".
 * - Arrays sorted
 * - Numbers normalized
 * - Settlement included
 */
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
    ledger_account_id: normalizeIdArray(filters.ledger_account_id),
  };

  return JSON.stringify(sig);
}

/* ---------------------------------- Types --------------------------------- */

type FilterBarApplyPayload = { filters: EntryFilters };

interface FilterBarProps {
  onApply: (payload: FilterBarApplyPayload) => void;
  initial?: EntryFilters;
  bankActive?: boolean;
  contextSettlement: boolean;
  shortcutsEnabled?: boolean;
}

/* -------------------------------- Component -------------------------------- */

const FilterBar: React.FC<FilterBarProps> = ({
  onApply,
  initial,
  bankActive,
  contextSettlement,
  shortcutsEnabled = true,
}) => {
  const { t } = useTranslation(["filterBar"]);
  const isMobile = useMediaQuery("(max-width: 639px)"); // Tailwind <sm

  const bankOptions = useBankOptions(bankActive);
  const allLedgerAccounts = useLedgerAccounts();
  const { views: savedViews, loaded: viewsLoaded, refresh: refreshViews } = useSavedViews();

  const scopedViews = useMemo(
    () => savedViews.filter((v) => v.settlement_status === contextSettlement),
    [savedViews, contextSettlement]
  );

  const [localFilters, setLocalFilters] = useState<LocalFilters>(() =>
    buildInitialLocalFilters(initial, contextSettlement)
  );

  // Registry (single source of truth)
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

  useOnClickOutside(addFilterMenuRef, () => setAddFilterMenuOpen(false), addFilterMenuOpen);
  useOnClickOutside(viewsMenuRef, () => setViewsMenuOpen(false), viewsMenuOpen);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  // Mobile-only collapsible panel
  const [panelOpen, setPanelOpen] = useState<boolean>(false);

  // Track last applied filters (prevents re-applying identical filters)
  const [lastAppliedSig, setLastAppliedSig] = useState<string | null>(null);

  useEffect(() => {
    if (!isMobile) {
      setPanelOpen(true);
      return;
    }
    setPanelOpen((prev) => (typeof prev === "boolean" ? prev : false));
  }, [isMobile]);

  const panelVisible = !isMobile || panelOpen;

  const closeEditorsAndMenus = useCallback(() => {
    setOpenEditor(null);
    setViewsMenuOpen(false);
    setAddFilterMenuOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    if (!isMobile) return;
    setPanelOpen((prev) => {
      const next = !prev;
      if (!next) closeEditorsAndMenus();
      return next;
    });
  }, [closeEditorsAndMenus, isMobile]);

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

  const selectedAccounts = useMemo(() => {
    const selected = new Set(localFilters.ledger_account_id.map(String));
    return allLedgerAccounts.filter((a) => selected.has(String(a.id)));
  }, [allLedgerAccounts, localFilters.ledger_account_id]);

  const ledgerAccountsForPicker = useMemo(() => {
    const selectedIds = new Set(localFilters.ledger_account_id.map(String));
    const selected = allLedgerAccounts.filter((a) => selectedIds.has(String(a.id)));

    const wanted = localFilters.tx_type;
    if (!wanted) return allLedgerAccounts;

    const filtered = allLedgerAccounts.filter((a) => String(a.default_tx || "").toLowerCase() === wanted);
    return [...selected, ...filtered.filter((a) => !selectedIds.has(String(a.id)))];
  }, [allLedgerAccounts, localFilters.ledger_account_id, localFilters.tx_type]);

  // "Anything selected to filter" (registry-active OR description)
  const hasActiveFilters = useMemo(() => {
    const anyRegistryActive = filterDefs.some((d) => d.isActive(localFilters));
    return anyRegistryActive || !!localFilters.description;
  }, [filterDefs, localFilters]);

  const activeFiltersCount = useMemo(() => {
    const c = filterDefs.reduce((acc, d) => acc + (d.isActive(localFilters) ? 1 : 0), 0);
    return c + (localFilters.description ? 1 : 0);
  }, [filterDefs, localFilters]);

  // Current canonical signature
  const currentSig = useMemo(() => filtersSignature(toEntryFilters(localFilters)), [localFilters]);

  /**
   * Apply rules:
   * - Before first apply (lastAppliedSig === null): only apply if something is selected (hasActiveFilters).
   * - After that: only apply if filters changed (signature differs).
   */
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
    if (applied) setOpenEditor(null);
  }, [tryApplyCurrentFilters]);

  const clearAll = useCallback(() => {
    const cleared = buildClearedLocalFilters(contextSettlement);
    const next = toEntryFilters(cleared);
    const nextSig = filtersSignature(next);

    setLocalFilters(cleared);
    closeEditorsAndMenus();

    // If already applied, do nothing.
    if (nextSig === lastAppliedSig) return;

    onApply({ filters: next });
    setLastAppliedSig(nextSig);
  }, [closeEditorsAndMenus, contextSettlement, lastAppliedSig, onApply]);

  /* Hotkeys */
  useEffect(() => {
    if (!shortcutsEnabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const cmdOrCtrl = e.metaKey || e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (panelVisible) searchInputRef.current?.focus();
        return;
      }

      if (cmdOrCtrl && (e.key === "Enter" || e.code === "Enter")) {
        e.preventDefault();
        void tryApplyCurrentFilters();
        return;
      }

      if (e.key === "Escape" || e.code === "Escape") {
        if (saveModalOpen) setSaveModalOpen(false);
        if (configModalOpen) setConfigModalOpen(false);
        closeEditorsAndMenus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    shortcutsEnabled,
    panelVisible,
    tryApplyCurrentFilters,
    closeEditorsAndMenus,
    saveModalOpen,
    configModalOpen,
  ]);

  /* Apply default view once per mount */
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

  /* View actions (apply to form only) */
  const applyViewToForm = useCallback(
    (view: Visualization) => {
      const next = buildInitialLocalFilters(view.filters, contextSettlement);
      next.settlement_status = !!view.settlement_status;
      setLocalFilters(next);
    },
    [contextSettlement]
  );

  /* Build Add Filter menu items from registry */
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
        onAction: () => setOpenEditor(d.key),
      });
    }

    return out;
  }, [filterDefs, t]);

  const activeEditorDef = openEditor ? defsByKey.get(openEditor) ?? null : null;

  const toggleEditorFromChip = useCallback((key: ChipKey) => {
    setOpenEditor((curr) => (curr === key ? null : key));
  }, []);

  /* Render */
  return (
    <div className="w-full">
      {/* MOBILE ONLY: Toggle header */}
      {isMobile && (
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="outline"
            size="sm"
            className="font-semibold bg-white hover:bg-gray-50"
            onClick={togglePanel}
            aria-expanded={panelOpen}
            aria-label={t("filterBar:buttons.toggleFilters", { defaultValue: "Filters" })}
          >
            <span className="inline-flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span>{t("filterBar:buttons.toggleFilters", { defaultValue: "Filters" })}</span>

              {activeFiltersCount > 0 && (
                <span className="text-[11px] px-2 py-[1px] rounded-full border border-gray-200 bg-gray-50 text-gray-700">
                  {activeFiltersCount}
                </span>
              )}

              <span className="text-xs text-gray-500" aria-hidden>
                {panelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </span>
          </Button>

          {!panelOpen && (
            <div className="ml-auto">
              <button
                className={`text-xs font-semibold text-red-600 ${
                  hasActiveFilters ? "" : "opacity-40 cursor-not-allowed"
                }`}
                onClick={() => hasActiveFilters && clearAll()}
                type="button"
              >
                {t("filterBar:buttons.clear", { defaultValue: "Clear" })}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Panel: always visible on desktop; collapsible on mobile */}
      {panelVisible && (
        <>
          {/* Top row: chips/search + actions */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <ChipsSearchBar
              t={t}
              filterDefs={filterDefs}
              localFilters={localFilters}
              selectedBanks={selectedBanks}
              selectedAccounts={selectedAccounts}
              openEditor={openEditor}
              onToggleEditor={(key) => toggleEditorFromChip(key)}
              onRemoveChip={removeChip}
              searchInputRef={searchInputRef}
              onSearchEnter={() => void tryApplyCurrentFilters()}
              onSearchChange={(value) => setLocalFilters((prev) => ({ ...prev, description: value }))}
            />

            {/* Actions:
                - Mobile: Apply must be LEFT of Config
                - Desktop: Apply moved to row 2 (left of Add Filter)
             */}
            <div className="flex items-center gap-2 justify-end flex-wrap">
              {isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  className="font-semibold bg-white hover:bg-gray-50 flex-1"
                  onClick={() => void tryApplyCurrentFilters()}
                  disabled={!canApply}
                >
                  {t("filterBar:buttons.apply")}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                aria-label={t("filterBar:buttons.config")}
                onClick={() => setConfigModalOpen(true)}
                className="text-sm bg-white hover:bg-gray-50"
              >
                <Settings className="h-4 w-4" aria-hidden />
              </Button>

              <Button
                variant="outline"
                size="sm"
                aria-label={t("filterBar:buttons.saveView")}
                className="font-semibold bg-white hover:bg-gray-50"
                onClick={() => setSaveModalOpen(true)}
              >
                <span className="sm:hidden" aria-hidden>
                  <Save className="h-4 w-4" />
                </span>
                <span className="hidden sm:inline">{t("filterBar:buttons.saveView")}</span>
              </Button>

              <div className="relative" ref={viewsMenuRef}>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={t("filterBar:buttons.views")}
                  className={`font-semibold bg-white hover:bg-gray-50 ${
                    viewsMenuOpen ? "!bg-white !border-gray-400" : ""
                  }`}
                  onClick={() => setViewsMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={viewsMenuOpen}
                >
                  <span className="sm:hidden" aria-hidden>
                    <Eye className="h-4 w-4" />
                  </span>
                  <span className="hidden sm:inline">{t("filterBar:buttons.views")}</span>
                </Button>

                {viewsMenuOpen && (
                  <Menu
                    roleLabel={t("filterBar:viewsMenu.aria")}
                    align="right"
                    emptyLabel={t("filterBar:viewsMenu.empty")}
                    items={scopedViews.map((v) => ({
                      key: v.id,
                      label: (
                        <span className="flex items-center justify-between w-full">
                          <span className="truncate">{v.name}</span>
                          {v.is_default && <Star className="w-3 h-3 text-amber-500 shrink-0 ml-2" aria-hidden />}
                        </span>
                      ),
                      onAction: () => {
                        setViewsMenuOpen(false);
                        applyViewToForm(v);
                      },
                    }))}
                    onClose={() => setViewsMenuOpen(false)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Second row:
              - Desktop: Apply LEFT of Add Filter
              - Mobile: only Add Filter here
           */}
          <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative w-full sm:w-auto" ref={addFilterMenuRef}>
              <Button
                variant="outline"
                size="sm"
                className={`w-full sm:w-auto font-semibold bg-white hover:bg-gray-50 ${
                  addFilterMenuOpen ? "!bg-white !border-gray-400" : ""
                }`}
                onClick={() => setAddFilterMenuOpen((v) => !v)}
              >
                {t("filterBar:menu.addFilter")}
              </Button>

              {addFilterMenuOpen && (
                <Menu
                  roleLabel={t("filterBar:menu.aria")}
                  align="left"
                  items={addFilterItems}
                  onClose={() => setAddFilterMenuOpen(false)}
                  onAfterAction={() => setAddFilterMenuOpen(false)}
                />
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!isMobile && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto font-semibold bg-white hover:bg-gray-50"
                  onClick={() => void tryApplyCurrentFilters()}
                  disabled={!canApply}
                >
                  {t("filterBar:buttons.apply")}
                </Button>
              )}
            </div>

            <div className="flex">
              <button
                className={`text-xs font-semibold text-red-600 ${
                  hasActiveFilters ? "" : "opacity-40 cursor-not-allowed"
                }`}
                onClick={() => hasActiveFilters && clearAll()}
                type="button"
              >
                {t("filterBar:buttons.clear")}
              </button>
            </div>
          </div>

          {/* Editors */}
          <div className="relative">
            {activeEditorDef && (
              <Popover
                isMobile={isMobile}
                title={t(activeEditorDef.editorTitleKey)}
                onClose={() => setOpenEditor(null)}
                className={activeEditorDef.popoverClassName}
              >
                <activeEditorDef.Editor
                  t={t}
                  isMobile={isMobile}
                  localFilters={localFilters}
                  setLocalFilters={setLocalFilters}
                  bankOptions={bankOptions}
                  selectedBanks={selectedBanks}
                  ledgerAccountsForPicker={ledgerAccountsForPicker}
                  selectedAccounts={selectedAccounts}
                  onRemove={() => removeChip(activeEditorDef.key)}
                  onApply={closeEditorsAndApply}
                />
              </Popover>
            )}
          </div>

          {/* CONFIG MODAL */}
          <ViewsConfigModal
            t={t}
            open={configModalOpen}
            onClose={() => setConfigModalOpen(false)}
            scopedViews={scopedViews}
            onApplyViewToForm={applyViewToForm}
            onRefreshViews={refreshViews}
          />

          {/* SAVE MODAL */}
          <SaveViewModal
            t={t}
            open={saveModalOpen}
            onClose={() => setSaveModalOpen(false)}
            scopedViews={scopedViews}
            localFilters={localFilters}
            onRefreshViews={refreshViews}
          />
        </>
      )}
    </div>
  );
};

export default FilterBar;
