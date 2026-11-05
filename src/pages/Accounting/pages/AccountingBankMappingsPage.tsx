import { useAccountingSource } from "@/api/hooks/useAccountingRecords";
import { useRecordFilters } from "@/shared/ui/DataTable/useRecordFilters";
import { fetchAllCursor } from "@/lib/list";
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
  is_active: boolean;
};


const EMPTY_FORM: MappingFormState = {
  bank_account_id: "",
  book_id: "",
  ledger_account_id: "",
  is_active: true,
};

const AccountingBankMappingsPage: React.FC = () => {
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

  const [saving, setSaving] = React.useState(false);
  const { isOwner, isSuperUser, permissions } = useAuthContext();
  const canDelete = isOwner || isSuperUser || permissions.includes("delete_ledger_account");
  const [items, setItems] = React.useState<BankAccountLedgerMap[]>([]);
  const [snackbar, setSnackbar] = React.useState<SnackbarState>(null);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState<MappingFormState>(EMPTY_FORM);

  const [books, setBooks] = React.useState<AccountingBook[]>([]);
  const [banks, setBanks] = React.useState<BankAccount[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = React.useState<LedgerAccount[]>([]);
  const [lookupsReady, setLookupsReady] = React.useState(false);
  const [lookupsLoading, setLookupsLoading] = React.useState(true);

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

  const source = useAccountingSource<BankAccountLedgerMap>("bank-connections");
  const recordFilters = useRecordFilters(items, [
 {key:"status",label:t("table.status","Status"),value:item=>String(item.is_active),format:value=>t(value==="true"?"table.active":"table.inactive",value==="true"?"Active":"Inactive")},
 {key:"book",label:t("bankMappingsPage.columns.book","Book"),value:item=>item.book_id,format:value=>bookMap.get(value)||"—"},
 {key:"bank",label:t("bankMappingsPage.columns.bankAccount","Bank account"),value:item=>item.bank_account_id,format:value=>bankMap.get(value)||"—"},
 {key:"account",label:t("bankMappingsPage.columns.ledgerAccount","Ledger account"),value:item=>item.ledger_account_id,format:value=>accountMap.get(value)||"—"}
], item=>[bankMap.get(item.bank_account_id),bookMap.get(item.book_id),accountMap.get(item.ledger_account_id)].join(" "), { ...source, placeholder: t("filters.search.bank-connections", "Search records"), onItems: setItems });
  const loading = recordFilters.pager.loading;
  const load = recordFilters.pager.refresh;

  const loadLookups = React.useCallback(async () => {
    try {
      setLookupsLoading(true);
      setLookupsReady(false);

      const [nextBooks, nextBanks, nextLedgerAccounts] = await Promise.all([
        fetchAllCursor<AccountingBook>(params => api.getAccountingBooks(params)),
        fetchAllCursor<BankAccount>(params => api.getBanks(params)),
        fetchAllCursor<LedgerAccount>(params => api.getLedgerAccounts(params)),
      ]);
      setBooks(nextBooks);
      setBanks(nextBanks);
      setLedgerAccounts(nextLedgerAccounts);
      setLookupsReady(true);
    } catch (notificationCause) {
      setSnackbar({
        severity: "error",
        message: apiErrorMessage(notificationCause, t("bankMappingsPage.lookupError", "Failed to load mapping form lookups.")),
      });
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
    if (!books.length || !banks.length || !ledgerAccounts.length) {
      await loadLookups();
    }
  };

  const openEdit = async (item: BankAccountLedgerMap) => {
    setEditingScope(true);
    setForm({
      bank_account_id: item.bank_account_id,
      book_id: item.book_id,
      ledger_account_id: item.ledger_account_id,
      is_active: item.is_active,
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
        is_active: form.is_active,
      });

      setSnackbar({ severity: "success", message: t("bankMappingsPage.savedSuccess", "Bank mapping saved.") });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (cause) {
      setSnackbar({ severity: "error", message: apiErrorMessage(cause, t("bankMappingsPage.saveError", "Failed to save bank mapping.")) });
    } finally {
      setSaving(false);
    }
  };

  if ((loading && !items.length) || lookupsLoading) return <PageSkeleton rows={6} />;
  if (!lookupsReady) return <div role="alert" className="space-y-3 rounded-lg border border-gray-200 p-5"><p className="text-sm text-red-700">{t("bankMappingsPage.lookupError", "Failed to load mapping form lookups.")}</p><Button variant="outline" onClick={() => void loadLookups()}>{t("redesign.retry", "Retry")}</Button></div>;

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

              <Button type="button" disabled={!canManage} onClick={() => void openCreate()}>
                {t("bankMappingsPage.newButton", "Map bank account")}
              </Button>
            </div>


          </div>
        </div>

        {recordFilters.pager.error && <p role="alert" className="text-sm text-red-700">{recordFilters.pager.error}</p>}{recordFilters.filters}
        <DataTable pager={recordFilters.pager} onDelete={canDelete ? async item => { await api.deleteBankAccountLedgerMap(item.id); setItems(previous => previous.filter(row => row.id !== item.id)); await load(); } : undefined} items={recordFilters.rows} editLabel={t("common.edit", "Edit")} emptyLabel={t("bankMappingsPage.empty", "No records found.")} onEdit={canManage ? item => { void openEdit(item); } : undefined} columns={[
              { key: "name", label: t("bankMappingsPage.columns.bankAccount", "Bank account"), render: item => bankMap.get(item.bank_account_id) || "—" },
              { key: "book", label: t("bankMappingsPage.columns.book", "Book"), render: item => bookMap.get(item.book_id) || "—" },
              { key: "account", label: t("bankMappingsPage.columns.ledgerAccount", "Ledger account"), render: item => accountMap.get(item.ledger_account_id) || "—" },
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
        title={t("bankMappingsPage.modal.title", "Bank mapping")}
        subtitle={t("bankMappingsPage.modal.subtitle", "Choose the operational bank account, accounting book, and bank-control ledger account.")}
      >
        {lookupsLoading ? (
          <div className="settings-modal-scroll"><PageSkeleton rows={4} /></div>
        ) : (
          <SidePanelForm recordLabel={t("footer.bankMapping", "Bank mapping")} recordName={banks.find(bank => bank.id === form.bank_account_id)?.institution} onSubmit={submit} className="space-y-5 pb-4 md:pb-6">
            {editingScope && <p className="text-xs leading-6 text-gray-500">{t("setupFlow.scopeLocked", "The bank or category and book identify this configuration. Create a new configuration to use a different scope.")}</p>}
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-slate-600">
                <div className="text-[10px] uppercase tracking-wide text-gray-600"> {t("bankMappingsPage.modal.definition", "Mapping definition")}</div>
              </div>

              <div className="grid gap-4 px-4 py-4">
                <Select<BankAccount>
                  disabled={editingScope}
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

            <label className="flex items-center gap-2 text-xs"><Checkbox checked={form.is_active} onChange={event => setForm(previous => ({ ...previous, is_active: event.target.checked }))} />{t("common.active", "Active")}</label>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="cancel" onClick={() => setModalOpen(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={saving || !canManage}>
                {saving ? t("common.saving", "Saving...") : t("bankMappingsPage.modal.saveMapping", "Save mapping")}
              </Button>
            </div>
          </SidePanelForm>
        )}
      </SidePanel>
    </>
  );
};

export default AccountingBankMappingsPage;
