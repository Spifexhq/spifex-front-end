/* --------------------------------------------------------------------------
 * File: src/pages/EmployeeSettings.tsx
 * Style: Navbar fixa + SidebarSettings, light borders, compact labels
 * Notes: i18n group "employee" inside the "settings" namespace
 * -------------------------------------------------------------------------- */

import React, { useEffect, useState, useCallback } from "react";

import { SuspenseLoader } from "@/components/Loaders";
import Input from "src/components/ui/Input";
import Button from "src/components/ui/Button";
import Snackbar from "src/components/ui/Snackbar";
import { SelectDropdown } from "src/components/ui/SelectDropdown";

import { api } from "src/api/requests";
import { Employee } from "src/models/auth/domain";
import type { GroupListItem } from "src/models/auth/domain/Group";
import type { GetGroups } from "src/models/auth/dto/GetGroup";
import { useAuthContext } from "@/contexts/useAuthContext";
import { validatePassword } from "src/lib";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

/* ---------------------------- Snackbar type ------------------------------ */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ---------------------------- Form template ------------------------------ */
const emptyForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  groups: [] as GroupListItem[],
};
type FormState = typeof emptyForm;

/* --------------------------------- Helpers -------------------------------- */
function getInitials() {
  return "FN";
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const isGroupListItem = (v: unknown): v is GroupListItem => {
  if (!isRecord(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "number" &&
    typeof o.external_id === "string" &&
    typeof o.slug === "string" &&
    typeof o.name === "string" &&
    typeof o.is_system === "boolean" &&
    typeof o.permissions_count === "number" &&
    typeof o.members_count === "number"
  );
};

const isResultsWrapper = (v: unknown): v is { results: unknown[] } =>
  isRecord(v) && "results" in v && Array.isArray((v as Record<string, unknown>).results);

/** Accepts: GroupListItem[] | {results: GroupListItem[]} */
const toGroupArray = (payload: GetGroups): GroupListItem[] => {
  if (Array.isArray(payload) && payload.every(isGroupListItem)) return payload;
  if (isResultsWrapper(payload)) {
    const { results } = payload;
    return results.every(isGroupListItem) ? (results as GroupListItem[]) : [];
  }
  return [];
};

/* Linha sem bordas próprias; o container usa divide-y */
const Row = ({
  emp,
  onEdit,
  onDelete,
  canEdit,
  t,
}: {
  emp: Employee;
  onEdit: (e: Employee) => void;
  onDelete: (e: Employee) => void;
  canEdit: boolean;
  t: TFunction; // ✅ typed
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
          {t("settings:employee.btn.edit")}
        </Button>
        <Button variant="common" onClick={() => onDelete(emp)}>
          {t("settings:employee.btn.delete")}
        </Button>
      </div>
    )}
  </div>
);

const EmployeeSettings: React.FC = () => {
  const { t, i18n } = useTranslation(["settings"]);

  useEffect(() => { document.title = t("settings:employee.title"); }, [t]);
  useEffect(() => { document.documentElement.lang = i18n.language; }, [i18n.language]);

  const { isOwner } = useAuthContext();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);

  /* Snackbar */
  const [snack, setSnack] = useState<Snack>(null);

  /* ----------------------------- API calls -------------------------------- */
  const fetchData = async () => {
    try {
      const [empRes, groupRes] = await Promise.all([api.getEmployees(), api.getAllGroups()]);
      const onlyMembers = (empRes.data.employees || []).filter((e: Employee) => e.role === "member");
      setEmployees(onlyMembers.sort((a: Employee, b: Employee) => a.id - b.id));

      const groupList = toGroupArray(groupRes.data as GetGroups);
      setGroups([...groupList].sort((a, b) => a.id - b.id));
    } catch (err) {
      console.error("Erro ao buscar funcionários/grupos", err);
      setSnack({ message: t("settings:employee.toast.fetchError"), severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const res = await api.getEmployee(employee.id);
      const detail = res.data.employee;
      setFormData({
        name: detail.name,
        email: detail.email,
        password: "",
        confirmPassword: "",
        groups: (detail.groups as GroupListItem[]) || [],
      });
      setModalOpen(true);
    } catch (error) {
      console.error(error);
      setSnack({ message: t("settings:employee.toast.loadEmployeeError"), severity: "error" });
    }
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingEmployee(null);
  }, []);

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
        setSnack({ message: t("settings:employee.toast.passwordMismatch"), severity: "warning" });
        return;
      }
      const { isValid, message } = validatePassword(formData.password);
      if (!isValid) {
        setSnack({ message: message || t("settings:employee.toast.weakPassword"), severity: "warning" });
        return;
      }
    }

    try {
      if (mode === "create") {
        await api.addEmployee({
          name: formData.name,
          email: formData.email,
          password: formData.password || undefined,
          group_external_ids: formData.groups.map((g) => g.external_id),
        });
      } else if (editingEmployee) {
        await api.editEmployee(editingEmployee.id, {
          name: formData.name,
          email: formData.email,
          group_external_ids: formData.groups.map((g) => g.external_id),
        });
      }
      await fetchData();
      closeModal();
      setSnack({
        message: t("settings:employee.toast.saveOk", "Colaborador salvo com sucesso."),
        severity: "success",
      });
    } catch (err) {
      console.error(err);
      setSnack({ message: t("settings:employee.toast.saveError"), severity: "error" });
    }
  };

  const deleteEmployee = async (emp: Employee) => {
    if (!window.confirm(t("settings:employee.confirm.delete", { name: emp.name }))) return;
    try {
      await api.deleteEmployee(emp.id);
      await fetchData();
      setSnack({
        message: t("settings:employee.toast.deleteOk", "Colaborador removido."),
        severity: "info",
      });
    } catch (err) {
      console.error(err);
      setSnack({ message: t("settings:employee.toast.deleteError"), severity: "error" });
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
      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header card */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials()}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">
                  {t("settings:employee.header.settings")}
                </div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  {t("settings:employee.header.employees")}
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
                    {t("settings:employee.section.list")}
                  </span>
                  {isOwner && (
                    <Button onClick={openCreateModal} className="!py-1.5">
                      {t("settings:employee.btn.addEmployee")}
                    </Button>
                  )}
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
                    t={t}
                  />
                ))}
                {employees.length === 0 && (
                  <p className="p-4 text-center text-sm text-gray-500">
                    {t("settings:employee.empty")}
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
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-lg max-h-[90vh]"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {mode === "create"
                    ? t("settings:employee.modal.createTitle")
                    : t("settings:employee.modal.editTitle")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label={t("settings:employee.modal.close")}
                >
                  &times;
                </button>
              </header>

              <form className="grid grid-cols-2 gap-4" onSubmit={submitEmployee}>
                <Input
                  label={t("settings:employee.field.name")}
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <Input
                  label={t("settings:employee.field.email")}
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />

                {mode === "create" && (
                  <>
                    <Input
                      label={t("settings:employee.field.tempPassword")}
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleChange}
                      showTogglePassword
                      required
                    />
                    <Input
                      label={t("settings:employee.field.confirmPassword")}
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      showTogglePassword
                      required
                    />
                  </>
                )}

                <div className="col-span-2">
                  <SelectDropdown<GroupListItem>
                    label={t("settings:employee.field.groups")}
                    items={groups}
                    selected={formData.groups}
                    onChange={(items) => setFormData((p) => ({ ...p, groups: items }))}
                    getItemKey={(g) => g.external_id}
                    getItemLabel={(g) => g.name}
                    buttonLabel={t("settings:employee.btnLabel.groups")}
                    hideCheckboxes={false}
                    clearOnClickOutside={false}
                  />
                </div>

                <div className="col-span-2 flex justify-end gap-3 pt-1">
                  <Button variant="cancel" type="button" onClick={closeModal}>
                    {t("settings:employee.btn.cancel")}
                  </Button>
                  <Button type="submit">{t("settings:employee.btn.save")}</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ----------------------------- Snackbar ------------------------------ */}
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

export default EmployeeSettings;
