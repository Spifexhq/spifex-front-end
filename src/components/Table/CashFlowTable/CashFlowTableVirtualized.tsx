import React, { useEffect, useState, useCallback, useRef } from "react";
import { api } from "src/api/requests";
import { EntryFilters, Entry } from "src/models/entries/domain";
import { useShiftSelect } from "@/hooks/useShiftSelect";
import { useBanks } from "@/hooks/useBanks";

import { InlineLoader } from "@/components/Loaders";
import Checkbox from "@/components/Checkbox";
import Button from "@/components/Button";
import { getCursorFromUrl } from "src/lib/list";

import {
  FixedSizeList as List,
  ListOnScrollProps,
} from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

/* ------------------------------------------------------------------
 *  Ajustes de virtualização
 * ------------------------------------------------------------------ */
const ROW_HEIGHT = 40; // altura fixa de cada linha da lista (px)
const OVERSCAN = 100; // mantém 100 linhas acima/abaixo visíveis na memória

interface CashFlowTableProps {
  filters?: EntryFilters;
  onEdit(entry: Entry): void;
  onSelectionChange?: (ids: number[], entries: Entry[]) => void;
}

type TableRow =
  | {
      isSummary: false;
      entry: Entry;
      runningBalance: number;
    }
  | {
      isSummary: true;
      monthlySum: number;
      runningBalance: number;
      displayMonth: string;
      summaryId: string;
    };

/* ------------------------------------------------------------------
 *  Componente principal
 * ------------------------------------------------------------------ */
const CashFlowTable: React.FC<CashFlowTableProps> = ({
  filters,
  onEdit,
  onSelectionChange,
}) => {
  const { totalConsolidatedBalance, loading: loadingBanks } = useBanks(
    filters?.bank_id
  );
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tableRows, setTableRows] = useState<TableRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const { selectedIds, handleSelectRow, handleSelectAll } =
    useShiftSelect(entries);

  /* ------------------------------------------------------------------
   *  Seleção em lote
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const selectedRows = entries.filter((e) => selectedIds.includes(e.id));
    onSelectionChange?.(selectedIds, selectedRows);
  }, [selectedIds, entries, onSelectionChange]);

  /* ------------------------------------------------------------------
   *  Fetch
   * ------------------------------------------------------------------ */
  const fetchEntries = useCallback(async (reset = false) => {
    if (isFetching) return;

    const cursorParam = reset ? {} : { cursor: nextCursor ?? undefined };

    const glaParam = filters?.general_ledger_account_id?.length
      ? filters.general_ledger_account_id.join(",")
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
      const mapped: Entry[] = data.results;
      setEntries((prev) =>
        reset ? mapped : [...prev, ...mapped.filter((e) => !prev.some((p) => p.id === e.id))]
      );
      setNextCursor(getCursorFromUrl(data.next));
      setHasMore(!!data.next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar dados.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsFetching(false);
    }
  }, [filters, isFetching, nextCursor]);

  useEffect(() => {
    fetchEntries(true);
  }, [filters, fetchEntries]);

  /* ------------------------------------------------------------------
   *  Monta linhas (normal + sumário)
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (loadingBanks) return;

    if (!entries.length) {
      setTableRows([]);
      return;
    }

    let currentMonth = "";
    let monthlySum = 0;
    let runningBalance = totalConsolidatedBalance;

    const newRows: TableRow[] = [];

    const getMonthYear = (dateStr: string) => {
      const date = new Date(dateStr);
      const m = (date.getMonth() + 1).toString().padStart(2, "0");
      const y = date.getFullYear();
      return `${m}/${y}`;
    };

    entries.forEach((entry, index) => {
      const amountNum = parseFloat(entry.amount);
      const transactionValue =
        entry.transaction_type === "credit" ? amountNum : -amountNum;

      const entryMonth = getMonthYear(entry.due_date);

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
   *  Virtual scroll — busca incremental
   * ------------------------------------------------------------------ */
  const listHeightRef = useRef<number>(0);

  const loadMoreIfNeeded = useCallback(
    (scrollOffset: number, clientHeight: number) => {
      const totalHeight = tableRows.length * ROW_HEIGHT;
      const distanceToBottom = totalHeight - (scrollOffset + clientHeight);

      // Quando faltar < 400 linhas visíveis, carrega mais
      if (distanceToBottom < ROW_HEIGHT * 400 && hasMore && !isFetching) {
        fetchEntries();
      }
    },
    [tableRows.length, hasMore, isFetching, fetchEntries]
  );

  const listRef = useRef<List>(null);

  const onListScroll = ({ scrollOffset, scrollUpdateWasRequested }: ListOnScrollProps) => {
    if (scrollUpdateWasRequested) return; // ignora scroll programático
    loadMoreIfNeeded(scrollOffset, listHeightRef.current);
  };

  /* ------------------------------------------------------------------
   *  Renderização
   * ------------------------------------------------------------------ */
  if (loading && !entries.length) {
    return <InlineLoader color="orange" className="w-10 h-10" />;
  }

  if (error) {
    return <div>{error}</div>;
  }

  const Header = () => (
    <div className="grid grid-cols-[5%_15%_40%_5%_15%_15%_auto] bg-gray-100 text-[11px] text-gray-600 tracking-wider sticky top-0 z-10">
      <div className="flex justify-center items-center p-1">
        <Checkbox
          checked={selectedIds.length === entries.length && entries.length > 0}
          onChange={() => handleSelectAll()}
          size={"sm"}
        />
      </div>
      <div className="p-1 text-center font-semibold">Vencimento</div>
      <div className="p-1 text-center font-semibold">Descrição</div>
      <div className="p-1 text-center font-semibold">Parcela</div>
      <div className="p-1 text-center font-semibold">Valor</div>
      <div className="p-1 text-center font-semibold">Saldo</div>
      <div className="p-1" />
    </div>
  );

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const row = tableRows[index];
    if (!row) return null;

    if (!row.isSummary) {
      const { entry, runningBalance } = row;
      const isSelected = selectedIds.includes(entry.id);
      const amountNum = parseFloat(entry.amount);
      const value = entry.transaction_type === "debit" ? -amountNum : amountNum;

      return (
        <div
          style={style}
          className="grid grid-cols-[5%_15%_40%_5%_15%_15%_auto] items-center text-[12px] hover:bg-gray-50"
        >
          <div className="flex justify-center">
            <Checkbox
              checked={isSelected}
              onClick={(e) => handleSelectRow(entry.id, e)}
              size={"sm"}
            />
          </div>
          <div className="text-center">
            {new Date(entry.due_date).toLocaleDateString("pt-BR")}
          </div>
          <div className="truncate">{entry.description}</div>
          <div className="text-center">
            {`${entry.current_installment ?? "-"} / ${entry.total_installments ?? "-"}`}
          </div>
          <div className="text-center">
            {value.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
          <div className="text-center">
            {runningBalance.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </div>
          <div className="flex justify-center">
            <Button
              variant="common"
              style={{ padding: "8px", borderRadius: "6px" }}
              onClick={() => onEdit(entry)}
            >
              <img
                alt="Editar"
                height={12}
                width={12}
                src="src/assets/Icons/tools/edit.svg"
              />
            </Button>
          </div>
        </div>
      );
    }

    // Linha de sumário
    const { monthlySum, runningBalance, displayMonth } = row;
    return (
      <div
        style={style}
        className="grid grid-cols-[5%_15%_40%_5%_15%_15%_auto] bg-gray-50 text-[11px] items-center font-semibold"
      >
        <div className="col-span-4 pl-2">{displayMonth}</div>
        <div className="text-center">
          {monthlySum.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </div>
        <div
          className={
            runningBalance >= 0 ? "text-green-600 text-center" : "text-red-600 text-center"
          }
        >
          {runningBalance >= 0 ? "+" : ""}
          {runningBalance.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </div>
        <div />
      </div>
    );
  };

  return (
    <div className="overflow-x-auto h-full">
      <Header />
      {/* altura calculada para preencher viewport – ajuste conforme seu layout */}
      <div style={{ height: "calc(100vh - 300px)" }}>
        <AutoSizer>
          {({ height, width }: { height: number; width: number }) => {
            listHeightRef.current = height;
            return (
              <List
                ref={listRef}
                height={height}
                width={width}
                itemCount={tableRows.length}
                itemSize={ROW_HEIGHT}
                overscanCount={OVERSCAN}
                onScroll={onListScroll}
              >
                {Row}
              </List>
            );
          }}
        </AutoSizer>
      </div>
      {loadingMore && (
        <InlineLoader color="orange" className="w-8 h-8 mx-auto my-2" />
      )}
    </div>
  );
};

export default CashFlowTable;
