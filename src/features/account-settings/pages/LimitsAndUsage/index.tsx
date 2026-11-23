/* -----------------------------------------------------------------------------
 * File: src/features/account-settings/pages/LimitsAndUsage/index.tsx
 * Route: /settings/limits
 * i18n: namespace "limits"
 * ---------------------------------------------------------------------------*/

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Gauge,
  Infinity as InfinityIcon,
  RefreshCw,
  Search,
  SearchX,
  ShieldAlert,
  X,
} from "lucide-react";

import { api } from "@/core/api/requests";
import { useRequireLogin } from "@/hooks/useRequireLogin";
import { useAuthContext } from "@/hooks/useAuth";
import { formatDateFromISO } from "@/lib/date/formatDate";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { permissionIcons } from "@/core/permissions/icons";
import Input from "@/shared/ui/Input";
import Badge, { type BadgeTone } from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import SegmentedControl from "@/shared/ui/SegmentedControl";
import { SettingsPageSkeleton } from "@/shared/ui/Loaders/PageSkeleton";

/* --------------------------------- Types ---------------------------------- */

type LimitsPeriod = "daily" | "weekly" | "monthly" | "lifetime";
type StatusKey = "ok" | "warn" | "high" | "exhausted" | "unlimited" | "na";
type StatusFilter = "all" | "attention" | "atLimit" | "unlimited";
type SortKey = "usage" | "name" | "period";

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

type Row = {
  item: LimitsItem;
  label: string;
  description: string;
  metered: boolean;
  percent: number;
  remaining: number;
  status: StatusKey;
};

/* --------------------------------- Helpers -------------------------------- */

const PERIOD_ORDER: Record<LimitsPeriod, number> = {
  daily: 0,
  weekly: 1,
  monthly: 2,
  lifetime: 3,
};

const STATUS_STYLE: Record<
  StatusKey,
  { badge: BadgeTone; icon: string; bar: string; dot: string; labelKey: string }
> = {
  ok: {
    badge: "success",
    icon: "border-emerald-200 bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
    labelKey: "status.ok",
  },
  warn: {
    badge: "warning",
    icon: "border-amber-200 bg-amber-50 text-amber-800",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
    labelKey: "status.warning",
  },
  high: {
    badge: "orange",
    icon: "border-orange-200 bg-orange-50 text-orange-700",
    bar: "bg-orange-500",
    dot: "bg-orange-500",
    labelKey: "status.high",
  },
  exhausted: {
    badge: "danger",
    icon: "border-rose-200 bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
    dot: "bg-rose-500",
    labelKey: "status.exhausted",
  },
  unlimited: {
    badge: "lime",
    icon: "border-lime-200 bg-lime-50 text-lime-700",
    bar: "bg-gray-200",
    dot: "bg-lime-500",
    labelKey: "status.unmetered",
  },
  na: {
    badge: "neutral",
    icon: "border-gray-200 bg-gray-50 text-gray-600",
    bar: "bg-gray-300",
    dot: "bg-gray-400",
    labelKey: "status.unmetered",
  },
};

function meterOf(item: LimitsItem): Pick<Row, "metered" | "percent" | "remaining" | "status"> {
  const metered = Boolean(item.limits.enforce) && !item.limits.unmetered && item.limits.limit != null;
  if (!metered) {
    return { metered: false, percent: 0, remaining: 0, status: "unlimited" };
  }

  const limit = Math.max(0, Number(item.limits.limit));
  if (limit <= 0) {
    return { metered: true, percent: 100, remaining: 0, status: "exhausted" };
  }

  const percent = Math.min(100, Math.max(0, Math.round((item.usage.used / limit) * 100)));
  const remaining = item.usage.remaining ?? Math.max(limit - item.usage.used, 0);
  const status: StatusKey =
    percent >= 100 ? "exhausted" : percent >= 90 ? "high" : percent >= 70 ? "warn" : "ok";

  return { metered: true, percent, remaining, status };
}

/* --------------------------------- Components ----------------------------- */

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="relative inline-flex min-w-0 items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        title={label}
        aria-label={label}
        className="h-8 w-full appearance-none rounded-md border border-gray-300 bg-white pl-2.5 pr-7 text-[12px] font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        aria-hidden="true"
        className="pointer-events-none absolute right-2 text-gray-400"
      />
    </label>
  );
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: "asc" | "desc";
  onSort: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  const { t } = useTranslation("limits");
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      aria-label={`${label}: ${active ? (direction === "asc" ? t("filters.ascending") : t("filters.descending")) : t("filters.sort")}`}
      className="group inline-flex items-center gap-1 text-left text-[11px] font-semibold text-gray-500 transition-colors hover:text-gray-800"
    >
      {label}
      {active ? (
        direction === "asc" ? (
          <ArrowUp size={12} aria-hidden="true" />
        ) : (
          <ArrowDown size={12} aria-hidden="true" />
        )
      ) : (
        <ArrowUpDown
          size={12}
          aria-hidden="true"
          className="text-gray-300 transition-colors group-hover:text-gray-400"
        />
      )}
    </button>
  );
}

function LimitRow({ row, numberFormat }: { row: Row; numberFormat: Intl.NumberFormat }) {
  const { t } = useTranslation("limits");
  const { item, label, description, metered, percent, remaining, status } = row;
  const style = STATUS_STYLE[status];
  const Icon = permissionIcons(item.permission.code);
  const statusLabel = t(style.labelKey);
  const resetDate = metered && item.usage.resets_at ? formatDateFromISO(item.usage.resets_at) : "";

  return (
    <li className="px-4 py-3.5 transition-colors hover:bg-gray-50/70">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(240px,1.2fr)_160px_120px] lg:items-center lg:gap-6">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${style.icon}`}
          >
            <Icon size={17} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="truncate text-[13px] font-medium leading-5 text-gray-900">{label}</p>
              <span className="lg:hidden">
                <Badge tone={style.badge} size="sm" dot>
                  {statusLabel}
                </Badge>
              </span>
            </div>
            <p className="truncate text-[11px] leading-4 text-gray-400">{item.permission.code}</p>
            {description && (
              <p className="line-clamp-1 text-[11px] leading-4 text-gray-500">{description}</p>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[12px] font-medium tabular-nums text-gray-900">
              {metered ? (
                <>
                  {numberFormat.format(item.usage.used)}
                  <span className="font-normal text-gray-400">
                    {" / "}
                    {numberFormat.format(item.limits.limit ?? 0)}
                  </span>
                </>
              ) : (
                <span className="font-normal text-gray-500">{t("infinite")}</span>
              )}
            </span>
            {metered && (
              <span className="text-[11px] font-medium tabular-nums text-gray-500">{percent}%</span>
            )}
          </div>

          {metered ? (
            <div
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              aria-label={label}
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full rounded-full ${style.bar} transition-[width] duration-300 motion-reduce:transition-none`}
                style={{ width: `${percent}%` }}
              />
            </div>
          ) : (
            <div
              className="mt-1.5 h-1.5 rounded-full border border-dashed border-gray-200 bg-gray-50"
              aria-hidden="true"
            />
          )}

          <p className="mt-1 text-[11px] leading-4 text-gray-500">
            {metered ? t("usage.left", { count: remaining }) : t("usage.notMetered")}
          </p>
        </div>

        <div className="text-[12px] leading-5 text-gray-700">
          <span className="mr-1 text-[11px] text-gray-500 lg:hidden">{t("table.period")}:</span>
          <span>{t(`periods.${item.limits.period}`, { defaultValue: item.limits.period })}</span>
          {resetDate && (
            <span className="block text-[11px] text-gray-500">
              {t("usage.resetsOn", { date: resetDate })}
            </span>
          )}
        </div>

        <div className="hidden lg:flex lg:justify-end">
          <Badge tone={style.badge} size="sm" dot>
            {statusLabel}
          </Badge>
        </div>
      </div>
    </li>
  );
}

/* -------------------------------- Component ------------------------------- */

const LimitsAndUsage = () => {
  const { t, i18n } = useTranslation("limits");
  const navigate = useNavigate();
  const isLogged = useRequireLogin();
  const { isOwner, isSuperUser, permissions } = useAuthContext();
  const canManageBilling = isOwner || isSuperUser || permissions.includes("view_billing_page");

  const [data, setData] = useState<EntitlementsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<"all" | LimitsPeriod>("all");
  const [sortKey, setSortKey] = useState<SortKey>("usage");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void api
      .getEntitlementLimits()
      .then((response) => {
        if (active) setData(response.data as EntitlementsPayload);
      })
      .catch((cause) => {
        if (active) setError(apiErrorMessage(cause, t("errors.body")));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey, t]);

  const numberFormat = useMemo(
    () => new Intl.NumberFormat(i18n.language || "en", { maximumFractionDigits: 0 }),
    [i18n.language],
  );

  const rows = useMemo<Row[]>(() => {
    const items = data?.items ?? [];
    return items.map((item) => {
      const label = t(`perms.${item.permission.code}.label`, {
        defaultValue: item.permission.name ?? item.permission.code,
      });
      const description = t(`perms.${item.permission.code}.description`, {
        defaultValue: item.permission.description ?? "",
      });
      return { item, label, description: description || "", ...meterOf(item) };
    });
  }, [data, t]);

  const stats = useMemo(() => {
    let attention = 0;
    let atLimit = 0;
    let unlimited = 0;
    for (const row of rows) {
      if (row.status === "unlimited") unlimited += 1;
      if (row.status === "exhausted") {
        atLimit += 1;
      } else if (row.status === "warn" || row.status === "high") {
        attention += 1;
      }
    }
    return { all: rows.length, attention, atLimit, unlimited };
  }, [rows]);

  const periods = useMemo(() => {
    const seen = new Set<LimitsPeriod>();
    for (const row of rows) seen.add(row.item.limits.period);
    return Array.from(seen).sort((a, b) => PERIOD_ORDER[a] - PERIOD_ORDER[b]);
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = rows.filter((row) => {
      if (statusFilter === "attention" && !["warn", "high"].includes(row.status)) {
        return false;
      }
      if (statusFilter === "atLimit" && row.status !== "exhausted") return false;
      if (statusFilter === "unlimited" && row.status !== "unlimited") return false;
      if (periodFilter !== "all" && row.item.limits.period !== periodFilter) return false;
      if (!needle) return true;
      return [row.label, row.item.permission.code, row.item.permission.name ?? "", row.description]
        .some((value) => value.toLowerCase().includes(needle));
    });

    const direction = sortDir === "asc" ? 1 : -1;
    return matches.sort((a, b) => {
      if (sortKey === "name") {
        return a.label.localeCompare(b.label, i18n.language) * direction;
      }
      if (sortKey === "period") {
        return (
          (PERIOD_ORDER[a.item.limits.period] - PERIOD_ORDER[b.item.limits.period]) * direction ||
          a.label.localeCompare(b.label, i18n.language)
        );
      }
      const aValue = a.metered ? a.percent : -1;
      const bValue = b.metered ? b.percent : -1;
      if (a.metered !== b.metered) return a.metered ? -1 : 1;
      return (aValue - bValue) * direction || a.label.localeCompare(b.label, i18n.language);
    });
  }, [i18n.language, periodFilter, query, rows, sortDir, sortKey, statusFilter]);

  const hasFilters = query.trim() !== "" || statusFilter !== "all" || periodFilter !== "all";

  const applySort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "name" ? "asc" : "desc");
  };

  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setPeriodFilter("all");
  };

  const applyStatus = (next: StatusFilter) => {
    setStatusFilter((current) =>
      current === next && next !== "all" ? "all" : next,
    );
  };

  if (!isLogged) return null;

  if (loading && !data) {
    return <SettingsPageSkeleton rows={6} variant="limits" />;
  }

  if (error && !data) {
    return (
      <main className="settings-page">
        <div className="settings-content">
          <Card padding="spacious" className="mx-auto max-w-lg text-center">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <AlertTriangle size={18} aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-sm font-semibold text-gray-900">{t("errors.title")}</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">{error}</p>
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
                {t("errors.retry")}
              </Button>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  const plan = data?.plan;
  const planCode = plan?.code ?? "";
  const isPersonal = planCode.startsWith("personal-");
  const planName = plan?.name || t("header.planUnknown");
  const billingPath = isPersonal ? "/p/settings/billing" : "/b/settings/billing";

  const statusItems: { value: StatusFilter; label: string }[] = [
    { value: "all", label: t("filters.allStatuses") },
    { value: "attention", label: t("summary.attention") },
    { value: "atLimit", label: t("summary.atLimit") },
    { value: "unlimited", label: t("summary.unlimited") },
  ];

  const periodOptions: { value: "all" | LimitsPeriod; label: string }[] = [
    { value: "all", label: t("filters.allPeriods") },
    ...periods.map((period) => ({
      value: period,
      label: t(`periods.${period}`, { defaultValue: period }),
    })),
  ];

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: "usage", label: t("filters.sortUsage") },
    { value: "name", label: t("filters.sortName") },
    { value: "period", label: t("filters.sortPeriod") },
  ];

  const tiles = [
    {
      key: "all" as StatusFilter,
      label: t("summary.all"),
      value: stats.all,
      icon: Gauge,
      tint: "bg-slate-100 text-slate-600",
    },
    {
      key: "attention" as StatusFilter,
      label: t("summary.attention"),
      value: stats.attention,
      icon: ShieldAlert,
      tint: "bg-amber-50 text-amber-700",
    },
    {
      key: "atLimit" as StatusFilter,
      label: t("summary.atLimit"),
      value: stats.atLimit,
      icon: AlertTriangle,
      tint: "bg-rose-50 text-rose-600",
    },
    {
      key: "unlimited" as StatusFilter,
      label: t("summary.unlimited"),
      value: stats.unlimited,
      icon: InfinityIcon,
      tint: "bg-lime-50 text-lime-700",
    },
  ];

  return (
    <main className="settings-page">
      <div className="settings-content space-y-4">
        <Card tone="panel" padding="compact">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Gauge size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-gray-500">{t("plan.current")}</p>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate text-base font-semibold text-gray-900">{planName}</p>
                  <Badge tone={isPersonal ? "info" : "neutral"} size="sm">
                    {isPersonal ? t("plan.personal") : t("plan.business")}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReloadKey((value) => value + 1)}
                isLoading={loading}
              >
                <RefreshCw
                  size={14}
                  aria-hidden="true"
                  className={loading ? "animate-spin motion-reduce:animate-none" : undefined}
                />
                {t("plan.refresh")}
              </Button>
              {canManageBilling && (
                <Button variant="secondary" size="sm" onClick={() => navigate(billingPath)}>
                  {t("plan.manage")}
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-gray-500">{t("plan.hint")}</p>
        </Card>

        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-[12px] text-rose-800"
          >
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
              {t("errors.retry")}
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            const active = statusFilter === tile.key;
            return (
              <button
                key={tile.key}
                type="button"
                onClick={() => applyStatus(tile.key)}
                aria-pressed={active}
                className={`flex min-w-0 items-center gap-3 rounded-lg border p-3.5 text-left transition-colors ${
                  active
                    ? "border-gray-300 bg-gray-50 ring-1 ring-gray-900/5"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tile.tint}`}
                  aria-hidden="true"
                >
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium text-gray-500">
                    {tile.label}
                  </span>
                  <span className="block text-xl font-semibold tabular-nums text-gray-900">
                    {numberFormat.format(tile.value)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-3" aria-label={t("filters.label")}>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1 xl:max-w-md">
              <Search
                size={15}
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400"
              />
              <Input
                kind="text"
                size="sm"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("filters.search")}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl<StatusFilter>
                value={statusFilter}
                items={statusItems}
                onChange={setStatusFilter}
                label={t("filters.status")}
              />
              <FilterSelect
                label={t("filters.period")}
                value={periodFilter}
                onChange={setPeriodFilter}
                options={periodOptions}
              />
              <FilterSelect
                label={t("filters.sort")}
                value={sortKey}
                onChange={setSortKey}
                options={sortOptions}
              />
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => setSortDir((direction) => (direction === "asc" ? "desc" : "asc"))}
                aria-label={sortDir === "asc" ? t("filters.ascending") : t("filters.descending")}
                title={sortDir === "asc" ? t("filters.ascending") : t("filters.descending")}
              >
                {sortDir === "asc" ? (
                  <ArrowUp size={15} aria-hidden="true" />
                ) : (
                  <ArrowDown size={15} aria-hidden="true" />
                )}
              </Button>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X size={14} aria-hidden="true" />
                  {t("filters.clear")}
                </Button>
              )}
            </div>
          </div>
        </section>

        <section
          className="overflow-hidden rounded-lg border border-gray-200 bg-white"
          aria-labelledby="limits-table-title"
        >
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50/60 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <h2 id="limits-table-title" className="text-[12px] font-semibold text-gray-700">
                {t("table.title")}
              </h2>
              <Badge tone="neutral" size="md">
                {rows.length}
              </Badge>
              {hasFilters && (
                <span className="truncate text-[11px] text-gray-500">
                  {t("table.filtered", { shown: filtered.length, total: rows.length })}
                </span>
              )}
            </div>
            <div className="hidden items-center gap-3 xl:flex">
              {(["ok", "warn", "high", "exhausted", "unmetered"] as const).map((key) => (
                <span key={key} className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[key === "unmetered" ? "unlimited" : key].dot}`}
                    aria-hidden="true"
                  />
                  {t(`legend.${key}`)}
                </span>
              ))}
            </div>
          </header>

          <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(240px,1.2fr)_160px_120px] gap-6 border-b border-gray-100 px-4 py-2 lg:grid">
            <SortHeader
              label={t("table.permission")}
              sortKey="name"
              activeKey={sortKey}
              direction={sortDir}
              onSort={applySort}
            />
            <SortHeader
              label={t("table.usage")}
              sortKey="usage"
              activeKey={sortKey}
              direction={sortDir}
              onSort={applySort}
            />
            <SortHeader
              label={t("table.period")}
              sortKey="period"
              activeKey={sortKey}
              direction={sortDir}
              onSort={applySort}
            />
            <span className="text-right text-[11px] font-semibold text-gray-500">
              {t("table.status")}
            </span>
          </div>

          {filtered.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {filtered.map((row) => (
                <LimitRow key={row.item.permission.code} row={row} numberFormat={numberFormat} />
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <SearchX size={18} aria-hidden="true" />
              </span>
              <p className="text-sm font-medium text-gray-900">
                {rows.length ? t("emptyState.title") : t("emptyState.noneTitle")}
              </p>
              <p className="max-w-sm text-xs leading-5 text-gray-500">
                {rows.length ? t("emptyState.body") : t("emptyState.noneBody")}
              </p>
              {hasFilters && (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  {t("filters.clear")}
                </Button>
              )}
            </div>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-2.5 text-[11px] text-gray-500">
            <span aria-live="polite">
              {t("table.showing", { shown: filtered.length, total: rows.length })}
            </span>
          </footer>
        </section>
      </div>
    </main>
  );
};

export default LimitsAndUsage;
