import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { api } from "@/core/api/requests";
import SidePanel, { SidePanelForm } from "@/components/Modal/SidePanel";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import type { InventoryItem, InventoryLocationOption } from "@/models/settings/inventory";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function StockTransferPanel({
  isOpen,
  items,
  locations,
  initialItemId,
  initialLocationId,
  onClose,
  onSaved,
  onNotify,
}: {
  isOpen: boolean;
  items: InventoryItem[];
  locations: InventoryLocationOption[];
  initialItemId?: string;
  initialLocationId?: string;
  onClose(): void;
  onSaved?(): void;
  onNotify?(message: string, severity: "success" | "error"): void;
}) {
  const { t } = useTranslation("inventory");
  const [itemId, setItemId] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setItemId(initialItemId || "");
    setFromLocationId(initialLocationId || "");
    setToLocationId("");
    setQuantity("");
    setReference("");
    setReason("");
    setDate(todayIso());
    setError("");
    setSaving(false);
  }, [initialItemId, initialLocationId]);

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  const selectedItem = useMemo(() => items.filter(item => item.id === itemId), [items, itemId]);
  const selectedFrom = useMemo(() => locations.filter(location => location.id === fromLocationId), [locations, fromLocationId]);
  const selectedTo = useMemo(() => locations.filter(location => location.id === toLocationId), [locations, toLocationId]);

  const submit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!itemId || !fromLocationId || !toLocationId) {
      setError(t("stock.errors.transfer"));
      return;
    }
    if (fromLocationId === toLocationId) {
      setError(t("stock.errors.sameLocation"));
      return;
    }
    const parsed = Number(quantity);
    if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
      setError(t("stock.errors.quantity"));
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.transferInventoryStock({
        item_id: itemId,
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        quantity: parsed,
        reference: reference.trim(),
        reason: reason.trim(),
        occurred_at: date ? `${date}T12:00:00Z` : undefined,
      });
      onNotify?.(t("stock.toast.transferred"), "success");
      onSaved?.();
      onClose();
    } catch (cause) {
      const message = apiErrorMessage(cause, t("stock.errors.transfer"));
      setError(message);
      onNotify?.(message, "error");
    } finally {
      setSaving(false);
    }
  }, [itemId, fromLocationId, toLocationId, quantity, reference, reason, date, onNotify, onSaved, onClose, t]);

  return (
    <SidePanel mode="edit" isOpen={isOpen} title={t("stock.transferPanel.title")} subtitle={t("stock.transferPanel.subtitle")} onClose={onClose} busy={saving}>
      <SidePanelForm onSubmit={submit} className="space-y-4 pb-4 md:pb-6">
        {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <p className="mb-1.5 text-[11px] font-semibold text-gray-700">{t("stock.transferPanel.item")}</p>
            <Select<InventoryItem>
              items={items}
              selected={selectedItem}
              onChange={selected => setItemId(selected[0]?.id || "")}
              getItemKey={item => item.id}
              getItemLabel={item => `${item.sku} · ${item.name}`}
              buttonLabel={t("stock.transferPanel.item")}
              ariaLabel={t("stock.transferPanel.item")}
              singleSelect
              hideCheckboxes
            />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-gray-700">{t("stock.transferPanel.from")}</p>
            <Select<InventoryLocationOption>
              items={locations}
              selected={selectedFrom}
              onChange={selected => setFromLocationId(selected[0]?.id || "")}
              getItemKey={location => location.id}
              getItemLabel={location => `${location.code} · ${location.name}`}
              buttonLabel={t("stock.transferPanel.from")}
              ariaLabel={t("stock.transferPanel.from")}
              singleSelect
              hideCheckboxes
            />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-gray-700">{t("stock.transferPanel.to")}</p>
            <Select<InventoryLocationOption>
              items={locations}
              selected={selectedTo}
              onChange={selected => setToLocationId(selected[0]?.id || "")}
              getItemKey={location => location.id}
              getItemLabel={location => `${location.code} · ${location.name}`}
              buttonLabel={t("stock.transferPanel.to")}
              ariaLabel={t("stock.transferPanel.to")}
              singleSelect
              hideCheckboxes
            />
          </div>
          <Input kind="text" type="number" min="1" step="1" label={t("stock.transferPanel.quantity")} value={quantity} onChange={event => setQuantity(event.target.value)} disabled={saving} />
          <Input kind="date" label={t("stock.adjust.date")} value={date} onValueChange={setDate} disabled={saving} />
          <Input kind="text" label={t("stock.transferPanel.reference")} value={reference} onChange={event => setReference(event.target.value)} disabled={saving} />
          <Input kind="text" label={t("stock.transferPanel.reason")} value={reason} onChange={event => setReason(event.target.value)} disabled={saving} />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={saving}>{saving ? t("common.saving") : t("stock.transferPanel.submit")}</Button>
        </div>
      </SidePanelForm>
    </SidePanel>
  );
}
