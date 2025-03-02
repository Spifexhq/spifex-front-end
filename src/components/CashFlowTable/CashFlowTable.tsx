/**
 * CashFlowTable.tsx
 *
 * Renders a table of cash flow or settled entries with pagination + infinite scroll.
 * Receives optional filters as props (start_date, end_date, etc.).
 *
 * Features:
 * - Fetches data from an API with pagination
 * - Allows multiple filters
 * - Sorts entries by due_date or settlement_due_date (depending on tableType)
 * - Builds monthly summary rows
 * - Multi-selection with Shift key support
 * - Infinite scroll
 */

import React, { useEffect, useState } from 'react';
import { useRequests } from '@/api/requests';

import { CashFlowFilters, Entry, SettledEntry } from '@/models/Entries';
import { parseListResponse } from '@/utils/parseListResponse';
import { useShiftSelect } from '@/hooks/useShiftSelect';

import { InlineLoader } from '@/components/Loaders';
import Checkbox from '@/components/Checkbox';
import Button from '@/components/Button';

const PAGE_SIZE = 100;

interface CashFlowTableProps {
  filters?: CashFlowFilters;
  tableType: 'cash_flow' | 'settled';
}

/**
 * Helper: get the correct date field from Entry | SettledEntry
 */
function getDateField(
  entry: Entry | SettledEntry,
  tableType: 'cash_flow' | 'settled'
): string {
  return tableType === 'cash_flow'
    ? (entry as Entry).due_date
    : (entry as SettledEntry).settlement_due_date;
}

/**
 * Helper: get numeric date for sorting
 */
function getDateForSorting(
  entry: Entry | SettledEntry,
  tableType: 'cash_flow' | 'settled'
): number {
  const dateStr =
    tableType === 'cash_flow'
      ? (entry as Entry).due_date
      : (entry as SettledEntry).settlement_due_date;

  return new Date(dateStr).getTime();
}

const CashFlowTable: React.FC<CashFlowTableProps> = ({ filters, tableType }) => {
  const { getFilteredEntries, getFilteredSettledEntries } = useRequests();

  // Array of both Entry and SettledEntry
  const [entries, setEntries] = useState<Array<Entry | SettledEntry>>([]);

  const [tableRows, setTableRows] = useState<
    Array<{
      isSummary: boolean;
      entry?: Entry | SettledEntry;
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
      let response;
      if (tableType === 'cash_flow') {
        response = await getFilteredEntries(PAGE_SIZE, reset ? 0 : offset, filters);
      } else {
        response = await getFilteredSettledEntries(PAGE_SIZE, reset ? 0 : offset, filters);
      }

      // Adjust the parseListResponse key to your real API structure
      // e.g., 'entries' vs. 'settled_entries'
      const parsed = parseListResponse<Entry | SettledEntry>(response, 'entries');

      const combined = (reset ? [] : entries).concat(parsed);
      // Sort by the correct date field
      const sorted = combined.sort((a, b) => {
        return getDateForSorting(a, tableType) - getDateForSorting(b, tableType);
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

  useEffect(() => {
    fetchEntries(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, tableType]);

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
      entry?: Entry | SettledEntry;
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
      const dateStr = getDateField(entry, tableType);

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
  }, [entries, tableType]);

  // Show loader, errors, or table
  if (loading && !entries.length) {
    return <InlineLoader color="orange" className="w-10 h-10" />;
  }
  if (error) {
    return <div>{error}</div>;
  }

  // If tableType = settled, there's an extra column for 'Banco'
  const totalColumns = tableType === 'settled' ? 9 : 8;

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
            <th
              className={`px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider ${
                tableType === 'settled' ? 'w-[15%]' : 'w-[20%]'
              }`}
            >
              Descrição
            </th>
            <th
              className={`px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider ${
                tableType === 'settled' ? 'w-[15%]' : 'w-[20%]'
              }`}
            >
              Observação
            </th>
            <th className="w-[5%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              Parcela
            </th>
            {tableType === 'settled' && (
              <th className="w-[10%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                Banco
              </th>
            )}
            <th className="w-[15%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              Valor
            </th>
            <th className="w-[15%] px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              Saldo
            </th>
            <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider" style={{ maxWidth: '68px', minWidth: '68px' }}></th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {tableRows.length === 0 ? (
            <tr>
              <td colSpan={totalColumns} className="px-4 py-3 text-center text-gray-500">
                Nenhum dado disponível
              </td>
            </tr>
          ) : (
            tableRows.map((row, idx) => {
              if (!row.isSummary && row.entry) {
                const entry = row.entry;
                const isSelected = selectedIds.includes(entry.id);

                // Depending on tableType, show either due_date or settlement_due_date
                const dateField = getDateField(entry, tableType);

                // Show the bank property if it's settled. Usually you'd display bank.name or similar.
                let bankName = '';
                if (tableType === 'settled') {
                  const settled = entry as SettledEntry;
                  // e.g., if `Bank` has a `name` or `title` property
                  // Just ensure it's a string:
                  bankName = settled.bank?.bank_institution ?? '-';
                }

                const amountNum = parseFloat(entry.amount);
                const value =
                  entry.transaction_type === 'debit' ? -amountNum : amountNum;
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
                      {dateField}
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
                    {tableType === 'settled' && (
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        {bankName}
                      </td>
                    )}
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
              // For the summary row, we must handle colSpan carefully
              // Example: If 'settled', we have 9 total columns, but 1 is an action column
              // so we might break up colSpan to make sense visually.
              return (
                <tr key={`summary-${idx}`} className="bg-gray-50 text-[10px]">
                  {/* Common scenario: the left chunk + the monthlySum + the runningBalance + empty cell */}
                  {/* Adjust as needed for your design */}
                  <td colSpan={tableType === 'settled' ? 5 : 5} className="px-4 py-1 font-semibold text-left">
                    {displayMonth}
                  </td>

                  {/* If it's settled, skip 1 more column for 'Banco' */}
                  {tableType === 'settled' && <td></td>}

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

export default CashFlowTable;

