import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import type { AccountingSetupStatus } from "@/models/settings/accountingSetup";
import { AccountingSetupContext } from "./AccountingSetupContext";
export function AccountingSetupProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { organization, isOwner, isSuperUser, permissions } = useAuthContext();
  const organizationId = organization?.organization?.id;
  const [status, setStatus] = useState<AccountingSetupStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState("");
  const [pending, setPending] = useState(true);
  const sequence = useRef(0);
  const drafts = useRef(new Map<string, unknown>());
  const key = `${organizationId}:${pathname}`;
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    setPending(true);
    setError(null);
    try {
      const response = await api.getAccountingSetup();
      if (request === sequence.current) setStatus(response.data);
    } catch (cause) {
      if (request === sequence.current) {
        setStatus(null);
        setError(apiErrorMessage(cause, ""));
      }
    } finally {
      if (request === sequence.current) { setPending(false); setLoadedKey(key); }
    }
  }, [key]);
  const cancel = useCallback(() => { sequence.current++; }, []);
  useEffect(() => { void refresh(); return cancel; }, [refresh, cancel]);
  // Ignore late replies after a workspace switch or navigation.
  return <AccountingSetupContext.Provider value={{ status, loading: pending || loadedKey !== key, error, refresh, drafts: drafts.current, canManage: isOwner || isSuperUser || permissions.includes("change_ledger_account") }}>{children}</AccountingSetupContext.Provider>;
}

