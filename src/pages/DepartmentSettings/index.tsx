/* -------------------------------------------------------------------------- */
/*  File: src/pages/DepartmentSettings.tsx                                    */
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

/**
 * Página de configuração dos Departamentos da empresa
 * Estrutura inspirada na CompanySettings, mas trabalhando com o recurso departments
 */

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };

    if (modalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  /* ------------------------------ UI helpers ------------------------------- */
  const Row = ({
    dept,
  }: {
    dept: Department;
  }) => (
    <div className="flex items-center justify-between border-b last:border-0 py-4 px-4">
      <p className="text-base font-medium text-gray-900">
        {dept.department || "(sem nome)"}
      </p>
      {isOwner && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openEditModal(dept)}>
            Editar
          </Button>
          <Button variant="common" onClick={() => deleteDepartment(dept)}>
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
      <SidebarSettings activeItem="departments" />

      <main className="min-h-screen bg-gray-50 px-8 py-20 lg:ml-64 text-gray-900">
        <section className="max-w-3xl mx-auto p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Departamentos</h3>
            {isOwner && (
              <Button onClick={openCreateModal}>Adicionar departamento</Button>
            )}
          </div>

          <div className="border rounded-lg divide-y">
            {departments.map(d => (
              <Row key={d.id} dept={d} />
            ))}
            {departments.length === 0 && (
              <p className="p-4 text-center text-sm text-gray-500">
                Nenhum departamento cadastrado.
              </p>
            )}
          </div>
        </section>
      </main>

      {/* ------------------------------ Modal -------------------------------- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
          >
            <header className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                {mode === "create" ? "Adicionar departamento" : "Editar departamento"}
              </h3>
              <button
                className="text-2xl text-gray-400 hover:text-gray-700"
                onClick={closeModal}
              >
                &times;
              </button>
            </header>

            <form className="space-y-4" onSubmit={submitDepartment}>
              <Input
                label="Nome do departamento"
                name="department"
                value={deptName}
                onChange={e => setDeptName(e.target.value)}
                required
              />

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

export default DepartmentSettings;
