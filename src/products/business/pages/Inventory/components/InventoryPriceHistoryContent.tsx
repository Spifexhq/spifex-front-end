import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { api } from "@/core/api/requests";
import { PreviewSkeleton } from "@/components/Modal/SidePanel";
import { formatCurrency, formatDateFromISO } from "@/lib";
import { inventoryUnitLabel } from "../units";
import type { InventoryItem, InventoryItemPrice } from "@/models/settings/inventory";

export default function InventoryPriceHistoryContent({
  item,
  currency,
  canEdit,
  onCorrect,
}: {
  item: InventoryItem;
  currency: string;
  canEdit: boolean;
  onCorrect(item: InventoryItem, price: InventoryItemPrice): void;
}) {
  const { t } = useTranslation("inventory");
  const [prices, setPrices] = useState<InventoryItemPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setPrices([]);
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const { data } = await api.getInventoryPrices({ item: item.id, page_size: 100 });
        if (alive) setPrices(data.results ?? []);
      } catch (cause) {
        if (alive) setError(apiErrorMessage(cause, t("prices.loadError")));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [item.id, t]);

  if (loading) return <PreviewSkeleton variant="list" rows={6} />;

  return (
    <div className="space-y-5">
      {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{t("prices.current")}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-gray-950">{formatCurrency(item.unit_cost || "0", currency)}</p>
        <p className="mt-1 text-[11px] text-gray-500">{t("prices.perUnit", { unit: item.uom ? inventoryUnitLabel(item.uom, t) : t("units.unit") })}</p>
      </div>

      {prices.length ? (
        <div className="space-y-3">
          {prices.map((price, index) => {
            const previous = prices[index + 1];
            const delta = previous ? Number(price.unit_cost) - Number(previous.unit_cost) : 0;
            return (
              <div key={price.id} className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium tabular-nums text-gray-900">{formatCurrency(price.unit_cost, currency)}</p>
                    {previous ? (
                      <span className={`text-[11px] tabular-nums ${delta > 0 ? "text-rose-700" : delta < 0 ? "text-emerald-700" : "text-gray-400"}`}>
                        {delta > 0 ? "+" : ""}{formatCurrency(delta, currency)}
                      </span>
                    ) : null}
                    {index === 0 ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">{t("prices.currentTag")}</span> : null}
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">{formatDateFromISO(price.effective_at)}{price.created_by ? ` · ${price.created_by}` : ""}</p>
                  {price.reason ? <p className="mt-1 text-xs leading-5 text-gray-600">{price.reason}</p> : null}
                </div>
                {canEdit ? (
                  <button type="button" onClick={() => onCorrect(item, price)} aria-label={t("prices.correct")} title={t("prices.correct")} className="grid size-8 shrink-0 place-items-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-gray-400">
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : <p className="text-xs text-gray-500">{t("prices.empty")}</p>}
    </div>
  );
}
