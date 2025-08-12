/* -------------------------------------------------------------------------- */
/*  File: src/pages/InventorySettings.tsx                                     */
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
import { InventoryItem } from "src/models/enterprise_structure/domain";
import { useAuthContext } from "@/contexts/useAuthContext";

const emptyForm = {
  inventory_item_code: "",
  inventory_item: "",
  inventory_item_quantity: 0,
};
type FormState = typeof emptyForm;

/* --------------------------------- Helpers -------------------------------- */
function getInitials() {
  return "IV"; // Inventário
}

/* Linha sem bordas próprias; o container usa divide-y */
const Row = ({
  item,
  onEdit,
  onDelete,
  canEdit,
}: {
  item: InventoryItem;
  onEdit: (i: InventoryItem) => void;
  onDelete: (i: InventoryItem) => void;
  canEdit: boolean;
}) => (
  <div className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">
        Código: {item.inventory_item_code || "—"}
      </p>
      <p className="text-[13px] font-medium text-gray-900 truncate">
        {item.inventory_item || "(sem descrição)"}
      </p>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      <span className="text-[12px] text-gray-700">Qtd: {item.inventory_item_quantity}</span>
      {canEdit && (
        <>
          <Button
            variant="outline"
            className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
            onClick={() => onEdit(item)}
          >
            Editar
          </Button>
          <Button variant="common" onClick={() => onDelete(item)}>
            Excluir
          </Button>
        </>
      )}
    </div>
  </div>
);

const InventorySettings: React.FC = () => {
  useEffect(() => {
    document.title = "Inventário";
  }, []);

  const { isOwner } = useAuthContext();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [snackBarMessage, setSnackBarMessage] = useState("");

  /* ------------------------------ Carrega dados ----------------------------- */
  const fetchItems = async () => {
    try {
      const res = await api.getAllInventoryItems();
      setItems(res.data.inventory_items.sort((a, b) => a.id - b.id));
    } catch (err) {
      console.error("Erro ao buscar itens de inventário", err);
      setSnackBarMessage("Erro ao buscar itens de inventário.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  /* ------------------------------ Handlers --------------------------------- */
  const openCreateModal = () => {
    setMode("create");
    setEditingItem(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setMode("edit");
    setEditingItem(item);
    setFormData({
      inventory_item_code: item.inventory_item_code ?? "",
      inventory_item: item.inventory_item ?? "",
      inventory_item_quantity: item.inventory_item_quantity ?? 0,
    });
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingItem(null);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((p) => ({
      ...p,
      [name]: name === "inventory_item_quantity" ? parseFloat(value) || 0 : value,
    }));
  };

  const submitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "create") {
        await api.addInventoryItem(formData);
      } else if (editingItem) {
        await api.editInventoryItem([editingItem.id], formData);
      }
      await fetchItems();
      closeModal();
    } catch (err) {
      setSnackBarMessage(err instanceof Error ? err.message : "Erro ao salvar item.");
    }
  };

  const deleteItem = async (item: InventoryItem) => {
    try {
      await api.deleteInventoryItem([item.id]);
      await fetchItems();
    } catch (err) {
      setSnackBarMessage(err instanceof Error ? err.message : "Erro ao excluir item.");
    }
  };

  /* ------------------------------ Esc key / scroll lock -------------------- */
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
      <SidebarSettings activeItem="inventory" />

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
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">Inventário</h1>
              </div>
            </div>
          </header>

          {/* Card principal */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    Itens do inventário
                  </span>
                  {isOwner && (
                    <Button onClick={openCreateModal} className="!py-1.5">
                      Adicionar item
                    </Button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {items.map((i) => (
                  <Row
                    key={i.id}
                    item={i}
                    canEdit={!!isOwner}
                    onEdit={openEditModal}
                    onDelete={deleteItem}
                  />
                ))}
                {items.length === 0 && (
                  <p className="p-4 text-center text-sm text-gray-500">Nenhum item cadastrado.</p>
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
                  {mode === "create" ? "Adicionar item" : "Editar item"}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label="Fechar"
                >
                  &times;
                </button>
              </header>

              <form className="space-y-3" onSubmit={submitItem}>
                <Input
                  label="Código do item"
                  name="inventory_item_code"
                  value={formData.inventory_item_code}
                  onChange={handleChange}
                />
                <Input
                  label="Descrição do item"
                  name="inventory_item"
                  value={formData.inventory_item}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Quantidade"
                  name="inventory_item_quantity"
                  type="number"
                  step="1"
                  min="0"
                  value={formData.inventory_item_quantity}
                  onChange={handleChange}
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

export default InventorySettings;
