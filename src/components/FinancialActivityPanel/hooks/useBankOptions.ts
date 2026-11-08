import { useEffect, useState } from "react";
import { api } from "@/core/api/requests";
import type { BankAccountTableRow, GetBanksTableParams } from "@/models/settings/banking";
import { personalApi } from "@/products/personal/services/api";
import type { PersonalAccount } from "@/products/personal/types";

export function useBankOptions(bankActive?: boolean, enabled = true, personal = false) {
  const [banks, setBanks] = useState<BankAccountTableRow[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    (async () => {
      try {
        if (personal) {
          const { data } = await personalApi.list<PersonalAccount>("accounts", {
            ...(bankActive !== undefined ? { is_active: bankActive } : {}),
            page: 1,
            page_size: 100,
          });
          if (!alive) return;
          setBanks((data?.results ?? []).map(account => ({
            id: account.id,
            institution: account.institution || account.name,
            branch: account.branch || "",
            account_number: account.account_number || "",
            iban: account.iban || "",
            currency: account.currency,
            is_active: account.is_active,
            consolidated_balance: account.consolidated_balance ?? account.balance ?? null,
          })));
        } else {
          const payload: GetBanksTableParams = {};
          if (bankActive !== undefined) payload.active = bankActive;
          const { data } = await api.getBanksTable(payload);
          if (!alive) return;
          setBanks(Array.isArray(data?.banks) ? data.banks : []);
        }
      } catch (err) {
        console.error("Failed to load banks options:", err);
        if (!alive) return;
        setBanks([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [bankActive, enabled, personal]);

  return banks;
}
