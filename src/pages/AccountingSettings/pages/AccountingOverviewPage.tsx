import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, Landmark, ListTree, Route, Check, Circle, RefreshCw } from "lucide-react";
import { api } from "@/api";
import { getCursorFromUrl } from "@/lib/list";
import type { AccountingBook, BankAccountLedgerMap, CategoryPostingPolicy } from "@/models/settings/accounting";

async function loadCollection<T>(fetchPage: (params: { cursor?: string }) => Promise<{ data: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  do {
    const { data } = await fetchPage({ cursor });
    if (Array.isArray(data)) return [...rows, ...data] as T[];
    const page = data as { results?: T[]; items?: T[]; next?: string } | null;
    rows.push(...(page?.results ?? page?.items ?? []));
    cursor = getCursorFromUrl(page?.next);
    if (cursor && seen.has(cursor)) throw new Error("Repeated pagination cursor");
    if (cursor) seen.add(cursor);
  } while (cursor);
  return rows;
}

export default function AccountingOverviewPage() {
  const { t } = useTranslation("accountingSettings");
  const [data, setData] = useState<{ books: AccountingBook[]; maps: BankAccountLedgerMap[]; policies: CategoryPostingPolicy[] } | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setError(false);
    setData(null);
    Promise.all([
      loadCollection<AccountingBook>((params) => api.getAccountingBooks(params)),
      loadCollection<BankAccountLedgerMap>(() => api.getBankAccountLedgerMaps()),
      loadCollection<CategoryPostingPolicy>(() => api.getCategoryPostingPolicies()),
    ]).then(([books, maps, policies]) => { if (!cancelled) setData({ books, maps, policies }); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [revision]);
  const primaryBooks = data?.books.filter(book => book.is_active && book.is_primary) ?? [];
  const primary = primaryBooks.length === 1 ? primaryBooks[0] : undefined;
  const maps = data?.maps.filter(map => map.is_active && map.book_id === primary?.id) ?? [];
  const policies = data?.policies.filter(policy => policy.status === "active" && policy.book_id === primary?.id && policy.settlement_debit_account_id && policy.settlement_credit_account_id) ?? [];
  const steps = [
    { to: "chart", Icon: ListTree, title: t("redesign.steps.chart", "Organize your accounts"), description: t("redesign.steps.chartDescription", "Group the accounts used to record your business activity."), status: t("redesign.reviewChart", "Review chart"), complete: false },
    { to: "books", Icon: BookOpen, title: t("redesign.steps.books", "Choose your primary book"), description: t("redesign.steps.booksDescription", "Set the book and currency used for automatic entries."), status: primary ? `${primary.name} · ${primary.currency_code}` : t("redesign.needsPrimary", "Choose one active primary book"), complete: !!primary },
    { to: "bank-mappings", Icon: Landmark, title: t("redesign.steps.banks", "Connect bank accounts"), description: t("redesign.steps.banksDescription", "Choose where each bank's movements appear in accounting."), status: t("redesign.mappingCount", "{{count}} active connections in the primary book", { count: maps.length }), complete: maps.length > 0 },
    { to: "posting-policies", Icon: Route, title: t("redesign.steps.rules", "Define category rules"), description: t("redesign.steps.rulesDescription", "Tell Spifex which accounts to use for receipts and payments."), status: t("redesign.policyCount", "{{count}} rules with both settlement accounts", { count: policies.length }), complete: policies.length > 0 },
  ];
  return <div className="space-y-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="mt-2 max-w-2xl text-[13px] leading-6 text-gray-500">{t("redesign.overviewDescription", "Set up how payments become accounting entries, then review the results in your journals.")}</p></div>
      <Link to="/settings/accounting/journals" className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-[13px] font-medium shadow-sm hover:bg-gray-50">{t("redesign.viewJournals", "View journals")}<ArrowRight size={15} /></Link>
    </header>
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white settings-panel" aria-busy={!data && !error}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4"><h3 className="text-sm font-semibold">{t("redesign.setupTitle", "Accounting setup")}</h3><span className="text-xs text-gray-500">{t("redesign.setupHint", "Configuration summary · review every bank and category")}</span></div>
      {error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm text-gray-600">{t("redesign.loadError", "Could not load the setup summary.")}<button onClick={() => setRevision(value => value + 1)} className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2"><RefreshCw size={14} />{t("redesign.retry", "Try again")}</button></div> : steps.map((step, index) => <Link key={step.to} to={`/settings/accounting/${step.to}`} className="group flex items-center gap-4 border-b border-gray-100 px-5 py-5 last:border-0 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-gray-400 settings-panel-heading">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600"><step.Icon size={18} /></span>
        <div className="min-w-0 flex-1"><div className="text-[13px] font-semibold text-gray-900"><span className="mr-2 text-gray-400">0{index + 1}</span>{step.title}</div><p className="mt-1 text-xs leading-5 text-gray-500">{step.description}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">{data ? <>{step.complete ? <Check size={13} /> : <Circle size={11} />}{step.status}</> : <span className="h-3 w-40 animate-pulse rounded bg-gray-100" />}</p></div>
        <ArrowRight size={16} className="shrink-0 text-gray-400 transition-transform group-hover:translate-x-1" />
      </Link>)}
    </section>
    <section className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
      <div className="rounded-lg bg-gray-50 p-5"><h3 className="text-sm font-semibold">{t("redesign.howTitle", "What happens when you pay or receive?")}</h3><div className="my-5 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-700">{[t("redesign.flow.category", "Cashflow category"), t("redesign.flow.rule", "Category rule + bank connection"), t("redesign.flow.journal", "Balanced journal")].map((label, index) => <span key={label} className="inline-flex items-center gap-2">{index > 0 && <ArrowRight size={13} className="text-gray-400" />}<span className="rounded-md border border-gray-200 bg-white px-2.5 py-2">{label}</span></span>)}</div><p className="text-xs leading-6 text-gray-500">{t("redesign.howDescription", "Each actual receipt or payment creates its own accounting record in the active primary book. An expected cashflow entry alone does not post a journal.")}</p></div>
      <div className="py-2"><h3 className="text-sm font-semibold">{t("redesign.reviewTitle", "Review and understand")}</h3>{[{ to: "reconciliation", title: t("redesign.reviewGuide", "Resolve setup questions"), description: t("redesign.reviewGuideDescription", "Find where to fix missing rules and bank connections.") }, { to: "correlation", title: t("redesign.explore", "Explore connections"), description: t("redesign.exploreDescription", "Inspect how your accounting records relate to each other.") }].map(item => <Link key={item.to} to={`/settings/accounting/${item.to}`} className="mt-3 flex items-center justify-between gap-3 rounded-md py-2 hover:bg-gray-50"><div><p className="text-[13px] font-medium">{item.title}</p><p className="mt-1 text-xs leading-5 text-gray-500">{item.description}</p></div><ArrowRight size={15} className="shrink-0 text-gray-400" /></Link>)}</div>
    </section>
  </div>;
}
