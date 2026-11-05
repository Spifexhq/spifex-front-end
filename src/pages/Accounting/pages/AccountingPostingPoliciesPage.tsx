import { useAccountingSource } from "@/api/hooks/useAccountingRecords";
import { useRecordFilters } from "@/shared/ui/DataTable/useRecordFilters";
import { useAuthContext } from "@/hooks/useAuth";
import AccountingStatus from "../components/AccountingStatus";
import { useAccountingSetup } from "../setup/useAccountingSetup";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import Checkbox from "@/shared/ui/Checkbox";
import SidePanel, { SidePanelForm } from "@/components/Modal/SidePanel";
import DataTable from "@/shared/ui/DataTable";
import AccountingTerm from "../components/AccountingTerm";
import React from "react";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { Select } from "src/shared/ui/Select";
import Snackbar from "@/shared/ui/Snackbar";

import { api } from "@/api";

import type { CategoryPostingPolicy, AccountingBook } from "@/models/settings/accounting";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import type { CashflowCategory } from "@/models/settings/categories";

type SnackbarState = {
  severity: "error" | "success";
  message: string;
} | null;

type PolicyFormState = {
  cashflow_category_id: string;
  book_id: string;
  settlement_debit_account_id: string;
  settlement_credit_account_id: string;
  accrual_debit_account_id: string;
  accrual_credit_account_id: string;
  clearing_account_id: string;
  status: CategoryPostingPolicy["status"];
  metadata: Record<string, unknown>;
};

type PolicyAccountField =
  | "settlement_debit_account_id"
  | "settlement_credit_account_id"
  | "accrual_debit_account_id"
  | "accrual_credit_account_id"
  | "clearing_account_id";

function extractCollection<T>(input: unknown): T[] {
  if (Array.isArray(input)) return input as T[];
  if (!input || typeof input !== "object") return [];

  const obj = input as Record<string, unknown>;
  for (const key of ["results", "items", "data", "policies", "categories"]) {
    const value = obj[key];
    if (Array.isArray(value)) return value as T[];
  }

  if (obj.data && obj.data !== input) {
    const nested = extractCollection<T>(obj.data);
    if (nested.length || Array.isArray(obj.data)) return nested;
  }

  return [];
}


const EMPTY_FORM: PolicyFormState = {
  cashflow_category_id: "",
  book_id: "",
  settlement_debit_account_id: "",
  settlement_credit_account_id: "",
  accrual_debit_account_id: "",
  accrual_credit_account_id: "",
  clearing_account_id: "",
  status: "active",
  metadata: {},
};

const displayValue = (label?: string | null, fallback?: string | null): string =>
  (label && label.trim()) || (fallback && fallback.trim()) || "—";

const categoryLabel = (category: CashflowCategory): string =>
  [category.code, category.name].filter(Boolean).join(" — ") || category.name || "—";

const accountLabel = (account: LedgerAccount): string =>
  [account.code, account.name].filter(Boolean).join(" — ");

const bookLabel = (book: AccountingBook): string =>
  [book.code, book.name].filter(Boolean).join(" — ");

const AccountingPostingPoliciesPage: React.FC = () => {
  const { canManage } = useAccountingSetup();
  const [editingScope, setEditingScope] = React.useState(false);
  const { i18n } = useTranslation("accountingSettings");
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const t = React.useCallback(
    (key: string, defaultValue: string, options?: Record<string, unknown>) =>
      String(i18n.t(key, {
          lng: language, ns: "accountingSettings", defaultValue, ...(options ?? {}) })),
    [i18n, language]
  );

  const accountFields = React.useMemo<Array<{ field: PolicyAccountField; label: string }>>(
    () => [
      { field: "settlement_debit_account_id", label: t("redesign.paymentAccount", "Payments · debit") },
      { field: "settlement_credit_account_id", label: t("redesign.receiptAccount", "Receipts · credit") },
      { field: "accrual_debit_account_id", label: t("postingPoliciesPage.accountFields.accrualDebit", "Accrual debit") },
      { field: "accrual_credit_account_id", label: t("postingPoliciesPage.accountFields.accrualCredit", "Accrual credit") },
      { field: "clearing_account_id", label: t("postingPoliciesPage.accountFields.clearing", "Clearing") },
    ],
    [t]
  );

  const [saving, setSaving] = React.useState(false);
  const { isOwner, isSuperUser, permissions } = useAuthContext();
  const canDelete = isOwner || isSuperUser || permissions.includes("delete_ledger_account");
  const [items, setItems] = React.useState<CategoryPostingPolicy[]>([]);
  const [snackbar, setSnackbar] = React.useState<SnackbarState>(null);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState<PolicyFormState>(EMPTY_FORM);

  const [books, setBooks] = React.useState<AccountingBook[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = React.useState<LedgerAccount[]>([]);
  const [categories, setCategories] = React.useState<CashflowCategory[]>([]);
  const [lookupsLoading, setLookupsLoading] = React.useState(false);

  const selectedCategory = React.useMemo(
    () => categories.filter((category) => category.id === form.cashflow_category_id),
    [categories, form.cashflow_category_id]
  );

  const selectedBook = React.useMemo(
    () => books.filter((book) => book.id === form.book_id),
    [books, form.book_id]
  );

  const sortedCategories = React.useMemo(() => {
    return [...categories].sort((a, b) => {
      const orderA = Number(a.sort_order ?? 0);
      const orderB = Number(b.sort_order ?? 0);
      if (orderA !== orderB) return orderA - orderB;

      const codeA = (a.code || "").toLowerCase();
      const codeB = (b.code || "").toLowerCase();
      if (codeA !== codeB) return codeA.localeCompare(codeB);

      return (a.name || "").localeCompare(b.name || "");
    });
  }, [categories]);

  const source = useAccountingSource<CategoryPostingPolicy>("category-rules");
  const recordFilters = useRecordFilters(items, [
 {key:"status",label:t("table.status","Status"),value:item=>item.status,format:value=>t(value==="active"?"table.active":"table.inactive",value)},
 {key:"book",label:t("postingPoliciesPage.columns.book","Book"),value:item=>item.book_id,format:value=>books.find(book=>book.id===value)?.name||"—"},
 {key:"category",label:t("postingPoliciesPage.columns.category","Category"),value:item=>item.cashflow_category_id,format:value=>categories.find(category=>category.id===value)?.name||"—"}
], item=>[item.cashflow_category_label,item.book_label,item.settlement_debit_account_label,item.settlement_credit_account_label].join(" "), { ...source, placeholder: t("filters.search.category-rules", "Search records"), onItems: setItems });
  const loading = recordFilters.pager.loading;
  const load = recordFilters.pager.refresh;

  const loadLookups = React.useCallback(async () => {
    try {
      setLookupsLoading(true);

      const [booksResponse, ledgerAccountsResponse, categoriesResponse] = await Promise.all([
        api.getAccountingBooks(),
        api.getLedgerAccounts({
          active: "true",
          account_type: "posting",
        }),
        api.getCashflowCategories(),
      ]);

      const nextBooks = extractCollection<AccountingBook>(
        (booksResponse as { data?: unknown })?.data ?? booksResponse
      );

      const nextLedgerAccounts = extractCollection<LedgerAccount>(
        (ledgerAccountsResponse as { data?: unknown })?.data ?? ledgerAccountsResponse
      );

      const nextCategories = extractCollection<CashflowCategory>(
        (categoriesResponse as { data?: unknown })?.data ?? categoriesResponse
      );

      setBooks(nextBooks);
      setLedgerAccounts(nextLedgerAccounts);
      setCategories(nextCategories);
    } catch (notificationCause) {
      setSnackbar({ severity: "error", message: apiErrorMessage(notificationCause, t("postingPoliciesPage.lookupError", "Failed to load posting policy form lookups.")) });
    } finally {
      setLookupsLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void loadLookups();
  }, [load, loadLookups]);

  const openCreate = async () => {
    setEditingScope(false);
    setForm(EMPTY_FORM);
    setModalOpen(true);
    if (!books.length || !ledgerAccounts.length || !categories.length) {
      await loadLookups();
    }
  };

  const openEdit = async (item: CategoryPostingPolicy) => {
    setEditingScope(true);
    setForm({
      cashflow_category_id: item.cashflow_category_id ?? "",
      book_id: item.book_id ?? "",
      settlement_debit_account_id: item.settlement_debit_account_id ?? "",
      settlement_credit_account_id: item.settlement_credit_account_id ?? "",
      accrual_debit_account_id: item.accrual_debit_account_id ?? "",
      accrual_credit_account_id: item.accrual_credit_account_id ?? "",
      clearing_account_id: item.clearing_account_id ?? "",
      status: item.status,
      metadata: item.metadata ?? {},
    });
    setModalOpen(true);
    if (!books.length || !ledgerAccounts.length || !categories.length) {
      await loadLookups();
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.cashflow_category_id.trim() || !form.book_id) {
      setSnackbar({ severity: "error", message: t("postingPoliciesPage.requiredError", "Category and book are required.") });
      return;
    }

    try {
      setSaving(true);

      await api.upsertCategoryPostingPolicy({
        cashflow_category_id: form.cashflow_category_id.trim(),
        book_id: form.book_id,
        settlement_debit_account_id: form.settlement_debit_account_id || null,
        settlement_credit_account_id: form.settlement_credit_account_id || null,
        accrual_debit_account_id: form.accrual_debit_account_id || null,
        accrual_credit_account_id: form.accrual_credit_account_id || null,
        clearing_account_id: form.clearing_account_id || null,
        status: form.status,
        metadata: form.metadata,
      } satisfies Parameters<typeof api.upsertCategoryPostingPolicy>[0]);

      setSnackbar({ severity: "success", message: t("postingPoliciesPage.savedSuccess", "Posting policy saved.") });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (cause) {
      setSnackbar({ severity: "error", message: apiErrorMessage(cause, t("postingPoliciesPage.saveError", "Failed to save posting policy.")) });
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
                  {t("postingPoliciesPage.description", "Define how each operational cashflow category translates into settlement, accrual, and clearing accounts inside each accounting book.")}
                </p>
              </div>

              <Button type="button" disabled={!canManage} onClick={() => void openCreate()}>
                {t("postingPoliciesPage.actions.newPolicy", "New policy")}
              </Button>
            </div>


          </div>
        </div>

        {recordFilters.pager.error && <p role="alert" className="text-sm text-red-700">{recordFilters.pager.error}</p>}{recordFilters.filters}
        <DataTable pager={recordFilters.pager} onDelete={canDelete ? async item => { await api.deleteCategoryPostingPolicy(item.id); setItems(previous => previous.filter(row => row.id !== item.id)); await load(); } : undefined} items={recordFilters.rows} editLabel={t("common.edit", "Edit")} emptyLabel={t("postingPoliciesPage.empty", "No records found.")} onEdit={canManage ? item => { void openEdit(item); } : undefined} columns={[
              { key: "name", label: t("postingPoliciesPage.columns.category", "Category"), render: item => displayValue(item.cashflow_category_label, item.cashflow_category_id) },
              { key: "book", label: t("postingPoliciesPage.columns.book", "Book"), render: item => displayValue(item.book_label, item.book_id) },
              { key: "debit", label: t("redesign.paymentAccount", "Payments · debit"), render: item => displayValue(item.settlement_debit_account_label, item.settlement_debit_account_id) },
              { key: "credit", label: t("redesign.receiptAccount", "Receipts · credit"), render: item => displayValue(item.settlement_credit_account_label, item.settlement_credit_account_id) }
              ,{ key: "status", label: t("table.status", "Status"), render: item => <AccountingStatus active={item.status === "active"} label={t(item.status === "active" ? "table.active" : "table.inactive", item.status)} /> }
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
        title={t("postingPoliciesPage.modal.title", "Posting policy")}
        subtitle={t("postingPoliciesPage.modal.subtitle", "Define how one operational category maps into settlement, accrual, and clearing accounts.")}
      >
        {lookupsLoading ? (
          <div className="settings-modal-scroll"><PageSkeleton rows={5} /></div>
        ) : (
          <SidePanelForm recordLabel={t("footer.postingPolicy", "Posting policy")} recordName={categories.find(category => category.id === form.cashflow_category_id)?.name} onSubmit={submit} className="space-y-5 pb-4 md:pb-6">
            {editingScope && <p className="text-xs leading-6 text-gray-500">{t("setupFlow.scopeLocked", "The bank or category and book identify this configuration. Create a new configuration to use a different scope.")}</p>}
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-slate-600">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("postingPoliciesPage.modal.scopeSection", "Scope")}</div>
              </div>

              <div className="grid gap-4 px-4 py-4">
                <Select<CashflowCategory>
                  disabled={editingScope}
                  label={t("postingPoliciesPage.modal.cashflowCategory", "Cashflow category")}
                  items={sortedCategories}
                  selected={selectedCategory}
                  onChange={(selected: CashflowCategory[]) =>
                    setForm((prev) => ({
                      ...prev,
                      cashflow_category_id: selected[0]?.id ?? "",
                    }))
                  }
                  getItemKey={(category: CashflowCategory) => category.id}
                  getItemLabel={categoryLabel}
                  buttonLabel={t("postingPoliciesPage.modal.selectCategory", "Select category")}
                  singleSelect
                  hideCheckboxes
                />

                <Select<AccountingBook>
                  disabled={editingScope}
                  label={t("common.book", "Book")}
                  items={books}
                  selected={selectedBook}
                  onChange={(selected: AccountingBook[]) =>
                    setForm((prev) => ({
                      ...prev,
                      book_id: selected[0]?.id ?? "",
                    }))
                  }
                  getItemKey={(book: AccountingBook) => book.id}
                  getItemLabel={bookLabel}
                  buttonLabel={t("postingPoliciesPage.modal.selectBook", "Select book")}
                  singleSelect
                  hideCheckboxes
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-slate-600">
                <div className="text-[10px] uppercase tracking-wide text-gray-600"> {t("postingPoliciesPage.modal.accountMapping", "Account mapping")}</div>
              </div>

              <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
                {accountFields.slice(0, 2).map(({ field, label }) => {
                  const selectedAccount = ledgerAccounts.filter((account) => account.id === form[field]);

                  return (
                    <Select<LedgerAccount>
                      key={field}
                      label={<AccountingTerm term={field.startsWith("accrual") ? "accrual" : field === "clearing_account_id" ? "clearing" : field === "settlement_debit_account_id" ? "debit" : "credit"}>{label}</AccountingTerm>}
                      items={ledgerAccounts}
                      selected={selectedAccount}
                      onChange={(selected: LedgerAccount[]) =>
                        setForm((prev) => ({
                          ...prev,
                          [field]: selected[0]?.id ?? "",
                        }))
                      }
                      getItemKey={(account: LedgerAccount) => account.id}
                      getItemLabel={accountLabel}
                      buttonLabel={t("postingPoliciesPage.modal.selectAccount", "Select account")}
                      singleSelect
                      hideCheckboxes
                    />
                  );
                })}
              </div>
              <p className="border-t border-gray-100 px-4 py-3 text-xs leading-5 text-gray-500">{t("redesign.policyHelp", "The bank connection supplies the bank side. These accounts supply the other side of each payment or receipt. Both are currently required.")}</p>
            </section>
            <details className="rounded-lg border border-gray-200 bg-white rounded-lg border border-gray-200 bg-white">
              <summary className="flex items-center px-4 py-4 text-sm font-medium">{t("redesign.advancedAccounts", "Advanced account mapping")}</summary>
              <p className="px-4 text-xs leading-5 text-gray-500">{t("redesign.advancedAccountsHelp", "Accrual and clearing settings are stored separately and are not used by automatic settlement posting.")}</p>
              <div className="grid gap-4 p-4 md:grid-cols-2">
                {accountFields.slice(2).map(({ field, label }) => {
                  const selectedAccount = ledgerAccounts.filter((account) => account.id === form[field]);

                  return (
                    <Select<LedgerAccount>
                      key={field}
                      label={<AccountingTerm term={field.startsWith("accrual") ? "accrual" : field === "clearing_account_id" ? "clearing" : field === "settlement_debit_account_id" ? "debit" : "credit"}>{label}</AccountingTerm>}
                      items={ledgerAccounts}
                      selected={selectedAccount}
                      onChange={(selected: LedgerAccount[]) =>
                        setForm((prev) => ({
                          ...prev,
                          [field]: selected[0]?.id ?? "",
                        }))
                      }
                      getItemKey={(account: LedgerAccount) => account.id}
                      getItemLabel={accountLabel}
                      buttonLabel={t("postingPoliciesPage.modal.selectAccount", "Select account")}
                      singleSelect
                      hideCheckboxes
                    />
                  );
                })}
              </div>
            </details>

            <label className="flex items-center gap-2 text-xs"><Checkbox checked={form.status === "active"} onChange={event => setForm(previous => ({ ...previous, status: event.target.checked ? "active" : "inactive" }))} />{t("common.active", "Active")}</label>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="cancel" onClick={() => setModalOpen(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={saving || !canManage}>
                {saving ? t("common.saving", "Saving...") : t("postingPoliciesPage.modal.savePolicy", "Save policy")}
              </Button>
            </div>
          </SidePanelForm>
        )}
      </SidePanel>
    </>
  );
};

export default AccountingPostingPoliciesPage;
