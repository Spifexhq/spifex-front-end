import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/hooks/useAuth";
import { workspaceApi } from "@/features/workspaces/services/api";
import type { Workspace } from "@/features/workspaces/types";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useWorkspaceSelection } from "@/features/workspaces/components/useWorkspaceSelection";
import WorkspaceSwitcher from "@/features/workspaces/components/WorkspaceSwitcher";
import FloatingDialog from "@/components/Modal/FloatingDialog";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Checkbox from "@/shared/ui/Checkbox";
import Switch from "@/shared/ui/Switch";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { EmptyState } from "@/shared/ui/State";
import Badge from "@/shared/ui/Badge";

const daysUntil = (date: string) => Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000));

export default function WorkspaceManagementPage() {
  const { t } = useTranslation("personal");
  const auth = useAuthContext();
  const selectWorkspace = useWorkspaceSelection();
  const activeWorkspace = auth.organization?.organization;
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Workspace | null>(null);
  const [restorePassword, setRestorePassword] = useState("");
  const [restoreConfirmed, setRestoreConfirmed] = useState(false);
  const [primaryBusy, setPrimaryBusy] = useState<string | null>(null);
  const [switchBusy, setSwitchBusy] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestKey = useRef("");
  const restoreKey = useRef("");

  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await workspaceApi.workspaces();
      setWorkspaces(response.data);
    } catch (cause) {
      setError(apiErrorMessage(cause, t("error")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void loadWorkspaces(); }, [loadWorkspaces]);

  const activeOwned = useMemo(() => workspaces.filter(item => item.is_owner && item.lifecycle === "active"), [workspaces]);

  const closeDelete = () => {
    if (busy) return;
    setDeleteTarget(null);
    setPassword("");
    setConfirmed(false);
    setError("");
  };

  const closeRestore = () => {
    if (busy) return;
    setRestoreTarget(null);
    setRestorePassword("");
    setRestoreConfirmed(false);
    setError("");
  };

  const openWorkspace = async (workspace: Workspace) => {
    if (switchBusy || workspace.id === activeWorkspace?.id) return;
    setSwitchBusy(workspace.id);
    setError("");
    setNotice("");
    try {
      await selectWorkspace(workspace.id);
    } catch (cause) {
      setError(apiErrorMessage(cause, t("error")));
    } finally {
      setSwitchBusy(null);
    }
  };

  const setPrimary = async (workspace: Workspace, checked: boolean) => {
    if (primaryBusy || workspace.lifecycle !== "active") return;
    if (!checked && !workspace.is_primary) return;
    setPrimaryBusy(workspace.id);
    setError("");
    setNotice("");
    try {
      await workspaceApi.setPrimary(checked ? workspace.id : null);
      setWorkspaces(previous => previous.map(item => ({ ...item, is_primary: checked && item.id === workspace.id })));
      setNotice(t("primaryUpdated"));
    } catch (cause) {
      setError(apiErrorMessage(cause, t("error")));
    } finally {
      setPrimaryBusy(null);
    }
  };

  const scheduleDeletion = async () => {
    if (!deleteTarget || !password || !confirmed || busy) return;
    setBusy(true);
    setError("");
    try {
      const removedId = deleteTarget.id;
      await workspaceApi.scheduleDeletion(removedId, password, requestKey.current || crypto.randomUUID());
      setDeleteTarget(null);
      setPassword("");
      setConfirmed(false);
      requestKey.current = "";
      const response = await workspaceApi.workspaces();
      setWorkspaces(response.data);
      if (removedId === activeWorkspace?.id) {
        const next = response.data.find(item => item.is_owner && item.lifecycle === "active");
        if (next) await selectWorkspace(next.id);
      }
    } catch (cause) {
      setError(apiErrorMessage(cause, t("error")));
    } finally {
      setBusy(false);
    }
  };

  const restoreWorkspace = async () => {
    if (!restoreTarget || !restorePassword || !restoreConfirmed || busy) return;
    setBusy(true);
    setError("");
    try {
      const restored = await workspaceApi.restoreWorkspace(
        restoreTarget.id,
        restorePassword,
        restoreKey.current || crypto.randomUUID()
      );
      setRestoreTarget(null);
      setRestorePassword("");
      setRestoreConfirmed(false);
      restoreKey.current = "";
      setNotice(t("workspaceRestoredReviewBilling"));
      await loadWorkspaces();
      await selectWorkspace(restored.data.id);
    } catch (cause) {
      setError(apiErrorMessage(cause, t("error")));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <main className="settings-page"><div className="settings-content"><PageSkeleton variant="groups" rows={3}/></div></main>;

  return <main className="settings-page">
    <div className="settings-content space-y-5">
    <div className="settings-intro justify-end">
      <div className="w-full sm:w-auto sm:min-w-[230px]"><WorkspaceSwitcher manage/></div>
    </div>

    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
    {error && !deleteTarget && !restoreTarget && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}<button type="button" className="ml-2 font-medium underline" onClick={() => void loadWorkspaces()}>{t("retry")}</button></p>}

    <section className="settings-panel overflow-hidden rounded-lg border border-gray-200 bg-white" aria-label={t("workspaces")}>
      <div className="settings-panel-heading flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3"><div><h2 className="text-[13px] font-semibold text-gray-900">{t("workspaces")}</h2><p className="mt-1 text-xs text-gray-500">{t("primaryWorkspaceHint")}</p></div><span className="text-xs text-gray-500">{workspaces.length}</span></div>
      {workspaces.length ? <ul className="divide-y divide-gray-100">{workspaces.map(workspace => {
        const isCurrent = workspace.id === activeWorkspace?.id;
        const eligible = auth.isOwner && workspace.is_owner && workspace.lifecycle === "active" && activeOwned.length > 1;
        const canRestore = auth.isOwner && workspace.is_owner && workspace.lifecycle === "legacy" && !!workspace.scheduled_deletion_at && daysUntil(workspace.scheduled_deletion_at) > 0;
        const canSetPrimary = workspace.lifecycle === "active";
        return <li key={workspace.id} className="settings-row flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-gray-50/70 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Switch checked={!!workspace.is_primary} onChange={(checked) => void setPrimary(workspace, checked)} label={`${t("setAsPrimary")}: ${workspace.name}`} disabled={!canSetPrimary || !!primaryBusy} className="mt-0.5" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><p className="truncate text-[13px] font-medium text-gray-900">{workspace.name}</p>{isCurrent && <Badge tone="success">{t("current")}</Badge>}</div>
              <p className="mt-1 text-xs text-gray-500">{t(workspace.product_category || "business")} · {t(workspace.lifecycle || "active")}{workspace.scheduled_deletion_at && <span className="ml-2 text-amber-700">{t("deletionDaysLeft", { count: daysUntil(workspace.scheduled_deletion_at) })}</span>}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {!isCurrent && <Button size="xs" variant="outline" disabled={!!switchBusy} isLoading={switchBusy === workspace.id} onClick={() => void openWorkspace(workspace)}>{t("openWorkspace")}</Button>}
            {canRestore && <Button size="xs" variant="outline" onClick={() => { setError(""); setNotice(""); setRestoreTarget(workspace); setRestorePassword(""); setRestoreConfirmed(false); restoreKey.current = crypto.randomUUID(); }}>{t("undoDeletion")}</Button>}
            {eligible && <Button variant="outline" size="xs" className="!border-red-200 !text-red-700 hover:!bg-red-50" onClick={() => { setError(""); setDeleteTarget(workspace); setPassword(""); setConfirmed(false); requestKey.current = crypto.randomUUID(); }}>{t("deleteWorkspace")}</Button>}
          </div>
        </li>;
      })}</ul> : <EmptyState size="sm" title={t("empty")} className="px-4" />}
    </section>

    <FloatingDialog isOpen={!!deleteTarget} title={t("deleteWorkspace")} closeLabel={t("close")} onClose={closeDelete} busy={busy} width={520} height={500} onSubmit={event => { event.preventDefault(); void scheduleDeletion(); }} footer={<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={closeDelete}>{t("cancel")}</Button><Button type="submit" variant="cancel" disabled={busy || !password || !confirmed} isLoading={busy}>{t("scheduleDeletion")}</Button></div>}>
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      <div className="space-y-5">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-[13px] leading-5 text-red-900"><p className="font-semibold">{t("permanentWorkspaceDeletionWarningTitle")}</p><p className="mt-2">{t("permanentWorkspaceDeletionWarning", { name: deleteTarget?.name, days: 90 })}</p><p className="mt-2">{t("subscriptionCancellationWarning")}</p></div>
        <Input kind="text" type="password" autoComplete="current-password" label={t("currentPassword")} value={password} onChange={event => setPassword(event.target.value)} required disabled={busy}/>
        <label className="flex items-start gap-2 text-xs leading-5 text-slate-700"><Checkbox checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={busy}/>{t("confirmPermanentDeletion")}</label>
      </div>
    </FloatingDialog>

    <FloatingDialog isOpen={!!restoreTarget} title={t("restoreWorkspace")} closeLabel={t("close")} onClose={closeRestore} busy={busy} width={520} height={500} onSubmit={event => { event.preventDefault(); void restoreWorkspace(); }} footer={<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={closeRestore}>{t("cancel")}</Button><Button type="submit" variant="primary" disabled={busy || !restorePassword || !restoreConfirmed} isLoading={busy}>{t("restoreWorkspaceAction")}</Button></div>}>
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      <div className="space-y-5">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[13px] leading-5 text-amber-900"><p className="font-semibold">{t("restoreWorkspace")}</p><p className="mt-2">{t("restoreWorkspaceWarning")}</p></div>
        <Input kind="text" type="password" autoComplete="current-password" label={t("currentPassword")} value={restorePassword} onChange={event => setRestorePassword(event.target.value)} required disabled={busy}/>
        <label className="flex items-start gap-2 text-xs leading-5 text-slate-700"><Checkbox checked={restoreConfirmed} onChange={event => setRestoreConfirmed(event.target.checked)} disabled={busy}/>{t("restoreWorkspaceConfirm")}</label>
      </div>
    </FloatingDialog>
    </div>
  </main>;
}
