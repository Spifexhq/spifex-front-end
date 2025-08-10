/* src/components/Table/SettledEntriesTable/index.tsx */

import React, { useEffect, useState } from 'react';
import { api } from 'src/api/requests';

import { EntryFilters, SettledEntry } from 'src/models/entries/domain';
import { useShiftSelect } from '@/hooks/useShiftSelect';
import { useBanks } from '@/hooks/useBanks';
import { getCursorFromUrl } from "src/lib/list";

import { InlineLoader } from '@/components/Loaders';
import Checkbox from '@/components/Checkbox';
import Button from '@/components/Button';

const mapEntry = (dto: SettledEntry): SettledEntry => dto;
interface Props {
  filters?: EntryFilters;
  bankIds?: number[];
  onSelectionChange?: (ids: number[], entries: SettledEntry[]) => void;
}

const SettledEntriesTable: React.FC<Props> = ({
  filters,
  bankIds,
  onSelectionChange
}) => {
  /* ------------------------------------------------------------------
   *  State
   * ------------------------------------------------------------------ */
  const [entries, setEntries] = useState<SettledEntry[]>([]);
  const [tableRows, setTableRows] = useState<
    Array<{
      isSummary: boolean;
      entry?: SettledEntry;
      monthlySum?: number;
      runningBalance?: number;
      displayMonth?: string;
      summaryId?: string;
    }>
  >([]);

  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore]       = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const { selectedIds, handleSelectRow, handleSelectAll } = useShiftSelect(entries);
  const { totalConsolidatedBalance, loading: loadingBanks } = useBanks(bankIds);

  useEffect(() => onSelectionChange?.(selectedIds, entries.filter(e => selectedIds.includes(e.id))),
            [selectedIds, entries, onSelectionChange]);

  /* ------------------------------------------------------------------
   *  Fetch
   * ------------------------------------------------------------------ */
  const fetchEntries = async (reset = false) => {
    if (isFetching) return;

    const cursorParam = reset ? {} : { cursor: nextCursor ?? undefined };

    const glaParam = filters?.general_ledger_account_id?.length
      ? filters.general_ledger_account_id.join(',')
      : undefined;

    const bankParam = filters?.bank_id?.length
      ? filters.bank_id.join(',')
      : undefined;

    const payload = {
      ...cursorParam,
      ...filters,
      general_ledger_account_id: glaParam,
      bank_id: bankParam,
    };

    setIsFetching(true);
    setLoading(reset);
    setLoadingMore(!reset);

    try {
      const { data } = await api.getSettledEntries(payload);
      const mapped = data.results.map(mapEntry);

      // ▸ deduplica antes de salvar
      setEntries(prev =>
        reset
          ? mapped
          : [...prev, ...mapped.filter(e => !prev.some(p => p.id === e.id))]
      );

      setNextCursor(getCursorFromUrl(data.next));
      setHasMore(Boolean(data.next));
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


  // infinite scroll
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
   *  Build rows (reverse running balance, monthly summaries)
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (loadingBanks) return;
    if (!entries.length) { setTableRows([]); return; }

    /* 1. reverse balance */
    let revBal = totalConsolidatedBalance ?? 0;
    const revBalances: number[] = new Array(entries.length).fill(0);
    for (let i = entries.length - 1; i >= 0; i--) {
      revBalances[i] = revBal;
      const amt = parseFloat(entries[i].amount);
      revBal += entries[i].transaction_type === 'debit' ? amt : -amt;
    }

    /* 2. monthly buckets + rows */
    const rows: typeof tableRows = [];
    let curMonth = '', monthlySum = 0, summaryCount = 0;

    const monthKey = (d: string) => {
      const dt = new Date(d); return `${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getFullYear()}`;
    };

    entries.forEach((e, idx) => {
      const mKey = monthKey(e.settlement_due_date);
      const amt  = parseFloat(e.amount) * (e.transaction_type === 'debit' ? 1 : -1);

      if (curMonth && curMonth !== mKey) {
        rows.push({
          isSummary: true,
          monthlySum,
          runningBalance: revBalances[idx - 1],
          displayMonth: curMonth,
          summaryId: `summary-${curMonth}-${summaryCount++}`,
        });
        monthlySum = 0;
      }
      if (!curMonth || curMonth !== mKey) curMonth = mKey;

      monthlySum += amt;
      rows.push({ isSummary:false, entry: e, runningBalance: revBalances[idx] });

      if (idx === entries.length - 1) {
        rows.push({
          isSummary: true,
          monthlySum,
          runningBalance: revBalances[idx],
          displayMonth: curMonth,
          summaryId: `summary-${curMonth}-${summaryCount++}`,
        });
      }
    });

    setTableRows(rows);
  }, [entries, totalConsolidatedBalance, loadingBanks]);

  /* ------------------------------------------------------------------
   *  Render
   * ------------------------------------------------------------------ */

  if (loading && !entries.length) return <InlineLoader color="orange" className="w-10 h-10" />;
  if (error) return <div>{error}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 overflow-hidden rounded-t-2xl">
        <thead className="bg-gray-100 text-[11px]">
          <tr className="text-gray-600 tracking-wider">
            {/* … cabeçalho igual ao original … */}
            <th className="w-[5%] px-2 py-1 text-center font-semibold">
              <div className="flex justify-center">
                <Checkbox
                  checked={selectedIds.length === entries.length && !!entries.length}
                  onChange={handleSelectAll} size="sm" />
              </div>
            </th>
            <th className="w-[15%] px-2 py-1 text-center font-semibold">Vencimento</th>
            <th className="w-[30%] px-2 py-1 text-center font-semibold">Descrição</th>
            <th className="w-[5%]  px-2 py-1 text-center font-semibold">Parcela</th>
            <th className="w-[10%] px-2 py-1 text-center font-semibold">Banco</th>
            <th className="w-[15%] px-2 py-1 text-center font-semibold">Valor</th>
            <th className="w-[15%] px-2 py-1 text-center font-semibold">Saldo</th>
            <th className="px-2 py-1 text-center font-semibold" style={{ maxWidth: '68px', minWidth: '68px' }} />
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200 text-[12px]">
          {tableRows.length === 0 ? (
            <tr><td colSpan={8} className="px-4 py-3 text-center text-gray-500">Nenhum dado disponível</td></tr>
          ) : (
            tableRows.map((row) => {
              if (!row.isSummary && row.entry) {
                const e  = row.entry;
                const is = selectedIds.includes(e.id);
                const amtNum = parseFloat(e.amount) * (e.transaction_type === 'debit' ? 1 : -1);
                return (
                  <tr key={`entry-${e.id}`} className="hover:bg-gray-50">
                    <td className="px-2 py-1 text-center">
                      <Checkbox checked={is} onClick={ev => handleSelectRow(e.id, ev)} size="sm" />
                    </td>
                    <td className="px-2 py-1 text-center whitespace-nowrap">
                      {new Date(e.settlement_due_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">{e.description}</td>
                    <td className="px-2 py-1 text-center whitespace-nowrap">
                      {(e.current_installment ?? '-') + ' / ' + (e.total_installments ?? '-')}
                    </td>
                    <td className="px-2 py-1 text-center whitespace-nowrap">
                      {e.bank?.bank_institution ?? '-'}
                    </td>
                    <td className="px-2 py-1 text-center whitespace-nowrap">
                      {amtNum.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                    </td>
                    <td className="px-2 py-1 text-center whitespace-nowrap">
                      {row.runningBalance?.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <Button variant="common" style={{padding:'8px',borderRadius:'6px'}}>
                        <img src="src/assets/Icons/tools/edit.svg" height={12} width={12} alt="Editar"/>
                      </Button>
                    </td>
                  </tr>
                );
              }

              /* summary row */
              const { monthlySum=0, runningBalance=0, displayMonth } = row;
              return (
                <tr key={row.summaryId} className="bg-gray-50 text-[9px]">
                  <td colSpan={4} className="px-2 py-1 font-semibold">{displayMonth}</td>
                  <td></td>
                  <td className="px-2 py-1 text-center font-semibold whitespace-nowrap">
                    {monthlySum.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                  </td>
                  <td className="px-2 py-1 text-center font-semibold whitespace-nowrap">
                    <span className={runningBalance>=0?'text-green-600':'text-red-600'}>
                      {(runningBalance>=0?'+':'') + runningBalance.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
                    </span>
                  </td>
                  <td/>
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
