/**
 * SettledEntriesTable.tsx
 *
 * Renders a table of settled entries with pagination + infinite scroll.
 * Receives optional filters as props (start_date, end_date, etc.).
 *
 * Features:
 * - Fetches data from an API with pagination
 * - Allows multiple filters
 * - Sorts entries by settlement_due_date
 * - Builds monthly summary rows
 * - Multi-selection with Shift key support
 * - Infinite scroll
 */

import React, { useEffect, useState } from 'react';
import { useRequests } from '@/api/requests';

import { CashFlowFilters, SettledEntry } from '@/models/Entries';
import { parseApiList } from 'src/utils/parseApiList';
import { useShiftSelect } from '@/hooks/useShiftSelect';
import { useBanks } from '@/hooks/useBanks';

import { InlineLoader } from '@/components/Loaders';
import Checkbox from '@/components/Checkbox';
import Button from '@/components/Button';

const PAGE_SIZE = 100;

interface SettledEntriesTableProps {
  filters?: CashFlowFilters;
  bankIds?: number[];
  onSelectionChange?: (ids: number[]) => void;
}

const SettledEntriesTable: React.FC<SettledEntriesTableProps> = ({ filters, bankIds, onSelectionChange }) => {
  const { getFilteredSettledEntries } = useRequests();
  const [entries, setEntries] = useState<Array<SettledEntry>>([]);
  const [tableRows, setTableRows] = useState<
    Array<{
      isSummary: boolean;
      entry?: SettledEntry;
      monthlySum?: number;
      runningBalance?: number;
      displayMonth?: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedIds, handleSelectRow, handleSelectAll } = useShiftSelect(entries);
  const { totalConsolidatedBalance, loading: loadingBanks } = useBanks(bankIds);

  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedIds);
    }
  }, [selectedIds, onSelectionChange]);

  /**
   * Fetch paginated settled entries from the API
   */
  const fetchEntries = async (reset = false) => {
    if (isFetching) return;
    if (!hasMore && !reset) return;

    setIsFetching(true);

    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await getFilteredSettledEntries(
        PAGE_SIZE,
        reset ? 0 : offset,
        filters
      );
      // Adjust the parseApiList key to match the actual API response object key
      const parsed = parseApiList<SettledEntry>(response, 'entries');

      const combined = (reset ? [] : entries).concat(parsed);
      // Sort by settlement_due_date & settlement_date
      const sorted = combined.sort((a, b) => {
        const dueDiff =
          new Date(a.settlement_due_date).getTime() -
          new Date(b.settlement_due_date).getTime();

        if (dueDiff !== 0) return dueDiff;

        return (
          new Date(a.settlement_date).getTime() -
          new Date(b.settlement_date).getTime()
        );
      });

      setEntries(sorted);
      setOffset((prev) => (reset ? PAGE_SIZE : prev + PAGE_SIZE));
      setHasMore(parsed.length === PAGE_SIZE);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar dados.';
      console.error('Erro ao buscar lançamentos:', message);
      setError(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsFetching(false);
    }
  };

  // Trigger fetch on mount or whenever filters change
  useEffect(() => {
    fetchEntries(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, hasMore, isFetching]);

  // Build table rows (normal + monthly summary)
  useEffect(() => {
    if (loadingBanks) return;

    if (!entries.length) {
      setTableRows([]);
      return;
    }
  
    // -------------------------------------------------
    // 1. Calculate REVERSE BALANCE from bottom (most recent) to top (oldest)
    // -------------------------------------------------
    let runningReverseBalance = totalConsolidatedBalance || 0;
    const reversedBalances: number[] = new Array(entries.length).fill(0);
  
    // Iterate from the end to the beginning (highest index -> 0)
    for (let i = entries.length - 1; i >= 0; i--) {
      // Before modifying runningReverseBalance, store the current balance for this row
      reversedBalances[i] = runningReverseBalance;
  
      const e = entries[i];
      const amountNum = parseFloat(e.amount);
  
      // If it's 'credit', subtract. If it's 'debit', add.
      if (e.transaction_type === 'credit') {
        runningReverseBalance -= amountNum;
      } else {
        runningReverseBalance += amountNum;
      }
      
      reversedBalances[i] = runningReverseBalance;
    }
  
    // -------------------------------------------------
    // 2. (Optional) Calculate the monthly summary as before,
    //    but now we will not use this runningBalance for the "Balance" column.
    //    If you NO LONGER need the monthly summary, you can remove it.
    // -------------------------------------------------
    let currentMonth = '';
    let monthlySum = 0;
    let ascendingBalance = 0; // if you want to keep the old "runningBalance"
    const newRows: Array<{
      isSummary: boolean;
      entry?: SettledEntry;
      monthlySum?: number;
      runningBalance?: number; // will now be the reversedBalance
      displayMonth?: string;
    }> = [];
  
    const getMonthYear = (dateStr: string) => {
      const date = new Date(dateStr);
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const y = date.getFullYear();
      return `${m}/${y}`;
    };
  
    entries.forEach((entry, index) => {
      const dateStr = entry.settlement_due_date;
      const entryMonth = getMonthYear(dateStr);
  
      const amountNum = parseFloat(entry.amount);
      const transactionValue =
        entry.transaction_type === 'credit' ? amountNum : -amountNum;
  
      // This is just for the monthly summary (optional)
      if (currentMonth && currentMonth !== entryMonth) {
        // When the month changes, push a summary row
        newRows.push({
          isSummary: true,
          monthlySum,
          runningBalance: ascendingBalance, 
          displayMonth: currentMonth,
        });
        monthlySum = 0;
      }
      if (!currentMonth || currentMonth !== entryMonth) {
        currentMonth = entryMonth;
      }
      monthlySum += transactionValue;
      ascendingBalance += transactionValue;
  
      // Create the regular row
      newRows.push({
        isSummary: false,
        entry,
        // Here we use the REVERSE BALANCE calculated in the previous step
        runningBalance: reversedBalances[index],
      });
  
      // If it's the last entry in the array, insert the final summary for the month
      if (index === entries.length - 1) {
        newRows.push({
          isSummary: true,
          monthlySum,
          runningBalance: ascendingBalance,
          displayMonth: currentMonth,
        });
      }
    });
  
    setTableRows(newRows);
  }, [entries, totalConsolidatedBalance, loadingBanks]);

  // Show loader, errors, or table
  if (loading && !entries.length) {
    return <InlineLoader color="orange" className="w-10 h-10" />;
  }
  
  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 overflow-hidden rounded-t-2xl">
        <thead className="bg-gray-100 text-[11px]">
          <tr className="text-gray-600 tracking-wider">
            <th className="w-[5%] px-2 py-1 text-center font-semibold">
              <div className="flex justify-center items-center h-full">
                <Checkbox
                  checked={selectedIds.length === entries.length && entries.length > 0}
                  onChange={() => handleSelectAll()}
                  size={"sm"}
                />
              </div>
            </th>
            <th className="w-[15%] px-2 py-1 text-center font-semibold">Vencimento</th>
            <th className="w-[15%] px-2 py-1 text-center font-semibold">Descrição</th>
            <th className="w-[5%] px-2 py-1 text-center font-semibold">Parcela</th>
            <th className="w-[10%] px-2 py-1 text-center font-semibold">Banco</th>
            <th className="w-[15%] px-2 py-1 text-center font-semibold">Valor</th>
            <th className="w-[15%] px-2 py-1 text-center font-semibold">Saldo</th>
            <th className="px-2 py-1 text-center font-semibold" style={{ maxWidth: '68px', minWidth: '68px' }}></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200 text-[12px]">
          {tableRows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-3 text-center text-gray-500">
                Nenhum dado disponível
              </td>
            </tr>
          ) : (
            tableRows.map((row, idx) => {
              if (!row.isSummary && row.entry) {
                const entry = row.entry;
                const isSelected = selectedIds.includes(entry.id);

                const amountNum = parseFloat(entry.amount);
                const value =
                  entry.transaction_type === 'debit' ? -amountNum : amountNum;
                const bankName = entry.bank?.bank_institution ?? '-';

                return (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-2 py-1 text-center">
                      <Checkbox
                        checked={isSelected}
                        onClick={(e) => handleSelectRow(entry.id, e)}
                        size={"sm"}
                      />
                    </td>
                    <td className="px-2 py-1 text-center whitespace-nowrap">
                      {entry.settlement_due_date}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">{entry.description}</td>
                    <td className="px-2 py-1 text-center whitespace-nowrap">
                      {`${entry.current_installment ?? '-'} / ${entry.total_installments ?? '-'}`}
                    </td>
                    <td className="px-2 py-1 text-center whitespace-nowrap">{bankName}</td>
                    <td className="px-2 py-1 text-center whitespace-nowrap">
                      {value.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>
                    <td className="px-2 py-1 text-center whitespace-nowrap">
                      {row.runningBalance?.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <Button
                        variant="common"
                        style={{ padding: '8px', borderRadius: '6px' }}
                      >
                        <img
                          alt="Editar"
                          height={12}
                          width={12}
                          src="src/assets/Icons/tools/edit.svg"
                        />
                      </Button>
                    </td>
                  </tr>
                );
              }

              // Summary row
              const { monthlySum = 0, runningBalance = 0, displayMonth } = row;
              return (
                <tr key={`summary-${idx}`} className="bg-gray-50 text-[9px]">
                  <td colSpan={5} className="px-2 py-1 font-semibold text-left">
                    {displayMonth}
                  </td>
                  <td></td>
                  <td className="px-2 py-1 text-center font-semibold whitespace-nowrap">
                    {monthlySum.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                  <td className="px-2 py-1 text-center font-semibold whitespace-nowrap">
                    <span className={runningBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {runningBalance >= 0 ? '+' : ''}
                      {runningBalance.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                  </td>
                  <td></td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {loadingMore && <InlineLoader color="orange" className="w-8 h-8 mx-auto my-2" />}
    </div>
  );
};

export default SettledEntriesTable;
