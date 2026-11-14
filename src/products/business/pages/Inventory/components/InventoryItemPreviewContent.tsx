import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { api } from "@/core/api/requests";
import { PreviewSkeleton, SidePanelDetails } from "@/components/Modal/SidePanel";
import Badge from "@/shared/ui/Badge";
import { formatCurrency, formatDateFromISO } from "@/lib";
import InventoryStatusBadge from "./InventoryStatusBadge";
import { inventoryUnitLabel } from "../units";
import type { InventoryItem, InventoryItemPrice, InventoryStockLevel, StockMovement } from "@/models/settings/inventory";

export default function InventoryItemPreviewContent({
  item,
  currency,
  canEdit,
  onPriceHistory,
}: {
  item: InventoryItem;
  currency: string;
  canEdit: boolean;
  onPriceHistory(item: InventoryItem): void;
}) {
  const { t } = useTranslation("inventory");
  const [levels, setLevels] = useState<InventoryStockLevel[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [prices, setPrices] = useState<InventoryItemPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLevels([]);
    setMovements([]);
    setPrices([]);
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const [stockResponse, movementResponse, priceResponse] = await Promise.all([
          api.getInventoryItemStock(item.id),
          api.getInventoryMovements({ item: item.id, page_size: 5 }),
          api.getInventoryPrices({ item: item.id, page_size: 5 }),
        ]);
        if (!alive) return;
        setLevels(stockResponse.data ?? []);
        setMovements(movementResponse.data.results ?? []);
        setPrices(priceResponse.data.results ?? []);
      } catch (cause) {
        if (alive) setError(apiErrorMessage(cause, t("items.preview.emptyStock")));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [item.id, t]);

  if (loading) return <PreviewSkeleton variant="detail" rows={6} />;

  return (
    <div className="space-y-6">
      {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

      <SidePanelDetails
        fields={[
          { label: t("items.columns.sku"), value: item.sku },
          { label: t("common.name"), value: item.name },
          { label: t("common.description"), value: item.description || "—" },
          { label: t("items.columns.uom"), value: item.uom ? inventoryUnitLabel(item.uom, t) : t("units.none") },
          { label: t("items.columns.quantity"), value: String(item.quantity_on_hand) },
          { label: t("items.columns.reorderPoint"), value: String(item.reorder_point) },
          { label: t("items.columns.unitCost"), value: formatCurrency(item.unit_cost || "0", currency) },
          { label: t("common.status"), value: <InventoryStatusBadge status={item.stock_status} label={t(`status.${item.stock_status}`)} /> },
          { label: t("common.active"), value: <Badge tone={item.is_active ? "success" : "neutral"} size="md" dot>{t(item.is_active ? "common.active" : "common.inactive")}</Badge> },
        ]}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold text-gray-900">{t("prices.historyTitle")}</h2>
          {canEdit ? <button type="button" onClick={() => onPriceHistory(item)} className="text-[11px] font-medium text-gray-600 hover:text-gray-900">{t("prices.manage")}</button> : null}
        </div>
        {prices.length ? (
          <table className="w-full table-fixed border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[11px] text-gray-500">
                <th scope="col" className="w-[36%] px-3 py-2 text-left font-medium">{t("prices.effectiveAt")}</th>
                <th scope="col" className="w-[34%] px-3 py-2 text-right font-medium">{t("prices.unitCost")}</th>
                <th scope="col" className="w-[30%] px-3 py-2 text-right font-medium">{t("prices.change")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {prices.map((price, index) => {
                const previous = prices[index + 1];
                const delta = previous ? Number(price.unit_cost) - Number(previous.unit_cost) : 0;
                return (
                  <tr key={price.id}>
                    <td className="px-3 py-2 text-gray-600">{formatDateFromISO(price.effective_at)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-gray-800">{formatCurrency(price.unit_cost, currency)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${delta > 0 ? "text-rose-700" : delta < 0 ? "text-emerald-700" : "text-gray-400"}`}>{previous ? `${delta > 0 ? "+" : ""}${formatCurrency(delta, currency)}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <p className="text-xs text-gray-500">{t("prices.empty")}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px] font-semibold text-gray-900">{t("items.preview.stockTitle")}</h2>
        {levels.length ? (
          <table className="w-full table-fixed border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[11px] text-gray-500">
                <th scope="col" className="w-[46%] px-3 py-2 text-left font-medium">{t("common.location")}</th>
                <th scope="col" className="w-[27%] px-3 py-2 text-right font-medium">{t("items.columns.quantity")}</th>
                <th scope="col" className="w-[27%] px-3 py-2 text-right font-medium">{t("common.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {levels.map(level => (
                <tr key={level.id}>
                  <td className="px-3 py-2"><span className="font-mono text-[10px] text-gray-400">{level.location_code}</span><span className="ml-2 truncate text-gray-700">{level.location_name}</span></td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">{level.quantity}</td>
                  <td className="px-3 py-2 text-right"><InventoryStatusBadge status={level.status} label={t(`status.${level.status}`)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-xs text-gray-500">{t("items.preview.emptyStock")}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px] font-semibold text-gray-900">{t("items.preview.movementTitle")}</h2>
        {movements.length ? (
          <table className="w-full table-fixed border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[11px] text-gray-500">
                <th scope="col" className="w-[34%] px-3 py-2 text-left font-medium">{t("stock.movementColumns.date")}</th>
                <th scope="col" className="w-[33%] px-3 py-2 text-left font-medium">{t("stock.movementColumns.type")}</th>
                <th scope="col" className="w-[33%] px-3 py-2 text-right font-medium">{t("stock.movementColumns.quantity")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movements.map(movement => (
                <tr key={movement.id}>
                  <td className="px-3 py-2 text-gray-600">{formatDateFromISO(movement.occurred_at)}</td>
                  <td className="px-3 py-2 text-gray-700">{t(`movementType.${movement.movement_type}`)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${movement.quantity_delta < 0 ? "text-rose-700" : "text-emerald-700"}`}>{movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta} {movement.uom ? inventoryUnitLabel(movement.uom, t) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-xs text-gray-500">{t("items.preview.emptyMovements")}</p>}
      </section>
    </div>
  );
}
