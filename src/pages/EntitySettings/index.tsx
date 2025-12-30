/* -------------------------------------------------------------------------- */
/* File: src/pages/EntitySettings.tsx                                          */
/* Refactor: modal extracted (EntityModal) + simplified create/edit flows      */
/* i18n: namespace "entitySettings"                                            */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Snackbar from "@/components/ui/Snackbar";
import ConfirmToast from "@/components/ui/ConfirmToast";
import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";
import PaginationArrows from "@/components/PaginationArrows/PaginationArrows";

import EntityModal from "./EntityModal";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";

import type { Entity } from "@/models/settings/entities";

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type EntityTypeValue = "client" | "supplier" | "employee";

function sortByName(a: Entity, b: Entity) {
  const an = (a.full_name || "").trim();
  const bn = (b.full_name || "").trim();
  return an.localeCompare(bn, "pt-BR");
}

function getInitials() {
  return "EN";
}

const Row: React.FC<{
  entity: Entity;
  onEdit: (e: Entity) => void;
  onDelete: (e: Entity) => void;
  canEdit: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
  busy?: boolean;
}> = ({ entity, onEdit, onDelete, canEdit, t, busy }) => {
  const type = (entity.entity_type || "client") as EntityTypeValue;
  const typeLabel = t(`types.${type}`);

  return (
    <div className={`flex items-center justify-between px-4 py-2.5 ${busy ? "opacity-70 pointer-events-none" : ""}`}>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-gray-600">
          {typeLabel}
          {entity.is_active === false ? ` ${t("row.inactive")}` : ""}
        </p>
        <p className="text-[13px] font-medium text-gray-900 truncate">
          {entity.full_name || t("row.untitled")}
        </p>
      </div>

      {canEdit && (
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => onEdit(entity)} disabled={busy}>
            {t("btn.edit")}
          </Button>
          <Button variant="outline" onClick={() => onDelete(entity)} disabled={busy} aria-busy={busy || undefined}>
            {t("btn.delete")}
          </Button>
        </div>
      )}
    </div>
  );
};

const EntitySettings: React.FC = () => {
  const { t, i18n } = useTranslation("entitySettings");

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const { isOwner } = useAuthContext();

  /* ------------------------------ Snackbar ------------------------------ */
  const [snack, setSnack] = useState<Snack>(null);

  /* ------------------------------ Confirm delete ------------------------------ */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  /* ------------------------------ Deletion optimistic UI ------------------------------ */
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ------------------------------ Added overlay ------------------------------ */
  const [added, setAdded] = useState<Entity[]>([]);

  /* ------------------------------ Filter ------------------------------ */
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  const matchesQuery = useCallback((e: Entity, q: string) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (e.full_name || "").toLowerCase().includes(s) || (e.alias_name || "").toLowerCase().includes(s);
  }, []);

  /* ------------------------------ Pager ------------------------------ */
  const inflightRef = useRef(false);

  const fetchEntitiesPage = useCallback(
    async (cursor?: string) => {
      if (inflightRef.current) return { items: [] as Entity[], nextCursor: undefined as string | undefined };
      inflightRef.current = true;

      try {
        const { data, meta } = await api.getEntitiesTable({
          cursor,
          q: appliedQuery || undefined,
        });

        const items = ((data?.results ?? []) as Entity[]).slice().sort(sortByName);
        const nextUrl = meta?.pagination?.next ?? data?.next ?? null;
        const nextCursor = nextUrl ? getCursorFromUrl(nextUrl) || nextUrl : undefined;

        return { items, nextCursor };
      } finally {
        inflightRef.current = false;
      }
    },
    [appliedQuery]
  );

  const pager = useCursorPager<Entity>(fetchEntitiesPage, {
    autoLoadFirst: true,
    deps: [appliedQuery],
  });

  const onSearch = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed === appliedQuery) pager.refresh();
    else setAppliedQuery(trimmed);
  }, [query, appliedQuery, pager]);

  const visibleItems = useMemo(() => {
    const addedFiltered = added.filter((e) => !deletedIds.has(e.id) && matchesQuery(e, appliedQuery)).slice().sort(sortByName);
    const addedIds = new Set(addedFiltered.map((e) => e.id));

    const base = pager.items
      .filter((e) => !deletedIds.has(e.id) && !addedIds.has(e.id))
      .slice()
      .sort(sortByName);

    return [...addedFiltered, ...base];
  }, [added, deletedIds, pager.items, appliedQuery, matchesQuery]);

  /* ------------------------------ Modal state ------------------------------ */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  const openCreateModal = useCallback(() => {
    setModalMode("create");
    setEditingEntity(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((entity: Entity) => {
    setModalMode("edit");
    setEditingEntity(entity);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingEntity(null);
  }, []);

  /* ------------------------------ Delete flow ------------------------------ */
  const requestDeleteEntity = useCallback(
    (entity: Entity) => {
      const name = entity.full_name ?? "";
      setDeleteTargetId(entity.id);

      setConfirmText(t("confirm.deleteTitle", { name }));
      setConfirmAction(() => async () => {
        try {
          setDeletedIds((prev) => {
            const next = new Set(prev);
            next.add(entity.id);
            return next;
          });

          await api.deleteEntity(entity.id);
          await pager.refresh();

          setAdded((prev) => prev.filter((e) => e.id !== entity.id));
          setSnack({ message: t("toast.deleteOk"), severity: "info" });
        } catch (err) {
          setDeletedIds((prev) => {
            const next = new Set(prev);
            next.delete(entity.id);
            return next;
          });

          setSnack({
            message: err instanceof Error ? err.message : t("errors.deleteError"),
            severity: "error",
          });
        } finally {
          setConfirmOpen(false);
          setConfirmBusy(false);
          setDeleteTargetId(null);
        }
      });

      setConfirmOpen(true);
    },
    [pager, t]
  );

  /* ------------------------------ Loading UI ------------------------------ */
  const isInitialLoading = pager.loading && pager.items.length === 0;
  const isBackgroundSync = pager.loading && pager.items.length > 0;

  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

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
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.settings")}</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{t("header.entities")}</h1>
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

                    {isOwner && (
                      <Button onClick={openCreateModal} className="!py-1.5" disabled={globalBusy}>
                        {t("btn.add")}
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
                      visibleItems.map((e) => (
                        <Row
                          key={e.id}
                          entity={e}
                          canEdit={!!isOwner}
                          onEdit={openEditModal}
                          onDelete={requestDeleteEntity}
                          t={t}
                          busy={globalBusy || deleteTargetId === e.id || deletedIds.has(e.id)}
                        />
                      ))
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

        <EntityModal
          isOpen={modalOpen}
          mode={modalMode}
          entity={editingEntity}
          onClose={closeModal}
          canEdit={!!isOwner}
          onNotify={setSnack}
          onSaved={async ({ mode, created }) => {
            if (mode === "create" && created) {
              setAdded((prev) => [created, ...prev]);
            }
            await pager.refresh();
          }}
        />
      </main>

      <ConfirmToast
        open={confirmOpen}
        text={confirmText}
        confirmLabel={t("btn.confirmDelete")}
        cancelLabel={t("btn.cancel")}
        variant="danger"
        onCancel={() => {
          if (confirmBusy) return;
          setConfirmOpen(false);
          setDeleteTargetId(null);
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

export default EntitySettings;
