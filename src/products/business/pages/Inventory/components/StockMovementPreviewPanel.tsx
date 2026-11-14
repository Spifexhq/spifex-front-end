import { useTranslation } from "react-i18next";
import SidePanel, { SidePanelDetails } from "@/components/Modal/SidePanel";
import { formatDateFromISO } from "@/lib";
import { inventoryUnitLabel } from "../units";
import type { StockMovement } from "@/models/settings/inventory";

export default function StockMovementPreviewPanel({
  movement,
  onClose,
}: {
  movement: StockMovement | null;
  onClose(): void;
}) {
  const { t } = useTranslation("inventory");

  return (
    <SidePanel
      isOpen={!!movement}
      title={t("stock.movementPreviewTitle")}
      subtitle={movement ? `${movement.sku} · ${formatDateFromISO(movement.occurred_at)}` : undefined}
      onClose={onClose}
    >
      {movement ? (
        <div className="space-y-5">
          <SidePanelDetails
            fields={[
              { label: t("common.date"), value: formatDateFromISO(movement.occurred_at) },
              { label: t("common.item"), value: movement.name },
              { label: t("items.columns.sku"), value: movement.sku },
              { label: t("common.location"), value: `${movement.location_code} · ${movement.location_name}` },
              { label: t("stock.movementColumns.type"), value: t(`movementType.${movement.movement_type}`) },
              { label: t("stock.movementColumns.quantity"), value: <span className={`tabular-nums font-medium ${movement.quantity_delta < 0 ? "text-rose-700" : "text-emerald-700"}`}>{movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta} {movement.uom ? inventoryUnitLabel(movement.uom, t) : ""}</span> },
              { label: t("stock.movementColumns.reference"), value: movement.reference || "—" },
              { label: t("stock.movementColumns.reason"), value: movement.reason || "—" },
              { label: t("stock.movementColumns.user"), value: movement.created_by || "—" },
            ]}
          />
        </div>
      ) : null}
    </SidePanel>
  );
}
