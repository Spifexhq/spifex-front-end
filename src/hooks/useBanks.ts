// src/hooks/useBanks.ts
import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/requests";
import type { BankAccount } from "@/models/settings/banking";

type State = {
  banks: BankAccount[];
  totalConsolidatedBalance: number;
  loading: boolean;
  error: string | null;
};

function toKey(id: unknown) { return String(id); }
function computeTotal(list: BankAccount[]) {
  return list.reduce((s, b) => s + Number(b.consolidated_balance ?? 0), 0);
}

type HttpLikeError = {
  response?: { status?: number; headers?: Record<string, string | string[] | undefined>; };
};

async function getAllBanksWithBackoff(active?: boolean) {
  let delay = 300;
  const maxDelay = 5000;
  const maxTries = 5;

  for (let attempt = 0; attempt < maxTries; attempt++) {
    try {
      const { data } = await api.getBanks(active);
      return data;
    } catch (err: unknown) {
      const e = err as HttpLikeError;
      const status = e.response?.status ?? 0;
      if (status === 429 && attempt < maxTries - 1) {
        const raHeader = e.response?.headers?.["retry-after"];
        const ra = Array.isArray(raHeader) ? raHeader[0] : raHeader;
        const wait = ra && !Number.isNaN(Number(ra)) ? Number(ra) * 1000 : delay + Math.floor(Math.random() * delay);
        await new Promise((r) => setTimeout(r, wait));
        delay = Math.min(delay * 2, maxDelay);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Failed to load databases (limit of attempts).");
}

/**
  * useBanks
  * @param selectedBankIds optional list of IDs to filter locally
  * @param refreshKey bump for refetch
  * @param active remote filter: true=active, false=inactive, undefined=all
*/
export function useBanks(
  selectedBankIds?: Array<string | number>,
  refreshKey: number = 0,
  active?: boolean
): State {
  const [allBanks, setAllBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await getAllBanksWithBackoff(active);
        const list: BankAccount[] = data?.results ?? [];
        if (!alive) return;
        setAllBanks(list);
        setLoading(false);
      } catch (err: unknown) {
        if (!alive) return;
        const message = err instanceof Error ? err.message : "Error loading banks.";
        setError(message);
        setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [refreshKey, active]);

  const selectedIdsSet = useMemo(
    () => new Set((selectedBankIds ?? []).map(toKey)),
    [selectedBankIds]
  );

  const banks = useMemo(() => {
    if (!selectedBankIds?.length) return allBanks;
    return allBanks.filter((b) => selectedIdsSet.has(toKey(b.id)));
  }, [allBanks, selectedBankIds, selectedIdsSet]);

  const totalConsolidatedBalance = useMemo(() => computeTotal(banks), [banks]);

  return { banks, totalConsolidatedBalance, loading, error };
}
