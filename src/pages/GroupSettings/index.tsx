/* --------------------------------------------------------------------------
 * File: src/pages/GroupSettings/index.tsx
 * Fixed: Removed double unwrapping - request() already returns ApiSuccess<T>
 * -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useState } from "react";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";

import Input from "src/components/ui/Input";
import Button from "src/components/ui/Button";
import Snackbar from "src/components/ui/Snackbar";
import ConfirmToast from "src/components/ui/ConfirmToast";

import { api } from "src/api/requests";
import { useAuthContext } from "src/hooks/useAuth";

import type { Permission } from "src/models/auth/domain/Permission";
import type { GroupDetail, GroupListItem } from "src/models/auth/domain/Group";
import type { AddGroupRequest } from "src/models/auth/dto/GetGroup";
import { useTranslation } from "react-i18next";

import GroupPermissionsTable from "./GroupPermissionsTable";

/* ------------------------------ Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ------------------------------ INFLIGHT guard ---------------------------- */
let INFLIGHT_FETCH = false;

/* --------------------------- Page Component -------------------------------- */
const GroupSettings: React.FC = () => {
  const { t, i18n } = useTranslation("groupSettings");
  useEffect(() => {
    document.title = t("title");
  }, [t]);
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const { isOwner } = useAuthContext();

  // Flags (standardized)
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isBackgroundSync, setIsBackgroundSync] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Snackbar
  const [snack, setSnack] = useState<Snack>(null);

  // Data
  const [groups, setGroups] = useState<GroupListItem[]>([]);

  // Selection & edits
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null); // external_id
  const [selectedGroupDetail, setSelectedGroupDetail] = useState<GroupDetail | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set<string>());
  const [originalCodes, setOriginalCodes] = useState<Set<string>>(new Set<string>());

  // Group search
  const [groupSearch, setGroupSearch] = useState("");

  // Create group modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // Rename group modal
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Confirm Toast
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  const busy = isSubmitting || isDetailLoading || isBackgroundSync || confirmBusy;

  /* ----------------------------- Bootstrap -------------------------------- */
  const fetchAll = useCallback(
    async (opts: { background?: boolean } = {}) => {
      if (INFLIGHT_FETCH) return;
      INFLIGHT_FETCH = true;

      if (opts.background) setIsBackgroundSync(true);
      else setIsInitialLoading(true);

      try {
        const response = await api.getGroups();
        const groupList = response.data.results || [];
        setGroups([...groupList].sort((a, b) => (a.name || "").localeCompare(b.name || "", "en")));
      } catch (e) {
        console.error(e);
        setSnack({
          message: t("toast.loadAllError"),
          severity: "error",
        });
      } finally {
        if (opts.background) setIsBackgroundSync(false);
        else setIsInitialLoading(false);
        INFLIGHT_FETCH = false;
      }
    },
    [t]
  );

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  /* ------------------------- Load group detail/permissions ----------------- */
  useEffect(() => {
    if (!selectedGroupId) {
      setSelectedGroupDetail(null);
      setSelectedCodes(new Set<string>());
      setOriginalCodes(new Set<string>());
      return;
    }
    const load = async () => {
      setIsDetailLoading(true);
      try {
        const [detailRes, permRes] = await Promise.all([
          api.getGroup(selectedGroupId),
          api.getGroupPermissions(selectedGroupId),
        ]);
        
        const detail = detailRes.data;
        setSelectedGroupDetail(detail);

        const perms = permRes.data.permissions || [];
        
        const activeCodes = new Set<string>(perms.map((p: Permission) => p.code));
        setSelectedCodes(activeCodes);
        setOriginalCodes(new Set<string>(activeCodes));
      } catch (e) {
        console.error(e);
        setSnack({
          message: t("toast.detailError"),
          severity: "error",
        });
      } finally {
        setIsDetailLoading(false);
      }
    };
    void load();
  }, [selectedGroupId, t]);

  /* ------------------------------- Derived -------------------------------- */
  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return groups;
    const q = groupSearch.trim().toLowerCase();
    return groups.filter((g) => (g.name || "").toLowerCase().includes(q));
  }, [groups, groupSearch]);

  const dirty = useMemo(() => {
    if (originalCodes.size !== selectedCodes.size) return true;
    for (const c of selectedCodes) {
      if (!originalCodes.has(c)) return true;
    }
    return false;
  }, [originalCodes, selectedCodes]);

  /* ----------------------------- Actions ---------------------------------- */
  const setPermissionChecked = (code: string, enabled: boolean) => {
    setSelectedCodes((prev) => {
      const next = new Set<string>(prev);
      if (enabled) next.add(code);
      else next.delete(code);
      return next;
    });
  };

  const openCreateModal = () => {
    setNewGroupName("");
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (busy) return;
    setCreateModalOpen(false);
    setNewGroupName("");
  };

  const handleCreateGroup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const name = newGroupName.trim();
    if (!name) {
      setSnack({
        message: t("toast.createNameRequired"),
        severity: "warning",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: AddGroupRequest = { name, permission_codes: [] };
      const res = await api.addGroup(payload);
      const created = res.data;
      setNewGroupName("");
      await fetchAll({ background: true });
      setSelectedGroupId(created.external_id);
      setSnack({
        message: t("toast.createSuccess"),
        severity: "success",
      });
      setCreateModalOpen(false);
    } catch (e) {
      console.error(e);
      setSnack({
        message: t("toast.createError"),
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRenameModal = () => {
    if (!selectedGroupDetail) return;
    setRenameValue(selectedGroupDetail.name || "");
    setRenameModalOpen(true);
  };

  const closeRenameModal = () => {
    if (busy) return;
    setRenameModalOpen(false);
    setRenameValue("");
  };

  const handleRenameSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedGroupDetail) return;

    const name = renameValue.trim();
    if (!name) {
      setSnack({
        message: t("toast.renameEmpty"),
        severity: "warning",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.editGroup(selectedGroupDetail.external_id, { name });
      await fetchAll({ background: true });
      setSelectedGroupDetail((prev) =>
        prev ? { ...prev, name } : prev
      );
      setSnack({
        message: t("toast.renameSuccess"),
        severity: "success",
      });
      setRenameModalOpen(false);
    } catch (e) {
      console.error(e);
      setSnack({
        message: t("toast.renameError"),
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteGroup = () => {
    if (!selectedGroupDetail) return;
    setConfirmText(
      t("confirm.deleteText", { name: selectedGroupDetail.name })
    );
    setConfirmAction(() => async () => {
      try {
        await api.deleteGroup(selectedGroupDetail.external_id);
        await fetchAll({ background: true });
        setSelectedGroupId(null);
        setSnack({
          message: t("toast.deleteSuccess"),
          severity: "info",
        });
      } catch (e) {
        console.error(e);
        setSnack({
          message: t("toast.deleteError"),
          severity: "error",
        });
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
      await api.updateGroupPermissions(
        selectedGroupDetail.external_id,
        Array.from(selectedCodes)
      );
      
      // Update original codes to match saved state
      setOriginalCodes(new Set<string>(selectedCodes));
      
      await fetchAll({ background: true });
      const res = await api.getGroup(selectedGroupDetail.external_id);
      const detail = res.data;
      setSelectedGroupDetail(detail);
      setSnack({
        message: t("toast.saveSuccess"),
        severity: "success",
      });
    } catch (e) {
      console.error(e);
      setSnack({
        message: t("toast.saveError"),
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    setSelectedCodes(new Set<string>(originalCodes));
  };

  /* -------------------------------- Render -------------------------------- */

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

  return (
    <>
      <TopProgress active={isBackgroundSync || isSubmitting} variant="top" topOffset={64} />

      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                GR
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">
                    {t("header.settings")}
                  </div>
                  <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                    {t("header.title")}
                  </h1>
                </div>
                {headerBadge}
              </div>
            </div>
          </header>

          <section className="mt-6 grid grid-cols-12 gap-6">
            {/* LEFT: Groups */}
            <aside className="col-span-12 lg:col-span-4">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("left.groups")}
                  </div>
                  {isOwner && (
                    <Button
                      className="!py-1.5 !px-3"
                      onClick={openCreateModal}
                      disabled={busy}
                    >
                      {t("left.create")}
                    </Button>
                  )}
                </div>

                <div className="p-3 border-b border-gray-200">
                  <Input
                    placeholder={t("left.searchPlaceholder")}
                    name="groupSearch"
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                    disabled={busy}
                  />
                </div>

                <div className="max-h-[380px] overflow-auto divide-y divide-gray-200">
                  {filteredGroups.map((g) => (
                    <button
                      key={g.external_id}
                      onClick={() =>
                        !busy &&
                        setSelectedGroupId((prev) =>
                          prev === g.external_id ? null : g.external_id
                        )
                      }
                      className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 ${
                        selectedGroupId === g.external_id ? "bg-gray-50" : ""
                      } ${busy ? "pointer-events-none opacity-70" : ""}`}
                    >
                      <div className="text-[13px] font-medium text-gray-900 truncate">
                        {g.name}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {t("left.meta", {
                          perms: g.permissions_count,
                          members: g.members_count,
                        })}
                      </div>
                    </button>
                  ))}
                  {filteredGroups.length === 0 && (
                    <p className="p-4 text-center text-sm text-gray-500">
                      {t("left.empty")}
                    </p>
                  )}
                </div>
              </div>
            </aside>

            {/* RIGHT: Permissions panel */}
            <section className="col-span-12 lg:col-span-8">
              {!selectedGroupDetail ? (
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
                  {t("right.selectPrompt")}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* group header / actions */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
                    <div className="flex flex-col max-w-[70%]">
                      <label className="text-[11px] uppercase tracking-wide text-gray-700">
                        {t("right.nameLabel")}
                      </label>
                      <p className="mt-1 text-[14px] font-medium text-gray-900 truncate">
                        {selectedGroupDetail.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwner && (
                        <>
                          <Button
                            variant="outline"
                            onClick={openRenameModal}
                            disabled={busy}
                          >
                            {t("right.rename")}
                          </Button>
                          {!selectedGroupDetail.is_system && (
                            <Button
                              variant="outline"
                              onClick={requestDeleteGroup}
                              disabled={busy}
                              aria-busy={busy || undefined}
                            >
                              {t("right.delete")}
                            </Button>
                          )}
                        </>
                      )}
                      {/* Close panel */}
                      <button
                        type="button"
                        aria-label={t("right.closePanel")}
                        className="text-[18px] leading-none px-2 text-gray-400 hover:text-gray-700 disabled:opacity-50"
                        onClick={() => setSelectedGroupId(null)}
                        disabled={busy}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Permissions table with tabs + footer Save/Undo */}
                  <GroupPermissionsTable
                    selectedCodes={selectedCodes}
                    disabled={busy || !isOwner}
                    dirty={dirty}
                    onToggle={setPermissionChecked}
                    onUndo={handleDiscard}
                    onSave={handleSavePermissions}
                  />
                </div>
              )}
            </section>
          </section>
        </div>

        {/* ------------------------------ Create Group Modal ------------------- */}
        {createModalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {t("createModal.title")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeCreateModal}
                  aria-label={t("createModal.close")}
                  disabled={busy}
                >
                  &times;
                </button>
              </header>

              <form className="space-y-3" onSubmit={handleCreateGroup}>
                <Input
                  label={t("createModal.nameLabel")}
                  name="newGroupName"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  disabled={busy}
                  required
                />

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="cancel"
                    type="button"
                    onClick={closeCreateModal}
                    disabled={busy}
                  >
                    {t("createModal.cancel")}
                  </Button>
                  <Button type="submit" disabled={busy}>
                    {t("createModal.save")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ------------------------------ Rename Group Modal ------------------- */}
        {renameModalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]">
            <div
              className="bg-white border border-gray-200 rounded-lg p-5 w-full max-w-md"
              role="dialog"
              aria-modal="true"
            >
              <header className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {t("renameModal.title")}
                </h3>
                <button
                  className="text-[20px] text-gray-400 hover:text-gray-700 leading-none"
                  onClick={closeRenameModal}
                  aria-label={t("renameModal.close")}
                  disabled={busy}
                >
                  &times;
                </button>
              </header>

              <form className="space-y-3" onSubmit={handleRenameSubmit}>
                <Input
                  label={t("renameModal.nameLabel")}
                  name="renameGroupName"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  disabled={busy}
                  required
                />

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="cancel"
                    type="button"
                    onClick={closeRenameModal}
                    disabled={busy}
                  >
                    {t("renameModal.cancel")}
                  </Button>
                  <Button type="submit" disabled={busy}>
                    {t("renameModal.save")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Confirm Toast */}
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
          confirmAction
            ?.()
            .catch((err) => {
              console.error(err);
              setSnack({
                message: t("confirm.fail"),
                severity: "error",
              });
            })
            .finally(() => setConfirmBusy(false));
        }}
        busy={confirmBusy}
      />

      {/* Snackbar */}
      <Snackbar
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