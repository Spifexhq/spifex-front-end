// src/hooks/useBanks.ts
import { useEffect, useMemo, useState } from "react";
import { api } from "src/api/requests";
import type { BankAccount } from "@/models/enterprise_structure/domain";

type State = {
  banks: BankAccount[];
  totalConsolidatedBalance: number;
  loading: boolean;
  error: string | null;
};

// Tune TTL to your needs
const TTL_MS = 5 * 60_000;

// In-memory cache + single-flight
const cache = new Map<string, { banks: BankAccount[]; total: number; ts: number }>();
const inFlight = new Map<string, Promise<{ banks: BankAccount[]; total: number }>>();

// If you can read the real org id, append it here for multi-org apps
const ORG_KEY = "banks:default";
const LS_KEY = `__banks_cache__:${ORG_KEY}`;

function toKey(id: unknown) { return String(id); }

function computeTotal(list: BankAccount[]) {
  return list.reduce((s, b) => s + Number(b.consolidated_balance ?? 0), 0);
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { banks: BankAccount[]; total: number; ts: number };
    if (!parsed?.banks || typeof parsed.total !== "number" || typeof parsed.ts !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(data: { banks: BankAccount[]; total: number; ts: number }) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // keep silent if localStorage is unavailable/quota exceeded
    void 0; // (no-empty) appeaser
  }
}

type HttpLikeError = {
  response?: {
    status?: number;
    headers?: Record<string, string | string[] | undefined>;
  };
};

// Backoff wrapper specifically for 429
async function getAllBanksWithBackoff() {
  let delay = 300;        // ms
  const maxDelay = 5000;  // ms
  const maxTries = 5;

  for (let attempt = 0; attempt < maxTries; attempt++) {
    try {
      const { data } = await api.getAllBanks(); // Paginated<BankAccount>
      return data;
    } catch (err: unknown) {
      const e = err as HttpLikeError;
      const status = e.response?.status ?? 0;
      if (status === 429 && attempt < maxTries - 1) {
        const raHeader = e.response?.headers?.["retry-after"];
        const ra = Array.isArray(raHeader) ? raHeader[0] : raHeader;
        const wait = ra && !Number.isNaN(Number(ra))
          ? Number(ra) * 1000
          : delay + Math.floor(Math.random() * delay);
        await new Promise((r) => setTimeout(r, wait));
        delay = Math.min(delay * 2, maxDelay);
        continue;
      }
      throw err; // not 429 or out of retries
    }
  }
  throw new Error("Falha ao carregar bancos (limite de tentativas).");
}

async function fetchAllBanksOnce(orgKey: string, force = false) {
  const now = Date.now();
  const cached = cache.get(orgKey);
  if (!force && cached && now - cached.ts < TTL_MS) {
    return { banks: cached.banks, total: cached.total };
  }
  if (inFlight.has(orgKey)) return inFlight.get(orgKey)!;

  const p = (async () => {
    const data = await getAllBanksWithBackoff();
    const list: BankAccount[] = data?.results ?? [];
    const total = computeTotal(list);
    const payload = { banks: list, total, ts: Date.now() };
    cache.set(orgKey, payload);
    saveToStorage(payload);
    inFlight.delete(orgKey);
    return { banks: list, total };
  })().catch((err) => {
    inFlight.delete(orgKey);
    throw err;
  });

  inFlight.set(orgKey, p);
  return p;
}

export function useBanks(
  selectedBankIds?: Array<string | number>,
  refreshKey: number = 0 // pass a bump here to force refresh after transfers
) {
  const [state, setState] = useState<State>({
    banks: [],
    totalConsolidatedBalance: 0,
    loading: true,
    error: null,
  });

  // stable fingerprint of selection
  const selectedKey = useMemo(
    () => JSON.stringify(selectedBankIds ?? []),
    [selectedBankIds]
  );

  useEffect(() => {
    let alive = true;
    const now = Date.now();

    // 1) Serve from disk/memory instantly
    const disk = cache.get(ORG_KEY) ?? loadFromStorage();
    let fresh = false;

    if (disk) {
      // Pre-warm in-memory cache so other components/effects see it
      cache.set(ORG_KEY, disk);

      const age = now - disk.ts;
      fresh = age < TTL_MS;

      const filtered = !selectedBankIds?.length
        ? disk.banks
        : disk.banks.filter((b) => new Set(selectedBankIds.map(toKey)).has(toKey(b.id)));
      const filteredTotal = computeTotal(filtered);

      setState({
        banks: filtered,
        totalConsolidatedBalance: filteredTotal,
        loading: false,
        error: null,
      });
    } else {
      setState((s) => ({ ...s, loading: true }));
    }

    // 2) Revalidate ONLY if:
    //    - no cache; or
    //    - cache is stale; or
    //    - caller asked to force via refreshKey
    const mustRevalidate = !fresh || Boolean(refreshKey);

    if (!mustRevalidate) return () => { alive = false; };

    (async () => {
      try {
        const { banks } = await fetchAllBanksOnce(ORG_KEY, Boolean(refreshKey));
        if (!alive) return;

        const filtered = !selectedBankIds?.length
          ? banks
          : banks.filter((b) => new Set(selectedBankIds.map(toKey)).has(toKey(b.id)));
        const filteredTotal = computeTotal(filtered);

        setState({
          banks: filtered,
          totalConsolidatedBalance: filteredTotal,
          loading: false,
          error: null,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erro ao carregar bancos";
        if (!alive) return;
        setState((s) => ({ ...s, loading: false, error: message }));
      }
    })();

    return () => { alive = false; };
  }, [selectedKey, selectedBankIds, refreshKey]);

  return state;
}
