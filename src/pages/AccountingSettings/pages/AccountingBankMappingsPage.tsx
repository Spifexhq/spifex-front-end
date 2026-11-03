import { SettingsModalForm } from "@/shared/ui/Settings/SettingsModalContent";
import SettingsTable from "@/shared/ui/Settings/SettingsTable";
import AccountingTerm from "../components/AccountingTerm";
import React from "react";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { Select } from "src/shared/ui/Select";
import Snackbar from "@/shared/ui/Snackbar";
import AccountingSideModal from "../components/AccountingSideModal";
import { api } from "@/api";

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
    <article className="min-w-0 border-l border-gray-200 px-4 py-1 first:border-l-0 first:pl-0">
      <div className="text-[10px] uppercase tracking-wide text-gray-600">{label}</div>
      <div className="mt-1 text-[24px] font-semibold tracking-tight text-gray-900">{value}</div>
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
      setSnackbar({ severity: "error", message: t("bankMappingsPage.loadError", "Failed to load bank mappings.") });
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadLookups = React.useCallback(async () => {
    try {
      setLookupsLoading(true);

      const [booksResponse, banksResponse, ledgerAccountsResponse] = await Promise.all([
        api.getAccountingBooks(),
        api.getBanks({ active: "true" }),
        api.getLedgerAccounts({
          active: "true",
          account_type: "posting",
          is_bank_control: "true",
        }),
      ]);

      const nextBooks = extractCollection<AccountingBook>(
        (booksResponse as { data?: unknown })?.data ?? booksResponse
      );

      const nextBanks = extractCollection<BankAccount>(
        (banksResponse as { data?: unknown })?.data ?? banksResponse
      );

      const nextLedgerAccounts = extractCollection<LedgerAccount>(
        (ledgerAccountsResponse as { data?: unknown })?.data ?? ledgerAccountsResponse
      );

      setBooks(nextBooks);
      setBanks(nextBanks);
      setLedgerAccounts(nextLedgerAccounts);
    } catch {
      setSnackbar({
        severity: "error",
        message: t("bankMappingsPage.lookupError", "Failed to load mapping form lookups."),
      });
    } finally {
      setLookupsLoading(false);
    }
  }, [t]);

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
      setSnackbar({ severity: "error", message: t("bankMappingsPage.requiredError", "Bank, book, and ledger account are required.") });
      return;
    }

    try {
      setSaving(true);
      await api.upsertBankAccountLedgerMap({
        bank_account_id: form.bank_account_id,
        book_id: form.book_id,
        ledger_account_id: form.ledger_account_id,
      });

      setSnackbar({ severity: "success", message: t("bankMappingsPage.savedSuccess", "Bank mapping saved.") });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch {
      setSnackbar({ severity: "error", message: t("bankMappingsPage.saveError", "Failed to save bank mapping.") });
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
                  {t("bankMappingsPage.description", "Link each operational bank account to the accounting book and bank-control ledger account used during posting, settlement, and transfer flows.")}
                </p>
              </div>

              <Button type="button" onClick={() => void openCreate()}>
                {t("bankMappingsPage.newButton", "Map bank account")}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-5 border-t border-gray-100 pt-5 sm:grid-cols-3 settings-metrics">
              <MetricCard
                label={t("bankMappingsPage.metrics.activeMappings", "Active mappings")}
                value={items.filter((item) => item.is_active).length}
                detail={t("bankMappingsPage.metrics.activeMappingsDetail", "Mappings available for posting operations.")}
              />
              <MetricCard
                label={t("bankMappingsPage.metrics.booksCovered", "Books covered")}
                value={new Set(items.map((item) => item.book_id)).size}
                detail={t("bankMappingsPage.metrics.booksCoveredDetail", "Accounting books already linked to banks.")}
              />
              <MetricCard
                label={t("bankMappingsPage.metrics.uniqueBanks", "Unique banks")}
                value={new Set(items.map((item) => item.bank_account_id)).size}
                detail={t("bankMappingsPage.metrics.uniqueBanksDetail", "Operational bank accounts with mapping coverage.")}
              />
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white settings-panel">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 settings-panel-heading">
            <div className="text-[10px] uppercase tracking-wide text-gray-600"> {t("bankMappingsPage.listTitle", "Mapping list")}</div>
          </div>

          <div className="overflow-x-auto settings-table-scroll">
            <SettingsTable className="min-w-full" onRowOpen={index => void openEdit(items[index])}>
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  {[t("bankMappingsPage.columns.bankAccount", "Bank account"), t("bankMappingsPage.columns.book", "Book"), t("bankMappingsPage.columns.ledgerAccount", "Ledger account"), t("bankMappingsPage.columns.active", "Active"), t("bankMappingsPage.columns.actions", "Actions")].map((column) => (
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
                      {item.is_active ? t("common.yes", "Yes") : t("common.no", "No")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => void openEdit(item)}>
                        {t("common.edit", "Edit")}
                      </Button>
                    </td>
                  </tr>
                ))}

                {!items.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[13px] text-gray-500">
                      {t("bankMappingsPage.empty", "No bank mappings found.")}
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

      <AccountingSideModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("bankMappingsPage.modal.title", "Bank mapping")}
        subtitle={t("bankMappingsPage.modal.subtitle", "Choose the operational bank account, accounting book, and bank-control ledger account.")}
        contentClassName="pb-4 md:pb-6"
      >
        {lookupsLoading ? (
          <PageSkeleton rows={4} />
        ) : (
          <SettingsModalForm onSubmit={submit} className="space-y-5">
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white settings-panel">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 settings-panel-heading">
                <div className="text-[10px] uppercase tracking-wide text-gray-600"> {t("bankMappingsPage.modal.definition", "Mapping definition")}</div>
              </div>

              <div className="grid gap-4 px-4 py-4">
                <Select<BankAccount>
                  label={t("common.bankAccount", "Bank account")}
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
                  buttonLabel={t("bankMappingsPage.modal.selectBank", "Select bank")}
                  singleSelect
                  hideCheckboxes
                />

                <Select<AccountingBook>
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
                  getItemLabel={(book: AccountingBook) =>
                    [book.code, book.name].filter(Boolean).join(" — ")
                  }
                  buttonLabel={t("bankMappingsPage.modal.selectBook", "Select book")}
                  singleSelect
                  hideCheckboxes
                />

                <Select<LedgerAccount>
                  label={<AccountingTerm term="bankControl">{t("common.ledgerAccount", "Ledger account")}</AccountingTerm>}
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
                  buttonLabel={t("bankMappingsPage.modal.selectLedgerAccount", "Select ledger account")}
                  singleSelect
                  hideCheckboxes
                />
              </div>
            </section>

            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-gray-200 bg-white py-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t("common.saving", "Saving...") : t("bankMappingsPage.modal.saveMapping", "Save mapping")}
              </Button>
            </div>
          </SettingsModalForm>
        )}
      </AccountingSideModal>
    </>
  );
};

export default AccountingBankMappingsPage;
