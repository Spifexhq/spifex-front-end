/* --------------------------------------------------------------------------
 * File: src/pages/InventorySettings.tsx
 * i18n: namespace "inventory"
 * -------------------------------------------------------------------------- */
import React, { useEffect, useState, useCallback, useMemo } from "react";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";

import Input from "src/components/ui/Input";
import Button from "src/components/ui/Button";
import Snackbar from "src/components/ui/Snackbar";
import ConfirmToast from "src/components/ui/ConfirmToast";
import Checkbox from "src/components/ui/Checkbox";

import { api } from "src/api/requests";
import type { InventoryItem } from "src/models/enterprise_structure/domain/InventoryItem";
import { useAuthContext } from "src/hooks/useAuth";

import PaginationArrows from "@/components/PaginationArrows/PaginationArrows";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "src/lib/list";
import { useTranslation } from "react-i18next";

/* Snackbar type */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ------------------------------ INFLIGHT guard ---------------------------- */
let INFLIGHT_FETCH = false;

/* ------------------------------ Modal skeleton ---------------------------- */
const ModalSkeleton: React.FC = () => (
  <div className="space-y-3 py-1">
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="h-10 rounded-md bg-gray-100 animate-pulse" />
    <div className="h-6 w-24 rounded-md bg-gray-100 animate-pulse" />
    <div className="flex justify-end gap-2 pt-1">
      <div className="h-9 w-24 rounded-md bg-gray-100 animate-pulse" />
      <div className="h-9 w-28 rounded-md bg-gray-100 animate-pulse" />
    </div>
  </div>
);

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

/* Row */
const Row = ({
  item,
  onEdit,
  onDelete,
  canEdit,
  t,
  busy,
}: {
  item: InventoryItem;
  onEdit: (i: InventoryItem) => void;
  onDelete: (i: InventoryItem) => void;
  canEdit: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
  busy?: boolean;
}) => (
  <div className={`flex items-center justify-between px-4 py-2.5 ${busy ? "opacity-70 pointer-events-none" : ""}`}>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">
        {t("row.skuPrefix")} {item.sku || "—"} {item.uom ? `• ${item.uom}` : ""}
      </p>
      <p className="text-[13px] font-medium text-gray-900 truncate">
        {item.name || t("row.untitled")} {item.description ? `— ${item.description}` : ""}
      </p>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      <span className="text-[12px] text-gray-700">
        {t("row.qtyPrefix")} {item.quantity_on_hand ?? "0"}
      </span>
      {canEdit && (
        <>
          <Button variant="outline" onClick={() => onEdit(item)} disabled={busy}>
            {t("btn.edit")}
          </Button>
          <Button variant="outline" onClick={() => onDelete(item)} disabled={busy} aria-busy={busy || undefined}>
            {t("btn.delete")}
          </Button>
        </>
      )}
    </div>
  </div>
);

const InventorySettings: React.FC = () => {
  const { t, i18n } = useTranslation("inventorySettings");
  const { isOwner } = useAuthContext();

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  /* ----------------------------- Flags ------------------------------------ */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  /* ----------------------------- Estados ---------------------------------- */
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [snack, setSnack] = useState<Snack>(null);

  /* Confirm Toast */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  /* Overlay dinâmico: adicionados e excluídos (UI imediata) */
  const [added, setAdded] = useState<InventoryItem[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ----------------------------- Filtro (click-to-search) ------------------ */
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  /* ----------------------------- Paginação por cursor ---------------------- */
  const fetchItemsPage = useCallback(
    async (cursor?: string) => {
      if (INFLIGHT_FETCH) return { items: [] as InventoryItem[], nextCursor: undefined as string | undefined };
      INFLIGHT_FETCH = true;
      try {
        const { data, meta } = await api.getInventoryItems({
          cursor,
          q: appliedQuery || undefined,
        });
        const items = ((data?.results ?? []) as InventoryItem[]).slice().sort(sortBySkuThenName);
        const nextUrl = meta?.pagination?.next ?? data?.next ?? null;
        const nextCursor = nextUrl ? (getCursorFromUrl(nextUrl) || nextUrl) : undefined;
        return { items, nextCursor };
      } finally {
        INFLIGHT_FETCH = false;
      }
    },
    [appliedQuery]
  );

  const pager = useCursorPager<InventoryItem>(fetchItemsPage, {
    autoLoadFirst: true,
    deps: [appliedQuery],
  });

  const isInitialLoading = pager.loading && pager.items.length === 0;
  const isBackgroundSync = pager.loading && pager.items.length > 0;

  const { refresh } = pager;
  const onSearch = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed === appliedQuery) refresh();
    else setAppliedQuery(trimmed);
  }, [query, appliedQuery, refresh]);

  /* ------------------------------ Helpers overlay ------------------------- */
  const matchesQuery = useCallback((i: InventoryItem, q: string) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (i.sku || "").toLowerCase().includes(s) ||
      (i.name || "").toLowerCase().includes(s) ||
      (i.description || "").toLowerCase().includes(s)
    );
  }, []);

  useEffect(() => {
    setAdded((prev) => prev.filter((i) => matchesQuery(i, appliedQuery)));
  }, [appliedQuery, matchesQuery]);

  const visibleItems = useMemo(() => {
    const addedFiltered = added.filter((i) => matchesQuery(i, appliedQuery));
    const addedIds = new Set(addedFiltered.map((i) => i.id));
    const base = pager.items.filter((i) => !deletedIds.has(i.id) && !addedIds.has(i.id));
    return [...addedFiltered, ...base];
  }, [added, deletedIds, pager.items, appliedQuery, matchesQuery]);

  /* ------------------------------ Handlers --------------------------------- */
  const openCreateModal = () => {
    setMode("create");
    setEditingItem(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = async (item: InventoryItem) => {
    setMode("edit");
    setEditingItem(item);
    setModalOpen(true);
    setIsDetailLoading(true);

    try {
      const res = await api.getInventoryItem(item.id);
      const detail = res.data as InventoryItem;

      setFormData({
        sku: detail.sku ?? "",
        name: detail.name ?? "",
        description: detail.description ?? "",
        uom: detail.uom ?? "",
        quantity_on_hand: detail.quantity_on_hand ?? "0",
        is_active: detail.is_active ?? true,
      });
    } catch {
      setFormData({
        sku: item.sku ?? "",
        name: item.name ?? "",
        description: item.description ?? "",
        uom: item.uom ?? "",
        quantity_on_hand: item.quantity_on_hand ?? "0",
        is_active: item.is_active ?? true,
      });
      setSnack({ message: t("errors.detailError"), severity: "error" });
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingItem(null);
    setFormData(emptyForm);
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
    setIsSubmitting(true);
    try {
      if (mode === "create") {
        const { data: created } = await api.addInventoryItem(formData);
        setAdded((prev) => [created, ...prev]);
        setSnack({ message: t("toast.saveOk"), severity: "success" });
      } else if (editingItem) {
        await api.editInventoryItem(editingItem.id, formData);
        setSnack({ message: t("toast.updateOk"), severity: "success" });
      }
      await pager.refresh();
      closeModal();
    } catch (err) {
      setSnack({ message: err instanceof Error ? err.message : t("errors.saveError"), severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteItem = (item: InventoryItem) => {
    const name = item.name ?? item.sku ?? "";
    setConfirmText(t("confirm.deleteTitle", { name }));
    setConfirmAction(() => async () => {
      setDeleteTargetId(item.id);
      try {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.add(item.id);
          return next;
        });

        await api.deleteInventoryItem(item.id);
        await pager.refresh();
        setAdded((prev) => prev.filter((i) => i.id !== item.id));

        setSnack({ message: t("toast.deleteOk"), severity: "info" });
      } catch (err) {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        setSnack({ message: err instanceof Error ? err.message : t("errors.deleteError"), severity: "error" });
      } finally {
        setDeleteTargetId(null);
        setConfirmOpen(false);
        setConfirmBusy(false);
      }
    });
    setConfirmOpen(true);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  const headerBadge = isBackgroundSync ? (
    <span aria-live="polite" className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-white/70 backdrop-blur-sm">
      {t("badge.syncing")}
    </span>
  ) : null;

  const canEdit = !!isOwner;
  const globalBusy = isSubmitting || isBackgroundSync || confirmBusy;

  return (
    <>
      <TopProgress active={isBackgroundSync} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials()}
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.settings")}</div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{t("header.inventory")}</h1>
                </div>
                {headerBadge}
              </div>
            </div>
          </header>

          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">{t("section.list")}</span>

                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                      placeholder={t("search.placeholder")}
                      aria-label={t("search.aria")}
                      disabled={globalBusy}
                    />
                    <Button onClick={onSearch} variant="outline" disabled={globalBusy}>
                      {t("search.button")}
                    </Button>
                    {canEdit && (
                      <Button onClick={openCreateModal} className="!py-1.5" disabled={globalBusy}>
                        {t("btn.addItem")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {pager.error ? (
                <div className="p-6 text-center">
                  <p className="text-[13px] font-medium text-red-700 mb-2">{t("errors.loadFailedTitle")}</p>
                  <p className="text-[11px] text-red-600 mb-4">{pager.error}</p>
                  <Button variant="outline" size="sm" onClick={pager.refresh} disabled={globalBusy}>
                    {t("btn.retry")}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {visibleItems.length === 0 ? (
                      <p className="p-4 text-center text-sm text-gray-500">{t("empty")}</p>
                    ) : (
                      visibleItems.map((i) => {
                        const rowBusy = globalBusy || deleteTargetId === i.id || deletedIds.has(i.id);
                        return (
                          <Row
                            key={i.id}
                            item={i}
                            canEdit={canEdit}
                            onEdit={openEditModal}
                            onDelete={requestDeleteItem}
                            t={t}
                            busy={rowBusy}
                          />
                        );
                      })
                    )}
                  </div>

                  <PaginationArrows
                    onPrev={pager.prev}
                    onNext={pager.next}
                    disabledPrev={!pager.canPrev || globalBusy}
                    disabledNext={!pager.canNext || globalBusy}
                  />
                </>
              )}
            </div>
          </section>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md" role="dialog" aria-modal="true">
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {mode === "create" ? t("modal.createTitle") : t("modal.editTitle")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label={t("modal.close")}
                  disabled={isSubmitting}
                >
                  &times;
                </button>
              </header>

              {mode === "edit" && isDetailLoading ? (
                <ModalSkeleton />
              ) : (
                <form className="space-y-3" onSubmit={submitItem}>
                  <Input label={t("field.sku")} name="sku" value={formData.sku} onChange={handleChange} required disabled={isSubmitting} />
                  <Input label={t("field.name")} name="name" value={formData.name} onChange={handleChange} required disabled={isSubmitting} />
                  <Input label={t("field.description")} name="description" value={formData.description} onChange={handleChange} disabled={isSubmitting} />
                  <Input label={t("field.uom")} name="uom" value={formData.uom} onChange={handleChange} placeholder={t("field.uomPlaceholder")} disabled={isSubmitting} />
                  <Input label={t("field.qty")} name="quantity_on_hand" type="number" step="1" min="0" value={formData.quantity_on_hand} onChange={handleChange} disabled={isSubmitting} />
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={formData.is_active} onChange={handleActive} disabled={isSubmitting} />
                    {t("field.isActive")}
                  </label>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="cancel" type="button" onClick={closeModal} disabled={isSubmitting}>
                      {t("btn.cancel")}
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {t("btn.save")}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      <ConfirmToast
        open={confirmOpen}
        text={confirmText}
        confirmLabel={t("btn.delete")}
        cancelLabel={t("btn.cancel")}
        variant="danger"
        onCancel={() => {
          if (confirmBusy) return;
          setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (confirmBusy || !confirmAction) return;
          setConfirmBusy(true);
          confirmAction()
            .catch(() => {
              setSnack({ message: t("errors.confirmFailed"), severity: "error" });
            })
            .finally(() => setConfirmBusy(false));
        }}
        busy={confirmBusy}
      />

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

export default InventorySettings;
