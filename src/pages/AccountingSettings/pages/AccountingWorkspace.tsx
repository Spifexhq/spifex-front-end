import { SettingsModalForm } from "@/shared/ui/Settings/SettingsModalContent";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/api/requests";
import { fetchAllCursor } from "@/lib/list";
import { useAuthContext } from "@/hooks/useAuth";
import AccountExplorer from "@/components/Accounting/AccountExplorer";
import LedgerAccountModal from "@/pages/LedgerAccountSettings/components/LedgerAccountModal";
import type { AddLedgerAccountRequest, LedgerAccount } from "@/models/settings/ledgerAccounts";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { Select } from "@/shared/ui/Select";

type Status = "all" | "true" | "false";
export default function AccountingWorkspace() {
  const { t } = useTranslation("accountingSettings");
  const { isOwner, permissions } = useAuthContext();
  const canView = isOwner || permissions.includes("view_ledger_account");
  const canAdd = isOwner || permissions.includes("add_ledger_account");
  const canEdit = isOwner || permissions.includes("change_ledger_account");
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState<Status>("true");
  const [revision, setRevision] = useState(0);
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
  const [modal, setModal] = useState<{ account: LedgerAccount | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const statusOptions = [
    { value: "true" as const, label: t("chartPage.active", "Active accounts") },
    { value: "false" as const, label: t("chartPage.inactive", "Inactive accounts") },
    { value: "all" as const, label: t("chartPage.all", "All accounts") },
  ];
  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchAllCursor<LedgerAccount>(params => api.getLedgerAccounts({ ...params, q: appliedSearch || undefined, ...(status === "all" ? {} : { active: status }) }))
      .then(items => { if (!cancelled) setAccounts(items); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [canView, appliedSearch, status, revision]);
  const parentOptions = useMemo(() => accounts.filter(account => account.account_type === "header" && account.id !== modal?.account?.id).map(account => ({ value: account.id, label: `${account.code} — ${account.name}` })), [accounts, modal]);
  const save = useCallback(async (payload: AddLedgerAccountRequest) => {
    setSaving(true);
    try {
      if (modal?.account) await api.editLedgerAccount(modal.account.id, payload);
      else await api.addLedgerAccount(payload);
      setModal(null);
      setRevision(value => value + 1);
    } finally { setSaving(false); }
  }, [modal]);
  if (!canView) return <p className="py-8 text-sm text-gray-500">{t("chartPage.noAccess", "You do not have permission to view the chart of accounts.")}</p>;
  return <section className="min-w-0 space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="mt-1 text-xs leading-5 text-gray-500">{t("chartPage.description", "Review the accounts used by your accounting books and posting rules.")}</p></div>{canAdd && <Button onClick={() => setModal({ account: null })}>{t("workspace.newAccount", "New account")}</Button>}</header>
    <SettingsModalForm className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); setAppliedSearch(search); }}>
      <div className="min-w-[160px] flex-1"><Input kind="text" label={t("common.search", "Search")} value={search} onChange={event => setSearch(event.target.value)} /></div>
      <div className="w-44"><Select label={t("chartPage.status", "Account status")} items={statusOptions} selected={statusOptions.filter(option => option.value === status)} onChange={selected => setStatus(selected[0]?.value ?? "true")} getItemKey={option => option.value} getItemLabel={option => option.label} singleSelect hideCheckboxes /></div>
      <Button type="submit">{t("common.search", "Search")}</Button>
    </SettingsModalForm>
    {error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-5 text-sm text-gray-600"><p>{t("workspace.loadError", "Unable to load ledger accounts.")}</p><Button variant="outline" onClick={() => setRevision(value => value + 1)}>{t("redesign.retry", "Try again")}</Button></div> : loading && !accounts.length ? <PageSkeleton rows={8} /> : <AccountExplorer items={accounts} editable={canEdit} viewMode={viewMode} onViewModeChange={setViewMode} onEdit={canEdit ? account => setModal({ account }) : undefined} />}
    <LedgerAccountModal isOpen={!!modal} mode={modal?.account ? "edit" : "create"} initial={modal?.account} parentOptions={parentOptions} busy={saving} onClose={() => setModal(null)} onSubmit={save} />
  </section>;
}
