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
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-[10px] uppercase tracking-wide text-gray-600">{label}</div>
      <div className="mt-2 text-[20px] font-semibold text-gray-900">{value}</div>
      <p className="mt-1 text-[12px] text-gray-600">{detail}</p>
    </article>
  );
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

const categoryLabel = (category: CashflowCategory): string =>
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
        fetchAllCursor<LedgerAccount>((params?: { cursor?: string }) =>
          api.getLedgerAccounts({
            cursor: params?.cursor,
            active: "true",
            account_type: "posting",
          })
        ),
        api.getCashflowCategories?.(),
      ]);

      setBooks(
        extractCollection<AccountingBook>((booksResponse as { data?: unknown })?.data ?? booksResponse)
      );
      setLedgerAccounts(allAccounts);
      setCategories(
        extractCollection<CashflowCategory>(
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
    void loadLookups();
  }, [load, loadLookups]);

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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

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
      <section className="space-y-4">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-600">Posting policies</div>
          </div>

          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="text-[16px] font-semibold text-gray-900">Category-to-accounting bridge</h2>
                <p className="mt-1 text-[13px] leading-6 text-gray-600">
                  Define how each operational cashflow category translates into settlement,
                  accrual, and clearing accounts inside each accounting book.
                </p>
              </div>

              <Button type="button" onClick={() => void openCreate()}>
                New policy
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Policies"
                value={items.length}
                detail="Total configured category policies."
              />
              <MetricCard
                label="Settlement-ready"
                value={items.filter((item) => item.settlement_debit_account_id && item.settlement_credit_account_id).length}
                detail="Policies with full settlement pair mapping."
              />
              <MetricCard
                label="Accrual-ready"
                value={items.filter((item) => item.accrual_debit_account_id && item.accrual_credit_account_id).length}
                detail="Policies with full accrual pair mapping."
              />
              <MetricCard
                label="With clearing"
                value={items.filter((item) => item.clearing_account_id).length}
                detail="Policies already linked to a clearing account."
              />
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-600">Policy list</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  {["Category", "Book", "Settlement", "Accrual", "Clearing", "Status", "Actions"].map((column) => (
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
                    <td className="px-4 py-3 text-[13px] text-gray-900">
                      {displayValue(item.cashflow_category_label, item.cashflow_category_id)}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">
                      {displayValue(item.book_label, item.book_id)}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">
                      {pairValue(
                        item.settlement_debit_account_label,
                        item.settlement_debit_account_id,
                        item.settlement_credit_account_label,
                        item.settlement_credit_account_id
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">
                      {pairValue(
                        item.accrual_debit_account_label,
                        item.accrual_debit_account_id,
                        item.accrual_credit_account_label,
                        item.accrual_credit_account_id
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">
                      {displayValue(item.clearing_account_label, item.clearing_account_id)}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{item.status}</td>
                    <td className="px-4 py-3 text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => void openEdit(item)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}

                {!items.length ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-gray-500">
                      No posting policies found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
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

      <AccountingSideModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Posting policy"
        subtitle="Define how one operational category maps into settlement, accrual, and clearing accounts."
      >
        {lookupsLoading ? (
          <PageSkeleton rows={5} />
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Scope</div>
              </div>

              <div className="grid gap-4 px-4 py-4">
                <SelectDropdown<CashflowCategory>
                  label="Cashflow category"
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
                  buttonLabel="Select category"
                  singleSelect
                  hideCheckboxes
                />

                <SelectDropdown<AccountingBook>
                  label="Book"
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
                  buttonLabel="Select book"
                  singleSelect
                  hideCheckboxes
                />
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Account mapping</div>
              </div>

              <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
                {ACCOUNT_FIELDS.map(({ field, label }) => {
                  const selectedAccount = ledgerAccounts.filter((account) => account.id === form[field]);

                  return (
                    <SelectDropdown<LedgerAccount>
                      key={field}
                      label={label}
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
                      buttonLabel={`Select ${label.toLowerCase()} account`}
                      singleSelect
                      hideCheckboxes
                    />
                  );
                })}
              </div>
            </section>

            <div className="flex items-center justify-end gap-3 pt-1">
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
