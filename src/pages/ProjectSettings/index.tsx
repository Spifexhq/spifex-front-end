/* -------------------------------------------------------------------------- */
/*  File: src/pages/ProjectSettings.tsx                                       */
/*  Style: Navbar fixa + SidebarSettings, light borders, compact labels       */
/*  Notes: no backdrop-close; honors fixed heights; no horizontal overflow    */
/* -------------------------------------------------------------------------- */

import React, { useEffect, useState, useCallback } from "react";

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
  return "PJ"; // Projetos
}

const emptyForm = {
  name: "",
  code: "",
  type: "internal" as ProjectType,
  description: "",
  is_active: true,
};
type FormState = typeof emptyForm;

/* sort por CODE, depois nome */
function sortByCodeThenName(a: Project, b: Project) {
  const ca = (a.code || "").toString();
  const cb = (b.code || "").toString();
  if (ca && cb && ca !== cb) {
    return ca.localeCompare(cb, "pt-BR", { numeric: true });
  }
  return (a.name || "").localeCompare(b.name || "", "pt-BR");
}

/* Linha sem bordas próprias; o container usa divide-y */
const Row = ({
  project,
  onEdit,
  onDelete,
  canEdit,
}: {
  project: Project;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
  canEdit: boolean;
}) => {
  const typeLabel = isProjectType(project.type)
    ? TYPE_OPTIONS.find((t) => t.value === project.type)?.label ?? "—"
    : (project.type as string | undefined) ?? "—";

  return (
    <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-gray-600">
          CÓD: {project.code || "—"} {typeLabel ? `• ${typeLabel}` : ""}
        </p>
        <p className="text-[13px] font-medium text-gray-900 truncate">
          {project.name || "(sem nome)"}{" "}
          {project.description ? `— ${project.description}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[12px] text-gray-700">
          {project.is_active ? "Ativo" : "Inativo"}
        </span>
        {canEdit && (
          <>
            <Button
              variant="outline"
              className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
              onClick={() => onEdit(project)}
            >
              Editar
            </Button>
            <Button variant="common" onClick={() => onDelete(project)}>
              Excluir
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

const ProjectSettings: React.FC = () => {
  /* ------------------------------ Setup ----------------------------------- */
  useEffect(() => {
    document.title = "Projetos";
  }, []);

  const { isOwner } = useAuthContext();

  /* ----------------------------- Estados ---------------------------------- */
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [snackBarMessage, setSnackBarMessage] = useState("");

  /* ----------------------------- API calls -------------------------------- */
  const fetchProjects = useCallback(async () => {
    try {
      const all: Project[] = [];
      let cursor: string | undefined;
      do {
        const { data } = await api.getProjects({ page_size: 200, cursor });
        const page = (data?.results ?? []) as Project[];
        all.push(...page);
        cursor = (data?.next ?? undefined) || undefined;
      } while (cursor);
      setProjects(all.sort(sortByCodeThenName));
    } catch (err) {
      console.error("Erro ao buscar projetos", err);
      setSnackBarMessage("Erro ao buscar projetos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
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
        await api.addProject({
          name: formData.name,
          code: formData.code || "",
          type: formData.type,
          description: formData.description || "",
          is_active: formData.is_active,
        });
      } else if (editingProject) {
        await api.editProject(editingProject.id, {
          name: formData.name,
          code: formData.code,
          type: formData.type,
          description: formData.description,
          is_active: formData.is_active,
        });
      }
      await fetchProjects();
      closeModal();
    } catch (err) {
      setSnackBarMessage(
        err instanceof Error ? err.message : "Erro ao salvar projeto."
      );
    }
  };

  const deleteProject = async (project: Project) => {
    try {
      await api.deleteProject(project.id);
      await fetchProjects();
    } catch (err) {
      setSnackBarMessage(
        err instanceof Error ? err.message : "Erro ao excluir projeto."
      );
    }
  };

  /* ------------------------------ Esc key / scroll lock ------------------- */
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

  if (loading) return <SuspenseLoader />;

  /* --------------------------------- UI ----------------------------------- */
  return (
    <>
      <Navbar />
      <SidebarSettings activeItem="projects" />

      {/* Conteúdo: abaixo da Navbar (pt-16) e ao lado da sidebar; sem overflow lateral */}
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
                  Configurações
                </div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  Projetos
                </h1>
              </div>
            </div>
          </header>

          {/* Card principal */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    Lista de projetos
                  </span>
                  {isOwner && (
                    <Button onClick={openCreateModal} className="!py-1.5">
                      Adicionar projeto
                    </Button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {projects.map((p) => (
                  <Row
                    key={p.id}
                    project={p}
                    canEdit={!!isOwner}
                    onEdit={openEditModal}
                    onDelete={deleteProject}
                  />
                ))}
                {projects.length === 0 && (
                  <p className="p-4 text-center text-sm text-gray-500">
                    Nenhum projeto cadastrado.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* ------------------------------ Modal -------------------------------- */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            {/* Sem onClick no backdrop → não fecha ao clicar fora */}
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {mode === "create" ? "Adicionar projeto" : "Editar projeto"}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label="Fechar"
                >
                  &times;
                </button>
              </header>

              <form className="space-y-3" onSubmit={submitProject}>
                <Input
                  label="Nome do projeto"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Código"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                />

                <SelectDropdown<TypeOption>
                  label="Tipo de projeto"
                  items={TYPE_OPTIONS}
                  selected={TYPE_OPTIONS.filter((t) => t.value === formData.type)}
                  onChange={(items) => {
                    if (items[0]) setFormData((p) => ({ ...p, type: items[0].value }));
                  }}
                  getItemKey={(i) => i.value}
                  getItemLabel={(i) => i.label}
                  singleSelect
                  hideCheckboxes
                  buttonLabel="Selecione o tipo"
                  customStyles={{ maxHeight: "240px" }}
                />

                <Input
                  label="Descrição"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                />

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.is_active} onChange={handleActiveChange} />
                  Projeto ativo
                </label>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="cancel" type="button" onClick={closeModal}>
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ----------------------------- Snackbar ------------------------------ */}
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
