import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SlidersHorizontal,
  ChevronDown,
  Settings2,
  Save,
  Eye,
  Star,
} from "lucide-react";

import Button from "@/shared/ui/Button";

import type { EntryFilters, ChipKey, Visualization, LocalFilters } from "@/models/components/filterBar";

import { useMediaQuery } from "@/components/FilterBar/hooks/useMediaQuery";
import { Chip } from "./ui/Chip";
import { useBankOptions } from "@/components/FilterBar/hooks/useBankOptions";
import { useCashflowCategories } from "src/components/FilterBar/hooks/useCategories";
import { useSavedViews } from "@/components/FilterBar/hooks/useSavedViews";
import { PermissionMiddleware } from "src/middlewares";

import { buildClearedLocalFilters, buildInitialLocalFilters, toEntryFilters } from "@/components/FilterBar/FilterBar.utils";
import type { FilterDefinition } from "@/components/FilterBar/FilterBar.types";

import { getFilterDefinitions } from "@/components/FilterBar/filters/registry";
import { ChipsSearchBar } from "@/components/FilterBar/sections/ChipsSearchBar";
import { Popover } from "@/components/FilterBar/ui/Popover";
import { Menu, type MenuEntry } from "@/components/FilterBar/ui/Menu";

import { ViewsConfigModal } from "@/components/FilterBar/modals/ViewsConfigModal";
import { SaveViewModal } from "@/components/FilterBar/modals/SaveViewModal";

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

type FilterBarApplyPayload = { filters: EntryFilters };

interface FilterBarProps {
  onApply: (payload: FilterBarApplyPayload) => void;
  initial?: EntryFilters;
  bankActive?: boolean;
  contextSettlement: boolean;
  shortcutsEnabled?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({
  onApply,
  initial,
  bankActive,
  contextSettlement,
  shortcutsEnabled = true,
}) => {
  const { t } = useTranslation(["filterBar"]);
  const isMobile = useMediaQuery("(max-width: 639px)");

  const bankOptions = useBankOptions(bankActive);
  const allCategories = useCashflowCategories();
  const { views: savedViews, loaded: viewsLoaded, refresh: refreshViews } = useSavedViews(contextSettlement);

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
    shortcutsEnabled &&
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
    if (!shortcutsEnabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
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
  }, [shortcutsEnabled, tryApplyCurrentFilters]);

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

  return (
    <div className="relative min-w-0 border-y border-gray-200 bg-white px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <ChipsSearchBar t={t} localFilters={localFilters} searchInputRef={searchInputRef}
          onSearchEnter={() => void tryApplyCurrentFilters()}
          onSearchChange={value => setLocalFilters(prev => ({ ...prev, description: value }))} />
        <div className="relative" ref={addFilterMenuRef}>
          <Button variant="outline" size="sm" className="gap-1.5 bg-white" aria-haspopup="menu" aria-expanded={addFilterMenuOpen}
            onClick={() => { setOpenEditor(null); setViewsMenuOpen(false); setAddFilterMenuOpen(value => !value); }}>
            <SlidersHorizontal size={13} aria-hidden />{t("filterBar:buttons.toggleFilters")}
            {activeFiltersCount > 0 && <span className="rounded bg-gray-100 px-1.5 text-[10px] text-gray-600">{activeFiltersCount}</span>}
          </Button>
          {addFilterMenuOpen && <Menu anchorRef={addFilterMenuRef} roleLabel={t("filterBar:menu.aria")} items={addFilterItems}
            onClose={() => setAddFilterMenuOpen(false)} onAfterAction={() => setAddFilterMenuOpen(false)} />}
        </div>
        <Button variant="outlineBlack" size="sm" disabled={!canApply} onClick={() => void tryApplyCurrentFilters()}>{t("filterBar:buttons.apply")}</Button>
        <div className="ml-auto flex items-center gap-1">
          <PermissionMiddleware codeName={configPermission}>
            <div className="relative" ref={viewsMenuRef}>
              <Button variant="ghost" size="sm" className="gap-1.5" aria-label={t("filterBar:buttons.views")} aria-haspopup="menu" aria-expanded={viewsMenuOpen}
                onClick={() => { setOpenEditor(null); setAddFilterMenuOpen(false); setViewsMenuOpen(value => !value); }}>
                <Eye size={14} aria-hidden /><span className="hidden sm:inline">{t("filterBar:buttons.views")}</span><ChevronDown size={12} className="hidden sm:block" aria-hidden />
              </Button>
              {viewsMenuOpen && <Menu anchorRef={viewsMenuRef} roleLabel={t("filterBar:viewsMenu.aria")} align="right"
                emptyLabel={t("filterBar:viewsMenu.empty")} onClose={() => setViewsMenuOpen(false)}
                items={scopedViews.map(view => ({ key: view.id, label: <span className="flex w-full items-center justify-between gap-2"><span className="truncate">{view.name}</span>{view.is_default && <Star size={12} className="shrink-0 text-amber-500" aria-hidden />}</span>, onAction: () => applyViewToForm(view) }))} />}
            </div>
          </PermissionMiddleware>
          <PermissionMiddleware codeName="add_entry_view">
            <Button variant="ghost" size="iconSm" aria-label={t("filterBar:buttons.saveView")} title={t("filterBar:buttons.saveView")} onClick={() => setSaveModalOpen(true)}><Save size={14} aria-hidden /></Button>
          </PermissionMiddleware>
          <PermissionMiddleware codeName={configPermission}>
            <Button variant="ghost" size="iconSm" aria-label={t("filterBar:buttons.config")} title={t("filterBar:buttons.config")} onClick={() => setConfigModalOpen(true)}><Settings2 size={14} aria-hidden /></Button>
          </PermissionMiddleware>
        </div>
      </div>
      {(hasActiveFilters || canApply) && <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {filterDefs.filter(def => def.isActive(localFilters)).map(def => <Chip key={def.key} t={t} icon={def.icon}
          label={def.getChipLabel({ t, filters: localFilters, selectedBanks, selectedCategories })}
          onClick={event => { editorAnchorRef.current = event.currentTarget; setOpenEditor(current => current === def.key ? null : def.key); setAddFilterMenuOpen(false); setViewsMenuOpen(false); }}
          onRemove={() => removeChip(def.key)} />)}
        {hasActiveFilters && <button type="button" onClick={clearAll} className="rounded px-1.5 py-1 text-[11px] text-gray-500 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-[var(--accentPrimary)]">{t("filterBar:buttons.clear")}</button>}
        {canApply && <span role="status" className="ml-auto text-[11px] text-amber-700">{t("filterBar:pendingChanges")}</span>}
      </div>}
      {activeEditorDef && <Popover key={activeEditorDef.key} anchorRef={editorAnchorRef} isMobile={isMobile}
        title={t(activeEditorDef.editorTitleKey)} onClose={() => setOpenEditor(null)} className={activeEditorDef.popoverClassName}>
        <activeEditorDef.Editor t={t} isMobile={isMobile} localFilters={localFilters} setLocalFilters={setLocalFilters}
          bankOptions={bankOptions} selectedBanks={selectedBanks} categoriesForPicker={categoriesForPicker}
          selectedCategories={selectedCategories} onRemove={() => { removeChip(activeEditorDef.key); setOpenEditor(null); }} onApply={closeEditorsAndApply} />
      </Popover>}
          <ViewsConfigModal
            t={t}
            open={configModalOpen}
            onClose={() => setConfigModalOpen(false)}
            scopedViews={scopedViews}
            onApplyViewToForm={applyViewToForm}
            onRefreshViews={refreshViews}
          />

          <SaveViewModal
            t={t}
            open={saveModalOpen}
            onClose={() => setSaveModalOpen(false)}
            scopedViews={scopedViews}
            localFilters={localFilters}
            onRefreshViews={refreshViews}
          />
    </div>
  );
};

export default FilterBar;