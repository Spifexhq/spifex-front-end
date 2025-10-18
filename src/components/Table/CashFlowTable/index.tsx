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
import Button from "@/components/Button";
import Checkbox from "@/components/Checkbox";
import { api } from "src/api/requests";
import { getCursorFromUrl } from "src/lib/list";

import type { EntryFilters, Entry } from "src/models/entries/domain";
import type {
  GetEntryRequest,
  GetEntryResponse,
} from "src/models/entries/dto/GetEntry";

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
 * Reads the backend-provided running balance.
 * Prefer *_minor if present (convert minor->major). Fallback to decimal string.
 * NOTE: assumes 2 decimal places (BRL). If you support multi-currency with different
 * exponents, adapt this conversion.
 */
const getServerRunning = (e: Entry): number | null => {
  if (typeof e.running_balance_minor === "number") {
    return e.running_balance_minor / 100; // minor -> major
  }
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
  displayMonth?: string;
}

export type CashFlowTableHandle = {
  clearSelection: () => void;
};

interface CashFlowTableProps {
  filters?: EntryFilters;
  onEdit(entry: Entry): void;
  onSelectionChange?: (ids: string[], entries: Entry[]) => void;
}

/* -------------------------------------------------------------------------- */
/* Utils                                                                      */
/* -------------------------------------------------------------------------- */

const formatCurrency = (amount: number): string =>
  amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString("pt-BR");

const getMonthYear = (dateStr: string): string => {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${year}`;
};

const formatMonthYearSummary = (isoDate: string): string => {
  const d = new Date(isoDate);
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return `${months[d.getMonth()]}, ${d.getFullYear()}`;
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
}> = ({ selectedCount, totalCount, onSelectAll }) => (
  <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-300 shrink-0">
    <div className="flex items-center gap-3">
      <Checkbox
        checked={totalCount > 0 && selectedCount === totalCount}
        onChange={onSelectAll}
        size="sm"
      />
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-gray-600">
          Lançamentos
        </span>
        <span className="text-[10px] text-gray-500">({totalCount})</span>
        {selectedCount > 0 && (
          <span className="text-[10px] text-blue-600 font-medium">
            {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
    <div className="hidden md:flex items-center text-[10px] uppercase tracking-wide text-gray-600">
      <div className="w-[150px] text-center">Valor</div>
      <div className="w-[150px] text-center">Saldo</div>
      <div className="w-[32px]" />
    </div>
  </div>
);

const EntryRow: React.FC<{
  entry: Entry;
  runningBalance: number;
  isSelected: boolean;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onEdit: (entry: Entry) => void;
}> = ({ entry, runningBalance, isSelected, onSelect, onEdit }) => {
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
        />

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-gray-800 font-medium truncate leading-tight">
                {getDescription(entry)}
              </div>

              <div className="text-[10px] text-gray-500 truncate leading-tight mt-0.5">
                Venc: {formatDate(getDueDate(entry))}
                {(installments.index || installments.count) && (
                  <span className="ml-2">
                    Parcela {installments.index ?? "-"} /{" "}
                    {installments.count ?? "-"}
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
                  {formatCurrency(transactionValue)}
                </div>
              </div>

              <div className="w-[150px] text-center">
                <div className="text-[13px] leading-none font-semibold tabular-nums text-gray-900">
                  {formatCurrency(runningBalance)}
                </div>
              </div>

              <div className="w-8 flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 !h-8 !w-8 !p-0 grid place-items-center rounded-md"
                  onClick={() => onEdit(entry)}
                  aria-label="Editar entrada"
                  title="Editar"
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
  const [m, y] = displayMonth.split("/");
  const iso = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toISOString();
  const label = formatMonthYearSummary(iso);

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
            {formatCurrency(monthlySum)}
          </div>
        </div>

        <div className="w-[150px] text-center">
          <div className="text-[11px] font-semibold tabular-nums text-gray-900">
            {formatCurrency(runningBalance)}
          </div>
        </div>

        <div className="w-[32px]" />
      </div>
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-8 px-4">
    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
      <svg
        className="w-6 h-6 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    </div>
    <div className="text-center">
      <p className="text-[13px] font-medium text-gray-800 mb-1">
        Nenhum lançamento encontrado
      </p>
      <p className="text-[11px] text-gray-500">
        Tente ajustar os filtros para ver os dados
      </p>
    </div>
  </div>
);

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

const TableSkeleton: React.FC<{ rows?: number; showSummariesEvery?: number }> =
  ({ rows = 10, showSummariesEvery = 4 }) =>
    (
      <div
        className="divide-y divide-gray-200"
        role="progressbar"
        aria-label="Carregando lançamentos"
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

/* ------------------------------ Bottom Loader ------------------------------ */

const BottomLoader: React.FC = () => (
  <div
    className="flex items-center justify-center gap-2 py-3 border-t border-gray-300 bg-white"
    role="status"
    aria-live="polite"
    aria-label="Carregando mais resultados"
  >
    <span className="inline-block h-4 w-4 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
    <span className="text-[11px] text-gray-500">Carregando mais...</span>
  </div>
);

/* -------------------------------------------------------------------------- */
/* Main + Virtualização                                                       */
/* -------------------------------------------------------------------------- */

const CashFlowTable = forwardRef<CashFlowTableHandle, CashFlowTableProps>(
  ({ filters, onEdit, onSelectionChange }, ref) => {
    // Data
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);

    // Selection
    const {
      selectedIds,
      handleSelectRow,
      handleSelectAll,
      clearSelection,
    } = useShiftSelect<Entry, string>(entries, getId);
    useImperativeHandle(ref, () => ({ clearSelection }), [clearSelection]);

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

    const buildPayload = useCallback((reset: boolean): GetEntryRequest => {
      const f = latest.current.filters;

      const qCombined =
        (f?.description ? String(f.description).trim() : "") +
        (f?.observation ? ` ${String(f.observation).trim()}` : "");
      const q = qCombined.trim() || undefined;

      const gl = f?.gla_id && f.gla_id.length ? f.gla_id[0] : undefined;
      const tx_type =
        f?.tx_type === "credit" ? 1 :
        f?.tx_type === "debit"  ? -1 :
        undefined;

      // NEW: bancos em CSV para o seed do backend
      const bank =
        Array.isArray(f?.bank_id) && f!.bank_id!.length
          ? f!.bank_id!.join(",")
          : undefined;

      const base: GetEntryRequest = {
        page_size: 100,
        date_from: f?.start_date || undefined,
        date_to:   f?.end_date   || undefined,

        description: f?.description || undefined,
        observation: f?.observation || undefined,
        q,

        gl,
        tx_type,

        amount_min: f?.amount_min,
        amount_max: f?.amount_max,

        bank, // <--- aqui
      };

      if (!reset && latest.current.nextCursor) {
        base.cursor = latest.current.nextCursor;
      }
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
          const { data } = await api.getEntries(payload);
          const incoming: Entry[] = (data as GetEntryResponse).results ?? [];

          setEntries((prev) => {
            const merged = reset
              ? incoming.slice()
              : [
                  ...prev,
                  ...incoming.filter(
                    (e) => !prev.some((p) => getId(p) === getId(e))
                  ),
                ];
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
          setError(
            err instanceof Error ? err.message : "Erro ao buscar dados."
          );
        } finally {
          setLoading(false);
          setLoadingMore(false);
          setIsFetching(false);
        }
      },
      [buildPayload]
    );

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
      const nearBottom =
        el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
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
        const txValue = getTransactionValue(entry); // major units
        const entryMonth = getMonthYear(getDueDate(entry));

        // Month change → flush summary for previous month
        if (currentMonth && currentMonth !== entryMonth) {
          const lastRow = rows[rows.length - 1];
          const lastRunning =
            lastRow?.type === "entry" ? lastRow.runningBalance ?? 0 : 0;

          rows.push({
            id: `summary-${currentMonth}-${index}`,
            type: "summary",
            monthlySum,
            runningBalance: lastRunning,
            displayMonth: currentMonth,
          });
          monthlySum = 0;
        }

        if (!currentMonth || currentMonth !== entryMonth) {
          currentMonth = entryMonth;
        }

        monthlySum += txValue;

        // ✅ Use backend running balance per row (pagination-safe)
        const serverRunning = getServerRunning(entry);
        const runningBalance = serverRunning ?? 0;

        rows.push({
          id: `entry-${getId(entry)}`,
          type: "entry",
          entry,
          runningBalance,
        });

        // Close last month at the very end
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
        let lo = 0,
          hi = rowOffsets.length - 1;
        while (lo < hi) {
          const mid = Math.floor((lo + hi) / 2);
          if (rowOffsets[mid] <= st) lo = mid + 1;
          else hi = mid;
        }
        return Math.max(0, lo - 1);
      },
      [rowOffsets]
    );

    const startIndex = useMemo(
      () => findStartIndex(scrollTop),
      [scrollTop, findStartIndex]
    );

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
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium text-red-800 mb-1">
                Erro ao carregar dados
              </p>
              <p className="text-[11px] text-red-600 mb-3">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="text-[11px] font-semibold"
                onClick={() => fetchEntries(true)}
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <section
        aria-label="Fluxo de caixa"
        className="border border-gray-300 rounded-md bg-white overflow-hidden h-full flex flex-col"
      >
        {/* Header sempre visível para layout estável */}
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
            <TableSkeleton
              rows={Math.max(10, Math.ceil((viewportH || 400) / 42))}
            />
          ) : tableRows.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-gray-200 relative">
              {/* Track total */}
              <div style={{ height: totalHeight, position: "relative" }}>
                {/* Window */}
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

        {/* Footer loader fora da tabela/scroll */}
        {loadingMore && <BottomLoader />}
      </section>
    );
  }
);

export default CashFlowTable;
