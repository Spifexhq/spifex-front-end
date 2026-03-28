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
    []
  );

  const periodLabel = useMemo(
    () => `${dayjs(START_DATE).format("MMM/YY")} → ${dayjs(END_DATE).format("MMM/YY")}`,
    []
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
      setBanksError(String(t("errors.fetchBanksTotal", { defaultValue: "Failed to load bank totals." })));
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
      setError(String(t("errors.fetch", { defaultValue: "Failed to load reports summary." })));
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
    [t]
  );

  const vm = useMemo(
    () =>
      buildReportsViewModel({
        data,
        totalConsolidatedBalance,
        t: tr,
      }),
    [data, totalConsolidatedBalance, tr]
  );

  const isBusy = loading || loadingBanks;

  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      <main className="flex-1 transition-all duration-300">
        <TopProgress active={isBusy} variant="top" topOffset={64} />

        <div className="mb-[15px] mt-[15px] w-full space-y-6 px-6 md:px-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold md:text-2xl">
                {t("title", { defaultValue: "Reports" })}
              </h1>
              <p className="mt-1 text-sm text-gray-500">{periodLabel}</p>
            </div>

            <div className="flex gap-2">
              <Button variant="common" onClick={fetchData} disabled={isBusy}>
                {t("buttons.refresh", { defaultValue: "Refresh" })}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {!error && banksError && <p className="text-sm text-red-600">{banksError}</p>}

          {!error && data && (
            <>
              <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {vm.metrics.map((metric) => (
                  <KpiCard key={metric.label} {...metric} />
                ))}
              </section>

              <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.35fr_0.95fr]">
                <AnimatedRangeLineChart
                  title={t("charts.cashTrajectory", { defaultValue: "Cash trajectory" })}
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
                  title={t("charts.expenseBreakdown", { defaultValue: "Expense concentration" })}
                  subtitle={t("charts.expenseBreakdownSub", {
                    defaultValue: "Where the outflow is concentrated",
                  })}
                  rows={vm.pieData}
                />
              </section>

              <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.45fr_0.85fr]">
                <AnimatedSplitBarsChart
                  title={t("charts.flowComposition", { defaultValue: "Flow composition" })}
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
                  title={t("tables.overdueTitle", { defaultValue: "Overdue items" })}
                  subtitle={t("tables.overdueSubtitle", {
                    defaultValue: "Most relevant unresolved overdue entries",
                  })}
                  items={vm.overdueItems}
                />

                <InsightsCard insights={vm.insights} />
              </section>
            </>
          )}

          {isBusy && !error && !data && (
            <p className="text-sm text-gray-600">{t("loading", { defaultValue: "Loading..." })}</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;