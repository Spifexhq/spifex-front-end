import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiErrorMessage, isPreconditionFailure } from "@/lib/apiErrorMessage";
import { api } from "@/core/api/requests";
import SidePanel, { SidePanelForm } from "@/components/Modal/SidePanel";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import { formatCurrency } from "@/lib";
import type { InventoryItem, InventoryItemPrice } from "@/models/settings/inventory";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toEffectiveAt(date: string) {
  if (!date) return new Date().toISOString();
  if (date === todayIso()) return new Date().toISOString();
  return `${date}T23:59:59Z`;
}

function normalizeInputCost(raw: string | number | null | undefined) {
  const parsed = Number(raw ?? 0);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
}

export default function InventoryPriceFormPanel({
  isOpen,
  item,
  price,
  currency,
  onClose,
  onSaved,
  onNotify,
}: {
  isOpen: boolean;
  item: InventoryItem | null;
  price: InventoryItemPrice | null;
  currency: string;
  onClose(): void;
  onSaved?(): void;
  onNotify?(message: string, severity: "success" | "error"): void;
}) {
  const { t } = useTranslation("inventory");
  const [unitCost, setUnitCost] = useState("0");
  const [effectiveAt, setEffectiveAt] = useState(todayIso());
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const editing = !!price;
  const title = editing ? t("prices.correctTitle") : t("prices.addTitle");
  const subtitle = useMemo(() => item ? `${item.sku} · ${item.name}` : undefined, [item]);

  const reset = useCallback(() => {
    setUnitCost(normalizeInputCost(price?.unit_cost ?? item?.unit_cost));
    setEffectiveAt(price ? price.effective_at.slice(0, 10) : todayIso());
    setReason(price?.reason || "");
    setError("");
    setSaving(false);
  }, [price, item]);

  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  const submit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!item) return;
    const cost = Number(unitCost);
    if (!Number.isFinite(cost) || cost < 0) {
      setError(t("prices.invalidPrice"));
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (price) {
        await api.editInventoryPrice(price.id, {
          unit_cost: String(cost),
          effective_at: toEffectiveAt(effectiveAt),
          reason: reason.trim(),
        }, price.version);
        onNotify?.(t("prices.corrected"), "success");
      } else {
        await api.addInventoryPrice({
          item_id: item.id,
          unit_cost: String(cost),
          effective_at: toEffectiveAt(effectiveAt),
          reason: reason.trim(),
        });
        onNotify?.(t("prices.added"), "success");
      }
      onSaved?.();
      onClose();
    } catch (cause) {
      const message = isPreconditionFailure(cause)
        ? t("prices.concurrent")
        : apiErrorMessage(cause, t("prices.saveError"));
      setError(message);
      onNotify?.(message, "error");
    } finally {
      setSaving(false);
    }
  }, [item, price, unitCost, effectiveAt, reason, onNotify, onSaved, onClose, t]);

  return (
    <SidePanel mode="edit" isOpen={isOpen} title={title} subtitle={subtitle} onClose={saving ? () => {} : onClose} busy={saving}>
      <SidePanelForm onSubmit={submit} className="space-y-4 pb-4 md:pb-6">
        {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
          {t("prices.currentHint", { price: formatCurrency(item?.unit_cost || "0", currency) })}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input kind="amount" label={t("prices.unitCost")} value={unitCost} onValueChange={(value: string) => setUnitCost(value)} disabled={saving} />
          <Input kind="date" label={t("prices.effectiveAt")} value={effectiveAt} onValueChange={setEffectiveAt} max={todayIso()} disabled={saving} />
          <div className="md:col-span-2">
            <Input kind="text" label={t("prices.reason")} placeholder={t("prices.reasonPlaceholder")} value={reason} onChange={event => setReason(event.target.value)} disabled={saving} />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={saving}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={saving}>{saving ? t("common.saving") : editing ? t("prices.correct") : t("prices.add")}</Button>
        </div>
      </SidePanelForm>
    </SidePanel>
  );
}
