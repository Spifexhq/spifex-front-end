/**
 * CashFlowTable.tsx
 *
 * This component renders a table displaying cash flow entries.
 * It fetches data from an API, sorts entries by due date (ascending),
 * and calculates a running balance.
 *
 * Features:
 * - Fetches and parses financial entries
 * - Orders entries by due date (earliest first)
 * - Allows multi-selection with Shift key support
 * - Calculates and displays a cumulative balance
 * - Displays positive amounts for "credit" transactions and negative for "debit"
 * - Inserts a monthly summary row after the last entry of each month
 *
 * Dependencies:
 * - useRequests: API hook for fetching data
 * - useShiftSelect: Custom hook for multi-selection logic
 * - parseListResponse: Utility function for API response parsing
 */

import React, { useEffect, useState } from 'react';
import { useRequests } from '@/api/requests';

import { Entry } from '@/models/Entries/Entry';
import { parseListResponse } from '@/utils/parseListResponse';
import { useShiftSelect } from '@/hooks/useShiftSelect';

import { InlineLoader } from '@/components/Loaders';
import Checkbox from '@/components/Checkbox';
import Button from '../Button';

const PAGE_SIZE = 100;

const CashFlowTable: React.FC = () => {
  const { getEntries } = useRequests();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // This state will hold an array of "render rows", which can be either
  // a normal entry or a monthly summary row.
  const [tableRows, setTableRows] = useState<
    Array<{
      isSummary: boolean;
      entry?: Entry;
      monthlySum?: number;
      runningBalance?: number;
      displayMonth?: string;
    }>
  >([]);

  const { selectedIds, handleSelectRow, handleSelectAll } = useShiftSelect(entries);

  // Fetch and sort entries
  useEffect(() => {
    async function fetchEntries() {
      try {
        const response = await getEntries();
        const parsed = parseListResponse<Entry>(response, 'entries');

        // Sort entries by due date (ascending)
        const sortedEntries = parsed.sort((a, b) => {
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });

        setEntries(sortedEntries);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error fetching data.';
        console.error('Error when searching for entries:', message);
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchEntries();
  }, [getEntries]);

  /**
   * Build table rows, grouping by month. After each month's entries, 
   * insert a summary row that shows the monthly total and the running balance 
   * at the end of that month.
   */
  useEffect(() => {
    if (!entries.length) {
      setTableRows([]);
      return;
    }

    let currentMonth = '';
    let monthlySum = 0;
    let runningBalance = 0;

    const newTableRows: Array<{
      isSummary: boolean;
      entry?: Entry;
      monthlySum?: number;
      runningBalance?: number;
      displayMonth?: string;
    }> = [];

    // Format the date as mm/yyyy (e.g., "01/2025")
    const getMonthYear = (dateStr: string) => {
      const date = new Date(dateStr);
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const y = date.getFullYear();
      return `${m}/${y}`;
    };

    entries.forEach((entry, index) => {
      const amount = parseFloat(entry.amount);
      const transactionValue = entry.transaction_type === 'credit' ? amount : -amount;
      const entryMonth = getMonthYear(entry.due_date);

      // If we moved to a new month, push the previous month's summary row
      if (currentMonth && currentMonth !== entryMonth) {
        newTableRows.push({
          isSummary: true,
          monthlySum,
          runningBalance,
          displayMonth: currentMonth,
        });
        monthlySum = 0;
      }

      // Update current month if needed
      if (!currentMonth || currentMonth !== entryMonth) {
        currentMonth = entryMonth;
      }

      monthlySum += transactionValue;
      runningBalance += transactionValue;

      // Push the entry as a normal row
      newTableRows.push({
        isSummary: false,
        entry,
        runningBalance,
      });

      // Push final summary row at the end of entries
      if (index === entries.length - 1) {
        newTableRows.push({
          isSummary: true,
          monthlySum,
          runningBalance,
          displayMonth: currentMonth,
        });
      }
    });

    setTableRows(newTableRows);
  }, [entries]);

  const fetchEntries = async (reset = false) => {
    if (!hasMore || isFetching) return;

    setIsFetching(true);

    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await getEntries(PAGE_SIZE, reset ? 0 : offset);
      const parsed = parseListResponse<Entry>(response, 'entries');

      // Ensures records are ordered correctly
      const sortedEntries = [...(reset ? [] : entries), ...parsed].sort(
        (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      );

      setTimeout(() => { // 🔥 Force a 3 second delay
        setEntries(sortedEntries);
        setOffset(prev => reset ? PAGE_SIZE : prev + PAGE_SIZE);
        setHasMore(parsed.length === PAGE_SIZE);
        setLoading(false);
        setLoadingMore(false);
        setIsFetching(false);
      }, 1000);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar dados.';
      console.error('Erro ao buscar lançamentos:', message);
      setError(message);
      setLoading(false);
      setLoadingMore(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchEntries(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detects scroll at the end of the table to load more data
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

  if (loading) return <InlineLoader color="orange" className="w-10 h-10" />;
  if (error) return <div>{error}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 overflow-hidden rounded-t-2xl">
        <thead className="bg-gray-100 rounded-t-2xl">
          <tr>
            {/* Select All Checkbox */}
            <th className="w-[5%] px-3 py-3 text-center">
              <div className="flex justify-center items-center h-full">
                <Checkbox
                  checked={
                    // Compare selectedIds with the count of normal entry rows
                    selectedIds.length === entries.length && entries.length > 0
                  }
                  onClick={() => handleSelectAll()}
                />
              </div>
            </th>
            <th className="w-[15%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              Vencimento
            </th>
            <th className="w-[20%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              Descrição
            </th>
            <th className="w-[20%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              Observação
            </th>
            <th className="w-[5%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              Parcela
            </th>
            <th className="w-[15%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              Valor
            </th>
            <th className="w-[15%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              Saldo
            </th>
            <th className="w-[5%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tableRows.map((row, index) => {
            if (!row.isSummary && row.entry) {
              // Normal entry row
              const entry = row.entry;
              const isSelected = selectedIds.includes(entry.id);
              const amount = parseFloat(entry.amount);
              const value = entry.transaction_type === 'debit' ? -amount : amount;
              const balance = row.runningBalance || 0;

              return (
                <tr key={entry.id} className="hover:bg-gray-50 text-[14px]">
                  <td className="w-[5%] px-3 py-2 text-center align-middle">
                    <Checkbox
                      checked={isSelected}
                      onClick={(e) => handleSelectRow(entry.id, e)}
                    />
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    {entry.due_date}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{entry.description}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {entry.observation || '-'}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    {`${entry.current_installment}/${entry.total_installments}`}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    {value.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <span>
                      {balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Button variant='common' style={{ padding: "10px", borderRadius: "8px" }}>
                      <img
                        alt="Editar"
                        height={12} width={12}
                        src="src/assets/Icons/tools/edit.svg"
                      />
                    </Button>
                  </td>
                </tr>
              );
            }

            // Monthly summary row with a smaller height (using reduced padding)
            const { monthlySum = 0, runningBalance = 0, displayMonth } = row;
            return (
              <tr key={`summary-${index}`} className="bg-gray-100 text-[10px]">
                <td colSpan={5} className="px-4 py-1 font-semibold text-left">
                  {displayMonth}
                </td>
                <td colSpan={1} className="px-3 py-1 text-center font-semibold whitespace-nowrap">
                  {monthlySum.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </td>
                <td className="px-3 py-1 text-center font-semibold whitespace-nowrap">
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
          })}
        </tbody>
      </table>
      {loadingMore && <InlineLoader color="orange" className="w-8 h-8 mx-auto my-2" />}
    </div>
  );
};

export default CashFlowTable;
