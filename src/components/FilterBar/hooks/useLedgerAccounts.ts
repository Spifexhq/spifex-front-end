import { useEffect, useState } from "react";
import { api } from "@/api/requests";
import { fetchAllCursor } from "@/lib/list";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";

export function useLedgerAccounts() {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const all = await fetchAllCursor<LedgerAccount>(api.getLedgerAccounts);
        if (!alive) return;
        setAccounts(all);
      } catch (err) {
        console.error("Failed to load GL Accounts", err);
        if (!alive) return;
        setAccounts([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return accounts;
}
