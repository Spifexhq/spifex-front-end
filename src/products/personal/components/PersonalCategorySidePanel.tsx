import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import SidePanel, { SidePanelForm } from "@/components/Modal/SidePanel";
import Button from "@/shared/ui/Button";
import Checkbox from "@/shared/ui/Checkbox";
import Input from "@/shared/ui/Input";
import { Select } from "@/shared/ui/Select";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { personalApi } from "../services/api";
import type { PersonalRecord } from "../types";

type Kind = "" | "income" | "expense";

export default function PersonalCategorySidePanel({ record, onClose, onSaved }: {
  record?: PersonalRecord | null;
  onClose(): void;
  onSaved(): void;
}) {
  const { t } = useTranslation("personal");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("expense");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const values = record as Record<string, unknown> | null | undefined;
    setName(String(values?.name || ""));
    const current = String(values?.kind || "");
    setKind(current === "income" || current === "expense" ? current : "expense");
    setActive(values?.is_active !== false);
    setError("");
  }, [record]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const payload = { name: name.trim(), kind: kind || null, is_active: active };
      if (record?.id) await personalApi.edit("categories", record.id, payload);
      else await personalApi.create("categories", payload);
      onSaved();
    } catch (cause) {
      setError(apiErrorMessage(cause, t("error")));
    } finally {
      setBusy(false);
    }
  };

  const options: Array<{ value: Kind; label: string }> = [
    { value: "income", label: t("income") },
    { value: "expense", label: t("expense") },
    { value: "", label: t("noType") },
  ];
  const selected = options.filter(option => option.value === kind);

  return <SidePanel
    isOpen
    onClose={onClose}
    busy={busy}
    title={record ? t("edit") : t("create")}
    subtitle={t("categories")}
    contentClassName="pb-4 md:pb-6"
  >
    <SidePanelForm onSubmit={submit} className="space-y-5">
      {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
      <Input
        kind="text"
        label={t("name")}
        value={name}
        required
        maxLength={120}
        disabled={busy}
        onChange={event => setName(event.target.value)}
      />
      <Select<{ value: Kind; label: string }>
        label={t("kind")}
        ariaLabel={t("kind")}
        items={options}
        selected={selected}
        onChange={items => setKind(items[0]?.value ?? "")}
        getItemKey={item => item.value || "none"}
        getItemLabel={item => item.label}
        buttonLabel={t("kind")}
        singleSelect
        hideCheckboxes
        disabled={busy}
      />
      <label className="flex items-center gap-3 rounded-md border border-gray-300 bg-white px-3 py-3 text-[13px] font-medium text-gray-700">
        <Checkbox checked={active} disabled={busy} onChange={event => setActive(event.target.checked)} size="small" />
        <span>{t("active")}</span>
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t("cancel")}</Button>
        <Button type="submit" isLoading={busy} disabled={busy || !name.trim()}>{t("save")}</Button>
      </div>
    </SidePanelForm>
  </SidePanel>;
}
