import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import SidePanel from "@/components/Modal/SidePanel";
import Button from "@/shared/ui/Button";
import InventoryItemPreviewContent from "./InventoryItemPreviewContent";
import InventoryPriceHistoryContent from "./InventoryPriceHistoryContent";
import type { InventoryItem, InventoryItemPrice } from "@/models/settings/inventory";

export type ItemPreviewTarget =
  | { kind: "item"; item: InventoryItem }
  | { kind: "prices"; item: InventoryItem };

export default function InventoryItemPreviewPanel({
  stack,
  currency,
  canEdit,
  onClose,
  onEdit,
  onAdjust,
  onPushPrices,
  onAddPrice,
  onCorrectPrice,
}: {
  stack: ItemPreviewTarget[];
  currency: string;
  canEdit: boolean;
  onClose(): void;
  onEdit(item: InventoryItem): void;
  onAdjust(item: InventoryItem): void;
  onPushPrices(item: InventoryItem): void;
  onAddPrice(item: InventoryItem): void;
  onCorrectPrice(item: InventoryItem, price: InventoryItemPrice): void;
}) {
  const { t } = useTranslation("inventory");
  const reduced = useReducedMotion();
  const top = stack[stack.length - 1] ?? null;
  const stackDepth = Math.max(0, stack.length - 1);
  const item = top?.item ?? null;

  const footer = top?.kind === "prices"
    ? (
      <>
        <Button key="prices-back" type="button" variant="secondary" onClick={onClose}>{t("prices.back")}</Button>
        {canEdit ? <Button key="prices-add" type="button" onClick={() => onAddPrice(top.item)}>{t("prices.add")}</Button> : null}
      </>
    )
    : item
      ? (
        <>
          <Button key="item-history" type="button" variant="ghost" onClick={() => onPushPrices(item)}>{t("prices.historyTitle")}</Button>
          {canEdit ? <Button key="item-edit" type="button" variant="secondary" onClick={() => onEdit(item)}>{t("common.edit")}</Button> : null}
          {canEdit ? <Button key="item-adjust" type="button" onClick={() => onAdjust(item)}>{t("stock.addMovement")}</Button> : null}
        </>
      )
      : undefined;

  return (
    <SidePanel
      isOpen={!!top}
      stackDepth={stackDepth}
      title={top?.kind === "prices" ? t("prices.historyTitle") : t("items.columns.item")}
      onClose={onClose}
      footer={footer}
    >
      {top ? (
        <motion.div
          key={`${top.kind}:${top.item.id}`}
          initial={{ opacity: 0, x: reduced ? 0 : 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reduced ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {top.kind === "item" ? (
            <InventoryItemPreviewContent
              item={top.item}
              currency={currency}
              canEdit={canEdit}
              onPriceHistory={onPushPrices}
            />
          ) : (
            <InventoryPriceHistoryContent
              item={top.item}
              currency={currency}
              canEdit={canEdit}
              onCorrect={onCorrectPrice}
            />
          )}
        </motion.div>
      ) : null}
    </SidePanel>
  );
}
