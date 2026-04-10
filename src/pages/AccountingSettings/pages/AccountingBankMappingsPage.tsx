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

  const bookMap = React.useMemo(
    () =>
      new Map(
        books.map((book) => [book.id, [book.code, book.name].filter(Boolean).join(" — ") || book.id])
      ),
    [books]
  );

  const bankMap = React.useMemo(
    () =>
      new Map(
        banks.map((bank) => [
          bank.id,
          [bank.institution, bank.branch, bank.account_number].filter(Boolean).join(" — ") || bank.id,
        ])
      ),
    [banks]
  );

  const accountMap = React.useMemo(
    () =>
      new Map(
        ledgerAccounts.map((account) => [
          account.id,
          [account.code, account.name].filter(Boolean).join(" — ") || account.id,
        ])
      ),
    [ledgerAccounts]
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
        fetchAllCursor<BankAccount>((params?: { cursor?: string }) =>
          api.getBanks({ cursor: params?.cursor, active: "true" })
        ),
        fetchAllCursor<LedgerAccount>((params?: { cursor?: string }) =>
          api.getLedgerAccounts({
            cursor: params?.cursor,
            active: "true",
            account_type: "posting",
            is_bank_control: "true",
          })
        ),
      ]);

      setBooks(
        extractCollection<AccountingBook>((booksResponse as { data?: unknown })?.data ?? booksResponse)
      );
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
    void loadLookups();
  }, [load, loadLookups]);

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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

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
      <section className="space-y-4">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-600">Bank mappings</div>
          </div>

          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="text-[16px] font-semibold text-gray-900">Bank control mapping</h2>
                <p className="mt-1 text-[13px] leading-6 text-gray-600">
                  Link each operational bank account to the accounting book and bank-control ledger
                  account used during posting, settlement, and transfer flows.
                </p>
              </div>

              <Button type="button" onClick={() => void openCreate()}>
                Map bank account
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <MetricCard
                label="Active mappings"
                value={items.filter((item) => item.is_active).length}
                detail="Mappings available for posting operations."
              />
              <MetricCard
                label="Books covered"
                value={new Set(items.map((item) => item.book_id)).size}
                detail="Accounting books already linked to banks."
              />
              <MetricCard
                label="Unique banks"
                value={new Set(items.map((item) => item.bank_account_id)).size}
                detail="Operational bank accounts with mapping coverage."
              />
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-600">Mapping list</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  {["Bank account", "Book", "Ledger account", "Active", "Actions"].map((column) => (
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
                      {bankMap.get(item.bank_account_id) || item.bank_account_id}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">
                      {bookMap.get(item.book_id) || item.book_id}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">
                      {accountMap.get(item.ledger_account_id) || item.ledger_account_id}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">
                      {item.is_active ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => void openEdit(item)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}

                {!items.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[13px] text-gray-500">
                      No bank mappings found.
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
        title="Bank mapping"
        subtitle="Choose the operational bank account, accounting book, and bank-control ledger account."
      >
        {lookupsLoading ? (
          <PageSkeleton rows={4} />
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Mapping definition</div>
              </div>

              <div className="grid gap-4 px-4 py-4">
                <SelectDropdown<BankAccount>
                  label="Bank account"
                  items={banks}
                  selected={selectedBank}
                  onChange={(selected: BankAccount[]) =>
                    setForm((prev) => ({
                      ...prev,
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
                    setForm((prev) => ({
                      ...prev,
                      book_id: selected[0]?.id ?? "",
                    }))
                  }
                  getItemKey={(book: AccountingBook) => book.id}
                  getItemLabel={(book: AccountingBook) =>
                    [book.code, book.name].filter(Boolean).join(" — ")
                  }
                  buttonLabel="Select book"
                  singleSelect
                  hideCheckboxes
                />

                <SelectDropdown<LedgerAccount>
                  label="Ledger account"
                  items={ledgerAccounts}
                  selected={selectedLedgerAccount}
                  onChange={(selected: LedgerAccount[]) =>
                    setForm((prev) => ({
                      ...prev,
                      ledger_account_id: selected[0]?.id ?? "",
                    }))
                  }
                  getItemKey={(account: LedgerAccount) => account.id}
                  getItemLabel={(account: LedgerAccount) =>
                    [account.code, account.name].filter(Boolean).join(" — ")
                  }
                  buttonLabel="Select ledger account"
                  singleSelect
                  hideCheckboxes
                />
              </div>
            </section>

            <div className="flex items-center justify-end gap-3 pt-1">
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
