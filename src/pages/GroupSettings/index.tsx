/* -------------------------------------------------------------------------- */
/*  File: src/pages/GroupSettings/index.tsx                                   */
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
import { useAuthContext } from "@/contexts/useAuthContext";

import type { Permission } from "src/models/auth/domain/Permission";
import type { GroupDetail, GroupListItem } from "src/models/auth/domain/Group";
import type { AddGroupRequest, GetGroups, GetGroup } from "src/models/auth/dto/GetGroup";

/* ---------------------------- Tipos locais -------------------------------- */

type GroupRow = GroupListItem; // lista usa o tipo "leve" (sem permissions)

// Form trabalha com objetos Permission; payload envia apenas codes
const emptyForm = {
  name: "",
  permissions: [] as Permission[],
};
type FormState = typeof emptyForm;

/* --------------------------------- Helpers -------------------------------- */

const getInitials = () => "GR";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/* --------- Groups (list + detail) --------- */

const isGroupListItem = (v: unknown): v is GroupListItem =>
  isRecord(v) &&
  typeof v.id === "number" &&
  typeof v.slug === "string" &&
  typeof v.name === "string" &&
  typeof v.is_system === "boolean" &&
  typeof v.permissions_count === "number" &&
  typeof v.members_count === "number";

const toGroupArray = (payload: GetGroups): GroupRow[] => {
  if (Array.isArray(payload) && payload.every(isGroupListItem)) return payload;
  if (isRecord(payload) && Array.isArray((payload as { results?: unknown }).results)) {
    const arr = (payload as { results: unknown[] }).results;
    return arr.every(isGroupListItem) ? arr : [];
  }
  return [];
};

// Detalhe já é GroupDetail nos seus tipos
const toGroupDetail = (payload: GetGroup): GroupDetail => payload;

/* --------- Permissions (vários formatos) --------- */

const isPermission = (v: unknown): v is Permission =>
  isRecord(v) &&
  typeof (v as { code?: unknown }).code === "string" &&
  (typeof (v as { name?: unknown }).name === "string" ||
    typeof (v as { name?: unknown }).name === "undefined");

/** Aceita: Permission[] | {permissions: Permission[]} | {results: Permission[]} | {data:{results: Permission[]}} */
const toPermissions = (payload: unknown): Permission[] => {
  // 1) Array direto
  if (Array.isArray(payload) && payload.every(isPermission)) return payload;

  if (isRecord(payload)) {
    // 2) { permissions: [...] }
    const p1 = (payload as Record<string, unknown>)["permissions"];
    if (Array.isArray(p1) && p1.every(isPermission)) return p1;

    // 3) { results: [...] }
    const r1 = (payload as Record<string, unknown>)["results"];
    if (Array.isArray(r1) && r1.every(isPermission)) return r1;

    // 4) { data: { results: [...] } }
    const data = (payload as Record<string, unknown>)["data"];
    if (isRecord(data)) {
      const r2 = (data as Record<string, unknown>)["results"];
      if (Array.isArray(r2) && r2.every(isPermission)) return r2;
      const p2 = (data as Record<string, unknown>)["permissions"];
      if (Array.isArray(p2) && p2.every(isPermission)) return p2;
    }
  }
  return [];
};

/* ------------------------------- Componente -------------------------------- */

const GroupSettings: React.FC = () => {
  useEffect(() => {
    document.title = "Grupos";
  }, []);

  const { isOwner } = useAuthContext();

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingGroup, setEditingGroup] = useState<GroupDetail | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [snackBarMessage, setSnackBarMessage] = useState("");

  /* ----------------------------- API calls -------------------------------- */
  const fetchData = async () => {
    setLoading(true);
    try {
      const [groupRes, permRes] = await Promise.all([
        api.getAllGroups(),   // org é resolvido dentro do requests.ts
        api.getPermissions(), // global
      ]);

      const groupList = toGroupArray(groupRes.data);
      setGroups(
        [...groupList].sort((a, b) => (a.name || "").localeCompare(b.name || ""))
      );

      // Aceita qualquer formato (array, {permissions}, {results}, {data:{results}})
      const perms = toPermissions(permRes.data as unknown);
      setPermissions(
        [...perms].sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code))
      );
    } catch (err) {
      console.error("Erro ao buscar grupos/permissões", err);
      setSnackBarMessage("Erro ao buscar dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  /* ------------------------------ Handlers -------------------------------- */
  const openCreateModal = () => {
    setMode("create");
    setEditingGroup(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = async (group: GroupRow) => {
    try {
      const res = await api.getGroup(group.slug);
      const detail = toGroupDetail(res.data);

      setMode("edit");
      setEditingGroup(detail);
      setFormData({
        name: detail.name,
        permissions: detail.permissions ?? [],
      });
      setModalOpen(true);
    } catch (err) {
      console.error("Erro ao carregar o grupo", err);
      setSnackBarMessage("Erro ao carregar o grupo.");
    }
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
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const buildPayload = (): AddGroupRequest => ({
    name: formData.name.trim(),
    permission_codes: formData.permissions.map((p) => p.code),
  });

  const submitGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setSnackBarMessage("Informe o nome do grupo.");
      return;
    }
    try {
      const payload = buildPayload();
      if (mode === "create") {
        await api.addGroup(payload);
      } else if (editingGroup) {
        await api.editGroup(editingGroup.slug, payload);
      }
      await fetchData();
      closeModal();
    } catch (err) {
      console.error("Erro ao salvar grupo", err);
      setSnackBarMessage("Erro ao salvar grupo.");
    }
  };

  const deleteGroup = async (g: GroupRow) => {
    if (!window.confirm(`Excluir grupo "${g.name}"?`)) return;

    try {
      await api.deleteGroup(g.slug);

      await fetchData();

      setGroups(prev => prev.filter(item => item.slug !== g.slug));
    } catch (err) {
      console.error("Erro ao excluir grupo", err);
      setSnackBarMessage("Erro ao excluir grupo.");
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

  /* ---------------------------------- UI ---------------------------------- */
  return (
    <>
      <Navbar />
      <SidebarSettings activeItem="groups" />

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
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">Grupos</h1>
              </div>
            </div>
          </header>

          {/* Card principal */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">Lista de grupos</span>
                  {isOwner && (
                    <Button onClick={openCreateModal} className="!py-1.5">
                      Adicionar grupo
                    </Button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {groups.map((g) => (
                  <div key={g.slug} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{g.name}</p>
                    {isOwner && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                          onClick={() => openEditModal(g)}
                        >
                          Editar
                        </Button>
                        <Button variant="common" onClick={() => deleteGroup(g)}>
                          Excluir
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {groups.length === 0 && (
                  <p className="p-4 text-center text-sm text-gray-500">Nenhum grupo cadastrado.</p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-2xl max-h-[90vh]"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {mode === "create" ? "Adicionar grupo" : "Editar grupo"}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label="Fechar"
                >
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

                <div className="col-span-2">
                  <SelectDropdown
                    label="Permissões"
                    items={permissions}
                    selected={formData.permissions}
                    onChange={(items: Permission[]) => setFormData((p) => ({ ...p, permissions: items }))}
                    getItemKey={(p: Permission) => p.code}
                    getItemLabel={(p: Permission) => p.name || p.code}
                    buttonLabel="Selecione as permissões"
                    hideCheckboxes={false}
                    clearOnClickOutside={false}
                    customStyles={{ maxHeight: "250px" }}
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

export default GroupSettings;
