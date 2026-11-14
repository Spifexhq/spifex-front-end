import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Boxes, CircleAlert, MapPin, Package, Scale, TrendingUp, Warehouse } from "lucide-react";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { api } from "@/core/api/requests";
import { formatCurrency, formatDateFromISO } from "@/lib";
import { useAuthContext } from "@/hooks/useAuth";
import DataTable from "@/shared/ui/DataTable";
import Card from "@/shared/ui/Card";
import MetricCard from "@/shared/ui/MetricCard";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import Button from "@/shared/ui/Button";
import { EmptyState, ErrorState } from "@/shared/ui/State";
import InventoryStatusBadge from "../components/InventoryStatusBadge";
import type { InventorySummary } from "@/models/settings/inventory";

export default function InventoryOverviewPage() {
  const { t } = useTranslation("inventory");
  const { organization } = useAuthContext();
  const currency = organization?.organization?.currency || "EUR";
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useMemo(() => async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.getInventorySummary();
      setSummary(data);
    } catch (cause) {
      setError(apiErrorMessage(cause, t("stock.errors.load")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !summary) return <PageSkeleton variant="accounting" rows={6} />;
  if (error && !summary) return <ErrorState title={t("overview.title")} message={error} action={<Button variant="outline" size="sm" onClick={() => void load()}>{t("common.retry")}</Button>} />;

  const data = summary;
  const metrics = data ? [
    { key: "items", label: t("overview.metrics.items"), value: data.total_items, Icon: Package, hint: `${data.active_items} ${t("common.active").toLowerCase()}` },
    { key: "units", label: t("overview.metrics.units"), value: data.total_units, Icon: Boxes, hint: `${data.locations_count} ${t("overview.metrics.locations").toLowerCase()}` },
    { key: "lowStock", label: t("overview.metrics.lowStock"), value: data.low_stock_count, Icon: CircleAlert, hint: `${data.out_of_stock_count} ${t("status.out").toLowerCase()}` },
    { key: "value", label: t("overview.metrics.value"), value: formatCurrency(data.stock_value || "0", data.currency_code || currency), Icon: Scale, hint: `${data.movements_30d} ${t("overview.metrics.movements")}` },
    { key: "locations", label: t("overview.metrics.locations"), value: data.locations_count, Icon: MapPin, hint: t("overview.byLocationTitle") },
    { key: "movements", label: t("overview.metrics.movements"), value: data.movements_30d, Icon: TrendingUp, hint: t("overview.recentMovementsTitle") },
  ] : [];

  return (
    <div className="space-y-5">
      {error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void load()}>{t("common.retry")}</Button></div> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map(metric => <MetricCard key={metric.key} label={metric.label} value={metric.value.toLocaleString()} Icon={metric.Icon} hint={metric.hint} />)}
      </section>

      {data ? <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <Card
          as="section"
          tone="slate"
          radius="xl"
          title={t("overview.lowStockTitle")}
          description={t("overview.lowStockDescription")}
          actions={<Link to="/inventory/stock?status=low" className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:underline">{t("overview.viewStock")}<ArrowRight size={12} aria-hidden="true" /></Link>}
        >
          <DataTable<InventorySummary["low_stock_items"][number]>
            items={data.low_stock_items}
            pagination={false}
            inspectable={false}
            fitContent
            emptyLabel={t("overview.emptyLowStock")}
            columns={[
              { key: "name", label: t("items.columns.item"), render: item => <div className="min-w-0"><p className="truncate font-medium text-gray-900">{item.name}</p><p className="text-[11px] text-gray-500">{item.sku}</p></div> },
              { key: "quantity", label: t("items.columns.quantity"), render: item => <span className="tabular-nums">{item.quantity_on_hand}</span> },
              { key: "reorder", label: t("items.columns.reorderPoint"), render: item => <span className="tabular-nums text-gray-500">{item.reorder_point}</span> },
              { key: "status", label: t("common.status"), render: item => <InventoryStatusBadge status={item.stock_status} label={t(`status.${item.stock_status}`)} /> },
            ]}
          />
        </Card>

        <Card as="section" tone="slate" radius="xl" title={t("overview.recentMovementsTitle")} description={t("overview.recentMovementsDescription")}>
          <DataTable<InventorySummary["recent_movements"][number]>
            items={data.recent_movements}
            pagination={false}
            inspectable={false}
            fitContent
            emptyLabel={t("overview.emptyMovements")}
            columns={[
              { key: "date", label: t("stock.movementColumns.date"), render: movement => formatDateFromISO(movement.occurred_at) },
              { key: "item", label: t("stock.movementColumns.item"), render: movement => <div className="min-w-0"><p className="truncate font-medium text-gray-900">{movement.name}</p><p className="text-[11px] text-gray-500">{movement.sku} · {movement.location_code}</p></div> },
              { key: "type", label: t("stock.movementColumns.type"), render: movement => t(`movementType.${movement.movement_type}`) },
              { key: "quantity", label: t("stock.movementColumns.quantity"), render: movement => <span className={`tabular-nums ${movement.quantity_delta < 0 ? "text-rose-700" : "text-emerald-700"}`}>{movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta}</span> },
            ]}
          />
        </Card>
      </div> : null}

      {data ? <Card as="section" tone="slate" radius="xl" title={t("overview.byLocationTitle")} description={t("overview.byLocationDescription")}>
        {data.by_location.length ? (
          <div className="divide-y divide-slate-100">
            {data.by_location.map(location => (
              <div key={location.location_id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500"><Warehouse size={16} aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-slate-900">{location.name}{location.is_default ? ` · ${t("common.default")}` : ""}</p>
                    <p className="text-[11px] text-slate-500">{location.code} · {t("overview.itemsLabel", { count: location.item_count })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-semibold tabular-nums text-slate-950">{location.quantity.toLocaleString()}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">{t("items.columns.quantity")}</p>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState title={t("overview.emptyLocations")} size="sm" icon={<Warehouse size={22} />} />}
      </Card> : null}
    </div>
  );
}
