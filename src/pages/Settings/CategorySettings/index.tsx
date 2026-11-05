import { apiErrorMessage } from "@/lib/apiErrorMessage";
import SidePanel, { SidePanelForm } from "@/components/Modal/SidePanel";
import DataTable from "@/shared/ui/DataTable";
import AccountingStatus from "@/pages/Accounting/components/AccountingStatus";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import Checkbox from "@/shared/ui/Checkbox";
import Input from "@/shared/ui/Input";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import Snackbar from "@/shared/ui/Snackbar";
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

  const [draftSearch, setDraftSearch] = React.useState("");
  const [draftIncludeInactive, setDraftIncludeInactive] = React.useState(true);
  const [draftTxFilter, setDraftTxFilter] = React.useState<"credit" | "debit" | "">("");

  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [appliedIncludeInactive, setAppliedIncludeInactive] = React.useState(true);
  const [appliedTxFilter, setAppliedTxFilter] = React.useState<"credit" | "debit" | "">("");

  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState<CategoryFormState>(EMPTY_FORM);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getCashflowCategories({
        include_inactive: appliedIncludeInactive,
        ...(appliedSearch.trim() ? { search: appliedSearch.trim() } : {}),
        ...(appliedTxFilter ? { tx_type_hint: appliedTxFilter } : {}),
      });
      const nextItems = extractCollection<CashflowCategory>((response as { data?: unknown })?.data ?? response);
      setItems(nextItems);
    } catch (notificationCause) {
      setItems([]);
      setSnackbar({ severity: "error", message: apiErrorMessage(notificationCause, t("feedback.loadError")) });
    } finally {
      setLoading(false);
    }
  }, [appliedIncludeInactive, appliedSearch, appliedTxFilter, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = React.useCallback(() => {
    setAppliedSearch(draftSearch);
    setAppliedIncludeInactive(draftIncludeInactive);
    setAppliedTxFilter(draftTxFilter);
  }, [draftIncludeInactive, draftSearch, draftTxFilter]);

  const clearFilters = React.useCallback(() => {
    setDraftSearch("");
    setDraftIncludeInactive(true);
    setDraftTxFilter("");

    setAppliedSearch("");
    setAppliedIncludeInactive(true);
    setAppliedTxFilter("");
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
      await load();
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
      await load();
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

  if (loading) return <PageSkeleton rows={6} />;

  return (
    <>
      <main className="settings-page">
        <div className="settings-content space-y-6">
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <form className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_180px_auto_auto] xl:items-end" onSubmit={event => { event.preventDefault(); applyFilters(); }}>
                <Input
                  kind="text"
                  label={t("filters.search")}
                  placeholder={t("filters.searchPlaceholder")}
                  value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                />

                <Select<Option<"credit" | "debit">>
                  label={t("filters.transactionHint")}
                  items={TX_TYPE_OPTIONS}
                  selected={selectedDraftTxFilter}
                  onChange={(selected) => setDraftTxFilter(selected[0]?.value ?? "")}
                  getItemKey={(item) => item.value}
                  getItemLabel={(item) => item.label}
                  buttonLabel={t("filters.any")}
                  singleSelect
                  hideCheckboxes
                />

                <label className="flex min-h-8 items-center gap-2 text-xs text-gray-600">
                  <Checkbox
                    checked={draftIncludeInactive}
                    onChange={(e) => setDraftIncludeInactive(e.target.checked)}
                    size="small"
                  />
                  <span>{t("filters.includeInactive")}</span>
                </label>

                <div className="flex items-center gap-2 lg:justify-end">
                  <Button type="button" variant="outline" onClick={clearFilters}>
                    {t("actions.clear")}
                  </Button>
                  <Button type="submit" variant="outline">
                    {t("actions.apply")}
                  </Button>
                </div>
              </form>
              <Button type="button" onClick={openCreate} disabled={saving || !!deletingId}>{t("actions.new")}</Button>
            </div>

            <div className="[&_table]:min-w-0! md:[&_table]:min-w-[740px]!">
            <DataTable
              key={JSON.stringify([appliedSearch, appliedIncludeInactive, appliedTxFilter])}

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
            <span className="mb-2 block text-[12px] font-semibold text-gray-700">{t("modal.metadata")}</span>
            <textarea
              value={form.metadata_text}
              onChange={(e) => setForm((prev) => ({ ...prev, metadata_text: e.target.value }))}
              className="min-h-[180px] w-full rounded-md border border-gray-300 bg-white px-3 py-3 font-mono text-[13px] text-gray-900 outline-none transition-colors focus:border-gray-400"
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
