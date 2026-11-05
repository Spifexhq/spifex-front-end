import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useAccountingSource } from "@/api/hooks/useAccountingRecords";
import { useRecordFilters } from "@/shared/ui/DataTable/useRecordFilters";
import DataTable from "@/shared/ui/DataTable";
import AccountingStatus from "../components/AccountingStatus";
import { useAccountingSetup } from "../setup/useAccountingSetup";
import SidePanel, { SidePanelForm, SidePanelDetails } from "@/components/Modal/SidePanel";
import AccountingTerm from "@/pages/Accounting/components/AccountingTerm";
import React from "react";
import { useTranslation } from "react-i18next";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { Select } from "src/shared/ui/Select";
import Snackbar from "@/shared/ui/Snackbar";

import { api } from "@/api";
import { fetchAllCursor } from "@/lib/list";

import type {
  JournalEntry,
  AccountingBook,
  AddJournalEntryRequest,
  JournalSourceType,
} from "@/models/settings/accounting";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";

type SnackbarState = {
  severity: "error" | "success";
  message: string;
} | null;

type JournalLineForm = {
  account_id: string;
  debit: string;
  credit: string;
  memo: string;
};

type ManualJournalForm = {
  book_id: string;
  source_type: JournalSourceType;
  document_date: string;
  posting_date: string;
  currency_code: string;
  memo: string;
  lines: JournalLineForm[];
};

function extractCollection<T>(input: unknown): T[] {
  if (Array.isArray(input)) return input as T[];
  if (!input || typeof input !== "object") return [];

  const obj = input as Record<string, unknown>;
  for (const key of ["results", "items", "data", "entries"]) {
    const value = obj[key];
    if (Array.isArray(value)) return value as T[];
  }

  if (obj.data && obj.data !== input) {
    const nested = extractCollection<T>(obj.data);
    if (nested.length || Array.isArray(obj.data)) return nested;
  }

  return [];
}

function toMinor(value: string): number {
  const raw = String(value || "").trim();
  if (!raw) return 0;

  const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/\s+/g, "");
  const normalized =
    cleaned.includes(",") && cleaned.includes(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(",", ".");

  const n = Number(normalized);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}


const EMPTY_FORM: ManualJournalForm = {
  book_id: "",
  source_type: "manual",
  document_date: todayIso(),
  posting_date: todayIso(),
  currency_code: "EUR",
  memo: "",
  lines: [{ account_id: "", debit: "", credit: "", memo: "" }],
};

const AccountingJournalsPage: React.FC = () => {
  const { status: setupStatus, canManage } = useAccountingSetup();
  const { i18n } = useTranslation("accountingSettings");
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const t = React.useCallback(
    (key: string, defaultValue: string, options?: Record<string, unknown>) =>
      String(i18n.t(key, {
          lng: language, ns: "accountingSettings", defaultValue, ...(options ?? {}) })),
    [i18n, language]
  );

  const requestKey = React.useRef("");
  const [saving, setSaving] = React.useState(false);
  const [reversingId, setReversingId] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<JournalEntry[]>([]);
  const [snackbar, setSnackbar] = React.useState<SnackbarState>(null);

  const [selectedJournal, setSelectedJournal] = React.useState<JournalEntry | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState<ManualJournalForm>(EMPTY_FORM);

  const [books, setBooks] = React.useState<AccountingBook[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = React.useState<LedgerAccount[]>([]);
  const [lookupsLoading, setLookupsLoading] = React.useState(false);

  const selectedBook = React.useMemo(
    () => books.filter((book) => book.id === form.book_id),
    [books, form.book_id]
  );

  const totals = React.useMemo(() => {
    return form.lines.reduce(
      (acc, line) => {
        acc.debit += Math.max(0, toMinor(line.debit));
        acc.credit += Math.max(0, toMinor(line.credit));
        return acc;
      },
      { debit: 0, credit: 0 }
    );
  }, [form.lines]);

  const balanced = totals.debit === totals.credit && totals.debit > 0;

  const source = useAccountingSource<JournalEntry>("journals");
  const recordFilters = useRecordFilters(items, [
 {key:"status",label:t("table.status","Status"),value:item=>item.status,format:value=>t(`enums.status.${value}`,value)},
 {key:"book",label:t("journalsPage.columns.book","Book"),value:item=>item.book_code||""},
 {key:"source",label:t("journalsPage.columns.source","Source"),value:item=>item.source_type,format:value=>t(`enums.source.${value}`,value)},
 {key:"from",label:t("filters.dateFrom","From"),value:item=>item.posting_date,date:"from"},
 {key:"to",label:t("filters.dateTo","To"),value:item=>item.posting_date,date:"to"}
], item=>[item.entry_number,item.memo,item.book_code,item.source_external_id].join(" "), { ...source, placeholder: t("filters.search.journals", "Search records"), onItems: setItems });
  const loading = recordFilters.pager.loading;
  const load = recordFilters.pager.refresh;


  const loadLookups = React.useCallback(async () => {
    try {
      setLookupsLoading(true);

      const [booksResponse, allAccounts] = await Promise.all([
        api.getAccountingBooks(),
        fetchAllCursor<LedgerAccount>((params?: { cursor?: string }) =>
          api.getLedgerAccounts({
            cursor: params?.cursor,
            active: "true",
            account_type: "posting",
          })
        ),
      ]);

      setBooks(
        extractCollection<AccountingBook>((booksResponse as { data?: unknown })?.data ?? booksResponse)
      );
      setLedgerAccounts(allAccounts);
    } catch (notificationCause) {
      setSnackbar({ severity: "error", message: apiErrorMessage(notificationCause, t("journalsPage.lookupError", "Failed to load manual journal form lookups.")) });
    } finally {
      setLookupsLoading(false);
    }
  }, [t]);

  const openManualJournal = async () => {
    requestKey.current = crypto.randomUUID();
    setForm(EMPTY_FORM);
    setModalOpen(true);
    if (!books.length || !ledgerAccounts.length) {
      await loadLookups();
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (saving || !setupStatus?.operational || !canManage) return;
    const validLines = form.lines.filter((line) => line.account_id && (line.debit || line.credit));
    if (!form.book_id || !form.document_date || !form.posting_date || !validLines.length) {
      setSnackbar({ severity: "error", message: t("journalsPage.requiredError", "Book, dates, and at least one journal line are required.") });
      return;
    }

    try {
      setSaving(true);

      const payload: AddJournalEntryRequest = {
        book_id: form.book_id,
        source_type: form.source_type,
        idempotency_key: requestKey.current || (requestKey.current = crypto.randomUUID()),
        document_date: form.document_date,
        posting_date: form.posting_date,
        currency_code: form.currency_code.trim().toUpperCase(),
        memo: form.memo.trim(),
        lines: validLines.map((line) => ({
          account_id: line.account_id,
          debit_minor: Math.max(0, toMinor(line.debit)),
          credit_minor: Math.max(0, toMinor(line.credit)),
          currency_code: form.currency_code.trim().toUpperCase(),
          memo: line.memo.trim(),
        })),
      };

      await api.createJournalEntry(payload);
      setSnackbar({ severity: "success", message: t("journalsPage.createdSuccess", "Manual journal created.") });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (notificationCause) {
      setSnackbar({ severity: "error", message: apiErrorMessage(notificationCause, t("journalsPage.createError", "Failed to create manual journal.")) });
    } finally {
      setSaving(false);
    }
  };

  const reverseJournal = async (journalId: string) => {
    try {
      setReversingId(journalId);
      await api.reverseJournalEntry(journalId, { memo: t("journalsPage.reverseReason", "Reversal requested from journals page") });
      setSnackbar({ severity: "success", message: t("journalsPage.reversedSuccess", "Journal reversed.") });
      await load();
    } catch (notificationCause) {
      setSnackbar({ severity: "error", message: apiErrorMessage(notificationCause, t("journalsPage.reverseError", "Failed to reverse journal.")) });
    } finally {
      setReversingId(null);
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
                  {t("journalsPage.description", "Inspect accounting output, create controlled manual entries, and reverse posted journals that require correction.")}
                </p>
              </div>

              <Button type="button" disabled={!setupStatus?.operational || !canManage} onClick={openManualJournal}>{t("journalsPage.newButton", "New journal")}</Button>
            </div>


          </div>
        </div>

        {recordFilters.pager.error && <p role="alert" className="text-sm text-red-700">{recordFilters.pager.error}</p>}{recordFilters.filters}
        <DataTable<JournalEntry> pager={recordFilters.pager} items={recordFilters.rows} editLabel={t("common.edit", "Edit")} emptyLabel={t("journalsPage.empty", "No journals found.")} onInspect={setSelectedJournal} columns={[
{ key: "name", label: t("journalsPage.columns.entry", "Entry"), render: item => item.entry_number || item.id },
{ key: "book", label: t("journalsPage.columns.book", "Book"), render: item => item.book_code },
{ key: "source", label: t("journalsPage.columns.source", "Source"), render: item => t(`enums.source.${item.source_type}`, item.source_type) },
{ key: "date", label: t("journalsPage.columns.postingDate", "Posting date"), render: item => item.posting_date },
{ key: "status", label: t("table.status", "Status"), render: item => <AccountingStatus active={item.status === "posted"} label={t(`enums.status.${item.status}`, item.status)} /> }
]} actions={item => <Button type="button" variant="outline" size="sm" disabled={!setupStatus?.operational || !canManage || reversingId === item.id || item.status !== "posted"} onClick={() => void reverseJournal(item.id)}>{t("journalsPage.actions.reverse", "Reverse")}</Button>} />

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
        title={t("journalsPage.modal.title", "Manual journal")}
        subtitle={t("journalsPage.modal.subtitle", "Create a controlled accounting entry with balanced debit and credit lines.")}
      >
        {lookupsLoading ? (
          <div className="settings-modal-scroll"><PageSkeleton rows={5} /></div>
        ) : (
          <SidePanelForm recordLabel={t("footer.journal", "Journal")} recordName={form.memo} onSubmit={submit} className="space-y-5 pb-4 md:pb-6">
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-slate-600">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("journalsPage.modal.headerSection", "Journal header")}</div>
              </div>

              <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
                <Select<AccountingBook>
                  label={t("common.book", "Book")}
                  items={books}
                  selected={selectedBook}
                  onChange={(selected: AccountingBook[]) =>
                    setForm((prev) => ({
                      ...prev,
                      book_id: selected[0]?.id ?? "",
                      currency_code: selected[0]?.currency_code ?? "",
                    }))
                  }
                  getItemKey={(book: AccountingBook) => book.id}
                  getItemLabel={(book: AccountingBook) =>
                    [book.code, book.name].filter(Boolean).join(" — ")
                  }
                  buttonLabel={t("journalsPage.modal.selectBook", "Select book")}
                  singleSelect
                  hideCheckboxes
                />

                <Input kind="text" label={t("common.currency", "Currency")} value={form.currency_code} readOnly />

                <Input
                  kind="date"
                  label={t("journalsPage.modal.documentDate", "Document date")}
                  value={form.document_date}
                  onValueChange={(value: string) =>
                    setForm((prev) => ({ ...prev, document_date: value }))
                  }
                />

                <Input
                  kind="date"
                  label={<AccountingTerm term="postingDate">{t("journalsPage.modal.postingDate", "Posting date")}</AccountingTerm>}
                  value={form.posting_date}
                  onValueChange={(value: string) =>
                    setForm((prev) => ({ ...prev, posting_date: value }))
                  }
                />

                <div className="md:col-span-2">
                  <Input
                    kind="text"
                    label={t("journalsPage.modal.memo", "Memo")}
                    value={form.memo}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, memo: event.target.value }))
                    }
                  />
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold text-slate-600">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("journalsPage.modal.linesSection", "Journal lines")}</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        lines: [...prev.lines, { account_id: "", debit: "", credit: "", memo: "" }],
                      }))
                    }
                  >
                    {t("journalsPage.modal.addLine", "Add line")}
                  </Button>
                </div>
              </div>

              <div className="space-y-4 px-4 py-4">
                {form.lines.map((line, index) => {
                  const selectedLineAccount = ledgerAccounts.filter((account) => account.id === line.account_id);

                  return (
                    <article key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="grid gap-4 md:grid-cols-[1.8fr_1fr_1fr]">
                        <Select<LedgerAccount>
                          label={t("journalsPage.modal.account", "Account")}
                          items={ledgerAccounts}
                          selected={selectedLineAccount}
                          onChange={(selected: LedgerAccount[]) =>
                            setForm((prev) => ({
                              ...prev,
                              lines: prev.lines.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, account_id: selected[0]?.id ?? "" }
                                  : row
                              ),
                            }))
                          }
                          getItemKey={(account: LedgerAccount) => account.id}
                          getItemLabel={(account: LedgerAccount) =>
                            [account.code, account.name].filter(Boolean).join(" — ")
                          }
                          buttonLabel={t("journalsPage.modal.selectAccount", "Select account")}
                          singleSelect
                          hideCheckboxes
                        />

                        <Input
                          kind="amount"
                          label={<AccountingTerm term="debit">{t("journalsPage.modal.debit", "Debit")}</AccountingTerm>}
                          value={line.debit}
                          onValueChange={(value: string) =>
                            setForm((prev) => ({
                              ...prev,
                              lines: prev.lines.map((row, rowIndex) =>
                                rowIndex === index ? { ...row, debit: value } : row
                              ),
                            }))
                          }
                          zeroAsEmpty
                        />

                        <Input
                          kind="amount"
                          label={<AccountingTerm term="credit">{t("journalsPage.modal.credit", "Credit")}</AccountingTerm>}
                          value={line.credit}
                          onValueChange={(value: string) =>
                            setForm((prev) => ({
                              ...prev,
                              lines: prev.lines.map((row, rowIndex) =>
                                rowIndex === index ? { ...row, credit: value } : row
                              ),
                            }))
                          }
                          zeroAsEmpty
                        />
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="min-w-0 flex-1">
                          <Input
                            kind="text"
                            label={t("journalsPage.modal.lineMemo", "Line memo")}
                            value={line.memo}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                lines: prev.lines.map((row, rowIndex) =>
                                  rowIndex === index ? { ...row, memo: event.target.value } : row
                                ),
                              }))
                            }
                          />
                        </div>

                        {form.lines.length > 1 ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                lines: prev.lines.filter((_, rowIndex) => rowIndex !== index),
                              }))
                            }
                          >
                            {t("journalsPage.modal.removeLine", "Remove")}
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4 rounded-lg border border-gray-200 bg-white">
              <div className="grid grid-cols-1 gap-5 border-t border-gray-100 pt-5 sm:grid-cols-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("journalsPage.modal.debitTotal", "Debit total")}</div>
                  <div className="mt-1 text-[13px] font-medium text-gray-900">{(totals.debit / 100).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("journalsPage.modal.creditTotal", "Credit total")}</div>
                  <div className="mt-1 text-[13px] font-medium text-gray-900">{(totals.credit / 100).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("journalsPage.modal.balance", "Balance")}</div>
                  <div className="mt-1 text-[13px] font-medium text-gray-900">
                    {balanced ? t("journalsPage.modal.balanced", "Balanced") : t("journalsPage.modal.unbalanced", "Unbalanced")}
                  </div>
                </div>
              </div>
            </section>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="cancel" onClick={() => setModalOpen(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t("common.saving", "Saving...") : t("journalsPage.modal.createJournal", "Create journal")}
              </Button>
            </div>
          </SidePanelForm>
        )}
      </SidePanel>
      <SidePanel  isOpen={!!selectedJournal} onClose={() => setSelectedJournal(null)} title={t("redesign.journalDetails", "Journal details")} subtitle={selectedJournal?.entry_number || selectedJournal?.id}
        recordLabel={t("footer.journal", "Journal")} recordName={selectedJournal?.entry_number || selectedJournal?.id}
        >
        {selectedJournal && <div className="space-y-6">
          <SidePanelDetails fields={[[t("journalsPage.columns.book", "Book"), selectedJournal.book_code], [t("journalsPage.columns.status", "Status"), t(`enums.status.${selectedJournal.status}`, selectedJournal.status)], [t("journalsPage.columns.postingDate", "Posting date"), selectedJournal.posting_date], [t("common.currency", "Currency"), selectedJournal.currency_code]].map(([label,value]) => ({label,value}))} />
          {selectedJournal.memo && <p className="text-[13px] leading-6 text-gray-600">{selectedJournal.memo}</p>}
          <div className="overflow-x-auto rounded-lg border border-gray-200 settings-table-scroll">
            <DataTable inspectable={false} items={selectedJournal.lines.map(line=>({...line,id:String(line.line_no)}))} emptyLabel={t("journalsPage.empty", "No journals found.")} columns={[
              {key:"name",label:t("redesign.ledgerAccount", "Ledger account"),render:line=>line.account_name},
              {key:"debit",label:t("common.balances.debit", "Debit"),render:line=>(line.debit_minor/100).toFixed(2)},
              {key:"credit",label:t("common.balances.credit", "Credit"),render:line=>(line.credit_minor/100).toFixed(2)},
            ]} summary={<div className="flex justify-between gap-3 border-t border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold"><span>{t("redesign.total", "Total")}</span><span>{(selectedJournal.lines.reduce((sum,line)=>sum+line.debit_minor,0)/100).toFixed(2)}</span><span>{(selectedJournal.lines.reduce((sum,line)=>sum+line.credit_minor,0)/100).toFixed(2)}</span></div>}/>

          </div>
          <p className="break-all text-xs leading-5 text-gray-500">{t("redesign.source", "Source")}: {t(`enums.source.${selectedJournal.source_type}`, selectedJournal.source_type)} · {selectedJournal.source_external_id || "—"}</p>
        </div>}
      </SidePanel>
    </>
  );
};

export default AccountingJournalsPage;
