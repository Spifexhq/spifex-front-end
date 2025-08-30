import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { api } from "src/api/requests";
import BanksTable from "src/components/Table/BanksTable";
import type { Entry, SettledEntry, EntryFilters } from "src/models/entries";
import type { BankAccount } from "@/models/enterprise_structure/domain";
import { getCursorFromUrl } from "src/lib/list";

export type KpiItem = {
  key: string;
  label: string;
  value: string | number;
  hint?: string;
  delta?: { value: string; positive?: boolean };
};

type BanksData = {
  banks: BankAccount[];
  totalConsolidatedBalance: number;
  loading: boolean;
  error: string | null;
};

interface KpiRowProps {
  items?: KpiItem[];
  selectedBankIds?: (string | number)[];
  filters?: EntryFilters;
  context?: "cashflow" | "settled";
  refreshToken?: number;
  banksRefreshKey?: number;
  banksData: BanksData;
}

type Parsed = {
  amount: number;
  isCredit: boolean;
  due: dayjs.Dayjs;
  settled: boolean;
  settleDate?: dayjs.Dayjs;
  raw: Entry | SettledEntry;
};

type Paginated<T> = { results: T[]; next?: string | null };

const currency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getInitials(name: string) {
  if (!name) return "BK";
  const parts = name.split(" ").filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const KpiRow: React.FC<KpiRowProps> = ({
  selectedBankIds,
  filters,
  context = "cashflow",
  refreshToken = 0,
  banksRefreshKey,
  banksData,
}) => {
  const { banks, loading: banksLoading } = banksData;
  const [expanded, setExpanded] = useState(false);

  const [rows, setRows] = useState<Array<Entry | SettledEntry>>([]);
  const [loading, setLoading] = useState(false);

  /* ---------- FILTRO SÓ DO PAINEL DE BANCOS (local) ---------- */
  const toKey = (v: unknown) => String(v);
  const filteredBanks = useMemo(() => {
    if (!selectedBankIds || selectedBankIds.length === 0) return banks;
    const set = new Set(selectedBankIds.map(toKey));
    return banks.filter((b) => set.has(toKey(b.id)));
  }, [banks, selectedBankIds]);

  const filteredTotalConsolidated = useMemo(
    () => filteredBanks.reduce((acc, b) => acc + Number(b.consolidated_balance ?? 0), 0),
    [filteredBanks]
  );

  /* ---------- Payloads e fetch das ENTRADAS (inalterados) ---------- */
  const baseStart = useMemo(
    () => dayjs().subtract(1, "month").startOf("month").format("YYYY-MM-DD"),
    []
  );
  const baseEnd = useMemo(() => dayjs().endOf("month").format("YYYY-MM-DD"), []);

  const glaParam = useMemo(
    () =>
      filters?.general_ledger_account_id?.length
        ? filters.general_ledger_account_id.join(",")
        : undefined,
    [filters?.general_ledger_account_id]
  );

  const bankParam = useMemo(
    () => (filters?.bank_id?.length ? filters.bank_id.join(",") : undefined),
    [filters?.bank_id]
  );

  // Cashflow (sem bank_id)
  const payloadCashflow = useMemo(
    () => ({
      page_size: 5000,
      start_date: baseStart,
      end_date: baseEnd,
      description: filters?.description,
      observation: filters?.observation,
      general_ledger_account_id: glaParam,
    }),
    [baseStart, baseEnd, filters?.description, filters?.observation, glaParam]
  );

  // Settled (respeita bank_id)
  const payloadSettled = useMemo(
    () => ({
      page_size: 5000,
      start_date: baseStart,
      end_date: baseEnd,
      description: filters?.description,
      observation: filters?.observation,
      general_ledger_account_id: glaParam,
      bank_id: bankParam,
    }),
    [baseStart, baseEnd, filters?.description, filters?.observation, glaParam, bankParam]
  );

  const [overdueSums, setOverdueSums] = useState({ rec: 0, pay: 0, net: 0, loading: false });
  const yesterdayStr = useMemo(() => dayjs().subtract(1, "day").format("YYYY-MM-DD"), []);
  const { loading: overdueLoading, rec: overdueRec, pay: overduePay, net: overdueNet } = overdueSums;

  // Overdue (competência) — sem bank_id
  const payloadOverdue = useMemo(
    () => ({
      page_size: 5000,
      start_date: "1900-01-01",
      end_date: yesterdayStr,
      description: filters?.description,
      observation: filters?.observation,
      general_ledger_account_id: glaParam,
    }),
    [filters?.description, filters?.observation, glaParam, yesterdayStr]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        if (context === "settled") {
          const { data } = (await api.getSettledEntries(
            payloadSettled
          )) as { data: Paginated<SettledEntry> };
          const list = (data?.results ?? []).filter((e) => !e.transference_correlation_id);
          const seen = new Set<number>();
          const uniq = list.filter((e) => !seen.has(e.id) && (seen.add(e.id), true));
          if (mounted) setRows(uniq);
        } else {
          const { data } = (await api.getEntries(
            payloadCashflow
          )) as { data: Paginated<Entry> };
          const list = data?.results ?? [];
          const seen = new Set<number>();
          const uniq = list.filter((e) => !seen.has(e.id) && (seen.add(e.id), true));
          if (mounted) setRows(uniq);
        }
      } catch (e) {
        if (mounted) setRows([]);
        console.error("KPIs fetch failed", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [context, payloadCashflow, payloadSettled, refreshToken]);

  useEffect(() => {
    if (context !== "cashflow") return;

    let mounted = true;
    (async () => {
      try {
        if (mounted) setOverdueSums((s) => ({ ...s, loading: true }));

        let cursor: string | undefined = undefined;
        let totalRec = 0;
        let totalPay = 0;

        do {
          const { data } = await api.getEntries({ ...payloadOverdue, cursor });
          const batch = data?.results ?? [];

          for (const e of batch) {
            const settled = Boolean((e as Entry).settlement_state);
            if (settled) continue;
            const due = dayjs((e as Entry).due_date);
            if (!due.isBefore(dayjs(), "day")) continue;

            const amt = Math.abs(Number(e.amount)) || 0;
            const isCredit = (e as Entry).transaction_type === "credit";
            if (isCredit) totalRec += amt;
            else totalPay += amt;
          }

          const next = data?.next ? getCursorFromUrl(data.next) : null;
          cursor = next ?? undefined;
        } while (cursor);

        if (mounted) {
          const net = totalRec - totalPay;
          setOverdueSums({ rec: totalRec, pay: totalPay, net, loading: false });
        }
      } catch (err) {
        console.error("Overdue fetch failed", err);
        if (mounted) setOverdueSums({ rec: 0, pay: 0, net: 0, loading: false });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [context, payloadOverdue, refreshToken]);

  const entriesParsed: Parsed[] = useMemo(() => {
    return rows.map((item) => {
      if ("settlement_due_date" in item) {
        const e = item as SettledEntry;
        const amt = Math.abs(Number(e.amount)) || 0;
        const tx = String(e.transaction_type || "").toLowerCase();
        const sdt = dayjs(e.settlement_due_date);
        const isCredit = tx === "credit";
        return { raw: e, amount: amt, isCredit, due: sdt, settled: true, settleDate: sdt };
      }
      const e = item as Entry;
      const amt = Math.abs(Number(e.amount)) || 0;
      return {
        raw: e,
        amount: amt,
        isCredit: e.transaction_type === "credit",
        due: dayjs(e.due_date),
        settled: Boolean(e.settlement_state),
        settleDate: e.settlement_due_date ? dayjs(e.settlement_due_date) : undefined,
      };
    });
  }, [rows]);

  /* ---------- KPIs (inalterados) ---------- */
  const cashflowKpis: KpiItem[] = useMemo(() => {
    const today = dayjs();
    const mStart = today.startOf("month");
    const mEnd = today.endOf("month");
    const prevMonth = today.subtract(1, "month");
    const prevStart = prevMonth.startOf("month");
    const prevEnd = prevMonth.endOf("month");
    const in7Start = today.startOf("day");
    const in7End = today.add(7, "day").endOf("day");

    let mtdIn = 0, mtdOutAbs = 0, mtdNet = 0, prevNet = 0;
    let n7Rec = 0, n7Pay = 0;

    for (const r of entriesParsed) {
      const signed = r.isCredit ? r.amount : -r.amount;

      if (!r.due.isBefore(mStart) && !r.due.isAfter(mEnd)) {
        if (r.isCredit) mtdIn += r.amount; else mtdOutAbs += r.amount;
        mtdNet += signed;
      }
      if (!r.due.isBefore(prevStart) && !r.due.isAfter(prevEnd)) prevNet += signed;

      if (!r.settled && !r.due.isBefore(in7Start) && !r.due.isAfter(in7End)) {
        if (r.isCredit) n7Rec += r.amount; else n7Pay += r.amount;
      }
    }

    const momChange = prevNet === 0 ? (mtdNet === 0 ? 0 : Number.POSITIVE_INFINITY)
                                    : (mtdNet - prevNet) / Math.abs(prevNet);
    const momLabel = `${Math.abs(momChange * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

    return [
      {
        key: "mtdNet",
        label: "MTD: Resultado",
        value: loading ? "—" : `${mtdNet >= 0 ? "+" : ""}${currency(mtdNet)}`,
        hint: loading ? "Carregando..." : `Entradas ${currency(mtdIn)} • Saídas -${currency(mtdOutAbs)}`,
        delta: { value: `M/M ${momChange >= 0 ? "+" : ""}${momLabel}`, positive: mtdNet >= 0 ? momChange >= 0 : momChange <= 0 },
      },
      {
        key: "overdueNet",
        label: "Em atraso (não liquidado)",
        value: overdueLoading ? "—" : `${overdueNet >= 0 ? "+" : ""}${currency(overdueNet)}`,
        hint: overdueLoading ? "Carregando..." : `Recebimentos ${currency(overdueRec)} • Pagamentos -${currency(overduePay)}`,
      },
      {
        key: "next7Net",
        label: "Próx. 7 dias",
        value: loading ? "—" : `${currency(n7Rec - n7Pay)}`,
        hint: loading ? "Carregando..." : `Recebimentos ${currency(n7Rec)} • Pagamentos ${currency(n7Pay)}`,
      },
    ];
  }, [entriesParsed, loading, overdueLoading, overdueRec, overduePay, overdueNet]);

  const settledKpis: KpiItem[] = useMemo(() => {
    const today = dayjs();
    const mStart = today.startOf("month");
    const mEnd = today.endOf("month");
    const prevMonth = today.subtract(1, "month");
    const prevStart = prevMonth.startOf("month");
    const prevEnd = prevMonth.endOf("month");

    let mtdIn = 0, mtdOutAbs = 0, mtdNet = 0;
    let prevIn = 0, prevOutAbs = 0, prevNet = 0;
    const last7Start = today.subtract(6, "day").startOf("day");
    const last7End = today.endOf("day");
    let last7In = 0, last7OutAbs = 0, last7Net = 0;

    for (const r of entriesParsed) {
      const sDate = r.settleDate;
      if (!sDate || !r.settled) continue;
      const signed = r.isCredit ? r.amount : -r.amount;

      if (!sDate.isBefore(mStart) && !sDate.isAfter(mEnd)) {
        if (r.isCredit) mtdIn += r.amount; else mtdOutAbs += r.amount;
        mtdNet += signed;
      }
      if (!sDate.isBefore(prevStart) && !sDate.isAfter(prevEnd)) {
        if (r.isCredit) prevIn += r.amount; else prevOutAbs += r.amount;
        prevNet += signed;
      }
      if (!sDate.isBefore(last7Start) && !sDate.isAfter(last7End)) {
        if (r.isCredit) last7In += r.amount; else last7OutAbs += r.amount;
        last7Net += signed;
      }
    }

    const momChange =
      prevNet === 0 ? (mtdNet === 0 ? 0 : Number.POSITIVE_INFINITY) : (mtdNet - prevNet) / Math.abs(prevNet);
    const momLabel = Number.isFinite(momChange)
      ? `${(momChange * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
      : "—";

    return [
      {
        key: "mtdSettledNet",
        label: "Realizado (mês atual)",
        value: loading ? "—" : `${mtdNet >= 0 ? "+" : ""}${currency(mtdNet)}`,
        hint: loading ? "Carregando..." : `Receb. ${currency(mtdIn)} • Pag. -${currency(mtdOutAbs)}`,
        delta: { value: `M/M ${mtdNet >= 0 ? "+" : ""}${momLabel}`, positive: mtdNet >= 0 ? momChange >= 0 : momChange <= 0 },
      },
      {
        key: "prevSettledNet",
        label: "Mês anterior",
        value: loading ? "—" : `${prevNet >= 0 ? "+" : ""}${currency(prevNet)}`,
        hint: loading ? "Carregando..." : `Receb. ${currency(prevIn)} • Pag. -${currency(prevOutAbs)}`,
      },
      {
        key: "last7Settled",
        label: "Últimos 7 dias",
        value: loading ? "—" : `${last7Net >= 0 ? "+" : ""}${currency(last7Net)}`,
        hint: loading ? "Carregando..." : `Receb. ${currency(last7In)} • Pag. -${currency(last7OutAbs)}`,
      },
    ];
  }, [entriesParsed, loading]);

  const autoKpis = context === "settled" ? settledKpis : cashflowKpis;

  // --------- Painel Bancos (usa FILTRADOS) ---------
  const totalFmt = useMemo(
    () =>
      Number(filteredTotalConsolidated || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    [filteredTotalConsolidated]
  );

  const topBank = useMemo(() => {
    if (!filteredBanks?.length) return null;
    return [...filteredBanks].sort((a, b) =>
      Number(a.consolidated_balance || 0) < Number(b.consolidated_balance || 0) ? 1 : -1
    )[0];
  }, [filteredBanks]);

  const rightPlacement = (i: number) => {
    if (!expanded) return "lg:col-span-3";
    if (i === 0) return "lg:col-span-3 lg:col-start-7";
    if (i === 1) return "lg:col-span-3 lg:col-start-10";
    if (i === 2) return "lg:col-span-6 lg:col-start-7";
    return "lg:col-span-3 lg:col-start-7";
  };

  return (
    <section className="relative max-h-[35vh]">
      <LayoutGroup>
        <motion.div
          layout
          className={`grid grid-cols-12 gap-3 w-full ${expanded ? "grid-rows-[100px_100px] auto-rows-[100px]" : ""}`}
          transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
        >
          {/* Card/ Painel Bancos */}
          <AnimatePresence initial={false}>
            {!expanded ? (
              <motion.button
                key="banks-card"
                layout
                transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
                onClick={() => setExpanded(true)}
                className="col-span-12 sm:col-span-6 lg:col-span-3 h-[100px] border border-gray-300 rounded-md bg-white px-3 py-2 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-wide text-gray-600">Saldo consolidado</span>
                  <span className="text-[11px] text-gray-500">contas: {filteredBanks.length || 0}</span>
                </div>
                <div className="mt-1 text-lg font-semibold text-gray-800 tabular-nums">{totalFmt}</div>
                {topBank && (
                  <div className="mt-1 flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 shrink-0 rounded-md border border-gray-300 bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-700">
                      {getInitials(topBank.institution)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] text-gray-800 truncate leading-tight">{topBank.institution}</div>
                      <div className="text-[10px] text-gray-500 truncate leading-tight">
                        {Number(topBank.consolidated_balance || 0).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </motion.button>
            ) : (
              <motion.div
                key="banks-panel"
                layout
                transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
                className="col-span-12 lg:col-span-6 lg:col-start-1 row-span-2"
              >
                <div className="border border-gray-300 rounded-md bg-white overflow-hidden flex flex-col h-full">
                  {/* topo fixo */}
                  <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-300">
                    <div className="text-[12px] text-gray-700">
                      Contas bancárias • Saldo consolidado:{" "}
                      <span className="font-semibold text-gray-800 tabular-nums">{totalFmt}</span>
                    </div>
                    <button
                      className="text-[12px] px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-100"
                      onClick={() => setExpanded(false)}
                    >
                      Fechar
                    </button>
                  </div>
                  {/* área rolável */}
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <BanksTable
                      key={banksRefreshKey}
                      banks={filteredBanks}
                      totalConsolidatedBalance={filteredTotalConsolidated}
                      loading={banksLoading}
                      error={banksData.error}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* KPIs à direita */}
          {autoKpis.map((kpi, i) => (
            <motion.div
              key={kpi.key}
              layout
              transition={{ layout: { type: "spring", stiffness: 380, damping: 32 } }}
              className={`col-span-12 sm:col-span-6 ${rightPlacement(i)} h-[100px] border border-gray-300 rounded-md bg-white px-3 py-2`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] uppercase tracking-wide text-gray-600">{kpi.label}</span>
                {kpi.delta && (
                  <span className={`text-[11px] ${kpi.delta.positive ? "text-green-600" : "text-red-600"}`}>
                    {kpi.delta.value}
                  </span>
                )}
              </div>
              <div className="mt-1 text-lg font-semibold text-gray-800 tabular-nums">{kpi.value}</div>
              {kpi.hint && <div className="mt-0.5 text-[11px] text-gray-500">{kpi.hint}</div>}
            </motion.div>
          ))}
        </motion.div>
      </LayoutGroup>
    </section>
  );
};

export default KpiRow;
