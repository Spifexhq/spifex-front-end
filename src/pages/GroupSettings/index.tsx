/* -------------------------------------------------------------------------- */
/*  File: src/pages/GroupSettings/index.tsx                                   */
/*  Style: Navbar fixa + SidebarSettings, cards claros, grid por categoria    */
/*  UX: sem modais; seleção rápida; salvar/desfazer; busca por grupo/permiss. */
/* -------------------------------------------------------------------------- */

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

/* ------------------------------ Type guards -------------------------------- */

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const isPermission = (v: unknown): v is Permission =>
  isRecord(v) &&
  typeof v.code === "string" &&
  (typeof v.name === "string" || typeof v.name === "undefined");

const isPermissionArray = (v: unknown): v is Permission[] =>
  Array.isArray(v) && v.every(isPermission);

type PermissionsEnvelope = { permissions: Permission[] };
type ResultsEnvelope = { results: Permission[] };
type DataEnvelope = { data?: unknown };

const hasPermissionsArray = (v: unknown): v is PermissionsEnvelope =>
  isRecord(v) && Array.isArray((v as PermissionsEnvelope).permissions) && (v as PermissionsEnvelope).permissions.every(isPermission);

const hasResultsArray = (v: unknown): v is ResultsEnvelope =>
  isRecord(v) && Array.isArray((v as ResultsEnvelope).results) && (v as ResultsEnvelope).results.every(isPermission);

const isGroupListItem = (v: unknown): v is GroupListItem =>
  isRecord(v) &&
  typeof (v).id === "number" &&
  typeof (v).external_id === "string" &&
  typeof (v).slug === "string" &&
  typeof (v).name === "string" &&
  typeof (v).is_system === "boolean" &&
  typeof (v).permissions_count === "number" &&
  typeof (v).members_count === "number";

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

const normalizeCategoryLabel = (c?: string) => {
  switch ((c || "").toLowerCase()) {
    case "navbar": return "Navigation";
    case "sidebar": return "Sidebar";
    case "page_components": return "Page Components";
    case "entries": return "Entries (Cashflow)";
    case "users": return "Users";
    case "banks": return "Banks";
    case "employees": return "Employees";
    case "groups": return "Groups";
    case "general_ledger_accounts": return "General Ledger";
    case "departments": return "Departments";
    case "projects": return "Projects";
    case "inventory": return "Inventory";
    case "entities": return "Entities";
    default: return c || "Other";
  }
};

const CATEGORY_ORDER = [
  "Navigation",
  "Sidebar",
  "Page Components",
  "Entries (Cashflow)",
  "Users",
  "Banks",
  "Employees",
  "Groups",
  "General Ledger",
  "Departments",
  "Projects",
  "Inventory",
  "Entities",
  "Other",
];

/* --------------------------- Page Component -------------------------------- */
const GroupSettings: React.FC = () => {
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
  useEffect(() => {
    document.title = "Grupos";
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [groupRes, permsRes] = await Promise.all([
        api.getAllGroups(),
        api.getPermissions(),
      ]);

      const groupList = toGroupArray(groupRes.data as GetGroups);
      setGroups(groupList.sort((a, b) => (a.name || "").localeCompare(b.name || "")));

      const perms = parsePermissionsResponse(permsRes.data);
      const cleaned: Permission[] = perms.map((p) => ({
        code: p.code,
        name: p.name ?? p.code,
        description: p.description ?? "",
        category: p.category ?? "Other",
      }));
      setAllPermissions(cleaned);
    } catch (e) {
      console.error(e);
      setSnackBarMessage("Erro ao carregar grupos/permissões.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
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
        setSnackBarMessage("Erro ao carregar detalhes do grupo.");
      }
    };
    void load();
  }, [selectedGroupId]);

  /* ------------------------------- Derived -------------------------------- */
  const groupedPermissions = useMemo(() => {
    const buckets: Record<string, Permission[]> = {};
    for (const p of allPermissions) {
      const key = normalizeCategoryLabel(p.category);
      (buckets[key] ||= []).push(p);
    }
    for (const k of Object.keys(buckets)) {
      buckets[k].sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code));
    }
    const entries = Object.entries(buckets).sort(
      (a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0])
    );

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
      setSnackBarMessage("Informe um nome para o novo grupo.");
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
      setSnackBarMessage("Erro ao criar grupo.");
    }
  };

  const handleRenameGroup = async () => {
    if (!selectedGroupDetail) return;
    const name = (selectedGroupDetail.name || "").trim();
    if (!name) {
      setSnackBarMessage("O nome do grupo não pode ser vazio.");
      return;
    }
    try {
      await api.editGroup(selectedGroupDetail.external_id, { name });
      await fetchAll();
    } catch (e) {
      console.error(e);
      setSnackBarMessage("Erro ao renomear o grupo.");
    }
  };

  const requestDeleteGroup = () => {
    if (!selectedGroupDetail) return;
    setConfirmText(`Excluir grupo "${selectedGroupDetail.name}"?`);
    setConfirmAction(() => async () => {
      if (!selectedGroupDetail) return;
      try {
        await api.deleteGroup(selectedGroupDetail.external_id);
        await fetchAll();
        setSelectedGroupId(null);
        setSnackBarMessage("Grupo excluído com sucesso.");
      } catch (e) {
        console.error(e);
        setSnackBarMessage("Erro ao excluir grupo.");
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
      await api.updateGroupPermissions(
        selectedGroupDetail.external_id,
        Array.from(selectedCodes)
      );
      await fetchAll();
      const detail = (await api.getGroup(selectedGroupDetail.external_id)).data as GroupDetail;
      setSelectedGroupDetail(detail);
      setSnackBarMessage("Permissões salvas com sucesso.");
    } catch (e) {
      console.error(e);
      setSnackBarMessage("Erro ao salvar permissões.");
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
                <div className="text-[10px] uppercase tracking-wide text-gray-600">Configurações</div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">Grupos & Permissões</h1>
              </div>
            </div>
          </header>

          <section className="mt-6 grid grid-cols-12 gap-6">
            {/* LEFT: Groups */}
            <aside className="col-span-12 lg:col-span-4">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-3 border-b border-gray-200 bg-gray-50">
                  <div className="text-[11px] uppercase tracking-wide text-gray-700">Grupos</div>
                </div>

                <div className="p-3 border-b border-gray-200">
                  <Input
                    placeholder="Buscar grupo..."
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
                        {g.permissions_count} perms · {g.members_count} membros
                      </div>
                    </button>
                  ))}
                  {filteredGroups.length === 0 && (
                    <p className="p-4 text-center text-sm text-gray-500">Nenhum grupo encontrado.</p>
                  )}
                </div>

                {isOwner && (
                  <div className="p-3 border-t border-gray-200 bg-gray-50">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Novo grupo..."
                        name="newGroupName"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                      />
                      <Button onClick={handleCreateGroup}>Criar</Button>
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* RIGHT: Permissions panel */}
            <section className="col-span-12 lg:col-span-8">
              {!selectedGroupDetail ? (
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-500">
                  Selecione um grupo para gerenciar as permissões.
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* group header / actions */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
                    <div className="flex flex-col max-w-[70%]">
                      <label className="text-[11px] uppercase tracking-wide text-gray-700">Nome</label>
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
                          <Button variant="outline" onClick={handleRenameGroup}>Renomear</Button>
                          {!selectedGroupDetail.is_system && (
                            <Button variant="common" onClick={requestDeleteGroup}>Excluir</Button>
                          )}
                        </>
                      )}
                      {/* Close panel */}
                      <button
                        type="button"
                        aria-label="Fechar painel de permissões"
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
                      placeholder="Buscar permissões..."
                      name="permSearch"
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                    />
                    <div className="ml-auto flex gap-2">
                      <Button
                        variant="cancel"
                        onClick={handleDiscard}
                        disabled={!dirty}
                      >
                        Desfazer
                      </Button>
                      <Button onClick={handleSavePermissions} disabled={!isOwner || !dirty}>
                        Salvar permissões
                      </Button>
                    </div>
                  </div>

                  {/* categories grid */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {groupedPermissions.map(([category, perms]) => {
                      const codes = perms.map((p) => p.code);
                      const allSelected = codes.every((c) => selectedCodes.has(c));
                      const noneSelected = codes.every((c) => !selectedCodes.has(c));
                      return (
                        <div key={category} className="border border-gray-200 rounded-lg">
                          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                            <span className="text-[12px] font-medium text-gray-800">{category}</span>
                            {isOwner && (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  className="!py-1 !px-2"
                                  onClick={() => selectAllInCategory(codes)}
                                  disabled={allSelected}
                                >
                                  Selecionar tudo
                                </Button>
                                <Button
                                  variant="outline"
                                  className="!py-1 !px-2"
                                  onClick={() => clearCategory(codes)}
                                  disabled={noneSelected}
                                >
                                  Limpar
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
                              <li className="px-3 py-2 text-[12px] text-gray-500">Sem itens</li>
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
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
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
              setSnackBarMessage("Falha ao confirmar.");
            })
            .finally(() => setConfirmBusy(false));
        }}
        busy={confirmBusy}
      />

      <Snackbar
        open={!!snackBarMessage}
        autoHideDuration={4000}
        onClose={() => setSnackBarMessage("")}
        severity={snackBarMessage.includes("sucesso") ? "success" : "error"}
      >
        <Alert severity={snackBarMessage.includes("sucesso") ? "success" : "error"}>
          {snackBarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default GroupSettings;
