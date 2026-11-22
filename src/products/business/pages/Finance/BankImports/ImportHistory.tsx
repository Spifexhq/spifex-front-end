import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/core/api/requests";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";
import Badge from "@/shared/ui/Badge";
import Card from "@/shared/ui/Card";
import DataTable from "@/shared/ui/DataTable";
import Input from "@/shared/ui/Input";
import LookupSelect from "./LookupSelect";
import type { BankLoader, BankOption } from "./types";
import type { Statement } from "@/models/finance/imports";

export default function ImportHistory({ canDelete, canViewBanks, organization, basePath, loadBanks }: {
  canDelete: boolean; canViewBanks: boolean; organization: string; basePath: string; loadBanks: BankLoader;
}) {
  const { t, i18n } = useTranslation("statements"), navigate = useNavigate();
  const [search, setSearch] = useState(""), [query, setQuery] = useState("");
  const [bank, setBank] = useState(""), [banks, setBanks] = useState<BankOption[]>([]);
  const [bankError, setBankError] = useState(false);
  useEffect(() => {
    if (!canViewBanks) return;
    let alive = true;
    void loadBanks(false).then(items => { if (alive) setBanks(items); }).catch(() => { if (alive) setBankError(true); });
    return () => { alive = false; };
  }, [organization, canViewBanks, loadBanks]);
  const pager = useCursorPager<Statement>(async (cursor, page_size) => {
    const data = await api.getStatements({ cursor, page_size, q: query, bank, include_count: true });
    return { items: data.results, nextCursor: getCursorFromUrl(data.next), totalCount: data.count };
  }, { deps: [query, organization, bank] });
  return <Card as="section" radius="xl" tone="slate" padding="none" className="overflow-hidden">
    <div className="border-b border-slate-100 p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3"><form className="w-full max-w-sm" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); }}><Input size="sm" label={t("workspace.search")} aria-label={t("workspace.search")} placeholder={t("workspace.search")} value={search} onChange={event => { setSearch(event.target.value); if (!event.target.value) setQuery(""); }} /><span className="mt-1 block text-xs text-slate-400">{t("workspace.searchHint")}</span></form>{canViewBanks && !!banks.length && <div className="w-56"><LookupSelect label={t("workspace.bank")} value={bank} items={banks.map(item => ({ id: item.id, label: `${item.institution} · ${item.account_number || item.currency}` }))} onChange={setBank} /></div>}{bank && <button type="button" className="self-center text-xs text-slate-500 hover:text-slate-900" onClick={() => setBank("")}>{t("workspace.clear")}</button>}</div>{bankError && <p role="status" className="mt-2 text-xs text-slate-500">{t("workspace.bankError")}</p>}
    </div>
    <DataTable items={pager.items} pager={pager} busy={pager.loading} error={pager.error} emptyLabel={t("workspace.empty")} getRowName={item => item.original_filename} onInspect={item => navigate(`${basePath}/${item.id}`)} onEdit={item => navigate(`${basePath}/${item.id}`)} editLabel={t("workspace.open")} canDelete={canDelete} onDelete={async item => { await api.deleteStatement(item.id); }} onDeleted={() => void pager.refresh()} frame={false}
      columns={[
        { key: "name", label: t("workspace.file"), render: item => <span className="font-medium">{item.original_filename}</span> },
        { key: "bank", label: t("workspace.bank"), render: item => item.bank_account_label || t("workspace.notSet") },
        { key: "status", label: t("workspace.status"), render: item => <ImportStatus status={item.import_status === "committed" ? "created" : item.import_session_id ? "pending" : item.status || "uploaded"} /> },
        { key: "date", label: t("workspace.uploaded"), render: item => new Date(item.created_at).toLocaleDateString(i18n.language) },
      ]} />
  </Card>;
}

export function ImportStatus({ status }: { status: string }) {
  const { t } = useTranslation("statements");
  const tone = ["ready", "created", "committed"].includes(status) ? "success" : ["failed", "error"].includes(status) ? "danger" : status === "excluded" ? "neutral" : "warning";
  return <Badge tone={tone} dot>{t(`workspace.states.${status}`)}</Badge>;
}
