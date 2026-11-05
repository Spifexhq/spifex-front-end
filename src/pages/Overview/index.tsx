
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, RefreshCw } from "lucide-react";

import { api } from "@/api/requests";
import { useAppShell } from "@/contexts/AppShellContext";
import { useAuthContext } from "@/hooks/useAuth";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { formatDateFromISO } from "@/lib";

import type {
  OverviewData,
  OverviewQuery,
  OverviewRecord,
} from "@/models/finance/overview";
import type { Entry } from "@/models/entries/entries";

import EntryPreview from "@/pages/Finance/components/EntryTable/EntryPreview";
import SettlementModal from "@/pages/Finance/components/SettlementForm/SettlementModal";
import { useSettlementBanks } from "@/pages/Finance/components/SettlementForm/useSettlementBanks";

import Button from "@/shared/ui/Button";
import OverviewMetrics from "./OverviewMetrics";
import OverviewSkeleton from "./OverviewSkeleton";
import OverviewFilters from "./OverviewFilters";
import OverviewCharts from "./OverviewCharts";
import OverviewActivity from "./OverviewActivity";
import { exportSeries, queryFromParams } from "./overviewUtils";

export default function Overview() {
  const { t } = useTranslation("overview");
  const auth = useAuthContext();

  const [params, setParams] = useSearchParams();
  const [snapshot, setData] = useState<OverviewData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const [preview, setPreview] = useState<{
    entry: Entry;
    allowSettlement: boolean;
  } | null>(null);

  const [settling, setSettling] = useState<Entry[] | null>(null);

  const { banksData, retryBanks } = useSettlementBanks(!!settling);
  const shell = useAppShell();

  const query = queryFromParams(params);
  const signature = JSON.stringify(query);
  const organization = auth.organization?.organization?.id;

  const data =
    snapshot?.organization.id === organization
      ? snapshot
      : undefined;

  const inspectVersion = useRef(0);

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    inspectVersion.current++;
    setPreview(null);
    setSettling(null);
  }, [organization]);

  useEffect(() => {
    let alive = true;

    setLoading(true);
    setError("");

    // Preserve mounted charts and values for same-workspace filter updates.
    void api
      .getOverview(JSON.parse(signature))
      .then((response) => {
        if (alive) {
          setData(response.data);
        }
      })
      .catch((cause) => {
        if (alive) {
          setError(apiErrorMessage(cause, t("loadError")));
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [signature, organization, retry, t, shell?.financialRevision]);

  const change = (next: OverviewQuery) => {
    const result = new URLSearchParams();

    Object.entries(next).forEach(([key, value]) => {
      if (value) {
        result.set(key, value);
      }
    });

    setParams(result, { preventScrollReset: true });
  };

  const exportCsv = () => {
    if (!data) return;

    const blob = new Blob(
      [
        exportSeries(data.series, [
          t("date"),
          t("received"),
          t("paid"),
          t("net"),
          t("transactions"),
        ]),
      ],
      { type: "text/csv;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `spifex-overview-${data.period.start}-${data.period.end}.csv`;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const allowed = (permission: string) =>
    auth.isOwner ||
    auth.isSuperUser ||
    auth.permissions.includes(permission);

  const inspect = async (
    row: OverviewRecord,
    allowSettlement = false
  ) => {
    const version = ++inspectVersion.current;

    try {
      const response = await api.getEntry(row.entry_id || row.id);

      if (version === inspectVersion.current) {
        setPreview({
          entry: response.data,
          allowSettlement,
        });
      }
    } catch (cause) {
      if (version === inspectVersion.current) {
        setError(apiErrorMessage(cause, t("loadError")));
      }
    }
  };

  // Determine greeting based on local time.
  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "morning"
      : hour < 18
        ? "afternoon"
        : "evening";

  // Display the user's first and second names.
  // Handles extra whitespace and single-name users.
  const displayName =
    auth.user?.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .join(" ") || t("there");

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-8 lg:px-10">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
          {t(`greetings.${greeting}`, {
            name: displayName,
          })}
        </h1>

        <p className="mt-1.5 text-sm text-slate-500">
          {t("intro")}
        </p>
      </header>

      <OverviewFilters
        query={query}
        options={data?.filter_options}
        onChange={change}
        onExport={exportCsv}
        loading={loading}
        exportable={!!data?.capabilities.metrics}
      />

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p>{error}</p>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setRetry((value) => value + 1)}
          >
            <RefreshCw size={14} />
            {t("retry")}
          </Button>
        </div>
      )}

      {!data && loading ? (
        <OverviewSkeleton />
      ) : (
        data && (
          <div className="space-y-6" aria-busy={loading}>
            <div className="flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>
                {formatDateFromISO(data.period.start)} –{" "}
                {formatDateFromISO(data.period.end)}
              </span>

              <span>
                {t(`basisDescriptions.${data.period.basis}`)}
              </span>

              <span
                role="status"
                className="ml-auto inline-flex min-w-24 items-center justify-end gap-1.5 text-slate-400"
              >
                {loading ? (
                  <>
                    <Loader2
                      size={12}
                      className="animate-spin motion-reduce:animate-none"
                    />
                    {t("updating")}
                  </>
                ) : (
                  data.currency
                )}
              </span>
            </div>

            {data.capabilities.metrics && data.metrics && (
              <>
                <OverviewMetrics data={data} />

                <OverviewCharts
                  data={data}
                  group={query.group_by}
                  onGroup={(group_by) =>
                    change({
                      ...query,
                      group_by,
                    })
                  }
                />
              </>
            )}

            <OverviewActivity
              data={data}
              canPreview={allowed("view_cash_flow_entries")}
              inspect={inspect}
            />

            {!(
              data.capabilities.metrics ||
              data.capabilities.entries ||
              data.capabilities.open_entries ||
              data.capabilities.banks
            ) && (
              <p className="rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
                {t("restricted")}
              </p>
            )}
          </div>
        )
      )}

      <EntryPreview
        entry={preview?.entry || null}
        onClose={() => {
          inspectVersion.current++;
          setPreview(null);
        }}
        onSettle={
          preview?.allowSettlement &&
          allowed("add_settled_entries")
            ? (entry) => setSettling([entry])
            : undefined
        }
      />

      {allowed("add_settled_entries") && (
        <SettlementModal
          isOpen={!!settling}
          selectedEntries={settling || []}
          banksData={banksData}
          onRetryBanks={retryBanks}
          onClose={() => setSettling(null)}
          onSave={() => {
            setSettling(null);
            setRetry((value) => value + 1);
          }}
        />
      )}
    </main>
  );
}
