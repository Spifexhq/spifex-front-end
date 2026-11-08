import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/hooks/useAuth";
import { personalApi } from "../services/api";
import { usePersonalReadRevision } from "./usePersonalReadRevision";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import type { CashflowBalance } from "@/shared/financial/types";

export function useCashflowBalance(enabled: boolean, filters: Record<string, string>, revision = 0, basis: "outstanding" | "settled" = "outstanding") {
  const { organization, permissions, isOwner, isSubscribed } = useAuthContext();
  const readRevision = usePersonalReadRevision();
  const { t } = useTranslation("personal");
  const identity = JSON.stringify([organization?.organization?.id, organization?.organization?.lifecycle, permissions, isOwner, isSubscribed]);
  const query = JSON.stringify({ ...filters, basis });
  const [snapshot, setSnapshot] = useState<{ identity: string; data: CashflowBalance } | null>(null);
  const [loading, setLoading] = useState(enabled), [error, setError] = useState("");
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoading(true); setError("");
    const load = async () => {
      for (let attempt = 0;; attempt++) {
        try { return await personalApi.summary(JSON.parse(query)); }
        catch (cause) { if (!active || attempt >= 2 || (cause as { code?: string }).code !== "ERR_CANCELED") throw cause; }
      }
    };
    void load().then(result => { if (active) setSnapshot({ identity, data: result.data }); }).catch(cause => { if (active) setError(apiErrorMessage(cause, t("error"))); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [enabled, identity, query, revision, readRevision, t]);
  return { data: enabled && snapshot?.identity === identity ? snapshot.data : null, loading, error };
}
