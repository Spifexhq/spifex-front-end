import { accountingErrorMessage } from "../accountingError";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { fetchAllCursor } from "@/lib/list";
import type { AddLedgerAccountRequest, LedgerAccount } from "@/models/settings/ledgerAccounts";
import { useAccountingSetup } from "../setup/useAccountingSetup";

export function useChartAccounts() {
  const { isOwner, isSuperUser, permissions } = useAuthContext();
  const { refresh: refreshSetup } = useAccountingSetup();
  const can = (code: string) => isOwner || isSuperUser || permissions.includes(code);
  const canView = can("view_ledger_account");
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const current = ++sequence.current;
    if (!canView) { setAccounts([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const items = await fetchAllCursor<LedgerAccount>(params => api.getLedgerAccounts(params));
      if (current === sequence.current) setAccounts(items);
    } catch (cause) {
      if (current === sequence.current) setError(accountingErrorMessage(cause, ""));
    } finally { if (current === sequence.current) setLoading(false); }
  }, [canView]);
  const cancel = useCallback(() => { sequence.current++; }, []);
  useEffect(() => { void reload(); return cancel; }, [reload, cancel]);
  const save = async (account: LedgerAccount | null, payload: AddLedgerAccountRequest) => {
    if (busy) return false;
    setBusy(true); setError(null);
    try {
      const response = account ? await api.editLedgerAccount(account.id, payload) : await api.addLedgerAccount(payload);
      setAccounts(previous => [...previous.filter(item => item.id !== response.data.id), response.data]);
      return true;
    } catch (cause) {
      setError(accountingErrorMessage(cause, ""));
      throw cause;
    } finally { setBusy(false); }
  };
  const remove = async (account?: LedgerAccount) => {
    if (busy) return false;
    setBusy(true); setError(null);
    try {
      if (account) await api.deleteLedgerAccount(account.id);
      else await api.deleteAllLedgerAccounts();
      setAccounts(previous => account ? previous.filter(item => item.id !== account.id) : []);
      await refreshSetup();
      return true;
    } catch (cause) {
      setError(accountingErrorMessage(cause, ""));
      return false;
    } finally { setBusy(false); }
  };
  return { accounts, loading, busy, error, reload, save, remove, canView, canAdd: can("add_ledger_account"), canEdit: can("change_ledger_account"), canDelete: can("delete_ledger_account") };
}
