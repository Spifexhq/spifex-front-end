/* --------------------------------------------------------------------------
 * File: src/pages/GroupSettings/index.tsx
 * Style: Navbar fixa + SidebarSettings, cards claros, grid por categoria
 * UX: sem modais; seleção rápida; salvar/desfazer; busca por grupo/permiss.
 * i18n: settings:groups.*
 * -------------------------------------------------------------------------- */

import React, { useEffect, useMemo, useState } from "react";

import Navbar from "@/components/Navbar";
import SidebarSettings from "@/components/Sidebar/SidebarSettings";
import { SuspenseLoader } from "@/components/Loaders";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";
import ConfirmToast from "@/components/ConfirmToast/ConfirmToast";
import Checkbox from "src/components/Checkbox";

import { api } from "src/api/requests";
import { useAuthContext } from "@/contexts/useAuthContext";

import type { Permission } from "src/models/auth/domain/Permission";
import type { GroupDetail, GroupListItem } from "src/models/auth/domain/Group";
import type { AddGroupRequest, GetGroups } from "src/models/auth/dto/GetGroup";
import { useTranslation } from "react-i18next";

/* ------------------------------ Type guards -------------------------------- */

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const isString = (x: unknown): x is string => typeof x === "string";
const isNumber = (x: unknown): x is number => typeof x === "number";
const isBoolean = (x: unknown): x is boolean => typeof x === "boolean";

const isPermission = (v: unknown): v is Permission =>
  isRecord(v) && isString(v.code as unknown) &&
  (v.name === undefined || isString(v.name as unknown));

const isPermissionArray = (v: unknown): v is Permission[] =>
  Array.isArray(v) && v.every(isPermission);

type PermissionsEnvelope = { permissions: Permission[] };
type ResultsEnvelope = { results: Permission[] };
type DataEnvelope = { data?: unknown };

const hasPermissionsArray = (v: unknown): v is PermissionsEnvelope =>
  isRecord(v) &&
  Array.isArray((v as PermissionsEnvelope).permissions) &&
  (v as PermissionsEnvelope).permissions.every(isPermission);

const hasResultsArray = (v: unknown): v is ResultsEnvelope =>
  isRecord(v) &&
  Array.isArray((v as ResultsEnvelope).results) &&
  (v as ResultsEnvelope).results.every(isPermission);

const isGroupListItem = (v: unknown): v is GroupListItem => {
  if (!isRecord(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    isNumber(o.id) &&
    isString(o.external_id) &&
    isString(o.slug) &&
    isString(o.name) &&
    isBoolean(o.is_system) &&
    isNumber(o.permissions_count) &&
    isNumber(o.members_count)
  );
};

const toGroupArray = (payload: GetGroups): GroupListItem[] => {
  if (Array.isArray(payload) && payload.every(isGroupListItem)) return payload;
  if (isRecord(payload)) {
    const results = (payload as { results?: unknown[] }).results;
    if (Array.isArray(results) && results.every(isGroupListItem)) {
      return results as GroupListItem[];
    }
  }
  return [];
};

/** Accepts: Permission[] | {permissions: Permission[]} | {results: Permission[]} | {data:{permissions|results}} */
const parsePermissionsResponse = (payload: unknown): Permission[] => {
  if (isPermissionArray(payload)) return payload;

  if (isRecord(payload)) {
    if (hasPermissionsArray(payload)) return (payload as PermissionsEnvelope).permissions;
    if (hasResultsArray(payload)) return (payload as ResultsEnvelope).results;

    const data = (payload as DataEnvelope).data;
    if (isRecord(data)) {
      if (hasPermissionsArray(data)) return (data as PermissionsEnvelope).permissions;
      if (hasResultsArray(data)) return (data as ResultsEnvelope).results;
    }
  }
  return [];
};

/* ------------------------- Category helpers -------------------------------- */

const normalizeCategoryId = (c?: string): string => {
  switch ((c || "").toLowerCase()) {
    case "navbar": return "navigation";
    case "sidebar": return "sidebar";
    case "page_components": return "page_components";
    case "entries": return "entries";
    case "users": return "users";
    case "banks": return "banks";
    case "employees": return "employees";
    case "groups": return "groups";
    case "general_ledger_accounts": return "general_ledger";
    case "departments": return "departments";
    case "projects": return "projects";
    case "inventory": return "inventory";
    case "entities": return "entities";
    default: return "other";
  }
};

const CATEGORY_ORDER = [
  "navigation",
  "sidebar",
  "page_components",
  "entries",
  "users",
  "banks",
  "employees",
  "groups",
  "general_ledger",
  "departments",
  "projects",
  "inventory",
  "entities",
  "other"
] as const;

type CategoryId = typeof CATEGORY_ORDER[number];
const CATEGORY_SET = new Set<string>(CATEGORY_ORDER as readonly string[]);

const toCategoryId = (k: string): CategoryId =>
  (CATEGORY_SET.has(k) ? (k as CategoryId) : "other");

const orderIndex = (k: string): number =>
  (CATEGORY_ORDER as readonly string[]).indexOf(toCategoryId(k));

/* --------------------------- Page Component -------------------------------- */
const GroupSettings: React.FC = () => {
  const { t, i18n } = useTranslation(["settings"]);
  useEffect(() => { document.title = t("settings:groups.title"); }, [t]);
  useEffect(() => { document.documentElement.lang = i18n.language; }, [i18n.language]);

  const { isOwner } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [snackBarMessage, setSnackBarMessage] = useState<string>("");

  // Data
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

  // Selection & edits
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null); // external_id
  const [selectedGroupDetail, setSelectedGroupDetail] = useState<GroupDetail | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set<string>());

  // Searches
  const [groupSearch, setGroupSearch] = useState("");
  const [permSearch, setPermSearch] = useState("");

  // Inline create
  const [newGroupName, setNewGroupName] = useState("");

  // Confirm Toast
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  /* ----------------------------- Bootstrap -------------------------------- */
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [groupRes, permsRes] = await Promise.all([api.getAllGroups(), api.getPermissions()]);

      const groupList = toGroupArray(groupRes.data as GetGroups);
      setGroups(groupList.sort((a, b) => (a.name || "").localeCompare(b.name || "")));

      const perms = parsePermissionsResponse(permsRes.data);
      const cleaned: Permission[] = perms.map((p) => ({
        code: p.code,
        name: p.name ?? p.code,
        description: p.description ?? "",
        category: normalizeCategoryId(p.category),
      }));
      setAllPermissions(cleaned);
    } catch (e) {
      console.error(e);
      setSnackBarMessage(t("settings:groups.toast.loadAllError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------- Load group detail/permissions ----------------- */
  useEffect(() => {
    if (!selectedGroupId) {
      setSelectedGroupDetail(null);
      setSelectedCodes(new Set<string>());
      return;
    }
    const load = async () => {
      try {
        const [detailRes, permRes] = await Promise.all([
          api.getGroup(selectedGroupId),
          api.getGroupPermissions(selectedGroupId),
        ]);
        const detail = detailRes.data as GroupDetail;
        setSelectedGroupDetail(detail);

        const currentPerms = parsePermissionsResponse(permRes.data);
        const activeCodes = new Set<string>(currentPerms.map((p) => p.code));
        setSelectedCodes(activeCodes);
      } catch (e) {
        console.error(e);
        setSnackBarMessage(t("settings:groups.toast.detailError"));
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId]);

  /* ------------------------------- Derived -------------------------------- */
  const groupedPermissions = useMemo(() => {
    const buckets: Record<string, Permission[]> = {};
    for (const p of allPermissions) {
      const key = normalizeCategoryId(p.category);
      (buckets[key] ||= []).push(p);
    }
    for (const k of Object.keys(buckets)) {
      buckets[k].sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code));
    }
    const entries = Object.entries(buckets).sort((a, b) => orderIndex(a[0]) - orderIndex(b[0]));

    if (!permSearch.trim()) return entries;
    const q = permSearch.trim().toLowerCase();
    return entries
      .map(
        ([cat, perms]) =>
          [cat, perms.filter((p) => (p.name || p.code).toLowerCase().includes(q))] as const
      )
      .filter(([, perms]) => perms.length > 0);
  }, [allPermissions, permSearch]);

  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return groups;
    const q = groupSearch.trim().toLowerCase();
    return groups.filter((g) => (g.name || "").toLowerCase().includes(q));
  }, [groups, groupSearch]);

  const dirty =
    !!selectedGroupDetail &&
    selectedGroupDetail.permissions &&
    (() => {
      const orig = new Set<string>((selectedGroupDetail.permissions || []).map((p) => p.code));
      if (orig.size !== selectedCodes.size) return true;
      for (const c of selectedCodes) if (!orig.has(c)) return true;
      return false;
    })();

  /* ----------------------------- Actions ---------------------------------- */
  const toggleCode = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set<string>(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const selectAllInCategory = (codes: string[]) => {
    setSelectedCodes((prev) => {
      const next = new Set<string>(prev);
      codes.forEach((c) => next.add(c));
      return next;
    });
  };

  const clearCategory = (codes: string[]) => {
    setSelectedCodes((prev) => {
      const next = new Set<string>(prev);
      codes.forEach((c) => next.delete(c));
      return next;
    });
  };

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      setSnackBarMessage(t("settings:groups.toast.createNameRequired"));
      return;
    }
    try {
      const payload: AddGroupRequest = { name, permission_codes: [] };
      const res = await api.addGroup(payload);
      const created = res.data as GroupDetail;
      setNewGroupName("");
      await fetchAll();
      setSelectedGroupId(created.external_id);
    } catch (e) {
      console.error(e);
      setSnackBarMessage(t("settings:groups.toast.createError"));
    }
  };

  const handleRenameGroup = async () => {
    if (!selectedGroupDetail) return;
    const name = (selectedGroupDetail.name || "").trim();
    if (!name) {
      setSnackBarMessage(t("settings:groups.toast.renameEmpty"));
      return;
    }
    try {
      await api.editGroup(selectedGroupDetail.external_id, { name });
      await fetchAll();
    } catch (e) {
      console.error(e);
      setSnackBarMessage(t("settings:groups.toast.renameError"));
    }
  };

  const requestDeleteGroup = () => {
    if (!selectedGroupDetail) return;
    setConfirmText(t("settings:groups.confirm.deleteText", { name: selectedGroupDetail.name }));
    setConfirmAction(() => async () => {
      if (!selectedGroupDetail) return;
      try {
        await api.deleteGroup(selectedGroupDetail.external_id);
        await fetchAll();
        setSelectedGroupId(null);
        setSnackBarMessage(t("settings:groups.toast.deleteSuccess"));
      } catch (e) {
        console.error(e);
        setSnackBarMessage(t("settings:groups.toast.deleteError"));
      } finally {
        setConfirmOpen(false);
        setConfirmBusy(false);
      }
    });
    setConfirmOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedGroupDetail) return;
    try {
      await api.updateGroupPermissions(selectedGroupDetail.external_id, Array.from(selectedCodes));
      await fetchAll();
      const detail = (await api.getGroup(selectedGroupDetail.external_id)).data as GroupDetail;
      setSelectedGroupDetail(detail);
      setSnackBarMessage(t("settings:groups.toast.saveSuccess"));
    } catch (e) {
      console.error(e);
      setSnackBarMessage(t("settings:groups.toast.saveError"));
    }
  };

  const handleDiscard = () => {
    if (!selectedGroupDetail) return;
    const orig = new Set<string>((selectedGroupDetail.permissions || []).map((p) => p.code));
    setSelectedCodes(orig);
  };

  /* -------------------------------- Render -------------------------------- */
  if (loading) return <SuspenseLoader />;

  return (
    <>
      <Navbar />
      <SidebarSettings activeItem="groups" />

      <main className="min-h-screen bg-gray-50 text-gray-900 pt-16 lg:ml-64">
        <div className="max-w-[1200px] mx-auto px-6 py-8">
          {/* Header */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                GR
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">
                  {t("settings:groups.header.settings")}
                </div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  {t("settings:groups.header.title")}
                </h1>
              </div>
            </div>
          </header>

          <section className="mt-6 grid grid-cols-12 gap-6">
            {/* LEFT: Groups */}
            <aside className="col-span-12 lg:col-span-4">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                  <div className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("settings:groups.left.groups")}
                  </div>
                </div>

                <div className="p-3 border-b border-gray-200">
                  <Input
                    placeholder={t("settings:groups.left.searchPlaceholder")}
                    name="groupSearch"
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                  />
                </div>

                <div className="max-h-[380px] overflow-auto divide-y divide-gray-200">
                  {filteredGroups.map((g) => (
                    <button
                      key={g.external_id}
                      onClick={() =>
                        setSelectedGroupId((prev) => (prev === g.external_id ? null : g.external_id))
                      }
                      className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 ${
                        selectedGroupId === g.external_id ? "bg-gray-50" : ""
                      }`}
                    >
                      <div className="text-[13px] font-medium text-gray-900 truncate">{g.name}</div>
                      <div className="text-[11px] text-gray-500">
                        {t("settings:groups.left.meta", {
                          perms: g.permissions_count,
                          members: g.members_count
                        })}
                      </div>
                    </button>
                  ))}
                  {filteredGroups.length === 0 && (
                    <p className="p-4 text-center text-sm text-gray-500">
                      {t("settings:groups.left.empty")}
                    </p>
                  )}
                </div>

                {isOwner && (
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <div className="flex gap-2">
                      <Input
                        placeholder={t("settings:groups.left.newPlaceholder")}
                        name="newGroupName"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                      />
                      <Button onClick={handleCreateGroup}>{t("settings:groups.left.create")}</Button>
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* RIGHT: Permissions panel */}
            <section className="col-span-12 lg:col-span-8">
              {!selectedGroupDetail ? (
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
                  {t("settings:groups.right.selectPrompt")}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* group header / actions */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
                    <div className="flex flex-col max-w-[70%]">
                      <label className="text-[11px] uppercase tracking-wide text-gray-700">
                        {t("settings:groups.right.nameLabel")}
                      </label>
                      <input
                        className="mt-1 text-[14px] border border-gray-200 rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-gray-200"
                        value={selectedGroupDetail.name}
                        onChange={(e) =>
                          setSelectedGroupDetail((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                        }
                        disabled={!isOwner}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwner && (
                        <>
                          <Button variant="outline" onClick={handleRenameGroup}>
                            {t("settings:groups.right.rename")}
                          </Button>
                          {!selectedGroupDetail.is_system && (
                            <Button variant="common" onClick={requestDeleteGroup}>
                              {t("settings:groups.right.delete")}
                            </Button>
                          )}
                        </>
                      )}
                      {/* Close panel */}
                      <button
                        type="button"
                        aria-label={t("settings:groups.right.closePanel")}
                        className="text-[18px] leading-none px-2 text-gray-400 hover:text-gray-700"
                        onClick={() => setSelectedGroupId(null)}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* filter + actions */}
                  <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                    <Input
                      placeholder={t("settings:groups.right.searchPerms")}
                      name="permSearch"
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                    />
                    <div className="ml-auto flex gap-2">
                      <Button variant="cancel" onClick={handleDiscard} disabled={!dirty}>
                        {t("settings:groups.right.undo")}
                      </Button>
                      <Button onClick={handleSavePermissions} disabled={!isOwner || !dirty}>
                        {t("settings:groups.right.savePerms")}
                      </Button>
                    </div>
                  </div>

                  {/* categories grid */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedPermissions.map(([categoryId, perms]) => {
                      const codes = perms.map((p) => p.code);
                      const allSelected = codes.every((c) => selectedCodes.has(c));
                      const noneSelected = codes.every((c) => !selectedCodes.has(c));
                      return (
                        <div key={categoryId} className="border border-gray-200 rounded-lg">
                          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                            <span className="text-[12px] font-medium text-gray-800">
                              {t(`settings:groups.right.category.${toCategoryId(categoryId)}`)}
                            </span>
                            {isOwner && (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  className="!py-1 !px-2"
                                  onClick={() => selectAllInCategory(codes)}
                                  disabled={allSelected}
                                >
                                  {t("settings:groups.right.selectAll")}
                                </Button>
                                <Button
                                  variant="outline"
                                  className="!py-1 !px-2"
                                  onClick={() => clearCategory(codes)}
                                  disabled={noneSelected}
                                >
                                  {t("settings:groups.right.clear")}
                                </Button>
                              </div>
                            )}
                          </div>
                          <ul className="max-h-[260px] overflow-auto divide-y divide-gray-200">
                            {perms.map((p) => {
                              const checked = selectedCodes.has(p.code);
                              return (
                                <li key={p.code} className="flex items-start justify-between px-3 py-2">
                                  <div className="min-w-0">
                                    <div className="text-[13px] text-gray-900 truncate">
                                      {p.name || p.code}
                                    </div>
                                    <div className="text-[11px] text-gray-500 truncate">
                                      {p.code}
                                    </div>
                                  </div>
                                  <label className="inline-flex items-center gap-2">
                                    <Checkbox
                                      checked={checked}
                                      disabled={!isOwner}
                                      size="sm"
                                      onChange={() => toggleCode(p.code)}
                                    />
                                  </label>
                                </li>
                              );
                            })}
                            {perms.length === 0 && (
                              <li className="px-3 py-2 text-[12px] text-gray-500">
                                {t("settings:groups.right.noItems")}
                              </li>
                            )}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </section>
        </div>
      </main>

      {/* Confirm Toast */}
      <ConfirmToast
        open={confirmOpen}
        text={confirmText}
        confirmLabel={t("settings:groups.confirm.confirmLabel")}
        cancelLabel={t("settings:groups.confirm.cancelLabel")}
        variant="danger"
        onCancel={() => {
          if (confirmBusy) return;
          setConfirmOpen(false);
        }}
        onConfirm={() => {
          if (confirmBusy || !confirmAction) return;
          setConfirmBusy(true);
          confirmAction?.()
            .catch((err) => {
              console.error(err);
              setSnackBarMessage(t("settings:groups.confirm.fail"));
            })
            .finally(() => setConfirmBusy(false));
        }}
        busy={confirmBusy}
      />

      <Snackbar
        open={!!snackBarMessage}
        autoHideDuration={4000}
        onClose={() => setSnackBarMessage("")}
        severity={snackBarMessage.toLowerCase().includes(t("settings:groups.toast.successSnippet")) ? "success" : "error"}
      >
        <Alert severity={snackBarMessage.toLowerCase().includes(t("settings:groups.toast.successSnippet")) ? "success" : "error"}>
          {snackBarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default GroupSettings;
