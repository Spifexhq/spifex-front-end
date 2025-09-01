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
import { GetSettledEntryRequest, GetSettledEntry } from "src/models/entries/dto";
import { useShiftSelect } from "@/hooks/useShiftSelect";
import { useBanks } from "@/hooks/useBanks";
import { getCursorFromUrl } from "src/lib/list";
import { InlineLoader } from "@/components/Loaders";
import Checkbox from "@/components/Checkbox";

/* ------------------------------ Helpers ----------------------------------- */

// hash 32-bit estável para id numérico no hook de seleção
const hash32 = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const formatCurrency = (amount: number): string =>
  amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("pt-BR");

const getMonthYear = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const formatMonthYearSummary = (isoDateStr: string): string => {
  const dt = new Date(isoDateStr);
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[dt.getMonth()]}, ${dt.getFullYear()}`;
};

const isCredit = (t: string | null | undefined) =>
  String(t || "").toLowerCase().includes("credit");

const txValue = (e: SettledEntry) => {
  const n = parseFloat(e.amount) || 0;
  return isCredit(e.tx_type) ? n : -n;
};

/* ------------------------------ Tipos ------------------------------------- */

export type SettledEntriesTableHandle = { clearSelection: () => void };

type TableRow =
  | { id: string; type: "entry"; entry: SettledEntry; runningBalance: number }
  | { id: string; type: "summary"; displayMonth: string; monthlySum: number; runningBalance: number };

interface Props {
  filters?: EntryFilters;
  onSelectionChange?: (ids: string[], entries: SettledEntry[]) => void; // settlement external_ids
}

/* ------------------------------ UI Bits ----------------------------------- */

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
        <span className="text-[10px] uppercase tracking-wide text-gray-600">Realizados</span>
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
  onSelect: (idNum: number, ev: React.MouseEvent) => void;
}> = ({ entry, runningBalance, isSelected, onSelect }) => {
  const value = txValue(entry);
  const positive = value >= 0;
  const idNum = hash32(entry.external_id); // <-- settlement id para seleção

  return (
    <div className="group flex items-center justify-center h-10.5 max-h-10.5 px-3 py-1.5 hover:bg-gray-50 focus-within:bg-gray-50 border-b border-gray-200">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Checkbox checked={isSelected} onClick={(e) => onSelect(idNum, e)} size="sm" />
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-gray-800 font-medium truncate leading-tight">
                {entry.description}
              </div>

              <div className="text-[10px] text-gray-500 truncate leading-tight mt-0.5">
                Liq: {formatDate(entry.value_date)}
                {(entry.installment_index || entry.installment_count) && (
                  <span className="ml-2">
                    Parcela {entry.installment_index ?? "-"} / {entry.installment_count ?? "-"}
                  </span>
                )}
                {entry.partial_index != null && (
                  <span className="ml-2">Parcial: {entry.partial_index}</span>
                )}
                {entry.bank?.institution && (
                  <span className="ml-2">Banco: {entry.bank.institution}</span>
                )}
              </div>
            </div>

            <div className="flex items-center shrink-0">
              <div className="w-[150px] text-center">
                <div
                  className={`text-[13px] leading-none font-semibold tabular-nums ${
                    positive ? "text-green-900" : "text-red-900"
                  }`}
                >
                  {formatCurrency(value)}
                </div>
              </div>
              <div className="w-[150px] text-center">
                <div className="text-[13px] leading-none font-semibold tabular-nums text-gray-900">
                  {formatCurrency(runningBalance)}
                </div>
              </div>
              <div className="w-8 flex justify-center" />
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
  const monthDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);

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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
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

/* ------------------------------- Main ------------------------------------- */

const SettledEntriesTable = forwardRef<SettledEntriesTableHandle, Props>(
  ({ filters, onSelectionChange }, ref) => {
    // saldo consolidado dos bancos filtrados
    const { totalConsolidatedBalance, loading: loadingBanks } = useBanks(filters?.bank_id as string[] | undefined);

    const [entries, setEntries] = useState<SettledEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const fetchingRef = useRef(false);
    
    // bancos selecionados (string)
    const selectedBankIds = useMemo(() => new Set((filters?.bank_id ?? []).map(String)), [filters?.bank_id]);

    // payload: se houver 1 banco, manda para o backend; 0 ou >1, filtra local
    const buildPayload = useCallback((reset: boolean): GetSettledEntryRequest => {
      const f = filters;
      const qCombined =
        (f?.description ? String(f.description).trim() : "") +
        (f?.observation ? ` ${String(f.observation).trim()}` : "");
      const q = qCombined.trim() || undefined;

      const banks = (f?.bank_id ?? []).map(String);
      const bank = banks.length === 1 ? banks[0] : undefined; // seu backend aceita "bank"

      const base: GetSettledEntryRequest = {
        page_size: 100,
        value_from: f?.start_date || undefined,
        value_to: f?.end_date || undefined,
        bank,
        q,
      };
      if (!reset && nextCursor) base.cursor = nextCursor;
      return base;
    }, [filters, nextCursor]);

    const fetchEntries = useCallback(
      async (reset = false) => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        const payload = buildPayload(reset);
        setIsFetching(true);
        if (reset) setLoading(true);
        else setLoadingMore(true);

        try {
          const { data } = await api.getSettledEntries(payload);
          const incoming: SettledEntry[] = (data as GetSettledEntry).results ?? [];

          setEntries((prev) =>
            reset ? incoming.slice() : [...prev, ...incoming.filter((e) => !prev.some((p) => p.external_id === e.external_id))]
          );

          const nextUrl = (data as GetSettledEntry).next;
          setNextCursor(getCursorFromUrl(nextUrl));
          setHasMore(Boolean(nextUrl));
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erro ao buscar dados.");
        } finally {
          setLoading(false);
          setLoadingMore(false);
          setIsFetching(false);
          fetchingRef.current = false;
        }
      },
      [buildPayload]
    );

    useEffect(() => { fetchEntries(true); }, [filters?.start_date, filters?.end_date, filters?.description, filters?.observation, filters?.bank_id, fetchEntries]);

    // scroll infinito (container interno)
    const scrollerRef = useRef<HTMLDivElement>(null);
    const handleInnerScroll = useCallback(() => {
      const el = scrollerRef.current;
      if (!el || isFetching || !hasMore) return;
      const threshold = 150;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) fetchEntries();
    }, [isFetching, hasMore, fetchEntries]);

    // se a 1ª página não preencher a área
    useEffect(() => {
      const el = scrollerRef.current;
      if (!el) return;
      if (!loading && hasMore && el.scrollHeight <= el.clientHeight + 50) fetchEntries();
    }, [loading, hasMore, entries.length, fetchEntries]);

    // 🔎 filtro local por bancos (0 => sem filtro; >=1 => inclui somente bank.id ∈ seleção)
    const visibleEntries = useMemo(() => {
      if (selectedBankIds.size === 0) return entries;
      return entries.filter(e => {
        const bId = e.bank?.id;
        return bId ? selectedBankIds.has(String(bId)) : false;
      });
    }, [entries, selectedBankIds]);

    // seleção baseada em settlement external_id (usa hash numérico só internamente)
    const {
      selectedIds: selectedNumIds,
      handleSelectRow,
      handleSelectAll,
      clearSelection,
    } = useShiftSelect(visibleEntries, (e) => hash32(e.external_id));

    useImperativeHandle(ref, () => ({ clearSelection }), [clearSelection]);

    // map numId -> entry (visíveis) e -> external_id
    const numIdToEntry = useMemo(() => {
      const m = new Map<number, SettledEntry>();
      for (const e of visibleEntries) m.set(hash32(e.external_id), e);
      return m;
    }, [visibleEntries]);

    // notifica o pai com settlement external_ids (string[])
    useEffect(() => {
      const rows = selectedNumIds.map((n) => numIdToEntry.get(n)).filter(Boolean) as SettledEntry[];
      const extIds = rows.map(r => r.external_id);
      onSelectionChange?.(extIds, rows);
    }, [selectedNumIds, numIdToEntry, onSelectionChange]);

    // monta linhas (apenas das visíveis)
    const rows = useMemo<TableRow[]>(() => {
      if (loadingBanks || !visibleEntries.length) return [];

      // reverse-walk com saldo consolidado (dos bancos filtrados)
      let revBal = totalConsolidatedBalance ?? 0;
      const revBalances = new Array(visibleEntries.length).fill(0);
      for (let i = visibleEntries.length - 1; i >= 0; i--) {
        revBalances[i] = revBal;
        const amt = parseFloat(visibleEntries[i].amount) || 0;
        revBal += isCredit(visibleEntries[i].tx_type) ? -amt : +amt;
      }

      const out: TableRow[] = [];
      let currentMonth = "";
      let monthlySum = 0;

      visibleEntries.forEach((e, idx) => {
        const mKey = getMonthYear(e.value_date);
        const val = txValue(e);

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

        monthlySum += val;

        out.push({
          id: `entry-${e.external_id}`,   // ✅ chave única por liquidação
          type: "entry",
          entry: e,
          runningBalance: revBalances[idx],
        });

        if (idx === visibleEntries.length - 1) {
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
    }, [visibleEntries, totalConsolidatedBalance, loadingBanks]);

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
              selectedCount={selectedNumIds.length}
              totalCount={visibleEntries.length}         // ✅ conta do conjunto visível
              onSelectAll={handleSelectAll}              // ✅ age sobre o conjunto base (visível)
            />

            <div ref={scrollerRef} onScroll={handleInnerScroll} className="flex-1 min-h-0 overflow-y-auto">
              {rows.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="divide-y divide-gray-200">
                  {rows.map((r) =>
                    r.type === "entry" ? (
                      <EntryRow
                        key={r.id}
                        entry={r.entry}
                        runningBalance={r.runningBalance}
                        isSelected={selectedNumIds.includes(hash32(r.entry.external_id))}
                        onSelect={handleSelectRow}
                      />
                    ) : (
                      <SummaryRow
                        key={r.id}
                        displayMonth={r.displayMonth}
                        monthlySum={r.monthlySum}
                        runningBalance={r.runningBalance}
                      />
                    )
                  )}

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
