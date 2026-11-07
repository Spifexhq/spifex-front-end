import { isPreconditionFailure } from "@/lib/apiErrorMessage";
import SidePanel, { SidePanelFooter } from "@/components/Modal/SidePanel";

/* -------------------------------------------------------------------------- */
/* File: src/pages/Settings/InventorySettings/InventoryModal.tsx                       */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Checkbox from "@/shared/ui/Checkbox";
import Shimmer from "@/shared/ui/Loaders/Shimmer";

import { api } from "@/core/api/requests";

import type { InventoryItem } from "@/models/settings/inventory";

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type Mode = "create" | "edit";

type FormState = {
  sku: string;
  name: string;
  description: string;
  uom: string;
  quantity_on_hand: string;
  is_active: boolean;
};

const emptyForm: FormState = {
  sku: "",
  name: "",
  description: "",
  uom: "",
  quantity_on_hand: "0",
  is_active: true,
};

export type InventoryModalProps = {
  isOpen: boolean;
  mode: Mode;
  item?: InventoryItem | null;

  onClose: () => void;
  onNotify?: (snack: Snack) => void;
  onSaved?: (result: { mode: Mode; created?: InventoryItem }) => void;
};

const ModalSkeleton: React.FC = () => (
  <div className="space-y-4 py-1">
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <div className="flex justify-end gap-2 pt-1">
      <Shimmer className="h-9 w-24 rounded-md" />
      <Shimmer className="h-9 w-28 rounded-md" />
    </div>
  </div>
);

function normalizeComparable(form: FormState) {
  const trim = (v: string) => (v ?? "").trim();
  const qty = trim(form.quantity_on_hand);
  return {
    sku: trim(form.sku),
    name: trim(form.name),
    description: trim(form.description),
    uom: trim(form.uom),
    quantity_on_hand: qty === "" ? "0" : qty,
    is_active: !!form.is_active,
  };
}

function normalizeQty(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!s) return "0";
  const n = Number(s);
  if (!Number.isFinite(n)) return "0";
  if (!Number.isInteger(n)) return String(Math.trunc(n));
  if (n < 0) return "0";
  return String(n);
}

const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  mode,
  item,
  onClose,
  onNotify,
  onSaved,
}) => {
  const { t } = useTranslation("inventorySettings");

  const itemId = item?.id ?? null;

  const recordVersion = useRef<string | undefined>(undefined);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [warning, setWarning] = useState<{ title: string; message: string } | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);
  const baselineRef = useRef<string>(JSON.stringify(normalizeComparable(emptyForm)));
  const effectiveBusy = isSubmitting || isDetailLoading;

  const title = useMemo(() => {
    return mode === "create" ? t("modal.createTitle") : t("modal.editTitle");
  }, [mode, t]);

  const isDirty = useMemo(() => {
    const now = JSON.stringify(normalizeComparable(formData));
    return now !== baselineRef.current;
  }, [formData]);

  const isSaveDisabled = useMemo(() => {
    if (effectiveBusy) return true;
    if (!formData.sku.trim()) return true;
    if (!formData.name.trim()) return true;
    const n = Number(String(formData.quantity_on_hand ?? "").trim());
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return true;
    return false;
  }, [effectiveBusy, formData.sku, formData.name, formData.quantity_on_hand]);

  const resetInternalState = useCallback(() => {
    setFormData(emptyForm);
    setIsDetailLoading(false);
    setIsSubmitting(false);
    setShowCloseConfirm(false);
    setWarning(null);
    baselineRef.current = JSON.stringify(normalizeComparable(emptyForm));
  }, []);

  const handleClose = useCallback(() => {
    resetInternalState();
    onClose();
  }, [onClose, resetInternalState]);

  const attemptClose = useCallback(() => {
    if (effectiveBusy) return;

    if (warning) {
      setWarning(null);
      return;
    }

    if (showCloseConfirm) return;

    if (isDirty) {
      setShowCloseConfirm(true);
      return;
    }

    handleClose();
  }, [effectiveBusy, handleClose, isDirty, showCloseConfirm, warning]);

  useEffect(() => {
    if (!isOpen) return;

    let alive = true;

    (async () => {
      resetInternalState();

      if (mode === "create") {
        requestAnimationFrame(() => nameRef.current?.focus());
        return;
      }

      if (!itemId) return;

      setIsDetailLoading(true);

      try {
        const res = await api.getInventoryItem(itemId);
        const detail = res.data as InventoryItem;
        if (!alive) return;
        recordVersion.current = (detail as typeof detail & { version?: string }).version;

        const next: FormState = {
          sku: detail.sku ?? "",
          name: detail.name ?? "",
          description: detail.description ?? "",
          uom: detail.uom ?? "",
          quantity_on_hand: normalizeQty(detail.quantity_on_hand),
          is_active: detail.is_active ?? true,
        };

        setFormData(next);
        baselineRef.current = JSON.stringify(normalizeComparable(next));
        requestAnimationFrame(() => nameRef.current?.focus());
      } catch {
        if (!alive) return;

        const fallback: FormState = {
          sku: item?.sku ?? "",
          name: item?.name ?? "",
          description: item?.description ?? "",
          uom: item?.uom ?? "",
          quantity_on_hand: normalizeQty(item?.quantity_on_hand),
          is_active: item?.is_active ?? true,
        };

        setFormData(fallback);
        baselineRef.current = JSON.stringify(normalizeComparable(fallback));
        onNotify?.({ message: t("errors.detailError"), severity: "error" });
        requestAnimationFrame(() => nameRef.current?.focus());
      } finally {
        if (alive) setIsDetailLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isOpen, mode, itemId, resetInternalState, onNotify, t, item]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        attemptClose();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        (document.getElementById("inventoryModalForm") as HTMLFormElement | null)?.requestSubmit();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, attemptClose]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "quantity_on_hand") {
      setFormData((p) => ({ ...p, quantity_on_hand: value }));
      return;
    }

    setFormData((p) => ({ ...p, [name]: value }));
  }, []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const sku = formData.sku.trim();
      const name = formData.name.trim();

      if (!sku || !name) {
        setWarning({ title: t("errors.validationTitle"), message: t("errors.validationSkuName") });
        return;
      }

      const qtyStr = String(formData.quantity_on_hand ?? "").trim();
      const qtyNum = Number(qtyStr);
      if (!Number.isFinite(qtyNum) || !Number.isInteger(qtyNum) || qtyNum < 0) {
        setWarning({ title: t("errors.validationTitle"), message: t("errors.validationQty") });
        return;
      }

      const payload: FormState = {
        sku,
        name,
        description: (formData.description ?? "").trim(),
        uom: (formData.uom ?? "").trim(),
        quantity_on_hand: String(qtyNum),
        is_active: !!formData.is_active,
      };

      setIsSubmitting(true);

      try {
        if (mode === "create") {
          const { data: created } = await api.addInventoryItem(payload as unknown as InventoryItem);
          onNotify?.({ message: t("toast.saveOk"), severity: "success" });
          onSaved?.({ mode: "create", created: created as InventoryItem });
          handleClose();
          return;
        }

        if (!itemId) return;

        await api.editInventoryItem(itemId, payload as unknown as InventoryItem, recordVersion.current);
        onNotify?.({ message: t("toast.updateOk"), severity: "success" });
        onSaved?.({ mode: "edit" });
        handleClose();
      } catch (err) {
        const msg = isPreconditionFailure(err) ? t("errors.concurrentChange") : err instanceof Error ? err.message : t("errors.saveError");
        onNotify?.({ message: msg, severity: "error" });
        setWarning({ title: t("errors.saveError"), message: msg });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, mode, itemId, onNotify, onSaved, handleClose, t]
  );

  return (
    <SidePanel mode="edit" isOpen={isOpen} title={<>{title}</>} onClose={attemptClose} busy={effectiveBusy}>



        <form
          id="inventoryModalForm"
          className="settings-modal-form"
          onSubmit={submit}
        >
          <div className="settings-modal-scroll">
            {mode === "edit" && isDetailLoading ? (
              <ModalSkeleton />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  kind="text"
                  label={t("field.sku")}
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  required
                  disabled={effectiveBusy}
                />

                <Input
                  kind="text"
                  label={t("field.name")}
                  name="name"
                  ref={nameRef}
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={effectiveBusy}
                />

                <Input
                  kind="text"
                  label={t("field.description")}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={effectiveBusy}
                />

                <Input
                  kind="text"
                  label={t("field.uom")}
                  name="uom"
                  placeholder={t("field.uomPlaceholder")}
                  value={formData.uom}
                  onChange={handleChange}
                  disabled={effectiveBusy}
                />

                <Input
                  kind="text"
                  label={t("field.qty")}
                  name="quantity_on_hand"
                  type="number"
                  step="1"
                  min="0"
                  value={formData.quantity_on_hand}
                  onChange={handleChange}
                  disabled={effectiveBusy}
                />

                <label className="flex items-center gap-2 text-sm pt-0 md:pt-6">
                  <Checkbox
                    checked={!!formData.is_active}
                    onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                    disabled={effectiveBusy}
                  />
                  {t("field.isActive")}
                </label>
              </div>
            )}
          </div>

          <SidePanelFooter
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-[12px] text-gray-600 hidden md:block">
                {formData.name.trim() ? (
                  <>
                    {t("footer.item")} <b>{formData.name.trim()}</b>
                  </>
                ) : (
                  <>{t("footer.enterName")}</>
                )}
                <span className="ml-3 text-gray-400">{t("footer.shortcuts")}</span>
              </p>

              <div className="grid grid-cols-2 gap-2 md:flex md:gap-2 md:ml-auto">
                <Button variant="cancel" type="button" onClick={attemptClose} disabled={effectiveBusy} className="w-full md:w-auto">
                  {t("btn.cancel")}
                </Button>
                <Button type="submit" disabled={isSaveDisabled} className="w-full md:w-auto">
                  {t("btn.save")}
                </Button>
              </div>
            </div>
          </SidePanelFooter>
        </form>

        {showCloseConfirm && (
          <div className="absolute inset-0 z-20 bg-black/20 backdrop-blur-[2px] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="w-full md:max-w-md rounded-t-2xl md:rounded-lg border border-gray-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-[15px] font-semibold text-gray-900">{t("confirmDiscard.title")}</h2>
                <p className="mt-1 text-[12px] text-gray-600">{t("confirmDiscard.message")}</p>
              </div>
              <div
                className="px-5 py-4 flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-2"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <Button
                  variant="outline"
                  className="w-full md:w-auto !border-gray-200 !text-gray-700 hover:!bg-gray-50"
                  onClick={() => setShowCloseConfirm(false)}
                >
                  {t("btn.cancel")}
                </Button>
                <Button variant="danger" className="w-full md:w-auto !bg-red-500 hover:!bg-red-600" onClick={handleClose}>
                  {t("actions.discard")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {warning && (
          <div className="absolute inset-0 z-30 bg-black/20 backdrop-blur-[2px] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="w-full md:max-w-md rounded-t-2xl md:rounded-lg border border-amber-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-amber-100">
                <h2 className="text-[15px] font-semibold text-amber-800">{warning.title}</h2>
                <p className="mt-1 text-[12px] text-amber-700">{warning.message}</p>
              </div>
              <div
                className="px-5 py-4 flex justify-end"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <Button
                  variant="primary"
                  className="w-full md:w-auto"
                  onClick={() => {
                    setWarning(null);
                    requestAnimationFrame(() => nameRef.current?.focus());
                  }}
                >
                  {t("actions.ok")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </SidePanel>
  );
};

export default InventoryModal;
