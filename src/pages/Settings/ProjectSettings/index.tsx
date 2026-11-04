import DataTable from "@/shared/ui/DataTable";
import { recordName } from "@/shared/ui/DataTable/recordName";
import SettingsFilters from "@/shared/ui/Settings/SettingsFilters";
import { SettingsFilter as Chip, SettingsClearFilters as ClearFiltersChip } from "@/shared/ui/Settings/SettingsFilter";
/* -------------------------------------------------------------------------- */
/* File: src/pages/Settings/ProjectSettings/index.tsx                                         */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Snackbar from "@/shared/ui/Snackbar";

import Select from "src/shared/ui/Select/Select";
import Popover from "src/shared/ui/Popover";

import ProjectModal from "./ProjectModal";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { PermissionMiddleware } from "src/middlewares";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";

import type { Project, GetProjectsParams } from "@/models/settings/projects";

/* ----------------------------- Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ------------------------- Types / constants ----------------------------- */
const PROJECT_TYPE_VALUES = [
  "internal",
  "client",
  "research",
  "operational",
  "marketing",
  "product",
  "it",
  "event",
  "capex",
] as const;

type ProjectType = (typeof PROJECT_TYPE_VALUES)[number];

function isProjectType(v: unknown): v is ProjectType {
  return PROJECT_TYPE_VALUES.includes(v as ProjectType);
}

type FilterKey = "code" | "search" | "type" | "status" | null;

type StatusKey = "active" | "inactive";
type StatusOption = { key: StatusKey; label: string };

type TypeOption = { key: ProjectType; label: string };

/* --------------------------------- Helpers -------------------------------- */


function sortOverlayByCodeThenName(a: Project, b: Project) {
  const ca = (a.code || "").toString();
  const cb = (b.code || "").toString();
  if (ca && cb && ca !== cb) return ca.localeCompare(cb, "en", { numeric: true });
  return (a.name || "").localeCompare(b.name || "", "en");
}

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

function toActiveParamFromStatusKeys(keys: StatusKey[]): GetProjectsParams["active"] | undefined {
  const mode = computeStatusMode(keys);
  if (mode === "active") return "true";
  if (mode === "inactive") return "false";
  return undefined;
}

function selectedTypeParamFromKeys(keys: ProjectType[]): GetProjectsParams["type"] | undefined {
  const uniqKeys = uniq(keys.filter((x) => isProjectType(x)));
  return uniqKeys.length === 1 ? uniqKeys[0] : undefined;
}

/* ------------------------------- Chip UI ---------------------------------- */





/* --------------------------------- Row ------------------------------------ */



/* -------------------------------------------------------------------------- */

const ProjectSettings: React.FC = () => {
  const { t, i18n } = useTranslation("projectSettings");
  const { isOwner, isSuperUser, permissions } = useAuthContext();

  const canViewProjects = useMemo(() => {
    if (isOwner) return true;
    return permissions.includes("view_project");
  }, [isOwner, permissions]);

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  /* Snackbar */
  const [snack, setSnack] = useState<Snack>(null);

  /* Modal state */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingProject, setEditingProject] = useState<Project | null>(null);









  /* Overlay */
  const [added, setAdded] = useState<Project[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ------------------------------- Applied filters ------------------------- */
  const [appliedCode, setAppliedCode] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedTypes, setAppliedTypes] = useState<ProjectType[]>([]);
  const [appliedStatuses, setAppliedStatuses] = useState<StatusKey[]>([]);

  const appliedStatusMode = useMemo(() => computeStatusMode(appliedStatuses), [appliedStatuses]);
  const appliedTypeParam = useMemo(() => selectedTypeParamFromKeys(appliedTypes), [appliedTypes]);

  const hasAppliedFilters = useMemo(() => {
    return (
      appliedCode.trim() !== "" ||
      appliedSearch.trim() !== "" ||
      appliedTypes.length > 0 ||
      appliedStatuses.length > 0
    );
  }, [appliedCode, appliedSearch, appliedTypes, appliedStatuses]);

  /* ------------------------------- Popover state --------------------------- */
  const [openFilter, setOpenFilter] = useState<FilterKey>(null);

  const [draftCode, setDraftCode] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [draftTypes, setDraftTypes] = useState<ProjectType[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<StatusKey[]>([]);

  /* ------------------------------- Anchors --------------------------------- */
  const codeAnchorRef = useRef<HTMLDivElement | null>(null);
  const searchAnchorRef = useRef<HTMLDivElement | null>(null);
  const typeAnchorRef = useRef<HTMLDivElement | null>(null);
  const statusAnchorRef = useRef<HTMLDivElement | null>(null);

  /* ------------------------------- Options --------------------------------- */
  const typeOptions: TypeOption[] = useMemo(() => {
    return PROJECT_TYPE_VALUES.map((k) => ({ key: k, label: t(`types.${k}`) }));
  }, [t]);

  const statusOptions: StatusOption[] = useMemo(() => {
    return [
      { key: "active", label: t("filters.status.active", { defaultValue: "Active" }) },
      { key: "inactive", label: t("filters.status.inactive", { defaultValue: "Inactive" }) },
    ];
  }, [t]);

  /* ------------------------------ Labels (chips) --------------------------- */
  const allLabel = t("filters.status.all", { defaultValue: "All" });
  const activeLabel = t("filters.status.active", { defaultValue: "Active" });
  const inactiveLabel = t("filters.status.inactive", { defaultValue: "Inactive" });

  const appliedStatusValue = useMemo(() => {
    if (appliedStatusMode === "active") return activeLabel;
    if (appliedStatusMode === "inactive") return inactiveLabel;
    return allLabel;
  }, [appliedStatusMode, activeLabel, inactiveLabel, allLabel]);

  const draftStatusMode = useMemo(() => computeStatusMode(draftStatuses), [draftStatuses]);

  const draftStatusButtonLabel = useMemo(() => {
    if (draftStatusMode === "active") return activeLabel;
    if (draftStatusMode === "inactive") return inactiveLabel;
    return allLabel;
  }, [draftStatusMode, activeLabel, inactiveLabel, allLabel]);

  const selectedDraftStatusOptions = useMemo(() => {
    const selected = new Set(draftStatuses);
    return statusOptions.filter((o) => selected.has(o.key));
  }, [draftStatuses, statusOptions]);

  const selectedDraftTypeOptions = useMemo(() => {
    const selected = new Set(draftTypes);
    return typeOptions.filter((o) => selected.has(o.key));
  }, [draftTypes, typeOptions]);

  const draftTypeButtonLabel = useMemo(() => {
    const one = selectedTypeParamFromKeys(draftTypes);
    if (one) return typeOptions.find((x) => x.key === one)?.label ?? t("filters.typeAll", { defaultValue: "All" });
    if (draftTypes.length > 1) return t("filters.multi", { defaultValue: "Multiple" });
    return t("filters.typeAll", { defaultValue: "All" });
  }, [draftTypes, typeOptions, t]);

  const appliedTypeChipValue = useMemo(() => {
    if (!appliedTypes.length) return "";
    const one = selectedTypeParamFromKeys(appliedTypes);
    if (one) return typeOptions.find((x) => x.key === one)?.label ?? "";
    return t("filters.multi", { defaultValue: "Multiple" });
  }, [appliedTypes, typeOptions, t]);

  /* --------------------------- Pagination (reusable) ----------------------- */


  const fetchProjectsPage = useCallback(
    async (cursor?: string, pageSize = 20) => {
      if (!canViewProjects) {
        return { items: [] as Project[], nextCursor: undefined as string | undefined };
      }




      {
        const params: GetProjectsParams = {
          cursor,
          ...{ page_size: pageSize, include_count: "true" },
          code: appliedCode.trim() || undefined,
          q: appliedSearch.trim() || undefined,
          active: toActiveParamFromStatusKeys(appliedStatuses),
          type: appliedTypeParam,
        };

        const { data, meta } = await api.getProjects(params);

        const items = (data?.results ?? []) as Project[];

        const nextUrl = meta?.pagination?.next ?? (data as unknown as { next?: string | null }).next ?? null;
        const nextCursor = nextUrl ? (getCursorFromUrl(nextUrl) || nextUrl) : undefined;

        return { items, nextCursor, totalCount: (data as unknown as { count?: number }).count };
      }
    },
    [canViewProjects, appliedCode, appliedSearch, appliedStatuses, appliedTypeParam]
  );

  const pager = useCursorPager<Project>(fetchProjectsPage, {
    autoLoadFirst: canViewProjects,
    deps: [canViewProjects, appliedCode, appliedSearch, appliedStatuses, appliedTypeParam],
  });

  const { refresh } = pager;

  useEffect(() => {
    if (!canViewProjects) return;
    refresh();
  }, [canViewProjects, refresh]);

  /* ------------------------------ Filter apply/clear ------------------------ */
  const togglePopover = useCallback((key: Exclude<FilterKey, null>) => {
    setOpenFilter((prev) => (prev === key ? null : key));
  }, []);

  const applyFromDraft = useCallback(
    (key: Exclude<FilterKey, null>) => {
      if (key === "code") {
        const next = draftCode.trim();
        if (next === appliedCode.trim()) refresh();
        else setAppliedCode(next);
      }

      if (key === "search") {
        const next = draftSearch.trim();
        if (next === appliedSearch.trim()) refresh();
        else setAppliedSearch(next);
      }

      if (key === "type") {
        const next = uniq(draftTypes);
        const same =
          next.length === appliedTypes.length &&
          next.every((x) => appliedTypes.includes(x)) &&
          appliedTypes.every((x) => next.includes(x));

        if (same) refresh();
        else setAppliedTypes(next);
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
    [
      draftCode,
      draftSearch,
      draftTypes,
      draftStatuses,
      appliedCode,
      appliedSearch,
      appliedTypes,
      appliedStatuses,
      refresh,
    ]
  );

  const clearOne = useCallback((key: Exclude<FilterKey, null>) => {
    if (key === "code") setAppliedCode("");
    if (key === "search") setAppliedSearch("");
    if (key === "type") setAppliedTypes([]);
    if (key === "status") setAppliedStatuses([]);
    setOpenFilter(null);
  }, []);

  const clearAll = useCallback(() => {
    if (!hasAppliedFilters) {
      refresh();
      return;
    }
    setAppliedCode("");
    setAppliedSearch("");
    setAppliedTypes([]);
    setAppliedStatuses([]);
    setOpenFilter(null);
  }, [hasAppliedFilters, refresh]);

  /* ------------------------------ Draft sync on open ------------------------ */
  useEffect(() => {
    if (openFilter === "code") setDraftCode(appliedCode);
    if (openFilter === "search") setDraftSearch(appliedSearch);
    if (openFilter === "type") setDraftTypes(appliedTypes);
    if (openFilter === "status") setDraftStatuses(appliedStatuses);
  }, [openFilter, appliedCode, appliedSearch, appliedTypes, appliedStatuses]);

  /* ------------------------------ Focus on open ----------------------------- */
  useEffect(() => {
    if (openFilter === "code") {
      requestAnimationFrame(() => {
        const el = document.getElementById("project-filter-code-input") as HTMLInputElement | null;
        el?.focus();
        el?.select?.();
      });
    }
    if (openFilter === "search") {
      requestAnimationFrame(() => {
        const el = document.getElementById("project-filter-search-input") as HTMLInputElement | null;
        el?.focus();
        el?.select?.();
      });
    }
  }, [openFilter]);

  /* ------------------------------ Overlay helpers -------------------------- */
  const matchesFilters = useCallback(
    (p: Project) => {
      // status
      if (appliedStatusMode === "active" && p.is_active === false) return false;
      if (appliedStatusMode === "inactive" && p.is_active !== false) return false;

      // type (only enforce when backend param is a single type)
      if (appliedTypeParam) {
        if ((p.type || "").toLowerCase() !== appliedTypeParam.toLowerCase()) return false;
      }

      // code filter
      const c = appliedCode.trim().toLowerCase();
      if (c) {
        if (!((p.code || "").toLowerCase().includes(c))) return false;
      }

      // search q
      const q = appliedSearch.trim().toLowerCase();
      if (q) {
        const hay = `${p.code || ""} ${p.name || ""} ${p.description || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    },
    [appliedStatusMode, appliedTypeParam, appliedCode, appliedSearch]
  );

  useEffect(() => {
    setAdded((prev) => prev.filter((p) => matchesFilters(p)));
  }, [matchesFilters]);

  const visibleItems = useMemo(() => {
    const addedFiltered = added
      .filter((p) => matchesFilters(p))
      .slice()
      .sort(sortOverlayByCodeThenName);

    const addedIdsSet = new Set(addedFiltered.map((p) => p.id));
    const base = pager.items.filter((p) => !deletedIds.has(p.id) && !addedIdsSet.has(p.id)).filter(matchesFilters);

    return [...addedFiltered, ...base];
  }, [added, deletedIds, pager.items, matchesFilters]);

  /* ------------------------------ Type label helper ------------------------ */




  /* ------------------------------ Handlers -------------------------------- */
  const openCreateModal = () => {
    setModalMode("create");
    setEditingProject(null);
    setModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setModalMode("edit");
    setEditingProject(project);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProject(null);
  };



  /* ------------------------------ Loading --------------------------------- */
  const isInitialLoading = pager.loading && pager.items.length === 0;
  const isBackgroundSync = pager.loading && pager.items.length > 0;

  const globalBusy = isBackgroundSync  || modalOpen;

  const codeChipValue = appliedCode.trim() ? truncate(appliedCode.trim(), 22) : "";
  const searchChipValue = appliedSearch.trim() ? truncate(appliedSearch.trim(), 22) : "";
  const statusChipValue = appliedStatuses.length ? appliedStatusValue : "";
  const typeChipValue = appliedTypes.length ? appliedTypeChipValue : "";

  const shouldBlockOnInitial = isInitialLoading && canViewProjects;

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
          <div className="settings-intro"><div className="px-5 py-4 flex items-center gap-3">


              <div className="flex items-center gap-3">


                {isBackgroundSync && (<span className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-white/70 backdrop-blur-sm">
                    {t("badge.syncing")}
                  </span>)}
              </div>
            </div></div>

          <PermissionMiddleware codeName={"view_project"} behavior="lock">
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

                      <div ref={searchAnchorRef}>
                        <Chip
                          label={t("filters.searchLabel", { defaultValue: "Search" })}
                          value={searchChipValue ? `• ${searchChipValue}` : undefined}
                          active={!!appliedSearch.trim()}
                          onClick={() => togglePopover("search")}
                          expanded={openFilter === "search"}
                          onClear={appliedSearch.trim() ? () => clearOne("search") : undefined}
                          disabled={globalBusy}
                        />
                      </div>

                      <div ref={typeAnchorRef}>
                        <Chip
                          label={t("filters.typeLabel", { defaultValue: "Type" })}
                          value={typeChipValue ? `• ${typeChipValue}` : undefined}
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
                      <PermissionMiddleware codeName={"add_project"}>
                        <Button onClick={openCreateModal} className="!py-1.5" disabled={globalBusy}>
                          {t("btn.addProject")}
                        </Button>
                      </PermissionMiddleware>
                    </div>
                  </div>
                </div>
<DataTable onDeleted={ids => {
                if (!ids.length) return;
                const removed = new Set(ids);
                setDeletedIds(current => new Set([...current, ...removed]));
                setAdded(current => current.filter(item => !removed.has(String(item.id))));
                return pager.refresh();
              }} pager={pager} busy={globalBusy} items={visibleItems} columns={[{key:"name",label:t("common:records.name"),render:item=>recordName(item)},{key:"code",label:t("common:records.fields.code"),render:item=>String(item.code??"—")},{key:"description",label:t("common:records.fields.description"),render:item=>String(item.description??"—")}]} emptyLabel={t("empty")} selectable canEdit={isOwner||isSuperUser||permissions.includes("change_project")} canDelete={isOwner||isSuperUser||permissions.includes("delete_project")} onEdit={openEditModal} onDelete={item=>api.deleteProject(item.id)} error={pager.error}/>
            </section>
          </PermissionMiddleware>
        </div>

        <PermissionMiddleware codeName={["add_project", "change_project"]}>
          <ProjectModal
            isOpen={modalOpen}
            mode={modalMode}
            project={editingProject}
            onClose={closeModal}
            onNotify={(s) => setSnack(s)}
            onSaved={async (res) => {
              try {
                if (res.mode === "create" && res.created) {
                  setAdded((prev) => [res.created!, ...prev]);
                }
                await pager.refresh();
              } catch {
                setSnack({ message: t("errors.loadFailedTitle"), severity: "error" });
              }
            }}
          />
        </PermissionMiddleware>
      </main>

      {/* CODE POPOVER */}
      <Popover appearance="settings" open={openFilter === "code"} anchorRef={codeAnchorRef} onClose={() => setOpenFilter(null)} title={t("filters.byCodeTitle", { defaultValue: "Filter by code" })}>
        <div className="p-4">


          <div className="mt-3">
            <Input
              kind="text"
              id="project-filter-code-input"
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
              className="text-[12px] text-gray-600 hover:text-gray-900"
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

      {/* SEARCH POPOVER */}
      <Popover appearance="settings"
        open={openFilter === "search"}
        anchorRef={searchAnchorRef}
        onClose={() => setOpenFilter(null)}
       title={t("filters.bySearchTitle", { defaultValue: "Search projects" })}>
        <div className="p-4">


          <div className="mt-3">
            <Input
              kind="text"
              id="project-filter-search-input"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("search");
                }
              }}
              placeholder={t("filters.searchPlaceholder", { defaultValue: "Search by name, code…" })}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftSearch("")}
              disabled={globalBusy}
            >
              {t("filters.clear", { defaultValue: "Clear" })}
            </button>

            <Button onClick={() => applyFromDraft("search")} disabled={globalBusy}>
              {t("filters.apply", { defaultValue: "Apply" })}
            </Button>
          </div>
        </div>
      </Popover>

      {/* TYPE POPOVER */}
      <Popover appearance="settings"
        open={openFilter === "type"}
        anchorRef={typeAnchorRef}
        onClose={() => setOpenFilter(null)}
        width={420}
       title={t("filters.byTypeTitle", { defaultValue: "Filter by type" })}>
        <div className="p-4 overflow-visible">


          <div className="mt-3 relative z-[1000000] overflow-visible">
            <div className="[&_input[type=text]]:hidden overflow-visible">
              <Select<TypeOption>
                label={t("filters.typeLabel", { defaultValue: "Type" })}
                items={typeOptions}
                selected={selectedDraftTypeOptions}
                onChange={(list) => setDraftTypes(uniq((list || []).map((x) => x.key)))}
                getItemKey={(item) => item.key}
                getItemLabel={(item) => item.label}
                buttonLabel={draftTypeButtonLabel}
                customStyles={{ maxHeight: "260px" }}
                hideFilter
              />
            </div>

            <div className="mt-2 text-[11px] text-gray-500">
              {t("filters.typeHint", { defaultValue: "Tip: select one type to filter; multiple means all types." })}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftTypes([])}
              disabled={globalBusy}
            >
              {t("filters.clear", { defaultValue: "Clear" })}
            </button>

            <Button onClick={() => applyFromDraft("type")} disabled={globalBusy}>
              {t("filters.apply", { defaultValue: "Apply" })}
            </Button>
          </div>
        </div>
      </Popover>

      {/* STATUS POPOVER */}
      <Popover appearance="settings"
        open={openFilter === "status"}
        anchorRef={statusAnchorRef}
        onClose={() => setOpenFilter(null)}
        width={420}
       title={t("filters.byStatusTitle", { defaultValue: "Filter by status" })}>
        <div className="p-4 overflow-visible">


          <div className="mt-3 relative z-[1000000] overflow-visible">
            <div className="[&_input[type=text]]:hidden overflow-visible">
              <Select<StatusOption>
                label={t("filters.statusLabel", { defaultValue: "Status" })}
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
              {t("filters.clear", { defaultValue: "Clear" })}
            </button>

            <Button onClick={() => applyFromDraft("status")} disabled={globalBusy}>
              {t("filters.apply", { defaultValue: "Apply" })}
            </Button>
          </div>
        </div>
      </Popover>



      <Snackbar
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

export default ProjectSettings;
