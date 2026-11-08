import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import DataTable from "@/shared/ui/DataTable";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import { personalApi } from "../services/api";
import { usePersonalReadRevision } from "../hooks/usePersonalReadRevision";
import { useCollectionColumns } from "./useCollectionColumns";
import type { PersonalWorkspaceCollection, PersonalRecord } from "../types";
import PersonalRecordPreview from "./PersonalRecordPreview";
import PersonalRecordDialog from "./PersonalRecordDialog";
import { readonlyWorkspace } from "../services/personalData";

export default function PersonalCollectionWorkspace({ collection }: { collection: PersonalWorkspaceCollection }) {
  const { t } = useTranslation("personal");
  const { organization } = useAuthContext();
  const workspace = organization?.organization;
  const readOnly = readonlyWorkspace(workspace?.lifecycle);
  const readRevision = usePersonalReadRevision();
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [preview, setPreview] = useState<PersonalRecord | null>(null);
  const [dialog, setDialog] = useState<{ kind: PersonalWorkspaceCollection | "contribute"; record?: PersonalRecord | null } | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const pager = useCursorPager<PersonalRecord>(async (page, page_size) => {
    const { data } = await personalApi.list(collection, { search: appliedSearch || undefined, page, page_size });
    return { items: data.results, nextCursor: data.next ? getCursorFromUrl(data.next) : undefined, totalCount: data.count };
  }, { deps: [collection, appliedSearch, workspace?.id, workspace?.lifecycle, readRevision, revision] });
  const columns = useCollectionColumns(collection, workspace?.currency);
  useEffect(() => { setPreview(null); setDialog(null); setError(""); setSearch(""); setAppliedSearch(""); }, [collection, workspace?.id]);
  const refresh = () => { void pager.refresh(); setRevision(value => value + 1); setPreview(null); };
  const edit = (row: PersonalRecord) => setDialog({ kind: collection, record: row });
  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-gray-900">{t(collection)}</h1><p className="mt-1.5 text-sm text-gray-500">{t(`${collection}Description`)}</p></div>{!readOnly && <Button type="button" onClick={() => setDialog({ kind: collection })}>{t("create")}</Button>}</header>
    <form onSubmit={event => { event.preventDefault(); setAppliedSearch(search.trim()); }} className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
      <div className="min-w-48 flex-1"><Input kind="text" label={t("search")} placeholder={t("searchPlaceholder")} value={search} onChange={event => setSearch(event.target.value)}/></div>
      <Button type="submit" variant="outline">{t("apply")}</Button>
      {appliedSearch && <Button type="button" variant="outline" onClick={() => { setSearch(""); setAppliedSearch(""); }}>{t("clearFilters")}</Button>}
    </form>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    <DataTable<PersonalRecord> items={pager.items} columns={columns} pager={pager} emptyLabel={t("empty")} editLabel={t("edit")} error={pager.error} busy={pager.loading} onInspect={setPreview} canEdit={!readOnly} onEdit={edit} canDelete={!readOnly} onDelete={async row => {
      try { await personalApi.remove(collection, row.id); }
      catch (cause) { setError(apiErrorMessage(cause, t("error"))); throw cause; }
    }} onDeleted={refresh}/>
    <PersonalRecordPreview collection={collection} record={preview} currency={workspace?.currency} readOnly={readOnly} onClose={() => setPreview(null)} onEdit={edit} onSettle={() => {}} onContribute={row => setDialog({ kind: "contribute", record: row })}/>
    {dialog && <PersonalRecordDialog key={`${dialog.kind}:${dialog.record?.id || "new"}`} kind={dialog.kind} record={dialog.record} currency={workspace?.currency || "EUR"} onClose={() => setDialog(null)} onSaved={refresh}/>}
  </div>;
}
