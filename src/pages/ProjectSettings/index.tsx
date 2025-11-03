/* --------------------------------------------------------------------------
 * File: src/pages/ProjectSettings.tsx
 * Standardized flags + UX (matches Employee/Entity/Groups/Department/Inventory)
 * Pagination: cursor + arrow-only, click-to-search via "Buscar"
 * Dinâmica: overlay local p/ add/delete + refresh do pager (ConfirmToast on delete)
 * Guard: INFLIGHT_FETCH for pager fetcher
 * i18n: group "project" inside the "settings" namespace
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

import { api } from "src/api/requests";
import type { Project } from "src/models/enterprise_structure/domain/Project";
import { useAuthContext } from "@/contexts/useAuthContext";

import PaginationArrows from "@/components/PaginationArrows/PaginationArrows";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "src/lib/list";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

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

/* ------------------------- Tipos / constantes ----------------------------- */
const PROJECT_TYPES = [
  { label: "Interno", value: "internal" },
  { label: "Cliente", value: "client" },
  { label: "Pesquisa", value: "research" },
  { label: "Operacional", value: "operational" },
  { label: "Marketing", value: "marketing" },
  { label: "Produto", value: "product" },
  { label: "TI", value: "it" },
  { label: "Evento", value: "event" },
  { label: "CapEx", value: "capex" },
] as const;

type ProjectType = (typeof PROJECT_TYPES)[number]["value"];
type TypeOption = { label: string; value: ProjectType };
const TYPE_OPTIONS: TypeOption[] = PROJECT_TYPES as unknown as TypeOption[];

function isProjectType(v: unknown): v is ProjectType {
  return TYPE_OPTIONS.some((o) => o.value === v);
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

/* sort estável por código, depois nome */
function sortByCodeThenName(a: Project, b: Project) {
  const ca = (a.code || "").toString();
  const cb = (b.code || "").toString();
  if (ca && cb && ca !== cb) return ca.localeCompare(cb, "pt-BR", { numeric: true });
  return (a.name || "").localeCompare(b.name || "", "pt-BR");
}

/* Linha */
const Row = ({
  project,
  onEdit,
  onDelete,
  canEdit,
  t,
  busy,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
  canEdit: boolean;
  t: TFunction;
  busy?: boolean;
}) => {
  const typeLabel = isProjectType(project.type)
    ? TYPE_OPTIONS.find((tt) => tt.value === project.type)?.label ?? "—"
    : (project.type as string | undefined) ?? "—";

  return (
    <div className={`flex items-center justify-between px-4 py-2.5 ${busy ? "opacity-70 pointer-events-none" : ""}`}>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-gray-600">
          {t("settings:project.row.codePrefix")} {project.code || "—"} {typeLabel ? `• ${typeLabel}` : ""}
        </p>
        <p className="text-[13px] font-medium text-gray-900 truncate">
          {project.name || t("settings:project.row.untitled")}
          {project.description ? ` — ${project.description}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[12px] text-gray-700">
          {project.is_active ? t("settings:project.row.active") : t("settings:project.row.inactive")}
        </span>
        {canEdit && (
          <>
            <Button
              variant="outline"
              className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
              onClick={() => onEdit(project)}
              disabled={busy}
            >
              {t("settings:project.btn.edit")}
            </Button>
            <Button variant="common" onClick={() => onDelete(project)} disabled={busy} aria-busy={busy || undefined}>
              {t("settings:project.btn.delete")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

const ProjectSettings: React.FC = () => {
  const { t, i18n } = useTranslation(["settings"]);
  const { isOwner } = useAuthContext();

  useEffect(() => { document.title = t("settings:project.title"); }, [t]);
  useEffect(() => { document.documentElement.lang = i18n.language; }, [i18n.language]);

  /* ----------------------------- Flags ------------------------------------ */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  /* ----------------------------- Estados ---------------------------------- */
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [snack, setSnack] = useState<Snack>(null);

  /* Confirm Toast */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  /* Overlay dinâmico: adicionados e excluídos (UI imediata) */
  const [added, setAdded] = useState<Project[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ----------------------------- Filtro (click-to-search) ------------------ */
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  /* ----------------------------- Paginação por cursor ---------------------- */
  const fetchProjectsPage = useCallback(
    async (cursor?: string) => {
      if (INFLIGHT_FETCH) return { items: [] as Project[], nextCursor: undefined as string | undefined };
      INFLIGHT_FETCH = true;
      try {
        const { data, meta } = await api.getProjects({
          page_size: 100,
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

  /* ------------------------------ Helpers overlay ------------------------- */
  const matchesQuery = useCallback((p: Project, q: string) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (p.code || "").toLowerCase().includes(s) ||
      (p.name || "").toLowerCase().includes(s) ||
      (p.description || "").toLowerCase().includes(s)
    );
  }, []);

  // sincroniza overlay ao trocar a busca
  useEffect(() => {
    setAdded((prev) => prev.filter((p) => matchesQuery(p, appliedQuery)));
  }, [appliedQuery, matchesQuery]);

  const visibleItems = useMemo(() => {
    const addedFiltered = added.filter((p) => matchesQuery(p, appliedQuery));
    const addedIdsSet = new Set(addedFiltered.map((p) => p.id));
    const base = pager.items.filter((p) => !deletedIds.has(p.id) && !addedIdsSet.has(p.id));
    return [...addedFiltered, ...base];
  }, [added, deletedIds, pager.items, appliedQuery, matchesQuery]);

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
      const res = await (api).getProject(project.id);
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
      setSnack({
        message: t("settings:project.errors.detailError"),
        severity: "error",
      });
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
        setAdded((prev) => [created, ...prev]); // overlay local
        setSnack({ message: t("settings:project.toast.saved"), severity: "success" });
      } else if (editingProject) {
        await api.editProject(editingProject.id, {
          name: formData.name,
          code: formData.code,
          type: formData.type,
          description: formData.description,
          is_active: formData.is_active,
        });
        setSnack({ message: t("settings:project.toast.saved"), severity: "success" });
      }
      await pager.refresh();
      closeModal();
    } catch (err) {
      setSnack({
        message: err instanceof Error ? err.message : t("settings:project.errors.saveError"),
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------- ConfirmToast delete (same pattern as Department/Inventory) --- */
  const requestDeleteProject = (project: Project) => {
    const name = project.name ?? project.code ?? "";
    setConfirmText(t("settings:project.confirm.deleteTitle", { name }));
    setConfirmAction(() => async () => {
      setDeleteTargetId(project.id);
      try {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.add(project.id);
          return next;
        });

        await api.deleteProject(project.id);
        await pager.refresh();
        setAdded((prev) => prev.filter((p) => p.id !== project.id));

        setSnack({ message: t("settings:project.toast.deleted"), severity: "info" });
      } catch (err) {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(project.id);
          return next;
        });
        setSnack({
          message: err instanceof Error ? err.message : t("settings:project.errors.deleteError"),
          severity: "error",
        });
      } finally {
        setDeleteTargetId(null);
        setConfirmOpen(false);
        setConfirmBusy(false);
      }
    });
    setConfirmOpen(true);
  };

  /* ------------------------------ Esc key / scroll lock -------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  /* ------------------------------ Loading states --------------------------- */
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
      {t("settings:project.badge.syncing")}
    </span>
  ) : null;

  const canEdit = !!isOwner;
  const globalBusy = isSubmitting || isBackgroundSync || confirmBusy;

  /* -------------------------------- UI ------------------------------------ */
  return (
    <>
      {/* progress fino durante sync da paginação */}
      <TopProgress active={isBackgroundSync} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header card */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials()}
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">
                    {t("settings:project.header.settings")}
                  </div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                    {t("settings:project.header.projects")}
                  </h1>
                </div>
                {headerBadge}
              </div>
            </div>
          </header>

          {/* Card principal */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("settings:project.section.list")}
                  </span>

                  {/* Busca (clique para aplicar) */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                      placeholder={t("settings:project.search.placeholder")}
                      aria-label={t("settings:project.search.aria")}
                      disabled={globalBusy}
                    />
                    <Button onClick={onSearch} variant="outline" disabled={globalBusy}>
                      {t("settings:project.search.button")}
                    </Button>
                    {canEdit && (
                      <Button onClick={openCreateModal} className="!py-1.5" disabled={globalBusy}>
                        {t("settings:project.btn.addProject")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {pager.error ? (
                <div className="p-6 text-center">
                  <p className="text-[13px] font-medium text-red-700 mb-2">
                    {t("settings:project.errors.loadFailedTitle")}
                  </p>
                  <p className="text-[11px] text-red-600 mb-4">{pager.error}</p>
                  <Button variant="outline" size="sm" onClick={pager.refresh} disabled={globalBusy}>
                    {t("settings:project.btn.retry")}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {visibleItems.length === 0 ? (
                      <p className="p-4 text-center text-sm text-gray-500">
                        {t("settings:project.empty")}
                      </p>
                    ) : (
                      visibleItems.map((p) => {
                        const rowBusy =
                          globalBusy || deleteTargetId === p.id || deletedIds.has(p.id);
                        return (
                          <Row
                            key={p.id}
                            project={p}
                            canEdit={canEdit}
                            onEdit={openEditModal}
                            onDelete={requestDeleteProject}
                            t={t}
                            busy={rowBusy}
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

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {mode === "create"
                    ? t("settings:project.modal.createTitle")
                    : t("settings:project.modal.editTitle")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label={t("settings:project.modal.close")}
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
                    label={t("settings:project.field.name")}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                  <Input
                    label={t("settings:project.field.code")}
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />

                  <SelectDropdown<TypeOption>
                    label={t("settings:project.field.type")}
                    items={TYPE_OPTIONS}
                    selected={TYPE_OPTIONS.filter((opt) => opt.value === formData.type)}
                    onChange={(items) => {
                      if (items[0]) setFormData((p) => ({ ...p, type: items[0].value }));
                    }}
                    getItemKey={(i) => i.value}
                    getItemLabel={(i) => i.label}
                    singleSelect
                    hideCheckboxes
                    buttonLabel={t("settings:project.btnLabel.type")}
                    customStyles={{ maxHeight: "240px" }}
                  />

                  <Input
                    label={t("settings:project.field.description")}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={formData.is_active} onChange={handleActiveChange} disabled={isSubmitting} />
                    {t("settings:project.field.isActive")}
                  </label>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="cancel" type="button" onClick={closeModal} disabled={isSubmitting}>
                      {t("settings:project.btn.cancel")}
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {t("settings:project.btn.save")}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Confirm Toast */}
      <ConfirmToast
        open={confirmOpen}
        text={confirmText}
        confirmLabel={t("settings:project.btn.delete")}
        cancelLabel={t("settings:project.btn.cancel")}
        variant="danger"
        onCancel={() => {
          if (confirmBusy) return;
          setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (confirmBusy || !confirmAction) return;
          setConfirmBusy(true);
          confirmAction
            ?.()
            .catch(() => {
              setSnack({ message: t("settings:project.errors.confirmFailed"), severity: "error" });
            })
            .finally(() => setConfirmBusy(false));
        }}
        busy={confirmBusy}
      />

      {/* Typed Snackbar (single source of truth) */}
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
