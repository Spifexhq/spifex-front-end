import { apiErrorMessage } from "@/lib/apiErrorMessage";
import DataTable from "@/shared/ui/DataTable";
import { recordName } from "@/shared/ui/DataTable/recordName";
import SettingsFilters from "@/shared/ui/Settings/SettingsFilters";
import { SettingsFilter as Chip, SettingsClearFilters as ClearFiltersChip } from "@/shared/ui/Settings/SettingsFilter";
/* -------------------------------------------------------------------------- */
/* File: src/pages/Settings/EntitySettings/index.tsx                                   */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Snackbar from "@/shared/ui/Snackbar";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";

import Select from "src/shared/ui/Select/Select";
import Popover from "src/shared/ui/Popover";

import EntityModal from "./EntityModal";

import { api } from "@/core/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { PermissionMiddleware } from "src/middlewares";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";

import type { Entity, EntityTypeValue, GetEntitiesParams } from "@/models/settings/entities";

/* ------------------------------ Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type FilterKey = "name" | "alias" | "type" | "status" | null;

type StatusKey = "active" | "inactive";
type StatusOption = { key: StatusKey; label: string };

type EntityTypeOption = { key: EntityTypeValue; label: string };

/* --------------------------------- Helpers -------------------------------- */



function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function truncate(s: string, max = 24) {
  const v = (s || "").trim();
  if (v.length <= max) return v;
  return `${v.slice(0, max - 1)}…`;
}

function computeStatusMode(keys: StatusKey[]): "all" | "active" | "inactive" {
  const hasA = keys.includes("active");
  const hasI = keys.includes("inactive");
  if (hasA && !hasI) return "active";
  if (!hasA && hasI) return "inactive";
  return "all";
}

function toActiveParamFromStatusKeys(keys: StatusKey[]): GetEntitiesParams["active"] | undefined {
  const mode = computeStatusMode(keys);
  if (mode === "active") return "true";
  if (mode === "inactive") return "false";
  return undefined;
}

/**
 * Keep this lightweight and predictable:
 * - backend might send null/""; we default to "other"
 * - we do not attempt any extra parsing beyond trim+lowercase
 */
function normalizeEntityType(v: Entity["entity_type"]) {
  return String(v || "").trim().toLowerCase();
}

/** Since the backend is now constrained, a small cast is acceptable. */


/* ------------------------------- Chip UI ---------------------------------- */





/* ------------------------------ Row component ------------------------------ */



/* -------------------------------------------------------------------------- */

const EntitySettings: React.FC = () => {
  const { t, i18n } = useTranslation("entitySettings");
  const { isOwner, isSuperUser, permissions } = useAuthContext();

  const canViewEntities = useMemo(() => {
    if (isOwner) return true;
    return permissions.includes("view_entity");
  }, [isOwner, permissions]);

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  /* ------------------------------ Snackbar ------------------------------ */
  const [snack, setSnack] = useState<Snack>(null);

  /* ------------------------------ Confirm delete ------------------------------ */





  /* ------------------------------ Deletion optimistic UI ------------------------------ */

  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ------------------------------ Added overlay ------------------------------ */
  const [added, setAdded] = useState<Entity[]>([]);

  /* ------------------------------ Modal state ------------------------------ */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  const openCreateModal = useCallback(() => {
    setModalMode("create");
    setEditingEntity(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((entity: Entity) => {
    setModalMode("edit");
    setEditingEntity(entity);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingEntity(null);
  }, []);

  /* ------------------------------- Applied filters ------------------------- */
  const [appliedName, setAppliedName] = useState("");
  const [appliedAlias, setAppliedAlias] = useState("");
  const [appliedTypes, setAppliedTypes] = useState<EntityTypeValue[]>([]);
  const [appliedStatuses, setAppliedStatuses] = useState<StatusKey[]>([]);

  const appliedStatusMode = useMemo(() => computeStatusMode(appliedStatuses), [appliedStatuses]);

  const hasAppliedFilters = useMemo(() => {
    return (
      appliedName.trim() !== "" ||
      appliedAlias.trim() !== "" ||
      appliedTypes.length > 0 ||
      appliedStatuses.length > 0
    );
  }, [appliedName, appliedAlias, appliedTypes, appliedStatuses]);

  /* ------------------------------- Popover state --------------------------- */
  const [openFilter, setOpenFilter] = useState<FilterKey>(null);

  // Draft values
  const [draftName, setDraftName] = useState("");
  const [draftAlias, setDraftAlias] = useState("");
  const [draftTypes, setDraftTypes] = useState<EntityTypeValue[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<StatusKey[]>([]);

  /* ------------------------------- Anchors --------------------------------- */
  const nameAnchorRef = useRef<HTMLDivElement | null>(null);
  const aliasAnchorRef = useRef<HTMLDivElement | null>(null);
  const typeAnchorRef = useRef<HTMLDivElement | null>(null);
  const statusAnchorRef = useRef<HTMLDivElement | null>(null);

  const togglePopover = useCallback((key: Exclude<FilterKey, null>) => {
    setOpenFilter((prev) => (prev === key ? null : key));
  }, []);

  /* ------------------------------- Options --------------------------------- */
  const statusAllLabel = t("filters.status.all", { defaultValue: "All" });
  const statusActiveLabel = t("filters.status.active", { defaultValue: "Active" });
  const statusInactiveLabel = t("filters.status.inactive", { defaultValue: "Inactive" });

  const statusOptions: StatusOption[] = useMemo(
    () => [
      { key: "active", label: statusActiveLabel },
      { key: "inactive", label: statusInactiveLabel },
    ],
    [statusActiveLabel, statusInactiveLabel]
  );

  const appliedStatusValue = useMemo(() => {
    if (appliedStatusMode === "active") return statusActiveLabel;
    if (appliedStatusMode === "inactive") return statusInactiveLabel;
    return statusAllLabel;
  }, [appliedStatusMode, statusActiveLabel, statusInactiveLabel, statusAllLabel]);

  const draftStatusMode = useMemo(() => computeStatusMode(draftStatuses), [draftStatuses]);

  const draftStatusButtonLabel = useMemo(() => {
    if (draftStatusMode === "active") return statusActiveLabel;
    if (draftStatusMode === "inactive") return statusInactiveLabel;
    return statusAllLabel;
  }, [draftStatusMode, statusActiveLabel, statusInactiveLabel, statusAllLabel]);

  const selectedDraftStatusOptions = useMemo(() => {
    const selected = new Set(draftStatuses);
    return statusOptions.filter((o) => selected.has(o.key));
  }, [draftStatuses, statusOptions]);

  const typeOptions: EntityTypeOption[] = useMemo(
    () => [
      { key: "client", label: t("types.client") },
      { key: "supplier", label: t("types.supplier") },
      { key: "employee", label: t("types.employee") },
      { key: "contractor", label: t("types.contractor") },
      { key: "partner", label: t("types.partner") },
      { key: "prospect", label: t("types.prospect") },
      { key: "affiliate", label: t("types.affiliate") },
      { key: "advisor", label: t("types.advisor") },
      { key: "investor", label: t("types.investor") },
      { key: "other", label: t("types.other") },
    ],
    [t]
  );

  const selectedDraftTypeOptions = useMemo(() => {
    const selected = new Set(draftTypes);
    return typeOptions.filter((o) => selected.has(o.key));
  }, [draftTypes, typeOptions]);

  const appliedTypeLabel = useMemo(() => {
    if (!appliedTypes.length) return "";
    const labels = appliedTypes.map((k) => typeOptions.find((x) => x.key === k)?.label || k);
    const head = labels.slice(0, 2).join(", ");
    return labels.length > 2 ? `${head} +${labels.length - 2}` : head;
  }, [appliedTypes, typeOptions]);

  /* ------------------------------ Draft sync on open ------------------------ */
  useEffect(() => {
    if (openFilter === "name") setDraftName(appliedName);
    if (openFilter === "alias") setDraftAlias(appliedAlias);
    if (openFilter === "type") setDraftTypes(appliedTypes);
    if (openFilter === "status") setDraftStatuses(appliedStatuses);
  }, [openFilter, appliedName, appliedAlias, appliedTypes, appliedStatuses]);

  /* ------------------------------ Focus on open ----------------------------- */
  useEffect(() => {
    if (openFilter === "name") {
      requestAnimationFrame(() => {
        const el = document.getElementById("entity-filter-name-input") as HTMLInputElement | null;
        el?.focus();
        el?.select?.();
      });
    }
    if (openFilter === "alias") {
      requestAnimationFrame(() => {
        const el = document.getElementById("entity-filter-alias-input") as HTMLInputElement | null;
        el?.focus();
        el?.select?.();
      });
    }
  }, [openFilter]);

  /* ------------------------------ Apply/Clear ------------------------------- */
  const applyFromDraft = useCallback(
    (key: Exclude<FilterKey, null>) => {
      if (key === "name") setAppliedName(draftName.trim());
      if (key === "alias") setAppliedAlias(draftAlias.trim());
      if (key === "type") setAppliedTypes(uniq(draftTypes));
      if (key === "status") setAppliedStatuses(uniq(draftStatuses));
      setOpenFilter(null);
    },
    [draftName, draftAlias, draftTypes, draftStatuses]
  );

  const clearOne = useCallback((key: Exclude<FilterKey, null>) => {
    if (key === "name") setAppliedName("");
    if (key === "alias") setAppliedAlias("");
    if (key === "type") setAppliedTypes([]);
    if (key === "status") setAppliedStatuses([]);
    setOpenFilter(null);
  }, []);

  const clearAll = useCallback(() => {
    setAppliedName("");
    setAppliedAlias("");
    setAppliedTypes([]);
    setAppliedStatuses([]);
    setOpenFilter(null);
  }, []);

  /* ------------------------------ Pager ------------------------------------ */


  const fetchEntitiesPage = useCallback(
    async (cursor?: string, pageSize = 20) => {
      if (!canViewEntities) {
        return { items: [] as Entity[], nextCursor: undefined as string | undefined };
      }




      {
        const typeParam = appliedTypes.length === 0 ? undefined : uniq(appliedTypes).slice().sort().join(",");

        const params: GetEntitiesParams = {
          cursor,
          ...{ page_size: pageSize, include_count: "true" },
          name: appliedName.trim() || undefined,
          alias: appliedAlias.trim() || undefined,
          type: typeParam,
          active: toActiveParamFromStatusKeys(appliedStatuses),
        };

        const { data, meta } = await api.getEntities(params);

        const items = (data?.results ?? []) as Entity[];

        const nextUrl = meta?.pagination?.next ?? (data as unknown as { next?: string | null }).next ?? null;
        const nextCursor = nextUrl ? getCursorFromUrl(nextUrl) || nextUrl : undefined;

        return { items, nextCursor, totalCount: (data as unknown as { count?: number }).count };
      }
    },
    [canViewEntities, appliedName, appliedAlias, appliedTypes, appliedStatuses]
  );

  const pager = useCursorPager<Entity>(fetchEntitiesPage, {
    autoLoadFirst: canViewEntities,
    deps: [canViewEntities, appliedName, appliedAlias, appliedTypes, appliedStatuses],
  });

  const { refresh } = pager;

  useEffect(() => {
    if (!canViewEntities) return;
    refresh();
  }, [canViewEntities, refresh]);

  /* ------------------------------ Overlay filtering ------------------------- */
  const matchesFilters = useCallback(
    (e: Entity) => {
      // status
      if (appliedStatusMode === "active" && e.is_active === false) return false;
      if (appliedStatusMode === "inactive" && e.is_active !== false) return false;

      // type
      if (appliedTypes.length) {
        const v = normalizeEntityType(e.entity_type);
        const wanted = new Set(appliedTypes.map((x) => x.toLowerCase()));
        if (!wanted.has(v)) return false;
      }

      // name
      if (appliedName.trim()) {
        const s = appliedName.trim().toLowerCase();
        if (!(e.full_name || "").toLowerCase().includes(s)) return false;
      }

      // alias
      if (appliedAlias.trim()) {
        const s = appliedAlias.trim().toLowerCase();
        if (!(e.alias_name || "").toLowerCase().includes(s)) return false;
      }

      return true;
    },
    [appliedName, appliedAlias, appliedTypes, appliedStatusMode]
  );

  useEffect(() => {
    setAdded((prev) => prev.filter((x) => !deletedIds.has(x.id) && matchesFilters(x)));
  }, [deletedIds, matchesFilters]);

  const visibleItems = useMemo(() => {
    const addedFiltered = added.filter((e) => !deletedIds.has(e.id) && matchesFilters(e));
    const addedIds = new Set(addedFiltered.map((e) => e.id));
    const base = pager.items.filter((e) => !deletedIds.has(e.id) && !addedIds.has(e.id));
    return [...addedFiltered, ...base];
  }, [added, deletedIds, pager.items, matchesFilters]);

  /* ------------------------------ Delete flow ------------------------------ */


  /* ------------------------------ Loading UI ------------------------------ */
  const isInitialLoading = pager.loading && pager.items.length === 0;
  const isBackgroundSync = pager.loading && pager.items.length > 0;

  const globalBusy = isBackgroundSync  || modalOpen;

  const nameChipValue = appliedName.trim() ? `• ${truncate(appliedName.trim(), 22)}` : "";
  const aliasChipValue = appliedAlias.trim() ? `• ${truncate(appliedAlias.trim(), 22)}` : "";
  const typeChipValue = appliedTypes.length ? `• ${truncate(appliedTypeLabel, 26)}` : "";
  const statusChipValue = appliedStatuses.length ? `• ${appliedStatusValue}` : "";

  const shouldBlockOnInitial = isInitialLoading && canViewEntities;

  if (shouldBlockOnInitial) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  return (
    <>
      <TopProgress active={isBackgroundSync} variant="top" topOffset={64} />

      <main className="settings-page">
        <div className="settings-content ">


          <PermissionMiddleware codeName={"view_entity"} behavior="lock">
            <section className="mt-6">
              <div className="mb-4">
                  <div className="flex items-center justify-between gap-3 settings-toolbar">
                    {/* LEFT: chips */}
                    <SettingsFilters active={hasAppliedFilters}>
                      <div ref={nameAnchorRef}>
                        <Chip
                          label={t("filters.nameLabel", { defaultValue: "Name" })}
                          value={nameChipValue || undefined}
                          active={!!appliedName.trim()}
                          onClick={() => togglePopover("name")}
                          expanded={openFilter === "name"}
                          onClear={appliedName.trim() ? () => clearOne("name") : undefined}
                          disabled={globalBusy}
                        />
                      </div>

                      <div ref={aliasAnchorRef}>
                        <Chip
                          label={t("filters.aliasLabel", { defaultValue: "Alias" })}
                          value={aliasChipValue || undefined}
                          active={!!appliedAlias.trim()}
                          onClick={() => togglePopover("alias")}
                          expanded={openFilter === "alias"}
                          onClear={appliedAlias.trim() ? () => clearOne("alias") : undefined}
                          disabled={globalBusy}
                        />
                      </div>

                      <div ref={typeAnchorRef}>
                        <Chip
                          label={t("filters.typeLabel", { defaultValue: "Type" })}
                          value={typeChipValue || undefined}
                          active={appliedTypes.length > 0}
                          onClick={() => togglePopover("type")}
                          expanded={openFilter === "type"}
                          onClear={appliedTypes.length ? () => clearOne("type") : undefined}
                          disabled={globalBusy}
                        />
                      </div>

                      <div ref={statusAnchorRef}>
                        <Chip
                          label={t("filters.statusLabel", { defaultValue: "Status" })}
                          value={statusChipValue || undefined}
                          active={appliedStatuses.length > 0}
                          onClick={() => togglePopover("status")}
                          expanded={openFilter === "status"}
                          onClear={appliedStatuses.length ? () => clearOne("status") : undefined}
                          disabled={globalBusy}
                        />
                      </div>

                      {hasAppliedFilters && (
                        <ClearFiltersChip
                          label={t("filters.clearAll", { defaultValue: "Clear filters" })}
                          onClick={clearAll}
                          disabled={globalBusy}
                        />
                      )}
                    </SettingsFilters>

                    {/* RIGHT: add button */}
                    <div className="shrink-0">
                      <PermissionMiddleware codeName={"add_entity"}>
                        <Button onClick={openCreateModal} className="!py-1.5" disabled={globalBusy}>
                          {t("btn.add")}
                        </Button>
                      </PermissionMiddleware>
                    </div>
                  </div>
                </div>
<DataTable loadPreview={async item => (await api.getEntity(item.id)).data} previewColumns={[{key:"full_name",label:t("preview.fields.full_name"),render:item=>item.full_name ?? "�"},{key:"alias_name",label:t("preview.fields.alias_name"),render:item=>item.alias_name ?? "�"},{key:"entity_type",label:t("preview.fields.entity_type"),render:item=>item.entity_type ? t(`types.${item.entity_type}`, {defaultValue:item.entity_type}) : "�"},{key:"is_active",label:t("preview.fields.is_active"),render:item=>t(item.is_active ? "preview.active" : "preview.inactive")},{key:"ssn_tax_id",label:t("preview.fields.ssn_tax_id"),render:item=>item.ssn_tax_id ?? "�"},{key:"ein_tax_id",label:t("preview.fields.ein_tax_id"),render:item=>item.ein_tax_id ?? "�"},{key:"email",label:t("preview.fields.email"),render:item=>item.email ?? "�"},{key:"phone",label:t("preview.fields.phone"),render:item=>item.phone ?? "�"},{key:"street",label:t("preview.fields.street"),render:item=>item.street ?? "�"},{key:"street_number",label:t("preview.fields.street_number"),render:item=>item.street_number ?? "�"},{key:"city",label:t("preview.fields.city"),render:item=>item.city ?? "�"},{key:"state",label:t("preview.fields.state"),render:item=>item.state ?? "�"},{key:"postal_code",label:t("preview.fields.postal_code"),render:item=>item.postal_code ?? "�"},{key:"country",label:t("preview.fields.country"),render:item=>item.country ?? "�"},{key:"bank_name",label:t("preview.fields.bank_name"),render:item=>item.bank_name ?? "�"},{key:"bank_branch",label:t("preview.fields.bank_branch"),render:item=>item.bank_branch ?? "�"},{key:"checking_account",label:t("preview.fields.checking_account"),render:item=>item.checking_account ?? "�"},{key:"account_holder_tax_id",label:t("preview.fields.account_holder_tax_id"),render:item=>item.account_holder_tax_id ?? "�"},{key:"account_holder_name",label:t("preview.fields.account_holder_name"),render:item=>item.account_holder_name ?? "�"}]} onDeleted={ids => {
                if (!ids.length) return;
                const removed = new Set(ids);
                setDeletedIds(current => new Set([...current, ...removed]));
                setAdded(current => current.filter(item => !removed.has(String(item.id))));
                return pager.refresh();
              }} pager={pager} busy={globalBusy} items={visibleItems} columns={[{key:"name",label:t("common:records.name"),render:item=>recordName(item)},{key:"email",label:t("common:records.fields.email"),render:item=>String(item.email??"—")},{key:"country",label:t("common:records.fields.country"),render:item=>String(item.country??"—")}]} emptyLabel={t("empty")} selectable canEdit={isOwner||isSuperUser||permissions.includes("change_entity")} canDelete={isOwner||isSuperUser||permissions.includes("delete_entity")} onEdit={openEditModal} onDelete={item=>api.deleteEntity(item.id, (item as { version?: string }).version)} error={pager.error}/>
            </section>
          </PermissionMiddleware>
        </div>

        <PermissionMiddleware codeName={["add_entity", "change_entity"]}>
          <EntityModal
            isOpen={modalOpen}
            mode={modalMode}
            entity={editingEntity}
            onClose={closeModal}
            onNotify={setSnack}
            onSaved={async ({ mode, created }) => {
              try {
                if (mode === "create" && created) setAdded((prev) => [created, ...prev]);
                await pager.refresh();
              } catch (notificationCause) {
                setSnack({ message: apiErrorMessage(notificationCause, t("errors.loadFailedTitle")), severity: "error" });
              }
            }}
          />
        </PermissionMiddleware>
      </main>

      {/* NAME POPOVER */}
      <Popover appearance="settings" open={openFilter === "name"} anchorRef={nameAnchorRef} onClose={() => setOpenFilter(null)} title={t("filters.byNameTitle")}>
        <div className="p-4">


          <div className="mt-3">
            <Input
              kind="text"
              id="entity-filter-name-input"
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("name");
                }
              }}
              placeholder={t("filters.namePlaceholder")}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftName("")}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("name")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Popover>

      {/* ALIAS POPOVER */}
      <Popover appearance="settings" open={openFilter === "alias"} anchorRef={aliasAnchorRef} onClose={() => setOpenFilter(null)} title={t("filters.byAliasTitle")}>
        <div className="p-4">


          <div className="mt-3">
            <Input
              kind="text"
              id="entity-filter-alias-input"
              type="text"
              value={draftAlias}
              onChange={(e) => setDraftAlias(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("alias");
                }
              }}
              placeholder={t("filters.aliasPlaceholder")}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftAlias("")}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("alias")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Popover>

      {/* TYPE POPOVER (Select; allow overflow) */}
      <Popover appearance="settings"
        open={openFilter === "type"}
        anchorRef={typeAnchorRef}
        onClose={() => setOpenFilter(null)}
        width={420}
       title={t("filters.byTypeTitle")}>
        <div className="p-4 overflow-visible">


          <div className="mt-3 relative z-[1000000] overflow-visible">
            <div className="[&_input[type=text]]:hidden overflow-visible">
              <Select<EntityTypeOption>
                label={t("filters.typeLabel")}
                items={typeOptions}
                selected={selectedDraftTypeOptions}
                onChange={(list) => setDraftTypes(uniq((list || []).map((x) => x.key)))}
                getItemKey={(item) => item.key}
                getItemLabel={(item) => item.label}
                buttonLabel={
                  draftTypes.length
                    ? selectedDraftTypeOptions
                        .map((x) => x.label)
                        .slice(0, 2)
                        .join(", ") + (draftTypes.length > 2 ? ` +${draftTypes.length - 2}` : "")
                    : t("filters.typeAny")
                }
                customStyles={{ maxHeight: "240px" }}
                hideFilter
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftTypes([])}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("type")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Popover>

      {/* STATUS POPOVER (Select; allow overflow) */}
      <Popover appearance="settings"
        open={openFilter === "status"}
        anchorRef={statusAnchorRef}
        onClose={() => setOpenFilter(null)}
        width={420}
       title={t("filters.byStatusTitle")}>
        <div className="p-4 overflow-visible">


          <div className="mt-3 relative z-[1000000] overflow-visible">
            <div className="[&_input[type=text]]:hidden overflow-visible">
              <Select<StatusOption>
                label={t("filters.statusLabel")}
                items={statusOptions}
                selected={selectedDraftStatusOptions}
                onChange={(list) => setDraftStatuses(uniq((list || []).map((x) => x.key)))}
                getItemKey={(item) => item.key}
                getItemLabel={(item) => item.label}
                buttonLabel={draftStatusButtonLabel}
                customStyles={{ maxHeight: "240px" }}
                hideFilter
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftStatuses([])}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("status")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Popover>



      <Snackbar notificationKey={snack}
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={6000}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </>
  );
};

export default EntitySettings;
