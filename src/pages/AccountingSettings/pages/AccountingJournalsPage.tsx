import React from "react";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";
import Snackbar from "@/shared/ui/Snackbar";
import AccountingSideModal from "../components/AccountingSideModal";
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
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [reversingId, setReversingId] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<JournalEntry[]>([]);
  const [search, setSearch] = React.useState("");
  const [snackbar, setSnackbar] = React.useState<SnackbarState>(null);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [form, setForm] = React.useState<ManualJournalForm>(EMPTY_FORM);

  const [books, setBooks] = React.useState<AccountingBook[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = React.useState<LedgerAccount[]>([]);
  const [lookupsLoading, setLookupsLoading] = React.useState(false);

  const selectedBook = React.useMemo(
    () => books.filter((book) => book.id === form.book_id),
    [books, form.book_id]
  );

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getJournalEntries(search ? { search } : undefined);
      const nextItems = extractCollection<JournalEntry>(
        (response as { data?: unknown })?.data ?? response
      );
      setItems(nextItems);
    } catch {
      setItems([]);
      setSnackbar({ severity: "error", message: "Failed to load journals." });
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const loadLookups = React.useCallback(async () => {
    try {
      setLookupsLoading(true);

      const [booksResponse, allAccounts] = await Promise.all([
        api.getAccountingBooks(),
        fetchAllCursor<LedgerAccount>((p?: { cursor?: string }) =>
          api.getLedgerAccounts({
            cursor: p?.cursor,
            active: "true",
            account_type: "posting",
          })
        ),
      ]);

      setBooks(extractCollection<AccountingBook>((booksResponse as { data?: unknown })?.data ?? booksResponse));
      setLedgerAccounts(allAccounts);
    } catch {
      setSnackbar({ severity: "error", message: "Failed to load manual journal form lookups." });
    } finally {
      setLookupsLoading(false);
    }
  }, []);

  const openManualJournal = async () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
    if (!books.length || !ledgerAccounts.length) {
      await loadLookups();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validLines = form.lines.filter((line) => line.account_id && (line.debit || line.credit));
    if (!form.book_id || !form.document_date || !form.posting_date || !validLines.length) {
      setSnackbar({ severity: "error", message: "Book, dates, and at least one journal line are required." });
      return;
    }

    try {
      setSaving(true);

      const payload: AddJournalEntryRequest = {
        book_id: form.book_id,
        source_type: form.source_type,
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
      setSnackbar({ severity: "success", message: "Manual journal created." });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch {
      setSnackbar({ severity: "error", message: "Failed to create manual journal." });
    } finally {
      setSaving(false);
    }
  };

  const reverseJournal = async (journalId: string) => {
    try {
      setReversingId(journalId);
      await api.reverseJournalEntry(journalId, { memo: "Reversal requested from journals page" });
      setSnackbar({ severity: "success", message: "Journal reversed." });
      await load();
    } catch {
      setSnackbar({ severity: "error", message: "Failed to reverse journal." });
    } finally {
      setReversingId(null);
    }
  };

  if (loading) return <PageSkeleton rows={6} />;

  return (
    <>
      <section className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Journals</h2>
            <p className="mt-1 text-sm text-gray-600">
              Inspect accounting output, create manual journals, and reverse posted entries.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px]">
              <Input kind="text" label="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button type="button" variant="outline" onClick={() => void load()}>
              Apply
            </Button>
            <Button type="button" onClick={() => void openManualJournal()}>
              Manual journal
            </Button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-2xl border border-gray-200">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Entry</th>
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Posting date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Lines</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.entry_number || item.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.book_code}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.source_type}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.posting_date}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.status}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{Array.isArray(item.lines) ? item.lines.length : 0}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={reversingId === item.id}
                      onClick={() => void reverseJournal(item.id)}
                    >
                      {reversingId === item.id ? "Reversing..." : "Reverse"}
                    </Button>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-500">
                    No journals found.
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
        title="Manual journal"
        subtitle="Create a manual accounting entry with balanced debit and credit lines."
      >
        {lookupsLoading ? (
          <PageSkeleton rows={5} />
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
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

              <Input
                kind="text"
                label="Currency"
                value={form.currency_code}
                onChange={(e) => setForm((p) => ({ ...p, currency_code: e.target.value.toUpperCase() }))}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input
                kind="date"
                label="Document date"
                value={form.document_date}
                onValueChange={(v: string) => setForm((p) => ({ ...p, document_date: v }))}
              />
              <Input
                kind="date"
                label="Posting date"
                value={form.posting_date}
                onValueChange={(v: string) => setForm((p) => ({ ...p, posting_date: v }))}
              />
            </div>

            <Input
              kind="text"
              label="Memo"
              value={form.memo}
              onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
            />

            <div className="space-y-3">
              {form.lines.map((line, index) => {
                const selectedLineAccount = ledgerAccounts.filter((account) => account.id === line.account_id);

                return (
                  <div key={index} className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="grid gap-4 md:grid-cols-[1.8fr_1fr_1fr]">
                      <SelectDropdown<LedgerAccount>
                        label="Account"
                        items={ledgerAccounts}
                        selected={selectedLineAccount}
                        onChange={(selected: LedgerAccount[]) =>
                          setForm((p) => ({
                            ...p,
                            lines: p.lines.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, account_id: selected[0]?.id ?? "" }
                                : row
                            ),
                          }))
                        }
                        getItemKey={(account: LedgerAccount) => account.id}
                        getItemLabel={(account: LedgerAccount) => [account.code, account.name].filter(Boolean).join(" — ")}
                        buttonLabel="Select account"
                        singleSelect
                        hideCheckboxes
                      />

                      <Input
                        kind="amount"
                        label="Debit"
                        value={line.debit}
                        onValueChange={(v: string) =>
                          setForm((p) => ({
                            ...p,
                            lines: p.lines.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, debit: v } : row
                            ),
                          }))
                        }
                        zeroAsEmpty
                      />

                      <Input
                        kind="amount"
                        label="Credit"
                        value={line.credit}
                        onValueChange={(v: string) =>
                          setForm((p) => ({
                            ...p,
                            lines: p.lines.map((row, rowIndex) =>
                              rowIndex === index ? { ...row, credit: v } : row
                            ),
                          }))
                        }
                        zeroAsEmpty
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Input
                          kind="text"
                          label="Line memo"
                          value={line.memo}
                          onChange={(e) =>
                            setForm((p) => ({
                              ...p,
                              lines: p.lines.map((row, rowIndex) =>
                                rowIndex === index ? { ...row, memo: e.target.value } : row
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
                            setForm((p) => ({
                              ...p,
                              lines: p.lines.filter((_, rowIndex) => rowIndex !== index),
                            }))
                          }
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    lines: [...p.lines, { account_id: "", debit: "", credit: "", memo: "" }],
                  }))
                }
              >
                Add line
              </Button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 pb-4 md:pb-6">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create journal"}
              </Button>
            </div>
          </form>
        )}
      </AccountingSideModal>
    </>
  );
};

export default AccountingJournalsPage;