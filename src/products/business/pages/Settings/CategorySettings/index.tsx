import { apiErrorMessage } from "@/lib/apiErrorMessage";
import SidePanel, { SidePanelForm } from "@/components/Modal/SidePanel";
import DataTable from "@/shared/ui/DataTable";
import AccountingStatus from "@/products/business/pages/Accounting/components/AccountingStatus";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import Checkbox from "@/shared/ui/Checkbox";
import Input from "@/shared/ui/Input";
import Textarea from "@/shared/ui/Input/Textarea";
import { SettingsPageSkeleton } from "@/shared/ui/Loaders/PageSkeleton";
import Snackbar from "@/shared/ui/Snackbar";
import Popover from "@/shared/ui/Popover";
import SettingsFilters from "@/shared/ui/Settings/SettingsFilters";
import { SettingsClearFilters, SettingsFilter } from "@/shared/ui/Settings/SettingsFilter";
import { Select } from "src/shared/ui/Select";

import { api } from "@/api";

import type {
  AddCashflowCategoryRequest,
  CashflowCategory,
  EditCashflowCategoryRequest,
} from "@/models/settings/categories";

type SnackbarState = {
  severity: "error" | "success";
  message: string;
} | null;

type CategoryFormState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  parent_id: string;
  tx_type_hint: "credit" | "debit" | "";
  is_active: boolean;
  sort_order: string;
  metadata_text: string;
};

type Option<T extends string = string> = {
  label: string;
  value: T;
};

const EMPTY_FORM: CategoryFormState = {
  code: "",
  name: "",
  description: "",
  parent_id: "",
  tx_type_hint: "",
  is_active: true,
  sort_order: "0",
  metadata_text: "{}",
};

function extractCollection<T>(input: unknown): T[] {
  if (Array.isArray(input)) return input as T[];
  if (!input || typeof input !== "object") return [];

  const obj = input as Record<string, unknown>;
  for (const key of ["results", "items", "data", "categories"]) {
    const value = obj[key];
    if (Array.isArray(value)) return value as T[];
  }

  if (obj.data && obj.data !== input) {
    const nested = extractCollection<T>(obj.data);
    if (nested.length || Array.isArray(obj.data)) return nested;
  }

  return [];
}

const CategorySettingsPage: React.FC = () => {
  const { t } = useTranslation("categorySettings");

  useEffect(() => {
    document.title = t("header.title");
  }, [t]);

  const TX_TYPE_OPTIONS = React.useMemo<Array<Option<"credit" | "debit">>>(
    () => [
      { value: "credit", label: t("filters.credit") },
      { value: "debit", label: t("filters.debit") },
    ],
    [t]
  );

  const categoryLabel = React.useCallback(
    (category: CashflowCategory): string =>
      [category.code, category.name].filter(Boolean).join(" — ") || category.name || t("common.empty"),
    [t]
  );

  const txHintLabel = React.useCallback(
    (value?: CashflowCategory["tx_type_hint"] | "") => {
      if (value === "credit") return t("filters.credit");
      if (value === "debit") return t("filters.debit");
      return t("common.empty");
    },
    [t]
  );

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [snackbar, setSnackbar] = React.useState<SnackbarState>(null);

  const [items, setItems] = React.useState<CashflowCategory[]>([]);
  const [parentChoices, setParentChoices] = React.useState<CashflowCategory[]>([]);

  const [draftSearch, setDraftSearch] = React.useState("");
  const [draftStatuses, setDraftStatuses] = React.useState<("active" | "inactive")[]>(["active"]);
  const [draftTxFilter, setDraftTxFilter] = React.useState<"credit" | "debit" | "">("");
  const [draftParent, setDraftParent] = React.useState("");

  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [appliedStatuses, setAppliedStatuses] = React.useState<("active" | "inactive")[]>(["active"]);
  const [openFilter, setOpenFilter] = React.useState<"search" | "type" | "status" | "parent" | null>(null);
  const searchAnchorRef = React.useRef<HTMLDivElement | null>(null);
  const typeAnchorRef = React.useRef<HTMLDivElement | null>(null);
  const statusAnchorRef = React.useRef<HTMLDivElement | null>(null);
  const parentAnchorRef = React.useRef<HTMLDivElement | null>(null);
  const [appliedTxFilter, setAppliedTxFilter] = React.useState<"credit" | "debit" | "">("");
  const [appliedParent, setAppliedParent] = React.useState("");

  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState<CategoryFormState>(EMPTY_FORM);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getCashflowCategories({
        is_active: appliedStatuses.length ? appliedStatuses.join(",") : "active,inactive",
        ...(appliedSearch.trim() ? { search: appliedSearch.trim() } : {}),
        ...(appliedTxFilter ? { tx_type_hint: appliedTxFilter } : {}),
        ...(appliedParent ? { parent_id: appliedParent } : {}),
      });
      const nextItems = extractCollection<CashflowCategory>((response as { data?: unknown })?.data ?? response);
      setItems(nextItems);
    } catch (notificationCause) {
      setItems([]);
      setSnackbar({ severity: "error", message: apiErrorMessage(notificationCause, t("feedback.loadError")) });
    } finally {
      setLoading(false);
    }
  }, [appliedStatuses, appliedSearch, appliedTxFilter, appliedParent, t]);

  const loadParentChoices = React.useCallback(async () => {
    try {
      const response = await api.getCashflowCategories({ is_active: "active,inactive" });
      const nextItems = extractCollection<CashflowCategory>((response as { data?: unknown })?.data ?? response);
      setParentChoices(nextItems);
    } catch {
      setParentChoices([]);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    void loadParentChoices();
  }, [loadParentChoices]);

  const applyFilters = React.useCallback(() => {
    setAppliedSearch(draftSearch);
    setAppliedStatuses(draftStatuses);
    setAppliedTxFilter(draftTxFilter);
    setAppliedParent(draftParent);
  }, [draftStatuses, draftSearch, draftTxFilter, draftParent]);

  const clearFilters = React.useCallback(() => {
    setDraftSearch("");
    setDraftStatuses(["active"]);
    setDraftTxFilter("");
    setDraftParent("");

    setAppliedSearch("");
    setAppliedStatuses(["active"]);
    setAppliedTxFilter("");
    setAppliedParent("");
  }, []);

  const parentOptions = React.useMemo(() => {
    return items
      .filter((item) => item.id !== form.id)
      .sort((a, b) => {
        const codeA = (a.code || "").toLowerCase();
        const codeB = (b.code || "").toLowerCase();
        if (codeA !== codeB) return codeA.localeCompare(codeB, undefined, { numeric: true });
        return (a.name || "").localeCompare(b.name || "");
      })
      .map((item) => ({
        label: categoryLabel(item),
        value: item.id,
      }));
  }, [items, form.id, categoryLabel]);

  const selectedParent = React.useMemo(
    () => parentOptions.filter((item) => item.value === form.parent_id),
    [parentOptions, form.parent_id]
  );

  const selectedTxType = React.useMemo(
    () => TX_TYPE_OPTIONS.filter((item) => item.value === form.tx_type_hint),
    [form.tx_type_hint, TX_TYPE_OPTIONS]
  );

  const selectedDraftTxFilter = React.useMemo(
    () => TX_TYPE_OPTIONS.filter((item) => item.value === draftTxFilter),
    [draftTxFilter, TX_TYPE_OPTIONS]
  );

  const parentFilterOptions = React.useMemo<Array<Option>>(
    () => [
      { value: "root", label: t("filters.noParent") },
      ...parentChoices
        .slice()
        .sort((a, b) => {
          const codeA = (a.code || "").toLowerCase();
          const codeB = (b.code || "").toLowerCase();
          if (codeA !== codeB) return codeA.localeCompare(codeB, undefined, { numeric: true });
          return (a.name || "").localeCompare(b.name || "");
        })
        .map((item) => ({ value: item.id, label: categoryLabel(item) })),
    ],
    [parentChoices, categoryLabel, t]
  );

  const selectedParentFilter = React.useMemo(
    () => parentFilterOptions.filter((item) => item.value === appliedParent),
    [parentFilterOptions, appliedParent]
  );

  const selectedDraftParent = React.useMemo(
    () => parentFilterOptions.filter((item) => item.value === draftParent),
    [parentFilterOptions, draftParent]
  );

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item: CashflowCategory) => {
    setForm({
      id: item.id,
      code: item.code ?? "",
      name: item.name ?? "",
      description: item.description ?? "",
      parent_id: item.parent_id ?? "",
      tx_type_hint: item.tx_type_hint ?? "",
      is_active: !!item.is_active,
      sort_order: String(item.sort_order ?? 0),
      metadata_text: JSON.stringify(item.metadata ?? {}, null, 2),
    });
    setModalOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setSnackbar({ severity: "error", message: t("feedback.nameRequired") });
      return;
    }

    let metadata: Record<string, unknown> = {};
    try {
      metadata = form.metadata_text.trim() ? JSON.parse(form.metadata_text) : {};
    } catch (notificationCause) {
      setSnackbar({ severity: "error", message: apiErrorMessage(notificationCause, t("feedback.invalidJson")) });
      return;
    }

    const basePayload: AddCashflowCategoryRequest | EditCashflowCategoryRequest = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      parent_id: form.parent_id || null,
      tx_type_hint: form.tx_type_hint || null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order || 0),
      metadata,
    };

    try {
      setSaving(true);
      if (form.id) {
        await api.editCashflowCategory(form.id, basePayload);
        setSnackbar({ severity: "success", message: t("feedback.updated") });
      } else {
        await api.addCashflowCategory(basePayload as AddCashflowCategoryRequest);
        setSnackbar({ severity: "success", message: t("feedback.created") });
      }
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await Promise.all([load(), loadParentChoices()]);
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        t("feedback.saveError");
      setSnackbar({ severity: "error", message });
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (item: CashflowCategory) => {
    try {
      setDeletingId(item.id);
      await api.deleteCashflowCategory(item.id);
      setItems(current => current.filter(category => category.id !== item.id));
      setSnackbar({ severity: "success", message: t("feedback.deleted") });
      await Promise.all([load(), loadParentChoices()]);
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        t("feedback.deleteError");
      setSnackbar({ severity: "error", message });
      throw error;
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <SettingsPageSkeleton rows={6} variant="settings-table" />;

  const statusIsDefault = appliedStatuses.length === 1 && appliedStatuses[0] === "active";
  const hasFilters = !!appliedSearch || !!appliedTxFilter || !!appliedParent || !statusIsDefault;
  const statusFilterLabel = appliedStatuses.length === 0
    ? t("filters.any")
    : appliedStatuses.map(value => t(`status.${value}`)).join(", ");

  return (
    <>
      <main className="settings-page">
        <div className="settings-content space-y-6">
          <section className="space-y-4">
            <div className="settings-toolbar mb-4">
              <SettingsFilters active={hasFilters}>
                <div ref={searchAnchorRef}><SettingsFilter label={t("filters.search")} value={appliedSearch ? `• ${appliedSearch}` : undefined} active={!!appliedSearch} expanded={openFilter === "search"} onClick={() => setOpenFilter(openFilter === "search" ? null : "search")} onClear={appliedSearch ? () => { setDraftSearch(""); setAppliedSearch(""); } : undefined} /></div>
                <div ref={parentAnchorRef}><SettingsFilter label={t("filters.parent")} value={selectedParentFilter[0] ? `• ${selectedParentFilter[0].label}` : undefined} active={!!appliedParent} expanded={openFilter === "parent"} onClick={() => setOpenFilter(openFilter === "parent" ? null : "parent")} onClear={appliedParent ? () => { setDraftParent(""); setAppliedParent(""); } : undefined} /></div>
                <div ref={typeAnchorRef}><SettingsFilter label={t("filters.transactionHint")} value={appliedTxFilter ? t(appliedTxFilter === "credit" ? "filters.credit" : "filters.debit") : undefined} active={!!appliedTxFilter} expanded={openFilter === "type"} onClick={() => setOpenFilter(openFilter === "type" ? null : "type")} onClear={appliedTxFilter ? () => { setDraftTxFilter(""); setAppliedTxFilter(""); } : undefined} /></div>
                <div ref={statusAnchorRef}><SettingsFilter label={t("table.status")} value={statusFilterLabel} active={!statusIsDefault} expanded={openFilter === "status"} onClick={() => setOpenFilter(openFilter === "status" ? null : "status")} onClear={() => { setDraftStatuses(["active"]); setAppliedStatuses(["active"]); }} /></div>
                {hasFilters && <SettingsClearFilters label={t("actions.clear")} onClick={clearFilters} />}
              </SettingsFilters>
              <Button type="button" onClick={openCreate} disabled={saving || !!deletingId}>{t("actions.new")}</Button>
            </div>

            <Popover appearance="settings" open={openFilter === "search"} anchorRef={searchAnchorRef} onClose={() => setOpenFilter(null)} title={t("filters.search")} width={420}>
              <div className="p-4"><Input kind="text" value={draftSearch} onChange={event => setDraftSearch(event.target.value)} placeholder={t("filters.searchPlaceholder")} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); applyFilters(); setOpenFilter(null); } }} /><div className="mt-3 flex items-center justify-between"><Button type="button" variant="ghost" size="sm" onClick={() => { setDraftSearch(""); setAppliedSearch(""); }}>{t("actions.clear")}</Button><Button type="button" size="sm" onClick={() => { applyFilters(); setOpenFilter(null); }}>{t("actions.apply")}</Button></div></div>
            </Popover>
            <Popover appearance="settings" open={openFilter === "parent"} anchorRef={parentAnchorRef} onClose={() => setOpenFilter(null)} title={t("filters.parent")} width={360}>
              <div className="p-4"><Select<Option> label={t("filters.parent")} items={parentFilterOptions} selected={selectedDraftParent} onChange={selected => setDraftParent(selected[0]?.value ?? "")} getItemKey={item => item.value} getItemLabel={item => item.label} buttonLabel={t("filters.any")} singleSelect hideCheckboxes /><div className="mt-3 flex items-center justify-between"><Button type="button" variant="ghost" size="sm" onClick={() => setDraftParent("")}>{t("actions.clear")}</Button><Button type="button" size="sm" onClick={() => { applyFilters(); setOpenFilter(null); }}>{t("actions.apply")}</Button></div></div>
            </Popover>
            <Popover appearance="settings" open={openFilter === "type"} anchorRef={typeAnchorRef} onClose={() => setOpenFilter(null)} title={t("filters.transactionHint")} width={360}>
              <div className="p-4"><Select<Option<"credit" | "debit">> label={t("filters.transactionHint")} items={TX_TYPE_OPTIONS} selected={selectedDraftTxFilter} onChange={selected => setDraftTxFilter(selected[0]?.value ?? "")} getItemKey={item => item.value} getItemLabel={item => item.label} buttonLabel={t("filters.any")} singleSelect hideCheckboxes /><div className="mt-3 flex items-center justify-between"><Button type="button" variant="ghost" size="sm" onClick={() => setDraftTxFilter("")}>{t("actions.clear")}</Button><Button type="button" size="sm" onClick={() => { applyFilters(); setOpenFilter(null); }}>{t("actions.apply")}</Button></div></div>
            </Popover>
            <Popover appearance="settings" open={openFilter === "status"} anchorRef={statusAnchorRef} onClose={() => setOpenFilter(null)} title={t("table.status")} width={360}>
              <div className="p-4"><Select<{ value: "active" | "inactive"; label: string }> label={t("table.status")} items={[{ value: "active", label: t("status.active") }, { value: "inactive", label: t("status.inactive") }]} selected={draftStatuses.map(value => ({ value, label: t(`status.${value}`) }))} onChange={selected => setDraftStatuses(selected.map(item => item.value) as ("active" | "inactive")[])} getItemKey={item => item.value} getItemLabel={item => item.label} buttonLabel={t("filters.any")} /><div className="mt-3 flex items-center justify-between"><Button type="button" variant="ghost" size="sm" onClick={() => setDraftStatuses(["active"])}>{t("actions.clear")}</Button><Button type="button" size="sm" onClick={() => { applyFilters(); setOpenFilter(null); }}>{t("actions.apply")}</Button></div></div>
            </Popover>

            <div className="[&_table]:min-w-0! md:[&_table]:min-w-[740px]!">
            <DataTable
              key={JSON.stringify([appliedSearch, appliedStatuses, appliedTxFilter, appliedParent])}

              items={items}
              editLabel={t("actions.edit")}
              emptyLabel={t("table.empty")}
              onEdit={openEdit}
              onDelete={removeCategory}
              previewFields={[{ key: "order", label: t("table.sort"), render: item => item.sort_order ?? 0 }, { key: "description", label: t("modal.description"), render: item => item.description || t("common.empty") }]}
              columns={[
                { key: "name", label: t("table.name"), render: item => item.name },
                { key: "code", label: t("table.code"), render: item => item.code || t("common.empty") },
                { key: "parent", label: t("table.parent"), render: item => item.parent_label || t("common.empty") },
                { key: "type", label: t("table.txHint"), render: item => txHintLabel(item.tx_type_hint) },
                { key: "entries", label: t("table.entries"), render: item => item.entry_count ?? 0 },
                { key: "status", label: t("table.status"), render: item => <AccountingStatus active={!!item.is_active} label={t(item.is_active ? "status.active" : "status.inactive")} /> },
              ]}
            />
            </div>
          </section>
        </div>
      </main>

      <SidePanel
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? t("modal.editTitle") : t("modal.createTitle")}
        subtitle={t("modal.subtitle")}
        contentClassName="pb-4 md:pb-6"
      >
        <SidePanelForm onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              kind="text"
              label={t("modal.code")}
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
            />
            <Input
              kind="text"
              label={t("modal.name")}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <Input
            kind="text"
            label={t("modal.description")}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Select<{ label: string; value: string }>
              label={t("modal.parent")}
              items={parentOptions}
              selected={selectedParent}
              onChange={(selected) => setForm((prev) => ({ ...prev, parent_id: selected[0]?.value ?? "" }))}
              getItemKey={(item) => item.value}
              getItemLabel={(item) => item.label}
              buttonLabel={t("modal.noParent")}
              singleSelect
              hideCheckboxes
            />

            <Select<Option<"credit" | "debit">>
              label={t("modal.txHint")}
              items={TX_TYPE_OPTIONS}
              selected={selectedTxType}
              onChange={(selected) => setForm((prev) => ({ ...prev, tx_type_hint: selected[0]?.value ?? "" }))}
              getItemKey={(item) => item.value}
              getItemLabel={(item) => item.label}
              buttonLabel={t("modal.noHint")}
              singleSelect
              hideCheckboxes
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={t("modal.sortOrder")}
              value={form.sort_order}
              onChange={(e) => setForm((prev) => ({ ...prev, sort_order: e.target.value }))}
            />

            <label className="flex items-center gap-3 rounded-md border border-gray-300 bg-white px-3 py-3 text-[13px] font-medium text-gray-700 md:self-end">
              <Checkbox
                checked={form.is_active}
                onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                size="small"
              />
              <span>{t("modal.active")}</span>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-gray-700">{t("modal.metadata")}</span>
            <Textarea
              value={form.metadata_text}
              onChange={(e) => setForm((prev) => ({ ...prev, metadata_text: e.target.value }))}
              className="min-h-[180px] font-mono"
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t("actions.saving") : form.id ? t("actions.saveChanges") : t("actions.createCategory")}
            </Button>
          </div>
        </SidePanelForm>
      </SidePanel>

      {snackbar ? (
        <Snackbar
          notificationKey={snackbar}
          open={!!snackbar}
          onClose={() => setSnackbar(null)}
          autoHideDuration={6000}
          message={snackbar?.message}
          severity={snackbar?.severity}
          anchor={{ vertical: "bottom", horizontal: "center" }}
          pauseOnHover
          showCloseButton
        />
      ) : null}
    </>
  );
};

export default CategorySettingsPage;
