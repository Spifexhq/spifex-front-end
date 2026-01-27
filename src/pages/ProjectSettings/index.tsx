/* -------------------------------------------------------------------------- */
/* File: src/pages/ProjectSettings.tsx                                         */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Snackbar from "@/shared/ui/Snackbar";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import PaginationArrows from "@/components/PaginationArrows/PaginationArrows";
import SelectDropdown from "@/shared/ui/SelectDropdown/SelectDropdown";
import Popover from "src/shared/ui/Popover";

import ProjectModal from "./ProjectModal";

import { api } from "@/api/requests";
import { PermissionMiddleware } from "src/middlewares";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";

import type { TFunction } from "i18next";
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
function getInitials() {
  return "PJ";
}

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

const Chip = ({
  label,
  value,
  active,
  onClick,
  onClear,
  disabled,
}: {
  label: string;
  value?: string;
  active: boolean;
  onClick: () => void;
  onClear?: () => void;
  disabled?: boolean;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50",
        active ? "border-gray-300 bg-white" : "border-gray-200 bg-white",
      ].join(" ")}
    >
      {!active ? (
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-gray-200 text-gray-700 text-[12px] leading-none">
          +
        </span>
      ) : (
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-gray-200 text-gray-700 text-[12px] leading-none">
          ✓
        </span>
      )}

      <span className="text-gray-800 font-medium">{label}</span>

      {active && value ? <span className="text-gray-700 font-normal">{value}</span> : null}

      {active && onClear ? (
        <span
          role="button"
          aria-label="Clear"
          className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
        >
          ×
        </span>
      ) : null}
    </button>
  );
};

const ClearFiltersChip = ({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition",
        "border-red-200 text-red-600 bg-white",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-red-50",
      ].join(" ")}
    >
      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-red-200 text-red-600 text-[12px] leading-none">
        ×
      </span>
      <span>{label}</span>
    </button>
  );
};

/* --------------------------------- Row ------------------------------------ */

const Row = ({
  project,
  onEdit,
  onDelete,
  t,
  busy,
  typeLabel,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
  t: TFunction;
  busy?: boolean;
  typeLabel: string;
}) => (
  <div className={`flex items-center justify-between px-4 py-2.5 ${busy ? "opacity-70 pointer-events-none" : ""}`}>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">
        {t("row.codePrefix")} {project.code || "—"} {typeLabel ? `• ${typeLabel}` : ""}
      </p>
      <p className="text-[13px] font-medium text-gray-900 truncate">
        {project.name || t("row.untitled")}
        {project.description ? ` — ${project.description}` : ""}
      </p>
    </div>

    <div className="flex items-center gap-3 shrink-0">
      <span className="text-[12px] text-gray-700">{project.is_active ? t("row.active") : t("row.inactive")}</span>

      <div className="flex gap-2">
        <PermissionMiddleware codeName={"change_project"}>
          <Button variant="outline" onClick={() => onEdit(project)} disabled={busy}>
            {t("btn.edit")}
          </Button>
        </PermissionMiddleware>

        <PermissionMiddleware codeName={"delete_project"}>
          <Button variant="outline" onClick={() => onDelete(project)} disabled={busy} aria-busy={busy || undefined}>
            {t("btn.delete")}
          </Button>
        </PermissionMiddleware>
      </div>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */

const ProjectSettings: React.FC = () => {
  const { t, i18n } = useTranslation("projectSettings");

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

  /* ConfirmToast */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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
  const inflightRef = useRef(false);

  const fetchProjectsPage = useCallback(
    async (cursor?: string) => {
      if (inflightRef.current) {
        return { items: [] as Project[], nextCursor: undefined as string | undefined };
      }

      inflightRef.current = true;
      try {
        const params: GetProjectsParams = {
          cursor,
          code: appliedCode.trim() || undefined,
          q: appliedSearch.trim() || undefined,
          active: toActiveParamFromStatusKeys(appliedStatuses),
          type: appliedTypeParam,
        };

        const { data, meta } = await api.getProjects(params);

        const items = (data?.results ?? []) as Project[];

        const nextUrl = meta?.pagination?.next ?? (data as unknown as { next?: string | null }).next ?? null;
        const nextCursor = nextUrl ? (getCursorFromUrl(nextUrl) || nextUrl) : undefined;

        return { items, nextCursor };
      } finally {
        inflightRef.current = false;
      }
    },
    [appliedCode, appliedSearch, appliedStatuses, appliedTypeParam]
  );

  const pager = useCursorPager<Project>(fetchProjectsPage, {
    autoLoadFirst: true,
    deps: [appliedCode, appliedSearch, appliedStatuses, appliedTypeParam],
  });

  const isInitialLoading = pager.loading && pager.items.length === 0;
  const isBackgroundSync = pager.loading && pager.items.length > 0;

  const { refresh } = pager;

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
  const typeLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of PROJECT_TYPE_VALUES) m.set(v, t(`types.${v}`));
    return m;
  }, [t]);

  const getTypeLabel = useCallback(
    (value: unknown) => {
      if (!isProjectType(value)) return (value as string | undefined) ?? "—";
      return typeLabelMap.get(value) ?? "—";
    },
    [typeLabelMap]
  );

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

  const requestDeleteProject = (project: Project) => {
    const name = project.name ?? project.code ?? "";
    setConfirmText(t("confirm.deleteTitle", { name }));

    setConfirmAction(() => async () => {
      setDeleteTargetId(project.id);

      try {
        setDeletedIds((prev) => new Set(prev).add(project.id));
        await api.deleteProject(project.id);

        await pager.refresh();
        setAdded((prev) => prev.filter((p) => p.id !== project.id));

        setSnack({ message: t("toast.deleted"), severity: "info" });
      } catch (err) {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(project.id);
          return next;
        });

        setSnack({ message: err instanceof Error ? err.message : t("errors.deleteError"), severity: "error" });
      } finally {
        setDeleteTargetId(null);
        setConfirmOpen(false);
        setConfirmBusy(false);
      }
    });

    setConfirmOpen(true);
  };

  /* ------------------------------ Loading --------------------------------- */
  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  const globalBusy = isBackgroundSync || confirmBusy || modalOpen;

  const codeChipValue = appliedCode.trim() ? truncate(appliedCode.trim(), 22) : "";
  const searchChipValue = appliedSearch.trim() ? truncate(appliedSearch.trim(), 22) : "";
  const statusChipValue = appliedStatuses.length ? appliedStatusValue : "";
  const typeChipValue = appliedTypes.length ? appliedTypeChipValue : "";

  return (
    <>
      <TopProgress active={isBackgroundSync} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials()}
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.settings")}</div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{t("header.projects")}</h1>
                </div>

                {isBackgroundSync && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-white/70 backdrop-blur-sm">
                    {t("badge.syncing")}
                  </span>
                )}
              </div>
            </div>
          </header>

          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-3">
                  {/* LEFT: chips */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div ref={codeAnchorRef}>
                      <Chip
                        label={t("filters.codeLabel", { defaultValue: "Code" })}
                        value={codeChipValue ? `• ${codeChipValue}` : undefined}
                        active={!!appliedCode.trim()}
                        onClick={() => togglePopover("code")}
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
                  </div>

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

              {pager.error ? (
                <div className="p-6 text-center">
                  <p className="text-[13px] font-medium text-red-700 mb-2">{t("errors.loadFailedTitle")}</p>
                  <p className="text-[11px] text-red-600 mb-4">{pager.error}</p>
                  <Button variant="outline" size="sm" onClick={pager.refresh} disabled={globalBusy}>
                    {t("btn.retry")}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {visibleItems.length === 0 ? (
                      <p className="p-4 text-center text-sm text-gray-500">{t("empty")}</p>
                    ) : (
                      visibleItems.map((p) => {
                        const rowBusy = globalBusy || deleteTargetId === p.id || deletedIds.has(p.id);
                        return (
                          <Row
                            key={p.id}
                            project={p}
                            onEdit={openEditModal}
                            onDelete={requestDeleteProject}
                            t={t}
                            busy={rowBusy}
                            typeLabel={getTypeLabel(p.type)}
                          />
                        );
                      })
                    )}
                  </div>

                  <PaginationArrows
                    onPrev={pager.prev}
                    onNext={pager.next}
                    disabledPrev={!pager.canPrev || globalBusy}
                    disabledNext={!pager.canNext || globalBusy}
                  />
                </>
              )}
            </div>
          </section>
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
      <Popover open={openFilter === "code"} anchorRef={codeAnchorRef} onClose={() => setOpenFilter(null)}>
        <div className="p-4">
          <div className="text-[14px] font-semibold text-gray-900">
            {t("filters.byCodeTitle", { defaultValue: "Filter by code" })}
          </div>

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
      <Popover
        open={openFilter === "search"}
        anchorRef={searchAnchorRef}
        onClose={() => setOpenFilter(null)}
      >
        <div className="p-4">
          <div className="text-[14px] font-semibold text-gray-900">
            {t("filters.bySearchTitle", { defaultValue: "Search projects" })}
          </div>

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
      <Popover
        open={openFilter === "type"}
        anchorRef={typeAnchorRef}
        onClose={() => setOpenFilter(null)}
        width={420}
      >
        <div className="p-4 overflow-visible">
          <div className="text-[14px] font-semibold text-gray-900">
            {t("filters.byTypeTitle", { defaultValue: "Filter by type" })}
          </div>

          <div className="mt-3 relative z-[1000000] overflow-visible">
            <div className="[&_input[type=text]]:hidden overflow-visible">
              <SelectDropdown<TypeOption>
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
      <Popover
        open={openFilter === "status"}
        anchorRef={statusAnchorRef}
        onClose={() => setOpenFilter(null)}
        width={420}
      >
        <div className="p-4 overflow-visible">
          <div className="text-[14px] font-semibold text-gray-900">
            {t("filters.byStatusTitle", { defaultValue: "Filter by status" })}
          </div>

          <div className="mt-3 relative z-[1000000] overflow-visible">
            <div className="[&_input[type=text]]:hidden overflow-visible">
              <SelectDropdown<StatusOption>
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

      <ConfirmToast
        open={confirmOpen}
        text={confirmText}
        confirmLabel={t("btn.delete")}
        cancelLabel={t("btn.cancel")}
        variant="danger"
        onCancel={() => {
          if (confirmBusy) return;
          setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (confirmBusy || !confirmAction) return;
          setConfirmBusy(true);
          confirmAction()
            .catch(() => setSnack({ message: t("errors.confirmFailed"), severity: "error" }))
            .finally(() => setConfirmBusy(false));
        }}
        busy={confirmBusy}
      />

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
