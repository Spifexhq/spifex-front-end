/* ----------------------------------------------------------------------------- */
/* File: src/pages/BankSettings.tsx                                              */
/* - Currency: ALWAYS from auth org; fallback USD (never from bank/detail)       */
/* - Money rule: initial_balance is a MAJOR decimal string "1234.56" (API-ready) */
/* - i18n: namespace "bankSettings"                                              */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";
import Button from "@/components/ui/Button";
import Snackbar from "@/components/ui/Snackbar";
import ConfirmToast from "@/components/ui/ConfirmToast";

import BankModal from "./BankModal";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";

import type { BankAccount } from "@/models/settings/banking";

/* ----------------------------- Helpers ------------------------------------ */

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

function getInitials() {
  return "BK";
}

function safeCurrency(raw: unknown) {
  const v = String(raw ?? "").trim().toUpperCase();
  return v || "USD";
}

/* --------------------------------- Row UI -------------------------------- */

const Row = React.memo(function Row({
  bank,
  onEdit,
  onDelete,
  canEdit,
  t,
  busy,
}: {
  bank: BankAccount;
  onEdit: (b: BankAccount) => void;
  onDelete: (b: BankAccount) => void;
  canEdit: boolean;
  t: TFunction;
  busy?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 ${busy ? "opacity-70 pointer-events-none" : ""}`}
      aria-busy={busy || undefined}
    >
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-gray-900 truncate">{bank.institution}</p>
        <p className="text-[12px] text-gray-600 truncate">
          {bank.branch} / {bank.account_number}
        </p>
      </div>

      {canEdit && (
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => onEdit(bank)} disabled={busy}>
            {t("btn.edit")}
          </Button>
          <Button variant="outline" onClick={() => onDelete(bank)} disabled={busy}>
            {t("btn.delete")}
          </Button>
        </div>
      )}
    </div>
  );
});

/* ---------------------------------- Page --------------------------------- */

const BankSettings: React.FC = () => {
  const { t, i18n } = useTranslation("bankSettings");
  const { organization: authOrg, isOwner } = useAuthContext();

  const orgCurrency = useMemo(() => safeCurrency(authOrg?.organization?.currency), [authOrg]);

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  /* ------------------------------ Flags/State ------------------------------ */
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isBackgroundSync, setIsBackgroundSync] = useState(false);

  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [snack, setSnack] = useState<Snack>(null);

  // optimistic overlay
  const [added, setAdded] = useState<BankAccount[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());

  // delete confirm
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<BankAccount | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);

  const busyGlobal = isBackgroundSync || confirmBusy;

  /* ------------------------------- Fetch list ------------------------------ */
  const fetchLockRef = useRef(false);

  const fetchBanks = useCallback(
    async (opts: { background?: boolean } = {}) => {
      if (fetchLockRef.current) return;
      fetchLockRef.current = true;

      if (opts.background) setIsBackgroundSync(true);
      else setIsInitialLoading(true);

      try {
        const { data } = await api.getBanks();
        const list: BankAccount[] = data?.results ?? [];
        list.sort((a, b) => (a.institution || "").localeCompare(b.institution || ""));
        setBanks(list);
      } catch {
        setSnack({ message: t("errors.fetchError"), severity: "error" });
      } finally {
        if (opts.background) setIsBackgroundSync(false);
        else setIsInitialLoading(false);
        fetchLockRef.current = false;
      }
    },
    [t]
  );

  useEffect(() => {
    void fetchBanks();
  }, [fetchBanks]);

  /* ---------------------------- Visible (overlay) -------------------------- */
  const visibleBanks = useMemo(() => {
    const addedIds = new Set(added.map((b) => b.id));
    const base = banks.filter((b) => !deletedIds.has(b.id) && !addedIds.has(b.id));
    return [...added, ...base];
  }, [banks, added, deletedIds]);

  /* -------------------------------- Handlers ------------------------------- */
  const openCreateModal = useCallback(() => {
    setModalMode("create");
    setEditingBank(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((bank: BankAccount) => {
    setModalMode("edit");
    setEditingBank(bank);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingBank(null);
  }, []);

  /* ----------------------- Delete with ConfirmToast ------------------------ */
  const requestDeleteBank = useCallback((bank: BankAccount) => {
    setDeleteCandidate(bank);
  }, []);

  const confirmText = useMemo(() => {
    if (!deleteCandidate) return "";
    return t("confirm.delete", { name: deleteCandidate.institution });
  }, [deleteCandidate, t]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteCandidate || confirmBusy) return;

    const bank = deleteCandidate;
    setConfirmBusy(true);
    setDeleteTargetId(bank.id);

    setDeletedIds((prev) => new Set(prev).add(bank.id));

    try {
      await api.deleteBank(bank.id);
      await fetchBanks({ background: true });
      setAdded((prev) => prev.filter((b) => b.id !== bank.id));
      setSnack({ message: t("toast.deleteOk"), severity: "info" });
      setDeleteCandidate(null);
    } catch {
      setDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(bank.id);
        return next;
      });
      setSnack({ message: t("errors.deleteError"), severity: "error" });
    } finally {
      setDeleteTargetId(null);
      setConfirmBusy(false);
    }
  }, [confirmBusy, deleteCandidate, fetchBanks, t]);

  /* --------------------------------- Render -------------------------------- */
  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  const headerBadge = isBackgroundSync ? (
    <span
      aria-live="polite"
      className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-white/70 backdrop-blur-sm"
    >
      {t("badge.syncing")}
    </span>
  ) : null;

  const canEdit = !!isOwner;
  const globalBusy = busyGlobal || modalOpen;

  return (
    <>
      <TopProgress active={isBackgroundSync || confirmBusy} variant="top" topOffset={64} />

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
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{t("header.title")}</h1>
                </div>
                {headerBadge}
              </div>
            </div>
          </header>

          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">{t("section.list")}</span>
                  {canEdit && (
                    <Button onClick={openCreateModal} className="!py-1.5" disabled={globalBusy}>
                      {t("btn.addBank")}
                    </Button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {visibleBanks.length === 0 ? (
                  <p className="p-4 text-center text-sm text-gray-500">{t("empty")}</p>
                ) : (
                  visibleBanks.map((b) => {
                    const rowBusy = globalBusy || deleteTargetId === b.id || deletedIds.has(b.id);
                    return (
                      <Row
                        key={b.id}
                        bank={b}
                        canEdit={canEdit}
                        onEdit={openEditModal}
                        onDelete={requestDeleteBank}
                        t={t}
                        busy={rowBusy}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </div>

        <BankModal
          isOpen={modalOpen}
          mode={modalMode}
          bank={editingBank}
          orgCurrency={orgCurrency}
          canEdit={canEdit}
          onClose={closeModal}
          onNotify={(s) => setSnack(s)}
          onSaved={async (res) => {
            try {
              if (res.mode === "create" && res.created) {
                setAdded((prev) => [res.created!, ...prev]);
              }
              await fetchBanks({ background: true });
            } catch {
              setSnack({ message: t("errors.fetchError"), severity: "error" });
            }
          }}
        />
      </main>

      <ConfirmToast
        open={!!deleteCandidate}
        text={confirmText}
        confirmLabel={t("confirm.confirmLabel")}
        cancelLabel={t("confirm.cancelLabel")}
        variant="danger"
        busy={confirmBusy}
        onCancel={() => {
          if (confirmBusy) return;
          setDeleteCandidate(null);
        }}
        onConfirm={handleConfirmDelete}
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

export default BankSettings;
