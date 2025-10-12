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
// Removed InlineLoader usage per your request
import Checkbox from "@/components/Checkbox";

/* ------------------------------ Helpers ----------------------------------- */

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
  const idNum = hash32(entry.external_id);

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

/* ------------------------------ Skeletons --------------------------------- */

const SkeletonDot = ({ className = "" }: { className?: string }) => (
  <div className={`bg-gray-200 rounded ${className} animate-pulse`} />
);

const SkeletonEntryRow: React.FC = () => (
  <div className="flex items-center justify-center h-10.5 max-h-10.5 px-3 py-1.5 border-b border-gray-200">
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <SkeletonDot className="h-4 w-4 rounded border border-gray-300" />
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="h-3 w-2/3 rounded bg-gray-200 animate-pulse" />
            <div className="h-2 w-1/3 rounded bg-gray-200 animate-pulse mt-1" />
          </div>
          <div className="flex items-center shrink-0">
            <div className="w-[150px] text-center">
              <div className="h-3 w-20 mx-auto rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="w-[150px] text-center">
              <div className="h-3 w-20 mx-auto rounded bg-gray-200 animate-pulse" />
            </div>
            <div className="w-8 flex justify-center">
              <div className="h-6 w-6 rounded-md bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SkeletonSummaryRow: React.FC = () => (
  <div className="flex items-center justify-between px-3 py-2 bg-gray-100 border-b border-gray-300">
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-1.5 bg-gray-300 rounded-full" />
      <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
    </div>
    <div className="flex items-center">
      <div className="w-[150px] text-center">
        <div className="h-3 w-20 mx-auto rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="w-[150px] text-center">
        <div className="h-3 w-20 mx-auto rounded bg-gray-200 animate-pulse" />
      </div>
      <div className="w-[32px]" />
    </div>
  </div>
);

const TableSkeleton: React.FC<{ rows?: number; showSummariesEvery?: number }> = ({
  rows = 10,
  showSummariesEvery = 4,
}) => (
  <div
    className="divide-y divide-gray-200"
    role="progressbar"
    aria-label="Carregando realizados"
    aria-busy="true"
  >
    {Array.from({ length: rows }).map((_, i) => (
      <React.Fragment key={i}>
        <SkeletonEntryRow />
        {(i + 1) % showSummariesEvery === 0 && <SkeletonSummaryRow />}
      </React.Fragment>
    ))}
  </div>
);

/* ------------------------------ Bottom Loader ------------------------------ */

const BottomLoader: React.FC = () => (
  <div
    className="flex items-center justify-center gap-2 py-3 border-t border-gray-300 bg-white"
    role="status"
    aria-live="polite"
    aria-label="Carregando mais resultados"
  >
    <span className="inline-block h-4 w-4 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
    <span className="text-[11px] text-gray-500">Carregando mais...</span>
  </div>
);

/* ------------------------------- Main + Virtualização --------------------- */

const SettledEntriesTable = forwardRef<SettledEntriesTableHandle, Props>(
  ({ filters, onSelectionChange }, ref) => {
    const { totalConsolidatedBalance, loading: loadingBanks } = useBanks(
      filters?.bank_id as string[] | undefined
    );

    const [entries, setEntries] = useState<SettledEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [nextCursor, setNextCursor] = useState<string | null>(null);

    const fetchingRef = useRef(false);
    const scrollerRef = useRef<HTMLDivElement>(null);

    // valores “atuais” para funções estáveis
    const latest = useRef<{ filters?: EntryFilters; nextCursor: string | null; isFetching: boolean }>({
      filters,
      nextCursor,
      isFetching,
    });
    useEffect(() => {
      latest.current = { filters, nextCursor, isFetching };
    }, [filters, nextCursor, isFetching]);

    const selectedBankIds = useMemo(
      () => new Set((filters?.bank_id ?? []).map(String)),
      [filters?.bank_id]
    );

    const buildPayload = useCallback((reset: boolean): GetSettledEntryRequest => {
      const f = latest.current.filters;

      // combine text
      const qCombined =
        (f?.description ? String(f.description).trim() : "") +
        (f?.observation ? ` ${String(f.observation).trim()}` : "");
      const q = qCombined.trim() || undefined;

      // one bank (API expects one; you already filter multiple locally)
      const banks = (f?.bank_id ?? []).map(String);
      const bank = banks.length === 1 ? banks[0] : undefined;

      // first GL (keep same behavior as open entries table)
      const gl = f?.gla_id && f.gla_id.length ? f.gla_id[0] : undefined;

      // "credit"/"debit" -> 1 / -1
      const tx_type =
        f?.tx_type === "credit" ? 1 :
        f?.tx_type === "debit"  ? -1 :
        undefined;

      const base: GetSettledEntryRequest = {
        page_size: 100,
        value_from:  f?.start_date || undefined,
        value_to:    f?.end_date   || undefined,

        bank,
        q,

        // ✅ new direct fields the backend supports
        description: f?.description || undefined,
        observation: f?.observation || undefined,

        gl,
        tx_type,

        // ✅ amounts are already in MINOR units (FilterBar does the conversion)
        amount_min: f?.amount_min,
        amount_max: f?.amount_max,
      };

      const cursor = latest.current.nextCursor;
      if (!reset && cursor) base.cursor = cursor;

      return base;
    }, []);

    const fetchEntries = useCallback(
      async (reset = false) => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;

        // guard sincronizado no ref (evita corrida)
        setIsFetching(true);
        latest.current.isFetching = true;

        if (reset) setLoading(true);
        else setLoadingMore(true);

        try {
          const payload = buildPayload(reset);
          const { data } = await api.getSettledEntries(payload);
          const incoming: SettledEntry[] = (data as GetSettledEntry).results ?? [];

          setEntries((prev) =>
            reset
              ? incoming.slice()
              : [
                  ...prev,
                  ...incoming.filter(
                    (e) => !prev.some((p) => p.external_id === e.external_id)
                  ),
                ]
          );

          // Extrai cursor da resposta e sincroniza no ref imediatamente
          const nextUrl = (data as GetSettledEntry).next;
          const cursor = getCursorFromUrl(nextUrl) ?? null;
          setNextCursor(cursor);
          latest.current.nextCursor = cursor; // crítico p/ não voltar à página 1
          setHasMore(Boolean(cursor));
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Erro ao buscar dados.");
        } finally {
          setLoading(false);
          setLoadingMore(false);
          setIsFetching(false);
          latest.current.isFetching = false;
          fetchingRef.current = false;
        }
      },
      [buildPayload]
    );

    // carregar / recarregar quando filtros mudarem
    useEffect(() => {
      setNextCursor(null);
      latest.current.nextCursor = null;
      setEntries([]);
      if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
      void fetchEntries(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      // existing
      filters?.start_date,
      filters?.end_date,
      filters?.description,
      filters?.observation,
      filters?.bank_id,

      // ✅ new
      filters?.gla_id,
      filters?.tx_type,
      filters?.amount_min,
      filters?.amount_max,
    ]);

    // scroll infinito
    const handleInnerScroll = useCallback(() => {
      const el = scrollerRef.current;
      if (!el || isFetching || !hasMore) return;
      const threshold = 150;
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
      if (nearBottom) void fetchEntries(false);
    }, [isFetching, hasMore, fetchEntries]);

    // 1ª página não preenche
    useEffect(() => {
      const el = scrollerRef.current;
      if (!el) return;
      if (!loading && hasMore && el.scrollHeight <= el.clientHeight + 50) {
        void fetchEntries(false);
      }
    }, [loading, hasMore, entries.length, fetchEntries]);

    // filtro local de bancos
    const visibleEntries = useMemo(() => {
      if (selectedBankIds.size === 0) return entries;
      return entries.filter((e) => {
        const bId = e.bank?.id;
        return bId ? selectedBankIds.has(String(bId)) : false;
      });
    }, [entries, selectedBankIds]);

    // seleção
    const {
      selectedIds: selectedNumIds,
      handleSelectRow,
      handleSelectAll,
      clearSelection,
    } = useShiftSelect<SettledEntry, number>(visibleEntries, (e) => hash32(e.external_id));

    useImperativeHandle(ref, () => ({ clearSelection }), [clearSelection]);

    const numIdToEntry = useMemo(() => {
      const m = new Map<number, SettledEntry>();
      for (const e of visibleEntries) m.set(hash32(e.external_id), e);
      return m;
    }, [visibleEntries]);

    useEffect(() => {
      const rows = selectedNumIds
        .map((n) => numIdToEntry.get(n))
        .filter(Boolean) as SettledEntry[];
      const extIds = rows.map((r) => r.external_id);
      onSelectionChange?.(extIds, rows);
    }, [selectedNumIds, numIdToEntry, onSelectionChange]);

    // linhas (apenas visíveis)
    const rows = useMemo<TableRow[]>(() => {
      if (loadingBanks || !visibleEntries.length) return [];

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
          id: `entry-${e.external_id}`,
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

    /* ------------------------------ Virtualização -------------------------- */
    const ENTRY_ROW_H = 42;   // h-10.5 ≈ 42px
    const SUMMARY_ROW_H = 40; // px
    const OVERSCAN = 8;

    const [scrollTop, setScrollTop] = useState(0);
    const [viewportH, setViewportH] = useState(0);

    useEffect(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
      ro.observe(el);
      setViewportH(el.clientHeight);
      return () => ro.disconnect();
    }, []);

    const rowHeights = useMemo(
      () => rows.map((r) => (r.type === "entry" ? ENTRY_ROW_H : SUMMARY_ROW_H)),
      [rows]
    );

    const rowOffsets = useMemo(() => {
      const off = new Array(rowHeights.length + 1);
      off[0] = 0;
      for (let i = 0; i < rowHeights.length; i++) off[i + 1] = off[i] + rowHeights[i];
      return off;
    }, [rowHeights]);

    const totalHeight = rowOffsets[rowOffsets.length - 1] || 0;

    const findStartIndex = useCallback(
      (st: number) => {
        let lo = 0, hi = rowOffsets.length - 1;
        while (lo < hi) {
          const mid = Math.floor((lo + hi) / 2);
          if (rowOffsets[mid] <= st) lo = mid + 1;
          else hi = mid;
        }
        return Math.max(0, lo - 1);
      },
      [rowOffsets]
    );

    const startIndex = useMemo(() => findStartIndex(scrollTop), [scrollTop, findStartIndex]);

    const endIndex = useMemo(() => {
      const limit = scrollTop + (viewportH || 0);
      let i = startIndex;
      // usa offset da PRÓXIMA linha pra garantir inclusão da última parcialmente visível
      while (i < rowHeights.length && rowOffsets[i + 1] <= limit) i++;
      return Math.min(rowHeights.length - 1, i + OVERSCAN);
    }, [startIndex, scrollTop, viewportH, rowHeights.length, rowOffsets]);

    /* --------------------------------- UI ---------------------------------- */
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
                onClick={() => void fetchEntries(true)}
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
        {/* Header sempre visível para layout estável */}
        <TableHeader
          selectedCount={selectedNumIds.length}
          totalCount={visibleEntries.length}
          onSelectAll={handleSelectAll}
        />

        <div
          ref={scrollerRef}
          onScroll={(e) => {
            setScrollTop(e.currentTarget.scrollTop); // virtualização
            handleInnerScroll();                      // infinite scroll
          }}
          className="flex-1 min-h-0 overflow-y-auto"
        >
          {/* Initial load -> table skeleton */}
          {loading && !entries.length ? (
            <TableSkeleton rows={Math.max(10, Math.ceil((viewportH || 400) / 42))} />
          ) : rows.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-gray-200 relative">
              {/* trilho */}
              <div style={{ height: totalHeight, position: "relative" }}>
                {/* janela */}
                <div
                  style={{
                    position: "absolute",
                    top: rowOffsets[startIndex],
                    left: 0,
                    right: 0,
                  }}
                >
                  {rows.slice(startIndex, endIndex + 1).map((r) =>
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
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer loader fora da tabela/scroll */}
        {loadingMore && <BottomLoader />}
      </section>
    );
  }
);

export default SettledEntriesTable;
