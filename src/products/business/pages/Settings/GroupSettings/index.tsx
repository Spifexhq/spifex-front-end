import { apiErrorMessage } from "@/lib/apiErrorMessage";
/* -------------------------------------------------------------------------- */
/* File: src/pages/Settings/GroupSettings/index.tsx                                    */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { PageSkeletonShell } from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import Snackbar from "@/shared/ui/Snackbar";
import Badge from "@/shared/ui/Badge";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import { EmptyState } from "@/shared/ui/State";
import { AnimatePresence, motion } from "framer-motion";
import { Pencil, ShieldCheck, Users, X } from "lucide-react";

import GroupPermissionsTable from "./GroupPermissionsTable";
import GroupModal from "./GroupModal";

import { api } from "@/core/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { PermissionMiddleware } from "src/middlewares";

import type { AddGroupRequest, GroupDetail, GroupListItem, Permission } from "@/models/auth/rbac";

/* ------------------------------ Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type ModalState =
  | { open: false; mode: "create" | "rename"; initialName: string }
  | { open: true; mode: "create" | "rename"; initialName: string };

/* --------------------------- Page Component -------------------------------- */
const GroupSettings: React.FC = () => {
  const { t, i18n } = useTranslation("groupSettings");
  const { isOwner, permissions } = useAuthContext();

  const canViewGroups = useMemo(() => {
    if (isOwner) return true;
    return permissions.includes("view_group");
  }, [isOwner, permissions]);

  const canViewPermissions = useMemo(() => {
    if (isOwner) return true;
    return permissions.includes("view_permission");
  }, [isOwner, permissions]);

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isBackgroundSync, setIsBackgroundSync] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [snack, setSnack] = useState<Snack>(null);

  const [groups, setGroups] = useState<GroupListItem[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroupDetail, setSelectedGroupDetail] = useState<GroupDetail | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set<string>());
  const [originalCodes, setOriginalCodes] = useState<Set<string>>(new Set<string>());

  const [groupSearch, setGroupSearch] = useState("");

  const [modal, setModal] = useState<ModalState>({ open: false, mode: "create", initialName: "" });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  const busy = isSubmitting || isDetailLoading || isBackgroundSync || confirmBusy;

  const inflightRef = useRef(false);

  const fetchAll = useCallback(
    async (opts: { background?: boolean } = {}) => {
      if (!canViewGroups) {
        setGroups([]);
        setSelectedGroupId(null);
        setSelectedGroupDetail(null);
        setSelectedCodes(new Set<string>());
        setOriginalCodes(new Set<string>());

        if (opts.background) setIsBackgroundSync(false);
        else setIsInitialLoading(false);

        return;
      }

      if (inflightRef.current) return;
      inflightRef.current = true;

      if (opts.background) setIsBackgroundSync(true);
      else setIsInitialLoading(true);

      try {
        const response = await api.getGroups();
        const groupList = response.data.results || [];
        setGroups([...groupList].sort((a, b) => (a.name || "").localeCompare(b.name || "", "en")));
      } catch (error) {
        console.error(error);
        setSnack({ message: apiErrorMessage(error, t("toast.loadAllError")), severity: "error" });
      } finally {
        if (opts.background) setIsBackgroundSync(false);
        else setIsInitialLoading(false);
        inflightRef.current = false;
      }
    },
    [t, canViewGroups]
  );

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!canViewGroups || !selectedGroupId) {
      setSelectedGroupDetail(null);
      setSelectedCodes(new Set<string>());
      setOriginalCodes(new Set<string>());
      return;
    }

    const load = async () => {
      setIsDetailLoading(true);

      try {
        const detailRes = await api.getGroup(selectedGroupId);
        const detail = detailRes.data;
        setSelectedGroupDetail({ ...detail, permissions: detail.permissions ?? [] });

        if (canViewPermissions) {
          const permRes = await api.getGroupPermissions(selectedGroupId);
          const perms = permRes.data.permissions || [];
          const activeCodes = new Set<string>(perms.map((p: Permission) => p.code));
          setSelectedCodes(activeCodes);
          setOriginalCodes(new Set<string>(activeCodes));
        } else {
          setSelectedCodes(new Set<string>());
          setOriginalCodes(new Set<string>());
        }
      } catch (error) {
        console.error(error);
        setSnack({ message: apiErrorMessage(error, t("toast.detailError")), severity: "error" });
      } finally {
        setIsDetailLoading(false);
      }
    };

    void load();
  }, [selectedGroupId, t, canViewGroups, canViewPermissions]);

  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return groups;
    const query = groupSearch.trim().toLowerCase();
    return groups.filter((group) => (group.name || "").toLowerCase().includes(query));
  }, [groups, groupSearch]);

  const dirty = useMemo(() => {
    if (originalCodes.size !== selectedCodes.size) return true;
    for (const code of selectedCodes) {
      if (!originalCodes.has(code)) return true;
    }
    return false;
  }, [originalCodes, selectedCodes]);

  const setPermissionChecked = (code: string, enabled: boolean) => {
    setSelectedCodes((prev) => {
      const next = new Set<string>(prev);
      if (enabled) next.add(code);
      else next.delete(code);
      return next;
    });
  };

  const openCreateModal = () => {
    setModal({ open: true, mode: "create", initialName: "" });
  };

  const openRenameModal = () => {
    if (!selectedGroupDetail) return;
    setModal({ open: true, mode: "rename", initialName: selectedGroupDetail.name || "" });
  };

  const closeModal = () => {
    if (busy) return;
    setModal((prev) => ({ ...prev, open: false }));
  };

  const handleCreateGroup = async (name: string) => {
    setIsSubmitting(true);

    try {
      const payload: AddGroupRequest = { name, permission_codes: [] };
      const response = await api.addGroup(payload);
      const created = response.data;

      await fetchAll({ background: true });
      setSelectedGroupId(created.id);

      setSnack({ message: t("toast.createSuccess"), severity: "success" });
    } catch (error) {
      console.error(error);
      setSnack({ message: apiErrorMessage(error, t("toast.createError")), severity: "error" });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRenameGroup = async (name: string) => {
    if (!selectedGroupDetail) return;

    setIsSubmitting(true);

    try {
      await api.editGroup(selectedGroupDetail.id, { name });

      await fetchAll({ background: true });
      setSelectedGroupDetail((prev) => (prev ? { ...prev, name } : prev));

      setSnack({ message: t("toast.renameSuccess"), severity: "success" });
    } catch (error) {
      console.error(error);
      setSnack({ message: apiErrorMessage(error, t("toast.renameError")), severity: "error" });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteGroup = () => {
    if (!selectedGroupDetail) return;

    setConfirmText(t("confirm.deleteText", { name: selectedGroupDetail.name }));
    setConfirmAction(() => async () => {
      try {
        await api.deleteGroup(selectedGroupDetail.id);
        await fetchAll({ background: true });
        setSelectedGroupId(null);
        setSnack({ message: t("toast.deleteSuccess"), severity: "info" });
      } catch (error) {
        console.error(error);
        setSnack({ message: apiErrorMessage(error, t("toast.deleteError")), severity: "error" });
      } finally {
        setConfirmOpen(false);
        setConfirmBusy(false);
      }
    });

    setConfirmOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedGroupDetail) return;

    setIsSubmitting(true);

    try {
      await api.updateGroupPermissions(selectedGroupDetail.id, Array.from(selectedCodes));

      setOriginalCodes(new Set<string>(selectedCodes));

      await fetchAll({ background: true });
      const response = await api.getGroup(selectedGroupDetail.id);
      setSelectedGroupDetail(response.data);

      setSnack({ message: t("toast.saveSuccess"), severity: "success" });
    } catch (error) {
      console.error(error);
      setSnack({ message: apiErrorMessage(error, t("toast.saveError")), severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    setSelectedCodes(new Set<string>(originalCodes));
  };

  if (isInitialLoading) {
    return (
      <>
        <PageSkeletonShell variant="groups" rows={6} />
      </>
    );
  }

  const headerBadge = isBackgroundSync ? (
    <Badge
      aria-live="polite"
      tone="neutral"
      variant="outline"
      size="md"
      className="backdrop-blur-sm"
    >
      {t("badge.syncing")}
    </Badge>
  ) : null;

  return (
    <>
      <TopProgress active={isBackgroundSync || isSubmitting} variant="top" />

      <main className="min-w-0 px-4 pb-10 pt-6 sm:px-7">
        <div className="mx-auto w-full max-w-[1440px] space-y-5">
          {headerBadge && <div className="flex flex-wrap items-center justify-end gap-3">{headerBadge}</div>}

          <PermissionMiddleware codeName={"view_group"} behavior="lock">
            <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
              <Card as="aside" padding="none" radius="lg" className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white p-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">{t("left.groups")}</h2>
                    <p className="text-[11px] text-gray-500">{filteredGroups.length} {t("left.results", "groups")}</p>
                  </div>
                  <PermissionMiddleware codeName={"add_group"}>
                    <Button className="!px-3 !py-1.5" onClick={openCreateModal} disabled={busy}>{t("left.create")}</Button>
                  </PermissionMiddleware>
                </div>
                <div className="border-b border-gray-200 p-3">
                  <Input kind="text" size="sm" placeholder={t("left.searchPlaceholder")} name="groupSearch" value={groupSearch} onChange={(e) => setGroupSearch(e.target.value)} disabled={busy} />
                </div>
                <div className="max-h-56 space-y-1 overflow-y-auto p-2 sm:max-h-[60dvh]">
                  {filteredGroups.map((group) => <button key={group.id} type="button" aria-pressed={selectedGroupId === group.id} disabled={busy} onClick={() => !busy && setSelectedGroupId((prev) => (prev === group.id ? null : group.id))} className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors disabled:opacity-70 ${selectedGroupId === group.id ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-gray-50"}`}>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${selectedGroupId === group.id ? "border-slate-300 bg-white text-slate-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}><Users size={15} aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">{group.name}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-gray-500">{t("left.meta", { perms: group.permissions_count, members: group.members_count })}</span>
                    </span>
                  </button>)}
                  {filteredGroups.length === 0 && <EmptyState size="sm" title={t("left.empty")} />}
                </div>
              </Card>

              <div className="min-w-0">
                <AnimatePresence mode="wait" initial={false}>
                  {!selectedGroupDetail ? <motion.div key="empty" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                    <Card padding="default" radius="lg"><EmptyState size="sm" icon={<ShieldCheck size={22} />} title={t("right.selectPrompt")} /></Card>
                  </motion.div> : <motion.div key={selectedGroupDetail.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                    <Card padding="none" radius="lg" className="overflow-hidden">
                      <div className="flex flex-col gap-3 border-b border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600"><ShieldCheck size={17} aria-hidden="true" /></span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{t("right.nameLabel")}</p>
                            <h2 className="truncate text-base font-semibold text-gray-900">{selectedGroupDetail.name}</h2>
                            <p className="mt-0.5 text-xs text-gray-500">{selectedGroupDetail.permissions?.length ?? 0} {t("right.permissions", "permissions")}{selectedGroupDetail.is_system ? ` · ${t("right.system", "system group")}` : ""}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <PermissionMiddleware codeName={"change_group"}>
                            <Button variant="outline" className="inline-flex items-center gap-2" onClick={openRenameModal} disabled={busy}><Pencil size={15} aria-hidden="true" />{t("right.rename")}</Button>
                          </PermissionMiddleware>
                          {!selectedGroupDetail.is_system && <PermissionMiddleware codeName={"delete_group"}>
                            <Button variant="outline" onClick={requestDeleteGroup} disabled={busy} aria-busy={busy || undefined}>{t("right.delete")}</Button>
                          </PermissionMiddleware>}
                          <button type="button" aria-label={t("right.closePanel")} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50" onClick={() => setSelectedGroupId(null)} disabled={busy}><X size={16} aria-hidden="true" /></button>
                        </div>
                      </div>
                      <PermissionMiddleware codeName={["view_permission", "view_group"]} requireAll>
                        <GroupPermissionsTable selectedCodes={selectedCodes} disabled={busy} dirty={dirty} onToggle={setPermissionChecked} onUndo={handleDiscard} onSave={handleSavePermissions} />
                      </PermissionMiddleware>
                    </Card>
                  </motion.div>}
                </AnimatePresence>
              </div>
            </div>
          </PermissionMiddleware>

          <PermissionMiddleware codeName={["add_group", "change_group"]}>
            <GroupModal isOpen={modal.open} mode={modal.mode} initialName={modal.initialName} busy={busy} onClose={closeModal} onSubmit={async (name) => {
              if (modal.mode === "create") return handleCreateGroup(name);
              return handleRenameGroup(name);
            }} />
          </PermissionMiddleware>
        </div>
      </main>

      <ConfirmToast
        open={confirmOpen}
        text={confirmText}
        confirmLabel={t("confirm.confirmLabel")}
        cancelLabel={t("confirm.cancelLabel")}
        variant="danger"
        onCancel={() => {
          if (confirmBusy) return;
          setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (confirmBusy || !confirmAction) return;

          setConfirmBusy(true);

          confirmAction()
            .catch((error) => {
              console.error(error);
              setSnack({ message: t("confirm.fail"), severity: "error" });
            })
            .finally(() => setConfirmBusy(false));
        }}
        busy={confirmBusy}
      />

      <Snackbar
        notificationKey={snack}
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={4000}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </>
  );
};

export default GroupSettings;