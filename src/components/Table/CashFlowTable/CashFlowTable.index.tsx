/* src/components/Table/CashFlowTable/index.tsx */

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { api } from "src/api/requests";
import { EntryFilters, Entry } from "src/models/entries/domain";
import { useShiftSelect } from "@/hooks/useShiftSelect";
import { useBanks } from "@/hooks/useBanks";
import { InlineLoader } from "@/components/Loaders";
import Checkbox from "@/components/Checkbox";
import Button from "@/components/Button";
import { getCursorFromUrl } from "src/lib/list";

// Types
interface TableRow {
  id: string;
  type: 'entry' | 'summary';
  entry?: Entry;
  monthlySum?: number;
  runningBalance?: number;
  displayMonth?: string;
}

interface CashFlowTableProps {
  filters?: EntryFilters;
  onEdit(entry: Entry): void;
  onSelectionChange?: (ids: number[], entries: Entry[]) => void;
}

// Utility functions
const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("pt-BR");
};

const getMonthYear = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${year}`;
};

const formatMonthYearSummary = (dateStr: string): string => {
  const date = new Date(dateStr);
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${month}, ${year}`;
};

const getTransactionValue = (entry: Entry): number => {
  const amount = parseFloat(entry.amount);
  return entry.transaction_type === 'credit' ? amount : -amount;
};

// Components
const TableHeader: React.FC<{
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
}> = ({ selectedCount, totalCount, onSelectAll }) => (
  <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-300 shrink-0">
    <div className="flex items-center gap-3">
      <Checkbox
        checked={selectedCount === totalCount && totalCount > 0}
        onChange={onSelectAll}
        size="sm"
      />
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-gray-600">Lançamentos</span>
        <span className="text-[10px] text-gray-500">({totalCount})</span>
        {selectedCount > 0 && (
          <span className="text-[10px] text-blue-600 font-medium">
            {selectedCount} selecionado{selectedCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
    <div className="hidden md:flex items-center text-[10px] uppercase tracking-wide text-gray-600">
      <div className="w-[150px] text-center">Valor</div>
      <div className="w-[150px] text-center">Saldo</div>
      <div className="w-[32px]"></div>
    </div>
  </div>
);

const EntryRow: React.FC<{
  entry: Entry;
  runningBalance: number;
  isSelected: boolean;
  onSelect: (id: number, event: React.MouseEvent) => void;
  onEdit: (entry: Entry) => void;
}> = ({ entry, runningBalance, isSelected, onSelect, onEdit }) => {
  const transactionValue = getTransactionValue(entry);
  const isPositive = transactionValue >= 0;
  
  return (
    <div className="group flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 focus-within:bg-gray-50 border-b border-gray-200">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Checkbox
          checked={isSelected}
          onClick={(e) => onSelect(entry.id, e)}
          size="sm"
        />
        
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-gray-800 font-medium truncate leading-tight">
                {entry.description}
              </div>
              <div className="text-[10px] text-gray-500 truncate leading-tight mt-0.5">
                Venc: {formatDate(entry.due_date)}
                {(entry.current_installment || entry.total_installments) && (
                  <span className="ml-2">
                    Parcela {entry.current_installment ?? '-'}/{entry.total_installments ?? '-'}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center shrink-0">
              <div className="w-[150px] text-center">
                <div className={`text-[13px] font-semibold tabular-nums ${
                  isPositive ? 'text-green-900' : 'text-red-900'
                }`}>
                  {formatCurrency(transactionValue)}
                </div>
              </div>
              
              <div className="w-[150px] text-center">
                <div className="text-[13px] font-semibold tabular-nums text-gray-900">
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
  // Convert MM/YYYY format to proper month name format
  const [month, year] = displayMonth.split('/');
  const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const formattedMonth = formatMonthYearSummary(monthDate.toISOString());
  
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-300">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 bg-gray-500 rounded-full"></div>
        <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
          {formattedMonth}
        </span>
      </div>
      
      <div className="flex items-center">
        <div className="w-[150px] text-center">
          <div className={`text-[11px] font-semibold tabular-nums ${
            monthlySum >= 0 ? 'text-green-900' : 'text-red-900'
          }`}>
            {formatCurrency(monthlySum)}
          </div>
        </div>
        
        <div className="w-[150px] text-center">
          <div className="text-[11px] font-semibold tabular-nums text-gray-900">
            {runningBalance >= 0 ? '+' : ''}
            {formatCurrency(runningBalance)}
          </div>
        </div>
        
        <div className="w-[32px]"></div> {/* Espaço para alinhamento com botão */}
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
      <p className="text-[13px] font-medium text-gray-800 mb-1">Nenhum lançamento encontrado</p>
      <p className="text-[11px] text-gray-500">Tente ajustar os filtros para ver os dados</p>
    </div>
  </div>
);

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center py-6">
    <InlineLoader color="orange" />
  </div>
);

// Main Component
const CashFlowTable: React.FC<CashFlowTableProps> = ({ 
  filters, 
  onEdit, 
  onSelectionChange 
}) => {
  const { totalConsolidatedBalance, loading: loadingBanks } = useBanks(filters?.bank_id);
  
  // State
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const { selectedIds, handleSelectRow, handleSelectAll } = useShiftSelect(entries);

  const latest = useRef<{
    filters: EntryFilters | undefined;
    nextCursor: string | null;
    isFetching: boolean;
  }>({ filters, nextCursor, isFetching });

  useEffect(() => {
    latest.current = { filters, nextCursor, isFetching };
  }, [filters, nextCursor, isFetching]);

  // Notify parent of selection changes
  useEffect(() => {
    const selectedRows = entries.filter(e => selectedIds.includes(e.id));
    onSelectionChange?.(selectedIds, selectedRows);
  }, [selectedIds, entries, onSelectionChange]);

  // API calls
  const fetchEntries = useCallback(async (reset = false) => {
    if (latest.current.isFetching) return;

    const currentFilters = latest.current.filters;
    const cursorParam = reset ? {} : { cursor: latest.current.nextCursor ?? undefined };
    const glaParam = currentFilters?.general_ledger_account_id?.length
      ? currentFilters.general_ledger_account_id.join(",")
      : undefined;

    const payload = {
      ...cursorParam,
      ...currentFilters,
      general_ledger_account_id: glaParam,
      bank_id: undefined,
    };

    setIsFetching(true);
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const { data } = await api.getEntries(payload);
      const mapped = data.results.map((dto: Entry) => dto);

      setEntries((prev) =>
        reset ? mapped : [...prev, ...mapped.filter((e) => !prev.some((p) => p.id === e.id))]
      );

      setNextCursor(getCursorFromUrl(data.next));
      setHasMore(!!data.next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar dados.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsFetching(false);
    }
  }, []);

  // Effects
  useEffect(() => {
    fetchEntries(true);
  }, [filters, fetchEntries]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 150 &&
        !isFetching &&
        hasMore
      ) {
        fetchEntries();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, isFetching, fetchEntries]);

  // Build table rows with monthly summaries
  const tableRows = useMemo(() => {
    if (loadingBanks || !entries.length) return [];

    let currentMonth = '';
    let monthlySum = 0;
    let runningBalance = totalConsolidatedBalance;
    const rows: TableRow[] = [];

    entries.forEach((entry, index) => {
      const transactionValue = getTransactionValue(entry);
      const entryMonth = getMonthYear(entry.due_date);

      // Add summary for previous month if we're starting a new month
      if (currentMonth && currentMonth !== entryMonth) {
        rows.push({
          id: `summary-${currentMonth}-${index}`,
          type: 'summary',
          monthlySum,
          runningBalance,
          displayMonth: currentMonth,
        });
        monthlySum = 0;
      }

      if (!currentMonth || currentMonth !== entryMonth) {
        currentMonth = entryMonth;
      }

      monthlySum += transactionValue;
      runningBalance += transactionValue;

      // Add entry row
      rows.push({
        id: `entry-${entry.id}`,
        type: 'entry',
        entry,
        runningBalance,
      });

      // Add final summary for last month
      if (index === entries.length - 1) {
        rows.push({
          id: `summary-${currentMonth}-final`,
          type: 'summary',
          monthlySum,
          runningBalance,
          displayMonth: currentMonth,
        });
      }
    });

    return rows;
  }, [entries, totalConsolidatedBalance, loadingBanks]);

  // Error state
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
    <section aria-label="Fluxo de caixa" className="border border-gray-300 rounded-md bg-white overflow-hidden h-full flex flex-col">
      {loading && !entries.length ? (
        <LoadingSpinner />
      ) : (
        <>
          <TableHeader
            selectedCount={selectedIds.length}
            totalCount={entries.length}
            onSelectAll={handleSelectAll}
          />
          
          <div className="flex-1 min-h-0 overflow-y-auto">
            {tableRows.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="divide-y divide-gray-200">
                {tableRows.map((row) => {
                  if (row.type === 'entry' && row.entry) {
                    const isSelected = selectedIds.includes(row.entry.id);
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

                  if (row.type === 'summary') {
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
            )}
          </div>
          
          {loadingMore && (
            <div className="border-t border-gray-300 py-3">
              <LoadingSpinner />
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default CashFlowTable;