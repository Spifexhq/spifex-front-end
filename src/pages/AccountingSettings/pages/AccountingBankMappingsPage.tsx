import React from "react";

import Button from "@/shared/ui/Button";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";
import Snackbar from "@/shared/ui/Snackbar";
import AccountingSideModal from "../components/AccountingSideModal";
import { api } from "@/api";
import { fetchAllCursor } from "@/lib/list";

import type { BankAccountLedgerMap, AccountingBook } from "@/models/settings/accounting";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import type { BankAccount } from "@/models/settings/banking";

type SnackbarState = {
  severity: "error" | "success";
  message: string;
} | null;

type MappingFormState = {
  bank_account_id: string;
  book_id: string;
  ledger_account_id: string;
};

function extractCollection<T>(input: unknown): T[] {
  if (Array.isArray(input)) return input as T[];
  if (!input || typeof input !== "object") return [];

  const obj = input as Record<string, unknown>;
  for (const key of ["results", "items", "data", "mappings"]) {
    const value = obj[key];
    if (Array.isArray(value)) return value as T[];
  }

  if (obj.data && obj.data !== input) {
    const nested = extractCollection<T>(obj.data);
    if (nested.length || Array.isArray(obj.data)) return nested;
  }

  return [];
}

const EMPTY_FORM: MappingFormState = {
  bank_account_id: "",
  book_id: "",
  ledger_account_id: "",
};

const AccountingBankMappingsPage: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [items, setItems] = React.useState<BankAccountLedgerMap[]>([]);
  const [snackbar, setSnackbar] = React.useState<SnackbarState>(null);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState<MappingFormState>(EMPTY_FORM);

  const [books, setBooks] = React.useState<AccountingBook[]>([]);
  const [banks, setBanks] = React.useState<BankAccount[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = React.useState<LedgerAccount[]>([]);
  const [lookupsLoading, setLookupsLoading] = React.useState(false);

  const selectedBank = React.useMemo(
    () => banks.filter((bank) => bank.id === form.bank_account_id),
    [banks, form.bank_account_id]
  );

  const selectedBook = React.useMemo(
    () => books.filter((book) => book.id === form.book_id),
    [books, form.book_id]
  );

  const selectedLedgerAccount = React.useMemo(
    () => ledgerAccounts.filter((account) => account.id === form.ledger_account_id),
    [ledgerAccounts, form.ledger_account_id]
  );

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getBankAccountLedgerMaps();
      const nextItems = extractCollection<BankAccountLedgerMap>(
        (response as { data?: unknown })?.data ?? response
      );
      setItems(nextItems);
    } catch {
      setItems([]);
      setSnackbar({ severity: "error", message: "Failed to load bank mappings." });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLookups = React.useCallback(async () => {
    try {
      setLookupsLoading(true);

      const [booksResponse, allBanks, allAccounts] = await Promise.all([
        api.getAccountingBooks(),
        fetchAllCursor<BankAccount>((p?: { cursor?: string }) =>
          api.getBanks({ cursor: p?.cursor, active: "true" })
        ),
        fetchAllCursor<LedgerAccount>((p?: { cursor?: string }) =>
          api.getLedgerAccounts({
            cursor: p?.cursor,
            active: "true",
            account_type: "posting",
            is_bank_control: "true",
          })
        ),
      ]);

      setBooks(extractCollection<AccountingBook>((booksResponse as { data?: unknown })?.data ?? booksResponse));
      setBanks(allBanks);
      setLedgerAccounts(allAccounts);
    } catch {
      setSnackbar({ severity: "error", message: "Failed to load mapping form lookups." });
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
    if (!books.length || !banks.length || !ledgerAccounts.length) {
      await loadLookups();
    }
  };

  const openEdit = async (item: BankAccountLedgerMap) => {
    setForm({
      bank_account_id: item.bank_account_id,
      book_id: item.book_id,
      ledger_account_id: item.ledger_account_id,
    });
    setModalOpen(true);
    if (!books.length || !banks.length || !ledgerAccounts.length) {
      await loadLookups();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.bank_account_id || !form.book_id || !form.ledger_account_id) {
      setSnackbar({ severity: "error", message: "Bank, book, and ledger account are required." });
      return;
    }

    try {
      setSaving(true);
      await api.upsertBankAccountLedgerMap({
        bank_account_id: form.bank_account_id,
        book_id: form.book_id,
        ledger_account_id: form.ledger_account_id,
      });

      setSnackbar({ severity: "success", message: "Bank mapping saved." });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch {
      setSnackbar({ severity: "error", message: "Failed to save bank mapping." });
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
            <h2 className="text-lg font-semibold text-gray-900">Bank to ledger mappings</h2>
            <p className="mt-1 text-sm text-gray-600">
              Map each bank account to a bank-control ledger account for settlement and transfer posting.
            </p>
          </div>
          <Button type="button" onClick={() => void openCreate()}>
            Map bank account
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Active mappings</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">
              {items.filter((item) => item.is_active).length}
            </div>
          </article>
          <article className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Books covered</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">
              {new Set(items.map((item) => item.book_id)).size}
            </div>
          </article>
          <article className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">Unique banks</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900">
              {new Set(items.map((item) => item.bank_account_id)).size}
            </div>
          </article>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-200">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Bank account</th>
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Ledger account</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-4 py-3 text-sm text-gray-900">{item.bank_account_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.book_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.ledger_account_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.is_active ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button type="button" variant="outline" size="sm" onClick={() => void openEdit(item)}>
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500">
                    No bank mappings found.
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
        title="Bank mapping"
        subtitle="Choose the bank account, accounting book, and the bank-control ledger account."
      >
        {lookupsLoading ? (
          <PageSkeleton rows={4} />
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <SelectDropdown<BankAccount>
              label="Bank account"
              items={banks}
              selected={selectedBank}
              onChange={(selected: BankAccount[]) =>
                setForm((p) => ({
                  ...p,
                  bank_account_id: selected[0]?.id ?? "",
                }))
              }
              getItemKey={(bank: BankAccount) => bank.id}
              getItemLabel={(bank: BankAccount) =>
                [bank.institution, bank.branch, bank.account_number].filter(Boolean).join(" — ") || bank.id
              }
              buttonLabel="Select bank"
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
              getItemLabel={(book: AccountingBook) => [book.code, book.name].filter(Boolean).join(" — ")}
              buttonLabel="Select book"
              singleSelect
              hideCheckboxes
            />

            <SelectDropdown<LedgerAccount>
              label="Ledger account"
              items={ledgerAccounts}
              selected={selectedLedgerAccount}
              onChange={(selected: LedgerAccount[]) =>
                setForm((p) => ({
                  ...p,
                  ledger_account_id: selected[0]?.id ?? "",
                }))
              }
              getItemKey={(account: LedgerAccount) => account.id}
              getItemLabel={(account: LedgerAccount) => [account.code, account.name].filter(Boolean).join(" — ")}
              buttonLabel="Select ledger account"
              singleSelect
              hideCheckboxes
            />

            <div className="flex items-center justify-end gap-3 pt-2 pb-4 md:pb-6">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save mapping"}
              </Button>
            </div>
          </form>
        )}
      </AccountingSideModal>
    </>
  );
};

export default AccountingBankMappingsPage;