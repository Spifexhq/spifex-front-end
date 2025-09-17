/* -------------------------------------------------------------------------- */
/*  File: src/pages/EmployeeSettings.tsx                                      */
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
import { Employee, Group } from "src/models/auth/domain";
import { useAuthContext } from "@/contexts/useAuthContext";
import { validatePassword } from "src/lib";

/* ---------------------------- Form template ------------------------------ */
const emptyForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  groups: [] as Group[],
};
type FormState = typeof emptyForm;

/* --------------------------------- Helpers -------------------------------- */
function getInitials() {
  return "FN"; // Funcionários
}

/* Linha sem bordas próprias; o container usa divide-y */
const Row = ({
  emp,
  onEdit,
  onDelete,
  canEdit,
}: {
  emp: Employee;
  onEdit: (e: Employee) => void;
  onDelete: (e: Employee) => void;
  canEdit: boolean;
}) => (
  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
    <div className="min-w-0">
      <p className="text-[13px] font-medium text-gray-900 truncate">{emp.name}</p>
      <p className="text-[12px] text-gray-600 truncate">{emp.email}</p>
    </div>
    {canEdit && (
      <div className="flex gap-2 shrink-0">
        <Button
          variant="outline"
          className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
          onClick={() => onEdit(emp)}
        >
          Editar
        </Button>
        <Button variant="common" onClick={() => onDelete(emp)}>
          Excluir
        </Button>
      </div>
    )}
  </div>
);

const EmployeeSettings: React.FC = () => {
  /* ------------------------------ Setup ----------------------------------- */
  useEffect(() => {
    document.title = "Funcionários";
  }, []);

  const { isOwner } = useAuthContext();

  /* ----------------------------- Estados ---------------------------------- */
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [snackBarMessage, setSnackBarMessage] = useState<string | JSX.Element>("");

  /* ----------------------------- API calls -------------------------------- */
  const fetchData = async () => {
    try {
      const [empRes, groupRes] = await Promise.all([api.getEmployees(), api.getAllGroups()]);
      setEmployees(empRes.data.employees.sort((a, b) => a.id - b.id));
      setGroups(groupRes.data.groups.sort((a: Group, b: Group) => a.id - b.id));
    } catch (err) {
      console.error("Erro ao buscar funcionários/grupos", err);
      setSnackBarMessage("Erro ao buscar dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /* ------------------------------ Handlers -------------------------------- */
  const openCreateModal = () => {
    setMode("create");
    setEditingEmployee(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = async (employee: Employee) => {
    setMode("edit");
    setEditingEmployee(employee);
    try {
      const res = await api.getEmployee([employee.id]);
      const detail = res.data.employee ?? res.data;
      setFormData({
        name: detail.name,
        email: detail.email,
        password: "",
        confirmPassword: "",
        groups: detail.groups,
      });
      setModalOpen(true);
    } catch (error) {
      console.error(error);
      setSnackBarMessage("Erro ao carregar dados do funcionário.");
    }
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingEmployee(null);
  }, []);

  /* --------------------------- Form helpers ------------------------------- */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const submitEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "create") {
      if (formData.password !== formData.confirmPassword) {
        setSnackBarMessage("As senhas não coincidem");
        return;
      }
      const { isValid, message } = validatePassword(formData.password);
      if (!isValid) {
        setSnackBarMessage(message);
        return;
      }
    }

    try {
      if (mode === "create") {
        await api.addEmployee({
          name: formData.name,
          email: formData.email,
          password: formData.password || undefined,
          groups: formData.groups.map((g) => g.id),
        });
      } else if (editingEmployee) {
        await api.editEmployee([editingEmployee.id], {
          name: formData.name,
          email: formData.email,
          groups: formData.groups.map((g) => g.id),
        });
      }
      await fetchData();
      closeModal();
    } catch (err) {
      setSnackBarMessage(err instanceof Error ? err.message : "Erro ao salvar funcionário.");
    }
  };

  const deleteEmployee = async (emp: Employee) => {
    if (!window.confirm(`Excluir funcionário "${emp.name}"?`)) return;
    try {
      await api.deleteEmployee([emp.id]);
      await fetchData();
    } catch (err) {
      setSnackBarMessage(err instanceof Error ? err.message : "Erro ao excluir funcionário.");
    }
  };

  /* ------------------------------ Esc / Scroll ---------------------------- */
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

  /* ------------------------------ UI -------------------------------------- */
  return (
    <>
      <Navbar />
      <SidebarSettings activeItem="employees" />

      {/* Conteúdo: abaixo da Navbar (pt-16) e ao lado da sidebar (lg:ml-64); sem overflow lateral */}
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
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">Funcionários</h1>
              </div>
            </div>
          </header>

          {/* Card principal */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">Lista de funcionários</span>
                  {isOwner && <Button onClick={openCreateModal} className="!py-1.5">Adicionar funcionário</Button>}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {employees.map((e) => (
                  <Row
                    key={e.id}
                    emp={e}
                    canEdit={!!isOwner}
                    onEdit={openEditModal}
                    onDelete={deleteEmployee}
                  />
                ))}
                {employees.length === 0 && (
                  <p className="p-4 text-center text-sm text-gray-500">Nenhum funcionário cadastrado.</p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* ------------------------------ Modal -------------------------------- */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-lg max-h-[90vh]"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {mode === "create" ? "Adicionar funcionário" : "Editar funcionário"}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label="Fechar"
                >
                  &times;
                </button>
              </header>

              <form className="grid grid-cols-2 gap-4" onSubmit={submitEmployee}>
                <Input
                  label="Nome"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />

                {mode === "create" && (
                  <>
                    <Input
                      label="Senha temporária"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                    <Input
                      label="Confirme a senha"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                  </>
                )}

                <div className="col-span-2">
                  <SelectDropdown
                    label="Grupos"
                    items={groups}
                    selected={formData.groups}
                    onChange={(items) => setFormData((p) => ({ ...p, groups: items }))}
                    getItemKey={(g) => g.id}
                    getItemLabel={(g) => g.name}
                    buttonLabel="Selecione os grupos"
                    hideCheckboxes={false}
                    clearOnClickOutside={false}
                  />
                </div>

                <div className="col-span-2 flex justify-end gap-3 pt-1">
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

export default EmployeeSettings;
