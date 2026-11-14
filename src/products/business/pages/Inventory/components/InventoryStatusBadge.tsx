import Badge, { type BadgeTone } from "@/shared/ui/Badge";
import type { InventoryStockStatus } from "@/models/settings/inventory";

const TONE: Record<InventoryStockStatus, BadgeTone> = {
  ok: "success",
  low: "warning",
  out: "danger",
};

export default function InventoryStatusBadge({ status, label }: { status: InventoryStockStatus; label: string }) {
  return <Badge tone={TONE[status]} size="md" dot>{label}</Badge>;
}
