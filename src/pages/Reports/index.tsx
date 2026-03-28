import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import { api } from "@/api/requests";
import type { ReportsSummary } from "@/models/components/reports";
import type { GetBanksTableResponse } from "@/models/settings/banking";

import {
  buildReportsViewModel,
  fmtMoney,
  parseMoney,
  type ReportsTranslator,
} from "./helpers";

import KpiCard from "./components/KpiCard";
import AnimatedRangeLineChart from "./components/AnimatedRangeLineChart";
import AnimatedSplitBarsChart from "./components/AnimatedSplitBarsChart";
import ExpenseBreakdownCard from "./components/ExpenseBreakdownCard";
import OverdueListCard from "./components/OverdueListCard";
import AttentionPanel from "./components/AttentionPanel";
import InsightsCard from "./components/InsightsCard";

const START_DATE = dayjs().startOf("month").subtract(12, "month").format("YYYY-MM-DD");
const END_DATE = dayjs().endOf("month").format("YYYY-MM-DD");

const isZeroMoney = (value: unknown): boolean => {
  const n = parseMoney(value);
  return (n ?? 0) === 0;
};

const ReportsEmptyState: React.FC<{
  title: string;
  subtitle: string;
  actionLabel: string;
  onRefresh: () => void;
  disabled?: boolean;
}> = ({ title, subtitle, actionLabel, onRefresh, disabled }) => {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-col items-center justify-center px-5 py-12 text-center sm:px-8 sm:py-16">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-7 w-7 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 7h18" />
            <path d="M6 11h12" />
            <path d="M9 15h6" />
            <rect x="3" y="4" width="18" height="16" rx="2" />
          </svg>
        </div>

        <h2 className="text-base font-semibold text-gray-900 sm:text-lg">{title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">{subtitle}</p>

        <div className="mt-5">
          <Button variant="outline" onClick={onRefresh} disabled={disabled}>
            {actionLabel}
          </Button>
        </div>
      </div>
    </section>
  );
};

const ReportsPage: React.FC = () => {
  const { t } = useTranslation(["reports"]);

  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banksError, setBanksError] = useState<string | null>(null);
  const [totalConsolidatedBalance, setTotalConsolidatedBalance] = useState(0);

  useEffect(() => {
    document.title = String(t("pageTitle", { defaultValue: "Reports" }));
  }, [t]);

  const params = useMemo(
    () => ({
      date_from: START_DATE,
      date_to: END_DATE,
    }),
    [],
  );

  const periodLabel = useMemo(
    () => `${dayjs(START_DATE).format("MMM/YY")} → ${dayjs(END_DATE).format("MMM/YY")}`,
    [],
  );

  const fetchBanksTotal = useCallback(async () => {
    setBanksError(null);
    setLoadingBanks(true);

    try {
      const res = await api.getBanksTable({ active: true, ids: [] });
      const payload = res.data as GetBanksTableResponse;
      setTotalConsolidatedBalance(parseMoney(payload?.total_consolidated_balance) ?? 0);
    } catch (e) {
      console.error(e);
      setTotalConsolidatedBalance(0);
      setBanksError(
        String(
          t("errors.fetchBanksTotal", {
            defaultValue: "Failed to load bank totals.",
          }),
        ),
      );
    } finally {
      setLoadingBanks(false);
    }
  }, [t]);

  const fetchData = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const reportsPromise = api.getReportsSummary(params);
      const banksPromise = fetchBanksTotal();

      const [reportsRes] = await Promise.all([reportsPromise, banksPromise]);
      setData(reportsRes.data);
    } catch (e) {
      console.error(e);
      setError(
        String(
          t("errors.fetch", {
            defaultValue: "Failed to load reports summary.",
          }),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [fetchBanksTotal, params, t]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const tr = useCallback<ReportsTranslator>(
    (key: string, options?: Record<string, unknown>) => {
      const result = t(key, options as never);
      return typeof result === "string" ? result : String(result);
    },
    [t],
  );

  const vm = useMemo(
    () =>
      buildReportsViewModel({
        data,
        totalConsolidatedBalance,
        t: tr,
      }),
    [data, totalConsolidatedBalance, tr],
  );

  const isBusy = loading || loadingBanks;

  const hasNoData = useMemo(() => {
    if (!data) return false;

    const monthlyBarsEmpty = !data.monthly?.bars?.length;
    const monthlyCumulativeEmpty = !data.monthly?.cumulative?.length;
    const pieEmpty = !data.pie?.length;
    const overdueItemsEmpty = !data.overdue_items?.length;
    const nextDueItemsEmpty = !data.next_due_items?.length;

    const totalsEmpty =
      isZeroMoney(data.totals?.in) &&
      isZeroMoney(data.totals?.net) &&
      isZeroMoney(data.totals?.out_abs) &&
      Number(data.totals?.settlement_rate ?? 0) === 0;

    const mtdEmpty =
      isZeroMoney(data.mtd?.in) &&
      isZeroMoney(data.mtd?.out) &&
      isZeroMoney(data.mtd?.net);

    const overdueEmpty =
      isZeroMoney(data.overdue?.rec) &&
      isZeroMoney(data.overdue?.pay) &&
      isZeroMoney(data.overdue?.net);

    const next7Empty =
      isZeroMoney(data.next7?.rec) &&
      isZeroMoney(data.next7?.pay) &&
      isZeroMoney(data.next7?.net);

    const next30Empty =
      isZeroMoney(data.next30?.rec) &&
      isZeroMoney(data.next30?.pay) &&
      isZeroMoney(data.next30?.net);

    const countsEmpty =
      Number(data.counts?.overdue_items ?? 0) === 0 &&
      Number(data.counts?.next7_items ?? 0) === 0 &&
      Number(data.counts?.next30_items ?? 0) === 0;

    const liquidityEmpty = isZeroMoney(data.liquidity?.avg_monthly_outflow_abs);
    const balanceEmpty = totalConsolidatedBalance === 0;
    const noLargestItems = !data.largest_overdue_pay && !data.largest_overdue_rec;

    return (
      totalsEmpty &&
      mtdEmpty &&
      overdueEmpty &&
      next7Empty &&
      next30Empty &&
      monthlyBarsEmpty &&
      monthlyCumulativeEmpty &&
      pieEmpty &&
      overdueItemsEmpty &&
      nextDueItemsEmpty &&
      countsEmpty &&
      liquidityEmpty &&
      balanceEmpty &&
      noLargestItems
    );
  }, [data, totalConsolidatedBalance]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="w-full">
        <TopProgress active={isBusy} variant="top" topOffset={64} />

        <div className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-4 sm:px-5 md:space-y-6 md:px-8 lg:px-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold md:text-2xl">
                {t("title", { defaultValue: "Reports" })}
              </h1>
              <p className="mt-1 text-sm text-gray-500">{periodLabel}</p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                variant="common"
                onClick={fetchData}
                disabled={isBusy}
                className="w-full sm:w-auto"
              >
                {t("buttons.refresh", { defaultValue: "Refresh" })}
              </Button>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!error && banksError ? <p className="text-sm text-red-600">{banksError}</p> : null}

          {isBusy && !error && !data ? (
            <p className="text-sm text-gray-600">
              {t("loading", { defaultValue: "Loading..." })}
            </p>
          ) : null}

          {!error && data && hasNoData ? (
            <ReportsEmptyState
              title={t("empty.title", {
                defaultValue: "No data to show yet",
              })}
              subtitle={t("empty.subtitle", {
                defaultValue:
                  "There are no transactions, balances, or scheduled items available for this period yet. Once data starts coming in, your reports will appear here.",
              })}
              actionLabel={t("buttons.refresh", { defaultValue: "Refresh" })}
              onRefresh={fetchData}
              disabled={isBusy}
            />
          ) : null}

          {!error && data && !hasNoData ? (
            <>
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                {vm.metrics.map((metric) => (
                  <KpiCard key={metric.label} {...metric} />
                ))}
              </section>

              <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.35fr_0.95fr]">
                <AnimatedRangeLineChart
                  title={t("charts.cashTrajectory", {
                    defaultValue: "Cash trajectory",
                  })}
                  subLabel={t("charts.cashTrajectorySub", {
                    defaultValue: "Net accumulated movement over time",
                  })}
                  ranges={vm.lineRanges}
                  defaultRange="12M"
                  stats={{
                    inflow: fmtMoney(vm.summary.totalIn),
                    outflow: fmtMoney(vm.summary.totalOutAbs),
                    context: fmtMoney(vm.summary.consolidatedBalance),
                  }}
                />

                <ExpenseBreakdownCard
                  title={t("charts.expenseBreakdown", {
                    defaultValue: "Expense concentration",
                  })}
                  subtitle={t("charts.expenseBreakdownSub", {
                    defaultValue: "Where the outflow is concentrated",
                  })}
                  rows={vm.pieData}
                />
              </section>

              <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.45fr_0.85fr]">
                <AnimatedSplitBarsChart
                  title={t("charts.flowComposition", {
                    defaultValue: "Flow composition",
                  })}
                  subtitle={t("charts.flowCompositionSub", {
                    defaultValue: "Monthly inflow, outflow and net side by side",
                  })}
                  ranges={vm.barRanges}
                  defaultRange="12M"
                />

                <AttentionPanel
                  counts={vm.counts}
                  largestOverduePay={vm.largestOverduePay}
                  largestOverdueRec={vm.largestOverdueRec}
                  upcomingItems={vm.upcomingItems}
                  settlementRate={vm.summary.settlementRate}
                  avgMonthlyOutflowAbs={vm.summary.avgMonthlyOutflowAbs}
                  mtdNet={vm.summary.mtdNet}
                />
              </section>

              <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.05fr_0.95fr]">
                <OverdueListCard
                  title={t("tables.overdueTitle", {
                    defaultValue: "Overdue items",
                  })}
                  subtitle={t("tables.overdueSubtitle", {
                    defaultValue: "Most relevant unresolved overdue entries",
                  })}
                  items={vm.overdueItems}
                />

                <InsightsCard insights={vm.insights} />
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;