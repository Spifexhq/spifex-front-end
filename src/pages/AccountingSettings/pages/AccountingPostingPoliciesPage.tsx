import React from "react";

import Button from "@/shared/ui/Button";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";
import Snackbar from "@/shared/ui/Snackbar";
import AccountingSideModal from "../components/AccountingSideModal";
import { api } from "@/api";
import { fetchAllCursor } from "@/lib/list";

import type { CategoryPostingPolicy, AccountingBook } from "@/models/settings/accounting";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import type { CashflowCategoryOption } from "@/models/entries/entries";

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
};

const ACCOUNT_FIELDS: Array<{ field: PolicyAccountField; label: string }> = [
  { field: "settlement_debit_account_id", label: "Settlement debit" },
  { field: "settlement_credit_account_id", label: "Settlement credit" },
  { field: "accrual_debit_account_id", label: "Accrual debit" },
  { field: "accrual_credit_account_id", label: "Accrual credit" },
  { field: "clearing_account_id", label: "Clearing" },
];

const displayValue = (label?: string | null, fallback?: string | null): string =>
  (label && label.trim()) || (fallback && fallback.trim()) || "—";

const pairValue = (
  leftLabel?: string | null,
  leftFallback?: string | null,
  rightLabel?: string | null,
  rightFallback?: string | null
): string => {
  const left = (leftLabel && leftLabel.trim()) || (leftFallback && leftFallback.trim()) || "";
  const right = (rightLabel && rightLabel.trim()) || (rightFallback && rightFallback.trim()) || "";
  if (left && right) return `${left} / ${right}`;
  if (left) return left;
  if (right) return right;
  return "—";
};

const categoryLabel = (category: CashflowCategoryOption): string =>
  [category.code, category.name].filter(Boolean).join(" — ") || category.name || "—";

const accountLabel = (account: LedgerAccount): string =>
  [account.code, account.name].filter(Boolean).join(" — ");

const bookLabel = (book: AccountingBook): string =>
  [book.code, book.name].filter(Boolean).join(" — ");

const AccountingPostingPoliciesPage: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [items, setItems] = React.useState<CategoryPostingPolicy[]>([]);
  const [snackbar, setSnackbar] = React.useState<SnackbarState>(null);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState<PolicyFormState>(EMPTY_FORM);

  const [books, setBooks] = React.useState<AccountingBook[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = React.useState<LedgerAccount[]>([]);
  const [categories, setCategories] = React.useState<CashflowCategoryOption[]>([]);
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

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getCategoryPostingPolicies();
      const nextItems = extractCollection<CategoryPostingPolicy>(
        (response as { data?: unknown })?.data ?? response
      );
      setItems(nextItems);
    } catch {
      setItems([]);
      setSnackbar({ severity: "error", message: "Failed to load posting policies." });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLookups = React.useCallback(async () => {
    try {
      setLookupsLoading(true);

      const [booksResponse, allAccounts, categoriesResponse] = await Promise.all([
        api.getAccountingBooks(),
        fetchAllCursor<LedgerAccount>((p?: { cursor?: string }) =>
          api.getLedgerAccounts({
            cursor: p?.cursor,
            active: "true",
            account_type: "posting",
          })
        ),
        api.getCashflowCategories?.()
      ]);

      setBooks(
        extractCollection<AccountingBook>((booksResponse as { data?: unknown })?.data ?? booksResponse)
      );
      setLedgerAccounts(allAccounts);
      setCategories(
        extractCollection<CashflowCategoryOption>(
          (categoriesResponse as { data?: unknown })?.data ?? categoriesResponse
        )
      );
    } catch {
      setSnackbar({ severity: "error", message: "Failed to load posting policy form lookups." });
    } finally {
      setLookupsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const openCreate = async () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
    if (!books.length || !ledgerAccounts.length || !categories.length) {
      await loadLookups();
    }
  };

  const openEdit = async (item: CategoryPostingPolicy) => {
    setForm({
      cashflow_category_id: item.cashflow_category_id ?? "",
      book_id: item.book_id ?? "",
      settlement_debit_account_id: item.settlement_debit_account_id ?? "",
      settlement_credit_account_id: item.settlement_credit_account_id ?? "",
      accrual_debit_account_id: item.accrual_debit_account_id ?? "",
      accrual_credit_account_id: item.accrual_credit_account_id ?? "",
      clearing_account_id: item.clearing_account_id ?? "",
    });
    setModalOpen(true);
    if (!books.length || !ledgerAccounts.length || !categories.length) {
      await loadLookups();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.cashflow_category_id.trim() || !form.book_id) {
      setSnackbar({ severity: "error", message: "Category and book are required." });
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
        status: "active",
        metadata: {},
      } satisfies Parameters<typeof api.upsertCategoryPostingPolicy>[0]);

      setSnackbar({ severity: "success", message: "Posting policy saved." });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch {
      setSnackbar({ severity: "error", message: "Failed to save posting policy." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton rows={6} />;

  return (
    <>
      <section className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Category posting policies</h2>
            <p className="mt-1 text-sm text-gray-600">
              Bridge operational categories to settlement, accrual, and clearing accounting accounts.
            </p>
          </div>
          <Button type="button" onClick={() => void openCreate()}>
            New policy
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <article className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Policies</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">{items.length}</div>
          </article>
          <article className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Settlement-ready</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">
              {items.filter((item) => item.settlement_debit_account_id && item.settlement_credit_account_id).length}
            </div>
          </article>
          <article className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Accrual-ready</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">
              {items.filter((item) => item.accrual_debit_account_id && item.accrual_credit_account_id).length}
            </div>
          </article>
          <article className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">With clearing</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">
              {items.filter((item) => item.clearing_account_id).length}
            </div>
          </article>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-200">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Settlement</th>
                <th className="px-4 py-3">Accrual</th>
                <th className="px-4 py-3">Clearing</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {displayValue(item.cashflow_category_label, item.cashflow_category_id)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {displayValue(item.book_label, item.book_id)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {pairValue(
                      item.settlement_debit_account_label,
                      item.settlement_debit_account_id,
                      item.settlement_credit_account_label,
                      item.settlement_credit_account_id
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {pairValue(
                      item.accrual_debit_account_label,
                      item.accrual_debit_account_id,
                      item.accrual_credit_account_label,
                      item.accrual_credit_account_id
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {displayValue(item.clearing_account_label, item.clearing_account_id)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.status}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="outline" size="sm" onClick={() => void openEdit(item)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}

              {!items.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                    No posting policies found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

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

      <AccountingSideModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Posting policy"
        subtitle="Define how one operational category maps into settlement, accrual, and clearing accounts."
      >
        {lookupsLoading ? (
          <PageSkeleton rows={5} />
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <SelectDropdown<CashflowCategoryOption>
              label="Cashflow category"
              items={sortedCategories}
              selected={selectedCategory}
              onChange={(selected: CashflowCategoryOption[]) =>
                setForm((p) => ({
                  ...p,
                  cashflow_category_id: selected[0]?.id ?? "",
                }))
              }
              getItemKey={(category: CashflowCategoryOption) => category.id}
              getItemLabel={categoryLabel}
              buttonLabel="Select category"
              singleSelect
              hideCheckboxes
            />

            <SelectDropdown<AccountingBook>
              label="Book"
              items={books}
              selected={selectedBook}
              onChange={(selected: AccountingBook[]) =>
                setForm((p) => ({
                  ...p,
                  book_id: selected[0]?.id ?? "",
                }))
              }
              getItemKey={(book: AccountingBook) => book.id}
              getItemLabel={bookLabel}
              buttonLabel="Select book"
              singleSelect
              hideCheckboxes
            />

            {ACCOUNT_FIELDS.map(({ field, label }) => {
              const selectedAccount = ledgerAccounts.filter((account) => account.id === form[field]);

              return (
                <SelectDropdown<LedgerAccount>
                  key={field}
                  label={label}
                  items={ledgerAccounts}
                  selected={selectedAccount}
                  onChange={(selected: LedgerAccount[]) =>
                    setForm((p) => ({
                      ...p,
                      [field]: selected[0]?.id ?? "",
                    }))
                  }
                  getItemKey={(account: LedgerAccount) => account.id}
                  getItemLabel={accountLabel}
                  buttonLabel={`Select ${label.toLowerCase()} account`}
                  singleSelect
                  hideCheckboxes
                />
              );
            })}

            <div className="flex items-center justify-end gap-3 pt-2 pb-4 md:pb-6">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save policy"}
              </Button>
            </div>
          </form>
        )}
      </AccountingSideModal>
    </>
  );
};

export default AccountingPostingPoliciesPage;