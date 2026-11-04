import { accountingErrorMessage } from "../accountingError";
import { useAccountingSetup, useAccountingDraft } from "../setup/useAccountingSetup";
import SidePanel, { SidePanelForm } from "@/components/Modal/SidePanel";
import SettingsTable from "@/shared/ui/Settings/SettingsTable";
import CurrencySelect from "@/shared/ui/CurrencySelect";
import AccountingTerm from "@/pages/Accounting/components/AccountingTerm";
import React from "react";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { Select } from "src/shared/ui/Select";
import Snackbar from "@/shared/ui/Snackbar";
import { api } from "@/api";

import type {
  AccountingBook,
  AccountingBookBasis,
  AddAccountingBookRequest,
} from "@/models/settings/accounting";

type SnackbarState = {
  severity: "error" | "success";
  message: string;
} | null;

type BookFormState = {
  id?: string;
  code: string;
  name: string;
  basis: AccountingBookBasis;
  currency_code: string;
  is_primary: boolean;
  is_active: boolean;
  metadata: Record<string, unknown>;
};

function extractCollection<T>(input: unknown): T[] {
  if (Array.isArray(input)) return input as T[];
  if (!input || typeof input !== "object") return [];

  const obj = input as Record<string, unknown>;
  const directKeys = ["results", "items", "data", "books"];
  for (const key of directKeys) {
    const value = obj[key];
    if (Array.isArray(value)) return value as T[];
  }

  if (obj.data && obj.data !== input) {
    const nested = extractCollection<T>(obj.data);
    if (nested.length || Array.isArray(obj.data)) return nested;
  }

  return [];
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <article className="min-w-0 border-l border-gray-200 px-4 py-1 first:border-l-0 first:pl-0">
      <div className="text-[10px] uppercase tracking-wide text-gray-600">{label}</div>
      <div className="mt-1 text-[24px] font-semibold tracking-tight text-gray-900">{value}</div>
      <p className="mt-1 text-[12px] text-gray-600">{detail}</p>
    </article>
  );
}

const BASIS_OPTIONS: AccountingBookBasis[] = ["management", "cash", "accrual", "tax"];

const EMPTY_FORM: BookFormState = {
  code: "",
  name: "",
  basis: "management",
  currency_code: "EUR",
  is_primary: false,
  is_active: true,
  metadata: {},
};

const AccountingBooksPage: React.FC = () => {
  const { refresh: refreshSetup, canManage, status: setupStatus } = useAccountingSetup();
  const { i18n } = useTranslation("accountingSettings");
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const t = React.useCallback(
    (key: string, defaultValue: string, options?: Record<string, unknown>) =>
      String(i18n.t(key, {
          lng: language, ns: "accountingSettings", defaultValue, ...(options ?? {}) })),
    [i18n, language]
  );

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [items, setItems] = React.useState<AccountingBook[]>([]);
  const [snackbar, setSnackbar] = React.useState<SnackbarState>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = useAccountingDraft<BookFormState>("book-form", EMPTY_FORM);

  const selectedBasis = React.useMemo(
    () => BASIS_OPTIONS.filter((basis) => basis === form.basis),
    [form.basis]
  );

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getAccountingBooks();
      const nextItems = extractCollection<AccountingBook>(
        (response as { data?: unknown })?.data ?? response
      );
      setItems(nextItems);
    } catch {
      setItems([]);
      setSnackbar({ severity: "error", message: t("booksPage.loadError", "Failed to load accounting books.") });
    } finally {
      setLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, currency_code: setupStatus?.profile.currency || "", is_primary: !items.some(item => item.is_active && item.is_primary) });
    setModalOpen(true);
  };

  const openEdit = (item: AccountingBook) => {
    setForm({
      id: item.id,
      code: item.code ?? "",
      name: item.name ?? "",
      basis: item.basis ?? "management",
      currency_code: item.currency_code ?? "EUR",
      is_primary: !!item.is_primary,
      is_active: !!item.is_active,
      metadata: item.metadata ?? {},
    });
    setModalOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.code.trim() || !form.name.trim() || !form.currency_code.trim()) {
      setSnackbar({ severity: "error", message: t("booksPage.requiredError", "Code, name, and currency are required.") });
      return;
    }

    try {
      setSaving(true);

      const payload: AddAccountingBookRequest = {
        code: form.code.trim(),
        name: form.name.trim(),
        basis: form.basis,
        currency_code: form.currency_code.trim().toUpperCase(),
        is_primary: form.is_primary,
        is_active: form.is_active,
        metadata: form.metadata,
      };

      if (form.id) {
        await api.editAccountingBook(form.id, payload);
        setSnackbar({ severity: "success", message: t("booksPage.updatedSuccess", "Accounting book updated.") });
      } else {
        await api.addAccountingBook(payload);
        setSnackbar({ severity: "success", message: t("booksPage.createdSuccess", "Accounting book created.") });
      }

      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
      await refreshSetup();
    } catch (cause) {
      setSnackbar({ severity: "error", message: accountingErrorMessage(cause, t("booksPage.saveError", "Failed to save accounting book.")) });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton rows={6} />;

  return (
    <>
      <section className="space-y-4">
        <div className="accounting-page-header">

          <div className="flex flex-col gap-5 py-1">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                
                <p className="mt-1 text-[13px] leading-6 text-gray-600">
                  {t("booksPage.description", "Create and maintain accounting books used as posting scopes for journals, bank mappings, and category policies.")}
                </p>
              </div>

              <Button type="button" disabled={!canManage} onClick={openCreate}>
                {t("booksPage.newButton", "New book")}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-5 border-t border-gray-100 pt-5 sm:grid-cols-3 settings-metrics">
              <MetricCard
                label={t("booksPage.metrics.books", "Books")}
                value={items.length}
                detail={t("booksPage.metrics.booksDetail", "Total books currently configured.")}
              />
              <MetricCard
                label={t("booksPage.metrics.primary", "Primary")}
                value={items.filter((item) => item.is_primary).length}
                detail={t("booksPage.metrics.primaryDetail", "Books marked as the primary accounting base.")}
              />
              <MetricCard
                label={t("booksPage.metrics.active", "Active")}
                value={items.filter((item) => item.is_active).length}
                detail={t("booksPage.metrics.activeDetail", "Books available for operational posting flows.")}
              />
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white rounded-lg border border-gray-200 bg-white shadow-xs">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-slate-600">
            <div className="text-[10px] uppercase tracking-wide text-gray-600"> {t("booksPage.listTitle", "Book list")}</div>
          </div>

          <div className="overflow-x-auto settings-table-scroll">
            <SettingsTable className="min-w-full" onRowOpen={canManage ? index => void openEdit(items[index]) : undefined}>
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  {[t("booksPage.columns.code", "Code"), t("booksPage.columns.name", "Name"), t("booksPage.columns.basis", "Basis"), t("booksPage.columns.currency", "Currency"), t("booksPage.columns.primary", "Primary"), t("booksPage.columns.active", "Active"), t("booksPage.columns.actions", "Actions")].map((column) => (
                    <th
                      key={column}
                      className="px-4 py-3 text-[10px] uppercase tracking-wide text-gray-600"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-3 text-[13px] font-medium text-gray-900">{item.code || "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-900">{item.name || "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{t(`enums.basis.${item.basis}`, item.basis) || "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{item.currency_code || "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{item.is_primary ? t("common.yes", "Yes") : t("common.no", "No")}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{item.is_active ? t("common.yes", "Yes") : t("common.no", "No")}</td>
                    <td className="px-4 py-3 text-right">
                      <Button type="button" variant="outline" size="sm" disabled={!canManage} onClick={() => openEdit(item)}>
                        {t("common.edit", "Edit")}
                      </Button>
                    </td>
                  </tr>
                ))}

                {!items.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-gray-500">
                      {t("booksPage.empty", "No accounting books found.")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </SettingsTable>
          </div>
        </section>

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
      </section>

      <SidePanel
        className="accounting-dialog"
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? t("booksPage.modal.editTitle", "Edit accounting book") : t("booksPage.modal.newTitle", "New accounting book")}
        subtitle={t("booksPage.modal.subtitle", "Create or update the accounting basis and posting currency.")}
      >
        <SidePanelForm recordLabel={t("footer.book", "Book")} recordName={form.name} onSubmit={submit} className="space-y-5 pb-4 md:pb-6">
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white rounded-lg border border-gray-200 bg-white shadow-xs">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-slate-600">
              <div className="text-[10px] uppercase tracking-wide text-gray-600"> {t("booksPage.modal.identity", "Identity")}</div>
            </div>

            <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
              <Input
                kind="text"
                label={t("common.code", "Code")}
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
              />
              <Input
                kind="text"
                label={t("common.name", "Name")}
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white rounded-lg border border-gray-200 bg-white shadow-xs">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-slate-600">
              <div className="text-[10px] uppercase tracking-wide text-gray-600"> {t("booksPage.modal.configuration", "Configuration")}</div>
            </div>

            <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
              <Select<AccountingBookBasis>
                label={<AccountingTerm term="basis">{t("booksPage.modal.basis", "Basis")}</AccountingTerm>}
                items={BASIS_OPTIONS}
                selected={selectedBasis}
                onChange={(selected: AccountingBookBasis[]) =>
                  setForm((prev) => ({
                    ...prev,
                    basis: (selected[0] ?? "management") as AccountingBookBasis,
                  }))
                }
                getItemKey={(item: AccountingBookBasis) => item}
                getItemLabel={(item: AccountingBookBasis) =>
                  t(`enums.basis.${item}`, item)
                }
                buttonLabel={t("booksPage.modal.selectBasis", "Select basis")}
                singleSelect
                hideCheckboxes
              />

              <CurrencySelect value={form.currency_code || ""} onChange={currency_code => setForm(prev => ({ ...prev, currency_code }))} />
            </div>

            <div className="grid gap-3 px-4 pb-4 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-3 text-[13px] text-gray-700">
                <input type="checkbox" className="h-4 w-4 shrink-0 accent-gray-900" aria-label={t("booksPage.modal.primaryBook", "Primary book")}
                  checked={form.is_primary}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, is_primary: event.target.checked }))
                  }
                />
                <span className="font-medium text-gray-900"> <AccountingTerm term="primary">{t("booksPage.modal.primaryBook", "Primary book")}</AccountingTerm></span>
              </label>

              <label className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-3 text-[13px] text-gray-700">
                <input type="checkbox" className="h-4 w-4 shrink-0 accent-gray-900" aria-label={t("common.active", "Active")}
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, is_active: event.target.checked }))
                  }
                />
                <span className="font-medium text-gray-900"> {t("common.active", "Active")}</span>
              </label>
            </div>
          </section>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="cancel" onClick={() => setModalOpen(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t("common.saving", "Saving...") : form.id ? t("booksPage.modal.saveChanges", "Save changes") : t("booksPage.modal.createBook", "Create book")}
            </Button>
          </div>
        </SidePanelForm>
      </SidePanel>
    </>
  );
};

export default AccountingBooksPage;
