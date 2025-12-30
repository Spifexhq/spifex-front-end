/* -------------------------------------------------------------------------- */
/* File: src/pages/MemberSettings.tsx                                          */
/* Fixed: Removed double unwrapping - request() already returns ApiSuccess<T>  */
/* - No tabs                                                                   */
/* - Page owns: list fetch + delete confirm + snackbar                         */
/* - Modal owns: detail fetch + create/edit submit + validation                */
/* -------------------------------------------------------------------------- */

import React, { useEffect, useRef, useState, useCallback, startTransition } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import Button from "@/components/ui/Button";
import Snackbar from "@/components/ui/Snackbar";
import ConfirmToast from "@/components/ui/ConfirmToast";
import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";

import MemberModal from "./MemberModal";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";

import type { GroupListItem } from "@/models/auth/rbac";
import type { Member } from "@/models/auth/members";

/* ---------------------------- Snackbar type ------------------------------ */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ---------------------------- In-memory guards --------------------------- */
let INFLIGHT_FETCH = false;

const getInitials = () => "FN";

/* ----------------------------- UI: Row ----------------------------------- */
const Row = ({
  member,
  onEdit,
  onDelete,
  canEdit,
  t,
  busy,
}: {
  member: Member;
  onEdit: (e: Member) => void;
  onDelete: (e: Member) => void;
  canEdit: boolean;
  t: TFunction;
  busy?: boolean;
}) => (
  <div className={`flex items-center justify-between px-4 py-2.5 ${busy ? "opacity-70 pointer-events-none" : ""}`}>
    <div className="min-w-0">
      <p className="text-[13px] font-medium text-gray-900 truncate">{member.name}</p>
      <p className="text-[12px] text-gray-600 truncate">{member.email}</p>
    </div>
    {canEdit && (
      <div className="flex gap-2 shrink-0">
        <Button variant="outline" onClick={() => onEdit(member)} disabled={busy}>
          {t("btn.edit")}
        </Button>
        <Button
          variant="outline"
          onClick={() => onDelete(member)}
          disabled={busy}
          aria-busy={busy || undefined}
        >
          {t("btn.delete")}
        </Button>
      </div>
    )}
  </div>
);

/* ----------------------------- Component --------------------------------- */
const MemberSettings: React.FC = () => {
  const { t, i18n } = useTranslation("memberSettings");
  const { isOwner } = useAuthContext();

  useEffect(() => { document.title = t("title"); }, [t]);
  useEffect(() => { document.documentElement.lang = i18n.language; }, [i18n.language]);

  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<GroupListItem[]>([]);

  // Standard flags
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isBackgroundSync, setIsBackgroundSync] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Toast
  const [snack, setSnack] = useState<Snack>(null);

  // ConfirmToast
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  // Guards
  const fetchSeqRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* ----------------------------- Fetchers --------------------------------- */
  const normalizeAndSet = useCallback((memRes: Member[], grpRes: GroupListItem[]) => {
    const onlyMembers = memRes.filter((e) => e.role === "member");

    const normMembers = [...onlyMembers].sort((a, b) => {
      const an = (a.name || "").toLowerCase();
      const bn = (b.name || "").toLowerCase();
      if (an !== bn) return an.localeCompare(bn);
      return (a.email || "").toLowerCase().localeCompare((b.email || "").toLowerCase());
    });

    const normGroups = [...grpRes].sort((a, b) => (a.name || "").localeCompare(b.name || "", "en"));

    startTransition(() => {
      setMembers(normMembers);
      setGroups(normGroups);
    });
  }, []);

  const fetchList = useCallback(async (opts: { background?: boolean } = {}) => {
    if (INFLIGHT_FETCH) return;
    INFLIGHT_FETCH = true;
    const seq = ++fetchSeqRef.current;

    if (opts.background) setIsBackgroundSync(true);
    else setIsInitialLoading(true);

    try {
      const [memResp, grpResp] = await Promise.all([api.getMembers(), api.getGroups()]);
      if (seq !== fetchSeqRef.current || !mountedRef.current) return;

      const memList = memResp.data.members || [];
      const grpList = grpResp.data.results || [];

      normalizeAndSet(memList, grpList);
    } catch (err: unknown) {
      if (mountedRef.current) {
        console.error("Fetch members/groups failed", err);
        setSnack({ message: t("errors.fetchError"), severity: "error" });
      }
    } finally {
      if (mountedRef.current) {
        if (opts.background) setIsBackgroundSync(false);
        else setIsInitialLoading(false);
      }
      INFLIGHT_FETCH = false;
    }
  }, [normalizeAndSet, t]);

  useEffect(() => {
    void fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------ Handlers -------------------------------- */
  const openCreateModal = () => {
    setModalMode("create");
    setEditingMember(null);
    setModalOpen(true);
  };

  const openEditModal = (member: Member) => {
    setModalMode("edit");
    setEditingMember(member);
    setModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingMember(null);
  }, []);

  /* ---------- ConfirmToast delete ----------------- */
  const requestDeleteMember = (member: Member) => {
    setConfirmText(t("confirm.delete", { name: member.name }));
    setConfirmAction(() => async () => {
      setDeleteTargetId(member.id);

      try {
        await api.deleteMember(member.id);
        await fetchList({ background: true });
        setSnack({ message: t("toast.deleteOk"), severity: "info" });
      } catch (err: unknown) {
        console.error(err);
        setSnack({ message: t("errors.deleteError"), severity: "error" });
      } finally {
        setDeleteTargetId(null);
        setConfirmOpen(false);
        setConfirmBusy(false);
      }
    });

    setConfirmOpen(true);
  };

  /* ------------------------------ Render ---------------------------------- */
  if (isInitialLoading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  const canEdit = !!isOwner;
  const headerBadge = isBackgroundSync ? (
    <span
      aria-live="polite"
      className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-white/70 backdrop-blur-sm"
    >
      {t("badge.syncing")}
    </span>
  ) : null;

  const globalBusy = isBackgroundSync || confirmBusy;

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
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">
                    {t("header.settings")}
                  </div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                    {t("header.members")}
                  </h1>
                </div>
                {headerBadge}
              </div>
            </div>
          </header>

          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("section.list")}
                  </span>
                  {canEdit && (
                    <Button
                      onClick={openCreateModal}
                      className="!py-1.5"
                      disabled={globalBusy}
                    >
                      {t("btn.addMember")}
                    </Button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {members.length === 0 ? (
                  <p className="p-4 text-center text-sm text-gray-500">{t("empty")}</p>
                ) : (
                  members.map((m) => {
                    const rowBusy = globalBusy || deleteTargetId === m.id;
                    return (
                      <Row
                        key={m.id}
                        member={m}
                        canEdit={canEdit}
                        onEdit={openEditModal}
                        onDelete={requestDeleteMember}
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

        <MemberModal
          isOpen={modalOpen}
          mode={modalMode}
          member={editingMember}
          allGroups={groups}
          canEdit={canEdit}
          onClose={closeModal}
          onNotify={(s) => setSnack(s)}
          onSaved={async () => {
            await fetchList({ background: true });
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

export default MemberSettings;
