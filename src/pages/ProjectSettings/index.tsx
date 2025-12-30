/* -------------------------------------------------------------------------- */
/* File: src/pages/ProjectSettings.tsx                                         */
/* i18n: namespace "projectSettings"                                          */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Snackbar from "@/components/ui/Snackbar";
import ConfirmToast from "@/components/ui/ConfirmToast";
import PaginationArrows from "@/components/PaginationArrows/PaginationArrows";

import ProjectModal from "./ProjectModal";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";

import type { Project } from "@/models/settings/projects";

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

function getInitials() {
  return "PJ";
}

/**
 * Cursor pagination relies on backend ordering.
 * Avoid re-sorting server pages on the client, or you risk perceived "jumps".
 * Only sort local overlay items if needed.
 */
function sortOverlayByCodeThenName(a: Project, b: Project) {
  const ca = (a.code || "").toString();
  const cb = (b.code || "").toString();
  if (ca && cb && ca !== cb) return ca.localeCompare(cb, "en", { numeric: true });
  return (a.name || "").localeCompare(b.name || "", "en");
}

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
  t: (key: string, options?: Record<string, unknown>) => string;
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onEdit(project)} disabled={busy}>
            {t("btn.edit")}
          </Button>
          <Button variant="outline" onClick={() => onDelete(project)} disabled={busy} aria-busy={busy || undefined}>
            {t("btn.delete")}
          </Button>
        </div>
      )}
    </div>
  </div>
);

const ProjectSettings: React.FC = () => {
  const { t, i18n } = useTranslation("projectSettings");
  const { isOwner } = useAuthContext();

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

  /* Search */
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  /* ----------------------------- Cursor pagination ------------------------- */
  const inflightRef = useRef(false);

  const fetchProjectsPage = useCallback(
    async (cursor?: string) => {
      if (inflightRef.current) {
        return { items: [] as Project[], nextCursor: undefined as string | undefined };
      }

      inflightRef.current = true;
      try {
        const { data, meta } = await api.getProjects({
          cursor,
          q: appliedQuery || undefined,
        });

        const items = (data?.results ?? []) as Project[];

        const nextUrl = meta?.pagination?.next ?? (data as unknown as { next?: string | null }).next ?? null;
        const nextCursor = nextUrl ? (getCursorFromUrl(nextUrl) || nextUrl) : undefined;

        return { items, nextCursor };
      } finally {
        inflightRef.current = false;
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
    const addedFiltered = added
      .filter((p) => matchesQuery(p, appliedQuery))
      .slice()
      .sort(sortOverlayByCodeThenName);

    const addedIdsSet = new Set(addedFiltered.map((p) => p.id));
    const base = pager.items.filter((p) => !deletedIds.has(p.id) && !addedIdsSet.has(p.id));

    return [...addedFiltered, ...base];
  }, [added, deletedIds, pager.items, appliedQuery, matchesQuery]);

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

  const canEdit = !!isOwner;
  const globalBusy = isBackgroundSync || confirmBusy || modalOpen;

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
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">{t("section.list")}</span>

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
                    disabledPrev={!pager.canPrev || globalBusy}
                    disabledNext={!pager.canNext || globalBusy}
                  />
                </>
              )}
            </div>
          </section>
        </div>

        <ProjectModal
          isOpen={modalOpen}
          mode={modalMode}
          project={editingProject}
          canEdit={canEdit}
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
