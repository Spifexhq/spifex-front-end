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
import { usePersonalAccess } from "../access/PersonalAccessProvider";
import { PERSONAL_PERMISSION, type PersonalPermission } from "../access/permissions";

const collectionPermissions: Record<PersonalWorkspaceCollection, { view: PersonalPermission; add: PersonalPermission; change: PersonalPermission; remove: PersonalPermission; capacity: PersonalPermission }> = {
  categories: { view: PERSONAL_PERMISSION.categories, add: PERSONAL_PERMISSION.addCategory, change: PERSONAL_PERMISSION.changeCategory, remove: PERSONAL_PERMISSION.deleteCategory, capacity: PERSONAL_PERMISSION.addCategory },
  budgets: { view: PERSONAL_PERMISSION.budgets, add: PERSONAL_PERMISSION.addBudget, change: PERSONAL_PERMISSION.changeBudget, remove: PERSONAL_PERMISSION.deleteBudget, capacity: PERSONAL_PERMISSION.addBudget },
  goals: { view: PERSONAL_PERMISSION.goals, add: PERSONAL_PERMISSION.addGoal, change: PERSONAL_PERMISSION.changeGoal, remove: PERSONAL_PERMISSION.deleteGoal, capacity: PERSONAL_PERMISSION.addGoal },
};

export default function PersonalCollectionWorkspace({ collection }: { collection: PersonalWorkspaceCollection }) {
  const { t } = useTranslation("personal");
  const { organization } = useAuthContext();
  const access = usePersonalAccess();
  const workspace = organization?.organization;
  const readOnly = readonlyWorkspace(workspace?.lifecycle);
  const readRevision = usePersonalReadRevision();
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [preview, setPreview] = useState<PersonalRecord | null>(null);
  const [dialog, setDialog] = useState<{ kind: PersonalWorkspaceCollection | "contribute"; record?: PersonalRecord | null } | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const pager = useCursorPager<PersonalRecord, { resourceCount: number; activeCount: number }>(async (page, page_size) => {
    const { data } = await personalApi.list(collection, { search: appliedSearch || undefined, page, page_size });
    return { items: data.results, nextCursor: data.next ? getCursorFromUrl(data.next) : undefined, totalCount: data.count, metadata: { resourceCount: data.resource_count ?? data.count, activeCount: data.active_count ?? data.resource_count ?? data.count } };
  }, { deps: [collection, appliedSearch, workspace?.id, workspace?.lifecycle, readRevision, revision] });
  const columns = useCollectionColumns(collection, workspace?.currency);
  useEffect(() => { setPreview(null); setDialog(null); setError(""); setSearch(""); setAppliedSearch(""); }, [collection, workspace?.id]);
  const refresh = () => { void pager.refresh(); void access.refresh(); setRevision(value => value + 1); setPreview(null); };
  const edit = (row: PersonalRecord) => setDialog({ kind: collection, record: row });
  const permissions = collectionPermissions[collection];
  const capacityCount = collection === "categories" ? pager.metadata?.activeCount : pager.metadata?.resourceCount;
  const canCreate = !readOnly && capacityCount !== undefined && access.canUse(permissions.add, 1, capacityCount);
  const canEdit = !readOnly && access.canUse(permissions.change);
  const canDelete = !readOnly && access.canUse(permissions.remove);
  const addEntitlement = access.entitlement(permissions.capacity);
  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-gray-900">{t(collection)}</h1><p className="mt-1.5 text-sm text-gray-500">{t(`${collection}Description`)}</p></div>{canCreate && <Button type="button" onClick={() => setDialog({ kind: collection })}>{t("create")}</Button>}</header>
    {!readOnly && !canCreate && capacityCount !== undefined && addEntitlement?.limits.limit !== null && addEntitlement?.limits.limit !== undefined && capacityCount >= addEntitlement.limits.limit && <p className="text-xs text-gray-500">{t("access.resourceCapacityReached", { limit: addEntitlement.limits.limit })}</p>}
    <form onSubmit={event => { event.preventDefault(); setAppliedSearch(search.trim()); }} className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
      <div className="min-w-48 flex-1"><Input kind="text" label={t("search")} placeholder={t("searchPlaceholder")} value={search} onChange={event => setSearch(event.target.value)}/></div>
      <Button type="submit" variant="outline">{t("apply")}</Button>
      {appliedSearch && <Button type="button" variant="outline" onClick={() => { setSearch(""); setAppliedSearch(""); }}>{t("clearFilters")}</Button>}
    </form>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    <DataTable<PersonalRecord> items={pager.items} columns={columns} pager={pager} emptyLabel={t("empty")} editLabel={t("edit")} error={pager.error} busy={pager.loading} onInspect={setPreview} canEdit={canEdit} onEdit={edit} canDelete={canDelete} onDelete={async row => {
      try { await personalApi.remove(collection, row.id); }
      catch (cause) { setError(apiErrorMessage(cause, t("error"))); throw cause; }
    }} onDeleted={refresh}/>
    <PersonalRecordPreview collection={collection} record={preview} currency={workspace?.currency} readOnly={readOnly || !canEdit} onClose={() => setPreview(null)} onEdit={edit} onSettle={() => {}} onContribute={row => { if (collection === "goals" && canEdit) setDialog({ kind: "contribute", record: row }); }}/>
    {dialog && <PersonalRecordDialog key={`${dialog.kind}:${dialog.record?.id || "new"}`} kind={dialog.kind} record={dialog.record} currency={workspace?.currency || "EUR"} onClose={() => setDialog(null)} onSaved={refresh}/>}
  </div>;
}
