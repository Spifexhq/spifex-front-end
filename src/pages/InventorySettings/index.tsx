/* -------------------------------------------------------------------------- */
/*  File: src/pages/InventorySettings.tsx                                     */
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
    setFormData(p => ({
      ...p,
      [name]: name === "inventory_item_quantity" ? parseFloat(value) : value,
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

  /* ------------------------------ UI helpers ------------------------------- */
  const Row = ({ item }: { item: InventoryItem }) => (
    <div className="flex items-center justify-between border-b last:border-0 py-4 px-4">
      <div>
        <p className="text-sm text-gray-500">Código: {item.inventory_item_code || "-"}</p>
        <p className="text-base font-medium text-gray-900">{item.inventory_item || "(sem descrição)"}</p>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">Qtd: {item.inventory_item_quantity}</span>
        {isOwner && (
          <>
            <Button variant="outline" onClick={() => openEditModal(item)}>
              Editar
            </Button>
            <Button variant="common" onClick={() => deleteItem(item)}>
              Excluir
            </Button>
          </>
        )}
      </div>
    </div>
  );

  if (loading) return <SuspenseLoader />;

  return (
    <>
      <Navbar />
      <SidebarSettings activeItem="inventory" />

      <main className="min-h-screen bg-gray-50 px-8 py-20 lg:ml-64 text-gray-900">
        <section className="max-w-4xl mx-auto p-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Inventário</h3>
            {isOwner && <Button onClick={openCreateModal}>Adicionar item</Button>}
          </div>

          <div className="border rounded-lg divide-y">
            {items.map(i => (
              <Row key={i.id} item={i} />
            ))}
            {items.length === 0 && (
              <p className="p-4 text-center text-sm text-gray-500">Nenhum item cadastrado.</p>
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
                {mode === "create" ? "Adicionar item" : "Editar item"}
              </h3>
              <button className="text-2xl text-gray-400 hover:text-gray-700" onClick={closeModal}>
                &times;
              </button>
            </header>

            <form className="space-y-4" onSubmit={submitItem}>
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

export default InventorySettings;
