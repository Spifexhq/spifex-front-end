/* -------------------------------------------------------------------------- */
/*  File: src/pages/GroupSettings.tsx                                         */
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

/* --------------------------------- Helpers -------------------------------- */
type BankLike =
  | Bank
  | {
      id?: number;
      bank_id?: number;
      bank?: Bank | null;
      account?: string | null;
      bank_institution?: string | null;
      bank_account?: string | null;
    };

const getBankId = (b?: BankLike | null): number | null => {
  if (!b) return null;
  // id direto
  if ("id" in b && typeof b.id === "number") return b.id;
  // id vindo como bank_id
  if ("bank_id" in b && typeof b.bank_id === "number") return b.bank_id;
  // id dentro de bank
  if ("bank" in b && b.bank && typeof b.bank.id === "number") return b.bank.id;
  return null;
};

const toFullBank = (bLike: BankLike, allBanks: Bank[]): Bank => {
  const id = getBankId(bLike);
  const found = id ? allBanks.find((x) => x.id === id) : undefined;

  // fallback: se vier como { bank: Bank }, usa o aninhado; senão, usa o próprio objeto tipado como Bank
  const nested = ((): Bank | undefined => {
    if (typeof bLike === "object" && bLike && "bank" in bLike) {
      const maybe = (bLike as { bank?: Bank | null }).bank;
      if (maybe && typeof maybe.id === "number") return maybe;
    }
    return undefined;
  })();

  return found ?? nested ?? (bLike as Bank);
};

const bankLabel = (bLike: BankLike): string => {
  const inst =
    ("bank_institution" in bLike && bLike.bank_institution) ||
    (("bank" in bLike && bLike.bank && bLike.bank.bank_institution) ?? "") ||
    "";

  const acc =
    ("bank_account" in bLike && bLike.bank_account) ||
    (("bank" in bLike && bLike.bank && bLike.bank.bank_account) ?? "") ||
    (("account" in bLike && bLike.account) ?? "") ||
    "";

  return `${inst}${inst && acc ? " - " : ""}${acc}`.trim();
};

function getInitials() {
  return "GR";
}

/* Linha sem bordas próprias; o container usa divide-y */
const Row = ({
  g,
  onEdit,
  onDelete,
  canEdit,
}: {
  g: GroupDetail;
  onEdit: (g: GroupDetail) => void;
  onDelete: (g: GroupDetail) => void;
  canEdit: boolean;
}) => (
  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
    <p className="text-[13px] font-medium text-gray-900 truncate">{g.name}</p>
    {canEdit && (
      <div className="flex gap-2 shrink-0">
        <Button
          variant="outline"
          className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
          onClick={() => onEdit(g)}
        >
          Editar
        </Button>
        <Button variant="common" onClick={() => onDelete(g)}>
          Excluir
        </Button>
      </div>
    )}
  </div>
);

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
      banks: (group.banks || []).map((b) => toFullBank(b, banks)), // 👈 aqui
      permissions: group.permissions || [],
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
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const buildPayload = (): AddGroupRequest => ({
    name: formData.name,
    banks: formData.banks.map((b) => getBankId(b)).filter(Boolean).join(","),   // 👈
    permissions: formData.permissions.map((p) => p.id).join(","),
  });

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
    if (!window.confirm(`Excluir grupo "${g.name}"?`)) return;
    try {
      await api.deleteGroup([g.id]);
      await fetchData();
    } catch (error) {
      setSnackBarMessage(error instanceof Error ? error.message : "Erro ao excluir grupo.");
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
      <SidebarSettings activeItem="groups" />

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
                  <Row
                    key={g.id}
                    g={g}
                    canEdit={!!isOwner}
                    onEdit={openEditModal}
                    onDelete={deleteGroup}
                  />
                ))}
                {groups.length === 0 && (
                  <p className="p-4 text-center text-sm text-gray-500">
                    Nenhum grupo cadastrado.
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

                <SelectDropdown
                  label="Bancos"
                  items={banks}
                  selected={formData.banks}
                  onChange={(items) => setFormData((p) => ({ ...p, banks: items }))}
                  getItemKey={(b) => getBankId(b)!}
                  getItemLabel={(b) => bankLabel(b)}          // 👈 evita "undefined"
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
                    onChange={(items) => setFormData((p) => ({ ...p, permissions: items }))}
                    getItemKey={(p) => p.id}
                    getItemLabel={(p) => p.name}
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
