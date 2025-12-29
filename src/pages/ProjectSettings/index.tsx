/* --------------------------------------------------------------------------
 * File: src/pages/ProjectSettings.tsx
 * -------------------------------------------------------------------------- */

import React, { useEffect, useState, useCallback, useMemo } from "react";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";
import Input from "src/components/ui/Input";
import Button from "src/components/ui/Button";
import Snackbar from "src/components/ui/Snackbar";
import ConfirmToast from "src/components/ui/ConfirmToast";
import { SelectDropdown } from "src/components/ui/SelectDropdown";
import Checkbox from "src/components/ui/Checkbox";
import PaginationArrows from "@/components/PaginationArrows/PaginationArrows";

import { api } from "src/api/requests";
import { useAuthContext } from "src/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "src/lib/list";
import { useTranslation } from "react-i18next";

import type { TFunction } from "i18next";
import type { Project } from "src/models/settings/projects";

/* ----------------------------- Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ----------------------- In-memory guard for fetches ---------------------- */
let INFLIGHT_FETCH = false;

/* ------------------------------ Modal skeleton ---------------------------- */
const ModalSkeleton: React.FC = () => (
  <div className="space-y-3 py-1">
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="flex items-center gap-2 pt-2">
      <div className="h-5 w-5 rounded bg-gray-100 animate-pulse" />
      <div className="h-3 w-24 rounded bg-gray-100 animate-pulse" />
    </div>
    <div className="flex justify-end gap-2 pt-1">
      <div className="h-9 w-24 rounded-md bg-gray-100 animate-pulse" />
      <div className="h-9 w-28 rounded-md bg-gray-100 animate-pulse" />
    </div>
  </div>
);

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
type TypeOption = { label: string; value: ProjectType };

function isProjectType(v: unknown): v is ProjectType {
  return PROJECT_TYPE_VALUES.includes(v as ProjectType);
}

function getInitials() {
  return "PJ";
}

const emptyForm = {
  name: "",
  code: "",
  type: "internal" as ProjectType,
  description: "",
  is_active: true,
};
type FormState = typeof emptyForm;

/* stable sort by code then name */
function sortByCodeThenName(a: Project, b: Project) {
  const ca = (a.code || "").toString();
  const cb = (b.code || "").toString();
  if (ca && cb && ca !== cb) return ca.localeCompare(cb, "en", { numeric: true });
  return (a.name || "").localeCompare(b.name || "", "en");
}

/* Row */
const Row = ({
  project,
  onEdit,
  onDelete,
  canEdit,
  t,
  busy,
  typeLabel,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
  canEdit: boolean;
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
      <span className="text-[12px] text-gray-700">
        {project.is_active ? t("row.active") : t("row.inactive")}
      </span>

      {canEdit && (
        <>
          <Button variant="outline" onClick={() => onEdit(project)} disabled={busy}>
            {t("btn.edit")}
          </Button>
          <Button variant="outline" onClick={() => onDelete(project)} disabled={busy} aria-busy={busy || undefined}>
            {t("btn.delete")}
          </Button>
        </>
      )}
    </div>
  </div>
);

const ProjectSettings: React.FC = () => {
  const { t, i18n } = useTranslation("projectSettings");
  const { isOwner } = useAuthContext();

  useEffect(() => { document.title = t("title"); }, [t]);
  useEffect(() => { document.documentElement.lang = i18n.language; }, [i18n.language]);

  /* ----------------------------- Flags ------------------------------------ */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  /* ----------------------------- State ------------------------------------ */
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [snack, setSnack] = useState<Snack>(null);

  /* ConfirmToast */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  /* Overlay */
  const [added, setAdded] = useState<Project[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ----------------------------- Search (click-to-search) ------------------ */
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  /* ----------------------------- Cursor pagination ------------------------- */
  const fetchProjectsPage = useCallback(
    async (cursor?: string) => {
      if (INFLIGHT_FETCH) return { items: [] as Project[], nextCursor: undefined as string | undefined };
      INFLIGHT_FETCH = true;
      try {
        const { data, meta } = await api.getProjects({
          cursor,
          q: appliedQuery || undefined,
        });
        const items = ((data?.results ?? []) as Project[]).slice().sort(sortByCodeThenName);
        const nextUrl = meta?.pagination?.next ?? data?.next ?? null;
        const nextCursor = nextUrl ? (getCursorFromUrl(nextUrl) || nextUrl) : undefined;
        return { items, nextCursor };
      } finally {
        INFLIGHT_FETCH = false;
      }
    },
    [appliedQuery]
  );

  const pager = useCursorPager<Project>(fetchProjectsPage, {
    autoLoadFirst: true,
    deps: [appliedQuery],
  });

  const isInitialLoading = pager.loading && pager.items.length === 0;
  const isBackgroundSync = pager.loading && pager.items.length > 0;

  const { refresh } = pager;
  const onSearch = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed === appliedQuery) refresh();
    else setAppliedQuery(trimmed);
  }, [query, appliedQuery, refresh]);

  /* ------------------------------ Overlay helpers -------------------------- */
  const matchesQuery = useCallback((p: Project, q: string) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (p.code || "").toLowerCase().includes(s) ||
      (p.name || "").toLowerCase().includes(s) ||
      (p.description || "").toLowerCase().includes(s)
    );
  }, []);

  useEffect(() => {
    setAdded((prev) => prev.filter((p) => matchesQuery(p, appliedQuery)));
  }, [appliedQuery, matchesQuery]);

  const visibleItems = useMemo(() => {
    const addedFiltered = added.filter((p) => matchesQuery(p, appliedQuery));
    const addedIdsSet = new Set(addedFiltered.map((p) => p.id));
    const base = pager.items.filter((p) => !deletedIds.has(p.id) && !addedIdsSet.has(p.id));
    return [...addedFiltered, ...base];
  }, [added, deletedIds, pager.items, appliedQuery, matchesQuery]);

  /* ------------------------------ Type options (i18n) ---------------------- */
  const typeOptions = useMemo<TypeOption[]>(
    () =>
      PROJECT_TYPE_VALUES.map((value) => ({
        value,
        label: t(`types.${value}`),
      })),
    [t]
  );

  const getTypeLabel = useCallback(
    (value: unknown) => {
      if (!isProjectType(value)) return (value as string | undefined) ?? "—";
      return typeOptions.find((o) => o.value === value)?.label ?? "—";
    },
    [typeOptions]
  );

  /* ------------------------------ Handlers -------------------------------- */
  const openCreateModal = () => {
    setMode("create");
    setEditingProject(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = async (project: Project) => {
    setMode("edit");
    setEditingProject(project);
    setModalOpen(true);
    setIsDetailLoading(true);

    try {
      const res = await api.getProject(project.id);
      const detail = res.data as Project;

      setFormData({
        name: detail.name || "",
        code: detail.code || "",
        type: isProjectType(detail.type) ? detail.type : "internal",
        description: detail.description || "",
        is_active: detail.is_active ?? true,
      });
    } catch {
      setFormData({
        name: project.name || "",
        code: project.code || "",
        type: isProjectType(project.type) ? project.type : "internal",
        description: project.description || "",
        is_active: project.is_active ?? true,
      });
      setSnack({ message: t("errors.detailError"), severity: "error" });
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingProject(null);
    setFormData(emptyForm);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleActiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((p) => ({ ...p, is_active: e.target.checked }));
  };

  const submitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === "create") {
        const { data: created } = await api.addProject({
          name: formData.name,
          code: formData.code || "",
          type: formData.type,
          description: formData.description || "",
          is_active: formData.is_active,
        });
        setAdded((prev) => [created, ...prev]);
        setSnack({ message: t("toast.saved"), severity: "success" });
      } else if (editingProject) {
        await api.editProject(editingProject.id, {
          name: formData.name,
          code: formData.code,
          type: formData.type,
          description: formData.description,
          is_active: formData.is_active,
        });
        setSnack({ message: t("toast.saved"), severity: "success" });
      }

      await pager.refresh();
      closeModal();
    } catch (err) {
      setSnack({ message: err instanceof Error ? err.message : t("errors.saveError"), severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
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

  /* ------------------------------ UX hooks -------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  /* ------------------------------ Loading --------------------------------- */
  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  const headerBadge = isBackgroundSync ? (
    <span
      aria-live="polite"
      className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-white/70 backdrop-blur-sm"
    >
      {t("badge.syncing")}
    </span>
  ) : null;

  const canEdit = !!isOwner;
  const globalBusy = isSubmitting || isBackgroundSync || confirmBusy;

  /* -------------------------------- UI ------------------------------------ */
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
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">
                    {t("header.settings")}
                  </div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                    {t("header.projects")}
                  </h1>
                </div>
                {headerBadge}
              </div>
            </div>
          </header>

          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("section.list")}
                  </span>

                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                      placeholder={t("search.placeholder")}
                      aria-label={t("search.aria")}
                      disabled={globalBusy}
                    />
                    <Button onClick={onSearch} variant="outline" disabled={globalBusy}>
                      {t("search.button")}
                    </Button>

                    {canEdit && (
                      <Button onClick={openCreateModal} className="!py-1.5" disabled={globalBusy}>
                        {t("btn.addProject")}
                      </Button>
                    )}
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
                            canEdit={canEdit}
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
                    disabledPrev={!pager.canPrev || isBackgroundSync}
                    disabledNext={!pager.canNext || isBackgroundSync}
                  />
                </>
              )}
            </div>
          </section>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md" role="dialog" aria-modal="true">
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {mode === "create" ? t("modal.createTitle") : t("modal.editTitle")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label={t("modal.close")}
                  disabled={isSubmitting}
                >
                  &times;
                </button>
              </header>

              {mode === "edit" && isDetailLoading ? (
                <ModalSkeleton />
              ) : (
                <form className="space-y-3" onSubmit={submitProject}>
                  <Input
                    label={t("field.name")}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                  <Input
                    label={t("field.code")}
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />

                  <SelectDropdown<TypeOption>
                    label={t("field.type")}
                    items={typeOptions}
                    selected={typeOptions.filter((opt) => opt.value === formData.type)}
                    onChange={(items) => items[0] && setFormData((p) => ({ ...p, type: items[0].value }))}
                    getItemKey={(i) => i.value}
                    getItemLabel={(i) => i.label}
                    singleSelect
                    hideCheckboxes
                    buttonLabel={t("btnLabel.type")}
                    customStyles={{ maxHeight: "240px" }}
                  />

                  <Input
                    label={t("field.description")}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />

                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={formData.is_active} onChange={handleActiveChange} disabled={isSubmitting} />
                    {t("field.isActive")}
                  </label>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="cancel" type="button" onClick={closeModal} disabled={isSubmitting}>
                      {t("btn.cancel")}
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {t("btn.save")}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

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
        autoHideDuration={5000}
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
