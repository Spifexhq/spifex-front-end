// src/components/Table/CashFlowTable/index.tsx
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useTranslation } from "react-i18next";
import Button from "src/components/ui/Button";
import Checkbox from "src/components/ui/Checkbox";
import { api } from "src/api/requests";
import { getCursorFromUrl } from "src/lib/list";

import type { EntryFilters, Entry } from "src/models/entries/domain";
import type { GetEntryRequest, GetEntryResponse } from "src/models/entries/dto/GetEntry";
import { useShiftSelect } from "@/hooks/useShiftSelect";

/* -------------------------------------------------------------------------- */
/* Helpers (strongly typed to backend EntryReadSerializer)                    */
/* -------------------------------------------------------------------------- */

const getId = (e: Entry): string => e.id;
const getAmount = (e: Entry): number => parseFloat(e.amount ?? "0") || 0;
const getTxString = (e: Entry): string => (e.tx_type ?? "").toLowerCase();
const isCredit = (e: Entry): boolean => getTxString(e) === "credit";

const getDueDate = (e: Entry): string => e.due_date;
const getDescription = (e: Entry): string => e.description ?? "";

const getInstallments = (e: Entry) => ({
  index: e.installment_index ?? null,
  count: e.installment_count ?? null,
});

/**
 * Prefer *_minor if present (convert minor->major). Fallback to decimal string.
 * NOTE: assumes 2 decimals.
 */
const getServerRunning = (e: Entry): number | null => {
  if (typeof e.running_balance_minor === "number") return e.running_balance_minor / 100;
  if (typeof e.running_balance === "string" && e.running_balance.length) {
    const n = Number(e.running_balance);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface TableRow {
  id: string;
  type: "entry" | "summary";
  entry?: Entry;
  monthlySum?: number;
  runningBalance?: number;
  displayMonth?: string; // "MM/YYYY"
}

export type CashFlowTableHandle = {
  clearSelection: () => void;
  refresh: () => void;
};

interface CashFlowTableProps {
  filters?: EntryFilters;
  onEdit(entry: Entry): void;
  onSelectionChange?: (ids: string[], entries: Entry[]) => void;
}

/* -------------------------------------------------------------------------- */
/* i18n-aware utils                                                           */
/* -------------------------------------------------------------------------- */

const formatCurrency = (amount: number, locale = "pt-BR", currency = "BRL"): string =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);

const formatDate = (dateStr: string, locale = "pt-BR"): string =>
  new Intl.DateTimeFormat(locale).format(new Date(dateStr));

const getMonthYear = (dateStr: string): string => {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${year}`;
};

const formatMonthYearSummary = (
  isoDate: string,
  monthsShort: string[]
): string => {
  const d = new Date(isoDate);
  const m = d.getMonth();
  return `${monthsShort[m]}, ${d.getFullYear()}`;
};

/** + for credits, - for debits (major units) */
const getTransactionValue = (entry: Entry): number => {
  const amount = getAmount(entry);
  return isCredit(entry) ? amount : -amount;
};

/* -------------------------------------------------------------------------- */
/* Subcomponents                                                              */
/* -------------------------------------------------------------------------- */

const TableHeader: React.FC<{
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
}> = ({ selectedCount, totalCount, onSelectAll }) => {
  const { t } = useTranslation("cashFlowTable");
  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-300 shrink-0">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={totalCount > 0 && selectedCount === totalCount}
          onChange={onSelectAll}
          size="sm"
          aria-label={t("aria.selectAll")}
        />
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-gray-600">
            {t("labels.entries")}
          </span>
          <span className="text-[10px] text-gray-500">({totalCount})</span>
          {selectedCount > 0 && (
            <span className="text-[10px] text-blue-600 font-medium">
              {t("labels.selectedCount", { count: selectedCount })}
            </span>
          )}
        </div>
      </div>
      <div className="hidden md:flex items-center text-[10px] uppercase tracking-wide text-gray-600">
        <div className="w-[150px] text-center">{t("columns.amount")}</div>
        <div className="w-[150px] text-center">{t("columns.balance")}</div>
        <div className="w-[32px]" />
      </div>
    </div>
  );
};

const EntryRow: React.FC<{
  entry: Entry;
  runningBalance: number;
  isSelected: boolean;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onEdit: (entry: Entry) => void;
}> = ({ entry, runningBalance, isSelected, onSelect, onEdit }) => {
  const { t, i18n } = useTranslation("cashFlowTable");
  const transactionValue = getTransactionValue(entry);
  const isPositive = transactionValue >= 0;
  const installments = getInstallments(entry);

  return (
    <div className="group flex items-center justify-center h-10.5 max-h-10.5 px-3 py-1.5 hover:bg-gray-50 focus-within:bg-gray-50 border-b border-gray-200">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Checkbox
          checked={isSelected}
          onClick={(e) => onSelect(entry.id, e)}
          size="sm"
          aria-label={t("aria.selectRow")}
        />

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-gray-800 font-medium truncate leading-tight">
                {getDescription(entry)}
              </div>

              <div className="text-[10px] text-gray-500 truncate leading-tight mt-0.5">
                {t("labels.due")}: {formatDate(getDueDate(entry), i18n.language)}
                {(installments.index || installments.count) && (
                  <span className="ml-2">
                    {t("labels.installmentXofY", {
                      x: installments.index ?? "-",
                      y: installments.count ?? "-",
                    })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center shrink-0">
              <div className="w-[150px] text-center">
                <div
                  className={`text-[13px] leading-none font-semibold tabular-nums ${
                    isPositive ? "text-green-900" : "text-red-900"
                  }`}
                >
                  {formatCurrency(transactionValue, i18n.language)}
                </div>
              </div>

              <div className="w-[150px] text-center">
                <div className="text-[13px] leading-none font-semibold tabular-nums text-gray-900">
                  {formatCurrency(runningBalance, i18n.language)}
                </div>
              </div>

              <div className="w-8 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 !h-8 !w-8 !p-0 grid place-items-center rounded-md"
                  onClick={() => onEdit(entry)}
                  aria-label={t("actions.edit")}
                  title={t("actions.edit")}
                >
                  <svg
                    className="w-4 h-4 text-gray-300 group-hover:text-gray-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    <path d="M15 5l3 3" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryRow: React.FC<{
  displayMonth: string;
  monthlySum: number;
  runningBalance: number;
}> = ({ displayMonth, monthlySum, runningBalance }) => {
  const { t, i18n } = useTranslation("cashFlowTable");
  const monthsShort =
    (t("months.short", { returnObjects: true }) as string[]) ??
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const [m, y] = displayMonth.split("/");
  const iso = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toISOString();
  const label = formatMonthYearSummary(iso, monthsShort);

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-300">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 bg-gray-500 rounded-full" />
        <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
          {label}
        </span>
      </div>

      <div className="flex items-center">
        <div className="w-[150px] text-center">
          <div
            className={`text-[11px] font-semibold tabular-nums ${
              monthlySum >= 0 ? "text-green-900" : "text-red-900"
            }`}
          >
            {formatCurrency(monthlySum, i18n.language)}
          </div>
        </div>

        <div className="w-[150px] text-center">
          <div className="text-[11px] font-semibold tabular-nums text-gray-900">
            {formatCurrency(runningBalance, i18n.language)}
          </div>
        </div>

        <div className="w-[32px]" />
      </div>
    </div>
  );
};

const EmptyState: React.FC = () => {
  const { t } = useTranslation("cashFlowTable");
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-[13px] font-medium text-gray-800 mb-1">
          {t("empty.title")}
        </p>
        <p className="text-[11px] text-gray-500">
          {t("empty.subtitle")}
        </p>
      </div>
    </div>
  );
};

/* ------------------------------ Skeletons --------------------------------- */

const SkeletonDot = ({ className = "" }: { className?: string }) => (
  <div className={`bg-gray-200 rounded ${className} animate-pulse`} />
);

const SkeletonEntryRow: React.FC = () => (
  <div className="flex items-center justify-center h-10.5 max-h-10.5 px-3 py-1.5 border-b border-gray-200">
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <SkeletonDot className="h-4 w-4 rounded border border-gray-300" />
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="h-3 w-2/3 rounded bg-gray-200 animate-pulse" />
            <div className="h-2 w-1/3 rounded bg-gray-200 animate-pulse mt-1" />
          </div>
          <div className="flex items-center shrink-0">
            <div className="w-[150px] text-center">
              <div className="h-3 w-20 mx-auto rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="w-[150px] text-center">
              <div className="h-3 w-20 mx-auto rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="w-8 flex justify-center">
              <div className="h-6 w-6 rounded-md bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SkeletonSummaryRow: React.FC = () => (
  <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-300">
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-1.5 bg-gray-300 rounded-full" />
      <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
    </div>
    <div className="flex items-center">
      <div className="w-[150px] text-center">
        <div className="h-3 w-20 mx-auto rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="w-[150px] text-center">
        <div className="h-3 w-20 mx-auto rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="w-[32px]" />
    </div>
  </div>
);

const TableSkeleton: React.FC<{ rows?: number; showSummariesEvery?: number }> = ({
  rows = 10,
  showSummariesEvery = 4,
}) => {
  const { t } = useTranslation("cashFlowTable");
  return (
    <div
      className="divide-y divide-gray-200"
      role="progressbar"
      aria-label={t("aria.loadingEntries")}
      aria-busy="true"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <React.Fragment key={i}>
          <SkeletonEntryRow />
          {(i + 1) % showSummariesEvery === 0 && <SkeletonSummaryRow />}
        </React.Fragment>
      ))}
    </div>
  );
};

/* ------------------------------ Bottom Loader ------------------------------ */

const BottomLoader: React.FC = () => {
  const { t } = useTranslation("cashFlowTable");
  return (
    <div
      className="flex items-center justify-center gap-2 py-3 border-t border-gray-300 bg-white"
      role="status"
      aria-live="polite"
      aria-label={t("aria.loadingMore")}
    >
      <span className="inline-block h-4 w-4 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
      <span className="text-[11px] text-gray-500">{t("labels.loadingMore")}</span>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Main + Virtualização                                                       */
/* -------------------------------------------------------------------------- */

const CashFlowTable = forwardRef<CashFlowTableHandle, CashFlowTableProps>(
  ({ filters, onEdit, onSelectionChange }, ref) => {
    const { t } = useTranslation("cashFlowTable");

    // Data
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);

    // Selection
    const { selectedIds, handleSelectRow, handleSelectAll, clearSelection } =
      useShiftSelect<Entry, string>(entries, getId);

    // Latest for fetch
    const latest = useRef<{ filters: EntryFilters | undefined; nextCursor: string | null; isFetching: boolean; }>({
      filters,
      nextCursor,
      isFetching,
    });
    useEffect(() => {
      latest.current = { filters, nextCursor, isFetching };
    }, [filters, nextCursor, isFetching]);

    // notify selection
    useEffect(() => {
      const selectedRows = entries.filter((e) => selectedIds.includes(getId(e)));
      onSelectionChange?.(selectedIds, selectedRows);
    }, [selectedIds, entries, onSelectionChange]);

    const buildPayload = useCallback((reset: boolean): GetEntryRequest => {
      const f = latest.current.filters;

      const qCombined =
        (f?.description ? String(f.description).trim() : "") +
        (f?.observation ? ` ${String(f.observation).trim()}` : "");
      const q = qCombined.trim() || undefined;

      const gl = f?.gla_id && f.gla_id.length ? f.gla_id[0] : undefined;
      const tx_type =
        f?.tx_type === "credit" ? 1 : f?.tx_type === "debit" ? -1 : undefined;

      const bank =
        Array.isArray(f?.bank_id) && f!.bank_id!.length
          ? f!.bank_id!.join(",")
          : undefined;

      const base: GetEntryRequest = {
        page_size: 100,
        date_from: f?.start_date || undefined,
        date_to: f?.end_date || undefined,
        description: f?.description || undefined,
        observation: f?.observation || undefined,
        q,
        gl,
        tx_type,
        amount_min: f?.amount_min,
        amount_max: f?.amount_max,
        bank,
      };

      if (!reset && latest.current.nextCursor) base.cursor = latest.current.nextCursor;
      return base;
    }, []);

    const fetchEntries = useCallback(async (reset = false) => {
      if (latest.current.isFetching) return;

      const payload = buildPayload(reset);
      setIsFetching(true);
      if (reset) setLoading(true);
      else setLoadingMore(true);

      try {
        const { data } = await api.getEntries(payload);
        const incoming: Entry[] = (data as GetEntryResponse).results ?? [];

        setEntries((prev) => {
          const map = new Map<string, Entry>(reset ? [] : prev.map((e) => [getId(e), e]));
          for (const e of incoming) map.set(getId(e), e);
          const merged = Array.from(map.values());

          if (reset) {
            merged.sort((a, b) => {
              const ad = new Date(getDueDate(a)).getTime();
              const bd = new Date(getDueDate(b)).getTime();
              if (ad !== bd) return ad - bd;
              return getId(a).localeCompare(getId(b));
            });
          }
          return merged;
        });

        setNextCursor(getCursorFromUrl((data as GetEntryResponse).next) ?? null);
        setHasMore(Boolean((data as GetEntryResponse).next));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("errors.fetch"));
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setIsFetching(false);
      }
    }, [buildPayload, t]);

    useImperativeHandle(ref, () => ({
      clearSelection,
      refresh: () => {
        clearSelection();
        scrollerRef.current?.scrollTo?.({ top: 0 });
        setEntries([]);
        setNextCursor(null);
        setHasMore(true);
        setError(null);
        setLoading(true);
        fetchEntries(true);
      },
    }), [clearSelection, fetchEntries]);

    useEffect(() => {
      setNextCursor(null);
      fetchEntries(true);
    }, [filters, fetchEntries]);

    /* ----------------------- Infinite inner scroll ------------------------- */
    const scrollerRef = useRef<HTMLDivElement>(null);

    const handleInnerScroll = useCallback(() => {
      const el = scrollerRef.current;
      if (!el || isFetching || !hasMore) return;
      const threshold = 150;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
      if (nearBottom) fetchEntries();
    }, [isFetching, hasMore, fetchEntries]);

    // If first page doesn't fill, fetch one more
    useEffect(() => {
      const el = scrollerRef.current;
      if (!el) return;
      if (!loading && hasMore && el.scrollHeight <= el.clientHeight + 100) {
        fetchEntries();
      }
    }, [loading, hasMore, entries.length, fetchEntries]);

    /* ------------------------- Build rows + summaries ---------------------- */
    const tableRows = useMemo((): TableRow[] => {
      if (!entries.length) return [];
      let currentMonth = "";
      let monthlySum = 0;
      const rows: TableRow[] = [];

      entries.forEach((entry, index) => {
        const txValue = getTransactionValue(entry);
        const entryMonth = getMonthYear(getDueDate(entry));

        if (currentMonth && currentMonth !== entryMonth) {
          const lastRow = rows[rows.length - 1];
          const lastRunning = lastRow?.type === "entry" ? lastRow.runningBalance ?? 0 : 0;
          rows.push({
            id: `summary-${currentMonth}-${index}`,
            type: "summary",
            monthlySum,
            runningBalance: lastRunning,
            displayMonth: currentMonth,
          });
          monthlySum = 0;
        }

        if (!currentMonth || currentMonth !== entryMonth) currentMonth = entryMonth;
        monthlySum += txValue;

        const serverRunning = getServerRunning(entry);
        const runningBalance = serverRunning ?? 0;

        rows.push({
          id: `entry-${getId(entry)}`,
          type: "entry",
          entry,
          runningBalance,
        });

        if (index === entries.length - 1) {
          rows.push({
            id: `summary-${currentMonth}-final`,
            type: "summary",
            monthlySum,
            runningBalance,
            displayMonth: currentMonth,
          });
        }
      });

      return rows;
    }, [entries]);

    /* ------------------------------ Virtualização -------------------------- */
    const ENTRY_ROW_H = 42; // ≈ h-10.5
    const SUMMARY_ROW_H = 40;
    const OVERSCAN = 8;

    const [scrollTop, setScrollTop] = useState(0);
    const [viewportH, setViewportH] = useState(0);

    useEffect(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
      ro.observe(el);
      setViewportH(el.clientHeight);
      return () => ro.disconnect();
    }, []);

    const rowHeights = useMemo(
      () => tableRows.map((r) => (r.type === "entry" ? ENTRY_ROW_H : SUMMARY_ROW_H)),
      [tableRows]
    );

    const rowOffsets = useMemo(() => {
      const off = new Array(rowHeights.length + 1);
      off[0] = 0;
      for (let i = 0; i < rowHeights.length; i++) off[i + 1] = off[i] + rowHeights[i];
      return off;
    }, [rowHeights]);

    const totalHeight = rowOffsets[rowOffsets.length - 1] || 0;

    const findStartIndex = useCallback(
      (st: number) => {
        let lo = 0, hi = rowOffsets.length - 1;
        while (lo < hi) {
          const mid = Math.floor((lo + hi) / 2);
          if (rowOffsets[mid] <= st) lo = mid + 1;
          else hi = mid;
        }
        return Math.max(0, lo - 1);
      },
      [rowOffsets]
    );

    const startIndex = useMemo(() => findStartIndex(scrollTop), [scrollTop, findStartIndex]);

    const endIndex = useMemo(() => {
      const limit = scrollTop + (viewportH || 0);
      let i = startIndex;
      while (i < rowHeights.length && rowOffsets[i] < limit) i++;
      return Math.min(rowHeights.length - 1, i + OVERSCAN);
    }, [startIndex, scrollTop, viewportH, rowHeights.length, rowOffsets]);

    /* --------------------------------- UI ---------------------------------- */
    if (error) {
      return (
        <div className="border border-gray-300 rounded-md bg-white overflow-hidden">
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium text-red-800 mb-1">
                {t("errors.title")}
              </p>
              <p className="text-[11px] text-red-600 mb-3">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] font-semibold"
                onClick={() => fetchEntries(true)}
              >
                {t("actions.retry")}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <section
        aria-label={t("aria.section")}
        className="border border-gray-300 rounded-md bg-white overflow-hidden h-full flex flex-col"
      >
        <TableHeader
          selectedCount={selectedIds.length}
          totalCount={entries.length}
          onSelectAll={handleSelectAll}
        />

        <div
          ref={scrollerRef}
          onScroll={(e) => {
            setScrollTop(e.currentTarget.scrollTop);
            handleInnerScroll();
          }}
          className="flex-1 min-h-0 overflow-y-auto relative"
        >
          {loading && !entries.length ? (
            <TableSkeleton rows={Math.max(10, Math.ceil((viewportH || 400) / 42))} />
          ) : tableRows.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-gray-200 relative">
              <div style={{ height: totalHeight, position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    top: rowOffsets[startIndex],
                    left: 0,
                    right: 0,
                  }}
                >
                  {tableRows.slice(startIndex, endIndex + 1).map((row) => {
                    if (row.type === "entry" && row.entry) {
                      const isSelected = selectedIds.includes(getId(row.entry));
                      return (
                        <EntryRow
                          key={row.id}
                          entry={row.entry}
                          runningBalance={row.runningBalance!}
                          isSelected={isSelected}
                          onSelect={handleSelectRow}
                          onEdit={onEdit}
                        />
                      );
                    }
                    if (row.type === "summary") {
                      return (
                        <SummaryRow
                          key={row.id}
                          displayMonth={row.displayMonth!}
                          monthlySum={row.monthlySum!}
                          runningBalance={row.runningBalance!}
                        />
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {loadingMore && <BottomLoader />}
      </section>
    );
  }
);

export default CashFlowTable;
