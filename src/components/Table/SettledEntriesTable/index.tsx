/* src/components/Table/SettledEntriesTable/index.tsx
 * Stripe/Brex-style list like CashFlowTable: inner scroller, monthly summary rows,
 * shift-select, cursor pagination, and running balance (reverse-walk).
 */

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import { api } from "src/api/requests";
import { EntryFilters, SettledEntry } from "src/models/entries/domain";
import { useShiftSelect } from "@/hooks/useShiftSelect";
import { useBanks } from "@/hooks/useBanks";
import { getCursorFromUrl } from "src/lib/list";
import { InlineLoader } from "@/components/Loaders";
import Checkbox from "@/components/Checkbox";
// Button intentionally not used on per-row (bulk actions live in SelectionActionsBar)

export type SettledEntriesTableHandle = {
  clearSelection: () => void;
};

type TableRow =
  | {
      id: string;
      type: "entry";
      entry: SettledEntry;
      runningBalance: number;
    }
  | {
      id: string;
      type: "summary";
      displayMonth: string; // MM/YYYY
      monthlySum: number;
      runningBalance: number;
    };

interface Props {
  filters?: EntryFilters;
  bankIds?: number[]; // kept for compatibility; uses filters.bank_id if present
  onSelectionChange?: (ids: number[], entries: SettledEntry[]) => void;
}

/* --------------------------- Utils & Formatters --------------------------- */

const formatCurrency = (amount: number): string =>
  amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString("pt-BR");

const getMonthYear = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const formatMonthYearSummary = (isoDateStr: string): string => {
  const dt = new Date(isoDateStr);
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[dt.getMonth()]}, ${dt.getFullYear()}`;
};

const txValue = (e: SettledEntry) => {
  const n = parseFloat(e.amount) || 0;
  return e.transaction_type === "credit" ? n : -n;
};

/* --------------------------------- UI Bits -------------------------------- */

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
          Realizados
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
  entry: SettledEntry;
  runningBalance: number;
  isSelected: boolean;
  onSelect: (id: number, ev: React.MouseEvent) => void;
}> = ({ entry, runningBalance, isSelected, onSelect }) => {
  const value = txValue(entry);
  const positive = value >= 0;

  return (
    <div className="group flex items-center justify-center h-10.5 max-h-10.5 px-3 py-1.5 hover:bg-gray-50 focus-within:bg-gray-50 border-b border-gray-200">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Checkbox checked={isSelected} onClick={(e) => onSelect(entry.id, e)} size="sm" />

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-gray-800 font-medium truncate leading-tight">
                {entry.description}
              </div>

              <div className="text-[10px] text-gray-500 truncate leading-tight mt-0.5">
                Liq: {formatDate(entry.settlement_due_date)}
                {(entry.current_installment || entry.total_installments) && (
                  <span className="ml-2">
                    Parcela {entry.current_installment ?? "-"}/{entry.total_installments ?? "-"}
                  </span>
                )}
                {entry.bank?.bank_institution && (
                  <span className="ml-2">Banco: {entry.bank.bank_institution}</span>
                )}
              </div>
            </div>

            <div className="flex items-center shrink-0">
              <div className="w-[150px] text-center">
                <div className={`text-[13px] leading-none font-semibold tabular-nums ${
                    positive ? "text-green-900" : "text-red-900"
                  }`}>
                  {formatCurrency(value)}
                </div>
              </div>

              <div className="w-[150px] text-center">
                <div className="text-[13px] leading-none font-semibold tabular-nums text-gray-900">
                  {formatCurrency(runningBalance)}
                </div>
              </div>

              <div className="w-8 flex justify-center">
                {}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryRow: React.FC<{
  displayMonth: string; // MM/YYYY
  monthlySum: number;
  runningBalance: number;
}> = ({ displayMonth, monthlySum, runningBalance }) => {
  const [m, y] = displayMonth.split("/");
  const monthDate = new Date(parseInt(y), parseInt(m) - 1, 1);

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-300">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 bg-gray-500 rounded-full" />
        <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
          {formatMonthYearSummary(monthDate.toISOString())}
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
            {runningBalance >= 0 ? "" : ""}
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
      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
    <div className="text-center">
      <p className="text-[13px] font-medium text-gray-800 mb-1">Nenhum realizado encontrado</p>
      <p className="text-[11px] text-gray-500">Tente ajustar os filtros para ver os dados</p>
    </div>
  </div>
);

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center py-6">
    <InlineLoader color="orange" />
  </div>
);

/* --------------------------------- Main ---------------------------------- */

const SettledEntriesTable = forwardRef<SettledEntriesTableHandle, Props>(
  ({ filters, bankIds, onSelectionChange }, ref) => {
    const { totalConsolidatedBalance, loading: loadingBanks } = useBanks(
      filters?.bank_id ?? bankIds
    );

    const [entries, setEntries] = useState<SettledEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);

    const { selectedIds, handleSelectRow, handleSelectAll, clearSelection } =
      useShiftSelect(entries);

    useImperativeHandle(ref, () => ({ clearSelection }), [clearSelection]);

    // keep latest refs
    const latest = useRef<{
      filters: EntryFilters | undefined;
      nextCursor: string | null;
      isFetching: boolean;
    }>({ filters, nextCursor, isFetching });

    useEffect(() => {
      latest.current = { filters, nextCursor, isFetching };
    }, [filters, nextCursor, isFetching]);

    // Notify parent selection
    useEffect(() => {
      const rows = entries.filter((e) => selectedIds.includes(e.id));
      onSelectionChange?.(selectedIds, rows);
    }, [selectedIds, entries, onSelectionChange]);

    const fetchEntries = useCallback(
      async (reset = false) => {
        if (latest.current.isFetching) return;

        const currentFilters = latest.current.filters;
        const cursorParam = reset ? {} : { cursor: latest.current.nextCursor ?? undefined };

        const glaParam = currentFilters?.general_ledger_account_id?.length
          ? currentFilters.general_ledger_account_id.join(",")
          : undefined;
        const bankParam = currentFilters?.bank_id?.length
          ? currentFilters.bank_id.join(",")
          : undefined;

        const payload = {
          ...cursorParam,
          ...currentFilters,
          general_ledger_account_id: glaParam,
          bank_id: bankParam,
        };

        setIsFetching(true);
        if (reset) setLoading(true);
        else setLoadingMore(true);

        try {
          const { data } = await api.getSettledEntries(payload);
          const mapped: SettledEntry[] = data.results
            .map((d: SettledEntry) => d)
            .filter((e: SettledEntry) => !e.transference_correlation_id);

          setEntries((prev) =>
            reset ? mapped : [...prev, ...mapped.filter((e) => !prev.some((p) => p.id === e.id))]
          );
          setNextCursor(getCursorFromUrl(data.next));
          setHasMore(Boolean(data.next));
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erro ao buscar dados.");
        } finally {
          setLoading(false);
          setLoadingMore(false);
          setIsFetching(false);
        }
      },
      []
    );

    useEffect(() => {
      fetchEntries(true);
    }, [filters, fetchEntries]);

    // Inner scroller like CashFlow
    const scrollerRef = useRef<HTMLDivElement>(null);

    const handleInnerScroll = useCallback(() => {
      const el = scrollerRef.current;
      if (!el || isFetching || !hasMore) return;
      const threshold = 150;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
      if (nearBottom) fetchEntries();
    }, [isFetching, hasMore, fetchEntries]);

    // If first page doesn't fill container, fetch again
    useEffect(() => {
      const el = scrollerRef.current;
      if (!el) return;
      if (!loading && hasMore && el.scrollHeight <= el.clientHeight + 50) {
        fetchEntries();
      }
    }, [loading, hasMore, entries.length, fetchEntries]);

    // Build rows with monthly summaries and reverse running balance
    const rows: TableRow[] = useMemo(() => {
      if (loadingBanks || !entries.length) return [];

      // reverse-walk to get "running balance at that point in history"
      let revBal = totalConsolidatedBalance ?? 0;
      const revBalances = new Array(entries.length).fill(0);
      for (let i = entries.length - 1; i >= 0; i--) {
        revBalances[i] = revBal;
        const amt = parseFloat(entries[i].amount) || 0;
        // Going backwards: undo the effect of the past movement
        // debit (payment) decreased balance back then => add it back
        // credit (receipt) increased balance back then => subtract it back
        revBal += entries[i].transaction_type === "debit" ? amt : -amt;
      }

      const out: TableRow[] = [];
      let currentMonth = "";
      let monthlySum = 0;

      entries.forEach((e, idx) => {
        const mKey = getMonthYear(e.settlement_due_date);
        const value = txValue(e);

        if (currentMonth && currentMonth !== mKey) {
          out.push({
            id: `summary-${currentMonth}-${idx}`,
            type: "summary",
            displayMonth: currentMonth,
            monthlySum,
            runningBalance: revBalances[idx - 1],
          });
          monthlySum = 0;
        }
        if (!currentMonth || currentMonth !== mKey) currentMonth = mKey;

        monthlySum += value;

        out.push({
          id: `entry-${e.id}`,
          type: "entry",
          entry: e,
          runningBalance: revBalances[idx],
        });

        if (idx === entries.length - 1) {
          out.push({
            id: `summary-${currentMonth}-final`,
            type: "summary",
            displayMonth: currentMonth,
            monthlySum,
            runningBalance: revBalances[idx],
          });
        }
      });

      return out;
    }, [entries, totalConsolidatedBalance, loadingBanks]);

    if (error) {
      return (
        <div className="border border-gray-300 rounded-md bg-white overflow-hidden">
          <div className="flex flex-col items-center justify-center py-8 px-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[13px] font-medium text-red-800 mb-1">Erro ao carregar dados</p>
              <p className="text-[11px] text-red-600 mb-3">{error}</p>
              <button
                onClick={() => fetchEntries(true)}
                className="text-[11px] font-semibold border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <section
        aria-label="Entradas liquidadas"
        className="border border-gray-300 rounded-md bg-white overflow-hidden h-full flex flex-col"
      >
        {loading && !entries.length ? (
          <LoadingSpinner />
        ) : (
          <>
            <TableHeader
              selectedCount={selectedIds.length}
              totalCount={entries.length}
              onSelectAll={handleSelectAll}
            />

            <div
              ref={scrollerRef}
              onScroll={handleInnerScroll}
              className="flex-1 min-h-0 overflow-y-auto"
            >
              {rows.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="divide-y divide-gray-200">
                  {rows.map((r) => {
                    if (r.type === "entry") {
                      const is = selectedIds.includes(r.entry.id);
                      return (
                        <EntryRow
                          key={r.id}
                          entry={r.entry}
                          runningBalance={r.runningBalance}
                          isSelected={is}
                          onSelect={handleSelectRow}
                        />
                      );
                    }
                    return (
                      <SummaryRow
                        key={r.id}
                        displayMonth={r.displayMonth}
                        monthlySum={r.monthlySum}
                        runningBalance={r.runningBalance}
                      />
                    );
                  })}

                  {loadingMore && (
                    <div className="py-3 flex items-center justify-center" role="status" aria-live="polite">
                      <InlineLoader color="orange" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    );
  }
);

export default SettledEntriesTable;
