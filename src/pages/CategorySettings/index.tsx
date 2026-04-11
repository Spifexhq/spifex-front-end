import React from "react";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import Checkbox from "@/shared/ui/Checkbox";
import Input from "@/shared/ui/Input";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import Snackbar from "@/shared/ui/Snackbar";
import { Select } from "src/shared/ui/Select";

import AccountingSideModal from "@/pages/AccountingSettings/components/AccountingSideModal";
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

  const booleanLabel = React.useCallback(
    (value: boolean) => (value ? t("common.yes") : t("common.no")),
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
    } catch {
      setItems([]);
      setSnackbar({ severity: "error", message: t("feedback.loadError") });
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

  const stats = React.useMemo(() => {
    return {
      total: items.length,
      active: items.filter((item) => item.is_active).length,
      credit: items.filter((item) => item.tx_type_hint === "credit").length,
      debit: items.filter((item) => item.tx_type_hint === "debit").length,
    };
  }, [items]);

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
    } catch {
      setSnackbar({ severity: "error", message: t("feedback.invalidJson") });
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
    const confirmed = window.confirm(t("feedback.deleteConfirm", { name: item.code || item.name }));
    if (!confirmed) return;

    try {
      setDeletingId(item.id);
      await api.deleteCashflowCategory(item.id);
      setSnackbar({ severity: "success", message: t("feedback.deleted") });
      await load();
    } catch (error) {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        t("feedback.deleteError");
      setSnackbar({ severity: "error", message });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <PageSkeleton rows={6} />;

  return (
    <>
      <main className="min-h-full bg-transparent px-4 py-6 text-gray-900 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.eyebrow")}</div>
                  <h1 className="mt-1 text-[16px] font-semibold text-gray-900">{t("header.title")}</h1>
                  <p className="mt-2 max-w-3xl text-[13px] text-gray-600">{t("header.description")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button type="button" onClick={openCreate}>
                    {t("actions.new")}
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-[10px] uppercase tracking-wide text-gray-600">{t("stats.total")}</div>
              <div className="px-4 py-4">
                <div className="text-[24px] font-semibold text-gray-900">{stats.total}</div>
                <p className="mt-1 text-[12px] text-gray-600">{t("stats.totalHelp")}</p>
              </div>
            </article>
            <article className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-[10px] uppercase tracking-wide text-gray-600">{t("stats.active")}</div>
              <div className="px-4 py-4">
                <div className="text-[24px] font-semibold text-gray-900">{stats.active}</div>
                <p className="mt-1 text-[12px] text-gray-600">{t("stats.activeHelp")}</p>
              </div>
            </article>
            <article className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-[10px] uppercase tracking-wide text-gray-600">{t("stats.credit")}</div>
              <div className="px-4 py-4">
                <div className="text-[24px] font-semibold text-gray-900">{stats.credit}</div>
                <p className="mt-1 text-[12px] text-gray-600">{t("stats.creditHelp")}</p>
              </div>
            </article>
            <article className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-[10px] uppercase tracking-wide text-gray-600">{t("stats.debit")}</div>
              <div className="px-4 py-4">
                <div className="text-[24px] font-semibold text-gray-900">{stats.debit}</div>
                <p className="mt-1 text-[12px] text-gray-600">{t("stats.debitHelp")}</p>
              </div>
            </article>
          </section>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px_auto_auto] lg:items-end">
                <Input
                  kind="text"
                  label={t("filters.search")}
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

                <label className="flex items-center gap-3 rounded-md border border-gray-300 bg-white px-3 py-3 text-[13px] font-medium text-gray-700">
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
                  <Button type="button" onClick={applyFilters}>
                    {t("actions.apply")}
                  </Button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-[10px] uppercase tracking-wide text-gray-600">
                    <th className="px-4 py-3">{t("table.code")}</th>
                    <th className="px-4 py-3">{t("table.name")}</th>
                    <th className="px-4 py-3">{t("table.parent")}</th>
                    <th className="px-4 py-3">{t("table.txHint")}</th>
                    <th className="px-4 py-3">{t("table.entries")}</th>
                    <th className="px-4 py-3">{t("table.sort")}</th>
                    <th className="px-4 py-3">{t("table.active")}</th>
                    <th className="px-4 py-3 text-right">{t("table.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-4 py-3 text-[13px] font-medium text-gray-900">{item.code || t("common.empty")}</td>
                      <td className="px-4 py-3 text-[13px] text-gray-900">
                        <div className="min-w-[220px]">
                          <div className="font-medium">{item.name}</div>
                          {item.description ? <div className="mt-1 text-[12px] text-gray-500">{item.description}</div> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-gray-700">{item.parent_label || t("common.empty")}</td>
                      <td className="px-4 py-3 text-[13px] text-gray-700">{txHintLabel(item.tx_type_hint)}</td>
                      <td className="px-4 py-3 text-[13px] text-gray-700">{item.entry_count ?? 0}</td>
                      <td className="px-4 py-3 text-[13px] text-gray-700">{item.sort_order ?? 0}</td>
                      <td className="px-4 py-3 text-[13px] text-gray-700">{booleanLabel(!!item.is_active)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(item)}>
                            {t("actions.edit")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={deletingId === item.id}
                            onClick={() => void removeCategory(item)}
                          >
                            {deletingId === item.id ? t("actions.deleting") : t("actions.delete")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!items.length ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-gray-500">
                        {t("table.empty")}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      <AccountingSideModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? t("modal.editTitle") : t("modal.createTitle")}
        subtitle={t("modal.subtitle")}
        contentClassName="pb-4 md:pb-6"
      >
        <form onSubmit={submit} className="space-y-4">
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
        </form>
      </AccountingSideModal>

      {snackbar ? (
        <Snackbar
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
