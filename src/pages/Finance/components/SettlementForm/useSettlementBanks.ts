import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/hooks/useAuth";
import { api } from "@/api/requests";
import { fetchAllCursor } from "@/lib/list";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import type { BankAccount } from "@/models/settings/banking";

export function useSettlementBanks(open: boolean, refreshKey = 0) {
  const { t } = useTranslation("banksTable");
  const organization = useAuthContext().organization?.organization?.id;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ scope?: string; banks: BankAccount[]; loading: boolean; error: string | null }>({ banks: [], loading: true, error: null });
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setState({ scope: organization, banks: [], loading: true, error: null });
    void fetchAllCursor<BankAccount>(params => api.getBanks({ cursor: params.cursor, active: "true" }))
      .then(banks => { if (alive) setState({ scope: organization, banks, loading: false, error: null }); })
      .catch(cause => { if (alive) setState({ scope: organization, banks: [], loading: false, error: apiErrorMessage(cause, t("loadError")) }); });
    return () => { alive = false; };
  }, [open, organization, attempt, refreshKey, t]);
  return { banksData: state.scope === organization ? state : { banks: [], loading: true, error: null }, retryBanks: () => setAttempt(value => value+1) };
}
