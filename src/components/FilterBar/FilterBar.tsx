// src/components/FilterBar/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import SelectDropdown from "@/components/ui/SelectDropdown/SelectDropdown";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import Input from "../ui/Input";
import { DateInput } from "../ui/DateInput";
import { AmountInput } from "../ui/AmountInput";

import { api } from "@/api/requests";
import { useBanks } from "@/hooks/useBanks";
import { fetchAllCursor } from "@/lib/list";
import { formatCurrency } from "@/lib/currency";
import { formatDateFromISO } from "@/lib/date";

import type { ApiResponse, ApiError as ApiErrorResponse } from "@/models/Api";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import type { BankAccount } from "@/models/settings/banking";
import type {
  ChipKey,
  EntryFilters,
  LocalFilters,
  Visualization,
} from "@/models/components/filterBar";

/* --------------------------------- Helpers -------------------------------- */

function isApiError<T>(res: ApiResponse<T>): res is ApiErrorResponse {
  return "error" in res;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function parseLooseNumber(value: string): number | null {
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function isPositiveMajor(value?: string): boolean {
  const n = parseLooseNumber(String(value ?? ""));
  return n !== null && n > 0;
}

function toISODateLocal(d: Date): string {
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfWeekISO(d = new Date()): string {
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const diff = (day + 6) % 7; // Monday as start
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  return toISODateLocal(start);
}

function startOfMonthISO(d = new Date()): string {
  return toISODateLocal(new Date(d.getFullYear(), d.getMonth(), 1));
}

function startOfQuarterISO(d = new Date()): string {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return toISODateLocal(new Date(d.getFullYear(), q, 1));
}

function startOfYearISO(d = new Date()): string {
  return toISODateLocal(new Date(d.getFullYear(), 0, 1));
}

function amountChipLabel(
  minMajor?: string,
  maxMajor?: string,
  t?: (k: string) => string
): string {
  const parts: string[] = [];
  if (minMajor && isPositiveMajor(minMajor)) parts.push(`≥ ${formatCurrency(minMajor)}`);
  if (maxMajor && isPositiveMajor(maxMajor)) parts.push(`≤ ${formatCurrency(maxMajor)}`);

  const prefix = t ? t("filterBar:chips.value") : "Value";
  return `${prefix} ${parts.join(" ")}`.trim();
}

function extractArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const maybe = data as { results?: unknown };
    if (Array.isArray(maybe.results)) return maybe.results as T[];
  }
  return [];
}

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

function useOnClickOutside(
  ref: React.RefObject<HTMLElement>,
  onOutside: () => void,
  enabled = true
) {
  const handlerRef = useLatestRef(onOutside);

  useEffect(() => {
    if (!enabled) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) handlerRef.current();
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [enabled, ref, handlerRef]);
}

const DefaultStarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className={className} fill="currentColor">
    <path d="M10 2.5l2.39 4.84 5.34.78-3.86 3.77.91 5.31L10 14.9l-4.78 2.51.91-5.31L2.27 8.12l5.34-.78L10 2.5z" />
  </svg>
);

function buildInitialLocalFilters(
  initial: EntryFilters | undefined,
  contextSettlement: boolean
): LocalFilters {
  return {
    start_date: initial?.start_date ?? "",
    end_date: initial?.end_date ?? "",
    description: initial?.description ?? "",
    observation: initial?.observation ?? "",
    ledger_account_id: normalizeStringArray(initial?.ledger_account_id),
    bank_id: normalizeStringArray(initial?.bank_id),
    tx_type: initial?.tx_type,
    amount_min: initial?.amount_min ? String(initial.amount_min) : "",
    amount_max: initial?.amount_max ? String(initial.amount_max) : "",
    settlement_status: initial?.settlement_status ?? contextSettlement,
  };
}

function toEntryFilters(local: LocalFilters): EntryFilters {
  const min = isPositiveMajor(local.amount_min) ? String(local.amount_min) : undefined;
  const max = isPositiveMajor(local.amount_max) ? String(local.amount_max) : undefined;

  return {
    start_date: local.start_date || undefined,
    end_date: local.end_date || undefined,
    description: local.description || undefined,
    observation: local.observation || undefined,
    ledger_account_id: local.ledger_account_id.length ? local.ledger_account_id : undefined,
    bank_id: local.bank_id.length ? local.bank_id : undefined,
    tx_type: local.tx_type,
    amount_min: min,
    amount_max: max,
    settlement_status: !!local.settlement_status,
  };
}

function useLedgerAccounts() {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const all = await fetchAllCursor<LedgerAccount>(api.getLedgerAccounts);
        if (!alive) return;
        setAccounts(all);
      } catch (err) {
        console.error("Failed to load GL Accounts", err);
        if (!alive) return;
        setAccounts([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return accounts;
}

function useSavedViews() {
  const [views, setViews] = useState<Visualization[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res: ApiResponse<unknown> = await api.getViewPresets();
      if (isApiError(res)) {
        console.error("Failed to load saved views", res.error);
        setViews([]);
        return;
      }
      setViews(extractArray<Visualization>(res.data));
    } catch (err) {
      console.error("Failed to load saved views", err);
      setViews([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { views, setViews, loaded, refresh };
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

  const { banks: rawBanks } = useBanks(undefined, 0, bankActive);
  const bankOptions = useMemo(() => (Array.isArray(rawBanks) ? rawBanks : []), [rawBanks]);

  const allLedgerAccounts = useLedgerAccounts();
  const { views: savedViews, setViews: setSavedViews, loaded: viewsLoaded, refresh: refreshViews } =
    useSavedViews();

  const scopedViews = useMemo(
    () => savedViews.filter((v) => v.settlement_status === contextSettlement),
    [savedViews, contextSettlement]
  );

  const [localFilters, setLocalFilters] = useState<LocalFilters>(() =>
    buildInitialLocalFilters(initial, contextSettlement)
  );

  const [openEditor, setOpenEditor] = useState<ChipKey | null>(null);
  const [addFilterMenuOpen, setAddFilterMenuOpen] = useState(false);
  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);

  const addFilterMenuRef = useRef<HTMLDivElement>(null);
  const viewsMenuRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(addFilterMenuRef, () => setAddFilterMenuOpen(false), addFilterMenuOpen);
  useOnClickOutside(viewsMenuRef, () => setViewsMenuOpen(false), viewsMenuOpen);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configBusy, setConfigBusy] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDefault, setSaveDefault] = useState(false);
  const [saveMode, setSaveMode] = useState<"create" | "overwrite">("create");
  const [overwriteView, setOverwriteView] = useState<Visualization | null>(null);

  const resetSaveModalState = useCallback(() => {
    setSaveName("");
    setSaveDefault(false);
    setSaveMode("create");
    setOverwriteView(null);
  }, []);

  const applyCurrentFilters = useCallback(() => {
    onApply({ filters: toEntryFilters(localFilters) });
  }, [localFilters, onApply]);

  const closeEditorsAndMenus = useCallback(() => {
    setOpenEditor(null);
    setViewsMenuOpen(false);
    setAddFilterMenuOpen(false);
  }, []);

  const closeEditorsAndApply = useCallback(() => {
    setOpenEditor(null);
    applyCurrentFilters();
  }, [applyCurrentFilters]);

  const removeChip = useCallback((key: ChipKey) => {
    setLocalFilters((prev) => {
      switch (key) {
        case "date":
          return { ...prev, start_date: "", end_date: "" };
        case "banks":
          return { ...prev, bank_id: [] };
        case "accounts":
          return { ...prev, ledger_account_id: [] };
        case "observation":
          return { ...prev, observation: "" };
        case "tx_type":
          return { ...prev, tx_type: undefined };
        case "amount":
          return { ...prev, amount_min: "", amount_max: "" };
        default:
          return prev;
      }
    });
  }, []);

  const clearAll = useCallback(() => {
    const cleared: LocalFilters = {
      start_date: "",
      end_date: "",
      description: "",
      observation: "",
      ledger_account_id: [],
      bank_id: [],
      tx_type: undefined,
      amount_min: "",
      amount_max: "",
      settlement_status: contextSettlement,
    };

    setLocalFilters(cleared);
    closeEditorsAndMenus();
    onApply({ filters: toEntryFilters(cleared) });
  }, [closeEditorsAndMenus, contextSettlement, onApply]);

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

    const filtered = allLedgerAccounts.filter(
      (a) => String(a.default_tx || "").toLowerCase() === wanted
    );

    const merged = [...selected, ...filtered.filter((a) => !selectedIds.has(String(a.id)))];
    return merged;
  }, [allLedgerAccounts, localFilters.ledger_account_id, localFilters.tx_type]);

  const hasAmountMin = isPositiveMajor(localFilters.amount_min);
  const hasAmountMax = isPositiveMajor(localFilters.amount_max);
  const hasAmountFilter = hasAmountMin || hasAmountMax;

  const hasActiveFilters =
    !!localFilters.start_date ||
    !!localFilters.end_date ||
    localFilters.bank_id.length > 0 ||
    localFilters.ledger_account_id.length > 0 ||
    !!localFilters.observation ||
    !!localFilters.description ||
    !!localFilters.tx_type ||
    hasAmountFilter;

  /* Hotkeys */
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
        applyCurrentFilters();
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
  }, [shortcutsEnabled, applyCurrentFilters, closeEditorsAndMenus, saveModalOpen, configModalOpen]);

  /* Apply default view once per mount */
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (bootstrappedRef.current) return;
    if (!viewsLoaded) return;

    const defaultView = scopedViews.find((v) => v.is_default);

    if (defaultView) {
      const nextLocal = buildInitialLocalFilters(defaultView.filters, contextSettlement);
      nextLocal.settlement_status = !!defaultView.settlement_status;

      setLocalFilters(nextLocal);
      onApply({ filters: toEntryFilters(nextLocal) });
    } else {
      onApply({ filters: toEntryFilters(localFilters) });
    }

    bootstrappedRef.current = true;
  }, [viewsLoaded, scopedViews, onApply, localFilters, contextSettlement]);

  /* View actions */
  const applyViewToForm = useCallback(
    (view: Visualization) => {
      const next = buildInitialLocalFilters(view.filters, contextSettlement);
      next.settlement_status = !!view.settlement_status;
      setLocalFilters(next);
    },
    [contextSettlement]
  );

  const toggleDefaultView = useCallback(
    async (view: Visualization) => {
      try {
        setConfigBusy(true);

        const r1: ApiResponse<unknown> = await api.editViewPreset(view.id, {
          is_default: !view.is_default,
        });
        if (isApiError(r1)) throw r1.error;

        if (!view.is_default) {
          const others = scopedViews.filter((o) => o.id !== view.id && o.is_default);
          if (others.length) {
            await Promise.all(
              others.map(async (o) => {
                const r: ApiResponse<unknown> = await api.editViewPreset(o.id, { is_default: false });
                if (isApiError(r)) throw r.error;
              })
            );
          }
        }

        await refreshViews();
      } catch (err) {
        console.error("Failed to toggle default view", err);
      } finally {
        setConfigBusy(false);
      }
    },
    [refreshViews, scopedViews]
  );

  const renameView = useCallback(async () => {
    const id = renamingId;
    const name = renamingName.trim();
    if (!id || !name) return;

    try {
      setConfigBusy(true);
      const r: ApiResponse<unknown> = await api.editViewPreset(id, { name });
      if (isApiError(r)) throw r.error;
      await refreshViews();
    } catch (err) {
      console.error("Failed to rename view", err);
    } finally {
      setConfigBusy(false);
      setRenamingId(null);
      setRenamingName("");
    }
  }, [refreshViews, renamingId, renamingName]);

  const deleteView = useCallback(
    async (id: string) => {
      try {
        setConfigBusy(true);
        const r: ApiResponse<unknown> = await api.deleteViewPreset(id);
        if (isApiError(r)) throw r.error;
        setSavedViews((prev) => prev.filter((x) => x.id !== id));
      } catch (err) {
        console.error("Failed to delete view", err);
      } finally {
        setConfigBusy(false);
      }
    },
    [setSavedViews]
  );

  const saveView = useCallback(async () => {
    const name = saveName.trim();
    if (!name) return;

    const payload = {
      name,
      is_default: saveDefault,
      settlement_status: !!localFilters.settlement_status,
      filters: toEntryFilters(localFilters),
    };

    try {
      setSaveBusy(true);

      if (saveMode === "overwrite" && overwriteView) {
        const r: ApiResponse<unknown> = await api.editViewPreset(overwriteView.id, payload);
        if (isApiError(r)) throw r.error;
      } else {
        const sameName = savedViews.find(
          (v) =>
            v.name.toLowerCase() === name.toLowerCase() &&
            v.settlement_status === !!localFilters.settlement_status
        );

        if (sameName) {
          const r: ApiResponse<unknown> = await api.editViewPreset(sameName.id, payload);
          if (isApiError(r)) throw r.error;
        } else {
          const r: ApiResponse<unknown> = await api.addViewPreset(payload);
          if (isApiError(r)) throw r.error;
        }
      }

      await refreshViews();
      setSaveModalOpen(false);
      resetSaveModalState();
    } catch (err) {
      console.error("Failed to save visualization", err);
    } finally {
      setSaveBusy(false);
    }
  }, [
    localFilters,
    overwriteView,
    refreshViews,
    resetSaveModalState,
    saveDefault,
    saveMode,
    saveName,
    savedViews,
  ]);

  /* Render */
  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 border border-gray-300 rounded-md px-2 h-8 whitespace-nowrap overflow-x-auto bg-white">
          {(localFilters.start_date || localFilters.end_date) && (
            <Chip
              icon="calendar"
              label={`${t("filterBar:chips.date")}  ${
                localFilters.start_date ? formatDateFromISO(localFilters.start_date) : "yyyy-mm-dd"
              } - ${
                localFilters.end_date ? formatDateFromISO(localFilters.end_date) : "yyyy-mm-dd"
              }`}
              onClick={() => setOpenEditor((curr) => (curr === "date" ? null : "date"))}
              onRemove={() => removeChip("date")}
            />
          )}

          {localFilters.bank_id.length > 0 && (
            <Chip
              icon="bank"
              label={`${t("filterBar:chips.bank")}  ${selectedBanks
                .slice(0, 2)
                .map((b) => b.institution)
                .join(", ")}${selectedBanks.length > 2 ? ` +${selectedBanks.length - 2}` : ""}`}
              onClick={() => setOpenEditor((curr) => (curr === "banks" ? null : "banks"))}
              onRemove={() => removeChip("banks")}
            />
          )}

          {localFilters.ledger_account_id.length > 0 && (
            <Chip
              icon="accounts"
              label={`${t("filterBar:chips.accounts")}  ${selectedAccounts
                .slice(0, 2)
                .map((a) => a.account)
                .join(", ")}${selectedAccounts.length > 2 ? ` +${selectedAccounts.length - 2}` : ""}`}
              onClick={() => setOpenEditor((curr) => (curr === "accounts" ? null : "accounts"))}
              onRemove={() => removeChip("accounts")}
            />
          )}

          {!!localFilters.tx_type && (
            <Chip
              icon="note"
              label={`${t("filterBar:chips.type")} ${
                localFilters.tx_type === "credit"
                  ? t("filterBar:chips.credit")
                  : t("filterBar:chips.debit")
              }`}
              onClick={() => setOpenEditor((curr) => (curr === "tx_type" ? null : "tx_type"))}
              onRemove={() => removeChip("tx_type")}
            />
          )}

          {hasAmountFilter && (
            <Chip
              icon="note"
              label={amountChipLabel(
                hasAmountMin ? localFilters.amount_min : undefined,
                hasAmountMax ? localFilters.amount_max : undefined,
                t
              )}
              onClick={() => setOpenEditor((curr) => (curr === "amount" ? null : "amount"))}
              onRemove={() => removeChip("amount")}
            />
          )}

          {!!localFilters.observation && (
            <Chip
              icon="note"
              label={`${t("filterBar:chips.observation")}  ${localFilters.observation}`}
              onClick={() =>
                setOpenEditor((curr) => (curr === "observation" ? null : "observation"))
              }
              onRemove={() => removeChip("observation")}
            />
          )}

          <input
            ref={searchInputRef}
            className="flex-[1_1_30%] min-w-[160px] h-6 bg-transparent outline-none text-xs placeholder-gray-400"
            placeholder={t("filterBar:search.placeholder")}
            value={localFilters.description || ""}
            onChange={(e) => setLocalFilters((prev) => ({ ...prev, description: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyCurrentFilters();
            }}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          aria-label={t("filterBar:buttons.config")}
          onClick={() => setConfigModalOpen(true)}
          className="text-sm bg-white hover:bg-gray-50"
        >
          ⚙️
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="font-semibold bg-white hover:bg-gray-50"
          onClick={() => {
            resetSaveModalState();
            setSaveModalOpen(true);
          }}
        >
          {t("filterBar:buttons.saveView")}
        </Button>

        <div className="relative" ref={viewsMenuRef}>
          <Button
            variant="outline"
            size="sm"
            className={`font-semibold bg-white hover:bg-gray-50 ${
              viewsMenuOpen ? "!bg-white !border-gray-400" : ""
            }`}
            onClick={() => setViewsMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={viewsMenuOpen}
          >
            {t("filterBar:buttons.views")}
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
                    {v.is_default && (
                      <DefaultStarIcon className="w-3 h-3 text-amber-500 shrink-0 ml-2" />
                    )}
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

      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <div className="relative" ref={addFilterMenuRef}>
          <Button
            variant="outline"
            size="sm"
            className={`font-semibold bg-white hover:bg-gray-50 ${
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
              items={[
                { key: "date", label: t("filterBar:menu.date"), onAction: () => setOpenEditor("date") },
                { key: "banks", label: t("filterBar:menu.bank"), onAction: () => setOpenEditor("banks") },
                { key: "accounts", label: t("filterBar:menu.accounts"), onAction: () => setOpenEditor("accounts") },
                { sep: true },
                {
                  key: "observation",
                  label: t("filterBar:menu.observation"),
                  onAction: () => setOpenEditor("observation"),
                },
                { key: "tx_type", label: t("filterBar:menu.txType"), onAction: () => setOpenEditor("tx_type") },
                { key: "amount", label: t("filterBar:menu.amount"), onAction: () => setOpenEditor("amount") },
              ]}
              onClose={() => setAddFilterMenuOpen(false)}
              onAfterAction={() => setAddFilterMenuOpen(false)}
            />
          )}
        </div>

        <div className="ml-auto sm:ml-0">
          <Button
            variant="outline"
            size="sm"
            className="font-semibold bg-white hover:bg-gray-50"
            onClick={applyCurrentFilters}
          >
            {t("filterBar:buttons.apply")}
          </Button>
        </div>

        <button
          className={`text-xs font-semibold text-red-600 ${
            hasActiveFilters ? "" : "opacity-40 cursor-not-allowed"
          }`}
          onClick={() => hasActiveFilters && clearAll()}
        >
          {t("filterBar:buttons.clear")}
        </button>
      </div>

      <div className="relative">
        {openEditor === "date" && (
          <Popover onClose={() => setOpenEditor(null)} className="min-w-[360px] max-w-[360px]">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-600 space-y-1 block">
                <span className="block">{t("filterBar:editors.date.start")}</span>
                <DateInput
                  value={localFilters.start_date || ""}
                  onChange={(iso) => setLocalFilters((prev) => ({ ...prev, start_date: iso }))}
                />
              </label>

              <label className="text-xs text-gray-600 space-y-1 block">
                <span className="block">{t("filterBar:editors.date.end")}</span>
                <DateInput
                  value={localFilters.end_date || ""}
                  onChange={(iso) => setLocalFilters((prev) => ({ ...prev, end_date: iso }))}
                />
              </label>
            </div>

            <div className="mt-2">
              <div className="text-[11px] text-gray-500 mb-1">
                {t("filterBar:editors.date.shortcuts")}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <QuickButton
                  onClick={() => {
                    const today = toISODateLocal(new Date());
                    setLocalFilters((prev) => ({ ...prev, start_date: today, end_date: today }));
                  }}
                >
                  {t("filterBar:editors.date.today")}
                </QuickButton>

                <QuickButton
                  onClick={() => {
                    const today = toISODateLocal(new Date());
                    setLocalFilters((prev) => ({
                      ...prev,
                      start_date: startOfWeekISO(),
                      end_date: today,
                    }));
                  }}
                >
                  {t("filterBar:editors.date.thisWeek")}
                </QuickButton>

                <QuickButton
                  onClick={() => {
                    const today = toISODateLocal(new Date());
                    setLocalFilters((prev) => ({
                      ...prev,
                      start_date: startOfMonthISO(),
                      end_date: today,
                    }));
                  }}
                >
                  {t("filterBar:editors.date.thisMonth")}
                </QuickButton>

                <QuickButton
                  onClick={() => {
                    const today = toISODateLocal(new Date());
                    setLocalFilters((prev) => ({
                      ...prev,
                      start_date: startOfQuarterISO(),
                      end_date: today,
                    }));
                  }}
                >
                  {t("filterBar:editors.date.thisQuarter")}
                </QuickButton>

                <QuickButton
                  onClick={() => {
                    const today = toISODateLocal(new Date());
                    setLocalFilters((prev) => ({
                      ...prev,
                      start_date: startOfYearISO(),
                      end_date: today,
                    }));
                  }}
                >
                  {t("filterBar:editors.date.thisYear")}
                </QuickButton>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50"
                onClick={() => removeChip("date")}
              >
                {t("filterBar:buttons.remove")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50"
                onClick={closeEditorsAndApply}
              >
                {t("filterBar:buttons.apply")}
              </Button>
            </div>
          </Popover>
        )}

        {openEditor === "banks" && (
          <Popover onClose={() => setOpenEditor(null)} className="min-w-[360px] max-w-[360px]">
            <SelectDropdown<BankAccount>
              label={t("filterBar:editors.banks.label")}
              items={bankOptions}
              selected={selectedBanks}
              onChange={(list) =>
                setLocalFilters((prev) => ({ ...prev, bank_id: list.map((x) => String(x.id)) }))
              }
              getItemKey={(item) => item.id}
              getItemLabel={(item) => item.institution}
              buttonLabel={t("filterBar:editors.banks.button")}
              customStyles={{ maxHeight: "240px" }}
            />

            <div className="flex justify-end gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="font-semibold bg-white hover:bg-gray-50"
                onClick={() => removeChip("banks")}
              >
                {t("filterBar:buttons.remove")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="font-semibold bg-white hover:bg-gray-50"
                onClick={closeEditorsAndApply}
              >
                {t("filterBar:buttons.apply")}
              </Button>
            </div>
          </Popover>
        )}

        {openEditor === "accounts" && (
          <Popover onClose={() => setOpenEditor(null)} className="min-w-[360px] max-w-[360px]">
            <SelectDropdown<LedgerAccount>
              label={t("filterBar:editors.accounts.label")}
              items={ledgerAccountsForPicker}
              selected={selectedAccounts}
              onChange={(list) =>
                setLocalFilters((prev) => ({ ...prev, ledger_account_id: list.map((x) => String(x.id)) }))
              }
              getItemKey={(item) => item.id}
              getItemLabel={(item) => (item.code ? `${item.code} — ${item.account}` : item.account)}
              buttonLabel={t("filterBar:editors.accounts.button")}
              customStyles={{ maxHeight: "240px" }}
              groupBy={(i) =>
                i.subcategory ? `${i.category} / ${i.subcategory}` : String(i.category || "")
              }
              virtualize
              virtualRowHeight={32}
              virtualThreshold={300}
            />

            <div className="flex justify-end gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="font-semibold bg-white hover:bg-gray-50"
                onClick={() => removeChip("accounts")}
              >
                {t("filterBar:buttons.remove")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="font-semibold bg-white hover:bg-gray-50"
                onClick={closeEditorsAndApply}
              >
                {t("filterBar:buttons.apply")}
              </Button>
            </div>
          </Popover>
        )}

        {openEditor === "observation" && (
          <Popover onClose={() => setOpenEditor(null)} className="min-w-[260px] max-w-[360px]">
            <Input
              type="text"
              placeholder={t("filterBar:editors.observation.placeholder")}
              value={localFilters.observation || ""}
              onChange={(e) => setLocalFilters((prev) => ({ ...prev, observation: e.target.value }))}
            />

            <div className="flex justify-end gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="font-semibold bg-white hover:bg-gray-50"
                onClick={() => removeChip("observation")}
              >
                {t("filterBar:buttons.remove")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="font-semibold bg-white hover:bg-gray-50"
                onClick={closeEditorsAndApply}
              >
                {t("filterBar:buttons.apply")}
              </Button>
            </div>
          </Popover>
        )}

        {openEditor === "tx_type" && (
          <Popover onClose={() => setOpenEditor(null)} className="min-w-[260px] max-w-[360px]">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50"
                onClick={() => setLocalFilters((prev) => ({ ...prev, tx_type: "credit" }))}
              >
                {t("filterBar:editors.txType.credit")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50"
                onClick={() => setLocalFilters((prev) => ({ ...prev, tx_type: "debit" }))}
              >
                {t("filterBar:editors.txType.debit")}
              </Button>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50"
                onClick={() => removeChip("tx_type")}
              >
                {t("filterBar:buttons.remove")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50"
                onClick={closeEditorsAndApply}
              >
                {t("filterBar:buttons.apply")}
              </Button>
            </div>
          </Popover>
        )}

        {openEditor === "amount" && (
          <Popover onClose={() => setOpenEditor(null)} className="min-w-[260px] max-w-[360px]">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-600 space-y-1 block">
                <span className="block">{t("filterBar:editors.amount.min")}</span>
                <AmountInput
                  display="currency"
                  value={localFilters.amount_min || ""}
                  onValueChange={(next) => setLocalFilters((prev) => ({ ...prev, amount_min: next }))}
                  zeroAsEmpty
                />
              </label>

              <label className="text-xs text-gray-600 space-y-1 block">
                <span className="block">{t("filterBar:editors.amount.max")}</span>
                <AmountInput
                  display="currency"
                  value={localFilters.amount_max || ""}
                  onValueChange={(next) => setLocalFilters((prev) => ({ ...prev, amount_max: next }))}
                  zeroAsEmpty
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50"
                onClick={() => removeChip("amount")}
              >
                {t("filterBar:buttons.remove")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50"
                onClick={closeEditorsAndApply}
              >
                {t("filterBar:buttons.apply")}
              </Button>
            </div>
          </Popover>
        )}
      </div>

      {/* CONFIG MODAL (views only) */}
      {configModalOpen && (
        <ModalShell
          busy={configBusy}
          title={t("filterBar:configModal.title")}
          onClose={() => setConfigModalOpen(false)}
        >
          <div className={configBusy ? "pointer-events-none opacity-60" : ""}>
            <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
              {scopedViews.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-500">
                  {t("filterBar:configModal.empty")}
                </div>
              )}

              {scopedViews.map((v) => {
                const isRenaming = renamingId === v.id;

                return (
                  <div key={v.id} className="px-3 py-2 flex items-center gap-3">
                    <label className="inline-flex items-center gap-2">
                      <Checkbox
                        checked={!!v.is_default}
                        size="small"
                        disabled={configBusy}
                        onChange={() => void toggleDefaultView(v)}
                      />

                      {isRenaming ? (
                        <input
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                          value={renamingName}
                          onChange={(e) => setRenamingName(e.target.value)}
                        />
                      ) : (
                        <span className="text-sm text-gray-800">{v.name}</span>
                      )}

                      {v.is_default && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                          <DefaultStarIcon className="w-3 h-3" />
                          <span>{t("filterBar:configModal.defaultTag")}</span>
                        </span>
                      )}
                    </label>

                    <div className="ml-auto flex items-center gap-2">
                      {isRenaming ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={configBusy}
                            className="bg-white hover:bg-gray-50"
                            onClick={() => void renameView()}
                          >
                            {t("filterBar:configModal.saveName")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={configBusy}
                            className="bg-white hover:bg-gray-50"
                            onClick={() => {
                              setRenamingId(null);
                              setRenamingName("");
                            }}
                          >
                            {t("filterBar:configModal.cancel")}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={configBusy}
                          className="bg-white hover:bg-gray-50"
                          onClick={() => {
                            setRenamingId(v.id);
                            setRenamingName(v.name);
                          }}
                        >
                          {t("filterBar:configModal.rename")}
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={configBusy}
                        className="bg-white hover:bg-gray-50"
                        onClick={() => applyViewToForm(v)}
                      >
                        {t("filterBar:configModal.apply")}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={configBusy}
                        className="!text-red-600 !border-red-200 hover:!bg-red-50"
                        onClick={() => void deleteView(v.id)}
                      >
                        {t("filterBar:configModal.delete")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end mt-3">
              <Button
                variant="outline"
                size="sm"
                disabled={configBusy}
                className="bg-white hover:bg-gray-50"
                onClick={() => setConfigModalOpen(false)}
              >
                {t("filterBar:configModal.footerClose")}
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* SAVE MODAL */}
      {saveModalOpen && (
        <ModalShell
          busy={saveBusy}
          title={t("filterBar:saveModal.title")}
          onClose={() => {
            setSaveModalOpen(false);
            resetSaveModalState();
          }}
          maxWidthClass="max-w-md"
        >
          <div className={saveBusy ? "pointer-events-none opacity-60" : ""}>
            <div className="space-y-4 text-xs text-gray-700">
              <p className="text-[12px] text-gray-600">{t("filterBar:saveModal.description")}</p>

              <label className="block space-y-1">
                <Input
                  label={t("filterBar:saveModal.name")}
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={t("filterBar:saveModal.namePlaceholder")}
                />
              </label>

              <label className="inline-flex items-center gap-2">
                <Checkbox
                  checked={saveDefault}
                  size="small"
                  onChange={(e) => setSaveDefault(e.target.checked)}
                />
                <span>{t("filterBar:saveModal.setDefault")}</span>
              </label>

              <div className="space-y-2">
                <div className="font-semibold text-[12px]">{t("filterBar:saveModal.modeTitle")}</div>

                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="save_mode"
                      checked={saveMode === "create"}
                      onChange={() => {
                        setSaveMode("create");
                        setOverwriteView(null);
                      }}
                    />
                    <span>{t("filterBar:saveModal.create")}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="save_mode"
                      checked={saveMode === "overwrite"}
                      onChange={() => setSaveMode("overwrite")}
                    />
                    <span>{t("filterBar:saveModal.overwrite")}</span>
                  </label>
                </div>

                {saveMode === "overwrite" && (
                  <div className="mt-2 space-y-1">
                    <SelectDropdown<Visualization>
                      label={t("filterBar:saveModal.chooseView")}
                      items={scopedViews}
                      selected={overwriteView ? [overwriteView] : []}
                      onChange={(list) => setOverwriteView(list[0] ?? null)}
                      getItemKey={(item) => item.id}
                      getItemLabel={(item) =>
                        item.is_default
                          ? `${item.name} (${t("filterBar:saveModal.defaultShort")})`
                          : item.name
                      }
                      buttonLabel={t("filterBar:saveModal.choosePlaceholder")}
                      singleSelect
                      hideCheckboxes
                      customStyles={{ maxHeight: "240px" }}
                    />
                    <p className="text-[11px] text-gray-500">
                      {t("filterBar:saveModal.overwriteHint")}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={saveBusy}
                  className="bg-white hover:bg-gray-50"
                  onClick={() => {
                    setSaveModalOpen(false);
                    resetSaveModalState();
                  }}
                >
                  {t("filterBar:saveModal.cancel")}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-gray-50"
                  disabled={
                    saveBusy ||
                    !saveName.trim() ||
                    (saveMode === "overwrite" && !overwriteView)
                  }
                  onClick={() => void saveView()}
                >
                  {t("filterBar:saveModal.save")}
                </Button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
};

/* ------------------------------ Subcomponents ------------------------------ */

const QuickButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  className = "",
  ...props
}) => (
  <button
    {...props}
    className={`text-[11px] border border-gray-300 rounded px-2 py-[3px] bg-white hover:bg-gray-50 ${className}`}
  />
);

const Chip: React.FC<{
  icon?: "calendar" | "bank" | "accounts" | "note";
  label: string;
  onClick(): void;
  onRemove(): void;
}> = ({ icon, label, onClick, onRemove }) => {
  const { t } = useTranslation(["filterBar"]);

  const iconNode = useMemo(() => {
    if (icon === "calendar") return <span className="text-[12px]" aria-hidden>📅</span>;
    if (icon === "bank") return <span className="text-[12px]" aria-hidden>🏦</span>;
    if (icon === "accounts") return <span className="text-[12px]" aria-hidden>🧾</span>;
    if (icon === "note") return <span className="text-[12px]" aria-hidden>📝</span>;
    return null;
  }, [icon]);

  return (
    <div
      className="shrink-0 inline-flex items-center gap-1 text-xs border border-gray-300 rounded-md px-2 h-6 bg-white cursor-pointer"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClick}
    >
      {iconNode}
      <span className="truncate max-w-[220px]">{label}</span>
      <button
        aria-label={t("filterBar:aria.removeFilter")}
        className="ml-1 rounded px-1 text-gray-500 hover:bg-gray-200"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        ×
      </button>
    </div>
  );
};

const Popover: React.FC<{
  children: React.ReactNode;
  onClose(): void;
  className?: string;
}> = ({ children, onClose, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, onClose, true);

  return (
    <div className="absolute z-[99999] mt-2">
      <div ref={ref} className={`rounded-md border border-gray-300 bg-white p-3 ${className || ""}`}>
        {children}
      </div>
    </div>
  );
};

/* ---------------------------------- Menu ---------------------------------- */

type MenuActionItem = { key: string; label: React.ReactNode; onAction?: () => void };
type MenuSeparator = { sep: true };
type MenuEntry = MenuActionItem | MenuSeparator;

function isActionItem(x: MenuEntry): x is MenuActionItem {
  return !("sep" in x);
}

const MenuItemBtn = React.forwardRef<
  HTMLButtonElement,
  { label: React.ReactNode; onClick(): void; active?: boolean; danger?: boolean }
>(({ label, onClick, active, danger }, ref) => (
  <button
    ref={ref}
    className={`w-full text-left px-3 py-2 rounded-md text-sm
      ${
        danger
          ? "text-red-600 hover:bg-rose-50 focus-visible:ring-rose-200"
          : "text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-300"
      }
      focus:outline-none focus-visible:ring-2 ${active ? "bg-gray-50" : ""}`}
    onClick={onClick}
  >
    {label}
  </button>
));
MenuItemBtn.displayName = "MenuItemBtn";

const Menu: React.FC<{
  roleLabel: string;
  items: MenuEntry[];
  onClose: () => void;
  onAfterAction?: () => void;
  emptyLabel?: string;
  align?: "left" | "right";
}> = ({ roleLabel, items, onClose, onAfterAction, emptyLabel, align = "left" }) => {
  const aligned = align === "right" ? "right-0" : "left-0";
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const actionableIndexes = useMemo(
    () => items.map((it, i) => (isActionItem(it) ? i : -1)).filter((i) => i >= 0),
    [items]
  );

  const [activeIndex, setActiveIndex] = useState<number>(() => actionableIndexes[0] ?? 0);

  useEffect(() => {
    refs.current[activeIndex]?.focus();
  }, [activeIndex]);

  const focusNext = useCallback(
    (dir: 1 | -1) => {
      if (!actionableIndexes.length) return;
      const curr = actionableIndexes.indexOf(activeIndex);
      const base = curr === -1 ? (dir === 1 ? -1 : 1) : curr;
      const next =
        actionableIndexes[(base + dir + actionableIndexes.length) % actionableIndexes.length];
      setActiveIndex(next);
    },
    [actionableIndexes, activeIndex]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusNext(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      focusNext(-1);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const item = items[activeIndex];
      if (item && isActionItem(item)) {
        onClose();
        item.onAction?.();
        onAfterAction?.();
      }
    }
  };

  return (
    <div
      role="menu"
      aria-label={roleLabel}
      onKeyDown={onKeyDown}
      className={`absolute ${aligned} top-full z-[60] w-72 rounded-md border border-gray-300 bg-white p-2 shadow-lg`}
    >
      {items.length === 0 && emptyLabel ? (
        <div className="text-xs text-gray-500 px-2 py-1">{emptyLabel}</div>
      ) : (
        items.map((it, i) =>
          "sep" in it ? (
            <div key={`sep-${i}`} className="my-1 h-px bg-gray-200" />
          ) : (
            <MenuItemBtn
              key={it.key}
              label={it.label}
              active={activeIndex === i}
              onClick={() => {
                onClose();
                it.onAction?.();
                onAfterAction?.();
              }}
              ref={(el) => {
                refs.current[i] = el;
              }}
            />
          )
        )
      )}
    </div>
  );
};

/* ---------------------------------- Modal --------------------------------- */

const BusyOverlay: React.FC<{ label: string }> = ({ label }) => (
  <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
    <div className="flex items-center gap-2 text-xs text-gray-600">
      <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
      <span>{label}</span>
    </div>
  </div>
);

const ModalShell: React.FC<{
  title: string;
  busy: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
}> = ({ title, busy, onClose, children, maxWidthClass = "max-w-3xl" }) => {
  const { t } = useTranslation(["filterBar"]);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
      <div
        className={`bg-white border border-gray-200 rounded-lg p-5 w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto relative`}
      >
        {busy && <BusyOverlay label={t("filterBar:configModal.loading")} />}

        <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
          <h3 className="text-[14px] font-semibold text-gray-800">{title}</h3>
          <button
            className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
            onClick={() => !busy && onClose()}
            aria-label="Close"
          >
            &times;
          </button>
        </header>

        {children}
      </div>
    </div>
  );
};

export default FilterBar;
