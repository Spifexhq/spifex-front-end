/* -------------------------------------------------------------------------- */
/*  File: src/pages/DepartmentSettings.tsx                                    */
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

import { api } from "src/api/requests";
import { Department } from "src/models/enterprise_structure/domain";
import { useAuthContext } from "@/contexts/useAuthContext";

/* --------------------------------- Helpers -------------------------------- */
function getInitials() {
  // Cabeçalho padrão desta página
  return "DP";
}

/* Row sem bordas próprias; o container usa divide-y */
const Row = ({ dept, onEdit, onDelete, canEdit }:{
  dept: Department;
  onEdit: (d: Department) => void;
  onDelete: (d: Department) => void;
  canEdit: boolean;
}) => (
  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
    <p className="text-[13px] font-medium text-gray-900 truncate">
      {dept.department || "(sem nome)"}
    </p>
    {canEdit && (
      <div className="flex gap-2 shrink-0">
        <Button
          variant="outline"
          className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
          onClick={() => onEdit(dept)}
        >
          Editar
        </Button>
        <Button variant="common" onClick={() => onDelete(dept)}>
          Excluir
        </Button>
      </div>
    )}
  </div>
);

/* -------------------------------------------------------------------------- */
const DepartmentSettings: React.FC = () => {
  useEffect(() => {
    document.title = "Configurações de Departamentos";
  }, []);

  const { isOwner } = useAuthContext();

  /* --------------------------- Estados principais --------------------------- */
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState("");

  const [snackBarMessage, setSnackBarMessage] = useState<string>("");

  /* ------------------------------ Carrega dados ----------------------------- */
  const fetchDepartments = async () => {
    try {
      const res = await api.getAllDepartments();
      const sorted = res.data.departments.sort((a, b) => a.id - b.id);
      setDepartments(sorted);
    } catch (err) {
      console.error("Erro ao buscar departamentos", err);
      setSnackBarMessage("Erro ao buscar departamentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  /* ------------------------------ Handlers --------------------------------- */
  const openCreateModal = () => {
    setMode("create");
    setEditingDept(null);
    setDeptName("");
    setModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setMode("edit");
    setEditingDept(dept);
    setDeptName(dept.department ?? "");
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingDept(null);
    setDeptName("");
  }, []);

  const submitDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "create") {
        await api.addDepartment({ department: deptName });
      } else if (editingDept) {
        await api.editDepartment([editingDept.id], { department: deptName });
      }
      await fetchDepartments();
      closeModal();
    } catch (err) {
      setSnackBarMessage(
        err instanceof Error ? err.message : "Erro ao salvar departamento."
      );
    }
  };

  const deleteDepartment = async (dept: Department) => {
    try {
      await api.deleteDepartment([dept.id]);
      await fetchDepartments();
    } catch (err) {
      setSnackBarMessage(
        err instanceof Error ? err.message : "Erro ao excluir departamento."
      );
    }
  };

  /* ------------------------------- UX hooks -------------------------------- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  if (loading) return <SuspenseLoader />;

  /* --------------------------------- UI ----------------------------------- */
  return (
    <>
      <Navbar />
      <SidebarSettings activeItem="departments" />

      {/* Conteúdo: abaixo da Navbar (pt-16) e ao lado da sidebar (lg:ml-64);
          evitar overflow horizontal. */}
      <main className="min-h-screen bg-gray-50 text-gray-900 pt-16 lg:ml-64 overflow-x-clip">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header card */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials()}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Configurações</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">Departamentos</h1>
              </div>
            </div>
          </header>

          {/* Card principal */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">Lista de departamentos</span>
                  {isOwner && (
                    <Button onClick={openCreateModal} className="!py-1.5">
                      Adicionar departamento
                    </Button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {departments.map((d) => (
                  <Row
                    key={d.id}
                    dept={d}
                    canEdit={!!isOwner}
                    onEdit={openEditModal}
                    onDelete={deleteDepartment}
                  />
                ))}

                {departments.length === 0 && (
                  <p className="p-4 text-center text-sm text-gray-500">
                    Nenhum departamento cadastrado.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* ------------------------------ Modal -------------------------------- */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {mode === "create" ? "Adicionar departamento" : "Editar departamento"}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label="Fechar"
                >
                  &times;
                </button>
              </header>

              <form className="space-y-3" onSubmit={submitDepartment}>
                <Input
                  label="Nome do departamento"
                  name="department"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  required
                />

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
      >
        <Alert severity="error">{snackBarMessage}</Alert>
      </Snackbar>
    </>
  );
};

export default DepartmentSettings;
