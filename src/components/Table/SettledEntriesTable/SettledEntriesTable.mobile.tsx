/* -------------------------------------------------------------------------- */
/* File: src/components/Table/SettledEntriesTable/SettledEntriesTable.mobile.tsx */
/* -------------------------------------------------------------------------- */

import React, {
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useImperativeHandle,
  useState,
  forwardRef,
} from "react";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import Checkbox from "@/shared/ui/Checkbox";

import { api } from "@/api/requests";
import { getCursorFromUrl } from "@/lib/list";
import { useShiftSelect } from "@/hooks/useShiftSelect";
import { formatDateFromISO, formatCurrency } from "@/lib";

import type { EntryFilters } from "@/models/components/filterBar";
import type { GetSettledEntryRequest, GetSettledEntryResponse, SettledEntry } from "@/models/entries/settlements";
import type { SettledEntriesTableHandle, SettledEntriesTableProps } from "./SettledEntriesTable";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getId = (e: SettledEntry): string => e.external_id;

const getAmount = (e: SettledEntry): number => {
  const raw = (e as unknown as { amount?: unknown }).amount;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;

  const s = String(raw ?? "0").trim();
  if (!s) return 0;

  // tolerate "1,23" and "1.23" (major units)
  const normalized = s.includes(",") && !s.includes(".") ? s.replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

const getTxString = (e: SettledEntry): string => String(e.tx_type ?? "").toLowerCase();
const isCredit = (e: SettledEntry): boolean => getTxString(e).includes("credit");

const getDueDate = (e: SettledEntry): string => e.value_date;
const getDescription = (e: SettledEntry): string => e.description ?? "";

const getInstallments = (e: SettledEntry) => ({
  index: e.installment_index ?? null,
  count: e.installment_count ?? null,
});

const parseOptionalAmount = (v: unknown): number | undefined => {
  if (v === null || v === undefined) return undefined;

  if (typeof v === "number") {
    return Number.isFinite(v) ? v : undefined;
  }

  const raw = String(v).trim();
  if (!raw) return undefined;

  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/\s+/g, "");
  const normalized =
    cleaned.includes(",") && cleaned.includes(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(",", ".");

  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
};

const getServerRunning = (e: SettledEntry): number | null => {
  const raw = (e as unknown as { running_balance?: unknown }).running_balance;

  if (typeof raw === "string" && raw.trim().length) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  return null;
};

const getMonthYear = (dateStr: string): string => {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${year}`;
};

const formatMonthYearSummary = (isoDate: string, monthsShort: string[]): string => {
  const d = new Date(isoDate);
  const m = d.getMonth();
  return `${monthsShort[m]}, ${d.getFullYear()}`;
};

/** + for credits, - for debits (major units) */
const getTransactionValue = (entry: SettledEntry): number => {
  const amount = getAmount(entry);
  return isCredit(entry) ? amount : -amount;
};

type TFn = (key: string, options?: Record<string, unknown>) => string;

const safeT = (t: TFn, key: string, fallback: string, options?: Record<string, unknown>) => {
  const v = t(key, options);
  return v === key ? fallback : v;
};

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface TableRow {
  id: string;
  type: "entry" | "summary";
  entry?: SettledEntry;
  monthlySum?: number;
  runningBalance?: number;
  displayMonth?: string;
}

/* -------------------------------------------------------------------------- */
/* Mobile UI subcomponents                                                    */
/* -------------------------------------------------------------------------- */

const MobileHeader: React.FC<{
  totalCount: number;
  selectedCount: number;
  onSelectAll: () => void;
  onClear: () => void;
}> = ({ totalCount, selectedCount, onSelectAll, onClear }) => {
  const { t } = useTranslation("settledTable");

  return (
    <div className="shrink-0 bg-white border-b border-gray-200">
      <div className="px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Checkbox
              checked={totalCount > 0 && selectedCount === totalCount}
              onChange={onSelectAll}
              size="sm"
              aria-label={t("aria.selectAll")}
            />

            <div className="min-w-0 min-h-10">
              <div className="flex items-baseline gap-2 min-w-0 min-h-5">
                <span className="text-[12px] font-semibold text-gray-900 truncate">
                  {safeT(t as unknown as TFn, "labels.settled", "Settled")}
                </span>
                <span className="text-[11px] text-gray-500 tabular-nums">({totalCount})</span>

                {selectedCount > 0 ? (
                  <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-2 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold tabular-nums">
                    {selectedCount}
                  </span>
                ) : null}
              </div>

              <div className="text-[10px] text-gray-500 truncate">
                {safeT(t as unknown as TFn, "labels.tapToSelect", "Tap a row to select.")}
              </div>
            </div>
          </div>

          {selectedCount > 0 ? (
            <Button variant="outline" size="sm" className="!h-8 text-[11px] font-semibold" onClick={onClear}>
              {safeT(t as unknown as TFn, "actions.clear", "Clear")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const MobileEmptyState: React.FC = () => {
  const { t } = useTranslation("settledTable");
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-[13px] font-semibold text-gray-900 mb-1">{t("empty.title")}</p>
        <p className="text-[11px] text-gray-500">{t("empty.subtitle")}</p>
      </div>
    </div>
  );
};

const MobileSkeleton: React.FC<{ rows: number }> = ({ rows }) => (
  <div role="progressbar" aria-busy="true" className="bg-white">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-[64px] px-3 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 h-full">
          <div className="h-5 w-5 rounded-full border border-gray-300 bg-gray-200 animate-pulse shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="h-3 w-2/3 rounded bg-gray-200 animate-pulse" />
            <div className="h-2 w-1/3 rounded bg-gray-200 animate-pulse mt-2" />
          </div>
          <div className="shrink-0 text-right">
            <div className="h-3 w-14 rounded bg-gray-200 animate-pulse ml-auto" />
            <div className="h-2 w-12 rounded bg-gray-200 animate-pulse mt-2 ml-auto" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const BottomLoader: React.FC = () => {
  const { t } = useTranslation("settledTable");
  return (
    <div
      className="flex items-center justify-center gap-2 py-3 border-t border-gray-200 bg-white"
      role="status"
      aria-live="polite"
      aria-label={t("aria.loadingMore")}
    >
      <span className="inline-block h-4 w-4 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
      <span className="text-[11px] text-gray-500">{t("labels.loadingMore")}</span>
    </div>
  );
};

const MobileEntryRow: React.FC<{
  entry: SettledEntry;
  runningBalance: number;
  isSelected: boolean;
  onSelect: (id: string, event: React.MouseEvent) => void;
}> = ({ entry, runningBalance, isSelected, onSelect }) => {
  const { t } = useTranslation("settledTable");

  const transactionValue = getTransactionValue(entry);
  const positive = transactionValue >= 0;

  const due = formatDateFromISO(getDueDate(entry));

  const installments = getInstallments(entry);
  const installmentsLabel =
    installments.index || installments.count
      ? `${installments.index ?? "-"}${installments.count ? `/${installments.count}` : ""}`
      : "";

  const partialLabel = entry.partial_index != null ? String(entry.partial_index) : "";
  const bankName = entry.bank?.institution ? String(entry.bank.institution) : "";

  const accent = positive ? "border-l-green-500" : "border-l-red-500";
  const selectedCls = isSelected ? "bg-blue-50 ring-1 ring-blue-200" : "bg-white";

  return (
    <div
      className={[
        "h-[64px] px-3 py-2 border-b border-gray-200 border-l-[3px] box-border",
        accent,
        selectedCls,
      ].join(" ")}
      role="button"
      tabIndex={0}
      aria-label={t("aria.selectRow")}
      aria-pressed={isSelected}
      onClick={(e) => onSelect(getId(entry), e)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect(getId(entry), e as unknown as React.MouseEvent);
        }
      }}
    >
      <div className="flex items-center gap-2 h-full">
        {/* indicator only (selection is by row click) */}
        <div aria-hidden="true" className="pointer-events-none">
          <Checkbox checked={isSelected} size="sm" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-gray-900 truncate leading-tight">
                {getDescription(entry)}
              </div>

              <div className="text-[10px] text-gray-500 truncate mt-1">
                {due}
                {installmentsLabel ? <span className="ml-2">• {installmentsLabel}</span> : null}
                {partialLabel ? <span className="ml-2">• {partialLabel}</span> : null}
                {bankName ? <span className="ml-2">• {bankName}</span> : null}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div
                className={[
                  "text-[12px] font-bold tabular-nums leading-tight",
                  positive ? "text-green-900" : "text-red-900",
                ].join(" ")}
              >
                {formatCurrency(transactionValue)}
              </div>

              <div className="text-[10px] font-semibold tabular-nums text-gray-700 mt-1">
                {formatCurrency(runningBalance)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MobileSummaryRow: React.FC<{
  displayMonth: string;
  monthlySum: number;
  runningBalance: number;
}> = ({ displayMonth, monthlySum, runningBalance }) => {
  const { t } = useTranslation("settledTable");

  const monthsShort =
    (t("months.short", { returnObjects: true }) as string[]) ??
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const [m, y] = displayMonth.split("/");
  const iso = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toISOString();
  const label = formatMonthYearSummary(iso, monthsShort);

  const sumPositive = monthlySum >= 0;

  return (
    <div className="h-[44px] px-3 py-2 border-b border-gray-200 bg-gray-50 box-border">
      <div className="flex items-center justify-between h-full">
        <div className="min-w-0 flex items-center gap-2">
          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full shrink-0" />
          <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide truncate">{label}</span>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <div
            className={`text-[10px] font-bold tabular-nums ${sumPositive ? "text-green-900" : "text-red-900"}`}
          >
            {formatCurrency(monthlySum)}
          </div>
          <div className="text-[10px] font-bold tabular-nums text-gray-700">{formatCurrency(runningBalance)}</div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Main mobile table                                                          */
/* -------------------------------------------------------------------------- */

const SettledEntriesTableMobile = forwardRef<SettledEntriesTableHandle, SettledEntriesTableProps>(
  ({ filters, onSelectionChange }, ref) => {
    const { t } = useTranslation("settledTable");

    const hideScrollbarCls = useMemo(
      () => "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
      [],
    );

    // Data
    const [entries, setEntries] = useState<SettledEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);

    // Selection
    const { selectedIds, handleSelectRow, handleSelectAll, clearSelection } = useShiftSelect<SettledEntry, string>(
      entries,
      getId,
    );

    // Latest for fetch
    const latest = useRef<{
      filters: EntryFilters | undefined;
      nextCursor: string | null;
      isFetching: boolean;
    }>({
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

    const buildPayload = useCallback((reset: boolean): GetSettledEntryRequest => {
      const f = latest.current.filters;

      const qCombined =
        (f?.description ? String(f.description).trim() : "") +
        (f?.observation ? ` ${String(f.observation).trim()}` : "");
      const q = qCombined.trim() || undefined;

      const bank = Array.isArray(f?.bank_id) && f.bank_id.length ? f.bank_id.map(String).join(",") : undefined;

      const ledger_account =
        Array.isArray(f?.ledger_account_id) && f.ledger_account_id.length
          ? f.ledger_account_id.map(String).join(",")
          : undefined;

      const tx_type = f?.tx_type === "credit" ? 1 : f?.tx_type === "debit" ? -1 : undefined;

      const base: GetSettledEntryRequest = {
        value_from: f?.start_date || undefined,
        value_to: f?.end_date || undefined,
        bank,
        q,
        description: f?.description || undefined,
        observation: f?.observation || undefined,
        ledger_account,
        tx_type,
        amount_min: parseOptionalAmount(f?.amount_min),
        amount_max: parseOptionalAmount(f?.amount_max),
        include_inactive: true,
      };

      if (!reset && latest.current.nextCursor) base.cursor = latest.current.nextCursor;
      return base;
    }, []);

    const fetchEntries = useCallback(
      async (reset = false) => {
        if (latest.current.isFetching) return;

        const payload = buildPayload(reset);
        setIsFetching(true);
        if (reset) setLoading(true);
        else setLoadingMore(true);

        try {
          const { data } = await api.getSettledEntriesTable(payload);
          const incoming: SettledEntry[] = (data as GetSettledEntryResponse).results ?? [];

          setEntries((prev) => {
            const map = new Map<string, SettledEntry>(reset ? [] : prev.map((e) => [getId(e), e]));
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

          setNextCursor(getCursorFromUrl((data as GetSettledEntryResponse).next) ?? null);
          setHasMore(Boolean((data as GetSettledEntryResponse).next));
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : t("errors.fetch"));
        } finally {
          setLoading(false);
          setLoadingMore(false);
          setIsFetching(false);
        }
      },
      [buildPayload, t],
    );

    /* ----------------------- Infinite inner scroll ------------------------- */
    const scrollerRef = useRef<HTMLDivElement>(null);

    const handleInnerScroll = useCallback(() => {
      const el = scrollerRef.current;
      if (!el || isFetching || !hasMore) return;
      const threshold = 220;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
      if (nearBottom) fetchEntries(false);
    }, [isFetching, hasMore, fetchEntries]);

    // If first page doesn't fill, fetch one more
    useEffect(() => {
      const el = scrollerRef.current;
      if (!el) return;
      if (!loading && hasMore && el.scrollHeight <= el.clientHeight + 140) {
        fetchEntries(false);
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

    /* ------------------------------ Virtualization -------------------------- */
    const ENTRY_ROW_H = 64;
    const SUMMARY_ROW_H = 44;
    const OVERSCAN = 10;

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
      [tableRows],
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
        let lo = 0;
        let hi = rowOffsets.length - 1;
        while (lo < hi) {
          const mid = Math.floor((lo + hi) / 2);
          if (rowOffsets[mid] <= st) lo = mid + 1;
          else hi = mid;
        }
        return Math.max(0, lo - 1);
      },
      [rowOffsets],
    );

    const startIndex = useMemo(() => findStartIndex(scrollTop), [scrollTop, findStartIndex]);

    const endIndex = useMemo(() => {
      const limit = scrollTop + (viewportH || 0);
      let i = startIndex;
      while (i < rowHeights.length && rowOffsets[i] < limit) i++;
      return Math.min(rowHeights.length - 1, i + OVERSCAN);
    }, [startIndex, scrollTop, viewportH, rowHeights.length, rowOffsets]);

    useImperativeHandle(
      ref,
      () => ({
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
      }),
      [clearSelection, fetchEntries],
    );

    // Match CashFlowTable logic: fetch on filters change (no selection mutation here)
    useEffect(() => {
      setNextCursor(null);
      fetchEntries(true);
    }, [filters, fetchEntries]);

    /* --------------------------------- UI ---------------------------------- */
    if (error) {
      return (
        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[13px] font-semibold text-red-800 mb-1">{t("errors.title")}</p>
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

    const selectedCount = selectedIds.length;
    const skeletonRows = Math.max(10, Math.ceil((viewportH || 520) / ENTRY_ROW_H));

    return (
      <section
        aria-label={t("aria.section")}
        className="border border-gray-200 rounded-xl bg-white overflow-hidden h-full flex flex-col max-w-full shadow-sm"
      >
        <MobileHeader
          totalCount={entries.length}
          selectedCount={selectedCount}
          onSelectAll={handleSelectAll}
          onClear={clearSelection}
        />

        <div
          ref={scrollerRef}
          onScroll={(e) => {
            setScrollTop(e.currentTarget.scrollTop);
            handleInnerScroll();
          }}
          className={[
            "flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative max-w-full bg-white overscroll-contain",
            hideScrollbarCls,
          ].join(" ")}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        >
          {loading && !entries.length ? (
            <MobileSkeleton rows={skeletonRows} />
          ) : tableRows.length === 0 ? (
            <MobileEmptyState />
          ) : (
            <div className={["relative max-w-full overflow-x-hidden", hideScrollbarCls].join(" ")}>
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
                        <MobileEntryRow
                          key={row.id}
                          entry={row.entry}
                          runningBalance={row.runningBalance ?? 0}
                          isSelected={isSelected}
                          onSelect={handleSelectRow}
                        />
                      );
                    }

                    if (row.type === "summary") {
                      return (
                        <MobileSummaryRow
                          key={row.id}
                          displayMonth={row.displayMonth ?? ""}
                          monthlySum={row.monthlySum ?? 0}
                          runningBalance={row.runningBalance ?? 0}
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
  },
);

export default SettledEntriesTableMobile;
