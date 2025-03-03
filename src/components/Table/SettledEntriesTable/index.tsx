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
import { parseListResponse } from '@/utils/parseListResponse';
import { useShiftSelect } from '@/hooks/useShiftSelect';

import { InlineLoader } from '@/components/Loaders';
import Checkbox from '@/components/Checkbox';
import Button from '@/components/Button';

const PAGE_SIZE = 100;

interface SettledEntriesTableProps {
  filters?: CashFlowFilters;
}

const SettledEntriesTable: React.FC<SettledEntriesTableProps> = ({ filters }) => {
  const { getFilteredSettledEntries } = useRequests();

  // We'll store an array of SettledEntry objects here
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

  // Loading + pagination states
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-select hook
  const { selectedIds, handleSelectRow, handleSelectAll } = useShiftSelect(entries);

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
      // Adjust the parseListResponse key to match the actual API response object key
      const parsed = parseListResponse<SettledEntry>(response, 'entries');

      const combined = (reset ? [] : entries).concat(parsed);
      // Sort by settlement_due_date
      const sorted = combined.sort((a, b) => {
        return (
          new Date(a.settlement_due_date).getTime() -
          new Date(b.settlement_due_date).getTime()
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
    if (!entries.length) {
      setTableRows([]);
      return;
    }

    let currentMonth = '';
    let monthlySum = 0;
    let runningBalance = 0;

    const newRows: Array<{
      isSummary: boolean;
      entry?: SettledEntry;
      monthlySum?: number;
      runningBalance?: number;
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

      const amountNum = parseFloat(entry.amount);
      const transactionValue =
        entry.transaction_type === 'credit' ? amountNum : -amountNum;

      const entryMonth = getMonthYear(dateStr);

      // If it's a new month, push the summary for the previous one
      if (currentMonth && currentMonth !== entryMonth) {
        newRows.push({
          isSummary: true,
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

      newRows.push({
        isSummary: false,
        entry,
        runningBalance,
      });

      // At the last entry, push the final month's summary
      if (index === entries.length - 1) {
        newRows.push({
          isSummary: true,
          monthlySum,
          runningBalance,
          displayMonth: currentMonth,
        });
      }
    });

    setTableRows(newRows);
  }, [entries]);

  // Show loader, errors, or table
  if (loading && !entries.length) {
    return <InlineLoader color="orange" className="w-10 h-10" />;
  }

  if (error) {
    return <div>{error}</div>;
  }

  // We have 9 columns total: selection + (7 data columns) + action
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 overflow-hidden rounded-t-2xl">
        <thead className="bg-gray-100 rounded-t-2xl">
          <tr>
            <th className="w-[5%] px-3 py-3 text-center">
              <div className="flex justify-center items-center h-full">
                <Checkbox
                  checked={selectedIds.length === entries.length && entries.length > 0}
                  onChange={() => handleSelectAll()}
                />
              </div>
            </th>
            <th className="w-[15%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              Vencimento
            </th>
            <th className="w-[15%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              Descrição
            </th>
            <th className="w-[15%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              Observação
            </th>
            <th className="w-[5%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              Parcela
            </th>
            <th className="w-[10%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              Banco
            </th>
            <th className="w-[15%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              Valor
            </th>
            <th className="w-[15%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              Saldo
            </th>
            <th
              className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider"
              style={{ maxWidth: '68px', minWidth: '68px' }}
            ></th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {tableRows.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-3 text-center text-gray-500">
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
                const balance = row.runningBalance || 0;

                // Example: if 'bank_institution' is the best property for display
                const bankName = entry.bank?.bank_institution ?? '-';

                return (
                  <tr key={entry.id} className="hover:bg-gray-50 text-[14px]">
                    <td className="w-[5%] px-3 py-2 text-center align-middle">
                      <Checkbox
                        checked={isSelected}
                        onClick={(e) => handleSelectRow(entry.id, e)}
                      />
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {entry.settlement_due_date}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {entry.description}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {entry.observation || '-'}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {`${entry.current_installment ?? '-'} / ${
                        entry.total_installments ?? '-'
                      }`}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {bankName}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {value.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {balance.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        variant="common"
                        style={{ padding: '10px', borderRadius: '8px' }}
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
                <tr key={`summary-${idx}`} className="bg-gray-50 text-[10px]">
                  <td colSpan={5} className="px-4 py-1 font-semibold text-left">
                    {displayMonth}
                  </td>
                  {/* Extra TD for Banco */}
                  <td></td>
                  <td className="px-3 py-1 text-center font-semibold whitespace-nowrap">
                    {monthlySum.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                  <td className="px-3 py-1 text-center font-semibold whitespace-nowrap">
                    <span
                      className={runningBalance >= 0 ? 'text-green-600' : 'text-red-600'}
                    >
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
