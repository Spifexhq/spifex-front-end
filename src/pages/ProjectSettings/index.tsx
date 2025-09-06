/* -------------------------------------------------------------------------- */
/*  File: src/pages/ProjectSettings.tsx                                       */
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

/* ------------------------- Constantes / helpers --------------------------- */
const PROJECT_TYPES = [
  { label: "Interno", value: "internal" },
  { label: "Cliente", value: "client" },
  { label: "Pesquisa", value: "research" },
  // extras
  { label: "Operacional", value: "operational" },
  { label: "Marketing", value: "marketing" },
  { label: "Produto", value: "product" },
  { label: "TI", value: "it" },
  { label: "Evento", value: "event" },
  { label: "CapEx", value: "capex" },
];

const emptyForm = {
  name: "",
  code: "",
  type: "internal",
  description: "",
  is_active: true as boolean,
};

type FormState = typeof emptyForm;

function sortByCodeThenName(a: Project, b: Project) {
  const ca = (a.code || "").toString();
  const cb = (b.code || "").toString();
  if (ca && cb && ca !== cb) {
    return ca.localeCompare(cb, "pt-BR", { numeric: true });
  }
  return (a.name || "").localeCompare(b.name || "", "pt-BR");
}

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
  const fetchAllProjects = useCallback(async () => {
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
    fetchAllProjects();
  }, [fetchAllProjects]);

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
      type: project.type || "internal",
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
      await fetchAllProjects();
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
      await fetchAllProjects();
    } catch (err) {
      setSnackBarMessage(
        err instanceof Error ? err.message : "Erro ao excluir projeto."
      );
    }
  };

  /* ------------------------------ Esc / Scroll ---------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  /* ------------------------------ UI -------------------------------------- */
  const Row = ({ project }: { project: Project }) => (
    <div className="flex items-center justify-between border-b last:border-0 py-4 px-4">
      <div>
        <p className="text-sm text-gray-500">
          {PROJECT_TYPES.find((t) => t.value === project.type)?.label ?? project.type}
        </p>
        <p className="text-base font-medium text-gray-900">
          {project.name || project.code}
        </p>
      </div>
      {isOwner && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openEditModal(project)}>
            Editar
          </Button>
          <Button variant="common" onClick={() => deleteProject(project)}>
            Excluir
          </Button>
        </div>
      )}
    </div>
  );

  if (loading) return <SuspenseLoader />;

  return (
    <>
      <Navbar />
      <SidebarSettings activeItem="projects" />

      <main className="min-h-screen bg-gray-50 px-8 py-20 lg:ml-64 text-gray-900">
        <section className="max-w-4xl mx-auto p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Projetos</h3>
            {isOwner && <Button onClick={openCreateModal}>Adicionar projeto</Button>}
          </div>

          <div className="border rounded-lg divide-y">
            {projects.map((p) => (
              <Row key={p.id} project={p} />
            ))}
            {projects.length === 0 && (
              <p className="p-4 text-center text-sm text-gray-500">
                Nenhum projeto cadastrado.
              </p>
            )}
          </div>
        </section>
      </main>

      {/* ------------------------------ Modal -------------------------------- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh]"
          >
            <header className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                {mode === "create" ? "Adicionar projeto" : "Editar projeto"}
              </h3>
              <button
                className="text-2xl text-gray-400 hover:text-gray-700"
                onClick={closeModal}
              >
                &times;
              </button>
            </header>

            <form className="space-y-4" onSubmit={submitProject}>
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

              <SelectDropdown
                label="Tipo de projeto"
                items={PROJECT_TYPES}
                selected={PROJECT_TYPES.filter((t) => t.value === formData.type)}
                onChange={(items) => items[0] && setFormData((p) => ({ ...p, type: items[0].value }))}
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
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={handleActiveChange}
                />
                Projeto ativo
              </label>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="cancel" type="button" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------- Snackbar ------------------------------ */}
      <Snackbar
        open={!!snackBarMessage}
        autoHideDuration={6000}
        onClose={() => setSnackBarMessage("")}
      >
        <Alert severity="error">{snackBarMessage}</Alert>
      </Snackbar>
    </>
  );
};

export default ProjectSettings;
