/* --------------------------------------------------------------------------
 * File: src/pages/MemberSettings.tsx
 * Fixed: Removed double unwrapping - request() already returns ApiSuccess<T>
 * -------------------------------------------------------------------------- */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  startTransition,
} from "react";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Snackbar from "@/components/ui/Snackbar";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import ConfirmToast from "@/components/ui/ConfirmToast";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";
import Shimmer from "@/components/ui/Loaders/Shimmer";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { validatePassword } from "@/lib";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { GroupListItem } from "@/models/auth/rbac";
import type { Member } from "@/models/auth/members";

/* ---------------------------- Snackbar type ------------------------------ */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ---------------------------- Form template ------------------------------ */
const emptyForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  groups: [] as GroupListItem[],
};
type FormState = typeof emptyForm;

/* ---------------------------- In-memory guards --------------------------- */
let INFLIGHT_FETCH = false;

/* ------------------------------ Modal skeleton ---------------------------- */
const ModalSkeleton: React.FC = () => (
  <div className="py-1 grid grid-cols-2 gap-4">
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <div className="col-span-2">
      <Shimmer className="h-10 rounded-md" />
    </div>
    <div className="col-span-2 flex justify-end gap-3 pt-1">
      <Shimmer className="h-9 w-24 rounded-md" />
      <Shimmer className="h-9 w-28 rounded-md" />
    </div>
  </div>
);

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
  <div className="flex items-center justify-between px-4 py-2.5">
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
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isBackgroundSync, setIsBackgroundSync] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);

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
  const normalizeAndSet = useCallback((empRes: Member[], grpRes: GroupListItem[]) => {
    const onlyMembers = empRes.filter((e) => e.role === "member");

    const normMembers = [...onlyMembers].sort((a, b) => {
      const an = (a.name || "").toLowerCase();
      const bn = (b.name || "").toLowerCase();
      if (an !== bn) return an.localeCompare(bn);
      return (a.email || "").toLowerCase().localeCompare((b.email || "").toLowerCase());
    });

    const normGroups = [...grpRes].sort((a, b) => 
      (a.name || "").localeCompare(b.name || "", "en")
    );

    startTransition(() => {
      setMembers(normMembers);
      setGroups(normGroups);
    });
  }, []);

  const fetchList = useCallback(
    async (opts: { background?: boolean } = {}) => {
      if (INFLIGHT_FETCH) return;
      INFLIGHT_FETCH = true;
      const seq = ++fetchSeqRef.current;

      if (opts.background) setIsBackgroundSync(true);
      else setIsInitialLoading(true);

      try {
        const [empResp, grpResp] = await Promise.all([api.getMembers(), api.getGroups()]);
        if (seq !== fetchSeqRef.current || !mountedRef.current) return;

        // request() already unwraps data, so access .data.results directly
        const empList = empResp.data.members || [];
        const grpList = grpResp.data.results || [];
        
        normalizeAndSet(empList, grpList);
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
    },
    [normalizeAndSet, t]
  );

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------ Handlers -------------------------------- */
  const openCreateModal = () => {
    setModalMode("create");
    setEditingMember(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = async (member: Member) => {
    setModalMode("edit");
    setEditingMember(member);
    setFormData(emptyForm);
    setModalOpen(true);
    setIsDetailLoading(true);

    try {
      const res = await api.getMember(member.id);
      const detail = res.data.member;

      setFormData({
        name: detail.name,
        email: detail.email,
        password: "",
        confirmPassword: "",
        groups: (detail.groups as GroupListItem[]) || [],
      });
    } catch (error: unknown) {
      console.error(error);
      setSnack({ message: t("errors.loadMemberError"), severity: "error" });
      setModalOpen(false);
      setEditingMember(null);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingMember(null);
    setFormData(emptyForm);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const submitMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modalMode === "create") {
      if (formData.password !== formData.confirmPassword) {
        setSnack({ message: t("toast.passwordMismatch"), severity: "warning" });
        return;
      }
      const { isValid, message } = validatePassword(formData.password);
      if (!isValid) {
        setSnack({ message: message || t("toast.weakPassword"), severity: "warning" });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (modalMode === "create") {
        await api.addMember({
          name: formData.name,
          email: formData.email,
          password: formData.password || undefined,
          group_ids: formData.groups.map((g) => g.id),
        });
      } else if (editingMember) {
        await api.editMember(editingMember.id, {
          name: formData.name,
          email: formData.email,
          group_ids: formData.groups.map((g) => g.id),
        });
      }

      await fetchList();
      closeModal();
      setSnack({ message: t("toast.saveOk"), severity: "success" });
    } catch (err: unknown) {
      console.error(err);
      setSnack({ message: t("errors.saveError"), severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  /* ------------------------------ Esc / Scroll ---------------------------- */
  useEffect(() => {
    const handleKeyDown = (ev: KeyboardEvent) => ev.key === "Escape" && closeModal();
    if (modalOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, closeModal]);

  useEffect(() => {
    document.body.style.overflow = modalOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [modalOpen]);

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
                      disabled={isSubmitting || isBackgroundSync || confirmBusy}
                    >
                      {t("btn.addMember")}
                    </Button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {members.map((e) => {
                  const rowBusy =
                    isSubmitting ||
                    isDetailLoading ||
                    isBackgroundSync ||
                    confirmBusy ||
                    deleteTargetId === e.id;

                  return (
                    <Row
                      key={e.id}
                      member={e}
                      canEdit={canEdit}
                      onEdit={openEditModal}
                      onDelete={requestDeleteMember}
                      t={t}
                      busy={rowBusy}
                    />
                  );
                })}

                {members.length === 0 && !isBackgroundSync && (
                  <p className="p-4 text-center text-sm text-gray-500">
                    {t("empty")}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-lg max-h-[90vh]"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {modalMode === "create" ? t("modal.createTitle") : t("modal.editTitle")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeModal}
                  aria-label={t("modal.close")}
                  disabled={isSubmitting || isDetailLoading}
                >
                  &times;
                </button>
              </header>

              {modalMode === "edit" && isDetailLoading ? (
                <ModalSkeleton />
              ) : (
                <form className="grid grid-cols-2 gap-4" onSubmit={submitMember}>
                  <Input
                    label={t("field.name")}
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting || isDetailLoading}
                  />
                  <Input
                    label={t("field.email")}
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting || isDetailLoading}
                  />

                  {modalMode === "create" && (
                    <>
                      <Input
                        label={t("field.tempPassword")}
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        showTogglePassword
                        required
                        disabled={isSubmitting}
                      />
                      <Input
                        label={t("field.confirmPassword")}
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        showTogglePassword
                        required
                        disabled={isSubmitting}
                      />
                    </>
                  )}

                  <div className="col-span-2">
                    <div className={(isSubmitting || isDetailLoading) ? "pointer-events-none opacity-70" : ""}>
                      <SelectDropdown<GroupListItem>
                        label={t("field.groups")}
                        items={groups}
                        selected={formData.groups}
                        onChange={(items) => setFormData((p) => ({ ...p, groups: items }))}
                        getItemKey={(g) => g.id}
                        getItemLabel={(g) => g.name}
                        buttonLabel={t("btnLabel.groups")}
                        hideCheckboxes={false}
                        clearOnClickOutside={false}
                      />
                    </div>
                  </div>

                  <div className="col-span-2 flex justify-end gap-3 pt-1">
                    <Button
                      variant="cancel"
                      type="button"
                      onClick={closeModal}
                      disabled={isSubmitting || isDetailLoading}
                    >
                      {t("btn.cancel")}
                    </Button>
                    <Button type="submit" disabled={isSubmitting || isDetailLoading}>
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

export default MemberSettings;