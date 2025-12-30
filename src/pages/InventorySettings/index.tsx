/* -------------------------------------------------------------------------- */
/* File: src/pages/InventorySettings.tsx                                       */
/* i18n: namespace "inventorySettings"                                        */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Snackbar from "@/components/ui/Snackbar";
import ConfirmToast from "@/components/ui/ConfirmToast";
import PaginationArrows from "@/components/PaginationArrows/PaginationArrows";

import InventoryModal from "./InventoryModal";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";

import type { InventoryItem } from "@/models/settings/inventory";

/* Snackbar type */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* --------------------------------- Helpers -------------------------------- */
function getInitials() {
  return "IV";
}

/**
 * Cursor pagination relies on backend ordering.
 * Avoid re-sorting server pages on the client, or you risk perceived "jumps".
 * Only sort local overlay items if needed.
 */
function sortOverlayBySkuThenName(a: InventoryItem, b: InventoryItem) {
  const sa = (a.sku || "").toString();
  const sb = (b.sku || "").toString();
  if (sa && sb && sa !== sb) return sa.localeCompare(sb, "en", { numeric: true });
  return (a.name || "").localeCompare(b.name || "", "en");
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onEdit(item)} disabled={busy}>
            {t("btn.edit")}
          </Button>
          <Button variant="outline" onClick={() => onDelete(item)} disabled={busy} aria-busy={busy || undefined}>
            {t("btn.delete")}
          </Button>
        </div>
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

  /* Snackbar */
  const [snack, setSnack] = useState<Snack>(null);

  /* ----------------------------- Modal state ------------------------------ */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  /* Confirm Toast */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  /* Overlay: added & deleted */
  const [added, setAdded] = useState<InventoryItem[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* Filter */
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  /* ----------------------------- Cursor pagination ------------------------ */
  const inflightRef = useRef(false);

  const fetchItemsPage = useCallback(
    async (cursor?: string) => {
      if (inflightRef.current) {
        return { items: [] as InventoryItem[], nextCursor: undefined as string | undefined };
      }

      inflightRef.current = true;
      try {
        const { data, meta } = await api.getInventoryItems({
          cursor,
          q: appliedQuery || undefined,
        });

        const items = (data?.results ?? []) as InventoryItem[];

        const nextUrl = meta?.pagination?.next ?? (data as unknown as { next?: string | null }).next ?? null;
        const nextCursor = nextUrl ? (getCursorFromUrl(nextUrl) || nextUrl) : undefined;

        return { items, nextCursor };
      } finally {
        inflightRef.current = false;
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

  /* ------------------------------ Overlay helpers ------------------------- */
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
    const addedFiltered = added
      .filter((i) => matchesQuery(i, appliedQuery))
      .slice()
      .sort(sortOverlayBySkuThenName);

    const addedIds = new Set(addedFiltered.map((i) => i.id));
    const base = pager.items.filter((i) => !deletedIds.has(i.id) && !addedIds.has(i.id));

    return [...addedFiltered, ...base];
  }, [added, deletedIds, pager.items, appliedQuery, matchesQuery]);

  /* ------------------------------ Handlers -------------------------------- */
  const openCreateModal = () => {
    setModalMode("create");
    setEditingItem(null);
    setModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setModalMode("edit");
    setEditingItem(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  const requestDeleteItem = (item: InventoryItem) => {
    const name = item.name ?? item.sku ?? "";

    setConfirmText(t("confirm.deleteTitle", { name }));
    setConfirmAction(() => async () => {
      setDeleteTargetId(item.id);

      try {
        setDeletedIds((prev) => new Set(prev).add(item.id));
        await api.deleteInventoryItem(item.id);

        await pager.refresh();
        setAdded((prev) => prev.filter((x) => x.id !== item.id));

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

  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  const canEdit = !!isOwner;
  const globalBusy = isBackgroundSync || confirmBusy || modalOpen;

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

                {isBackgroundSync && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-white/70 backdrop-blur-sm">
                    {t("badge.syncing")}
                  </span>
                )}
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

        <InventoryModal
          isOpen={modalOpen}
          mode={modalMode}
          item={editingItem}
          canEdit={canEdit}
          onClose={closeModal}
          onNotify={(s) => setSnack(s)}
          onSaved={async (res) => {
            try {
              if (res.mode === "create" && res.created) {
                setAdded((prev) => [res.created!, ...prev]);
              }
              await pager.refresh();
            } catch {
              setSnack({ message: t("errors.loadFailedTitle"), severity: "error" });
            }
          }}
        />
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
            .catch(() => setSnack({ message: t("errors.confirmFailed"), severity: "error" }))
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
