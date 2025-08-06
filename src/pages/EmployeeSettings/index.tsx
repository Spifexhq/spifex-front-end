/* -------------------------------------------------------------------------- */
/*  File: src/pages/EmployeeSettings.tsx                                      */
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
      const [empRes, groupRes] = await Promise.all([
        api.getEmployees(),
        api.getAllGroups(),
      ]);
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
    setFormData(p => ({ ...p, [name]: value }));
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
          groups: formData.groups.map(g => g.id),
        });
      } else if (editingEmployee) {
        await api.editEmployee([editingEmployee.id], {
          name: formData.name,
          email: formData.email,
          groups: formData.groups.map(g => g.id),
        });
      }
      await fetchData();
      closeModal();
    } catch (err) {
      setSnackBarMessage(
        err instanceof Error ? err.message : "Erro ao salvar funcionário."
      );
    }
  };

  const deleteEmployee = async (emp: Employee) => {
    if (!window.confirm(`Excluir funcionário" ${emp.name}"?`)) return;

    try {
      await api.deleteEmployee([emp.id]);
      await fetchData();
    } catch (err) {
      setSnackBarMessage(
        err instanceof Error ? err.message : "Erro ao excluir funcionário."
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
  const Row = ({ emp }: { emp: Employee }) => (
    <div className="flex items-center justify-between border-b last:border-0 py-4 px-4">
      <div>
        <p className="text-base font-medium text-gray-900">{emp.name}</p>
        <p className="text-sm text-gray-500">{emp.email}</p>
      </div>
      {isOwner && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openEditModal(emp)}>
            Editar
          </Button>
          <Button variant="common" onClick={() => deleteEmployee(emp)}>
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
      <SidebarSettings activeItem="employees" />

      <main className="min-h-screen bg-gray-50 px-8 py-20 lg:ml-64 text-gray-900">
        <section className="max-w-4xl mx-auto p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Funcionários</h3>
            {isOwner && <Button onClick={openCreateModal}>Adicionar funcionário</Button>}
          </div>

          <div className="border rounded-lg divide-y">
            {employees.map(e => (
              <Row key={e.id} emp={e} />
            ))}
            {employees.length === 0 && (
              <p className="p-4 text-center text-sm text-gray-500">Nenhum funcionário cadastrado.</p>
            )}
          </div>
        </section>
      </main>

      {/* ------------------------------ Modal -------------------------------- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh]"
          >
            <header className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                {mode === "create" ? "Adicionar funcionário" : "Editar funcionário"}
              </h3>
              <button className="text-2xl text-gray-400 hover:text-gray-700" onClick={closeModal}>
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
                    onChange={items => setFormData(p => ({ ...p, groups: items }))}
                    getItemKey={g => g.id}
                    getItemLabel={g => g.name}
                    buttonLabel="Selecione os grupos"
                    hideCheckboxes={false}
                    clearOnClickOutside={false}
                    />
                </div>

                <div className="col-span-2 flex justify-end gap-3 pt-4">
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

export default EmployeeSettings;
