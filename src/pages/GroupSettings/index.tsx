/* -------------------------------------------------------------------------- */
/*  File: src/pages/GroupSettings.tsx                                         */
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
import { GroupDetail, Permission } from "src/models/auth/domain";
import { useAuthContext } from "@/contexts/useAuthContext";
import { AddGroupRequest, Bank } from "src/models";

/* ---------------------------- Form template ------------------------------ */
const emptyForm = {
  name: "",
  banks: [] as Bank[],
  permissions: [] as Permission[],
};

type FormState = typeof emptyForm;

const GroupSettings: React.FC = () => {
  /* ------------------------------ Setup ----------------------------------- */
  useEffect(() => {
    document.title = "Grupos";
  }, []);

  const { isOwner } = useAuthContext();

  /* ----------------------------- Estados ---------------------------------- */
  const [groups, setGroups] = useState<GroupDetail[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingGroup, setEditingGroup] = useState<GroupDetail | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [snackBarMessage, setSnackBarMessage] = useState("");

  /* ----------------------------- API calls -------------------------------- */
  const fetchData = async () => {
    try {
      const [groupRes, bankRes, permRes] = await Promise.all([
        api.getAllGroups(),
        api.getAllBanks(),
        api.getPermissions(),
      ]);
      setGroups(groupRes.data.groups.sort((a, b) => a.id - b.id));
      setBanks(bankRes.data.banks.sort((a: Bank, b: Bank) => a.id - b.id));
      setPermissions(permRes.data.permissions.sort((a: Permission, b: Permission) => a.id - b.id));
    } catch (error) {
      console.error("Erro ao buscar grupos/bancos/permissões", error);
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
    setEditingGroup(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (group: GroupDetail) => {
    setMode("edit");
    setEditingGroup(group);
    setFormData({
      name: group.name,
      banks: group.banks,
      permissions: group.permissions,
    });
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingGroup(null);
  }, []);

  /* --------------------------- Form helpers ------------------------------- */
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));
    };

    const buildPayload = (): AddGroupRequest => {
        return {
            name: formData.name,
            banks: formData.banks.map(b => b.id).join(","),
            permissions: formData.permissions.map(p => p.id).join(","),
        };
    };

  const submitGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = buildPayload();

    if (mode === "create") {
    await api.addGroup(payload);
    } else if (editingGroup) {
    await api.editGroup([editingGroup.id], payload);
    }
      await fetchData();
      closeModal();
    } catch (error) {
      setSnackBarMessage(error instanceof Error ? error.message : "Erro ao salvar grupo.");
    }
  };

  const deleteGroup = async (g: GroupDetail) => {
    if (!window.confirm(`Excluir grupo" ${g.name}"?`)) return;

    try {
      await api.deleteGroup([g.id]);
      await fetchData();
    } catch (error) {
      setSnackBarMessage(error instanceof Error ? error.message : "Erro ao excluir grupo.");
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
  const Row = ({ g }: { g: GroupDetail }) => (
    <div className="flex items-center justify-between border-b last:border-0 py-4 px-4">
      <p className="text-base font-medium text-gray-900">{g.name}</p>
      {isOwner && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openEditModal(g)}>
            Editar
          </Button>
          <Button variant="common" onClick={() => deleteGroup(g)}>
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
      <SidebarSettings activeItem="groups" />

      <main className="min-h-screen bg-gray-50 px-8 py-20 lg:ml-64 text-gray-900">
        <section className="max-w-5xl mx-auto p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Grupos</h3>
            {isOwner && <Button onClick={openCreateModal}>Adicionar grupo</Button>}
          </div>

          <div className="border rounded-lg divide-y">
            {groups.map(g => (
              <Row key={g.id} g={g} />
            ))}
            {groups.length === 0 && (
              <p className="p-4 text-center text-sm text-gray-500">Nenhum grupo cadastrado.</p>
            )}
          </div>
        </section>
      </main>

      {/* ------------------------------ Modal -------------------------------- */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl max-h-[90vh]"
          >
            <header className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-800">
                {mode === "create" ? "Adicionar grupo" : "Editar grupo"}
              </h3>
              <button className="text-2xl text-gray-400 hover:text-gray-700" onClick={closeModal}>
                &times;
              </button>
            </header>

            <form className="grid grid-cols-2 gap-4" onSubmit={submitGroup}>
              <Input
                label="Nome do grupo"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />

            <SelectDropdown
                label="Bancos"
                items={banks}
                selected={formData.banks}
                onChange={items => setFormData(p => ({ ...p, banks: items }))}
                getItemKey={b => b.id}
                getItemLabel={b => `${b.bank_branch ?? ""} - ${b.bank_account}`}
                buttonLabel="Selecione os bancos"
                hideCheckboxes={false}
                clearOnClickOutside={false}
                customStyles={{ maxHeight: "250px" }}
            />

            <div className="col-span-2">
                <SelectDropdown
                    label="Permissões"
                    items={permissions}
                    selected={formData.permissions}
                    onChange={items => setFormData(p => ({ ...p, permissions: items }))}
                    getItemKey={p => p.id}
                    getItemLabel={p => p.code_name}
                    buttonLabel="Selecione as permissões"
                    hideCheckboxes={false}
                    clearOnClickOutside={false}
                    customStyles={{ maxHeight: "250px" }}
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

export default GroupSettings;
