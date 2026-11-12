import { useAccountingSource } from "@/products/business/hooks/useAccountingRecords";
import { useRecordFilters } from "@/shared/ui/DataTable/useRecordFilters";
import { useAuthContext } from "@/hooks/useAuth";
import AccountingStatus from "../components/AccountingStatus";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useAccountingSetup, useAccountingDraft } from "../setup/useAccountingSetup";
import SidePanel, { SidePanelForm } from "@/components/Modal/SidePanel";
import DataTable from "@/shared/ui/DataTable";
import CurrencySelect from "@/shared/ui/CurrencySelect";
import AccountingTerm from "@/products/business/pages/Accounting/components/AccountingTerm";
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

  const [saving, setSaving] = React.useState(false);
  const { isOwner, isSuperUser, permissions } = useAuthContext();
  const canDelete = isOwner || isSuperUser || permissions.includes("delete_ledger_account");
  const [items, setItems] = React.useState<AccountingBook[]>([]);
  const [snackbar, setSnackbar] = React.useState<SnackbarState>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = useAccountingDraft<BookFormState>("book-form", EMPTY_FORM);

  const selectedBasis = React.useMemo(
    () => BASIS_OPTIONS.filter((basis) => basis === form.basis),
    [form.basis]
  );

  const source = useAccountingSource<AccountingBook>("books");
  const recordFilters = useRecordFilters(items, [
 {key:"status",label:t("table.status","Status"),value:item=>String(item.is_active),format:value=>t(value==="true"?"table.active":"table.inactive",value==="true"?"Active":"Inactive")},
 {key:"basis",label:t("booksPage.columns.basis","Basis"),value:item=>item.basis,format:value=>t(`enums.basis.${value}`,value)},
 {key:"currency",label:t("booksPage.columns.currency","Currency"),value:item=>item.currency_code},
 {key:"primary",label:t("booksPage.columns.primary","Primary"),value:item=>String(item.is_primary),format:value=>t(value==="true"?"common.yes":"common.no",value==="true"?"Yes":"No")}
], item=>[item.name,item.code,item.basis,item.currency_code].join(" "), { ...source, placeholder: t("filters.search.books", "Search records"), onItems: setItems });
  const loading = recordFilters.pager.loading;
  const load = recordFilters.pager.refresh;


  const openCreate = () => {
    setForm({ ...EMPTY_FORM, currency_code: setupStatus?.profile.currency || "", is_primary: !setupStatus?.primary_book_id });
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
      setSnackbar({ severity: "error", message: apiErrorMessage(cause, t("booksPage.saveError", "Failed to save accounting book.")) });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !items.length) return <PageSkeleton rows={6} />;

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


          </div>
        </div>

        {recordFilters.pager.error && <p role="alert" className="text-sm text-red-700">{recordFilters.pager.error}</p>}{recordFilters.filters}
        <DataTable pager={recordFilters.pager} onDelete={canDelete ? async item => { await api.deleteAccountingBook(item.id); setItems(previous => previous.filter(row => row.id !== item.id)); await load(); } : undefined} items={recordFilters.rows} editLabel={t("common.edit", "Edit")} emptyLabel={t("booksPage.empty", "No records found.")} onEdit={canManage ? item => { void openEdit(item); } : undefined} columns={[
              { key: "name", label: t("booksPage.columns.name", "Name"), render: item => item.name || "—" },
              { key: "code", label: t("booksPage.columns.code", "Code"), render: item => item.code || "—" },
              { key: "basis", label: t("booksPage.columns.basis", "Basis"), render: item => t(`enums.basis.${item.basis}`, item.basis) },
              { key: "currency", label: t("booksPage.columns.currency", "Currency"), render: item => item.currency_code || "—" },
              { key: "primary", label: t("booksPage.columns.primary", "Primary"), render: item => t(item.is_primary ? "common.yes" : "common.no", item.is_primary ? "Yes" : "No") },
              { key: "active", label: t("table.status", "Status"), render: item => <AccountingStatus active={item.is_active} label={t(item.is_active ? "table.active" : "table.inactive", item.is_active ? "Active" : "Inactive")} /> }
            ]} />

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
      </section>

      <SidePanel

        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? t("booksPage.modal.editTitle", "Edit accounting book") : t("booksPage.modal.newTitle", "New accounting book")}
        subtitle={t("booksPage.modal.subtitle", "Create or update the accounting basis and posting currency.")}
      >
        <SidePanelForm recordLabel={t("footer.book", "Book")} recordName={form.name} onSubmit={submit} className="space-y-5 pb-4 md:pb-6">
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-slate-600">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500"> {t("booksPage.modal.identity", "Identity")}</div>
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

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-slate-600">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500"> {t("booksPage.modal.configuration", "Configuration")}</div>
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
