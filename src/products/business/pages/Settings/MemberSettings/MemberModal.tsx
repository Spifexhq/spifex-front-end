import SidePanel, { SidePanelFooter } from "@/components/Modal/SidePanel";

/* -------------------------------------------------------------------------- */
/* File: src/pages/Settings/MemberSettings/MemberModal.tsx                             */
/* -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import Input from "@/shared/ui/Input";
import Button from "@/shared/ui/Button";
import Shimmer from "@/shared/ui/Loaders/Shimmer";
import { Select } from "src/shared/ui/Select";

import { api } from "@/core/api/requests";
import { PermissionMiddleware } from "src/middlewares";
import { validatePassword } from "@/lib";
import { useAuthContext } from "@/hooks/useAuth";

import type { GroupListItem } from "@/models/auth/rbac";
import type { EffectiveAccess, Member, Role } from "@/models/auth/members";

type Mode = "create" | "edit";

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type RoleOption = { key: Exclude<Role, "owner">; label: string };

const EFFECTIVE_ACCESS_WARNING_DEFAULTS: Record<string, string> = {
  owner_protected_authority: "Owner authority is protected and is not granted through groups.",
  administrator_has_no_groups: "This administrator has no permission groups and therefore no access.",
  member_has_no_groups: "This member has no permission groups and therefore no access.",
  plan_unavailable_codes: "Some assigned permissions are not available under the current plan.",
  missing_dependencies: "Some permissions are missing required read/page dependencies.",
  inactive_assigned_codes: "Some assigned permissions are inactive and do not grant access.",
};

type FormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Exclude<Role, "owner">;
  groups: GroupListItem[];
};

const emptyForm: FormState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "member",
  groups: [],
};

function normalizeComparable(form: FormState) {
  const trim = (value: string) => (value ?? "").trim();
  const groupIds = (form.groups ?? [])
    .map((group) => group.id)
    .slice()
    .sort();

  return {
    name: trim(form.name),
    email: trim(form.email),
    password: form.password,
    confirmPassword: form.confirmPassword,
    role: form.role,
    groupIds,
  };
}

const ModalSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <Shimmer className="h-10 rounded-md" />
    <div className="md:col-span-2">
      <Shimmer className="h-10 rounded-md" />
    </div>
    <div className="md:col-span-2 flex justify-end gap-3 pt-1">
      <Shimmer className="h-9 w-24 rounded-md" />
      <Shimmer className="h-9 w-28 rounded-md" />
    </div>
  </div>
);

export type MemberModalProps = {
  isOpen: boolean;
  mode: Mode;
  member?: Member | null;
  allGroups: GroupListItem[];
  onClose: () => void;
  onNotify?: (snack: Snack) => void;
  onSaved?: (res: { mode: Mode; memberId?: string }) => void;
};

const MemberModal: React.FC<MemberModalProps> = ({
  isOpen,
  mode,
  member,
  allGroups,
  onClose,
  onNotify,
  onSaved,
}) => {
  const { t } = useTranslation("memberSettings");
  const { isOwner, isSuperUser, permissions } = useAuthContext();

  const memberId = member?.id ?? null;

  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [effectiveAccess, setEffectiveAccess] = useState<EffectiveAccess | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [selectedGroupCodes, setSelectedGroupCodes] = useState<Record<string, string[]>>({});
  const [isGroupsPreviewLoading, setIsGroupsPreviewLoading] = useState(false);
  const [groupsPreviewError, setGroupsPreviewError] = useState("");

  const canAssignRole = isOwner;
  const canPreviewAccess =
    isOwner || isSuperUser || permissions.includes("view_effective_access");

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [warning, setWarning] = useState<{ title: string; message: string } | null>(null);

  const baselineRef = useRef<string>(JSON.stringify(normalizeComparable(emptyForm)));
  const nameRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const title = mode === "create" ? t("modal.createTitle") : t("modal.editTitle");

  const isDirty = useMemo(() => {
    return JSON.stringify(normalizeComparable(formData)) !== baselineRef.current;
  }, [formData]);

  const busy = isSubmitting || isDetailLoading;
  const disableForm = busy;

  const requiredFilled = useMemo(() => {
    const nameOk = formData.name.trim().length > 0;
    const emailOk = formData.email.trim().length > 0;

    if (mode === "create") {
      const passwordOk = formData.password.trim().length > 0;
      const confirmPasswordOk = formData.confirmPassword.trim().length > 0;
      return nameOk && emailOk && passwordOk && confirmPasswordOk;
    }

    return nameOk && emailOk;
  }, [formData, mode]);

  const canSubmit = !busy && requiredFilled;

  const roleOptions = useMemo<RoleOption[]>(
    () => [
      { key: "member", label: t("field.memberRole", { defaultValue: "Member" }) },
      { key: "admin", label: t("field.adminRole", { defaultValue: "Administrator" }) },
    ],
    [t],
  );
  const selectedRole = roleOptions.filter((option) => option.key === formData.role);
  const adminTemplate = useMemo(
    () =>
      allGroups.find(
        (group) =>
          group.is_system &&
          (group.slug === "administrators" || group.slug.startsWith("administrators-")),
      ),
    [allGroups],
  );
  const hasAdminTemplate = formData.groups.some(
    (group) =>
      group.is_system &&
      (group.slug === "administrators" || group.slug.startsWith("administrators-")),
  );

  const changeRole = (items: RoleOption[]) => {
    const nextRole = items[0]?.key;
    if (!nextRole) return;
    setEffectiveAccess(null);
    setSelectedGroupCodes({});
    setGroupsPreviewError("");
    setFormData((prev) => ({
      ...prev,
      role: nextRole,
      groups:
        nextRole === "member"
          ? prev.groups.filter(
              (group) =>
                !(
                  group.is_system &&
                  (group.slug === "administrators" ||
                    group.slug.startsWith("administrators-") ||
                    group.slug.startsWith("access-administrators"))
                ),
            )
          : prev.groups,
    }));
  };

  const assignAdminTemplate = () => {
    if (!adminTemplate) return;
    setEffectiveAccess(null);
    setSelectedGroupCodes({});
    setGroupsPreviewError("");
    setFormData((prev) => ({
      ...prev,
      groups: [
        ...prev.groups.filter((group) => group.id !== adminTemplate.id),
        adminTemplate,
      ],
    }));
  };

  const loadEffectiveAccess = useCallback(async () => {
    if (!memberId) return;
    setIsPreviewLoading(true);
    setPreviewError("");
    try {
      const response = await api.getMemberEffectiveAccess(memberId);
      setEffectiveAccess(response.data);
    } catch {
      setPreviewError(t("effectiveAccess.loadError", { defaultValue: "Failed to load effective access." }));
    } finally {
      setIsPreviewLoading(false);
    }
  }, [memberId, t]);

  const loadSelectedGroupCodes = useCallback(async () => {
    setIsGroupsPreviewLoading(true);
    setGroupsPreviewError("");
    try {
      const rows = await Promise.all(
        formData.groups.map(async (group) => {
          const response = await api.getGroup(group.id);
          return [group.id, (response.data.permissions ?? []).map((permission) => permission.code)] as const;
        }),
      );
      setSelectedGroupCodes(Object.fromEntries(rows));
    } catch {
      setGroupsPreviewError(
        t("effectiveAccess.groupsLoadError", { defaultValue: "Failed to load selected group permissions." }),
      );
    } finally {
      setIsGroupsPreviewLoading(false);
    }
  }, [formData.groups, t]);

  const hardReset = useCallback(() => {
    setFormData(emptyForm);
    setIsDetailLoading(false);
    setIsSubmitting(false);
    setShowDiscardConfirm(false);
    setWarning(null);
    setEffectiveAccess(null);
    setIsPreviewLoading(false);
    setPreviewError("");
    setSelectedGroupCodes({});
    setIsGroupsPreviewLoading(false);
    setGroupsPreviewError("");
    baselineRef.current = JSON.stringify(normalizeComparable(emptyForm));
  }, []);

  const closeNow = useCallback(() => {
    hardReset();
    onClose();
  }, [hardReset, onClose]);

  const attemptClose = useCallback(() => {
    if (busy) return;

    if (warning) {
      setWarning(null);
      return;
    }

    if (showDiscardConfirm) return;

    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }

    closeNow();
  }, [busy, warning, showDiscardConfirm, isDirty, closeNow]);

  const focusNameInput = useCallback(() => {
    requestAnimationFrame(() => {
      nameRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let alive = true;

    const run = async () => {
      hardReset();

      if (mode === "create") {
        focusNameInput();
        return;
      }

      if (!memberId) return;

      setIsDetailLoading(true);

      try {
        const response = await api.getMember(memberId);
        const detail = response.data.member as Member;

        if (!alive) return;

        const next: FormState = {
          name: detail.name ?? "",
          email: detail.email ?? "",
          password: "",
          confirmPassword: "",
          role: detail.role === "admin" ? "admin" : "member",
          groups: ((detail as unknown as { groups?: GroupListItem[] }).groups ?? []) as GroupListItem[],
        };

        setFormData(next);
        baselineRef.current = JSON.stringify(normalizeComparable(next));
        focusNameInput();
      } catch {
        if (!alive) return;
        onNotify?.({ message: t("errors.loadMemberError"), severity: "error" });
        closeNow();
      } finally {
        if (alive) setIsDetailLoading(false);
      }
    };

    void run();

    return () => {
      alive = false;
    };
  }, [isOpen, mode, memberId, hardReset, onNotify, t, closeNow, focusNameInput]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        attemptClose();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (canSubmit) {
          (document.getElementById("memberModalForm") as HTMLFormElement | null)?.requestSubmit();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, attemptClose, canSubmit]);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();

      const name = formData.name.trim();
      const email = formData.email.trim();

      if (!name || !email) {
        setWarning({
          title: t("errors.validationTitle"),
          message: t("errors.validationRequired"),
        });
        return;
      }

      if (mode === "create") {
        if (formData.password !== formData.confirmPassword) {
          const message = t("toast.passwordMismatch");
          onNotify?.({ message, severity: "warning" });
          setWarning({ title: t("errors.validationTitle"), message });
          return;
        }

        const { isValid, message } = validatePassword(formData.password);
        if (!isValid) {
          const warningMessage = (message as string | undefined) || t("toast.weakPassword");
          onNotify?.({ message: warningMessage, severity: "warning" });
          setWarning({
            title: t("errors.validationTitle"),
            message: warningMessage,
          });
          return;
        }
      }

      const group_ids = (formData.groups ?? []).map((group) => group.id);
      const role = canAssignRole ? formData.role : undefined;

      setIsSubmitting(true);

      try {
        if (mode === "create") {
          await api.addMember({
            name,
            email,
            password: formData.password || undefined,
            role,
            group_ids,
          });
        } else if (memberId) {
          await api.editMember(memberId, {
            name,
            role,
            group_ids,
          });
        }

        onNotify?.({ message: t("toast.saveOk"), severity: "success" });
        onSaved?.({ mode, memberId: memberId ?? undefined });
        closeNow();
      } catch {
        onNotify?.({ message: t("errors.saveError"), severity: "error" });
        setWarning({
          title: t("errors.saveErrorTitle"),
          message: t("errors.saveError"),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, mode, memberId, onNotify, onSaved, closeNow, t, canAssignRole]
  );

  return (
    <SidePanel mode="edit" dialogRef={panelRef} isOpen={isOpen} title={<>{title}</>} onClose={attemptClose} busy={busy}>



        <form
          id="memberModalForm"
          className="settings-modal-form"
          onSubmit={submit}
        >
          <div className="settings-modal-scroll">
            {mode === "edit" && isDetailLoading ? (
              <ModalSkeleton />
            ) : (
              <div
                className={[
                  "grid grid-cols-1 md:grid-cols-2 gap-4",
                  disableForm ? "opacity-70 pointer-events-none" : "",
                ].join(" ")}
              >
                <Input
                  kind="text"
                  label={t("field.name")}
                  name="name"
                  ref={nameRef}
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />

                <Input
                  kind="text"
                  label={t("field.email")}
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  disabled={mode === "edit"}
                  required
                />

                {mode === "create" && (
                  <>
                    <Input
                      kind="text"
                      label={t("field.tempPassword")}
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      showTogglePassword
                      required
                    />

                    <Input
                      kind="text"
                      label={t("field.confirmPassword")}
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                      showTogglePassword
                      required
                    />
                  </>
                )}

                {canAssignRole && (
                  <div className="md:col-span-2">
                    <Select<RoleOption>
                      label={t("field.role", { defaultValue: "Role" })}
                      items={roleOptions}
                      selected={selectedRole}
                      onChange={changeRole}
                      getItemKey={(option) => option.key}
                      getItemLabel={(option) => option.label}
                      buttonLabel={t("btnLabel.role", { defaultValue: "Select role" })}
                      singleSelect
                      hideCheckboxes
                      clearOnClickOutside={false}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {t("field.roleHint", {
                        defaultValue:
                          "Only the owner can assign administrators. Administrator access comes from the selected groups.",
                      })}
                    </p>
                  </div>
                )}

                <PermissionMiddleware codeName={["manage_access", "view_group"]} requireAll>
                  <div className="md:col-span-2">
                    <Select<GroupListItem>
                      label={t("field.groups")}
                      items={allGroups}
                      selected={formData.groups}
                      onChange={(items) => {
                        setEffectiveAccess(null);
                        setSelectedGroupCodes({});
                        setGroupsPreviewError("");
                        setFormData((prev) => ({ ...prev, groups: items }));
                      }}
                      getItemKey={(group) => group.id}
                      getItemLabel={(group) => group.name}
                      buttonLabel={t("btnLabel.groups")}
                      hideCheckboxes={false}
                      clearOnClickOutside={false}
                      customStyles={{ maxHeight: "280px" }}
                    />

                    {adminTemplate && !hasAdminTemplate && (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <p className="text-xs text-gray-600">
                          {t("field.adminTemplateHint", {
                            defaultValue:
                              "Use the full Administrator template only when broad administrative access is intended.",
                          })}
                        </p>
                        <Button type="button" variant="outline" size="xs" onClick={assignAdminTemplate} disabled={busy}>
                          {t("btn.useAdminTemplate", { defaultValue: "Use Administrator template" })}
                        </Button>
                      </div>
                    )}

                    {formData.role === "admin" && formData.groups.length === 0 && (
                      <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        {t("field.adminNoGroups", {
                          defaultValue:
                            "This administrator has no access until at least one permission group is assigned.",
                        })}
                      </p>
                    )}

                    {hasAdminTemplate && (
                      <p className="mt-2 text-xs text-gray-500">
                        {t("field.adminTemplateSelected", {
                          defaultValue:
                            "The full Administrator system bundle is selected. The owner can still remove it later.",
                        })}
                      </p>
                    )}

                    {formData.groups.length > 0 && (
                      <div className="mt-2 rounded-md border border-gray-200 bg-white px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-gray-600">
                            {t("effectiveAccess.selectedGroupsHint", {
                              defaultValue:
                                "Preview the permissions in the selected groups before saving. Plan restrictions still apply.",
                            })}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={() => void loadSelectedGroupCodes()}
                            disabled={isGroupsPreviewLoading || busy}
                          >
                            {isGroupsPreviewLoading
                              ? t("effectiveAccess.loading", { defaultValue: "Loading…" })
                              : t("effectiveAccess.previewGroups", { defaultValue: "Preview selected groups" })}
                          </Button>
                        </div>
                        {groupsPreviewError && (
                          <p className="mt-2 text-xs text-red-700">{groupsPreviewError}</p>
                        )}
                        {Object.keys(selectedGroupCodes).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {formData.groups.map((group) => (
                              <p key={group.id} className="break-words text-[11px] text-gray-600">
                                <span className="font-medium">{group.name}</span>
                                {": "}
                                {(selectedGroupCodes[group.id] ?? []).join(", ") || "—"}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </PermissionMiddleware>

                {mode === "edit" && memberId && canPreviewAccess && (
                  <div className="md:col-span-2 rounded-md border border-gray-200 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">
                          {t("effectiveAccess.title", { defaultValue: "Effective access" })}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {t("effectiveAccess.savedHint", {
                            defaultValue: "Preview reflects saved assignments. Save changes, then refresh.",
                          })}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => void loadEffectiveAccess()}
                        disabled={isPreviewLoading || busy}
                      >
                        {isPreviewLoading
                          ? t("effectiveAccess.loading", { defaultValue: "Loading…" })
                          : t("effectiveAccess.preview", { defaultValue: "Preview" })}
                      </Button>
                    </div>

                    {previewError && (
                      <p className="px-3 py-2 text-xs text-red-700">{previewError}</p>
                    )}

                    {effectiveAccess && (
                      <div className="space-y-3 px-3 py-3 text-xs text-gray-700">
                        {effectiveAccess.warnings.length > 0 && (
                          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                            {effectiveAccess.warnings.map((warning) => (
                              <p key={warning}>
                                {t(`effectiveAccess.warnings.${warning}`, {
                                  defaultValue:
                                    EFFECTIVE_ACCESS_WARNING_DEFAULTS[warning] ?? warning,
                                })}
                              </p>
                            ))}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {t("effectiveAccess.assignedCodes", { defaultValue: "Assigned codes" })}:{" "}
                            {effectiveAccess.assigned_codes.length}
                          </p>
                          <p className="mt-1 break-words text-[11px] text-gray-600">
                            {effectiveAccess.assigned_codes.join(", ") || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {t("effectiveAccess.effectiveCodes", { defaultValue: "Effective codes" })}:{" "}
                            {effectiveAccess.effective_codes.length}
                          </p>
                          <p className="mt-1 break-words text-[11px] text-gray-600">
                            {effectiveAccess.effective_codes.join(", ") || "—"}
                          </p>
                        </div>
                        {effectiveAccess.plan.unavailable_codes.length > 0 && (
                          <div>
                            <p className="font-semibold text-amber-800">
                              {t("effectiveAccess.planUnavailable", {
                                defaultValue: "Unavailable under the current plan",
                              })}
                            </p>
                            <p className="mt-1 break-words text-[11px] text-amber-700">
                              {effectiveAccess.plan.unavailable_codes.join(", ")}
                            </p>
                          </div>
                        )}
                        {Object.keys(effectiveAccess.missing_dependencies).length > 0 && (
                          <div>
                            <p className="font-semibold text-amber-800">
                              {t("effectiveAccess.missingDependencies", {
                                defaultValue: "Missing read/page dependencies",
                              })}
                            </p>
                            <p className="mt-1 break-words text-[11px] text-amber-700">
                              {Object.entries(effectiveAccess.missing_dependencies)
                                .map(([code, missing]) => `${code}: ${missing.join(", ")}`)
                                .join(" · ")}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {t("effectiveAccess.groupSources", { defaultValue: "Group sources" })}
                          </p>
                          <ul className="mt-1 space-y-1">
                            {effectiveAccess.groups.map((group) => (
                              <li key={group.id} className="text-[11px]">
                                <span className="font-medium">{group.name}</span>
                                {group.is_system ? ` (${t("field.systemGroup", { defaultValue: "system" })})` : ""}
                                {": "}
                                {group.permission_codes.join(", ") || "—"}
                              </li>
                            ))}
                            {effectiveAccess.groups.length === 0 && <li className="text-gray-500">—</li>}
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {t("effectiveAccess.ownerOnly", { defaultValue: "Protected owner-only operations" })}
                          </p>
                          <p className="mt-1 text-[11px] text-gray-600">
                            {effectiveAccess.protected_operations.map((operation) => operation.code).join(", ")}
                          </p>
                          {effectiveAccess.owner_only_capabilities.length > 0 && (
                            <p className="mt-1 break-words text-[11px] text-gray-500">
                              {effectiveAccess.owner_only_capabilities
                                .map((permission) => permission.code)
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <SidePanelFooter
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-gray-600 hidden md:block">{t("footer.shortcuts")}</p>

              <div className="grid grid-cols-2 gap-2 md:flex md:gap-2 md:ml-auto">
                <Button
                  variant="cancel"
                  type="button"
                  onClick={attemptClose}
                  disabled={busy}
                  className="w-full md:w-auto"
                >
                  {t("btn.cancel")}
                </Button>

                <Button type="submit" disabled={!canSubmit} className="w-full md:w-auto">
                  {t("btn.save")}
                </Button>
              </div>
            </div>
          </SidePanelFooter>
        </form>

        {showDiscardConfirm && (
          <div className="absolute inset-0 z-20 bg-black/20 backdrop-blur-[2px] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="w-full md:max-w-md rounded-t-2xl md:rounded-lg border border-gray-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-[15px] font-semibold text-gray-900">{t("confirmDiscard.title")}</h2>
                <p className="mt-1 text-xs text-gray-600">{t("confirmDiscard.message")}</p>
              </div>

              <div
                className="px-5 py-4 flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-2"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <Button
                  variant="outline"
                  className="w-full md:w-auto !border-gray-200 !text-gray-700 hover:!bg-gray-50"
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  {t("btn.cancel")}
                </Button>

                <Button
                  variant="danger"
                  className="w-full md:w-auto !bg-red-500 hover:!bg-red-600"
                  onClick={closeNow}
                >
                  {t("actions.discard")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {warning && (
          <div className="absolute inset-0 z-30 bg-black/20 backdrop-blur-[2px] flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="w-full md:max-w-md rounded-t-2xl md:rounded-lg border border-amber-200 bg-white shadow-2xl">
              <div className="px-5 py-4 border-b border-amber-100">
                <h2 className="text-[15px] font-semibold text-amber-800">{warning.title}</h2>
                <p className="mt-1 text-xs text-amber-700">{warning.message}</p>
              </div>

              <div
                className="px-5 py-4 flex justify-end"
                style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
              >
                <Button
                  variant="primary"
                  className="w-full md:w-auto"
                  onClick={() => {
                    setWarning(null);
                    focusNameInput();
                  }}
                >
                  {t("actions.ok")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </SidePanel>
  );
};

export default MemberModal;
