/* -----------------------------------------------------------------------------
 * File: src/pages/LimitsAndUsage.tsx
 * Route: /settings/limits
 * i18n: namespace "limits"
 * ---------------------------------------------------------------------------*/

import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import TopProgress from "@/components/ui/Loaders/TopProgress";
import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import { api } from "@/api/requests";
import { useRequireLogin } from "@/hooks/useRequireLogin";

/* --------------------------------- Types ---------------------------------- */
type LimitsPeriod = "daily" | "weekly" | "monthly" | "lifetime";

type LimitsItem = {
  permission: {
    code: string;
    name: string | null;
    category: string | null;
    description: string | null;
  };
  plan: { code: string; name: string };
  limits: { unmetered: boolean; limit: number | null; period: LimitsPeriod; enforce: boolean };
  usage: {
    used: number;
    remaining: number | null;
    window_start: string | null;
    window_end: string | null;
    resets_at: string | null;
    server_time: string;
  };
};

type EntitlementsPayload = { plan: { code: string; name: string }; items: LimitsItem[] };

/* --------------------------------- UI bits -------------------------------- */
const ToneBadge: React.FC<{
  tone?: "green" | "lime" | "amber" | "orange" | "red" | "gray";
  children: React.ReactNode;
}> = ({ tone = "gray", children }) => {
  const tones: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    lime: "bg-lime-50 text-lime-700 border-lime-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    red: "bg-rose-50 text-rose-700 border-rose-200",
    gray: "bg-gray-50 text-gray-700 border-gray-200",
  };
  return (
    <span
      className={`text-[11px] px-2 py-0.5 rounded-full border ${tones[tone]} inline-flex items-center`}
    >
      {children}
    </span>
  );
};

const Progress: React.FC<{
  pct: number;
  tone: "green" | "lime" | "amber" | "orange" | "red" | "gray";
}> = ({ pct, tone }) => {
  const track = "h-2 w-full rounded-full bg-gray-100";
  const fills: Record<string, string> = {
    green: "bg-emerald-500",
    lime: "bg-lime-500",
    amber: "bg-amber-500",
    orange: "bg-orange-500",
    red: "bg-rose-500",
    gray: "bg-gray-400",
  };
  return (
    <div className={track} aria-label="usage">
      <div
        className={`h-2 rounded-full ${fills[tone]} transition-[width] duration-300`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
};

/* ------------------------------- Computations ------------------------------ */
const pct = (used: number, limit: number | null, unmetered: boolean) => {
  if (unmetered || !limit || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
};

type StatusTone =
  | { key: "unmetered"; tone: "lime" }
  | { key: "ok"; tone: "green" }
  | { key: "warn"; tone: "amber" }
  | { key: "high"; tone: "orange" }
  | { key: "exhausted"; tone: "red" }
  | { key: "na"; tone: "gray" };

function statusFrom(used: number, limit: number | null, unmetered: boolean): StatusTone {
  if (unmetered) return { key: "unmetered", tone: "lime" };
  if (limit == null || limit <= 0) return { key: "na", tone: "gray" };

  const p = (used / limit) * 100;
  if (p >= 100) return { key: "exhausted", tone: "red" };
  if (p >= 90) return { key: "high", tone: "orange" };
  if (p >= 70) return { key: "warn", tone: "amber" };
  return { key: "ok", tone: "green" };
}

/* -------------------------------- Component ------------------------------- */
const LimitsAndUsage: React.FC = () => {
  const { t, i18n } = useTranslation("limits");
  const isLogged = useRequireLogin();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EntitlementsPayload | null>(null);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<"permission" | "period" | "limit" | "used" | "pct">("pct");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    (async () => {
      try {
        const resp = await api.getEntitlementLimits(); // typed on the API layer
        setData(resp.data as EntitlementsPayload); // keep page resilient even if API is loosely typed
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!data?.items) return [];
    const qq = q.trim().toLowerCase();
    const base = !qq
      ? data.items
      : data.items.filter((it) => {
          const code = it.permission.code?.toLowerCase() || "";
          const name = it.permission.name?.toLowerCase() || "";
          const category = it.permission.category?.toLowerCase() || "";
          return code.includes(qq) || name.includes(qq) || category.includes(qq);
        });

    const enriched = base.map((it) => {
      const percentage = pct(it.usage.used, it.limits.limit, it.limits.unmetered);
      return { ...it, _pct: percentage };
    });

    const dir = sortDir === "asc" ? 1 : -1;
    return enriched.sort((a, b) => {
      const A =
        sortKey === "permission"
          ? a.permission.code
          : sortKey === "period"
          ? a.limits.period
          : sortKey === "limit"
          ? a.limits.limit ?? 0
          : sortKey === "used"
          ? a.usage.used
          : a._pct;
      const B =
        sortKey === "permission"
          ? b.permission.code
          : sortKey === "period"
          ? b.limits.period
          : sortKey === "limit"
          ? b.limits.limit ?? 0
          : sortKey === "used"
          ? b.usage.used
          : b._pct;

      if (typeof A === "string" && typeof B === "string") return A.localeCompare(B) * dir;
      return ((A as number) - (B as number)) * dir;
    });
  }, [data, q, sortKey, sortDir]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  if (!isLogged) return null;
  if (loading)
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );

  return (
    <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-600">
              {t("header.kicker")}
            </div>
            <h1 className="text-[16px] font-semibold text-gray-900">
              {t("header.title")}
            </h1>
            <p className="text-[12px] text-gray-600">
              {t("header.subtitle")}{" "}
              <span className="font-medium">{data?.plan?.name ?? t("header.planUnknown")}</span>
            </p>
            {/* Legend */}
            <div className="mt-2 flex flex-wrap gap-2">
              <ToneBadge tone="green">{t("legend.ok")}</ToneBadge>
              <ToneBadge tone="amber">{t("legend.warn")}</ToneBadge>
              <ToneBadge tone="orange">{t("legend.high")}</ToneBadge>
              <ToneBadge tone="red">{t("legend.exhausted")}</ToneBadge>
              <ToneBadge tone="lime">{t("legend.unmetered")}</ToneBadge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="h-9 w-64 text-[13px] rounded-md border border-gray-300 px-3 outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>
        </header>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="grid grid-cols-12 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[11px] font-medium text-gray-700 uppercase tracking-wide">
            <button
              className="text-left col-span-4 hover:underline"
              onClick={() => toggleSort("permission")}
            >
              {t("th.permission")}
            </button>
            <button
              className="text-left col-span-2 hover:underline"
              onClick={() => toggleSort("period")}
            >
              {t("th.period")}
            </button>
            <button
              className="text-left col-span-2 hover:underline"
              onClick={() => toggleSort("limit")}
            >
              {t("th.limit")}
            </button>
            <button
              className="text-left col-span-2 hover:underline"
              onClick={() => toggleSort("used")}
            >
              {t("th.used")}
            </button>
            <button
              className="text-left col-span-2 hover:underline"
              onClick={() => toggleSort("pct")}
            >
              {t("th.percent")}
            </button>
          </div>

          <div className="divide-y divide-gray-200">
            {filtered.map((it) => {
              const { permission, limits, usage } = it;
              const percentage = pct(usage.used, limits.limit, limits.unmetered);
              const st = statusFrom(usage.used, limits.limit, limits.unmetered);

              const label = t(`perms.${permission.code}.label`, {
                defaultValue: permission.name ?? permission.code,
              });
              const description = t(`perms.${permission.code}.description`, {
                defaultValue: permission.description ?? "",
              });

              const periodLabel = t(`periods.${limits.period}`, {
                defaultValue: limits.period,
              });

              const statusText =
                limits.unmetered
                  ? t("status.unmetered")
                  : st.key === "exhausted"
                  ? t("status.exhausted")
                  : st.key === "high"
                  ? t("status.high")
                  : st.key === "warn"
                  ? t("status.warning")
                  : t("status.ok");

              return (
                <div
                  key={`${permission.code}-${limits.period}`}
                  className="grid grid-cols-12 items-center px-4 py-3"
                >
                  {/* Permission */}
                  <div className="col-span-4">
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-medium text-gray-900">{label}</div>
                      <ToneBadge tone={st.tone}>{statusText}</ToneBadge>
                    </div>
                    <div className="text-[12px] text-gray-600">{permission.code}</div>
                    {description && (
                      <div className="mt-0.5 text-[11px] text-gray-500 line-clamp-2">
                        {description}
                      </div>
                    )}
                  </div>

                  {/* Period */}
                  <div className="col-span-2 text-[13px] text-gray-800">
                    {periodLabel}
                    {!limits.unmetered && usage.resets_at && (
                      <div className="text-[11px] text-gray-500">
                        {t("resets")}: {new Date(usage.resets_at).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Limit */}
                  <div className="col-span-2 text-[13px] text-gray-800">
                    {limits.unmetered ? t("unmetered") : limits.limit ?? 0}
                    {limits.enforce === false && (
                      <div className="text-[11px] text-gray-500">{t("notEnforced")}</div>
                    )}
                  </div>

                  {/* Used */}
                  <div className="col-span-2">
                    <div className="text-[13px] text-gray-800">
                      {usage.used}
                      {!limits.unmetered && limits.limit != null ? ` / ${limits.limit}` : ""}
                    </div>
                    {limits.unmetered ? (
                      <div className="text-[11px] text-gray-500">{t("infinite")}</div>
                    ) : (
                      <div className="text-[11px] text-gray-500">
                        {t("remaining")}: {usage.remaining ?? 0}
                      </div>
                    )}
                  </div>

                  {/* % + progress */}
                  <div className="col-span-2">
                    <div className="mb-1 text-[13px] text-gray-800 tabular-nums">
                      {percentage}%
                    </div>
                    <Progress pct={percentage} tone={st.tone} />
                  </div>
                </div>
              );
            })}

            {!filtered.length && (
              <div className="px-4 py-6 text-[13px] text-gray-600">
                {t("empty")}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default LimitsAndUsage;
