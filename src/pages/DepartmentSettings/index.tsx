/* --------------------------------------------------------------------------
 * File: src/pages/DepartmentSettings.tsx
 * - i18n: namespace "departmentSettings"
 * -------------------------------------------------------------------------- */

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Snackbar from "@/components/ui/Snackbar";
import ConfirmToast from "@/components/ui/ConfirmToast";
import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";
import PaginationArrows from "@/components/PaginationArrows/PaginationArrows";

import DepartmentModal from "./DepartmentModal";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { useCursorPager } from "@/hooks/useCursorPager";
import { getCursorFromUrl } from "@/lib/list";

import type { TFunction } from "i18next";
import type { Department } from "@/models/settings/departments";

/* ------------------------------ Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* --------------------------------- Helpers -------------------------------- */
function getInitials() {
  return "DP";
}

/**
 * IMPORTANT:
 * Cursor pagination relies on backend ordering.
 * Avoid re-sorting server pages on the client, or you risk perceived "jumps".
 * Only sort local overlay items if needed.
 */
function sortOverlayByCodeThenName(a: Department, b: Department) {
  const ca = (a.code || "").toString();
  const cb = (b.code || "").toString();
  if (ca && cb && ca !== cb) return ca.localeCompare(cb, "en", { numeric: true });
  return (a.name || "").localeCompare(b.name || "", "en");
}

/* Row without its own borders; container uses divide-y */
const Row = ({
  dept,
  onEdit,
  onDelete,
  canEdit,
  t,
  busy,
}: {
  dept: Department;
  onEdit: (d: Department) => void;
  onDelete: (d: Department) => void;
  canEdit: boolean;
  t: TFunction;
  busy?: boolean;
}) => (
  <div className={`flex items-center justify-between px-4 py-2.5 ${busy ? "opacity-70 pointer-events-none" : ""}`}>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-gray-600">
        {dept.code ? `${t("tags.code")}: ${dept.code}` : "—"}
        {dept.is_active === false ? ` • ${t("tags.inactive")}` : ""}
      </p>
      <p className="text-[13px] font-medium text-gray-900 truncate">{dept.name || t("tags.noName")}</p>
    </div>

    {canEdit && (
      <div className="flex gap-2 shrink-0">
        <Button variant="outline" onClick={() => onEdit(dept)} disabled={busy}>
          {t("buttons.edit")}
        </Button>
        <Button variant="outline" onClick={() => onDelete(dept)} disabled={busy} aria-busy={busy || undefined}>
          {t("buttons.delete")}
        </Button>
      </div>
    )}
  </div>
);

/* -------------------------------------------------------------------------- */

const DepartmentSettings: React.FC = () => {
  const { t, i18n } = useTranslation("departmentSettings");
  const { isOwner } = useAuthContext();

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  /* ------------------------------- Modal state ----------------------------- */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  /* Snackbar */
  const [snack, setSnack] = useState<Snack>(null);

  /* ConfirmToast */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  /* Standard flags */
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  /* Overlay dinâmico */
  const [added, setAdded] = useState<Department[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  /* ------------------------------- Filter state ---------------------------- */
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");

  /* --------------------------- Pagination (reusable) ----------------------- */
  const inflightRef = useRef(false);

  const fetchDepartmentsPage = useCallback(
    async (cursor?: string) => {
      if (inflightRef.current) {
        return { items: [] as Department[], nextCursor: undefined as string | undefined };
      }

      inflightRef.current = true;
      try {
        const { data, meta } = await api.getDepartments({
          cursor,
          q: appliedQuery || undefined,
        });

        const items = (data.results ?? []) as Department[];

        const nextUrl = meta?.pagination?.next ?? (data as unknown as { next?: string | null }).next ?? null;
        const nextCursor = nextUrl ? (getCursorFromUrl(nextUrl) || nextUrl) : undefined;

        return { items, nextCursor };
      } finally {
        inflightRef.current = false;
      }
    },
    [appliedQuery]
  );

  const pager = useCursorPager<Department>(fetchDepartmentsPage, {
    autoLoadFirst: true,
    deps: [appliedQuery],
  });

  const { refresh } = pager;

  const onSearch = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed === appliedQuery) refresh();
    else setAppliedQuery(trimmed);
  }, [query, appliedQuery, refresh]);

  /* ------------------------------ Overlay helpers -------------------------- */
  const matchesQuery = useCallback((d: Department, q: string) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (d.code || "").toLowerCase().includes(s) || (d.name || "").toLowerCase().includes(s);
  }, []);

  useEffect(() => {
    // keep overlay consistent with current query
    setAdded((prev) => prev.filter((d) => matchesQuery(d, appliedQuery)));
  }, [appliedQuery, matchesQuery]);

  const visibleItems = useMemo(() => {
    const addedFiltered = added
      .filter((d) => matchesQuery(d, appliedQuery))
      .slice()
      .sort(sortOverlayByCodeThenName);

    const addedIds = new Set(addedFiltered.map((d) => d.id));

    // pager.items is already server-ordered; do NOT sort it again
    const base = pager.items.filter((d) => !deletedIds.has(d.id) && !addedIds.has(d.id));

    return [...addedFiltered, ...base];
  }, [added, deletedIds, pager.items, appliedQuery, matchesQuery]);

  /* ------------------------------ Handlers --------------------------------- */
  const openCreateModal = () => {
    setModalMode("create");
    setEditingDept(null);
    setModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setModalMode("edit");
    setEditingDept(dept);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDept(null);
  };

  /* ---------- ConfirmToast delete ----------------------------------------- */
  const requestDeleteDepartment = (dept: Department) => {
    const name = dept.name ?? "";

    setConfirmText(t("confirm.deleteTitle", { name }));
    setConfirmAction(() => async () => {
      setDeleteTargetId(dept.id);

      try {
        setDeletedIds((prev) => new Set(prev).add(dept.id));
        await api.deleteDepartment(dept.id);

        await pager.refresh();
        setAdded((prev) => prev.filter((d) => d.id !== dept.id));

        setSnack({ message: t("toast.deleteOk"), severity: "info" });
      } catch (err) {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(dept.id);
          return next;
        });

        setSnack({
          message: err instanceof Error ? err.message : t("errors.deleteFailed"),
          severity: "error",
        });
      } finally {
        setDeleteTargetId(null);
        setConfirmOpen(false);
        setConfirmBusy(false);
      }
    });

    setConfirmOpen(true);
  };

  /* ------------------------------- Loading UI ------------------------------ */
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

  /* --------------------------------- UI ----------------------------------- */
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
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("card.settings")}</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{t("card.departments")}</h1>
              </div>
            </div>
          </header>

          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">{t("list.title")}</span>

                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                      placeholder={t("buttons.searchPlaceholder")}
                      aria-label={t("buttons.runSearchAria")}
                      disabled={globalBusy}
                    />
                    <Button onClick={onSearch} variant="outline" aria-label={t("buttons.runSearchAria")} disabled={globalBusy}>
                      {t("buttons.search")}
                    </Button>

                    {canEdit && (
                      <Button onClick={openCreateModal} className="!py-1.5" disabled={globalBusy}>
                        {t("buttons.add")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {pager.error ? (
                <div className="p-6 text-center">
                  <p className="text-[13px] font-medium text-red-700 mb-2">{t("errors.fetchError")}</p>
                  <p className="text-[11px] text-red-600 mb-4">{pager.error}</p>
                  <Button variant="outline" size="sm" onClick={pager.refresh} disabled={globalBusy}>
                    {t("buttons.tryAgain")}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {visibleItems.length === 0 ? (
                      <p className="p-4 text-center text-sm text-gray-500">{t("alerts.noData")}</p>
                    ) : (
                      visibleItems.map((d) => {
                        const rowBusy =
                          globalBusy ||
                          deleteTargetId === d.id ||
                          deletedIds.has(d.id);

                        return (
                          <Row
                            key={d.id}
                            dept={d}
                            canEdit={canEdit}
                            onEdit={openEditModal}
                            onDelete={requestDeleteDepartment}
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

        <DepartmentModal
          isOpen={modalOpen}
          mode={modalMode}
          department={editingDept}
          canEdit={canEdit}
          onClose={closeModal}
          onNotify={(s) => setSnack(s)}
          onSaved={async (res) => {
            try {
              if (res.mode === "create" && res.created) {
                setAdded((prev) => [res.created!, ...prev]);
              }
              await pager.refresh();
              // modal already notifies saveOk; keep this silent to avoid duplicate toasts
            } catch {
              setSnack({ message: t("errors.fetchError"), severity: "error" });
            }
          }}
        />
      </main>

      <ConfirmToast
        open={confirmOpen}
        text={confirmText}
        confirmLabel={t("buttons.delete")}
        cancelLabel={t("buttons.cancel")}
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

export default DepartmentSettings;
