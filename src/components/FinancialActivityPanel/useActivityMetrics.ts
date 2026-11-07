import { isCancel } from "axios";
import { isSetupRequestCancelled } from "@/lib/localeSetup";
import { getAuthGeneration } from "@/core/authentication/authGeneration";
import { getOrgExternalIdStored } from "@/lib/tokens";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/core/api/requests";
import { formatCurrency } from "@/lib/currency/formatCurrency";
import type { CashflowKpis, SettledKpis } from "@/models/components/cardKpis";
import type { EntryFilters } from "@/models/components/filterBar";

export type KpiItem = {
  key: string;
  trend?: number[];
  label: string;
  value: string | number;
  numericValue?: number | null;
  formatValue?: (value: number) => string;
  hint?: string;
  delta?: { value: string; positive?: boolean };
};

const parseMoney = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const s = typeof v === "number" ? String(v) : String(v).trim();
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const currencyFromDecimal = (v: unknown) => {
  const n = parseMoney(v);
  return n === null ? "—" : formatCurrency(n);
};

const signedCurrencyFromDecimal = (v: unknown) => {
  const n = parseMoney(v);
  if (n === null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${formatCurrency(n)}`;
};

export function useActivityMetrics({ filters, contextSettlement, refreshToken = 0, enabled = true }: {
  filters?: EntryFilters; contextSettlement: boolean; refreshToken?: number; enabled?: boolean;
}) {
  const { t } = useTranslation("kpiCards");
  const tr = useCallback((key: string, options?: Record<string, unknown>) => String(t(key, options)), [t]);
  const [cf, setCf] = useState<CashflowKpis | null>(null);
  const [st, setSt] = useState<SettledKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const cashflowCategoryParam = useMemo(
    () => (filters?.cashflow_category_id?.length ? filters.cashflow_category_id.join(",") : undefined),
    [filters?.cashflow_category_id],
  );

  const bankParam = useMemo(
    () => (filters?.bank_id?.length ? filters.bank_id.join(",") : undefined),
    [filters?.bank_id],
  );

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    const generation = getAuthGeneration(), organization = getOrgExternalIdStored();
    const current = () => mounted && generation === getAuthGeneration() && organization === getOrgExternalIdStored();
    const freshRead = async <T,>(read: () => Promise<T>): Promise<T> => {
      for (let attempt = 0; ; attempt++) {
        try { return await read(); }
        catch (error) {
          if (!current() || !(isCancel(error) || isSetupRequestCancelled(error)) || attempt >= 2) throw error;
        }
      }
    };

    (async () => {
      setLoading(true);
      setError(false);
      try {
        if (contextSettlement) {
          const { data } = await freshRead(() => api.getSettledKpis({
            description: filters?.description,
            observation: filters?.observation,
            cashflow_category_id: cashflowCategoryParam,
            bank_id: bankParam,
          }));

          if (current()) {
            setSt(data);
            setCf(null);
          }
        } else {
          const { data } = await freshRead(() => api.getCashflowKpis({
            description: filters?.description,
            observation: filters?.observation,
            cashflow_category_id: cashflowCategoryParam,
          }));

          if (current()) {
            setCf(data);
            setSt(null);
          }
        }
      } catch (e) {
        if (!current()) return;
        console.error("KPI fetch failed", e);
        if (current()) {
          setCf(null);
          setSt(null);
          setError(true);
        }
      } finally {
        if (current()) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [
    enabled,
    retryKey,
    contextSettlement,
    cashflowCategoryParam,
    bankParam,
    filters?.description,
    filters?.observation,
    refreshToken,
  ]);

  const cashflowKpis: KpiItem[] = useMemo(() => {
    if (!cf) {
      const loadingTxt = tr("kpiCards:loading");
      return [
        { key: "mtdNet", label: tr("kpiCards:cashflow.labels.mtdNet"), value: "—", hint: loadingTxt },
        { key: "overdueNet", label: tr("kpiCards:cashflow.labels.overdueNet"), value: "—", hint: loadingTxt },
        { key: "next7Net", label: tr("kpiCards:cashflow.labels.next7Net"), value: "—", hint: loadingTxt },
      ];
    }

    const mom = cf.mom_change;
    const momLabel = cf.mom_infinite
      ? "∞%"
      : mom == null
        ? "—"
        : `${(Math.abs(mom) * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;

    const mtdNetN = parseMoney(cf.mtd.net) ?? 0;
    const momPositive = cf.mom_infinite ? mtdNetN >= 0 : (mom ?? 0) >= 0;

    return [
      {
        key: "mtdNet",
        label: tr("kpiCards:cashflow.labels.mtdNet"),
        value: signedCurrencyFromDecimal(cf.mtd.net),
        numericValue: parseMoney(cf.mtd.net),
        formatValue: signedCurrencyFromDecimal,
        hint: [
          tr("kpiCards:cashflow.hints.mtd", {
            inAmt: currencyFromDecimal(cf.mtd.in),
            outAmt: currencyFromDecimal(cf.mtd.out),
          }),
        ]
          .filter(Boolean)
          .join(" • "),
        delta: {
          value: cf.mom_infinite ? tr("kpiCards:delta.noBase") : tr("kpiCards:delta.mom", { value: `${mom != null && mom > 0 ? "+" : mom != null && mom < 0 ? "−" : ""}${momLabel}` }),
          positive: momPositive,
        },
      },
      {
        key: "overdueNet",
        label: tr("kpiCards:cashflow.labels.overdueNet"),
        value: signedCurrencyFromDecimal(cf.overdue.net),
        numericValue: parseMoney(cf.overdue.net),
        formatValue: signedCurrencyFromDecimal,
        hint: [
          tr("kpiCards:cashflow.hints.overdue", {
            recAmt: currencyFromDecimal(cf.overdue.rec),
            payAmt: currencyFromDecimal(cf.overdue.pay),
          }),
        ]
          .filter(Boolean)
          .join(" • "),
      },
      {
        key: "next7Net",
        label: tr("kpiCards:cashflow.labels.next7Net"),
        value: currencyFromDecimal(cf.next7.net),
        numericValue: parseMoney(cf.next7.net),
        formatValue: currencyFromDecimal,
        hint: [
          tr("kpiCards:cashflow.hints.next7", {
            recAmt: currencyFromDecimal(cf.next7.rec),
            payAmt: currencyFromDecimal(cf.next7.pay),
          }),
        ]
          .filter(Boolean)
          .join(" • "),
      },
    ];
  }, [cf, tr]);

  const settledKpis: KpiItem[] = useMemo(() => {
    if (!st) {
      const loadingTxt = tr("kpiCards:loading");
      return [
        { key: "mtdSettledNet", label: tr("kpiCards:settled.labels.mtdSettledNet"), value: "—", hint: loadingTxt },
        { key: "prevSettledNet", label: tr("kpiCards:settled.labels.prevSettledNet"), value: "—", hint: loadingTxt },
        { key: "last7Settled", label: tr("kpiCards:settled.labels.last7Settled"), value: "—", hint: loadingTxt },
      ];
    }

    const mom = st.mom_change;
    const momLabel = st.mom_infinite
      ? "∞%"
      : mom == null
        ? "—"
        : `${(Math.abs(mom) * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;

    const mtdNetN = parseMoney(st.mtd.net) ?? 0;
    const momPositive = st.mom_infinite ? mtdNetN >= 0 : (mom ?? 0) >= 0;

    return [
      {
        key: "mtdSettledNet",
        label: tr("kpiCards:settled.labels.mtdSettledNet"),
        value: signedCurrencyFromDecimal(st.mtd.net),
        numericValue: parseMoney(st.mtd.net),
        formatValue: signedCurrencyFromDecimal,
        hint: [
          tr("kpiCards:settled.hints.mtd", {
            recAmt: currencyFromDecimal(st.mtd.in),
            payAmt: currencyFromDecimal(st.mtd.out),
          }),
        ]
          .filter(Boolean)
          .join(" • "),
        delta: {
          value: st.mom_infinite ? tr("kpiCards:delta.noBase") : tr("kpiCards:delta.mom", { value: `${mom != null && mom > 0 ? "+" : mom != null && mom < 0 ? "−" : ""}${momLabel}` }),
          positive: momPositive,
        },
      },
      {
        key: "prevSettledNet",
        label: tr("kpiCards:settled.labels.prevSettledNet"),
        value: signedCurrencyFromDecimal(st.prev.net),
        numericValue: parseMoney(st.prev.net),
        formatValue: signedCurrencyFromDecimal,
        hint: [
          tr("kpiCards:settled.hints.prev", {
            recAmt: currencyFromDecimal(st.prev.in),
            payAmt: currencyFromDecimal(st.prev.out),
          }),
        ]
          .filter(Boolean)
          .join(" • "),
      },
      {
        key: "last7Settled",
        label: tr("kpiCards:settled.labels.last7Settled"),
        value: signedCurrencyFromDecimal(st.last7.net),
        numericValue: parseMoney(st.last7.net),
        formatValue: signedCurrencyFromDecimal,
        hint: [
          tr("kpiCards:settled.hints.last7", {
            recAmt: currencyFromDecimal(st.last7.in),
            payAmt: currencyFromDecimal(st.last7.out),
          }),
        ]
          .filter(Boolean)
          .join(" • "),
      },
    ];
  }, [st, tr]);

  const autoKpis = contextSettlement ? settledKpis : cashflowKpis;


  return { metrics: autoKpis.map(metric => ({ ...metric, trend: (contextSettlement ? st?.trends : cf?.trends)?.[metric.key]?.map(point => Number(point.net)) })), loading, error, retry: () => setRetryKey(key => key + 1) };
}
