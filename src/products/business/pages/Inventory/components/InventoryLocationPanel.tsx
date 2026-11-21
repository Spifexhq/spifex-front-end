import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiErrorMessage, isPreconditionFailure } from "@/lib/apiErrorMessage";
import { api } from "@/core/api/requests";
import SidePanel, { SidePanelForm } from "@/components/Modal/SidePanel";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Checkbox from "@/shared/ui/Checkbox";
import type { InventoryLocation } from "@/models/settings/inventory";

type FormState = {
  code: string;
  name: string;
  description: string;
  is_default: boolean;
  is_active: boolean;
};

const EMPTY: FormState = { code: "", name: "", description: "", is_default: false, is_active: true };

function comparable(form: FormState) {
  return JSON.stringify({
    ...form,
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    description: form.description.trim(),
  });
}

export default function InventoryLocationPanel({
  isOpen,
  mode,
  location,
  onClose,
  onSaved,
  onNotify,
}: {
  isOpen: boolean;
  mode: "create" | "edit";
  location?: InventoryLocation | null;
  onClose(): void;
  onSaved?(): void;
  onNotify?(message: string, severity: "success" | "error"): void;
}) {
  const { t } = useTranslation("inventory");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [baseline, setBaseline] = useState(comparable(EMPTY));
  const versionRef = useRef<string | undefined>(undefined);
  const codeRef = useRef<HTMLInputElement>(null);
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
      requestAnimationFrame(() => codeRef.current?.focus());
      return () => { alive = false; };
    }

    if (!location?.id) return () => { alive = false; };

    setLoading(true);
    void (async () => {
      try {
        const { data } = await api.getInventoryLocation(location.id);
        if (!alive) return;
        versionRef.current = data.version;
        const next: FormState = {
          code: data.code ?? "",
          name: data.name ?? "",
          description: data.description ?? "",
          is_default: data.is_default ?? false,
          is_active: data.is_active ?? true,
        };
        setForm(next);
        setBaseline(comparable(next));
      } catch (cause) {
        if (!alive) return;
        const next: FormState = {
          code: location.code ?? "",
          name: location.name ?? "",
          description: location.description ?? "",
          is_default: location.is_default ?? false,
          is_active: location.is_active ?? true,
        };
        setForm(next);
        setBaseline(comparable(next));
        setError(apiErrorMessage(cause, t("locations.errors.load")));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [isOpen, mode, location, reset, t]);

  const submit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    if (!code || !name) {
      setError(t("locations.errors.validation"));
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        code,
        name,
        description: form.description.trim(),
        is_default: form.is_default,
        is_active: form.is_active,
      };
      if (mode === "create") {
        await api.addInventoryLocation(payload);
        onNotify?.(t("locations.toast.created"), "success");
      } else if (location?.id) {
        await api.editInventoryLocation(location.id, payload, versionRef.current);
        onNotify?.(t("locations.toast.updated"), "success");
      }
      onSaved?.();
      closeNow();
    } catch (cause) {
      const message = isPreconditionFailure(cause)
        ? t("locations.errors.concurrent")
        : apiErrorMessage(cause, t("locations.errors.save"));
      setError(message);
      onNotify?.(message, "error");
    } finally {
      setSaving(false);
    }
  }, [form, mode, location, onNotify, onSaved, closeNow, t]);

  return (
    <SidePanel
      mode="edit"
      isOpen={isOpen}
      title={mode === "create" ? t("locations.panel.createTitle") : t("locations.panel.editTitle")}
      subtitle={t("locations.panel.subtitle")}
      onClose={attemptClose}
      busy={busy}
    >
      <SidePanelForm onSubmit={submit} className="space-y-4 pb-4 md:pb-6">
        {error ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input kind="text" label={t("locations.columns.code")} value={form.code} onChange={event => setForm(previous => ({ ...previous, code: event.target.value.toUpperCase() }))} ref={codeRef} required disabled={busy} />
          <Input kind="text" label={t("common.name")} value={form.name} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} required disabled={busy} />
          <div className="md:col-span-2">
            <Input kind="text" label={t("common.description")} value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} disabled={busy} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-start gap-2 text-sm">
              <Checkbox aria-label={t("common.default")} checked={form.is_default} onChange={event => setForm(previous => ({ ...previous, is_default: event.target.checked }))} disabled={busy || (mode === "edit" && location?.is_default)} />
              <span>
                <span className="block font-medium text-gray-800">{t("common.default")}</span>
                <span className="mt-0.5 block text-[11px] leading-5 text-gray-500">{t("locations.panel.defaultHint")}</span>
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Checkbox aria-label={t("common.active")} checked={form.is_active} onChange={event => setForm(previous => ({ ...previous, is_active: event.target.checked }))} disabled={busy} />
              <span>
                <span className="block font-medium text-gray-800">{t("common.active")}</span>
                <span className="mt-0.5 block text-[11px] leading-5 text-gray-500">{t("locations.panel.activeHint")}</span>
              </span>
            </div>
          </div>
        </div>

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
