import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { api } from "@/core/api/requests";
import SidePanel, { SidePanelForm } from "@/components/Modal/SidePanel";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import SegmentedControl from "@/shared/ui/SegmentedControl";
import { Select } from "@/shared/ui/Select";
import type { InventoryItem, InventoryLocationOption } from "@/models/settings/inventory";

export type StockMovementMode = "receipt" | "issue" | "adjustment";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toOccurredAt(date: string) {
  return date ? `${date}T12:00:00Z` : undefined;
}

export default function StockMovementPanel({
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
  const [mode, setMode] = useState<StockMovementMode>("receipt");
  const [itemId, setItemId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [targetQuantity, setTargetQuantity] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(todayIso());
  const [currentQuantity, setCurrentQuantity] = useState<number | null>(null);
  const [loadingLevel, setLoadingLevel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setMode("receipt");
    setItemId(initialItemId || "");
    setLocationId(initialLocationId || "");
    setQuantity("");
    setTargetQuantity("");
    setReference("");
    setReason("");
    setDate(todayIso());
    setCurrentQuantity(null);
    setError("");
    setSaving(false);
  }, [initialItemId, initialLocationId]);

  useEffect(() => {
    if (!isOpen) return;
    reset();
  }, [isOpen, reset]);

  useEffect(() => {
    if (!isOpen || mode !== "adjustment" || !itemId || !locationId) {
      setCurrentQuantity(null);
      return;
    }
    let alive = true;
    setLoadingLevel(true);
    void (async () => {
      try {
        const { data } = await api.getInventoryStock({ item: itemId, location: locationId, page_size: 1 });
        const row = data.results?.[0];
        if (alive) {
          setCurrentQuantity(row?.quantity ?? 0);
          setTargetQuantity(String(row?.quantity ?? 0));
        }
      } catch {
        if (alive) setCurrentQuantity(0);
      } finally {
        if (alive) setLoadingLevel(false);
      }
    })();
    return () => { alive = false; };
  }, [isOpen, mode, itemId, locationId]);

  const selectedItem = useMemo(() => items.filter(item => item.id === itemId), [items, itemId]);
  const selectedLocation = useMemo(() => locations.filter(location => location.id === locationId), [locations, locationId]);

  const submit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!itemId || !locationId) {
      setError(t("stock.errors.save"));
      return;
    }

    let movementQuantity: number;
    if (mode === "adjustment") {
      const target = Number(targetQuantity);
      if (!Number.isFinite(target) || target < 0 || !Number.isInteger(target)) {
        setError(t("stock.errors.target"));
        return;
      }
      const current = currentQuantity ?? 0;
      movementQuantity = target - current;
      if (movementQuantity === 0) {
        setError(t("stock.errors.adjustment"));
        return;
      }
    } else {
      movementQuantity = Number(quantity);
      if (!Number.isFinite(movementQuantity) || movementQuantity <= 0 || !Number.isInteger(movementQuantity)) {
        setError(t("stock.errors.quantity"));
        return;
      }
    }

    setSaving(true);
    setError("");
    try {
      await api.addInventoryMovement({
        item_id: itemId,
        location_id: locationId,
        movement_type: mode,
        quantity: movementQuantity,
        reference: reference.trim(),
        reason: reason.trim(),
        occurred_at: toOccurredAt(date),
      });
      onNotify?.(t("stock.toast.recorded"), "success");
      onSaved?.();
      onClose();
    } catch (cause) {
      const message = apiErrorMessage(cause, t("stock.errors.save"));
      setError(message);
      onNotify?.(message, "error");
    } finally {
      setSaving(false);
    }
  }, [itemId, locationId, mode, targetQuantity, currentQuantity, quantity, reference, reason, date, onNotify, onSaved, onClose, t]);

  const title = t("stock.adjust.title");
  const submitLabel = mode === "receipt" ? t("stock.adjust.submitReceipt") : mode === "issue" ? t("stock.adjust.submitIssue") : t("stock.adjust.submitAdjustment");

  return (
    <SidePanel mode="edit" isOpen={isOpen} title={title} subtitle={t("stock.adjust.subtitle")} onClose={onClose} busy={saving}>
      <SidePanelForm onSubmit={submit} className="space-y-4 pb-4 md:pb-6">
        {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-gray-700">{t("stock.adjust.mode")}</p>
          <SegmentedControl<StockMovementMode>
            value={mode}
            onChange={value => { setMode(value); setError(""); }}
            label={t("stock.adjust.mode")}
            items={[
              { value: "receipt", label: t("stock.adjust.receipt") },
              { value: "issue", label: t("stock.adjust.issue") },
              { value: "adjustment", label: t("stock.adjust.adjustment") },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-gray-700">{t("stock.adjust.item")}</p>
            <Select<InventoryItem>
              items={items}
              selected={selectedItem}
              onChange={selected => setItemId(selected[0]?.id || "")}
              getItemKey={item => item.id}
              getItemLabel={item => `${item.sku} · ${item.name}`}
              buttonLabel={t("stock.adjust.item")}
              ariaLabel={t("stock.adjust.item")}
              singleSelect
              hideCheckboxes
            />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-gray-700">{t("stock.adjust.location")}</p>
            <Select<InventoryLocationOption>
              items={locations}
              selected={selectedLocation}
              onChange={selected => setLocationId(selected[0]?.id || "")}
              getItemKey={location => location.id}
              getItemLabel={location => `${location.code} · ${location.name}`}
              buttonLabel={t("stock.adjust.location")}
              ariaLabel={t("stock.adjust.location")}
              singleSelect
              hideCheckboxes
            />
          </div>

          {mode === "adjustment" ? (
            <>
              <div>
                <Input kind="text" type="number" min="0" step="1" label={t("stock.adjust.targetQuantity")} value={targetQuantity} onChange={event => setTargetQuantity(event.target.value)} disabled={saving || loadingLevel} />
                <p className="mt-1 text-[11px] leading-5 text-gray-500">
                  {loadingLevel ? t("common.loading") : t("stock.adjust.currentQuantity", { quantity: currentQuantity ?? 0 })}
                </p>
              </div>
              <div>
                <Input kind="date" label={t("stock.adjust.date")} value={date} onValueChange={setDate} disabled={saving} />
              </div>
            </>
          ) : (
            <>
              <Input kind="text" type="number" min="1" step="1" label={t("stock.adjust.quantity")} value={quantity} onChange={event => setQuantity(event.target.value)} disabled={saving} />
              <Input kind="date" label={t("stock.adjust.date")} value={date} onValueChange={setDate} disabled={saving} />
            </>
          )}

          <Input kind="text" label={t("stock.adjust.reference")} value={reference} onChange={event => setReference(event.target.value)} disabled={saving} />
          <Input kind="text" label={t("stock.adjust.reason")} placeholder={t("stock.adjust.reasonPlaceholder")} value={reason} onChange={event => setReason(event.target.value)} disabled={saving} />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={saving || loadingLevel}>{saving ? t("common.saving") : submitLabel}</Button>
        </div>
      </SidePanelForm>
    </SidePanel>
  );
}
