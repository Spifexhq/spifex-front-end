import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { api } from "@/core/api/requests";
import SidePanel, { SidePanelDetails } from "@/components/Modal/SidePanel";
import Button from "@/shared/ui/Button";
import { formatCurrency, formatDateFromISO } from "@/lib";
import InventoryStatusBadge from "./InventoryStatusBadge";
import { inventoryUnitLabel } from "../units";
import type { InventoryItem, InventoryStockLevel, StockMovement } from "@/models/settings/inventory";

export default function InventoryStockLevelPreviewPanel({
  level,
  currency,
  canEdit,
  onClose,
  onAdjust,
}: {
  level: InventoryStockLevel | null;
  currency: string;
  canEdit: boolean;
  onClose(): void;
  onAdjust(level: InventoryStockLevel): void;
}) {
  const { t } = useTranslation("inventory");
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!level) {
      setItem(null);
      setMovements([]);
      setError("");
      return;
    }
    let alive = true;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const [itemResponse, movementResponse] = await Promise.all([
          api.getInventoryItem(level.item_id),
          api.getInventoryMovements({ item: level.item_id, location: level.location_id, page_size: 6 }),
        ]);
        if (!alive) return;
        setItem(itemResponse.data);
        setMovements(movementResponse.data.results ?? []);
      } catch (cause) {
        if (alive) setError(apiErrorMessage(cause, t("stock.errors.load")));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [level, t]);

  const unitCost = item?.unit_cost || "0";
  const stockValue = level ? Number(level.quantity) * Number(unitCost) : 0;

  return (
    <SidePanel
      isOpen={!!level}
      loading={loading}
      skeletonVariant="detail"
      skeletonRows={6}
      title={t("stock.levelPreviewTitle")}
      onClose={onClose}
      footer={level && canEdit ? <Button type="button" onClick={() => onAdjust(level)}>{t("stock.addMovement")}</Button> : undefined}
    >
      {level ? (
        <div className="space-y-6">
          {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

          <SidePanelDetails
            fields={[
              { label: t("common.item"), value: level.name },
              { label: t("items.columns.sku"), value: level.sku },
              { label: t("common.location"), value: `${level.location_code} · ${level.location_name}` },
              { label: t("items.columns.uom"), value: level.uom ? inventoryUnitLabel(level.uom, t) : t("units.none") },
              { label: t("items.columns.quantity"), value: <span className="tabular-nums font-medium">{level.quantity}</span> },
              { label: t("items.columns.reorderPoint"), value: <span className="tabular-nums">{level.reorder_point}</span> },
              { label: t("items.columns.unitCost"), value: formatCurrency(unitCost, currency) },
              { label: t("stock.stockValue"), value: formatCurrency(stockValue, currency) },
              { label: t("common.status"), value: <InventoryStatusBadge status={level.status} label={t(`status.${level.status}`)} /> },
            ]}
          />

          <section className="space-y-3">
            <h2 className="text-[13px] font-semibold text-gray-900">{t("stock.locationMovements")}</h2>
            {movements.length ? (
              <table className="w-full table-fixed border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-[11px] text-gray-500">
                    <th scope="col" className="w-[32%] px-3 py-2 text-left font-medium">{t("stock.movementColumns.date")}</th>
                    <th scope="col" className="w-[36%] px-3 py-2 text-left font-medium">{t("stock.movementColumns.type")}</th>
                    <th scope="col" className="w-[32%] px-3 py-2 text-right font-medium">{t("stock.movementColumns.quantity")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.map(movement => (
                    <tr key={movement.id}>
                      <td className="px-3 py-2 text-gray-600">{formatDateFromISO(movement.occurred_at)}</td>
                      <td className="px-3 py-2 text-gray-700">{t(`movementType.${movement.movement_type}`)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${movement.quantity_delta < 0 ? "text-rose-700" : "text-emerald-700"}`}>{movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-xs text-gray-500">{t("stock.emptyMovements")}</p>}
          </section>
        </div>
      ) : null}
    </SidePanel>
  );
}
