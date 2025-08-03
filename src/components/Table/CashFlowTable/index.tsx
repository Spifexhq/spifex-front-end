/* src/components/Table/CashFlowTable/index.tsx */

import React, { useEffect, useState } from "react";
import { api } from "@/api/requests2";

import { EntryFilters, Entry } from "src/models/Entries/domain";
import { useShiftSelect } from "@/hooks/useShiftSelect";
import { useBanks } from "@/hooks/useBanks";

import { InlineLoader } from "@/components/Loaders";
import Checkbox from "@/components/Checkbox";
import Button from "@/components/Button";
import { getCursorFromUrl } from "src/utils/cursors";

const mapEntry = (dto: Entry): Entry => dto;

interface CashFlowTableProps {
  filters?: EntryFilters;
  onEdit(entry: Entry): void;
  onSelectionChange?: (ids: number[], entries: Entry[]) => void;
}

const CashFlowTable: React.FC<CashFlowTableProps> = ({ filters, onEdit, onSelectionChange }) => {
  const { totalConsolidatedBalance, loading: loadingBanks } = useBanks(filters?.bank_id);
  const [entries, setEntries] = useState<Array<Entry>>([]);
  const [tableRows, setTableRows] = useState<
    Array<{
      isSummary: boolean;
      entry?: Entry;
      monthlySum?: number;
      runningBalance?: number;
      displayMonth?: string;
      summaryId?: string;
    }>
  >([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const { selectedIds, handleSelectRow, handleSelectAll } = useShiftSelect(entries);

  useEffect(() => {
    const selectedRows = entries.filter(e => selectedIds.includes(e.id));
    onSelectionChange?.(selectedIds, selectedRows);
  }, [selectedIds, entries, onSelectionChange]);

  /* ------------------------------------------------------------------
   *  Fetch
   * ------------------------------------------------------------------ */
  const fetchEntries = async (reset = false) => {
    if (isFetching) return;

    const cursorParam = reset ? {} : { cursor: nextCursor ?? undefined };

    const glaParam = filters?.general_ledger_account_id?.length
      ? filters.general_ledger_account_id.join(',')
      : undefined;

    const payload = {
      ...cursorParam,
      ...filters,
      general_ledger_account_id: glaParam,
      bank_id: undefined,
    };

    setIsFetching(true);
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const { data } = await api.getEntries(payload);
      const mapped = data.results.map(mapEntry);
      setEntries(prev =>
        reset
          ? mapped
          : [...prev, ...mapped.filter(e => !prev.some(p => p.id === e.id))]
      );
      setNextCursor(getCursorFromUrl(data.next));
      setHasMore(!!data.next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar dados.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsFetching(false);
    }
  };

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
  }, [hasMore, isFetching]);

  /* ------------------------------------------------------------------
   *  Build rows
   * ------------------------------------------------------------------ */

  // Build table rows (normal + monthly summary)
  useEffect(() => {
    if (loadingBanks) return;
    
    if (!entries.length) {
      setTableRows([]);
      return;
    }

    let currentMonth = '';
    let monthlySum = 0;
    let runningBalance = totalConsolidatedBalance;

    const newRows: Array<{
      isSummary: boolean;
      entry?: Entry;
      monthlySum?: number;
      runningBalance?: number;
      displayMonth?: string;
      summaryId?: string;
    }> = [];

    const getMonthYear = (dateStr: string) => {
      const date = new Date(dateStr);
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const y = date.getFullYear();
      return `${m}/${y}`;
    };

    entries.forEach((entry, index) => {
      const dateStr = entry.due_date;

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
          summaryId: `summary-${currentMonth}-${index}`,
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

      if (index === entries.length - 1) {
        newRows.push({
          isSummary: true,
          monthlySum,
          runningBalance,
          displayMonth: currentMonth,
          summaryId: `summary-${currentMonth}-final`,
        });
      }
    });

    setTableRows(newRows);
  }, [entries, totalConsolidatedBalance, loadingBanks]);

  /* ------------------------------------------------------------------
   *  Render
   * ------------------------------------------------------------------ */

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
            <th className="w-[40%] px-2 py-1 text-center font-semibold">Descrição</th>
            <th className="w-[5%] px-2 py-1 text-center font-semibold">Parcela</th>
            <th className="w-[15%] px-2 py-1 text-center font-semibold">Valor</th>
            <th className="w-[15%] px-2 py-1 text-center font-semibold">Saldo</th>
            <th className="px-2 py-1 text-center font-semibold" style={{ maxWidth: '68px', minWidth: '68px' }}></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200 text-[12px]">
          {tableRows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-3 text-center text-gray-500">
                Nenhum dado disponível
              </td>
            </tr>
          ) : (
            tableRows.map((row) => {
              if (!row.isSummary && row.entry) {
                const entry = row.entry;
                const isSelected = selectedIds.includes(entry.id);

                const amountNum = parseFloat(entry.amount);
                const value =
                  entry.transaction_type === 'debit' ? -amountNum : amountNum;
                const balance = row.runningBalance || 0;

                return (
                  <tr key={`entry-${entry.id}`} className="hover:bg-gray-50">
                    <td className="w-[5%] px-2 py-1 text-center align-middle">
                      <Checkbox
                        checked={isSelected}
                        onClick={(e) => handleSelectRow(entry.id, e)}
                        size={"sm"}
                      />
                    </td>
                    <td className="px-2 py-1 text-center whitespace-nowrap">{new Date(entry.due_date).toLocaleDateString("pt-BR")}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{entry.description}</td>
                    <td className="px-2 py-1 text-center whitespace-nowrap">
                      {`${entry.current_installment ?? '-'} / ${entry.total_installments ?? '-'}`}
                    </td>
                    <td className="px-2 py-1 text-center whitespace-nowrap">
                      {value.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>
                    <td className="px-2 py-1 text-center whitespace-nowrap">
                      {balance.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </td>
                    <td className="px-2 py-1 text-center">
                    <Button
                      variant="common"
                      style={{ padding: '8px', borderRadius: '6px' }}
                      onClick={() => onEdit(entry)}
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
                <tr key={row.summaryId} className="bg-gray-50 text-[9px]">
                  <td colSpan={4} className="px-2 py-1 font-semibold text-left">
                    {displayMonth}
                  </td>
                  <td className="px-2 py-1 text-center font-semibold whitespace-nowrap">
                    {monthlySum.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </td>
                  <td className="px-2 py-1 text-center font-semibold whitespace-nowrap">
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
