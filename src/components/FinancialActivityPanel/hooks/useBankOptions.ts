import { useEffect, useState } from "react";
import { api } from "@/core/api/requests";
import type { BankAccountTableRow, GetBanksTableParams } from "@/models/settings/banking";

export function useBankOptions(bankActive?: boolean, enabled = true) {
  const [banks, setBanks] = useState<BankAccountTableRow[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    (async () => {
      try {
        const payload: GetBanksTableParams = {};
        if (bankActive !== undefined) payload.active = bankActive;

        const { data } = await api.getBanksTable(payload);
        if (!alive) return;

        setBanks(Array.isArray(data?.banks) ? data.banks : []);
      } catch (err) {
        console.error("Failed to load banks options:", err);
        if (!alive) return;
        setBanks([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [bankActive, enabled]);

  return banks;
}
