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
import { ArrowLeft, ArrowRight, Copy, Pencil, ShieldCheck, Users } from "lucide-react";

import PermissionExplorer from "./permissions/PermissionExplorer";
import GroupScopeEditor from "./permissions/GroupScopeEditor";
import { SCOPED_PERMISSION_RESOURCES } from "./permissions/taxonomy";
import GroupModal from "./GroupModal";

import { api } from "@/core/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { PermissionMiddleware } from "src/middlewares";

import type { AddGroupRequest, GroupDetail, GroupListItem, GroupScope, Permission } from "@/models/auth/rbac";

/* ------------------------------ Snackbar type ----------------------------- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type ModalState =
  | { open: false; mode: "create" | "rename"; initialName: string; initialDescription: string }
  | { open: true; mode: "create" | "rename"; initialName: string; initialDescription: string };

function normalizeScopes(scopes: GroupScope[], selectedCodes: Set<string>): string {
  return JSON.stringify(
    scopes
      .filter(
        (scope) =>
          selectedCodes.has(scope.permission_code) &&
          SCOPED_PERMISSION_RESOURCES[scope.permission_code]?.includes(
            scope.resource_type as never,
          ),
      )
      .map((scope) => ({
        permission_code: scope.permission_code,
        resource_type: scope.resource_type,
        scope_mode: scope.scope_mode,
        resource_ids: [...scope.resources.map((resource) => resource.id)].sort(),
      }))
      .sort((left, right) => left.permission_code.localeCompare(right.permission_code)),
  );
}

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

  const canManageAccess = useMemo(() => {
    if (isOwner) return true;
    return permissions.includes("manage_access");
  }, [isOwner, permissions]);

  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [planAvailableCodes, setPlanAvailableCodes] = useState<Set<string>>(new Set<string>());
  const [planLoaded, setPlanLoaded] = useState(false);

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    let alive = true;
    if (!canViewPermissions) {
      setCatalog([]);
      return;
    }
    void api
      .getPermissions()
      .then((response) => {
        if (alive) setCatalog(response.data.permissions || []);
      })
      .catch(() => {
        if (alive) setCatalog([]);
      });
    return () => {
      alive = false;
    };
  }, [canViewPermissions]);

  useEffect(() => {
    let alive = true;
    const canReadLimits = isOwner || permissions.includes("view_limits_and_usage");
    if (!canReadLimits) {
      setPlanLoaded(false);
      setPlanAvailableCodes(new Set<string>());
      return;
    }
    void api
      .getEntitlementLimits()
      .then((response) => {
        if (!alive) return;
        setPlanAvailableCodes(
          new Set(
            (response.data.items || []).map((item) => item.permission.code),
          ),
        );
        setPlanLoaded(true);
      })
      .catch(() => {
        if (alive) {
          setPlanLoaded(false);
          setPlanAvailableCodes(new Set<string>());
        }
      });
    return () => {
      alive = false;
    };
  }, [isOwner, permissions]);

  const actorCodes = useMemo(() => new Set(permissions), [permissions]);
  const planUnavailableCodes = useMemo(() => {
    if (!planLoaded || !isOwner) return new Set<string>();
    return new Set(
      catalog
        .filter(
          (permission) =>
            !permission.code.startsWith("view_") &&
            !planAvailableCodes.has(permission.code),
        )
        .map((permission) => permission.code),
    );
  }, [planLoaded, isOwner, catalog, planAvailableCodes]);

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
  const [scopes, setScopes] = useState<GroupScope[]>([]);
  const [originalScopes, setOriginalScopes] = useState<GroupScope[]>([]);

  const [groupSearch, setGroupSearch] = useState("");

  const [modal, setModal] = useState<ModalState>({ open: false, mode: "create", initialName: "", initialDescription: "" });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);
  const [backConfirmOpen, setBackConfirmOpen] = useState(false);

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
        setScopes([]);
        setOriginalScopes([]);

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
      setScopes([]);
      setOriginalScopes([]);
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

        if (canManageAccess) {
          const scopeRes = await api.getGroupScopes(selectedGroupId);
          const rows = scopeRes.data.scopes || [];
          setScopes(rows);
          setOriginalScopes(rows);
        } else {
          setScopes([]);
          setOriginalScopes([]);
        }
      } catch (error) {
        console.error(error);
        setSnack({ message: apiErrorMessage(error, t("toast.detailError")), severity: "error" });
      } finally {
        setIsDetailLoading(false);
      }
    };

    void load();
  }, [selectedGroupId, t, canViewGroups, canViewPermissions, canManageAccess]);

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
    return normalizeScopes(originalScopes, selectedCodes) !== normalizeScopes(scopes, selectedCodes);
  }, [originalCodes, selectedCodes, originalScopes, scopes]);

  const setPermissionChecked = (code: string, enabled: boolean) => {
    setSelectedCodes((prev) => {
      const next = new Set<string>(prev);
      if (enabled) next.add(code);
      else next.delete(code);
      return next;
    });
  };

  const openCreateModal = () => {
    setModal({ open: true, mode: "create", initialName: "", initialDescription: "" });
  };

  const openRenameModal = () => {
    if (!selectedGroupDetail) return;
    setModal({
      open: true,
      mode: "rename",
      initialName: selectedGroupDetail.name || "",
      initialDescription: selectedGroupDetail.description || "",
    });
  };

  const closeModal = () => {
    if (busy) return;
    setModal((prev) => ({ ...prev, open: false }));
  };

  const handleCreateGroup = async (name: string, description: string) => {
    setIsSubmitting(true);

    try {
      const payload: AddGroupRequest = { name, description, permission_codes: [] };
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

  const handleRenameGroup = async (name: string, description: string) => {
    if (!selectedGroupDetail) return;

    setIsSubmitting(true);

    try {
      await api.editGroup(selectedGroupDetail.id, { name, description });

      await fetchAll({ background: true });
      setSelectedGroupDetail((prev) => (prev ? { ...prev, name, description } : prev));

      setSnack({ message: t("toast.renameSuccess"), severity: "success" });
    } catch (error) {
      console.error(error);
      setSnack({ message: apiErrorMessage(error, t("toast.renameError")), severity: "error" });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicateGroup = async () => {
    if (!selectedGroupDetail || selectedGroupDetail.is_system) return;

    setIsSubmitting(true);

    try {
      const response = await api.addGroup({
        name: `${selectedGroupDetail.name} (copy)`,
        description: selectedGroupDetail.description || "",
        permission_codes: Array.from(selectedCodes),
      });
      await fetchAll({ background: true });
      setSelectedGroupId(response.data.id);
      setSnack({ message: t("toast.duplicateSuccess"), severity: "success" });
    } catch (error) {
      console.error(error);
      setSnack({ message: apiErrorMessage(error, t("toast.duplicateError")), severity: "error" });
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
      const scopePayload = scopes
        .filter(
          (scope) =>
            selectedCodes.has(scope.permission_code) &&
            SCOPED_PERMISSION_RESOURCES[scope.permission_code]?.includes(
              scope.resource_type as never,
            ),
        )
        .map((scope) => ({
          permission_code: scope.permission_code,
          resource_type: scope.resource_type,
          scope_mode: scope.scope_mode,
          resource_ids: scope.resources.map((resource) => resource.id),
        }));

      const response = await api.updateGroupPermissions(
        selectedGroupDetail.id,
        Array.from(selectedCodes),
        scopePayload,
      );

      setOriginalCodes(new Set<string>(selectedCodes));
      const savedScopes = response.data.scopes || scopePayload.map((scope) => ({
        ...scope,
        resources: scopes.find((row) => row.permission_code === scope.permission_code)?.resources || [],
      }));
      setScopes(savedScopes);
      setOriginalScopes(savedScopes);

      await fetchAll({ background: true });
      const detailResponse = await api.getGroup(selectedGroupDetail.id);
      setSelectedGroupDetail(detailResponse.data);

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
    setScopes(originalScopes);
  };

  const closeDetail = () => {
    if (busy) return;
    setBackConfirmOpen(false);
    setSelectedGroupId(null);
  };

  const requestBack = () => {
    if (busy) return;
    if (dirty) {
      setBackConfirmOpen(true);
      return;
    }
    closeDetail();
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
            <AnimatePresence mode="wait" initial={false}>
              {!selectedGroupId ? (
                <motion.div
                  key="groups-list"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <Card padding="none" radius="lg" className="overflow-hidden">
                    <div className="flex flex-col gap-3 border-b border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-gray-900">{t("left.groups")}</h2>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                          {filteredGroups.length} {t("left.results", "groups")}
                        </p>
                      </div>
                      <PermissionMiddleware codeName={"manage_access"}>
                        <Button className="!px-3 !py-1.5" onClick={openCreateModal} disabled={busy}>
                          {t("left.create")}
                        </Button>
                      </PermissionMiddleware>
                    </div>
                    <div className="border-b border-gray-200 bg-white p-4">
                      <Input
                        kind="text"
                        size="sm"
                        placeholder={t("left.searchPlaceholder")}
                        name="groupSearch"
                        value={groupSearch}
                        onChange={(event) => setGroupSearch(event.target.value)}
                        disabled={busy}
                      />
                    </div>
                    <div className="bg-gray-50/40 p-4">
                      {filteredGroups.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {filteredGroups.map((group) => (
                            <button
                              key={group.id}
                              type="button"
                              disabled={busy}
                              onClick={() => !busy && setSelectedGroupId(group.id)}
                              className="group flex min-h-[132px] flex-col justify-between rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 disabled:opacity-70"
                            >
                              <span className="flex min-w-0 items-start gap-3">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500">
                                  <Users size={16} aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex min-w-0 items-start justify-between gap-2">
                                    <span className="block min-w-0 truncate text-[13px] font-semibold text-gray-900">
                                      {group.name}
                                    </span>
                                    {group.is_system && (
                                      <Badge tone="neutral" variant="outline" size="sm">
                                        {t("right.system", "System")}
                                      </Badge>
                                    )}
                                  </span>
                                  {group.description && (
                                    <span className="mt-1 line-clamp-2 block text-xs leading-5 text-gray-500">
                                      {group.description}
                                    </span>
                                  )}
                                </span>
                              </span>
                              <span className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                                <span className="text-[11px] text-gray-500">
                                  {t("left.meta", {
                                    perms: group.permissions_count,
                                    members: group.members_count,
                                  })}
                                </span>
                                <ArrowRight
                                  size={15}
                                  className="shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5"
                                  aria-hidden="true"
                                />
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <EmptyState size="sm" title={t("left.empty")} />
                      )}
                    </div>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="group-detail"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <Card padding="none" radius="lg" className="overflow-hidden">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50/70 px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="inline-flex items-center gap-2"
                        onClick={requestBack}
                        disabled={busy}
                        aria-label={t("right.backToGroups", { defaultValue: "Back to groups" })}
                      >
                        <ArrowLeft size={16} aria-hidden="true" />
                        <span>{t("right.backToGroups", { defaultValue: "Back to groups" })}</span>
                      </Button>
                      <div className="flex flex-wrap items-center gap-2">
                        {selectedGroupDetail && !selectedGroupDetail.is_system && (
                          <PermissionMiddleware codeName={"manage_access"}>
                            <Button
                              variant="secondary"
                              className="inline-flex items-center gap-2"
                              onClick={handleDuplicateGroup}
                              disabled={busy}
                            >
                              <Copy size={15} aria-hidden="true" />
                              {t("right.duplicate", { defaultValue: "Duplicate" })}
                            </Button>
                          </PermissionMiddleware>
                        )}
                        {selectedGroupDetail && !selectedGroupDetail.is_system && (
                          <PermissionMiddleware codeName={"manage_access"}>
                            <Button
                              variant="secondary"
                              className="inline-flex items-center gap-2"
                              onClick={openRenameModal}
                              disabled={busy}
                            >
                              <Pencil size={15} aria-hidden="true" />
                              {t("right.rename")}
                            </Button>
                          </PermissionMiddleware>
                        )}
                        {selectedGroupDetail && !selectedGroupDetail.is_system && (
                          <PermissionMiddleware codeName={"manage_access"}>
                            <Button
                              variant="secondary"
                              onClick={requestDeleteGroup}
                              disabled={busy}
                              aria-busy={busy || undefined}
                            >
                              {t("right.delete")}
                            </Button>
                          </PermissionMiddleware>
                        )}
                      </div>
                    </div>

                    {selectedGroupDetail ? (
                      <>
                        <div className="flex flex-col gap-3 border-b border-gray-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600">
                              <ShieldCheck size={18} aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                                {t("right.nameLabel")}
                              </p>
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <h1 className="truncate text-lg font-semibold text-gray-900">
                                  {selectedGroupDetail.name}
                                </h1>
                                {selectedGroupDetail.is_system && (
                                  <Badge tone="neutral" variant="outline" size="sm">
                                    {t("right.system", "System")}
                                  </Badge>
                                )}
                              </div>
                              {selectedGroupDetail.description && (
                                <p className="mt-1 max-w-3xl text-xs leading-5 text-gray-500">
                                  {selectedGroupDetail.description}
                                </p>
                              )}
                              <p className="mt-1 text-xs text-gray-500">
                                {selectedGroupDetail.permissions?.length ?? 0}{" "}
                                {t("right.permissions", "permissions")}
                              </p>
                            </div>
                          </div>
                        </div>

                        <PermissionMiddleware codeName={"manage_access"}>
                          <GroupScopeEditor
                            selectedCodes={selectedCodes}
                            scopes={scopes}
                            onChange={setScopes}
                            disabled={busy}
                            readOnly={!!selectedGroupDetail.is_system}
                            catalog={catalog}
                          />
                        </PermissionMiddleware>
                        <PermissionMiddleware codeName={["view_permission", "view_group"]} requireAll>
                          <PermissionExplorer
                            key={selectedGroupDetail.id}
                            selectedCodes={selectedCodes}
                            disabled={busy}
                            readOnly={!!selectedGroupDetail.is_system}
                            dirty={dirty}
                            catalog={catalog}
                            planUnavailableCodes={planUnavailableCodes}
                            actorCodes={actorCodes}
                            isOwner={isOwner}
                            onToggle={setPermissionChecked}
                            onSetCodes={setSelectedCodes}
                            onUndo={handleDiscard}
                            onSave={handleSavePermissions}
                          />
                        </PermissionMiddleware>
                      </>
                    ) : (
                      <EmptyState
                        size="sm"
                        icon={<ShieldCheck size={22} />}
                        title={
                          isDetailLoading
                            ? t("right.loading", { defaultValue: "Loading group..." })
                            : t("right.selectPrompt")
                        }
                      />
                    )}
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </PermissionMiddleware>

          <PermissionMiddleware codeName={"manage_access"}>
            <GroupModal isOpen={modal.open} mode={modal.mode} initialName={modal.initialName} initialDescription={modal.initialDescription} busy={busy} onClose={closeModal} onSubmit={async (name, description) => {
              if (modal.mode === "create") return handleCreateGroup(name, description);
              return handleRenameGroup(name, description);
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

      <ConfirmToast
        open={backConfirmOpen}
        text={t("confirmDiscard.message")}
        confirmLabel={t("actions.discard")}
        cancelLabel={t("btn.cancel")}
        onCancel={() => {
          if (busy) return;
          setBackConfirmOpen(false);
        }}
        onConfirm={() => {
          if (busy) return;
          setBackConfirmOpen(false);
          setSelectedGroupId(null);
        }}
        busy={busy}
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