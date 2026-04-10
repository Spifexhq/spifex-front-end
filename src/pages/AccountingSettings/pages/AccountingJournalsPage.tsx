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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

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
      <section className="space-y-4">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-600">Journals</div>
          </div>

          <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h2 className="text-[16px] font-semibold text-gray-900">Journal control</h2>
                <p className="mt-1 text-[13px] leading-6 text-gray-600">
                  Inspect accounting output, create controlled manual entries, and reverse
                  posted journals that require correction.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-[240px]">
                  <Input
                    kind="text"
                    label="Search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <Button type="button" variant="outline" onClick={() => void load()}>
                  Apply
                </Button>
                <Button type="button" onClick={() => void openManualJournal()}>
                  Manual journal
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <MetricCard
                label="Entries"
                value={items.length}
                detail="Journals visible in the current search slice."
              />
              <MetricCard
                label="Reversed"
                value={items.filter((item) => item.status === "reversed").length}
                detail="Entries already reversed."
              />
              <MetricCard
                label="Lines"
                value={items.reduce((sum, item) => sum + (Array.isArray(item.lines) ? item.lines.length : 0), 0)}
                detail="Total journal lines across visible entries."
              />
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-600">Journal list</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  {["Entry", "Book", "Source", "Posting date", "Status", "Lines", "Actions"].map((column) => (
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
                    <td className="px-4 py-3 text-[13px] font-medium text-gray-900">
                      {item.entry_number || item.id}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{item.book_code || "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{item.source_type || "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{item.posting_date || "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{item.status || "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">
                      {Array.isArray(item.lines) ? item.lines.length : 0}
                    </td>
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
                    <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-gray-500">
                      No journals found.
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
        title="Manual journal"
        subtitle="Create a controlled accounting entry with balanced debit and credit lines."
        contentClassName="pb-4 md:pb-6"
      >
        {lookupsLoading ? (
          <PageSkeleton rows={5} />
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Journal header</div>
              </div>

              <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
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

                <Input
                  kind="text"
                  label="Currency"
                  value={form.currency_code}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      currency_code: event.target.value.toUpperCase(),
                    }))
                  }
                />

                <Input
                  kind="date"
                  label="Document date"
                  value={form.document_date}
                  onValueChange={(value: string) =>
                    setForm((prev) => ({ ...prev, document_date: value }))
                  }
                />

                <Input
                  kind="date"
                  label="Posting date"
                  value={form.posting_date}
                  onValueChange={(value: string) =>
                    setForm((prev) => ({ ...prev, posting_date: value }))
                  }
                />

                <div className="md:col-span-2">
                  <Input
                    kind="text"
                    label="Memo"
                    value={form.memo}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, memo: event.target.value }))
                    }
                  />
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">Journal lines</div>
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
                    Add line
                  </Button>
                </div>
              </div>

              <div className="space-y-4 px-4 py-4">
                {form.lines.map((line, index) => {
                  const selectedLineAccount = ledgerAccounts.filter((account) => account.id === line.account_id);

                  return (
                    <article key={index} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="grid gap-4 md:grid-cols-[1.8fr_1fr_1fr]">
                        <SelectDropdown<LedgerAccount>
                          label="Account"
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
                          buttonLabel="Select account"
                          singleSelect
                          hideCheckboxes
                        />

                        <Input
                          kind="amount"
                          label="Debit"
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
                          label="Credit"
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
                            label="Line memo"
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
                            Remove
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">Debit total</div>
                  <div className="mt-1 text-[13px] font-medium text-gray-900">{(totals.debit / 100).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">Credit total</div>
                  <div className="mt-1 text-[13px] font-medium text-gray-900">{(totals.credit / 100).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">Balance</div>
                  <div className="mt-1 text-[13px] font-medium text-gray-900">
                    {balanced ? "Balanced" : "Unbalanced"}
                  </div>
                </div>
              </div>
            </section>

            <div className="flex items-center justify-end gap-3 pt-1">
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
