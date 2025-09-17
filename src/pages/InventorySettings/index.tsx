/* -------------------------------------------------------------------------- */
/*  File: src/pages/InventorySettings.tsx                                     */
/*  Pagination: cursor + arrow-only, click-to-search via "Buscar"             */
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
import type { InventoryItem } from "src/models/enterprise_structure/domain/InventoryItem";
import { useAuthContext } from "@/contexts/useAuthContext";
import Checkbox from "src/components/Checkbox";

import PaginationArrows from "@/components/PaginationArrows/PaginationArrows";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "src/lib/list";

/* --------------------------------- Helpers -------------------------------- */
function getInitials() {
  return "IV"; // Inventário
}

const emptyForm = {
  sku: "",
  name: "",
  description: "",
  uom: "",
  quantity_on_hand: "0",
  is_active: true,
};
type FormState = typeof emptyForm;

/* sort por SKU, depois nome */
function sortBySkuThenName(a: InventoryItem, b: InventoryItem) {
  const sa = (a.sku || "").toString();
  const sb = (b.sku || "").toString();
  if (sa && sb && sa !== sb) return sa.localeCompare(sb, "pt-BR", { numeric: true });
  return (a.name || "").localeCompare(b.name || "", "pt-BR");
}

/* Linha */
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
        SKU: {item.sku || "—"} {item.uom ? `• ${item.uom}` : ""}
      </p>
      <p className="text-[13px] font-medium text-gray-900 truncate">
        {item.name || "(sem nome)"} {item.description ? `— ${item.description}` : ""}
      </p>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      <span className="text-[12px] text-gray-700">
        Qtd: {item.quantity_on_hand ?? "0"}
      </span>
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

  /* ----------------------------- Estados ---------------------------------- */
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [snackBarMessage, setSnackBarMessage] = useState("");

  /* ----------------------------- Filtro (click-to-search) ------------------ */
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  /* ----------------------------- Paginação por cursor ---------------------- */
  const fetchItemsPage = useCallback(
    async (cursor?: string) => {
      const { data, meta } = await api.getInventoryItems({
        page_size: 100,
        cursor,
        q: appliedQuery || undefined,
      });
      const items = ((data?.results ?? []) as InventoryItem[]).slice().sort(sortBySkuThenName);
      const nextUrl = meta?.pagination?.next ?? data?.next ?? null;
      const nextCursor = nextUrl ? (getCursorFromUrl(nextUrl) || nextUrl) : undefined;
      return { items, nextCursor };
    },
    [appliedQuery]
  );

  const pager = useCursorPager<InventoryItem>(fetchItemsPage, {
    autoLoadFirst: true,
    deps: [appliedQuery],
  });

  const { refresh } = pager;
  const onSearch = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed === appliedQuery) refresh();
    else setAppliedQuery(trimmed);
  }, [query, appliedQuery, refresh]);

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
      sku: item.sku ?? "",
      name: item.name ?? "",
      description: item.description ?? "",
      uom: item.uom ?? "",
      quantity_on_hand: item.quantity_on_hand ?? "0",
      is_active: item.is_active ?? true,
    });
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingItem(null);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleActive = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((p) => ({ ...p, is_active: e.target.checked }));
  };

  const submitItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "create") await api.addInventoryItem(formData);
      else if (editingItem) await api.editInventoryItem(editingItem.id, formData);
      await pager.refresh();
      closeModal();
    } catch (err) {
      setSnackBarMessage(err instanceof Error ? err.message : "Erro ao salvar item.");
    }
  };

  const deleteItem = async (item: InventoryItem) => {
    try {
      await api.deleteInventoryItem(item.id);
      await pager.refresh();
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
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  if (pager.loading && pager.items.length === 0) return <SuspenseLoader />;

  /* --------------------------------- UI ----------------------------------- */
  return (
    <>
      <Navbar />
      <SidebarSettings activeItem="inventory" />

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
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">Itens do inventário</span>

                  {/* Busca (clique para aplicar) */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                      placeholder="Buscar por nome ou SKU…"
                      aria-label="Buscar itens"
                    />
                    <Button onClick={onSearch} variant="outline">Buscar</Button>
                    {isOwner && (
                      <Button onClick={openCreateModal} className="!py-1.5">Adicionar item</Button>
                    )}
                  </div>
                </div>
              </div>

              {pager.error ? (
                <div className="p-6 text-center">
                  <p className="text-[13px] font-medium text-red-700 mb-2">Falha ao carregar</p>
                  <p className="text-[11px] text-red-600 mb-4">{pager.error}</p>
                  <Button variant="outline" size="sm" onClick={pager.refresh}>Tentar novamente</Button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {pager.items.length === 0 ? (
                      <p className="p-4 text-center text-sm text-gray-500">Nenhum item encontrado.</p>
                    ) : (
                      pager.items.map((i) => (
                        <Row
                          key={i.id}
                          item={i}
                          canEdit={!!isOwner}
                          onEdit={openEditModal}
                          onDelete={deleteItem}
                        />
                      ))
                    )}
                  </div>

                  <PaginationArrows
                    onPrev={pager.prev}
                    onNext={pager.next}
                    disabledPrev={!pager.canPrev}
                    disabledNext={!pager.canNext}
                    label={`Página ${pager.index + 1} de ${
                      pager.reachedEnd ? pager.knownPages : `${pager.knownPages}+`
                    }`}
                  />
                </>
              )}
            </div>
          </section>
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md"
                 role="dialog" aria-modal="true">
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {mode === "create" ? "Adicionar item" : "Editar item"}
                </h3>
                <button className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                        onClick={closeModal} aria-label="Fechar">
                  &times;
                </button>
              </header>

              <form className="space-y-3" onSubmit={submitItem}>
                <Input label="SKU" name="sku" value={formData.sku} onChange={handleChange} required />
                <Input label="Nome" name="name" value={formData.name} onChange={handleChange} required />
                <Input label="Descrição" name="description" value={formData.description} onChange={handleChange} />
                <Input label="Unidade (UoM)" name="uom" value={formData.uom} onChange={handleChange} placeholder="ex.: un, cx, kg, l…" />
                <Input label="Quantidade em estoque" name="quantity_on_hand" type="number" step="1" min="0"
                       value={formData.quantity_on_hand} onChange={handleChange} />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={formData.is_active} onChange={handleActive} />
                  Item ativo
                </label>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="cancel" type="button" onClick={closeModal}>Cancelar</Button>
                  <Button type="submit">Salvar</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Snackbar open={!!snackBarMessage} autoHideDuration={6000}
                onClose={() => setSnackBarMessage("")} severity="error">
        <Alert severity="error">{snackBarMessage}</Alert>
      </Snackbar>
    </>
  );
};

export default InventorySettings;
