import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import DataTable from "@/shared/ui/DataTable";
import Card from "@/shared/ui/Card";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Popover from "@/shared/ui/Popover";
import { Select } from "@/shared/ui/Select";
import SettingsFilters from "@/shared/ui/Settings/SettingsFilters";
import { SettingsClearFilters, SettingsFilter } from "@/shared/ui/Settings/SettingsFilter";
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

type CategoryKind = "income" | "expense";
type CategoryStatus = "active" | "inactive";

export default function PersonalCollectionWorkspace({ collection, settings = false }: { collection: PersonalWorkspaceCollection; settings?: boolean }) {
  const { t } = useTranslation("personal");
  const { organization } = useAuthContext();
  const access = usePersonalAccess();
  const workspace = organization?.organization;
  const readOnly = readonlyWorkspace(workspace?.lifecycle);
  const readRevision = usePersonalReadRevision();
  const isCategories = collection === "categories";
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [kind, setKind] = useState<CategoryKind[]>([]);
  const [appliedKind, setAppliedKind] = useState<CategoryKind[]>([]);
  const [statuses, setStatuses] = useState<CategoryStatus[]>(["active"]);
  const [appliedStatuses, setAppliedStatuses] = useState<CategoryStatus[]>(["active"]);
  const [openFilter, setOpenFilter] = useState<"search" | "kind" | "status" | null>(null);
  const searchAnchorRef = useRef<HTMLDivElement | null>(null);
  const kindAnchorRef = useRef<HTMLDivElement | null>(null);
  const statusAnchorRef = useRef<HTMLDivElement | null>(null);
  const [preview, setPreview] = useState<PersonalRecord | null>(null);
  const [dialog, setDialog] = useState<{ kind: PersonalWorkspaceCollection | "contribute"; record?: PersonalRecord | null } | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const pager = useCursorPager<PersonalRecord, { resourceCount: number; activeCount: number }>(async (page, page_size) => {
    const { data } = await personalApi.list(collection, {
      search: appliedSearch || undefined,
      ...(isCategories && appliedKind.length ? { kind: appliedKind.join(",") } : {}),
      ...(isCategories ? { is_active: appliedStatuses.length ? appliedStatuses.join(",") : "active,inactive" } : {}),
      page,
      page_size,
    });
    return { items: data.results, nextCursor: data.next ? getCursorFromUrl(data.next) : undefined, totalCount: data.count, metadata: { resourceCount: data.resource_count ?? data.count, activeCount: data.active_count ?? data.resource_count ?? data.count } };
  }, { deps: [collection, appliedSearch, appliedKind, appliedStatuses, workspace?.id, workspace?.lifecycle, readRevision, revision] });
  const columns = useCollectionColumns(collection, workspace?.currency);
  useEffect(() => { setPreview(null); setDialog(null); setError(""); setSearch(""); setAppliedSearch(""); setKind([]); setAppliedKind([]); setStatuses(["active"]); setAppliedStatuses(["active"]); }, [collection, workspace?.id]);
  const refresh = () => { void pager.refresh(); void access.refresh(); setRevision(value => value + 1); setPreview(null); };
  const edit = (row: PersonalRecord) => setDialog({ kind: collection, record: row });
  const permissions = collectionPermissions[collection];
  const capacityCount = collection === "categories" ? pager.metadata?.activeCount : pager.metadata?.resourceCount;
  const canCreate = !readOnly && capacityCount !== undefined && access.canUse(permissions.add, 1, capacityCount);
  const canEdit = !readOnly && access.canUse(permissions.change);
  const canDelete = !readOnly && access.canUse(permissions.remove);
  const addEntitlement = access.entitlement(permissions.capacity);
  const kindOptions: Array<{ value: CategoryKind; label: string }> = [
    { value: "income", label: t("income") },
    { value: "expense", label: t("expense") },
  ];
  const statusOptions: Array<{ value: CategoryStatus; label: string }> = [
    { value: "active", label: t("active") },
    { value: "inactive", label: t("inactive") },
  ];
  const statusIsDefault = appliedStatuses.length === 1 && appliedStatuses[0] === "active";
  const hasSettingsFilters = !!appliedSearch || (isCategories && (appliedKind.length > 0 || !statusIsDefault));
  const clearSettingsFilters = () => {
    setSearch("");
    setAppliedSearch("");
    setKind([]);
    setAppliedKind([]);
    setStatuses(["active"]);
    setAppliedStatuses(["active"]);
  };
  return <div className="space-y-5">
    {!settings && <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-gray-900">{t(collection)}</h1><p className="mt-1.5 text-sm text-gray-500">{t(`${collection}Description`)}</p></div>{canCreate && <Button type="button" onClick={() => setDialog({ kind: collection })}>{t("create")}</Button>}</header>}
    {!readOnly && !canCreate && capacityCount !== undefined && addEntitlement?.limits.limit !== null && addEntitlement?.limits.limit !== undefined && capacityCount >= addEntitlement.limits.limit && <p className="text-xs text-gray-500">{t("access.resourceCapacityReached", { limit: addEntitlement.limits.limit })}</p>}
    {settings ? <>
      <div className="settings-toolbar mb-4">
        <SettingsFilters active={hasSettingsFilters}>
          <div ref={searchAnchorRef}><SettingsFilter label={t("search")} value={appliedSearch ? `• ${appliedSearch}` : undefined} active={!!appliedSearch} expanded={openFilter === "search"} onClick={() => setOpenFilter(current => current === "search" ? null : "search")} onClear={appliedSearch ? () => { setSearch(""); setAppliedSearch(""); } : undefined} /></div>
          {isCategories && <div ref={kindAnchorRef}><SettingsFilter label={t("kind")} value={appliedKind.length ? appliedKind.map(value => t(value)).join(", ") : undefined} active={appliedKind.length > 0} expanded={openFilter === "kind"} onClick={() => setOpenFilter(current => current === "kind" ? null : "kind")} onClear={appliedKind.length ? () => { setKind([]); setAppliedKind([]); } : undefined} /></div>}
          {isCategories && <div ref={statusAnchorRef}><SettingsFilter label={t("status")} value={appliedStatuses.length ? appliedStatuses.map(value => t(value)).join(", ") : t("allStatuses")} active={!statusIsDefault} expanded={openFilter === "status"} onClick={() => setOpenFilter(current => current === "status" ? null : "status")} onClear={() => { setStatuses(["active"]); setAppliedStatuses(["active"]); }} /></div>}
          {hasSettingsFilters && <SettingsClearFilters label={t("clearFilters")} onClick={clearSettingsFilters} />}
        </SettingsFilters>
        {canCreate && <Button type="button" onClick={() => setDialog({ kind: collection })}>{t("create")}</Button>}
      </div>
      <Popover appearance="settings" open={openFilter === "search"} anchorRef={searchAnchorRef} onClose={() => setOpenFilter(null)} title={t("search")} width={420}>
        <div className="p-4">
          <Input kind="text" label={t("search")} placeholder={t("searchPlaceholder")} value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); setAppliedSearch(search.trim()); setOpenFilter(null); } }} />
          <div className="mt-3 flex items-center justify-between">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(""); setAppliedSearch(""); }}>{t("clearFilters")}</Button>
            <Button type="button" size="sm" onClick={() => { setAppliedSearch(search.trim()); setOpenFilter(null); }}>{t("apply")}</Button>
          </div>
        </div>
      </Popover>
      {isCategories && <Popover appearance="settings" open={openFilter === "kind"} anchorRef={kindAnchorRef} onClose={() => setOpenFilter(null)} title={t("kind")} width={360}>
        <div className="p-4">
          <Select<{ value: CategoryKind; label: string }> label={t("kind")} items={kindOptions} selected={kindOptions.filter(option => kind.includes(option.value))} onChange={items => setKind(items.map(item => item.value))} getItemKey={item => item.value} getItemLabel={item => item.label} buttonLabel={t("allTypes")} />
          <div className="mt-3 flex items-center justify-between">
            <Button type="button" variant="ghost" size="sm" onClick={() => setKind([])}>{t("clearFilters")}</Button>
            <Button type="button" size="sm" onClick={() => { setAppliedKind(kind); setOpenFilter(null); }}>{t("apply")}</Button>
          </div>
        </div>
      </Popover>}
      {isCategories && <Popover appearance="settings" open={openFilter === "status"} anchorRef={statusAnchorRef} onClose={() => setOpenFilter(null)} title={t("status")} width={360}>
        <div className="p-4">
          <Select<{ value: CategoryStatus; label: string }> label={t("status")} items={statusOptions} selected={statusOptions.filter(option => statuses.includes(option.value))} onChange={items => setStatuses(items.map(item => item.value))} getItemKey={item => item.value} getItemLabel={item => item.label} buttonLabel={t("allStatuses")} />
          <div className="mt-3 flex items-center justify-between">
            <Button type="button" variant="ghost" size="sm" onClick={() => setStatuses(["active"])}>{t("clearFilters")}</Button>
            <Button type="button" size="sm" onClick={() => { setAppliedStatuses(statuses); setOpenFilter(null); }}>{t("apply")}</Button>
          </div>
        </div>
      </Popover>}
    </> : <Card as="form" radius="xl" padding="none" onSubmit={event => { event.preventDefault(); setAppliedSearch(search.trim()); }} className="flex flex-wrap items-end gap-3 p-3 sm:p-4">
      <div className="min-w-48 flex-1"><Input kind="text" label={t("search")} placeholder={t("searchPlaceholder")} value={search} onChange={event => setSearch(event.target.value)}/></div>
      <Button type="submit" variant="outline">{t("apply")}</Button>
      {appliedSearch && <Button type="button" variant="outline" onClick={() => { setSearch(""); setAppliedSearch(""); }}>{t("clearFilters")}</Button>}
    </Card>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    <DataTable<PersonalRecord> items={pager.items} columns={columns} pager={pager} emptyLabel={t("empty")} editLabel={t("edit")} error={pager.error} busy={pager.loading} onInspect={setPreview} canEdit={canEdit} onEdit={edit} canDelete={canDelete} onDelete={async row => {
      try { await personalApi.remove(collection, row.id); }
      catch (cause) { setError(apiErrorMessage(cause, t("error"))); throw cause; }
    }} onDeleted={refresh}/>
    <PersonalRecordPreview collection={collection} record={preview} currency={workspace?.currency} readOnly={readOnly || !canEdit} onClose={() => setPreview(null)} onEdit={edit} onSettle={() => {}} onContribute={row => { if (collection === "goals" && canEdit) setDialog({ kind: "contribute", record: row }); }}/>
    {dialog && <PersonalRecordDialog key={`${dialog.kind}:${dialog.record?.id || "new"}`} kind={dialog.kind} record={dialog.record} currency={workspace?.currency || "EUR"} onClose={() => setDialog(null)} onSaved={refresh}/>}
  </div>;
}
