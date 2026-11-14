import { apiErrorMessage } from "@/lib/apiErrorMessage";
import DataTable from "@/shared/ui/DataTable";
import { recordName } from "@/shared/ui/DataTable/recordName";
import SettingsFilters from "@/shared/ui/Settings/SettingsFilters";
import { SettingsFilter as Chip, SettingsClearFilters as ClearFiltersChip } from "@/shared/ui/Settings/SettingsFilter";
/* --------------------------------------------------------------------------
 * File: src/pages/Settings/DepartmentSettings/index.tsx
 * -------------------------------------------------------------------------- */

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Snackbar from "@/shared/ui/Snackbar";
import { SettingsPageSkeleton } from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";

import Select from "src/shared/ui/Select/Select";
import Popover from "src/shared/ui/Popover";

import DepartmentModal from "./DepartmentModal";

import { api } from "@/core/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { PermissionMiddleware } from "src/middlewares";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";

import type { Department, GetDepartmentsParams } from "@/models/settings/departments";

/* ------------------------------ Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* --------------------------------- Helpers -------------------------------- */


function sortOverlayByCodeThenName(a: Department, b: Department) {
  const ca = (a.code || "").toString();
  const cb = (b.code || "").toString();
  if (ca && cb && ca !== cb) return ca.localeCompare(cb, "en", { numeric: true });
  return (a.name || "").localeCompare(b.name || "", "en");
}

type FilterKey = "code" | "name" | "status" | null;

type StatusKey = "active" | "inactive";
type StatusOption = { key: StatusKey; label: string };

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

function toActiveParamFromStatusKeys(keys: StatusKey[]): GetDepartmentsParams["active"] | undefined {
  const mode = computeStatusMode(keys);
  if (mode === "active") return "true";
  if (mode === "inactive") return "false";
  return undefined;
}

/* ------------------------------- Chip UI ---------------------------------- */





/* ------------------------------ Row component ------------------------------ */



/* -------------------------------------------------------------------------- */

const DepartmentSettings: React.FC = () => {
  const { t, i18n } = useTranslation("departmentSettings");
  const { isOwner, isSuperUser, permissions } = useAuthContext();

  const canViewDepartments = useMemo(() => {
    if (isOwner) return true;
    return permissions.includes("view_department");
  }, [isOwner, permissions]);

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  /* ------------------------------- Modal state ----------------------------- */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  /* Snackbar */
  const [snack, setSnack] = useState<Snack>(null);







  /* Standard flags */


  /* Overlay */
  const [added, setAdded] = useState<Department[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ------------------------------- Applied filters ------------------------- */
  const [appliedCode, setAppliedCode] = useState("");
  const [appliedName, setAppliedName] = useState("");
  const [appliedStatuses, setAppliedStatuses] = useState<StatusKey[]>([]); // multi-select

  const appliedStatusMode = useMemo(() => computeStatusMode(appliedStatuses), [appliedStatuses]);

  const hasAppliedFilters = useMemo(() => {
    return appliedCode.trim() !== "" || appliedName.trim() !== "" || appliedStatuses.length > 0;
  }, [appliedCode, appliedName, appliedStatuses]);

  /* ------------------------------- Popover state --------------------------- */
  const [openFilter, setOpenFilter] = useState<FilterKey>(null);
  const [draftCode, setDraftCode] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftStatuses, setDraftStatuses] = useState<StatusKey[]>([]);

  /* ------------------------------- Anchors --------------------------------- */
  const codeAnchorRef = useRef<HTMLDivElement | null>(null);
  const nameAnchorRef = useRef<HTMLDivElement | null>(null);
  const statusAnchorRef = useRef<HTMLDivElement | null>(null);

  /* ------------------------------- Status options -------------------------- */
  const activeLabel = t("filters.status.active", { defaultValue: "Active" });
  const inactiveLabel = t("filters.status.inactive", { defaultValue: "Inactive" });
  const allLabel = t("filters.status.all", { defaultValue: "All" });

  const statusOptions: StatusOption[] = useMemo(
    () => [
      { key: "active", label: activeLabel },
      { key: "inactive", label: inactiveLabel },
    ],
    [activeLabel, inactiveLabel]
  );

  const appliedStatusValue = useMemo(() => {
    if (appliedStatusMode === "active") return activeLabel;
    if (appliedStatusMode === "inactive") return inactiveLabel;
    return allLabel;
  }, [appliedStatusMode, activeLabel, inactiveLabel, allLabel]);

  const draftStatusMode = useMemo(() => computeStatusMode(draftStatuses), [draftStatuses]);

  const draftButtonLabel = useMemo(() => {
    if (draftStatusMode === "active") return activeLabel;
    if (draftStatusMode === "inactive") return inactiveLabel;
    return allLabel;
  }, [draftStatusMode, activeLabel, inactiveLabel, allLabel]);

  const selectedDraftStatusOptions = useMemo(() => {
    const selected = new Set(draftStatuses);
    return statusOptions.filter((o) => selected.has(o.key));
  }, [draftStatuses, statusOptions]);

  /* --------------------------- Pagination (reusable) ----------------------- */


  const fetchDepartmentsPage = useCallback(
    async (cursor?: string, pageSize = 20) => {
      if (!canViewDepartments) {
        return { items: [] as Department[], nextCursor: undefined as string | undefined };
      }




      {
        const params: GetDepartmentsParams = {
          cursor,
          ...{ page_size: pageSize, include_count: "true" },
          code: appliedCode.trim() || undefined,
          name: appliedName.trim() || undefined,
          active: toActiveParamFromStatusKeys(appliedStatuses),
        };

        const { data, meta } = await api.getDepartments(params);

        const items = (data.results ?? []) as Department[];

        const nextUrl = meta?.pagination?.next ?? (data as unknown as { next?: string | null }).next ?? null;
        const nextCursor = nextUrl ? (getCursorFromUrl(nextUrl) || nextUrl) : undefined;

        return { items, nextCursor, totalCount: (data as unknown as { count?: number }).count };
      }
    },
    [canViewDepartments, appliedCode, appliedName, appliedStatuses]
  );

  const pager = useCursorPager<Department>(fetchDepartmentsPage, {
    autoLoadFirst: canViewDepartments,
    deps: [canViewDepartments, appliedCode, appliedName, appliedStatuses],
  });

  const { refresh } = pager;

  useEffect(() => {
    if (!canViewDepartments) return;
    refresh();
  }, [canViewDepartments, refresh]);

  /* ------------------------------ Filter apply/clear ------------------------ */
  const applyFromDraft = useCallback(
    (key: Exclude<FilterKey, null>) => {
      if (key === "code") {
        const next = draftCode.trim();
        if (next === appliedCode.trim()) refresh();
        else setAppliedCode(next);
      }

      if (key === "name") {
        const next = draftName.trim();
        if (next === appliedName.trim()) refresh();
        else setAppliedName(next);
      }

      if (key === "status") {
        const next = uniq(draftStatuses);
        const same =
          next.length === appliedStatuses.length &&
          next.every((x) => appliedStatuses.includes(x)) &&
          appliedStatuses.every((x) => next.includes(x));

        if (same) refresh();
        else setAppliedStatuses(next);
      }

      setOpenFilter(null);
    },
    [draftCode, draftName, draftStatuses, appliedCode, appliedName, appliedStatuses, refresh]
  );

  const clearOne = useCallback((key: Exclude<FilterKey, null>) => {
    if (key === "code") setAppliedCode("");
    if (key === "name") setAppliedName("");
    if (key === "status") setAppliedStatuses([]);
    setOpenFilter(null);
  }, []);

  const clearAll = useCallback(() => {
    if (!hasAppliedFilters) {
      refresh();
      return;
    }
    setAppliedCode("");
    setAppliedName("");
    setAppliedStatuses([]);
    setOpenFilter(null);
  }, [hasAppliedFilters, refresh]);

  /* ------------------------------ Draft sync on open ------------------------ */
  useEffect(() => {
    if (openFilter === "code") setDraftCode(appliedCode);
    if (openFilter === "name") setDraftName(appliedName);
    if (openFilter === "status") setDraftStatuses(appliedStatuses);
  }, [openFilter, appliedCode, appliedName, appliedStatuses]);

  /* ------------------------------ Focus on open ----------------------------- */
  useEffect(() => {
    if (openFilter === "code") {
      requestAnimationFrame(() => {
        const el = document.getElementById("dept-filter-code-input") as HTMLInputElement | null;
        el?.focus();
        el?.select?.();
      });
    }
    if (openFilter === "name") {
      requestAnimationFrame(() => {
        const el = document.getElementById("dept-filter-name-input") as HTMLInputElement | null;
        el?.focus();
        el?.select?.();
      });
    }
  }, [openFilter]);

  /* ------------------------------ Overlay helpers -------------------------- */
  const matchesFilters = useCallback(
    (d: Department) => {
      const mode = appliedStatusMode;
      if (mode === "active" && d.is_active === false) return false;
      if (mode === "inactive" && d.is_active !== false) return false;

      if (appliedCode.trim()) {
        if (!(d.code || "").toLowerCase().includes(appliedCode.trim().toLowerCase())) return false;
      }

      if (appliedName.trim()) {
        if (!(d.name || "").toLowerCase().includes(appliedName.trim().toLowerCase())) return false;
      }

      return true;
    },
    [appliedCode, appliedName, appliedStatusMode]
  );

  useEffect(() => {
    setAdded((prev) => prev.filter((d) => matchesFilters(d)));
  }, [matchesFilters]);

  const visibleItems = useMemo(() => {
    const addedFiltered = added
      .filter((d) => matchesFilters(d))
      .slice()
      .sort(sortOverlayByCodeThenName);

    const addedIds = new Set(addedFiltered.map((d) => d.id));

    const base = pager.items
      .filter((d) => !deletedIds.has(d.id) && !addedIds.has(d.id))
      .filter((d) => matchesFilters(d));

    return [...addedFiltered, ...base];
  }, [added, deletedIds, pager.items, matchesFilters]);

  /* ------------------------------ Handlers --------------------------------- */
  const openCreateModal = () => {
    setModalMode("create");
    setEditingDept(null);
    setModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setModalMode("edit");
    setEditingDept(dept);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDept(null);
  };

  const togglePopover = useCallback((key: Exclude<FilterKey, null>) => {
    setOpenFilter((prev) => (prev === key ? null : key));
  }, []);




  /* ------------------------------- Loading UI ------------------------------ */
  const isInitialLoading = pager.loading && pager.items.length === 0;
  const isBackgroundSync = pager.loading && pager.items.length > 0;

  /* -------------------------------- Derived UI ---------------------------- */
  const globalBusy = isBackgroundSync  || modalOpen;

  const codeChipValue = appliedCode.trim() ? truncate(appliedCode.trim(), 22) : "";
  const nameChipValue = appliedName.trim() ? truncate(appliedName.trim(), 22) : "";
  const statusChipValue = appliedStatuses.length ? appliedStatusValue : "";

  const shouldBlockOnInitial = isInitialLoading && canViewDepartments;

  if (shouldBlockOnInitial) {
    return (
      <>
        <SettingsPageSkeleton rows={6} variant="settings-table" />
      </>
    );
  }

  return (
    <>
      <TopProgress active={isBackgroundSync} variant="top" />

      <main className="settings-page">
        <div className="settings-content ">


          <PermissionMiddleware codeName={"view_department"} behavior="lock">
            <section className="mt-6">
              <div className="mb-4">
                  <div className="flex items-center justify-between gap-3 settings-toolbar">
                    {/* LEFT: chips */}
                    <SettingsFilters active={hasAppliedFilters}>
                      <div ref={codeAnchorRef}>
                        <Chip
                          label={t("filters.codeLabel", { defaultValue: "Code" })}
                          value={codeChipValue ? `• ${codeChipValue}` : undefined}
                          active={!!appliedCode.trim()}
                          onClick={() => togglePopover("code")}
                          expanded={openFilter === "code"}
                          onClear={appliedCode.trim() ? () => clearOne("code") : undefined}
                          disabled={globalBusy}
                        />
                      </div>

                      <div ref={nameAnchorRef}>
                        <Chip
                          label={t("filters.nameLabel", { defaultValue: "Name" })}
                          value={nameChipValue ? `• ${nameChipValue}` : undefined}
                          active={!!appliedName.trim()}
                          onClick={() => togglePopover("name")}
                          expanded={openFilter === "name"}
                          onClear={appliedName.trim() ? () => clearOne("name") : undefined}
                          disabled={globalBusy}
                        />
                      </div>

                      <div ref={statusAnchorRef}>
                        <Chip
                          label={t("filters.statusLabel", { defaultValue: "Status" })}
                          value={statusChipValue ? `• ${statusChipValue}` : undefined}
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
                      <PermissionMiddleware codeName={"change_department"}>
                        <Button onClick={openCreateModal} className="!py-1.5" disabled={globalBusy}>
                          {t("buttons.add")}
                        </Button>
                      </PermissionMiddleware>
                    </div>
                  </div>
                </div>
<DataTable loadPreview={async item => (await api.getDepartment(item.id)).data} previewColumns={[{key:"name",label:t("preview.fields.name"),render:item=>item.name ?? "�"},{key:"code",label:t("preview.fields.code"),render:item=>item.code ?? "�"},{key:"is_active",label:t("preview.fields.is_active"),render:item=>t(item.is_active ? "preview.active" : "preview.inactive")}]} onDeleted={ids => {
                if (!ids.length) return;
                const removed = new Set(ids);
                setDeletedIds(current => new Set([...current, ...removed]));
                setAdded(current => current.filter(item => !removed.has(String(item.id))));
                return pager.refresh();
              }} pager={pager} busy={globalBusy} items={visibleItems} columns={[{key:"name",label:t("common:records.name"),render:item=>recordName(item)},{key:"code",label:t("common:records.fields.code"),render:item=>String(item.code??"—")},{key:"status",label:t("filters.statusLabel"),render:item=>item.is_active?activeLabel:inactiveLabel}]} emptyLabel={t("alerts.noData")} selectable canEdit={isOwner||isSuperUser||permissions.includes("change_department")} canDelete={isOwner||isSuperUser||permissions.includes("delete_department")} onEdit={openEditModal} onDelete={item=>api.deleteDepartment(item.id, (item as { version?: string }).version)} error={pager.error}/>
            </section>
          </PermissionMiddleware>
        </div>

        <PermissionMiddleware codeName={["add_department", "change_department"]}>
          <DepartmentModal
            isOpen={modalOpen}
            mode={modalMode}
            department={editingDept}
            onClose={closeModal}
            onNotify={(s) => setSnack(s)}
            onSaved={async (res) => {
              try {
                if (res.mode === "create" && res.created) {
                  setAdded((prev) => [res.created!, ...prev]);
                }
                await pager.refresh();
              } catch (notificationCause) {
                setSnack({ message: apiErrorMessage(notificationCause, t("errors.fetchError")), severity: "error" });
              }
            }}
          />
        </PermissionMiddleware>
      </main>

      {/* CODE POPOVER (PORTAL) */}
      <Popover appearance="settings"
        open={openFilter === "code"}
        anchorRef={codeAnchorRef}
        onClose={() => setOpenFilter(null)}
       title={t("filters.byCodeTitle", { defaultValue: "Filter by code" })}>
        <div className="p-4">


          <div className="mt-3">
            <Input
              kind="text"
              id="dept-filter-code-input"
              type="text"
              value={draftCode}
              onChange={(e) => setDraftCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("code");
                }
              }}
              placeholder={t("filters.codePlaceholder", { defaultValue: "Type a code…" })}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-gray-600 hover:text-gray-900"
              onClick={() => setDraftCode("")}
              disabled={globalBusy}
            >
              {t("filters.clear", { defaultValue: "Clear" })}
            </button>

            <Button onClick={() => applyFromDraft("code")} disabled={globalBusy}>
              {t("filters.apply", { defaultValue: "Apply" })}
            </Button>
          </div>
        </div>
      </Popover>

      {/* NAME POPOVER (PORTAL) */}
      <Popover appearance="settings"
        open={openFilter === "name"}
        anchorRef={nameAnchorRef}
        onClose={() => setOpenFilter(null)}
       title={t("filters.byNameTitle", { defaultValue: "Filter by name" })}>
        <div className="p-4">


          <div className="mt-3">
            <Input
              kind="text"
              id="dept-filter-name-input"
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("name");
                }
              }}
              placeholder={t("filters.namePlaceholder", { defaultValue: "Type a name…" })}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-gray-600 hover:text-gray-900"
              onClick={() => setDraftName("")}
              disabled={globalBusy}
            >
              {t("filters.clear", { defaultValue: "Clear" })}
            </button>

            <Button onClick={() => applyFromDraft("name")} disabled={globalBusy}>
              {t("filters.apply", { defaultValue: "Apply" })}
            </Button>
          </div>
        </div>
      </Popover>

      {/* STATUS POPOVER (PORTAL) */}
      <Popover appearance="settings"
        open={openFilter === "status"}
        anchorRef={statusAnchorRef}
        onClose={() => setOpenFilter(null)}
        width={420}
       title={t("filters.byStatusTitle", { defaultValue: "Filter by status" })}>
        <div className="p-4 overflow-visible">


          <div className="mt-3 relative z-[10060] overflow-visible">
            <div className="[&_input[type=text]]:hidden overflow-visible">
              <Select<StatusOption>
                label={t("filters.statusLabel", { defaultValue: "Status" })}
                items={statusOptions}
                selected={selectedDraftStatusOptions}
                onChange={(list) => setDraftStatuses(uniq((list || []).map((x) => x.key)))}
                getItemKey={(item) => item.key}
                getItemLabel={(item) => item.label}
                buttonLabel={draftButtonLabel}
                customStyles={{ maxHeight: "240px" }}
                hideFilter
              />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-xs text-gray-600 hover:text-gray-900"
              onClick={() => setDraftStatuses([])}
              disabled={globalBusy}
            >
              {t("filters.clear", { defaultValue: "Clear" })}
            </button>

            <Button onClick={() => applyFromDraft("status")} disabled={globalBusy}>
              {t("filters.apply", { defaultValue: "Apply" })}
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

export default DepartmentSettings;
