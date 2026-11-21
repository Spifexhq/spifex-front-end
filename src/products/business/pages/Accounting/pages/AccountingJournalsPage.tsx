import { useAuthContext } from "@/hooks/useAuth";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useAccountingSource } from "@/products/business/hooks/useAccountingRecords";
import { useRecordFilters } from "@/shared/ui/DataTable/useRecordFilters";
import DataTable from "@/shared/ui/DataTable";
import Card from "@/shared/ui/Card";
import AccountingStatus from "../components/AccountingStatus";
import AccountingMetricCard from "../components/AccountingMetricCard";
import { journalDisplayId } from "@/lib/journalDisplay";
import { useAccountingSetup } from "../setup/useAccountingSetup";
import SidePanel, { SidePanelForm, SidePanelDetails } from "@/components/Modal/SidePanel";
import AccountingTerm from "@/products/business/pages/Accounting/components/AccountingTerm";
import React from "react";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CheckCheck, ListTree, LockKeyhole, Plus, RotateCcw, Trash2 } from "lucide-react";

import Button from "@/shared/ui/Button";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import Input from "@/shared/ui/Input";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import SegmentedControl from "@/shared/ui/SegmentedControl";
import { Select } from "src/shared/ui/Select";
import Snackbar from "@/shared/ui/Snackbar";

import { api } from "@/api";
import { fetchAllCursor, getCursorFromUrl } from "@/lib/list";

import type {
  JournalEntry,
  JournalAuditEvent,
  AccountingBook,
  AddJournalEntryRequest,
  JournalSourceType,
} from "@/models/settings/accounting";
import type { Entry } from "@/models/entries/entries";
import type { SettledEntry } from "@/models/entries/settlements";
import { formatCurrency } from "@/lib";
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

type PreviewTarget =
  | { kind: "journal"; journal: JournalEntry }
  | { kind: "entry"; id: string }
  | { kind: "settlement"; id: string };

function journalRelatedSource(journal: JournalEntry): { kind: "entry" | "settlement"; id: string } | null {
  const id = journal.source_external_id?.trim();
  if (!id) return null;
  if (journal.source_type === "cash_settlement") return { kind: "settlement", id };
  if (journal.source_type === "cash_entry") return { kind: "entry", id };
  return null;
}

const AccountingJournalsPage: React.FC = () => {
  const { status: setupStatus, canManage } = useAccountingSetup();
  const { i18n } = useTranslation("accountingSettings");
  const { t: financeT } = useTranslation("financeEntries");
  const reduced = useReducedMotion();
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const t = React.useCallback(
    (key: string, defaultValue: string, options?: Record<string, unknown>) =>
      String(i18n.t(key, {
          lng: language, ns: "accountingSettings", defaultValue, ...(options ?? {}) })),
    [i18n, language]
  );

  const auth = useAuthContext();
  const organizationId = auth.organization?.organization?.id ?? "";
  const requestKey = React.useRef("");
  const [saving, setSaving] = React.useState(false);
  const [reversingId, setReversingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<JournalEntry | null>(null);
  const [historyPreview, setHistoryPreview] = React.useState<JournalAuditEvent | null>(null);
  const [tab, setTab] = React.useState<"journals" | "history">("journals");
  const [items, setItems] = React.useState<JournalEntry[]>([]);
  const [snackbar, setSnackbar] = React.useState<SnackbarState>(null);

  const [previewStack, setPreviewStack] = React.useState<PreviewTarget[]>([]);
  const [relatedPreview, setRelatedPreview] = React.useState<{ kind: "entry" | "settlement"; id: string; data: Entry | SettledEntry | null; loading: boolean; error: string } | null>(null);
  const [relatedRetry, setRelatedRetry] = React.useState(0);
  const topPreview = previewStack[previewStack.length - 1] || null;
  const activeJournal = topPreview?.kind === "journal" ? topPreview.journal : null;
  const initialJournal = previewStack[0]?.kind === "journal" ? previewStack[0].journal : null;
  const openJournalPreview = React.useCallback((journal: JournalEntry) => setPreviewStack([{ kind: "journal", journal }]), []);
  const pushRelatedPreview = React.useCallback((kind: "entry" | "settlement", id: string) => {
    setPreviewStack(previous => previous.length ? [...previous, { kind, id }] : previous);
  }, []);
  const closePreview = React.useCallback(() => {
    setPreviewStack(previous => previous.length > 1 ? previous.slice(0, -1) : []);
  }, []);
  React.useEffect(() => {
    const top = previewStack[previewStack.length - 1];
    if (!top || top.kind === "journal") {
      setRelatedPreview(null);
      return;
    }
    let alive = true;
    setRelatedPreview({ kind: top.kind, id: top.id, data: null, loading: true, error: "" });
    void (async () => {
      try {
        if (top.kind === "entry") {
          const { data } = await api.getEntry(top.id);
          if (alive) setRelatedPreview({ kind: top.kind, id: top.id, data, loading: false, error: "" });
        } else {
          const response = await api.getSettledEntriesBulk([top.id]);
          const row = response.data?.[0];
          if (!row) throw new Error(t("journalsPage.relatedNotFound", "Related settlement not found."));
          if (alive) setRelatedPreview({ kind: top.kind, id: top.id, data: row, loading: false, error: "" });
        }
      } catch (cause) {
        if (alive) setRelatedPreview({ kind: top.kind, id: top.id, data: null, loading: false, error: apiErrorMessage(cause, t("journalsPage.relatedLoadError", "Could not load the related entry.")) });
      }
    })();
    return () => { alive = false; };
  }, [previewStack, relatedRetry, t]);
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

  const metrics = React.useMemo(() => [
    { key: "entries", value: items.length, Icon: BookOpen, detail: t("journalsPage.metrics.entriesDetail", "Journals visible in the current search slice.") },
    { key: "posted", value: items.filter((item) => item.status === "posted").length, Icon: CheckCheck, detail: t("journalsPage.metrics.postedDetail", "Entries currently posted to the ledger.") },
    { key: "reversed", value: items.filter((item) => item.status === "reversed").length, Icon: RotateCcw, detail: t("journalsPage.metrics.reversedDetail", "Entries already reversed.") },
    { key: "lines", value: items.reduce((sum, item) => sum + (item.lines?.length || 0), 0), Icon: ListTree, detail: t("journalsPage.metrics.linesDetail", "Total journal lines across visible entries.") },
  ], [items, t]);

  const source = useAccountingSource<JournalEntry>("journals");
  const recordFilters = useRecordFilters(items, [
 {key:"status",label:t("table.status","Status"),value:item=>item.status,format:value=>t(`enums.status.${value}`,value)},
 {key:"book",label:t("journalsPage.columns.book","Book"),value:item=>item.book_code||""},
 {key:"source",label:t("journalsPage.columns.source","Source"),value:item=>item.source_type,format:value=>t(`enums.source.${value}`,value)},
 {key:"from",label:t("filters.dateFrom","From"),value:item=>item.posting_date,date:"from"},
 {key:"to",label:t("filters.dateTo","To"),value:item=>item.posting_date,date:"to"}
], item=>[item.entry_number,item.memo,item.book_code,item.source_external_id].join(" "), { ...source, placeholder: t("filters.search.journals", "Search records"), onItems: setItems }, <Button type="button" className="gap-2" disabled={!canManage} onClick={() => void openManualJournal()}><Plus size={15} aria-hidden="true"/>{t("journalsPage.newButton", "Manual journal")}</Button>);
  const loading = recordFilters.pager.loading;
  const load = recordFilters.pager.refresh;

  const historyRemote = React.useMemo(() => ({
    key: `journal-history:${organizationId}:${tab}`,
    enabled: tab === "history",
    initialApplied: {},
    fetchPage: async (filters: Record<string, string>, cursor?: string, pageSize?: number) => {
      try {
        const { data } = await api.getJournalHistory({
          q: (filters.search || "").trim() || undefined,
          cursor,
          page_size: pageSize,
          include_count: true,
        });
        return {
          items: data.results,
          nextCursor: getCursorFromUrl(data.next),
          totalCount: data.count,
        };
      } catch (cause) {
        throw new Error(apiErrorMessage(cause, t("journalsPage.history.loadError", "Failed to load journal history.")));
      }
    },
    placeholder: t("journalsPage.history.searchPlaceholder", "Search deleted journals"),
    onItems: () => {},
  }), [organizationId, tab, t]);
  const historyFilters = useRecordFilters<JournalAuditEvent>(
    [],
    [],
    item => [item.entry_number, item.journal_entry_id, item.memo, item.actor_name || "", item.reason].join(" "),
    historyRemote,
  );

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

  const deleteJournal = async () => {
    const target = deleteTarget;
    if (!target || deletingId) return;
    try {
      setDeletingId(target.id);
      await api.deleteJournalEntry(target.id, { reason: t("journalsPage.deleteReason", "Deleted from the journals page") });
      setSnackbar({ severity: "success", message: t("journalsPage.deletedSuccess", "Journal deleted and recorded in history.") });
      setDeleteTarget(null);
      await load();
      setTab("history");
    } catch (notificationCause) {
      setSnackbar({ severity: "error", message: apiErrorMessage(notificationCause, t("journalsPage.deleteError", "Failed to delete journal.")) });
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  if (!setupStatus) return <PageSkeleton variant="accounting" rows={6} />;
  if (!setupStatus.operational) return <Card as="section" radius="xl" tone="slate" padding="default" className="space-y-4">
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500"><LockKeyhole size={17} aria-hidden="true"/></span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{t("setupFlow.blockedTitle", "Complete the earlier steps first")}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{t("setupFlow.notActive", "Finish setup before creating accounting entries.")}</p>
      </div>
    </div>
    <Link to="/b/accounting/overview" className="inline-flex min-h-9 w-fit items-center gap-2 rounded-md bg-gray-900 px-3 text-xs font-medium text-white transition-colors hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400">{t("setupFlow.continue", "Continue setup")}<ArrowRight size={14} aria-hidden="true"/></Link>
  </Card>;
  if (loading && !items.length) return <PageSkeleton variant="accounting" rows={6} />;

  const journalRelated = activeJournal ? journalRelatedSource(activeJournal) : null;
  const relatedData = relatedPreview?.data || null;
  const previewCurrency = initialJournal?.currency_code;
  const relatedSettlement = relatedPreview?.kind === "settlement" ? relatedData as SettledEntry | null : null;
  const relatedEntry = relatedPreview?.kind === "entry" ? relatedData as Entry | null : null;

  return (
    <>
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl<"journals" | "history">
            tabs
            id="journal-tabs"
            value={tab}
            onChange={setTab}
            label={t("journalsPage.tabs.label", "Journal views")}
            items={[
              { value: "journals", label: t("journalsPage.tabs.journals", "Journals"), panelId: "journal-list-panel" },
              { value: "history", label: t("journalsPage.tabs.history", "History"), panelId: "journal-history-panel" },
            ]}
          />
        </div>

        {tab === "journals" ? <div role="tabpanel" id="journal-list-panel" aria-labelledby="journal-tabs-journals" className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ key, value, Icon, detail }) => <AccountingMetricCard key={key} label={t(`journalsPage.metrics.${key}`, key)} value={value.toLocaleString(language)} Icon={Icon} hint={detail}/>)}
          </div>

          {recordFilters.pager.error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <span>{recordFilters.pager.error}</span>
            <Button variant="secondary" size="sm" onClick={() => void load()}>{t("redesign.retry", "Retry")}</Button>
          </div> : null}

          {recordFilters.filters}

          <Card as="section" radius="xl" tone="slate" padding="none" title={t("journalsPage.listTitle", "Journal list")}>
            <div className="p-4 sm:p-5">
              <DataTable<JournalEntry> pager={recordFilters.pager} items={recordFilters.rows} editLabel={t("common.edit", "Edit")} emptyLabel={t("journalsPage.empty", "No journals found.")} onInspect={openJournalPreview} columns={[
                { key: "name", label: t("journalsPage.columns.entry", "Entry"), render: item => journalDisplayId(item) },
                { key: "book", label: t("journalsPage.columns.book", "Book"), render: item => item.book_code },
                { key: "source", label: t("journalsPage.columns.source", "Source"), render: item => t(`enums.source.${item.source_type}`, item.source_type) },
                { key: "date", label: t("journalsPage.columns.postingDate", "Posting date"), render: item => item.posting_date },
                { key: "reversal", label: t("journalsPage.columns.reversalDate", "Reversal date"), render: item => item.reversal_date || "\u2014" },
                { key: "lines", label: t("journalsPage.columns.lines", "Lines"), render: item => String(item.lines?.length ?? 0) },
                { key: "status", label: t("table.status", "Status"), render: item => <AccountingStatus active={item.status === "posted"} label={t(`enums.status.${item.status}`, item.status)} /> }
              ]} actions={item => item.status === "posted" && item.source_type === "manual" ? <div className="flex items-center justify-end gap-1">
                <Button type="button" variant="secondary" size="sm" disabled={!canManage || reversingId === item.id || deletingId === item.id} onClick={() => void reverseJournal(item.id)}>{reversingId === item.id ? t("journalsPage.actions.reversing", "Reversing...") : t("journalsPage.actions.reverse", "Reverse")}</Button>
                <Button type="button" variant="secondary" size="iconSm" aria-label={t("journalsPage.actions.delete", "Delete")} title={t("journalsPage.actions.delete", "Delete")} disabled={!canManage || reversingId === item.id || deletingId === item.id} onClick={() => setDeleteTarget(item)}><Trash2 size={13} aria-hidden="true"/></Button>
              </div> : null} />
            </div>
          </Card>
        </div> : <div role="tabpanel" id="journal-history-panel" aria-labelledby="journal-tabs-history" className="space-y-5">
          <p className="max-w-2xl text-xs leading-5 text-slate-500">{t("journalsPage.history.description", "Deleted journals are kept here with the person, time and lines involved.")}</p>

          {historyFilters.pager.error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            <span>{historyFilters.pager.error}</span>
            <Button variant="secondary" size="sm" onClick={() => void historyFilters.pager.refresh()}>{t("redesign.retry", "Retry")}</Button>
          </div> : null}

          {historyFilters.filters}

          <Card as="section" radius="xl" tone="slate" padding="none" title={t("journalsPage.history.title", "Deletion history")}>
            <div className="p-4 sm:p-5">
              <DataTable<JournalAuditEvent>
                pager={historyFilters.pager}
                items={historyFilters.rows}
                emptyLabel={t("journalsPage.history.empty", "No deleted journals yet.")}
                onInspect={setHistoryPreview}
                columns={[
                  { key: "deleted", label: t("journalsPage.history.columns.deletedAt", "Deleted at"), render: item => new Date(item.created_at).toLocaleString(language) },
                  { key: "entry", label: t("journalsPage.columns.entry", "Entry"), render: item => journalDisplayId({ id: item.journal_entry_id, entry_number: item.entry_number, posting_date: item.posting_date }) },
                  { key: "book", label: t("journalsPage.columns.book", "Book"), render: item => item.book_code },
                  { key: "posting", label: t("journalsPage.columns.postingDate", "Posting date"), render: item => item.posting_date },
                  { key: "actor", label: t("journalsPage.history.columns.actor", "Deleted by"), render: item => item.actor_name || "\u2014" },
                  { key: "reason", label: t("journalsPage.history.columns.reason", "Reason"), render: item => item.reason || "\u2014" },
                  { key: "lines", label: t("journalsPage.columns.lines", "Lines"), render: item => String(item.line_count) },
                  { key: "total", label: t("journalsPage.history.columns.total", "Total"), render: item => formatCurrency(item.total_debit_minor / 100, item.currency_code) },
                ]}
              />
            </div>
          </Card>
        </div>}

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
      >
        {lookupsLoading ? (
          <div className="settings-modal-scroll"><PageSkeleton variant="panel" rows={5} /></div>
        ) : (
          <SidePanelForm recordLabel={t("footer.journal", "Journal")} recordName={form.memo} onSubmit={submit} className="space-y-5 pb-4 md:pb-6">
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("journalsPage.modal.headerSection", "Journal header")}</div>
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

            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("journalsPage.modal.linesSection", "Journal lines")}</div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="gap-2"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        lines: [...prev.lines, { account_id: "", debit: "", credit: "", memo: "" }],
                      }))
                    }
                  >
                    <Plus size={14} aria-hidden="true"/>
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
                            variant="secondary"
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

            <section className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("journalsPage.modal.debitTotal", "Debit total")}</div>
                  <div className="mt-1 text-[13px] font-medium text-gray-900">{(totals.debit / 100).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("journalsPage.modal.creditTotal", "Credit total")}</div>
                  <div className="mt-1 text-[13px] font-medium text-gray-900">{(totals.credit / 100).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("journalsPage.modal.balance", "Balance")}</div>
                  <div className="mt-1 text-[13px] font-medium text-gray-900">
                    {balanced ? t("journalsPage.modal.balanced", "Balanced") : t("journalsPage.modal.unbalanced", "Unbalanced")}
                  </div>
                </div>
              </div>
            </section>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t("common.saving", "Saving...") : t("journalsPage.modal.createJournal", "Create journal")}
              </Button>
            </div>
          </SidePanelForm>
        )}
      </SidePanel>
      <SidePanel
        isOpen={previewStack.length > 0}
        onClose={closePreview}
        stackDepth={Math.max(0, previewStack.length - 1)}
        title={activeJournal ? t("redesign.journalDetails", "Journal details") : relatedData?.description || financeT("entryDetails")}
        recordLabel={activeJournal ? t("footer.journal", "Journal") : undefined}
        recordName={activeJournal ? journalDisplayId(activeJournal) : undefined}
        footer={!activeJournal ? <Button type="button" variant="secondary" onClick={closePreview}>{t("journalsPage.backToJournal", "Back")}</Button> : undefined}
      >
        <motion.div
          key={topPreview?.kind === "journal" ? journalDisplayId(topPreview.journal) : topPreview ? `${topPreview.kind}:${topPreview.id}` : "closed"}
          initial={{ opacity: 0, x: reduced ? 0 : 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: reduced ? 0 : 0.18, ease: "easeOut" }}
          className="space-y-5"
        >
        {activeJournal && <div className="space-y-6">
          <SidePanelDetails fields={[
            { label: t("journalsPage.columns.book", "Book"), value: activeJournal.book_code },
            { label: t("journalsPage.columns.status", "Status"), value: t(`enums.status.${activeJournal.status}`, activeJournal.status) },
            { label: t("journalsPage.columns.postingDate", "Posting date"), value: activeJournal.posting_date },
            { label: t("journalsPage.columns.reversalDate", "Reversal date"), value: activeJournal.reversal_date || "-" },
            { label: t("common.currency", "Currency"), value: activeJournal.currency_code },
            { label: journalRelated?.kind === "settlement" ? t("journalsPage.relatedSettlement", "Related settlement") : t("journalsPage.relatedEntry", "Related entry"), value: journalRelated
              ? <button type="button" onClick={() => pushRelatedPreview(journalRelated.kind, journalRelated.id)} className="max-w-full break-all text-left font-mono text-[11px] font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-950">{journalRelated.id}</button>
              : "—" },
          ]}/>
          {activeJournal.memo && <p className="text-[13px] leading-6 text-gray-600">{activeJournal.memo}</p>}
          <div className="rounded-lg border border-slate-200">
            <table className="w-full table-fixed border-collapse text-xs">
              <thead className="bg-slate-50/80"><tr className="border-b border-slate-200">
                <th scope="col" className="w-[52%] px-3 py-2 text-left text-[11px] font-medium text-slate-500">{t("redesign.ledgerAccount", "Ledger account")}</th>
                <th scope="col" className="w-[24%] px-3 py-2 text-right text-[11px] font-medium text-slate-500">{t("common.balances.debit", "Debit")}</th>
                <th scope="col" className="w-[24%] px-3 py-2 text-right text-[11px] font-medium text-slate-500">{t("common.balances.credit", "Credit")}</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {activeJournal.lines.map(line => <tr key={line.line_no} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-3 py-2"><div className="flex min-w-0 items-center gap-2"><span className="shrink-0 font-mono text-[10px] text-slate-400">{line.account_code}</span><span className="truncate text-slate-700">{line.account_name}</span></div></td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{line.debit_minor ? formatCurrency(line.debit_minor / 100, activeJournal.currency_code) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{line.credit_minor ? formatCurrency(line.credit_minor / 100, activeJournal.currency_code) : "—"}</td>
                </tr>)}
              </tbody>
              <tfoot><tr className="border-t border-slate-200 bg-slate-50/80">
                <td className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">{t("redesign.total", "Total")}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{formatCurrency(activeJournal.lines.reduce((sum, line) => sum + line.debit_minor, 0) / 100, activeJournal.currency_code)}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{formatCurrency(activeJournal.lines.reduce((sum, line) => sum + line.credit_minor, 0) / 100, activeJournal.currency_code)}</td>
              </tr></tfoot>
            </table>
          </div>
          <p className="text-xs leading-5 text-gray-500">{t("redesign.source", "Source")}: {t(`enums.source.${activeJournal.source_type}`, activeJournal.source_type)}</p>
        </div>}
        {!activeJournal && relatedPreview?.loading && <p role="status" className="py-6 text-xs text-gray-500">{t("journalsPage.relatedLoading", "Loading related entry…")}</p>}
        {!activeJournal && relatedPreview?.error && <div role="alert" className="space-y-3 text-xs text-red-700">
          <p>{relatedPreview.error}</p>
          <Button type="button" size="sm" variant="secondary" onClick={() => setRelatedRetry(value => value + 1)}>{t("journalsPage.relatedRetry", "Try again")}</Button>
        </div>}
        {!activeJournal && relatedData && <div className="space-y-5">
          {relatedData.description && <p className="text-[13px] leading-6 text-slate-600">{relatedData.description}</p>}
          <SidePanelDetails fields={relatedSettlement ? [
            { label: financeT("amount"), value: formatCurrency(Number(relatedSettlement.amount), previewCurrency) },
            { label: financeT("valueDate"), value: relatedSettlement.value_date },
            { label: financeT("bank"), value: relatedSettlement.bank ? [relatedSettlement.bank.institution, relatedSettlement.bank.account_number].filter(Boolean).join(" · ") : "—" },
            { label: financeT("observation"), value: relatedSettlement.observation || "—" },
            { label: financeT("notes"), value: relatedSettlement.notes || "—" },
            { label: t("journalsPage.relatedId", "ID"), value: <span className="font-mono text-[11px]">{relatedSettlement.external_id}</span> },
          ] : relatedEntry ? [
            { label: financeT("amount"), value: formatCurrency(Number(relatedEntry.amount), previewCurrency) },
            { label: financeT("dueDate"), value: relatedEntry.due_date },
            { label: financeT("observation"), value: relatedEntry.observation || "—" },
            { label: financeT("notes"), value: relatedEntry.notes || "—" },
            { label: t("journalsPage.relatedId", "ID"), value: <span className="font-mono text-[11px]">{relatedEntry.id}</span> },
          ] : []}/>
        </div>}
        </motion.div>
      </SidePanel>
      <SidePanel
        isOpen={!!historyPreview}
        onClose={() => setHistoryPreview(null)}
        title={t("journalsPage.history.previewTitle", "Deleted journal")}
      >
        {historyPreview ? <div className="space-y-6">
          <SidePanelDetails fields={[
            { label: t("journalsPage.columns.entry", "Entry"), value: journalDisplayId({ id: historyPreview.journal_entry_id, entry_number: historyPreview.entry_number, posting_date: historyPreview.posting_date }) },
            { label: t("journalsPage.columns.book", "Book"), value: historyPreview.book_code },
            { label: t("journalsPage.columns.postingDate", "Posting date"), value: historyPreview.posting_date },
            { label: t("journalsPage.history.columns.deletedAt", "Deleted at"), value: new Date(historyPreview.created_at).toLocaleString(language) },
            { label: t("journalsPage.history.columns.actor", "Deleted by"), value: historyPreview.actor_name || "\u2014" },
            { label: t("journalsPage.history.columns.reason", "Reason"), value: historyPreview.reason || "\u2014" },
            { label: t("common.currency", "Currency"), value: historyPreview.currency_code },
          ]}/>
          {historyPreview.memo && <p className="text-[13px] leading-6 text-gray-600">{historyPreview.memo}</p>}
          <div className="rounded-lg border border-slate-200">
            <table className="w-full table-fixed border-collapse text-xs">
              <thead className="bg-slate-50/80"><tr className="border-b border-slate-200">
                <th scope="col" className="w-[52%] px-3 py-2 text-left text-[11px] font-medium text-slate-500">{t("redesign.ledgerAccount", "Ledger account")}</th>
                <th scope="col" className="w-[24%] px-3 py-2 text-right text-[11px] font-medium text-slate-500">{t("common.balances.debit", "Debit")}</th>
                <th scope="col" className="w-[24%] px-3 py-2 text-right text-[11px] font-medium text-slate-500">{t("common.balances.credit", "Credit")}</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {historyPreview.snapshot.lines.map(line => <tr key={line.line_no}>
                  <td className="px-3 py-2"><div className="flex min-w-0 items-center gap-2"><span className="shrink-0 font-mono text-[10px] text-slate-400">{line.account_code}</span><span className="truncate text-slate-700">{line.account_name}</span></div></td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{line.debit_minor ? formatCurrency(line.debit_minor / 100, historyPreview.currency_code) : "\u2014"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">{line.credit_minor ? formatCurrency(line.credit_minor / 100, historyPreview.currency_code) : "\u2014"}</td>
                </tr>)}
              </tbody>
              <tfoot><tr className="border-t border-slate-200 bg-slate-50/80">
                <td className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">{t("redesign.total", "Total")}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{formatCurrency(historyPreview.total_debit_minor / 100, historyPreview.currency_code)}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{formatCurrency(historyPreview.total_credit_minor / 100, historyPreview.currency_code)}</td>
              </tr></tfoot>
            </table>
          </div>
        </div> : null}
      </SidePanel>
      <ConfirmToast
        open={!!deleteTarget}
        busy={!!deletingId}
        variant="danger"
        text={t("journalsPage.deleteConfirm", "Delete journal {{entry}}? This permanently removes the posting; the action will remain in history.", { entry: deleteTarget ? journalDisplayId(deleteTarget) : "" })}
        confirmLabel={t("journalsPage.actions.delete", "Delete")}
        cancelLabel={t("common.cancel", "Cancel")}
        onCancel={() => { if (!deletingId) setDeleteTarget(null); }}
        onConfirm={() => void deleteJournal()}
      />
    </>
  );
};

export default AccountingJournalsPage;
