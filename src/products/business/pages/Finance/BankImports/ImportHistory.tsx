import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { api } from "@/core/api/requests";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl, fetchAllCursor } from "@/lib/list";
import DataTable from "@/shared/ui/DataTable";
import Input from "@/shared/ui/Input";
import LookupSelect from "./LookupSelect";
import type { BankAccount } from "@/models/settings/banking";
import type { Statement } from "@/models/finance/imports";

export default function ImportHistory({ canDelete, canViewBanks, onError, organization }: { canDelete: boolean; canViewBanks: boolean; onError(cause: unknown): void; organization: string }) {
  const { t, i18n } = useTranslation("statements"), navigate = useNavigate();
  const [search, setSearch] = useState(""), [query, setQuery] = useState("");
  const [bank, setBank] = useState(""), [banks, setBanks] = useState<BankAccount[]>([]);
  const [bankError, setBankError] = useState(false);
  useEffect(() => {
    if (!canViewBanks) return;
    let alive = true;
    void fetchAllCursor<BankAccount>(params => api.getBanks({ cursor: params.cursor })).then(items => { if (alive) setBanks(items); }).catch(() => { if (alive) setBankError(true); });
    return () => { alive = false; };
  }, [organization, canViewBanks]);
  const pager = useCursorPager<Statement>(async (cursor, page_size) => {
    const data = await api.getStatements({ cursor, page_size, q: query, bank, include_count: true });
    return { items: data.results, nextCursor: getCursorFromUrl(data.next), totalCount: data.count };
  }, { deps: [query, organization, bank] });
  return <section className="space-y-4">
    <div className="flex flex-wrap items-start gap-3"><form className="w-full max-w-sm" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); }}><Input size="sm" label={t("workspace.search")} aria-label={t("workspace.search")} placeholder={t("workspace.search")} value={search} onChange={event => { setSearch(event.target.value); if (!event.target.value) setQuery(""); }} /><span className="mt-1 block text-xs text-slate-400">{t("workspace.searchHint")}</span></form>{canViewBanks && !!banks.length && <div className="w-56"><LookupSelect label={t("workspace.bank")} value={bank} items={banks.map(item => ({ id: item.id, label: `${item.institution} · ${item.account_number || item.currency}` }))} onChange={setBank} /></div>}{bank && <button className="self-center text-xs text-slate-500 hover:text-slate-900" onClick={() => setBank("")}>{t("workspace.clear")}</button>}</div>{bankError && <p role="status" className="text-xs text-slate-500">{t("workspace.bankError")}</p>}
    <DataTable items={pager.items} pager={pager} busy={pager.loading} error={pager.error} emptyLabel={t("workspace.empty")} getRowName={item => item.original_filename} onInspect={item => navigate(`/bank-imports/${item.id}`)} onEdit={item => navigate(`/bank-imports/${item.id}`)} editLabel={t("workspace.open")} canDelete={canDelete} onDelete={async item => { await api.deleteStatement(item.id); }} onDeleted={() => void pager.refresh()}
      columns={[
        { key: "name", label: t("workspace.file"), render: item => <span className="font-medium">{item.original_filename}</span> },
        { key: "bank", label: t("workspace.bank"), render: item => item.bank_account_label || t("workspace.notSet") },
        { key: "status", label: t("workspace.status"), render: item => <ImportStatus status={item.import_status === "committed" ? "created" : item.import_session_id ? "pending" : item.status || "uploaded"} /> },
        { key: "date", label: t("workspace.uploaded"), render: item => new Date(item.created_at).toLocaleDateString(i18n.language) },
      ]} actions={item => <button type="button" title={t("workspace.download")} aria-label={t("workspace.download")} onClick={() => void api.downloadStatement(item.id).catch(onError)} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"><Download size={15} aria-hidden="true" /></button>} />
  </section>;
}

export function ImportStatus({ status }: { status: string }) {
  const { t } = useTranslation("statements");
  const color = ["ready", "created", "committed"].includes(status) ? "bg-emerald-500" : ["failed", "error"].includes(status) ? "bg-red-500" : status === "excluded" ? "bg-slate-300" : "bg-amber-400";
  return <span className="inline-flex items-center gap-2 whitespace-nowrap text-xs text-slate-600"><span className={`h-1.5 w-1.5 rounded-full ${color}`} />{t(`workspace.states.${status}`)}</span>;
}
