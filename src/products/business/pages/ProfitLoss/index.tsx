import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { api } from "@/core/api/requests";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { formatCurrency } from "@/lib";
import type { PnlConfig, PnlReportPayload, PnlSource } from "@/models/finance/profitLoss";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import Input from "@/shared/ui/Input";
import Snackbar from "@/shared/ui/Snackbar";
import TopProgress from "@/shared/ui/Loaders/TopProgress";

type Snack =
  | { message: string; severity: "success" | "error" | "warning" | "info" }
  | null;

function defaultPeriod() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(now) };
}

const SUBTOTAL_ORDER = [
  "gross_profit",
  "ebitda",
  "operating_profit",
  "profit_before_tax",
  "net_profit",
];

export default function ProfitLossReport() {
  const { t } = useTranslation("profitLoss");
  const initial = useMemo(defaultPeriod, []);
  const [config, setConfig] = useState<PnlConfig | null>(null);
  const [periodStart, setPeriodStart] = useState(initial.start);
  const [periodEnd, setPeriodEnd] = useState(initial.end);
  const [source, setSource] = useState<PnlSource | "">("");
  const [compare, setCompare] = useState<"" | "previous_period" | "previous_year">("");
  const [report, setReport] = useState<PnlReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [snack, setSnack] = useState<Snack>(null);

  const loadConfig = useCallback(async () => {
    try {
      const response = await api.getProfitLossConfig();
      setConfig(response.data);
    } catch (cause) {
      setSnack({ message: apiErrorMessage(cause, t("report.loadError")), severity: "error" });
    }
  }, [t]);

  const generate = useCallback(async () => {
    setBusy(true);
    try {
      const response = await api.getProfitLossReport({
        period_start: periodStart,
        period_end: periodEnd,
        source: source || undefined,
        compare: compare || undefined,
      });
      setReport(response.data.report);
    } catch (cause) {
      setSnack({ message: apiErrorMessage(cause, t("report.loadError")), severity: "error" });
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }, [compare, periodEnd, periodStart, source, t]);

  useEffect(() => {
    void (async () => {
      await loadConfig();
      await generate();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportReport = async () => {
    try {
      await api.exportProfitLoss({
        period_start: periodStart,
        period_end: periodEnd,
        source: source || undefined,
        filename: `profit-loss-${periodStart}-${periodEnd}.csv`,
      });
    } catch (cause) {
      setSnack({ message: apiErrorMessage(cause, t("report.exportError")), severity: "error" });
    }
  };

  const finalize = async () => {
    setBusy(true);
    try {
      const response = await api.finalizeProfitLossPeriod({
        period_start: periodStart,
        period_end: periodEnd,
        source: source || undefined,
        current_password: password,
      });
      setReport(response.data.report);
      setPassword("");
      setSnack({ message: t("report.finalized"), severity: "success" });
    } catch (cause) {
      setSnack({ message: apiErrorMessage(cause, t("report.finalizeError")), severity: "error" });
    } finally {
      setBusy(false);
      setFinalizing(false);
    }
  };

  if (loading && !report) return <TopProgress active variant="center" />;

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5">
      <Card padding="compact" className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs font-medium text-gray-600">
            <span>{t("report.from")}</span>
            <Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
          </label>
          <label className="space-y-1 text-xs font-medium text-gray-600">
            <span>{t("report.to")}</span>
            <Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
          </label>
          <label className="space-y-1 text-xs font-medium text-gray-600">
            <span>{t("report.source")}</span>
            <select
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-[13px]"
              value={source}
              onChange={(event) => setSource(event.target.value as PnlSource | "")}
            >
              <option value="">{t("report.workspaceDefault", { mode: config ? t(`sources.${config.source_mode}.short`) : "" })}</option>
              <option value="cash_settled">{t("sources.cash_settled.short")}</option>
              <option value="cash_committed">{t("sources.cash_committed.short")}</option>
              <option value="ledger" disabled={!config?.account_mappings?.length && config?.source_mode !== "ledger"}>
                {t("sources.ledger.short")}
              </option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-gray-600">
            <span>{t("report.compare")}</span>
            <select
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-[13px]"
              value={compare}
              onChange={(event) => setCompare(event.target.value as typeof compare)}
            >
              <option value="">{t("report.noComparison")}</option>
              <option value="previous_period">{t("report.previousPeriod")}</option>
              <option value="previous_year">{t("report.previousYear")}</option>
            </select>
          </label>
          <Button onClick={() => void generate()} isLoading={busy}>{t("report.generate")}</Button>
          <Button variant="secondary" onClick={() => void exportReport()}>{t("report.export")}</Button>
        </div>
      </Card>

      {report && (
        <>
          <Card padding="compact" className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
                {report.label}
              </span>
              <span className="text-xs text-gray-500">
                {report.period.start} — {report.period.end} · {report.base_currency} ·{" "}
                {t("report.mappingVersion", { version: report.mapping_version })}
              </span>
              {report.finalized && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {t("report.finalizedBadge")}
                </span>
              )}
              <Link className="ml-auto text-xs font-medium text-sky-700 hover:underline" to="/b/pnl/configuration">
                {t("report.configure")}
              </Link>
            </div>
            <p className="text-xs leading-5 text-amber-800">{t("report.disclaimer")}</p>
          </Card>

          <Card padding="none">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3">{t("report.line")}</th>
                  <th className="px-5 py-3 text-right">{t("report.amount")}</th>
                  {report.comparison && <th className="px-5 py-3 text-right">{t("report.previous")}</th>}
                </tr>
              </thead>
              <tbody>
                {report.sections.map((section) => (
                  <FragmentRows
                    key={section.key}
                    label={section.label}
                    rows={section.lines.map((line) => ({
                      code: line.code,
                      label: line.label,
                      amount: line.amount,
                      previous: line.previous,
                    }))}
                    total={section.total}
                    showPrevious={Boolean(report.comparison)}
                  />
                ))}
              </tbody>
            </table>
          </Card>

          <Card padding="compact" className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">{t("report.subtotals")}</h3>
            <div className="divide-y divide-gray-100">
              {SUBTOTAL_ORDER.filter((key) => key in report.subtotals).map((key) => (
                <div key={key} className="flex items-center justify-between py-2 text-[13px]">
                  <span className={key === "net_profit" ? "font-semibold text-gray-900" : "text-gray-700"}>
                    {t(`subtotals.${key}`)}
                  </span>
                  <span className={`tabular-nums ${key === "net_profit" ? "font-semibold text-gray-900" : "text-gray-800"}`}>
                    {formatCurrency(Number(report.subtotals[key]))}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {report.warnings.length > 0 && (
            <Card padding="compact" className="space-y-2">
              <h3 className="text-sm font-semibold text-amber-900">{t("report.warnings")}</h3>
              <ul className="space-y-1 text-xs leading-5 text-amber-800">
                {report.warnings.map((warning) => (
                  <li key={warning.code}>
                    {t(`warnings.${warning.code}`, {
                      count: warning.count ?? 0,
                      defaultValue: warning.message ?? warning.code,
                    })}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {!report.finalized && (
            <Card padding="compact" className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">{t("report.finalizeTitle")}</h3>
              <p className="text-xs leading-5 text-gray-600">{t("report.finalizeHint")}</p>
              {finalizing ? (
                <div className="flex flex-wrap items-end gap-2">
                  <label className="space-y-1 text-xs font-medium text-gray-600">
                    <span>{t("report.password")}</span>
                    <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
                  </label>
                  <Button onClick={() => void finalize()} disabled={!password} isLoading={busy}>{t("report.confirmFinalize")}</Button>
                  <Button variant="secondary" onClick={() => setFinalizing(false)}>{t("report.cancel")}</Button>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setFinalizing(true)}>{t("report.finalize")}</Button>
              )}
            </Card>
          )}
        </>
      )}

      <Snackbar
        open={snack != null}
        message={snack?.message}
        severity={snack?.severity}
        onClose={() => setSnack(null)}
      />
    </div>
  );
}

function FragmentRows({
  label,
  rows,
  total,
  showPrevious,
}: {
  label: string;
  rows: Array<{ code: string; label: string; amount: string; previous?: string | null }>;
  total: string;
  showPrevious: boolean;
}) {
  const { t } = useTranslation("profitLoss");
  return (
    <>
      <tr className="bg-gray-50">
        <td className="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600" colSpan={showPrevious ? 3 : 2}>
          {label}
        </td>
      </tr>
      {rows.map((row) => (
        <tr key={row.code} className="border-b border-gray-100">
          <td className="px-5 py-2 text-gray-800">{row.label}</td>
          <td className="px-5 py-2 text-right tabular-nums text-gray-900">{formatCurrency(Number(row.amount))}</td>
          {showPrevious && (
            <td className="px-5 py-2 text-right tabular-nums text-gray-500">
              {row.previous != null ? formatCurrency(Number(row.previous)) : "—"}
            </td>
          )}
        </tr>
      ))}
      <tr className="border-b border-gray-200">
        <td className="px-5 py-2 font-medium text-gray-900">{t("report.sectionTotal", { label })}</td>
        <td className="px-5 py-2 text-right font-medium tabular-nums text-gray-900">{formatCurrency(Number(total))}</td>
        {showPrevious && <td />}
      </tr>
    </>
  );
}
