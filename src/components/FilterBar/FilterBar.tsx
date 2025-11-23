/* -----------------------------------------------------------------------------
 * File: src/components/Filter/FilterBar.tsx
 * Style: Minimalist / compact. No shadows (except menus/popovers).
 * UX: Keyboard shortcuts + quick date-range helpers
 *   - Ctrl/⌘+Enter → Apply
 *   - Ctrl/⌘+K → focus search
 *   - Quick ranges in date popover: Hoje / Semana / Mês / Trimestre / Ano
 * -------------------------------------------------------------------------- */

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import type { BankAccount } from "@/models/enterprise_structure/domain/Bank";
import type { GLAccount } from "src/models/enterprise_structure/domain/GLAccount";
import SelectDropdown from "src/components/ui/SelectDropdown/SelectDropdown";
import { useBanks } from "@/hooks/useBanks";
import type { EntryFilters } from "src/models/entries/domain";
import {
  ChipKey,
  LocalFilters,
  Visualization,
} from "src/models/entries/domain";
import { api } from "src/api/requests";
import Button from "src/components/ui/Button";
import Checkbox from "src/components/ui/Checkbox";
import { formatCurrency } from "src/lib/currency";
import { handleUtilitaryAmountKeyDown } from "src/lib/form/amountKeyHandlers";
import { formatDateFromISO } from "@/lib/date";
import Input from "../ui/Input";
import { DateInput } from "../ui/DateInput";

/* ------------------------------ Utils ------------------------------ */
function useOutside(ref: React.RefObject<HTMLElement>, onOutside: () => void) {
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onOutside]);
}

/** GLAccount pode vir como { id } (string ULID) ou { external_id } */
type GLAccountLike = GLAccount & { id?: string; external_id?: string };
function getGlaId(a: GLAccountLike): string {
  return String(a.id ?? a.external_id ?? "");
}

/* ---- Date helpers (for quick ranges) ---- */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function startOfWeekISO(d = new Date()) {
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const diff = (day + 6) % 7; // start Monday
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  return start.toISOString().slice(0, 10);
}
function startOfMonthISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function startOfQuarterISO(d = new Date()) {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1).toISOString().slice(0, 10);
}
function startOfYearISO(d = new Date()) {
  return new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10);
}

/* ---- Chip amount helper ---- */
function amountChipLabel(
  minDigits?: string,
  maxDigits?: string,
  t?: (k: string) => string
) {
  const parts: string[] = [];
  if (minDigits) parts.push(`≥ ${formatCurrency(minDigits)}`);
  if (maxDigits) parts.push(`≤ ${formatCurrency(maxDigits)}`);
  const prefix = t ? t("filterBar:chips.value") : "Value";
  return `${prefix} ${parts.join(" ")}`.trim();
}
const centsDigitsToInt = (s: string | undefined) =>
  Number(String(s ?? "").replace(/\D/g, "")) || 0;

interface FilterBarProps {
  onApply: (payload: { filters: EntryFilters }) => void;
  initial?: EntryFilters;
  bankActive?: boolean;
  contextSettlement: false | true;
}

/* Small default icon (SVG star, no plain "⭐" char) */
const DefaultStarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 20 20"
    aria-hidden="true"
    className={className}
    fill="currentColor"
  >
    <path d="M10 2.5l2.39 4.84 5.34.78-3.86 3.77.91 5.31L10 14.9l-4.78 2.51.91-5.31L2.27 8.12l5.34-.78L10 2.5z" />
  </svg>
);

/* -------------------------------- Component -------------------------------- */
const FilterBar: React.FC<FilterBarProps> = ({
  onApply,
  initial,
  bankActive,
  contextSettlement,
}) => {
  const { t } = useTranslation(["filterBar"]);

  const { banks: rawBanks } = useBanks(undefined, 0, bankActive);
  const banks = useMemo(
    () => (Array.isArray(rawBanks) ? rawBanks : []),
    [rawBanks]
  );

  const [ledgerAccounts, setLedgerAccounts] = useState<GLAccountLike[]>([]);

  const [filters, setFilters] = useState<LocalFilters>(() => ({
    start_date: initial?.start_date || "",
    end_date: initial?.end_date || "",
    description: initial?.description || "",
    observation: initial?.observation || "",
    gla_id: Array.isArray(initial?.gla_id)
      ? (initial!.gla_id as unknown[]).map(String)
      : [],
    bank_id: Array.isArray(initial?.bank_id)
      ? (initial!.bank_id as unknown[]).map(String)
      : [],
    tx_type: undefined,
    amount_min: "",
    amount_max: "",
    settlement_status: initial?.settlement_status ?? contextSettlement,
  }));

  /* Saved visualizations */
  const [views, setViews] = useState<Visualization[]>([]);
  const scopedViews = useMemo(
    () => views.filter((v) => v.settlement_status === contextSettlement),
    [views, contextSettlement]
  );

  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);
  const [viewsLoaded, setViewsLoaded] = useState(false);

  /* “Salvar visualização” — modal */
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDefault, setSaveDefault] = useState(false);
  const [saveMode, setSaveMode] = useState<"create" | "overwrite">("create");
  const [overwriteId, setOverwriteId] = useState<string | null>(null);
  const [overwriteView, setOverwriteView] = useState<Visualization | null>(
    null
  );
  const [saveBusy, setSaveBusy] = useState(false);

  /* Config modal (somente “Visualizações salvas”) */
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configBusy, setConfigBusy] = useState(false);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");

  /* Menus/Popovers */
  const [menuOpen, setMenuOpen] = useState(false);
  const [openEditor, setOpenEditor] = useState<ChipKey | null>(null);

  const toggleEditor = useCallback((k: ChipKey) => {
    setOpenEditor((curr) => (curr === k ? null : k));
  }, []);

  const menuRef = useRef<HTMLDivElement>(null);
  useOutside(menuRef, () => setMenuOpen(false));

  const viewsMenuRef = useRef<HTMLDivElement>(null);
  useOutside(viewsMenuRef, () => setViewsMenuOpen(false));

  /* ---- Keyboard shortcuts ---- */
  const applyFilters = useCallback(() => {
    onApply({ filters: toEntryFilters(filters) });
  }, [onApply, filters]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const cmdOrCtrl = e.metaKey || e.ctrlKey;

      if (cmdOrCtrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (cmdOrCtrl && (e.key === "Enter" || e.code === "Enter")) {
        e.preventDefault();
        applyFilters();
        return;
      }

      if (e.key === "Escape" || e.code === "Escape") {
        if (saveModalOpen) setSaveModalOpen(false);
        if (configModalOpen) setConfigModalOpen(false);

        setOpenEditor(null);
        setViewsMenuOpen(false);
        setMenuOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyFilters, saveModalOpen, configModalOpen]);

  /* Load GL Accounts (cursor API) */
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const all: GLAccountLike[] = [];
        let cursor: string | undefined;
        do {
          const { data } = await api.getLedgerAccounts({ page_size: 200, cursor });
          const page = (data?.results ?? []) as GLAccountLike[];
          all.push(...page);
          cursor = (data?.next ?? undefined) || undefined;
        } while (cursor);
        setLedgerAccounts(all);
      } catch (err) {
        console.error("Failed to load GL Accounts", err);
        setLedgerAccounts([]);
      }
    };
    fetchAll();
  }, []);

  /* Saved views (read org id from store inside requests) */
  const refreshViews = async () => {
    try {
      const { data } = await api.getEntryViews();
      const list = Array.isArray(data)
        ? data
        : (data as unknown as { results?: Visualization[] })?.results ?? [];
      setViews(list as Visualization[]);
    } catch (err) {
      console.error("Failed to load saved views", err);
    } finally {
      setViewsLoaded(true);
    }
  };

  useEffect(() => {
    void refreshViews();
  }, []);

  const didInitialApply = useRef(false);
  useEffect(() => {
    if (didInitialApply.current || !viewsLoaded) return;

    const def = scopedViews.find((v) => v.is_default);
    if (def) {
      const nextLocal: LocalFilters = {
        ...(def.filters as LocalFilters),
        settlement_status: !!def.settlement_status,
      };
      setFilters((prev) => ({ ...prev, ...nextLocal })); // reflect in chips
      onApply({ filters: toEntryFilters(nextLocal) }); // initial request WITH filters
    } else {
      onApply({ filters: toEntryFilters(filters) }); // initial request WITHOUT filters
    }

    didInitialApply.current = true;
  }, [viewsLoaded, scopedViews, filters, onApply]);

  /* Apply default view automatically ONCE (when available for this context) */
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (bootstrappedRef.current) return;

    const def = scopedViews.find((v) => v.is_default);
    if (!def) return;

    const nextLocal = {
      ...(def.filters as LocalFilters),
      settlement_status: !!def.settlement_status,
    };
    setFilters((prev) => ({ ...prev, ...nextLocal }));
    onApply({ filters: toEntryFilters(nextLocal) });

    bootstrappedRef.current = true;
  }, [scopedViews, contextSettlement, onApply]);

  const selectedBanks = useMemo(() => {
    const sel = new Set((filters.bank_id ?? []).map(String));
    return banks.filter((b) => sel.has(String(b.id)));
  }, [banks, filters.bank_id]);

  const selectedAccounts = useMemo(
    () => (ledgerAccounts ?? []).filter((a) => (filters.gla_id ?? []).includes(getGlaId(a))),
    [ledgerAccounts, filters.gla_id]
  );

  function toEntryFilters(f: LocalFilters): EntryFilters {
    const minCents = centsDigitsToInt(f.amount_min);
    const maxCents = centsDigitsToInt(f.amount_max);

    return {
      start_date: f.start_date,
      end_date: f.end_date,
      description: f.description,
      observation: f.observation,
      gla_id: f.gla_id,
      bank_id: f.bank_id,
      tx_type: f.tx_type,
      amount_min: minCents > 0 ? minCents : undefined,
      amount_max: maxCents > 0 ? maxCents : undefined,
      settlement_status: f.settlement_status as false | true,
    } as EntryFilters;
  }

  function clearAll() {
    const cleared: LocalFilters = {
      start_date: "",
      end_date: "",
      description: "",
      observation: "",
      gla_id: [],
      bank_id: [],
      tx_type: undefined,
      amount_min: "",
      amount_max: "",
      settlement_status: contextSettlement,
    };

    setFilters(cleared);
    setOpenEditor(null);
    setMenuOpen(false);
    setViewsMenuOpen(false);
    onApply({ filters: toEntryFilters(cleared) });
  }

  function removeChip(k: ChipKey) {
    if (k === "date") setFilters((f) => ({ ...f, start_date: "", end_date: "" }));
    if (k === "banks") setFilters((f) => ({ ...f, bank_id: [] }));
    if (k === "accounts") setFilters((f) => ({ ...f, gla_id: [] }));
    if (k === "observation") setFilters((f) => ({ ...f, observation: "" }));
    if (k === "tx_type") setFilters((f) => ({ ...f, tx_type: undefined }));
    if (k === "amount") setFilters((f) => ({ ...f, amount_min: "", amount_max: "" }));
  }

  const hasAmountMin = centsDigitsToInt(filters.amount_min) > 0;
  const hasAmountMax = centsDigitsToInt(filters.amount_max) > 0;
  const hasAmountFilter = hasAmountMin || hasAmountMax;

  const hasActive =
    !!filters.start_date ||
    !!filters.end_date ||
    (filters.bank_id?.length ?? 0) > 0 ||
    (filters.gla_id?.length ?? 0) > 0 ||
    !!filters.observation ||
    !!filters.description ||
    !!filters.tx_type ||
    hasAmountFilter;

  /* ---------------------------------- Render -------------------------------- */
  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        {/* Search + chips */}
        <div className="flex-1 flex items-center gap-2 border border-gray-300 rounded-md px-2 h-8 whitespace-nowrap overflow-x-auto bg-white">
          {(filters.start_date || filters.end_date) && (
            <Chip
              icon="calendar"
              label={`${t("filterBar:chips.date")}  ${
                filters.start_date ? formatDateFromISO(filters.start_date) : "yyyy-mm-dd"
              } - ${
                filters.end_date ? formatDateFromISO(filters.end_date) : "yyyy-mm-dd"
              }`}
              onClick={() => toggleEditor("date")}
              onRemove={() => removeChip("date")}
            />
          )}
          {(filters.bank_id?.length ?? 0) > 0 && (
            <Chip
              icon="bank"
              label={`${t("filterBar:chips.bank")}  ${selectedBanks
                .slice(0, 2)
                .map((b) => b.institution)
                .join(", ")}${
                selectedBanks.length > 2 ? ` +${selectedBanks.length - 2}` : ""
              }`}
              onClick={() => toggleEditor("banks")}
              onRemove={() => removeChip("banks")}
            />
          )}
          {(filters.gla_id?.length ?? 0) > 0 && (
            <Chip
              icon="accounts"
              label={`${t("filterBar:chips.accounts")}  ${selectedAccounts
                .slice(0, 2)
                .map((a) => a.account)
                .join(", ")}${
                selectedAccounts.length > 2
                  ? ` +${selectedAccounts.length - 2}`
                  : ""
              }`}
              onClick={() => toggleEditor("accounts")}
              onRemove={() => removeChip("accounts")}
            />
          )}
          {!!filters.tx_type && (
            <Chip
              icon="note"
              label={`${t("filterBar:chips.type")} ${
                filters.tx_type === "credit"
                  ? t("filterBar:chips.credit")
                  : t("filterBar:chips.debit")
              }`}
              onClick={() => toggleEditor("tx_type")}
              onRemove={() => removeChip("tx_type")}
            />
          )}
          {hasAmountFilter && (
            <Chip
              icon="note"
              label={amountChipLabel(
                hasAmountMin ? filters.amount_min : undefined,
                hasAmountMax ? filters.amount_max : undefined,
                t
              )}
              onClick={() => toggleEditor("amount")}
              onRemove={() => removeChip("amount")}
            />
          )}
          {!!filters.observation && (
            <Chip
              icon="note"
              label={`${t("filterBar:chips.observation")}  ${
                filters.observation
              }`}
              onClick={() => toggleEditor("observation")}
              onRemove={() => removeChip("observation")}
            />
          )}

          <input
            ref={searchInputRef}
            className="flex-[1_1_30%] min-w-[160px] h-6 bg-transparent outline-none text-xs placeholder-gray-400"
            placeholder={t("filterBar:search.placeholder")}
            value={filters.description || ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, description: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
          />
        </div>

        {/* Config — MODAL (apenas 'Visualizações salvas') */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            aria-label={t("filterBar:buttons.config")}
            onClick={() => setConfigModalOpen(true)}
            className="text-sm bg-white hover:bg-gray-50"
          >
            ⚙️
          </Button>
        </div>

        {/* Save visualization — MODAL */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="font-semibold bg-white hover:bg-gray-50"
            onClick={() => {
              setSaveName("");
              setSaveDefault(false);
              setSaveMode("create");
              setOverwriteId(null);
              setOverwriteView(null);
              setSaveModalOpen(true);
            }}
          >
            {t("filterBar:buttons.saveView")}
          </Button>
        </div>

        {/* Load visualization (menu rápido) */}
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
              items={
                (scopedViews.length
                  ? scopedViews.map<MenuEntry>((v) => ({
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
                        const next = {
                          ...(v.filters as LocalFilters),
                          settlement_status: !!v.settlement_status,
                        };
                        setFilters(next);
                      },
                    }))
                  : []) as MenuEntry[]
              }
              emptyLabel={t("filterBar:viewsMenu.empty")}
              activeIndex={0}
              setActiveIndex={() => void 0}
              onClose={() => setViewsMenuOpen(false)}
              align="right"
            />
          )}
        </div>
      </div>

      {/* Second row: actions */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {/* Add filter + menu */}
        <div className="relative" ref={menuRef}>
          <Button
            variant="outline"
            size="sm"
            className={`font-semibold bg-white hover:bg-gray-50 ${
              menuOpen ? "!bg-white !border-gray-400" : ""
            }`}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {t("filterBar:menu.addFilter")}
          </Button>

          {menuOpen && (
            <Menu
              roleLabel={t("filterBar:menu.aria")}
              items={[
                { key: "date", label: t("filterBar:menu.date"), onAction: () => (setOpenEditor("date"), setMenuOpen(false)) },
                { key: "bank", label: t("filterBar:menu.bank"), onAction: () => (setOpenEditor("banks"), setMenuOpen(false)) },
                { key: "accounts", label: t("filterBar:menu.accounts"), onAction: () => (setOpenEditor("accounts"), setMenuOpen(false)) },
                { sep: true },
                { key: "observation", label: t("filterBar:menu.observation"), onAction: () => (setOpenEditor("observation"), setMenuOpen(false)) },
                { key: "txType", label: t("filterBar:menu.txType"), onAction: () => (setOpenEditor("tx_type"), setMenuOpen(false)) },
                { key: "amount", label: t("filterBar:menu.amount"), onAction: () => (setOpenEditor("amount"), setMenuOpen(false)) },
              ]}
              activeIndex={0}
              setActiveIndex={() => void 0}
              onClose={() => setMenuOpen(false)}
              align="left"
            />
          )}
        </div>

        {/* Apply */}
        <div className="ml-auto sm:ml-0">
          <Button
            variant="outline"
            size="sm"
            className="font-semibold bg-white hover:bg-gray-50"
            onClick={applyFilters}
          >
            {t("filterBar:buttons.apply")}
          </Button>
        </div>

        {/* Clear filters */}
        <button
          className={`text-xs font-semibold text-red-600 ${
            hasActive ? "" : "opacity-40 cursor-not-allowed"
          }`}
          onClick={() => hasActive && clearAll()}
        >
          {t("filterBar:buttons.clear")}
        </button>
      </div>

      {/* --------------------------- EDITORS (popover) -------------------------- */}
      <div className="relative">
        {openEditor === "date" && (
          <Popover onClose={() => setOpenEditor(null)} className="min-w-[360px] max-w-[360px]">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-gray-600 space-y-1 block">
                <span className="block">{t("filterBar:editors.date.start")}</span>
                <DateInput
                  value={filters.start_date || ""}
                  onChange={(iso) =>
                    setFilters((f) => ({ ...f, start_date: iso }))
                  }
                />
              </label>
              <label className="text-xs text-gray-600 space-y-1 block">
                <span className="block">{t("filterBar:editors.date.end")}</span>
                <DateInput
                  value={filters.end_date || ""}
                  onChange={(iso) =>
                    setFilters((f) => ({ ...f, end_date: iso }))
                  }
                />
              </label>
            </div>

            {/* Quick date-range helpers */}
            <div className="mt-2">
              <div className="text-[11px] text-gray-500 mb-1">
                {t("filterBar:editors.date.shortcuts")}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <QuickButton
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      start_date: todayISO(),
                      end_date: todayISO(),
                    }))
                  }
                >
                  {t("filterBar:editors.date.today")}
                </QuickButton>
                <QuickButton
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      start_date: startOfWeekISO(),
                      end_date: todayISO(),
                    }))
                  }
                >
                  {t("filterBar:editors.date.thisWeek")}
                </QuickButton>
                <QuickButton
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      start_date: startOfMonthISO(),
                      end_date: todayISO(),
                    }))
                  }
                >
                  {t("filterBar:editors.date.thisMonth")}
                </QuickButton>
                <QuickButton
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      start_date: startOfQuarterISO(),
                      end_date: todayISO(),
                    }))
                  }
                >
                  {t("filterBar:editors.date.thisQuarter")}
                </QuickButton>
                <QuickButton
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      start_date: startOfYearISO(),
                      end_date: todayISO(),
                    }))
                  }
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
                onClick={() => (setOpenEditor(null), applyFilters())}
              >
                {t("filterBar:buttons.apply")}
              </Button>
            </div>
          </Popover>
        )}

        {openEditor === "banks" && (
          <Popover onClose={() => setOpenEditor(null)} className="min-w-[260px] max-w-[360px]">
            <SelectDropdown<BankAccount>
              label={t("filterBar:editors.banks.label")}
              items={banks}
              selected={selectedBanks}
              onChange={(list) =>
                setFilters((f) => ({
                  ...f,
                  bank_id: list.map((x) => String(x.id)),
                }))
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
                onClick={() => (setOpenEditor(null), applyFilters())}
              >
                {t("filterBar:buttons.apply")}
              </Button>
            </div>
          </Popover>
        )}

        {openEditor === "accounts" && (
          <Popover onClose={() => setOpenEditor(null)} className="min-w-[260px] max-w-[360px]">
            <SelectDropdown<GLAccountLike>
              label={t("filterBar:editors.accounts.label")}
              items={ledgerAccounts}
              selected={selectedAccounts}
              onChange={(list) =>
                setFilters((f) => ({ ...f, gla_id: list.map((x) => getGlaId(x)) }))
              }
              getItemKey={(item) => getGlaId(item)}
              getItemLabel={(item) => item.account}
              buttonLabel={t("filterBar:editors.accounts.button")}
              customStyles={{ maxHeight: "240px" }}
              groupBy={(item) => item.subcategory || ""}
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
                onClick={() => (setOpenEditor(null), applyFilters())}
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

              value={filters.observation || ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, observation: e.target.value }))
              }
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
                onClick={() => (setOpenEditor(null), applyFilters())}
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
                onClick={() =>
                  setFilters((f) => ({ ...f, tx_type: "credit" }))
                }
              >
                {t("filterBar:editors.txType.credit")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-50"
                onClick={() => setFilters((f) => ({ ...f, tx_type: "debit" }))}
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
                onClick={() => (setOpenEditor(null), applyFilters())}
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
                <span className="block">
                  {t("filterBar:editors.amount.min")}{" "}
                  {t("filterBar:editors.amount.currencySuffix")}
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  // 🔹 Sempre mostra algum valor: se estiver vazio, formata "0"
                  value={formatCurrency(filters.amount_min ?? "0")}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, amount_min: e.target.value }))
                  }
                  onKeyDown={(e) =>
                    handleUtilitaryAmountKeyDown(
                      e,
                      filters.amount_min ?? "0",
                      (newVal: string) =>
                        setFilters((f) => ({ ...f, amount_min: newVal }))
                    )
                  }
                />
              </label>

              <label className="text-xs text-gray-600 space-y-1 block">
                <span className="block">
                  {t("filterBar:editors.amount.max")}{" "}
                  {t("filterBar:editors.amount.currencySuffix")}
                </span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={formatCurrency(filters.amount_max ?? "0")}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, amount_max: e.target.value }))
                  }
                  onKeyDown={(e) =>
                    handleUtilitaryAmountKeyDown(
                      e,
                      filters.amount_max ?? "0",
                      (newVal: string) =>
                        setFilters((f) => ({ ...f, amount_max: newVal }))
                    )
                  }
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
                onClick={() => (setOpenEditor(null), applyFilters())}
              >
                {t("filterBar:buttons.apply")}
              </Button>
            </div>
          </Popover>
        )}
      </div>

      {/* ---------------------- CONFIG MODAL (only views) --------------------- */}
      {configModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
          <div className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
            {/* Overlay to freeze content when toggling default */}
            {configBusy && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <svg
                    className="h-4 w-4 animate-spin text-gray-400"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      opacity="0.25"
                    />
                    <path
                      d="M21 12a9 9 0 0 0-9-9"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                  <span>{t("filterBar:configModal.loading")}</span>
                </div>
              </div>
            )}

            <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
              <h3 className="text-[14px] font-semibold text-gray-800">
                {t("filterBar:configModal.title")}
              </h3>
              <button
                className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                onClick={() => !configBusy && setConfigModalOpen(false)}
                aria-label={t("filterBar:configModal.close")}
              >
                &times;
              </button>
            </header>

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
                          onChange={() => {
                            (async () => {
                              try {
                                setConfigBusy(true);
                                if (v.is_default) {
                                  await api.editEntryView(v.id, { is_default: false });
                                } else {
                                  await api.editEntryView(v.id, { is_default: true });
                                  const others = scopedViews.filter(
                                    (o) => o.id !== v.id && o.is_default
                                  );
                                  if (others.length) {
                                    await Promise.all(
                                      others.map((o) =>
                                        api.editEntryView(o.id, { is_default: false })
                                      )
                                    );
                                  }
                                }
                                await refreshViews();
                              } catch (err) {
                                console.error("Failed to toggle default view", err);
                              } finally {
                                setConfigBusy(false);
                              }
                            })();
                          }}
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
                        {v.is_default ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600">
                            <DefaultStarIcon className="w-3 h-3" />
                            <span>{t("filterBar:configModal.defaultTag")}</span>
                          </span>
                        ) : null}
                      </label>

                      <div className="ml-auto flex items-center gap-2">
                        {isRenaming ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={configBusy}
                              className="bg-white hover:bg-gray-50"
                              onClick={async () => {
                                const id = renamingId;
                                const name = renamingName.trim();
                                if (!id || !name) return;
                                try {
                                  setConfigBusy(true);
                                  await api.editEntryView(id, { name });
                                  await refreshViews();
                                } catch (err) {
                                  console.error("Failed to rename view", err);
                                } finally {
                                  setConfigBusy(false);
                                  setRenamingId(null);
                                  setRenamingName("");
                                }
                              }}
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
                          onClick={() => {
                            const next = {
                              ...(v.filters as LocalFilters),
                              settlement_status: !!v.settlement_status,
                            };
                            setFilters(next);
                          }}
                        >
                          {t("filterBar:configModal.apply")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={configBusy}
                          className="!text-red-600 !border-red-200 hover:!bg-red-50"
                          onClick={async () => {
                            try {
                              setConfigBusy(true);
                              await api.deleteEntryView(v.id);
                              setViews((prev) => prev.filter((x) => x.id !== v.id));
                            } catch (err) {
                              console.error("Failed to delete view", err);
                            } finally {
                              setConfigBusy(false);
                            }
                          }}
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
          </div>
        </div>
      )}

      {/* --------------------------- SAVE MODAL ---------------------------- */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
          <div className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md max-h-[90vh] relative">
            {/* Loading overlay when saving */}
            {saveBusy && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <svg
                    className="h-4 w-4 animate-spin text-gray-400"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      opacity="0.25"
                    />
                    <path
                      d="M21 12a9 9 0 0 0-9-9"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                  <span>{t("filterBar:saveModal.loading")}</span>
                </div>
              </div>
            )}

            <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
              <h3 className="text-[14px] font-semibold text-gray-800">
                {t("filterBar:saveModal.title")}
              </h3>
              <button
                className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                onClick={() => !saveBusy && setSaveModalOpen(false)}
                aria-label={t("filterBar:saveModal.close")}
              >
                &times;
              </button>
            </header>

            <div className={saveBusy ? "pointer-events-none opacity-60" : ""}>
              <div className="space-y-4 text-xs text-gray-700">
                <p className="text-[12px] text-gray-600">
                  {t("filterBar:saveModal.description")}
                </p>

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
                  <div className="font-semibold text-[12px]">
                    {t("filterBar:saveModal.modeTitle")}
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="save_mode"
                        checked={saveMode === "create"}
                        onChange={() => {
                          setSaveMode("create");
                          setOverwriteId(null);
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
                        onChange={(list) => {
                          const v = list[0] ?? null;
                          setOverwriteView(v);
                          setOverwriteId(v ? v.id : null);
                        }}
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
                      setTimeout(() => {
                        setSaveName("");
                        setSaveDefault(false);
                        setSaveMode("create");
                        setOverwriteId(null);
                        setOverwriteView(null);
                      }, 0);
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
                      (saveMode === "overwrite" && !overwriteId)
                    }
                    onClick={async () => {
                      const name = saveName.trim();
                      if (!name) return;

                      const payload = {
                        name,
                        is_default: saveDefault,
                        settlement_status: !!filters.settlement_status,
                        filters,
                      };

                      try {
                        setSaveBusy(true);
                        if (saveMode === "overwrite" && overwriteId) {
                          await api.editEntryView(overwriteId, payload);
                        } else {
                          const sameName = views.find(
                            (v) =>
                              v.name.toLowerCase() === name.toLowerCase() &&
                              v.settlement_status === !!filters.settlement_status
                          );
                          if (sameName) await api.editEntryView(sameName.id, payload);
                          else await api.addEntryView(payload);
                        }
                        await refreshViews();
                      } catch (err) {
                        console.error("Failed to save visualization", err);
                      } finally {
                        setSaveBusy(false);
                        setSaveModalOpen(false);
                        setTimeout(() => {
                          setSaveName("");
                          setSaveDefault(false);
                          setSaveMode("create");
                          setOverwriteId(null);
                          setOverwriteView(null);
                        }, 0);
                      }
                    }}
                  >
                    {t("filterBar:saveModal.save")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------- Subcomponents ------------------------------ */

const QuickButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ className = "", ...props }) => (
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
  const Icon = () => {
    if (icon === "calendar")
      return (
        <span className="text-[12px]" aria-hidden>
          📅
        </span>
      );
    if (icon === "bank")
      return (
        <span className="text-[12px]" aria-hidden>
          🏦
        </span>
      );
    if (icon === "accounts")
      return (
        <span className="text-[12px]" aria-hidden>
          🧾
        </span>
      );
    if (icon === "note")
      return (
        <span className="text-[12px]" aria-hidden>
          📝
        </span>
      );
    return null;
  };

  return (
    <div
      className="shrink-0 inline-flex items-center gap-1 text-xs border border-gray-300 rounded-md px-2 h-6 bg-white cursor-pointer"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClick}
    >
      <Icon />
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
  useOutside(ref, onClose);
  return (
    <div className="absolute z-[99999] mt-2">
      <div
        ref={ref}
        className={`rounded-md border border-gray-300 bg-white p-3 ${className || ""}`}
      >
        {children}
      </div>
    </div>
  );
};

/* ------------------------------- Menu System ------------------------------- */

type MenuActionItem = { key: string; label: React.ReactNode; onAction?: () => void };
type MenuSeparator = { sep: true };
type MenuEntry = MenuActionItem | MenuSeparator;

function isActionItem(x: MenuEntry): x is MenuActionItem {
  return (x as MenuActionItem).label !== undefined && !(x as MenuSeparator).sep;
}

const MenuItemBtn = React.forwardRef<
  HTMLButtonElement,
  {
    label: React.ReactNode;
    onClick(): void;
    active?: boolean;
    danger?: boolean;
  }
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
  activeIndex: number;
  setActiveIndex: (n: number) => void;
  onClose: () => void;
  onItem?: (key: string) => void;
  emptyLabel?: string;
  align?: "left" | "right";
}> = ({
  roleLabel,
  items,
  activeIndex,
  setActiveIndex,
  onClose,
  onItem,
  emptyLabel,
  align = "left",
}) => {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const btn = refs.current[activeIndex];
    if (btn) btn.focus();
  }, [activeIndex]);

  const actionableIdxs = useMemo(
    () =>
      items
        .map((it, i) => ({ it, i }))
        .filter(({ it }) => isActionItem(it))
        .map(({ i }) => i),
    [items]
  );

  const focusFirst = () => {
    if (actionableIdxs.length) setActiveIndex(actionableIdxs[0]);
  };
  const focusLast = () => {
    if (actionableIdxs.length)
      setActiveIndex(actionableIdxs[actionableIdxs.length - 1]);
  };
  const focusNext = (dir: 1 | -1) => {
    if (!actionableIdxs.length) return;
    const curr = actionableIdxs.indexOf(activeIndex);
    const base = curr === -1 ? (dir === 1 ? -1 : 1) : curr;
    const next =
      actionableIdxs[(base + dir + actionableIdxs.length) % actionableIdxs.length];
    setActiveIndex(next);
  };

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
    if (e.key === "Home") {
      e.preventDefault();
      focusFirst();
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      focusLast();
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const item = items[activeIndex];
      if (item && isActionItem(item)) {
        onClose();
        item.onAction?.();
        if (onItem) onItem(item.key);
      }
    }
  };

  const aligned = align === "right" ? "right-0" : "left-0";

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
                if (onItem) onItem(it.key);
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

export default FilterBar;
