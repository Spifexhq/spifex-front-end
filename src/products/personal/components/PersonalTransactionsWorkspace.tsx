import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, RotateCcw, Trash2, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAuthContext } from "@/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { getCursorFromUrl } from "@/lib/list";
import { formatCurrency } from "@/lib";
import type { EntryFilters } from "@/models/components/filterBar";
import type { BankAccount } from "@/models/settings/banking";
import FinancialActivityPanel from "@/components/FinancialActivityPanel";
import FinancialActivityTable, { type FinancialActivityRecord, type FinancialActivityRow } from "@/shared/financial/components/FinancialActivityTable";
import SettlementModal from "@/shared/financial/settlements/SettlementModal";
import type { SettlementTarget } from "@/shared/financial/settlements/SettlementModal";
import Button from "@/shared/ui/Button";
import SelectionBar from "@/shared/ui/SelectionBar";
import { usePersonalReadRevision } from "../hooks/usePersonalReadRevision";
import { personalApi } from "../services/api";
import { allPersonal, readonlyWorkspace } from "../services/personalData";
import type { PersonalAccount, PersonalRecord, PersonalSettledActivity, PersonalTransaction } from "../types";
import PersonalRecordDialog from "./PersonalRecordDialog";
import PersonalRecordPreview from "./PersonalRecordPreview";
import PersonalSettledActivityPreview from "./PersonalSettledActivityPreview";
import { usePersonalAccess } from "../access/PersonalAccessProvider";
import { PERSONAL_PERMISSION } from "../access/permissions";

type Basis = "outstanding" | "settled";
export type { Basis };
type FilterQuery = Record<string, string>;
type TableItem = PersonalTransaction | PersonalSettledActivity;
const dec = (value: unknown) => Number(value || 0) || 0;
const transferRow = (row: PersonalSettledActivity) => row.kind === "transfer";

function queryFromFilters(filters: EntryFilters, activityKind?: string): FilterQuery {
  return {
    ...(filters.description ? { search: filters.description } : {}),
    ...(filters.start_date ? { start_date: filters.start_date } : {}),
    ...(filters.end_date ? { end_date: filters.end_date } : {}),
    ...(activityKind ? { kind: activityKind } : filters.tx_type ? { kind: filters.tx_type === "credit" ? "income" : "expense" } : {}),
    ...(filters.amount_min ? { amount_min: filters.amount_min } : {}),
    ...(filters.amount_max ? { amount_max: filters.amount_max } : {}),
    ...(filters.bank_id?.length ? { bank_id: filters.bank_id.join(",") } : {}),
    ...(filters.cashflow_category_id?.length ? { cashflow_category_id: filters.cashflow_category_id.join(",") } : {}),
  };
}

function normalizeRows(items: TableItem[]): FinancialActivityRecord<TableItem>[] {
  return items.map(item => {
    if ("value_date" in item) {
      const transfer = transferRow(item);
      const direction = transfer ? "transfer" : item.kind === "income" ? "credit" : "debit";
      return {
        id: `${transfer ? "transfer" : "settlement"}-${item.id}`,
        description: item.description,
        date: item.value_date,
        amount: transfer ? dec(item.amount) : direction === "credit" ? dec(item.amount) : -dec(item.amount),
        balance: item.running_balance == null ? null : dec(item.running_balance),
        direction,
        installmentIndex: transfer ? null : item.installment_index,
        installmentCount: transfer ? null : item.installment_count,
        bankName: transfer ? `${item.source_bank_name || ""} → ${item.destination_bank_name || ""}` : item.bank_name,
        activityKind: transfer ? "transfer" : "settlement",
        source: item,
      };
    }
    const transaction = item as PersonalTransaction;
    return {
      id: transaction.id,
      description: transaction.description,
      date: transaction.due_date,
      amount: transaction.kind === "income" ? dec(transaction.open_amount) : -dec(transaction.open_amount),
      balance: transaction.running_balance == null ? null : dec(transaction.running_balance),
      direction: transaction.kind === "income" ? "credit" : "debit",
      installmentIndex: transaction.installment_index,
      installmentCount: transaction.installment_count,
      activityKind: "entry",
      source: transaction,
    };
  });
}

function SelectionActions({ basis, items, currency, onClear, onSettle, onDelete, onReverse, busy, t }: {
  basis: Basis; items: FinancialActivityRow<TableItem>[]; currency: string; onClear(): void;
  onSettle?(ids: string[]): void; onDelete?(rows: PersonalTransaction[]): Promise<void>; onReverse?(rows: PersonalSettledActivity[]): Promise<void>; busy: boolean;
  t(key: string, options?: Record<string, unknown>): string;
}) {
  const [confirm, setConfirm] = useState<"delete" | "reverse" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const reduced = useReducedMotion();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const bodyCollapsed = isMobile && collapsed;
  const bodyId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const deleteRef = useRef<HTMLButtonElement>(null);
  const reverseRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef<"delete" | "reverse" | null>(null);
  const records = items.flatMap(row => row.record ? [row.record] : []);
  const totals = useMemo(() => records.reduce((result, row) => {
    // Transfers move money between accounts; they are neither receipts nor payments.
    if (row.activityKind === "transfer") return result;
    const amount = Math.round(row.amount * 100);
    if (amount >= 0) result.income += amount;
    else result.expense -= amount;
    return result;
  }, { income: 0, expense: 0 }), [records]);
  const pendingEntries = records.flatMap(row => row.activityKind === "entry" && "open_amount" in row.source && row.source.status === "pending" ? [row.source] : []);
  const canDeleteSelection = !!onDelete && pendingEntries.length === records.length;
  const selectionKey = records.map(row => row.id).sort().join("|");

  useEffect(() => {
    setConfirm(null);
    setError("");
  }, [selectionKey]);

  const cancel = useCallback(() => {
    if (pending || busy || !confirm) return;
    if (bodyCollapsed) {
      restoreFocus.current = null;
      setConfirm(null);
      setError("");
      handleRef.current?.focus({ preventScroll: true });
      return;
    }
    restoreFocus.current = confirm;
    setConfirm(null);
    setError("");
  }, [bodyCollapsed, busy, confirm, pending]);

  useEffect(() => { if (!isMobile) setCollapsed(false); }, [isMobile]);
  useEffect(() => { if (!records.length) setCollapsed(false); }, [records.length]);

  // Zero-height content still contains focusable buttons. Make the closed body inert.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    if (bodyCollapsed) body.setAttribute("inert", "");
    else body.removeAttribute("inert");
  }, [bodyCollapsed]);

  // The shared table clears the whole selection from a window-level Escape
  // listener. While the confirmation is open, this document listener runs
  // first and keeps Escape scoped to the confirmation.
  useEffect(() => {
    if (!confirm) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || pending || busy) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [cancel, confirm, pending, busy]);

  const bodyTransition = reduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 36, mass: 0.7 };

  return <SelectionBar open={records.length > 0} label={t("financeEntries:selectionActions")} className="max-w-3xl">

    {isMobile && <button ref={handleRef} type="button" disabled={pending || busy} aria-expanded={!collapsed} aria-controls={bodyId} aria-label={t(collapsed ? "financeEntries:expandActions" : "financeEntries:collapseActions")} onClick={() => setCollapsed(value => !value)} className="group -mt-1 mb-1.5 flex min-h-9 w-full flex-col items-center justify-center gap-1.5 rounded-lg py-1 text-gray-500 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50">
      <span aria-hidden className="h-1 w-9 rounded-full bg-gray-200 transition-colors group-hover:bg-gray-300"/>
      <span aria-hidden className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em]">{t(collapsed ? "financeEntries:expandActions" : "financeEntries:collapseActions")}<motion.span animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: reduced ? 0 : .2 }} className="inline-flex"><ChevronDown size={13} aria-hidden="true" /></motion.span></span>
    </button>}

    <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-gray-900">{t("financeEntries:selected", { count: records.length })}</p><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500"><span>{t("financeEntries:income")} <b className="font-medium text-emerald-700">{formatCurrency(totals.income / 100, currency)}</b></span><span>{t("financeEntries:expense")} <b className="font-medium text-rose-700">{formatCurrency(totals.expense / 100, currency)}</b></span><span>{t("financeEntries:net")} <b className="font-medium text-gray-900">{formatCurrency((totals.income - totals.expense) / 100, currency)}</b></span></div></div><button type="button" disabled={busy} aria-label={t("financeEntries:clearSelection")} title={t("financeEntries:clearSelection")} onClick={onClear} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-50 hover:text-gray-800"><X size={15} aria-hidden="true" /></button></div>

    <motion.div id={bodyId} ref={bodyRef} initial={false} animate={bodyCollapsed ? { height: 0, opacity: 0 } : { height: "auto", opacity: 1 }} transition={bodyTransition} className="overflow-hidden" aria-hidden={bodyCollapsed || undefined}>
      <AnimatePresence mode="wait" initial={false}>
        {confirm ? <motion.div key="confirm" initial={{opacity:0,y:reduced?0:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced?0:-4}} transition={{duration:reduced?0:.15}} role="group" aria-label={confirm === "delete" ? t("personal:deleteSelectedConfirm", { count: pendingEntries.length }) : t("personal:reverseActivityConfirm", { count: records.length })} onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancel(); } }} onAnimationComplete={() => { if (!pending && !bodyCollapsed) cancelRef.current?.focus({ preventScroll: true }); }} className="mt-3 space-y-3 border-t border-gray-100 pt-3">
          <p role="status" className="text-xs leading-5 text-gray-700">{confirm === "delete" ? t("personal:deleteSelectedConfirm", { count: pendingEntries.length }) : t("personal:reverseActivityConfirm", { count: records.length })}</p>
          <div className="flex flex-wrap justify-end gap-2"><Button ref={cancelRef} size="sm" variant="outline" disabled={pending || busy} onClick={cancel}>{t("financeEntries:cancel")}</Button><Button size="sm" variant="danger" disabled={pending || busy} isLoading={pending} onClick={async () => { setPending(true); setError(""); try { if (confirm === "delete") await onDelete?.(pendingEntries); else await onReverse?.(records.flatMap(row => "value_date" in row.source ? [row.source] : [])); setConfirm(null); onClear(); } catch (cause) { setError(cause instanceof Error ? cause.message : t("personal:error")); } finally { setPending(false); } }} className="gap-1.5">{confirm === "delete" ? <Trash2 size={13} aria-hidden="true" /> : <RotateCcw size={13} aria-hidden="true" />} {confirm === "delete" ? t("financeEntries:delete") : t("personal:reverseActivity")}</Button></div>
        </motion.div> : <motion.div key="actions" initial={{opacity:0,y:reduced?0:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced?0:-4}} transition={{duration:reduced?0:.15}} onAnimationComplete={() => { if (!restoreFocus.current) return; const target = restoreFocus.current === "delete" ? deleteRef.current : reverseRef.current; restoreFocus.current = null; target?.focus({ preventScroll: true }); }} className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3">
          {basis === "outstanding" && onSettle && <Button size="sm" variant="outlineBlack" disabled={busy} onClick={() => onSettle(records.map(row => row.id))} className="gap-1.5"><Check size={13} aria-hidden="true" />{t("financeEntries:settle")}</Button>}
          {basis === "outstanding" && onDelete && <Button ref={deleteRef} size="sm" variant="outline" disabled={busy || !canDeleteSelection} onClick={() => { setError(""); setConfirm("delete"); }} className="gap-1.5"><Trash2 size={13} aria-hidden="true" />{t("financeEntries:delete")}</Button>}
          {basis === "settled" && onReverse && <Button ref={reverseRef} size="sm" variant="outline" disabled={busy} onClick={() => { setError(""); setConfirm("reverse"); }} className="gap-1.5"><RotateCcw size={13} aria-hidden="true" />{t("personal:reverseActivity")}</Button>}
        </motion.div>}
      </AnimatePresence>
      {error && <p className="w-full text-right text-xs text-rose-700" role="alert">{error}</p>}
    </motion.div>
  </SelectionBar>;
}

function ActivityTable({ basis, items, loading, mutating, error, pager, currency, readOnly, onInspect, onEdit, onSettle, onDeleted, onSelectionBusy }: {
  basis: Basis; items: TableItem[]; loading: boolean; mutating: boolean; error: string | null;
  pager: ReturnType<typeof useCursorPager<TableItem>>; currency: string; readOnly: boolean;
  onInspect(item: TableItem): void; onEdit(item: PersonalTransaction): void; onSettle(item: PersonalTransaction[]): void;
  onDeleted(): void; onSelectionBusy(busy: boolean): void;
}) {
  const { t, i18n } = useTranslation(["personal", "financeEntries"]);
  const access = usePersonalAccess();
  const settled = basis === "settled";
  const canSettle = !settled && !readOnly && access.can(PERSONAL_PERMISSION.settleTransaction);
  const canReverse = settled && !readOnly && (access.can(PERSONAL_PERMISSION.reverseSettlement) || access.can(PERSONAL_PERMISSION.deleteTransfer));
  const canDeletePending = !settled && !readOnly && access.can(PERSONAL_PERMISSION.deleteTransaction);
  const canSelect = canSettle || canReverse || canDeletePending;
  const pagerAdapter = { ...pager, canNext: pager.canNext, canPrev: pager.canPrev };
  const reverseSelected = useCallback(async (selected: PersonalSettledActivity[]) => {
    if (!selected.length) throw new Error(t("personal:reverseActivityError"));
    onSelectionBusy(true);
    try {
      const results = await Promise.allSettled(selected.map(row => row.transfer_id
        ? personalApi.remove("transfers", row.transfer_id)
        : row.entry_id ? personalApi.reverseSettlement(row.entry_id, row.id) : Promise.reject(new Error(t("personal:error")))));
      const failures = results.filter(result => result.status === "rejected");
      if (results.some(result => result.status === "fulfilled")) {
        await pager.refresh();
        await onDeleted();
      }
      if (failures.length) throw new Error(t("reverseActivityError"));
    } finally { onSelectionBusy(false); }
  }, [onDeleted, onSelectionBusy, pager, t]);
  const deleteSelected = useCallback(async (selected: PersonalTransaction[]) => {
    if (!selected.length || selected.some(row => row.status !== "pending")) throw new Error(t("personal:deleteSelectedError"));
    onSelectionBusy(true);
    try {
      await personalApi.deleteTransactionsBulk(selected.map(row => row.id));
      await pager.refresh();
      await onDeleted();
    } finally { onSelectionBusy(false); }
  }, [onDeleted, onSelectionBusy, pager, t]);
  const onSelection = useCallback(({ items, clear }: { ids: string[]; items: FinancialActivityRow<TableItem>[]; clear(): void }) => <SelectionActions
    basis={basis} items={items} currency={currency} onClear={clear} busy={loading || mutating} t={t}
    onSettle={canSettle ? ids => {
      const byId = new Map(items.flatMap(row => row.record ? [[row.id, row.record.source] as const] : []));
      onSettle(ids.flatMap(id => {
        const item = byId.get(id);
        return item && "open_amount" in item ? [item as PersonalTransaction] : [];
      }));
    } : undefined}
    onDelete={canDeletePending ? deleteSelected : undefined}
    onReverse={canReverse ? reverseSelected : undefined}
  />, [basis, canDeletePending, canReverse, canSettle, currency, deleteSelected, loading, mutating, onSettle, reverseSelected, t]);
  const rowAdapters = normalizeRows(items);
  const secondColumnLabel = t(settled ? "personal:bank_name" : "personal:category_name");
  const renderSecondary = (record: FinancialActivityRecord<TableItem>) => {
    if (record.activityKind === "entry" && "category_name" in record.source) return record.source.category_name || <span className="text-gray-400">∅</span>;
    return record.bankName || ("bank_name" in record.source ? record.source.bank_name : null) || <span className="text-gray-400">∅</span>;
  };
  const inspect = (row: TableItem) => onInspect(row);
  const edit = (row: TableItem) => { if (!settled) onEdit(row as PersonalTransaction); };
  const deleteOne = async (record: TableItem) => {
    if (settled) {
      const activity = record as PersonalSettledActivity;
      if (activity.transfer_id) await personalApi.remove("transfers", activity.transfer_id);
      else if (activity.entry_id) await personalApi.reverseSettlement(activity.entry_id, activity.id);
      return;
    }
    await personalApi.remove("transactions", (record as PersonalTransaction).id);
  };
  return <FinancialActivityTable
    records={rowAdapters} newestFirst={settled} currency={currency} locale={i18n.language}
    emptyLabel={t(settled ? "personal:settledEmpty" : "personal:outstandingEmpty")}
    secondColumnLabel={secondColumnLabel} renderSecondColumn={renderSecondary} pager={pagerAdapter}
    busy={loading} error={error} mutating={loading || mutating} canSelect={canSelect} canDelete={settled ? canReverse : canDeletePending}
    canEdit={!settled && !readOnly && access.can(PERSONAL_PERMISSION.changeTransaction)} editLabel={t("personal:edit")}
    rowCanDelete={record => settled
      ? (record.source.kind === "transfer" ? access.canUse(PERSONAL_PERMISSION.deleteTransfer) : access.canUse(PERSONAL_PERMISSION.reverseSettlement))
      : ("status" in record.source && record.source.status === "pending")}
    onInspect={inspect}
    onEdit={row => { if ("open_amount" in row) edit(row); }}
    onDelete={deleteOne} onDeleted={onDeleted}
    onSelection={onSelection} onEndReached={() => { if (pager.canNext && !pager.loading && !pager.error) void pager.next(); }}
    loadMore={pager.loading && !!pager.items.length} onRetry={() => void pager.refresh()}
  />;
}

export default function PersonalTransactionsWorkspace({ basis = "outstanding" }: { basis?: Basis }) {
  const { t } = useTranslation("personal");
  const auth = useAuthContext();
  const access = usePersonalAccess();
  const workspace = auth.organization?.organization;
  const currency = workspace?.currency || "EUR";
  const readOnly = readonlyWorkspace(workspace?.lifecycle);
  const [params, setParams] = useSearchParams();
  const urlKind = params.get("kind");
  const activityKind = basis === "settled" && ["income", "expense", "transfer"].includes(urlKind || "") ? urlKind || undefined : undefined;
  const [filters, setFilters] = useState<EntryFilters>({ settlement_status: basis === "settled", bank_id: [], cashflow_category_id: [] });
  const [revision, setRevision] = useState(0);
  const [panelRevision, setPanelRevision] = useState(0);
  const [entryPreview, setEntryPreview] = useState<PersonalTransaction | null>(null);
  const [activityPreview, setActivityPreview] = useState<PersonalSettledActivity | null>(null);
  const [dialog, setDialog] = useState<{ kind: "transactions" | "transfer"; record?: PersonalRecord | null; transactionKind?: "income" | "expense" } | null>(null);
  const [selected, setSelected] = useState<PersonalTransaction[]>([]);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const readRevision = usePersonalReadRevision();
  const query = useMemo(() => queryFromFilters(filters, activityKind), [activityKind, filters]);
  const pager = useCursorPager<TableItem>(async (cursor, pageSize) => {
    const page = cursor || "1";
    const response = basis === "settled"
      ? await personalApi.settledActivity({ ...query, page, page_size: pageSize })
      : await personalApi.list<PersonalTransaction>("transactions", { ...query, basis: "outstanding", page, page_size: pageSize });
    return { items: response.data.results, nextCursor: response.data.next ? getCursorFromUrl(response.data.next) : undefined, totalCount: response.data.count };
  }, { accumulate: true, initialPageSize: 100, deps: [basis, query, workspace?.id, workspace?.lifecycle, readRevision, revision] });
  const { items: _unused, ...rest } = pager;
  void _unused;
  const pagerForTable = { ...rest, items: pager.items };
  const personalBanks = useMemo<BankAccount[]>(() => accounts.map(account => ({
    id: account.id, institution: account.institution || account.name, account_type: account.account_type,
    currency: account.currency, branch: account.branch || "", account_number: account.account_number || "",
    iban: account.iban || "", initial_balance: account.initial_balance, current_balance: account.current_balance,
    consolidated_balance: account.consolidated_balance || account.balance, is_active: account.is_active,
  })), [accounts]);

  useEffect(() => {
    let alive = true;
    setAccountsLoading(true);
    void allPersonal<PersonalAccount>("accounts").then(value => { if (alive) setAccounts(value); }).finally(() => { if (alive) setAccountsLoading(false); });
    return () => { alive = false; };
  }, [workspace?.id]);
  useEffect(() => { setFilters(previous => ({ ...previous, settlement_status: basis === "settled" })); }, [basis]);
  const applyFilters = useCallback(({ filters: next }: { filters: EntryFilters }) => {
    if (next.tx_type) {
      const value = new URLSearchParams(params);
      value.delete("kind");
      setParams(value, { replace: true });
    }
    setFilters({ ...next, settlement_status: basis === "settled" });
  }, [basis, params, setParams]);
  const refresh = useCallback(() => { setRevision(value => value + 1); setPanelRevision(value => value + 1); }, []);
  const refreshPanel = useCallback(() => setPanelRevision(value => value + 1), []);
  const reverseActivity = useCallback(async (item: PersonalSettledActivity) => {
    if (item.transfer_id) await personalApi.remove("transfers", item.transfer_id);
    else if (item.entry_id) await personalApi.reverseSettlement(item.entry_id, item.id);
    else throw new Error(t("error"));
    refresh();
  }, [refresh, t]);
  const edit = (item: PersonalTransaction) => setDialog({ kind: "transactions", record: item });
  const openSettlement = useCallback((items: PersonalTransaction[]) => {
    if (!items.length) { setBusy(false); return; }
    setSelected(items);
    setBusy(false);
    setSettlementOpen(true);
  }, []);
  useEffect(() => {
    const create = params.get("create");
    if (!create) return;
    if (create === "credit" || create === "debit") setDialog({ kind: "transactions", transactionKind: create === "credit" ? "income" : "expense" });
    if (create === "transfer") setDialog({ kind: "transfer" });
    const next = new URLSearchParams(params);
    next.delete("create");
    setParams(next, { replace: true });
  }, [params, setParams]);
  const inspect = (item: TableItem) => { if ("value_date" in item) setActivityPreview(item); else setEntryPreview(item); };
  const selectedForSettlement = selected.map(item => ({ id: item.id } satisfies SettlementTarget));
  const settlementBanks = { banks: personalBanks, loading: accountsLoading, error: null as string | null };
  const settlementAdapter = useMemo(() => ({
    loadDrafts: async (ids: string[]) => (await personalApi.settlementDrafts(ids)).data,
    settle: async (items: import("@/models/entries/settlements").BulkSettleItem[], atomic: boolean) => (await personalApi.settleBulk(items, atomic)).data,
  }), []);
  return <div className="flex h-full min-h-0 min-w-0 flex-col">
    <h1 className="sr-only">{t(basis === "settled" ? "settledTransactions" : "cashFlow")}</h1>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      <FinancialActivityPanel key={basis} filters={filters} onApply={applyFilters} contextSettlement={basis === "settled"} refreshToken={panelRevision} banksRefreshKey={panelRevision} manageBanksPath="/personal/settings/accounts" excludeObservationFilter>
        <ActivityTable basis={basis} items={pager.items} loading={pager.loading} mutating={busy} error={pager.error} pager={pagerForTable} currency={currency} readOnly={readOnly} onInspect={inspect} onEdit={edit} onSettle={openSettlement} onDeleted={refreshPanel} onSelectionBusy={setBusy}/>
      </FinancialActivityPanel>
    </div>
    <PersonalRecordPreview collection="transactions" record={entryPreview} currency={currency} readOnly={readOnly} onClose={() => setEntryPreview(null)} onEdit={item => edit(item as PersonalTransaction)} onSettle={item => { setEntryPreview(null); openSettlement([item as PersonalTransaction]); }} onContribute={() => {}}/>
    <PersonalSettledActivityPreview item={activityPreview} currency={currency} onClose={() => setActivityPreview(null)} onReverse={!readOnly && (activityPreview?.transfer_id ? access.can(PERSONAL_PERMISSION.deleteTransfer) : access.can(PERSONAL_PERMISSION.reverseSettlement)) ? reverseActivity : undefined}/>
    {dialog && <PersonalRecordDialog key={`${dialog.kind}:${dialog.record?.id || "new"}:${dialog.transactionKind || ""}`} kind={dialog.kind} record={dialog.record} currency={currency} transactionKind={dialog.transactionKind} onClose={() => setDialog(null)} onSaved={refresh}/>}
    <SettlementModal isOpen={settlementOpen} onClose={() => { setSettlementOpen(false); setSelected([]); setBusy(false); }} onSave={() => { setSettlementOpen(false); setSelected([]); setBusy(false); refresh(); }} selectedEntries={selectedForSettlement} banksData={settlementBanks} adapter={settlementAdapter}/>
    {basis === "settled" && busy && <span className="sr-only" role="status">{t("loading")}</span>}
  </div>;
}
