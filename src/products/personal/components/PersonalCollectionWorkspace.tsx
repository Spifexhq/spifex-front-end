import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { personalApi } from "../services/api";
import { usePersonalReadRevision } from "../hooks/usePersonalReadRevision";
import { useCashflowBalance } from "../hooks/useCashflowBalance";
import { useCollectionColumns } from "./useCollectionColumns";
import type { PersonalWorkspaceCollection, PersonalRecord } from "../types";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import DataTable from "@/shared/ui/DataTable";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import { Select } from "@/shared/ui/Select";
import AccountBalancePanel from "@/shared/financial/components/AccountBalancePanel";
import PersonalRecordPreview from "../components/PersonalRecordPreview";
import PersonalRecordDialog from "../components/PersonalRecordDialog";
import { readonlyWorkspace } from "../services/personalData";

type Dialog = { kind: Exclude<PersonalWorkspaceCollection, "transfers"> | "settle" | "contribute" | "transfer"; record?: PersonalRecord | null };
export default function PersonalCollectionWorkspace({ collection }: { collection: PersonalWorkspaceCollection }) {
  const { t } = useTranslation("personal");
  const { organization, permissions, isOwner, isSubscribed } = useAuthContext();
  const [params] = useSearchParams();
  const linkedKind = params.get("kind") === "transfer" ? "transfer" : "";
  const readRevision = usePersonalReadRevision();
  const workspace = organization?.organization;
  const readOnly = readonlyWorkspace(workspace?.lifecycle), currency = workspace?.currency || undefined;
  const [advanced, setAdvanced] = useState(false), [search, setSearch] = useState("");
  const [kind, setKind] = useState(linkedKind), [status, setStatus] = useState("");
  const [start, setStart] = useState(""), [end, setEnd] = useState("");
  const [applied, setApplied] = useState<Record<string, string>>({ kind: linkedKind });
  const [preview, setPreview] = useState<PersonalRecord | null>(null), [dialog, setDialog] = useState<Dialog | null>(null);
  const [error, setError] = useState(""), [revision, setRevision] = useState(0);
  const pager = useCursorPager<PersonalRecord>(async (page, page_size) => {
    for (let attempt = 0;; attempt++) {
      try {
        const { data } = await personalApi.list(collection, { ...applied, page, page_size });
        return { items: data.results, nextCursor: data.next ? new URL(data.next, location.origin).searchParams.get("page") || undefined : undefined, totalCount: data.count };
      } catch (cause) { if (attempt >= 2 || (cause as { code?: string }).code !== "ERR_CANCELED") throw cause; }
    }
  }, { deps: [collection, applied, workspace?.id, workspace?.lifecycle, permissions.join("|"), isOwner, isSubscribed, readRevision] });
  const balances = useCashflowBalance(collection === "transactions", collection === "transactions" ? applied : {}, revision);
  const columns = useCollectionColumns(collection, currency);
  useEffect(() => { setPreview(null); setDialog(null); setError(""); setSearch(""); setKind(linkedKind); setStatus(""); setStart(""); setEnd(""); setApplied({ kind: linkedKind }); }, [collection, workspace?.id, linkedKind]);
  useEffect(() => { if (readOnly) setDialog(null); }, [readOnly]);
  const saved = () => { void pager.refresh(); setRevision(value => value + 1); setPreview(null); };
  const isTransfer = (row: PersonalRecord) => "kind" in row && row.kind === "transfer";
  const edit = (row: PersonalRecord) => { if (!isTransfer(row)) setDialog({ kind: collection === "transfers" ? "transfer" : collection, record: row }); };
  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-gray-900">{t(collection)}</h1><p className="mt-2 text-sm text-gray-500">{t(`${collection}Description`)}</p></div>{!readOnly && <div className="flex gap-2">{collection === "transactions" && <Button type="button" variant="outline" onClick={() => setDialog({ kind: "transfer" })}>{t("transfer")}</Button>}<Button type="button" onClick={() => setDialog({ kind: collection === "transfers" ? "transfer" : collection })}>{t("create")}</Button></div>}</header>
    {collection === "transactions" && <AccountBalancePanel {...balances}/>}
    <form onSubmit={event => { event.preventDefault(); setApplied({ search, kind, status, start_date: start, end_date: end }); }} className="flex flex-wrap items-end gap-3">
      <div className="min-w-44 flex-1"><Input kind="text" label={t("search")} placeholder={t("searchPlaceholder")} value={search} onChange={event => setSearch(event.target.value)}/></div>
      {collection === "transactions" && <>
        <Button type="button" variant="outline" className="md:hidden" aria-expanded={advanced} onClick={() => setAdvanced(value => !value)}>{t("filters")}</Button>
        <div className={`${advanced ? "flex" : "hidden"} w-full flex-wrap items-end gap-3 md:contents`}>
          <div className="min-w-32 flex-1 md:w-32 md:flex-none"><Select label={t("kind")} items={["", "income", "expense", "transfer"]} selected={[kind]} onChange={items => setKind(items[0] || "")} getItemKey={item => item} getItemLabel={item => t(item || "all")} singleSelect hideCheckboxes hideFilter/></div>
          <div className="min-w-32 flex-1 md:w-36 md:flex-none"><Select label={t("status")} items={["", "pending", "partial", "settled"]} selected={[status]} onChange={items => setStatus(items[0] || "")} getItemKey={item => item} getItemLabel={item => t(item || "all")} singleSelect hideCheckboxes hideFilter/></div>
          <div className="min-w-36 flex-1 md:w-36 md:flex-none"><Input kind="date" label={t("start_date")} value={start} onValueChange={setStart}/></div>
          <div className="min-w-36 flex-1 md:w-36 md:flex-none"><Input kind="date" label={t("end_date")} value={end} onValueChange={setEnd}/></div>
        </div>
      </>}
      <Button type="submit" variant="outline" disabled={!!start && !!end && end < start}>{t("apply")}</Button>
    </form>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    <DataTable<PersonalRecord> items={pager.items} columns={columns} initialWidths={collection === "transactions" ? [25, 12, 16, 14, 11, 11, 11] : undefined} pager={pager} emptyLabel={t("empty")} editLabel={t("edit")} error={pager.error} busy={pager.loading} onInspect={setPreview} canEdit={!readOnly && collection !== "transfers"} rowCanEdit={row => !isTransfer(row)} onEdit={edit} canDelete={!readOnly} onDelete={async row => {
      try { if (isTransfer(row) && "transfer_id" in row && row.transfer_id) await personalApi.remove("transfers", row.transfer_id); else await personalApi.remove(collection, row.id); }
      catch (cause) { setError(apiErrorMessage(cause, t("error"))); throw cause; }
    }} onDeleted={saved} mobileActions={false}/>
    <PersonalRecordPreview collection={collection} record={preview} currency={currency} readOnly={readOnly} onClose={() => setPreview(null)} onEdit={edit} onSettle={row => setDialog({ kind: "settle", record: row })} onContribute={row => setDialog({ kind: "contribute", record: row })}/>
    {dialog && <PersonalRecordDialog key={`${dialog.kind}:${dialog.record?.id || "new"}`} kind={dialog.kind} record={dialog.record} currency={currency || "EUR"} onClose={() => setDialog(null)} onSaved={saved}/>}
  </div>;
}
