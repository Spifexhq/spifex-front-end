/* -------------------------------------------------------------------------- */
/* File: src/pages/MemberSettings.tsx                                          */
/* -------------------------------------------------------------------------- */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  startTransition,
} from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Snackbar from "@/shared/ui/Snackbar";
import ConfirmToast from "@/shared/ui/ConfirmToast";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import TopProgress from "@/shared/ui/Loaders/TopProgress";
import SelectDropdown from "@/shared/ui/SelectDropdown/SelectDropdown";
import Popover from "src/shared/ui/Popover";

import MemberModal from "./MemberModal";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";

import type { GroupListItem } from "@/models/auth/rbac";
import type { Member, Role, GetMembersParams } from "@/models/auth/members";

/* ---------------------------- Snackbar type ------------------------------ */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ---------------------------- In-memory guards --------------------------- */
let INFLIGHT_FETCH = false;

const getInitials = () => "FN";

/* ------------------------- Filter types / helpers ------------------------ */

type FilterKey = "name" | "email" | "role" | "group" | null;

type RoleKey = Exclude<Role, "owner">; // UI typically filters these
type RoleOption = { key: RoleKey; label: string };

type GroupOption = { key: string; label: string };

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function truncate(s: string, max = 24) {
  const v = (s || "").trim();
  if (v.length <= max) return v;
  return `${v.slice(0, max - 1)}…`;
}

function selectedSingle<T>(keys: T[]): T | undefined {
  const u = uniq(keys);
  return u.length === 1 ? u[0] : undefined;
}

/* ------------------------------- Chip UI ---------------------------------- */

const Chip = ({
  label,
  value,
  active,
  onClick,
  onClear,
  disabled,
}: {
  label: string;
  value?: string;
  active: boolean;
  onClick: () => void;
  onClear?: () => void;
  disabled?: boolean;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition",
        disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50",
        active ? "border-gray-300 bg-white" : "border-gray-200 bg-white",
      ].join(" ")}
    >
      {!active ? (
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-gray-200 text-gray-700 text-[12px] leading-none">
          +
        </span>
      ) : (
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-gray-200 text-gray-700 text-[12px] leading-none">
          ✓
        </span>
      )}

      <span className="text-gray-800 font-medium">{label}</span>

      {active && value ? <span className="text-gray-700 font-normal">{value}</span> : null}

      {active && onClear ? (
        <span
          role="button"
          aria-label="Clear"
          className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
        >
          ×
        </span>
      ) : null}
    </button>
  );
};

const ClearFiltersChip = ({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition",
        "border-red-200 text-red-600 bg-white",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-red-50",
      ].join(" ")}
    >
      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-red-200 text-red-600 text-[12px] leading-none">
        ×
      </span>
      <span>{label}</span>
    </button>
  );
};

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
        <Button variant="outline" onClick={() => onDelete(member)} disabled={busy} aria-busy={busy || undefined}>
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

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

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
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ------------------------------- Applied filters ------------------------- */
  const [appliedName, setAppliedName] = useState("");
  const [appliedEmail, setAppliedEmail] = useState("");
  const [appliedRoles, setAppliedRoles] = useState<RoleKey[]>([]);
  const [appliedGroups, setAppliedGroups] = useState<string[]>([]); // group slug

  const hasAppliedFilters = useMemo(() => {
    return (
      appliedName.trim() !== "" ||
      appliedEmail.trim() !== "" ||
      appliedRoles.length > 0 ||
      appliedGroups.length > 0
    );
  }, [appliedName, appliedEmail, appliedRoles, appliedGroups]);

  const appliedRoleParam = useMemo(() => selectedSingle(appliedRoles), [appliedRoles]);
  const appliedGroupParam = useMemo(() => selectedSingle(appliedGroups), [appliedGroups]);

  /* ------------------------------- Popover state --------------------------- */
  const [openFilter, setOpenFilter] = useState<FilterKey>(null);

  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftRoles, setDraftRoles] = useState<RoleKey[]>([]);
  const [draftGroups, setDraftGroups] = useState<string[]>([]);

  /* ------------------------------- Anchors --------------------------------- */
  const nameAnchorRef = useRef<HTMLDivElement | null>(null);
  const emailAnchorRef = useRef<HTMLDivElement | null>(null);
  const roleAnchorRef = useRef<HTMLDivElement | null>(null);
  const groupAnchorRef = useRef<HTMLDivElement | null>(null);

  /* ------------------------------- Options --------------------------------- */
  const roleOptions: RoleOption[] = useMemo(
    () => [
      { key: "admin", label: t("filters.roles.admin", { defaultValue: "Admin" }) },
      { key: "member", label: t("filters.roles.member", { defaultValue: "Member" }) },
    ],
    [t]
  );

  const groupOptions: GroupOption[] = useMemo(() => {
    // assumes GroupListItem has { name, slug }
    return (groups || []).map((g) => ({ key: g.slug as string, label: g.name }));
  }, [groups]);

  const selectedDraftRoleOptions = useMemo(() => {
    const set = new Set(draftRoles);
    return roleOptions.filter((o) => set.has(o.key));
  }, [draftRoles, roleOptions]);

  const selectedDraftGroupOptions = useMemo(() => {
    const set = new Set(draftGroups);
    return groupOptions.filter((o) => set.has(o.key));
  }, [draftGroups, groupOptions]);

  const draftRoleButtonLabel = useMemo(() => {
    const one = selectedSingle(draftRoles);
    if (one) return roleOptions.find((x) => x.key === one)?.label ?? t("filters.roleAll");
    if (draftRoles.length > 1) return t("filters.multi");
    return t("filters.roleAll");
  }, [draftRoles, roleOptions, t]);

  const draftGroupButtonLabel = useMemo(() => {
    const one = selectedSingle(draftGroups);
    if (one) return groupOptions.find((x) => x.key === one)?.label ?? t("filters.groupAll");
    if (draftGroups.length > 1) return t("filters.multi");
    return t("filters.groupAll");
  }, [draftGroups, groupOptions, t]);

  const appliedRoleChipValue = useMemo(() => {
    if (!appliedRoles.length) return "";
    const one = selectedSingle(appliedRoles);
    if (one) return roleOptions.find((x) => x.key === one)?.label ?? "";
    return t("filters.multi");
  }, [appliedRoles, roleOptions, t]);

  const appliedGroupChipValue = useMemo(() => {
    if (!appliedGroups.length) return "";
    const one = selectedSingle(appliedGroups);
    if (one) return groupOptions.find((x) => x.key === one)?.label ?? "";
    return t("filters.multi");
  }, [appliedGroups, groupOptions, t]);

  /* ----------------------------- Fetchers --------------------------------- */
  const normalizeAndSet = useCallback((memRes: Member[], grpRes: GroupListItem[]) => {
    // Keep non-owner memberships visible by default
    const visible = memRes.filter((e) => e.role !== "owner");

    const normMembers = [...visible].sort((a, b) => {
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

  const fetchList = useCallback(
    async (opts: { background?: boolean } = {}) => {
      if (INFLIGHT_FETCH) return;
      INFLIGHT_FETCH = true;
      const seq = ++fetchSeqRef.current;

      if (opts.background) setIsBackgroundSync(true);
      else setIsInitialLoading(true);

      try {
        const params: GetMembersParams = {
          name: appliedName.trim() || undefined,
          email: appliedEmail.trim() || undefined,
          role: (appliedRoleParam as Role) || undefined, // only when exactly one selected
          group: appliedGroupParam || undefined, // only when exactly one selected
        };

        const [memResp, grpResp] = await Promise.all([api.getMembers(params), api.getGroups()]);
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
    },
    [appliedName, appliedEmail, appliedRoleParam, appliedGroupParam, normalizeAndSet, t]
  );

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  /* ------------------------------ Filter apply/clear ------------------------ */
  const togglePopover = useCallback((key: Exclude<FilterKey, null>) => {
    setOpenFilter((prev) => (prev === key ? null : key));
  }, []);

  const applyFromDraft = useCallback(
    (key: Exclude<FilterKey, null>) => {
      if (key === "name") setAppliedName(draftName.trim());
      if (key === "email") setAppliedEmail(draftEmail.trim());

      if (key === "role") setAppliedRoles(uniq(draftRoles));
      if (key === "group") setAppliedGroups(uniq(draftGroups));

      setOpenFilter(null);
    },
    [draftName, draftEmail, draftRoles, draftGroups]
  );

  const clearOne = useCallback((key: Exclude<FilterKey, null>) => {
    if (key === "name") setAppliedName("");
    if (key === "email") setAppliedEmail("");
    if (key === "role") setAppliedRoles([]);
    if (key === "group") setAppliedGroups([]);
    setOpenFilter(null);
  }, []);

  const clearAll = useCallback(() => {
    setAppliedName("");
    setAppliedEmail("");
    setAppliedRoles([]);
    setAppliedGroups([]);
    setOpenFilter(null);
  }, []);

  /* ------------------------------ Draft sync on open ------------------------ */
  useEffect(() => {
    if (openFilter === "name") setDraftName(appliedName);
    if (openFilter === "email") setDraftEmail(appliedEmail);
    if (openFilter === "role") setDraftRoles(appliedRoles);
    if (openFilter === "group") setDraftGroups(appliedGroups);
  }, [openFilter, appliedName, appliedEmail, appliedRoles, appliedGroups]);

  /* ------------------------------ Focus on open ----------------------------- */
  useEffect(() => {
    if (openFilter === "name") {
      requestAnimationFrame(() => {
        const el = document.getElementById("member-filter-name-input") as HTMLInputElement | null;
        el?.focus();
        el?.select?.();
      });
    }
    if (openFilter === "email") {
      requestAnimationFrame(() => {
        const el = document.getElementById("member-filter-email-input") as HTMLInputElement | null;
        el?.focus();
        el?.select?.();
      });
    }
  }, [openFilter]);

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

  const globalBusy = isBackgroundSync || confirmBusy || modalOpen;

  const nameChipValue = appliedName.trim() ? truncate(appliedName.trim(), 22) : "";
  const emailChipValue = appliedEmail.trim() ? truncate(appliedEmail.trim(), 22) : "";
  const roleChipValue = appliedRoles.length ? appliedRoleChipValue : "";
  const groupChipValue = appliedGroups.length ? appliedGroupChipValue : "";

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
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between gap-3">
                  {/* LEFT: chips */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div ref={nameAnchorRef}>
                      <Chip
                        label={t("filters.nameLabel")}
                        value={nameChipValue ? `• ${nameChipValue}` : undefined}
                        active={!!appliedName.trim()}
                        onClick={() => togglePopover("name")}
                        onClear={appliedName.trim() ? () => clearOne("name") : undefined}
                        disabled={globalBusy}
                      />
                    </div>

                    <div ref={emailAnchorRef}>
                      <Chip
                        label={t("filters.emailLabel")}
                        value={emailChipValue ? `• ${emailChipValue}` : undefined}
                        active={!!appliedEmail.trim()}
                        onClick={() => togglePopover("email")}
                        onClear={appliedEmail.trim() ? () => clearOne("email") : undefined}
                        disabled={globalBusy}
                      />
                    </div>

                    <div ref={roleAnchorRef}>
                      <Chip
                        label={t("filters.roleLabel")}
                        value={roleChipValue ? `• ${roleChipValue}` : undefined}
                        active={appliedRoles.length > 0}
                        onClick={() => togglePopover("role")}
                        onClear={appliedRoles.length ? () => clearOne("role") : undefined}
                        disabled={globalBusy}
                      />
                    </div>

                    <div ref={groupAnchorRef}>
                      <Chip
                        label={t("filters.groupLabel")}
                        value={groupChipValue ? `• ${groupChipValue}` : undefined}
                        active={appliedGroups.length > 0}
                        onClick={() => togglePopover("group")}
                        onClear={appliedGroups.length ? () => clearOne("group") : undefined}
                        disabled={globalBusy}
                      />
                    </div>

                    {hasAppliedFilters && (
                      <ClearFiltersChip label={t("filters.clearAll")} onClick={clearAll} disabled={globalBusy} />
                    )}
                  </div>

                  {/* RIGHT: add button */}
                  <div className="shrink-0">
                    {canEdit && (
                      <Button onClick={openCreateModal} className="!py-1.5" disabled={globalBusy}>
                        {t("btn.addMember")}
                      </Button>
                    )}
                  </div>
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

      {/* NAME POPOVER */}
      <Popover open={openFilter === "name"} anchorRef={nameAnchorRef} onClose={() => setOpenFilter(null)}>
        <div className="p-4">
          <div className="text-[14px] font-semibold text-gray-900">{t("filters.byNameTitle")}</div>

          <div className="mt-3">
            <Input
              kind="text"
              id="member-filter-name-input"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("name");
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpenFilter(null);
                }
              }}
              placeholder={t("filters.namePlaceholder")}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftName("")}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("name")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Popover>

      {/* EMAIL POPOVER */}
      <Popover open={openFilter === "email"} anchorRef={emailAnchorRef} onClose={() => setOpenFilter(null)}>
        <div className="p-4">
          <div className="text-[14px] font-semibold text-gray-900">{t("filters.byEmailTitle")}</div>

          <div className="mt-3">
            <Input
              kind="text"
              id="member-filter-email-input"
              value={draftEmail}
              onChange={(e) => setDraftEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyFromDraft("email");
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpenFilter(null);
                }
              }}
              placeholder={t("filters.emailPlaceholder")}
              disabled={globalBusy}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftEmail("")}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("email")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Popover>

      {/* ROLE POPOVER */}
      <Popover open={openFilter === "role"} anchorRef={roleAnchorRef} onClose={() => setOpenFilter(null)} width={420}>
        <div className="p-4 overflow-visible">
          <div className="text-[14px] font-semibold text-gray-900">{t("filters.byRoleTitle")}</div>

          <div className="mt-3 relative z-[1000000] overflow-visible">
            <div className="[&_input[type=text]]:hidden overflow-visible">
              <SelectDropdown<RoleOption>
                label={t("filters.roleLabel")}
                items={roleOptions}
                selected={selectedDraftRoleOptions}
                onChange={(list) => setDraftRoles(uniq((list || []).map((x) => x.key)))}
                getItemKey={(item) => item.key}
                getItemLabel={(item) => item.label}
                buttonLabel={draftRoleButtonLabel}
                customStyles={{ maxHeight: "240px" }}
                hideFilter
              />
            </div>

            <div className="mt-2 text-[11px] text-gray-500">{t("filters.roleHint")}</div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftRoles([])}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("role")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Popover>

      {/* GROUP POPOVER */}
      <Popover open={openFilter === "group"} anchorRef={groupAnchorRef} onClose={() => setOpenFilter(null)} width={420}>
        <div className="p-4 overflow-visible">
          <div className="text-[14px] font-semibold text-gray-900">{t("filters.byGroupTitle")}</div>

          <div className="mt-3 relative z-[1000000] overflow-visible">
            <div className="[&_input[type=text]]:hidden overflow-visible">
              <SelectDropdown<GroupOption>
                label={t("filters.groupLabel")}
                items={groupOptions}
                selected={selectedDraftGroupOptions}
                onChange={(list) => setDraftGroups(uniq((list || []).map((x) => x.key)))}
                getItemKey={(item) => item.key}
                getItemLabel={(item) => item.label}
                buttonLabel={draftGroupButtonLabel}
                customStyles={{ maxHeight: "260px" }}
                hideFilter
              />
            </div>

            <div className="mt-2 text-[11px] text-gray-500">{t("filters.groupHint")}</div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              className="text-[12px] text-gray-600 hover:text-gray-900"
              onClick={() => setDraftGroups([])}
              disabled={globalBusy}
            >
              {t("filters.clear")}
            </button>

            <Button onClick={() => applyFromDraft("group")} disabled={globalBusy}>
              {t("filters.apply")}
            </Button>
          </div>
        </div>
      </Popover>

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
