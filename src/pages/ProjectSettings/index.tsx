/* --------------------------------------------------------------------------
 * File: src/pages/ProjectSettings.tsx
 * Pagination: cursor + arrow-only, click-to-search via "Buscar"
 * Dinâmica: overlay local p/ add/delete + refresh do pager
 * i18n: group "project" inside the "settings" namespace
 * -------------------------------------------------------------------------- */
import React, { useEffect, useState, useCallback, useMemo } from "react";

import Navbar from "@/components/Navbar";
import SidebarSettings from "@/components/Sidebar/SidebarSettings";
import { SuspenseLoader } from "@/components/Loaders";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";
import { SelectDropdown } from "@/components/SelectDropdown";

import { api } from "src/api/requests";
import type { Project } from "src/models/enterprise_structure/domain/Project";
import { useAuthContext } from "@/contexts/useAuthContext";
import Checkbox from "src/components/Checkbox";

import PaginationArrows from "@/components/PaginationArrows/PaginationArrows";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "src/lib/list";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

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

/* (opcional) sort estável, igual ao que você já usava */
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
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
  canEdit: boolean;
  t: TFunction;
}) => {
  const typeLabel = isProjectType(project.type)
    ? TYPE_OPTIONS.find((t) => t.value === project.type)?.label ?? "—"
    : (project.type as string | undefined) ?? "—";

  return (
    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
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
            >
              {t("settings:project.btn.edit")}
            </Button>
            <Button variant="common" onClick={() => onDelete(project)}>
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
  useEffect(() => { document.title = t("settings:project.title"); }, [t]);
  useEffect(() => { document.documentElement.lang = i18n.language; }, [i18n.language]);

  const { isOwner } = useAuthContext();

  /* ----------------------------- Estados ---------------------------------- */
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [snackBarMessage, setSnackBarMessage] = useState("");

  /* Overlay dinâmico: adicionados e excluídos (UI imediata) */
  const [added, setAdded] = useState<Project[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ----------------------------- Filtro (click-to-search) ------------------ */
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  /* ----------------------------- Paginação por cursor ---------------------- */
  const fetchProjectsPage = useCallback(
    async (cursor?: string) => {
      const { data, meta } = await api.getProjects({
        page_size: 100,
        cursor,
        q: appliedQuery || undefined,
      });
      const items = ((data?.results ?? []) as Project[]).slice().sort(sortByCodeThenName);
      const nextUrl = meta?.pagination?.next ?? data?.next ?? null;
      const nextCursor = nextUrl ? (getCursorFromUrl(nextUrl) || nextUrl) : undefined;
      return { items, nextCursor };
    },
    [appliedQuery]
  );

  const pager = useCursorPager<Project>(fetchProjectsPage, {
    autoLoadFirst: true,
    deps: [appliedQuery],
  });

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
    const addedIds = new Set(addedFiltered.map((p) => p.id));
    const base = pager.items.filter((p) => !deletedIds.has(p.id) && !addedIds.has(p.id));
    return [...addedFiltered, ...base];
  }, [added, deletedIds, pager.items, appliedQuery, matchesQuery]);

  /* ------------------------------ Handlers -------------------------------- */
  const openCreateModal = () => {
    setMode("create");
    setEditingProject(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setMode("edit");
    setEditingProject(project);
    setFormData({
      name: project.name || "",
      code: project.code || "",
      type: isProjectType(project.type) ? project.type : "internal",
      description: project.description || "",
      is_active: project.is_active ?? true,
    });
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingProject(null);
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
      } else if (editingProject) {
        await api.editProject(editingProject.id, {
          name: formData.name,
          code: formData.code,
          type: formData.type,
          description: formData.description,
          is_active: formData.is_active,
        });
      }
      await pager.refresh();
      closeModal();
    } catch (err) {
      setSnackBarMessage(
        err instanceof Error ? err.message : t("settings:project.errors.saveError")
      );
    }
  };

  const deleteProject = async (project: Project) => {
    try {
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.add(project.id);
        return next;
      });
      await api.deleteProject(project.id);
      await pager.refresh();
      setAdded((prev) => prev.filter((p) => p.id !== project.id));
    } catch (err) {
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(project.id);
        return next;
      });
      setSnackBarMessage(
        err instanceof Error ? err.message : t("settings:project.errors.deleteError")
      );
    }
  };

  /* ------------------------------ Esc key / scroll lock -------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  if (pager.loading && pager.items.length === 0) return <SuspenseLoader />;

  /* -------------------------------- UI ------------------------------------ */
  return (
    <>
      <Navbar />
      <SidebarSettings activeItem="projects" />

      <main className="min-h-screen bg-gray-50 text-gray-900 pt-16 lg:ml-64 overflow-x-clip">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header card */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials()}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">
                  {t("settings:project.header.settings")}
                </div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  {t("settings:project.header.projects")}
                </h1>
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
                    />
                    <Button onClick={onSearch} variant="outline">
                      {t("settings:project.search.button")}
                    </Button>
                    {isOwner && (
                      <Button onClick={openCreateModal} className="!py-1.5">
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
                  <Button variant="outline" size="sm" onClick={pager.refresh}>
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
                      visibleItems.map((p) => (
                        <Row
                          key={p.id}
                          project={p}
                          canEdit={!!isOwner}
                          onEdit={openEditModal}
                          onDelete={deleteProject}
                          t={t}
                        />
                      ))
                    )}
                  </div>

                  <PaginationArrows
                    onPrev={pager.prev}
                    onNext={pager.next}
                    disabledPrev={!pager.canPrev}
                    disabledNext={!pager.canNext}
                    label={t("settings:project.pagination.label", {
                      index: pager.index + 1,
                      total: pager.reachedEnd ? pager.knownPages : `${pager.knownPages}+`,
                    })}
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
                >
                  &times;
                </button>
              </header>

              <form className="space-y-3" onSubmit={submitProject}>
                <Input
                  label={t("settings:project.field.name")}
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <Input
                  label={t("settings:project.field.code")}
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                />

                <SelectDropdown<TypeOption>
                  label={t("settings:project.field.type")}
                  items={TYPE_OPTIONS}
                  selected={TYPE_OPTIONS.filter((tO) => tO.value === formData.type)}
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
                />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.is_active} onChange={handleActiveChange} />
                  {t("settings:project.field.isActive")}
                </label>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="cancel" type="button" onClick={closeModal}>
                    {t("settings:project.btn.cancel")}
                  </Button>
                  <Button type="submit">{t("settings:project.btn.save")}</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Snackbar
        open={!!snackBarMessage}
        autoHideDuration={6000}
        onClose={() => setSnackBarMessage("")}
        severity="error"
      >
        <Alert severity="error">{snackBarMessage}</Alert>
      </Snackbar>
    </>
  );
};

export default ProjectSettings;
