import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiErrorMessage, isPreconditionFailure } from "@/lib/apiErrorMessage";
import { api } from "@/core/api/requests";
import SidePanel from "@/components/Modal/SidePanel";
import { SidePanelForm } from "@/components/Modal/SidePanel";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Checkbox from "@/shared/ui/Checkbox";
import { Select } from "@/shared/ui/Select";
import { INVENTORY_UNIT_CODES, inventoryUnitLabel } from "../units";
import type { InventoryItem } from "@/models/settings/inventory";

export type InventorySnack = { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" } | null;

type Mode = "create" | "edit";

type FormState = {
  sku: string;
  name: string;
  description: string;
  uom: string;
  quantity_on_hand: string;
  reorder_point: string;
  unit_cost: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  sku: "",
  name: "",
  description: "",
  uom: "",
  quantity_on_hand: "0",
  reorder_point: "0",
  unit_cost: "0",
  is_active: true,
};

function normalizeQty(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (!value) return "0";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "0";
  return String(Math.max(0, Math.trunc(parsed)));
}

function normalizeCost(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (!value) return "0";
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return "0";
  return String(parsed);
}

function comparable(form: FormState) {
  return JSON.stringify({
    ...form,
    sku: form.sku.trim(),
    name: form.name.trim(),
    description: form.description.trim(),
    uom: form.uom.trim(),
    quantity_on_hand: normalizeQty(form.quantity_on_hand),
    reorder_point: String(Math.max(0, Math.trunc(Number(form.reorder_point) || 0))),
    unit_cost: normalizeCost(form.unit_cost),
  });
}

export default function InventoryItemPanel({
  isOpen,
  mode,
  item,
  onClose,
  onNotify,
  onSaved,
}: {
  isOpen: boolean;
  mode: Mode;
  item?: InventoryItem | null;
  onClose(): void;
  onNotify?(snack: InventorySnack): void;
  onSaved?(result: { mode: Mode; item?: InventoryItem }): void;
}) {
  const { t } = useTranslation("inventory");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [baseline, setBaseline] = useState(comparable(EMPTY));
  const versionRef = useRef<string | undefined>(undefined);
  const nameRef = useRef<HTMLInputElement>(null);
  const dirty = useMemo(() => comparable(form) !== baseline, [form, baseline]);
  const busy = loading || saving;

  const reset = useCallback(() => {
    setForm(EMPTY);
    setLoading(false);
    setSaving(false);
    setError("");
    setConfirmDiscard(false);
    setBaseline(comparable(EMPTY));
    versionRef.current = undefined;
  }, []);

  const closeNow = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const attemptClose = useCallback(() => {
    if (busy) return;
    if (dirty) {
      setConfirmDiscard(true);
      return;
    }
    closeNow();
  }, [busy, closeNow, dirty]);

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    reset();

    if (mode === "create") {
      requestAnimationFrame(() => nameRef.current?.focus());
      return () => { alive = false; };
    }

    if (!item?.id) return () => { alive = false; };

    setLoading(true);
    void (async () => {
      try {
        const { data } = await api.getInventoryItem(item.id);
        if (!alive) return;
        versionRef.current = data.version;
        const next: FormState = {
          sku: data.sku ?? "",
          name: data.name ?? "",
          description: data.description ?? "",
          uom: data.uom ?? "",
          quantity_on_hand: normalizeQty(data.quantity_on_hand),
          reorder_point: String(data.reorder_point ?? 0),
          unit_cost: normalizeCost(data.unit_cost),
          is_active: data.is_active ?? true,
        };
        setForm(next);
        setBaseline(comparable(next));
        requestAnimationFrame(() => nameRef.current?.focus());
      } catch (cause) {
        if (!alive) return;
        const next: FormState = {
          sku: item.sku ?? "",
          name: item.name ?? "",
          description: item.description ?? "",
          uom: item.uom ?? "",
          quantity_on_hand: normalizeQty(item.quantity_on_hand),
          reorder_point: String(item.reorder_point ?? 0),
          unit_cost: normalizeCost(item.unit_cost),
          is_active: item.is_active ?? true,
        };
        setForm(next);
        setBaseline(comparable(next));
        setError(apiErrorMessage(cause, t("items.errors.load")));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [isOpen, mode, item, reset, t]);

  const submit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    const sku = form.sku.trim();
    const name = form.name.trim();
    if (!sku || !name) {
      setError(t("items.errors.validation"));
      return;
    }

    const quantity = Number(normalizeQty(form.quantity_on_hand));
    if (!Number.isInteger(quantity) || quantity < 0) {
      setError(t("items.errors.quantity"));
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        sku,
        name,
        description: form.description.trim(),
        uom: form.uom.trim(),
        reorder_point: Math.max(0, Math.trunc(Number(form.reorder_point) || 0)),
        unit_cost: normalizeCost(form.unit_cost),
        is_active: form.is_active,
      };

      if (mode === "create") {
        const { data } = await api.addInventoryItem({ ...payload, quantity_on_hand: String(quantity) });
        onNotify?.({ message: t("items.toast.created"), severity: "success" });
        onSaved?.({ mode: "create", item: data });
      } else if (item?.id) {
        const { data } = await api.editInventoryItem(item.id, payload, versionRef.current);
        onNotify?.({ message: t("items.toast.updated"), severity: "success" });
        onSaved?.({ mode: "edit", item: data });
      }
      closeNow();
    } catch (cause) {
      const message = isPreconditionFailure(cause)
        ? t("items.errors.concurrent")
        : apiErrorMessage(cause, t("items.errors.save"));
      setError(message);
      onNotify?.({ message, severity: "error" });
    } finally {
      setSaving(false);
    }
  }, [form, mode, item, onNotify, onSaved, closeNow, t]);

  const title = mode === "create" ? t("items.panel.createTitle") : t("items.panel.editTitle");

  return (
    <SidePanel mode="edit" isOpen={isOpen} title={title} onClose={attemptClose} busy={busy}>
      <SidePanelForm
        recordLabel={t("common.item")}
        recordName={form.name.trim() || form.sku.trim()}
        onSubmit={submit}
        className="space-y-4 pb-4 md:pb-6"
      >
        {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input kind="text" label={t("items.columns.sku")} value={form.sku} onChange={event => setForm(previous => ({ ...previous, sku: event.target.value }))} required disabled={busy} />
          <Input kind="text" label={t("common.name")} value={form.name} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} ref={nameRef} required disabled={busy} />
          <Input kind="text" label={t("common.description")} value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} disabled={busy} />
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-gray-700">{t("items.columns.uom")}</p>
            <Select<string>
              items={["", ...INVENTORY_UNIT_CODES]}
              selected={form.uom ? [form.uom] : [""]}
              onChange={selected => setForm(previous => ({ ...previous, uom: selected[0] ?? "" }))}
              getItemKey={code => code || "none"}
              getItemLabel={code => inventoryUnitLabel(code, t)}
              buttonLabel={t("units.none")}
              ariaLabel={t("items.columns.uom")}
              singleSelect
              hideCheckboxes
              disabled={busy}
            />
          </div>
          {mode === "create" ? (
            <div>
              <Input kind="text" type="number" min="0" step="1" label={t("items.panel.openingQuantity")} value={form.quantity_on_hand} onChange={event => setForm(previous => ({ ...previous, quantity_on_hand: event.target.value }))} disabled={busy} />
              <p className="mt-1 text-[11px] leading-5 text-gray-500">{t("items.panel.openingQuantityHint")}</p>
            </div>
          ) : null}
          <div>
            <Input kind="text" type="number" min="0" step="1" label={t("items.columns.reorderPoint")} value={form.reorder_point} onChange={event => setForm(previous => ({ ...previous, reorder_point: event.target.value }))} disabled={busy} />
            <p className="mt-1 text-[11px] leading-5 text-gray-500">{t("items.panel.reorderPointHint")}</p>
          </div>
          <div>
            <Input kind="amount" label={t("items.columns.unitCost")} value={form.unit_cost} onValueChange={(value: string) => setForm(previous => ({ ...previous, unit_cost: value }))} disabled={busy} />
            <p className="mt-1 text-[11px] leading-5 text-gray-500">{t("items.panel.priceHistoryHint")}</p>
          </div>
          <label className="flex items-center gap-2 text-sm md:pt-6">
            <Checkbox aria-label={t("common.active")} checked={form.is_active} onChange={event => setForm(previous => ({ ...previous, is_active: event.target.checked }))} disabled={busy} />
            {t("common.active")}
          </label>
        </div>

        {mode === "edit" ? <p className="text-[11px] leading-5 text-gray-500">{t("items.panel.stockReadOnly")}</p> : null}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={attemptClose} disabled={busy}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={busy}>{saving ? t("common.saving") : t("common.save")}</Button>
        </div>
      </SidePanelForm>

      {confirmDiscard ? (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/20 p-0 backdrop-blur-[2px] md:items-center md:p-4">
          <div className="w-full rounded-t-2xl border border-gray-200 bg-white shadow-2xl md:max-w-md md:rounded-lg">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-gray-900">{t("panel.discardTitle")}</h2>
              <p className="mt-1 text-xs text-gray-600">{t("panel.discardMessage")}</p>
            </div>
            <div className="flex flex-col-reverse gap-2 px-5 py-4 md:flex-row md:justify-end">
              <Button variant="secondary" className="w-full md:w-auto" onClick={() => setConfirmDiscard(false)}>{t("common.cancel")}</Button>
              <Button variant="danger" className="w-full md:w-auto" onClick={closeNow}>{t("panel.discard")}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </SidePanel>
  );
}
