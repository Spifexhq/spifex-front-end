import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  FolderKanban,
  Landmark,
  Library,
  Link2,
  PiggyBank,
  Receipt,
  ScrollText,
  Share2,
  SlidersHorizontal,
  Tags,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "@/core/api/requests";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { workspaceApi } from "@/features/workspaces/services/api";
import type { Workspace } from "@/features/workspaces/types";
import type {
  IntegrationConnection,
  IntegrationConnectionPolicy,
  IntegrationWorkspaceMode,
  IntegrationWorkspacePermissions,
} from "@/models/integrations/connections";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import Checkbox from "@/shared/ui/Checkbox";
import { EmptyState } from "@/shared/ui/State";
import SegmentedControl from "@/shared/ui/SegmentedControl";
import Switch from "@/shared/ui/Switch";

type Module = "personal" | "enterprise";
type Tab = "read" | "actions";
type Endpoint = { key: string; title: string; description: string; Icon: typeof Wallet };

const PERSONAL_ENDPOINTS: Endpoint[] = [
  { key: "workspaces", title: "List workspaces", description: "Workspace names, currency and lifecycle.", Icon: Building2 },
  { key: "transactions", title: "Transactions", description: "Income, expenses and transfers.", Icon: Receipt },
  { key: "cashflow_summary", title: "Cash-flow summary", description: "Totals for the selected period.", Icon: BarChart3 },
  { key: "categories", title: "Categories", description: "Personal transaction categories.", Icon: Tags },
  { key: "accounts", title: "Accounts", description: "Bank accounts and balances.", Icon: Landmark },
  { key: "budgets", title: "Budgets", description: "Monthly limits and spending progress.", Icon: Wallet },
  { key: "goals", title: "Goals", description: "Savings targets and progress.", Icon: Target },
  { key: "transfers", title: "Transfers", description: "Money movement between accounts.", Icon: ArrowLeftRight },
];

const ENTERPRISE_ENDPOINTS: Endpoint[] = [
  { key: "workspaces", title: "List workspaces", description: "Workspace names, currency and lifecycle.", Icon: Building2 },
  { key: "cashflow_rows", title: "Cash-flow entries", description: "Receipts, payments and open balances.", Icon: Receipt },
  { key: "cashflow_summary", title: "Cash-flow summary", description: "Totals for the selected period.", Icon: BarChart3 },
  { key: "categories", title: "Categories", description: "Cash-flow categories.", Icon: Tags },
  { key: "bank_accounts", title: "Bank accounts", description: "Connected banks and account metadata.", Icon: Landmark },
  { key: "chart_accounts", title: "Chart of accounts", description: "Ledger accounts and hierarchy.", Icon: Library },
  { key: "journals", title: "Journal entries", description: "Posted and draft journal lines.", Icon: ScrollText },
  { key: "periods", title: "Fiscal periods", description: "Open and closed accounting periods.", Icon: CalendarDays },
  { key: "books", title: "Accounting books", description: "Book basis, currency and status.", Icon: BookOpen },
  { key: "bank_mappings", title: "Bank mappings", description: "Bank-to-ledger account mappings.", Icon: Link2 },
  { key: "posting_policies", title: "Posting policies", description: "Category-to-account posting rules.", Icon: SlidersHorizontal },
  { key: "project_cost_centers", title: "Projects and cost centers", description: "Projects, departments and cost centers.", Icon: FolderKanban },
  { key: "members", title: "Members and roles", description: "Workspace members and permissions.", Icon: Users },
  { key: "inventory", title: "Inventory", description: "Items, quantities and movements.", Icon: PiggyBank },
];

const endpointsFor = (module: Module) => module === "personal" ? PERSONAL_ENDPOINTS : ENTERPRISE_ENDPOINTS;
const moduleForWorkspace = (workspace?: Workspace): Module => workspace?.product_category === "personal" ? "personal" : "enterprise";
const defaultPermissions = (module: Module): IntegrationWorkspacePermissions => ({
  read: Object.fromEntries(endpointsFor(module).map(endpoint => [endpoint.key, true])),
  actions: {},
});

export default function ConnectionPolicyEditor({ connection, onClose, onSaved }: {
  connection: IntegrationConnection;
  onClose(): void;
  onSaved(policy: IntegrationConnectionPolicy): void;
}) {
  const { t } = useTranslation("aiConnections");
  const reduced = useReducedMotion();
  const [draft, setDraft] = useState(connection.policy);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(connection.policy.workspace_ids[0] ?? null);
  const [tabs, setTabs] = useState<Record<string, Tab>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void workspaceApi.workspaces().then(result => {
      if (active) setWorkspaces(result.data);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const selectedWorkspaces = useMemo(
    () => draft.workspace_ids.map(id => workspaces.find(workspace => workspace.id === id)).filter((workspace): workspace is Workspace => Boolean(workspace)),
    [draft.workspace_ids, workspaces],
  );
  const activeWorkspace = selectedWorkspaces.find(workspace => workspace.id === activeId) ?? selectedWorkspaces[0];

  useEffect(() => {
    if (draft.workspace_mode !== "single" || draft.workspace_ids.length || !workspaces.length) return;
    setDraft(previous => ({ ...previous, workspace_ids: [workspaces[0].id] }));
    setActiveId(workspaces[0].id);
  }, [draft.workspace_mode, draft.workspace_ids.length, workspaces]);

  useEffect(() => {
    if (!activeWorkspace && selectedWorkspaces.length) setActiveId(selectedWorkspaces[0].id);
  }, [activeWorkspace, selectedWorkspaces]);

  const permissionsFor = (workspace: Workspace): IntegrationWorkspacePermissions =>
    draft.permissions.workspaces[workspace.id] ?? defaultPermissions(moduleForWorkspace(workspace));

  const updateWorkspacePermission = (workspace: Workspace, key: string, value: boolean) => {
    const current = permissionsFor(workspace);
    setDraft(previous => ({
      ...previous,
      permissions: {
        ...previous.permissions,
        workspaces: {
          ...previous.permissions.workspaces,
          [workspace.id]: { ...current, read: { ...current.read, [key]: value } },
        },
      },
    }));
  };

  const updateAll = (workspace: Workspace, value: boolean) => {
    const current = permissionsFor(workspace);
    setDraft(previous => ({
      ...previous,
      permissions: {
        ...previous.permissions,
        workspaces: {
          ...previous.permissions.workspaces,
          [workspace.id]: {
            ...current,
            read: Object.fromEntries(endpointsFor(moduleForWorkspace(workspace)).map(endpoint => [endpoint.key, value])),
          },
        },
      },
    }));
  };

  const setMode = (workspace_mode: IntegrationWorkspaceMode) => {
    setDraft(previous => ({
      ...previous,
      workspace_mode,
      workspace_ids: workspace_mode === "single" ? previous.workspace_ids.slice(0, 1) : previous.workspace_ids,
    }));
    if (workspace_mode === "single") setActiveId(draft.workspace_ids[0] ?? activeId);
  };

  const toggleWorkspace = (workspace: Workspace, checked: boolean) => {
    setDraft(previous => {
      const ids = checked
        ? (previous.workspace_mode === "single" ? [workspace.id] : Array.from(new Set([...previous.workspace_ids, workspace.id])))
        : previous.workspace_ids.filter(id => id !== workspace.id);
      return {
        ...previous,
        workspace_ids: ids,
        permissions: {
          ...previous.permissions,
          workspaces: checked
            ? { ...previous.permissions.workspaces, [workspace.id]: previous.permissions.workspaces[workspace.id] ?? defaultPermissions(moduleForWorkspace(workspace)) }
            : previous.permissions.workspaces,
        },
      };
    });
    if (checked) setActiveId(workspace.id);
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await api.updateIntegrationConnectionPolicy(connection.application_id, {
        workspace_mode: draft.workspace_mode,
        workspace_ids: draft.workspace_ids,
        permissions: draft.permissions,
      });
      onSaved(response.data);
      onClose();
    } catch (cause) {
      setError(apiErrorMessage(cause, t("policy.saveError", "Could not save the connection policy.")));
    } finally {
      setBusy(false);
    }
  };

  const renderPermissions = (workspace: Workspace) => {
    const module = moduleForWorkspace(workspace);
    const endpoints = endpointsFor(module);
    const permissions = permissionsFor(workspace);
    const tab = tabs[workspace.id] ?? "read";
    const enabled = endpoints.filter(endpoint => permissions.read[endpoint.key]).length;
    return <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600"><Building2 size={16} aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{workspace.name}</p>
            <p className="text-[11px] capitalize text-slate-500">{module} · {enabled}/{endpoints.length} {t("policy.enabled", "enabled")}</p>
          </div>
        </div>
        <SegmentedControl<Tab> value={tab} label={t("policy.tab", "Permissions")} onChange={value => setTabs(previous => ({ ...previous, [workspace.id]: value }))} items={[
          { value: "read", label: t("policy.read", "Read") },
          { value: "actions", label: t("policy.actions", "Actions") },
        ]} />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${workspace.id}-${tab}`}
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -4 }}
          transition={{ duration: reduced ? 0 : 0.15, ease: "easeOut" }}
          className="pt-3"
        >
          {tab === "read" ? <>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">{t("policy.perWorkspaceHint", "These permissions apply only to this workspace.")}</p>
              <div className="flex items-center gap-2">
                <Button type="button" size="xs" variant="outline" onClick={() => updateAll(workspace, true)}><Check size={13} aria-hidden="true" />{t("policy.selectAll", "Select all")}</Button>
                <Button type="button" size="xs" variant="ghost" onClick={() => updateAll(workspace, false)}>{t("policy.unselectAll", "Unselect all")}</Button>
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white sm:hidden">
              <div className="divide-y divide-gray-100">{endpoints.map(endpoint => <div key={endpoint.key} className="flex items-start justify-between gap-3 px-3 py-3">
                <div className="flex min-w-0 items-start gap-2.5"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-gray-200 bg-gray-50 text-gray-500"><endpoint.Icon size={14} aria-hidden="true" /></span><span className="min-w-0"><span className="block break-words font-medium text-slate-800">{t(`policy.endpoints.${endpoint.key}.title`, endpoint.title)}</span><span className="mt-0.5 block break-words text-[11px] text-slate-500">{t(`policy.endpoints.${endpoint.key}.description`, endpoint.description)}</span></span></div>
                <span className="mt-0.5 shrink-0"><Switch checked={permissions.read[endpoint.key] ?? false} onChange={value => updateWorkspacePermission(workspace, endpoint.key, value)} label={t(`policy.endpoints.${endpoint.key}.title`, endpoint.title)} /></span>
              </div>)}</div>
            </div>
            <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
              <table className="w-full min-w-[420px] text-left text-xs">
                <thead className="bg-gray-50 text-gray-500"><tr><th className="px-3 py-2 font-medium">{t("policy.endpoint", "Endpoint")}</th><th className="w-24 px-3 py-2 text-right font-medium">{t("policy.access", "Access")}</th></tr></thead>
                <tbody className="divide-y divide-gray-100">{endpoints.map(endpoint => <tr key={endpoint.key} className="transition-colors hover:bg-gray-50">
                  <td className="px-3 py-2.5"><div className="flex min-w-0 items-start gap-2.5"><span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-gray-200 bg-gray-50 text-gray-500"><endpoint.Icon size={14} aria-hidden="true" /></span><span className="min-w-0"><span className="block break-words font-medium text-slate-800">{t(`policy.endpoints.${endpoint.key}.title`, endpoint.title)}</span><span className="mt-0.5 block break-words text-[11px] text-slate-500">{t(`policy.endpoints.${endpoint.key}.description`, endpoint.description)}</span></span></div></td>
                  <td className="px-3 py-2.5 text-right"><span className="inline-flex items-center justify-end"><Switch checked={permissions.read[endpoint.key] ?? false} onChange={value => updateWorkspacePermission(workspace, endpoint.key, value)} label={t(`policy.endpoints.${endpoint.key}.title`, endpoint.title)} /></span></td>
                </tr>)}</tbody>
              </table>
            </div>
          </> : <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <p className="text-sm font-medium text-gray-700">{t("policy.noActions", "No actions available yet")}</p>
            <p className="mt-1 text-xs text-gray-500">{t("policy.noActionsBody", "Action endpoints will appear here in a future release. This connection remains read-only.")}</p>
          </div>}
        </motion.div>
      </AnimatePresence>
    </div>;
  };

  return <motion.section
    initial={reduced ? false : { opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: reduced ? 0 : 8 }}
    transition={{ duration: reduced ? 0 : 0.18, ease: "easeOut" }}
  >
    <Card as="div" radius="lg" padding="default" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-gray-200 bg-gray-50 text-gray-600"><Share2 size={17} aria-hidden="true" /></span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-gray-900">{connection.client_name}</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">{t("policy.description", "Choose which workspaces this connection can use. Each workspace keeps its own endpoint permissions.")}</p>
          </div>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>{t("policy.close", "Close")}</Button>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-gray-700">{t("policy.workspaceMode", "Workspace sharing")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {([
            ["single", t("policy.single", "This workspace only"), t("policy.singleHint", "One connection for the workspace you are in."), Building2],
            ["selected", t("policy.selected", "Selected workspaces"), t("policy.selectedHint", "Share one connection across specific workspaces."), Share2],
          ] as const).map(([mode, label, hint, Icon]) => <button key={mode} type="button" onClick={() => setMode(mode)} aria-pressed={draft.workspace_mode === mode} className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${draft.workspace_mode === mode ? "border-slate-400 bg-slate-50" : "border-gray-200 bg-white hover:bg-gray-50"}`}>
            <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md ${draft.workspace_mode === mode ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-500"}`}><Icon size={14} aria-hidden="true" /></span>
            <span className="min-w-0"><span className="block text-xs font-semibold text-slate-900">{label}</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">{hint}</span></span>
          </button>)}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={draft.workspace_mode}
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -4 }}
          transition={{ duration: reduced ? 0 : 0.16, ease: "easeOut" }}
        >
          {draft.workspace_mode === "single" ? (
            activeWorkspace ? <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">{renderPermissions(activeWorkspace)}</div> : <EmptyState size="sm" title={t("policy.noWorkspace", "Select a workspace to continue.")} />
          ) : (
            <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
                  <p className="text-xs font-semibold text-slate-800">{t("policy.workspaces", "Workspaces")}</p>
                  <span className="text-[11px] text-slate-500">{selectedWorkspaces.length}</span>
                </div>
                <ul className="max-h-56 divide-y divide-gray-100 overflow-y-auto sm:max-h-[420px]">{workspaces.map(workspace => {
                  const checked = draft.workspace_ids.includes(workspace.id);
                  const active = activeWorkspace?.id === workspace.id;
                  return <li key={workspace.id} className={`flex items-center gap-2 px-3 py-2 ${active ? "bg-slate-50" : ""}`}>
                    <Checkbox checked={checked} onChange={event => toggleWorkspace(workspace, event.target.checked)} aria-label={workspace.name} />
                    <button type="button" onClick={() => setActiveId(workspace.id)} disabled={!checked} className="min-w-0 flex-1 rounded-sm py-1 text-left disabled:cursor-not-allowed disabled:opacity-45">
                      <span className={`block truncate text-xs ${active ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>{workspace.name}</span>
                      <span className="mt-0.5 block text-[10px] capitalize text-slate-400">{moduleForWorkspace(workspace)}</span>
                    </button>
                  </li>;
                })}</ul>
              </aside>
              <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                {activeWorkspace ? renderPermissions(activeWorkspace) : <EmptyState size="sm" title={t("policy.selectWorkspaces", "Select and open a workspace to configure its endpoints.")} />}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onClose} disabled={busy}>{t("policy.close", "Close")}</Button>
        <Button type="button" className="w-full sm:w-auto" onClick={() => void save()} isLoading={busy} disabled={busy}>{t("policy.saveClose", "Save and close")}</Button>
      </div>
    </Card>
  </motion.section>;
}
