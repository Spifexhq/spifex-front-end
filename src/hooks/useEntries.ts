import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "src/api/requests";
import { getCursorFromUrl } from "src/lib/list";
import type { Entry } from "src/models/entries/domain";
import type { GetEntryRequest, GetEntryResponse } from "src/models/entries/dto"; // adjust if types live elsewhere

// ----- Tunables -----
const TTL_MS = 30_000;          // cache per query for 30s
const MIN_GAP_MS = 200;         // small client-side rate-limit gap
const MAX_TRIES = 5;            // 429 retry limit
const MAX_BACKOFF_MS = 5000;    // backoff cap

// If you can read the org here, add it to the key (recommended):
// import { getOrgExternalId } from "src/api/requests";
// const ORG_KEY = getOrgExternalId();
const ORG_KEY = "org:default";

// ----- In-memory caches (module-scoped → shared across components) -----
type PageResp = { data: GetEntryResponse };
type QueryAgg = { ts: number; entries: Entry[]; nextCursor: string | null };

const pageCache = new Map<string, PageResp>();   // key: queryKey + "&cursor=..."
const queryCache = new Map<string, QueryAgg>();  // key: queryKey (no cursor)
const inFlight = new Map<string, Promise<PageResp>>(); // single-flight per page key

// Global rate-limit gate for entries
let gate: Promise<void> = Promise.resolve();
let lastCallAt = 0;

// ----- Helpers -----
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function toKeyPart(obj: Record<string, unknown>) {
  const clean: Record<string, string> = {};
  Object.keys(obj)
    .filter((k) => obj[k] !== undefined && obj[k] !== null && obj[k] !== "")
    .sort()
    .forEach((k) => {
      const v = obj[k];
      if (Array.isArray(v)) clean[k] = v.join(",");
      else clean[k] = String(v as unknown as string);
    });
  return new URLSearchParams(clean).toString();
}

function makeQueryKey(base: Omit<GetEntryRequest, "cursor">): string {
  return `${ORG_KEY}|entries?${toKeyPart(base as unknown as Record<string, unknown>)}`;
}

function makePageKey(queryKey: string, cursor: string | null | undefined) {
  return cursor ? `${queryKey}&cursor=${cursor}` : queryKey;
}

async function rateLimited<T>(fn: () => Promise<T>): Promise<T> {
  gate = gate.then(async () => {
    const now = Date.now();
    const delta = now - lastCallAt;
    if (delta < MIN_GAP_MS) await sleep(MIN_GAP_MS - delta);
    lastCallAt = Date.now();
  });
  await gate;
  return fn();
}

type HttpLikeError = {
  response?: { status?: number; headers?: Record<string, string | string[] | undefined> };
};

async function requestWithBackoff(payload: GetEntryRequest): Promise<PageResp> {
  let delay = 300;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    try {
      return await rateLimited(() => api.getEntries(payload) as unknown as Promise<PageResp>);
    } catch (e: unknown) {
      const err = e as HttpLikeError;
      const status = err?.response?.status ?? 0;
      if (status === 429 && attempt < MAX_TRIES - 1) {
        const raHeader = err.response?.headers?.["retry-after"];
        const ra = Array.isArray(raHeader) ? raHeader[0] : raHeader;
        const wait = ra && !Number.isNaN(Number(ra))
          ? Number(ra) * 1000
          : delay + Math.floor(Math.random() * delay);
        await sleep(wait);
        delay = Math.min(delay * 2, MAX_BACKOFF_MS);
        continue;
      }
      throw e;
    }
  }
  throw new Error("Limite de requisições atingido para entries.");
}

async function getPage(
  baseKey: string,
  pageKey: string,
  payload: GetEntryRequest
): Promise<PageResp> {
  // cache
  if (pageCache.has(pageKey)) return pageCache.get(pageKey)!;

  // single-flight
  if (inFlight.has(pageKey)) return inFlight.get(pageKey)!;

  const p = (async () => {
    const res = await requestWithBackoff(payload);
    pageCache.set(pageKey, res);
    inFlight.delete(pageKey);
    return res;
  })().catch((err) => {
    inFlight.delete(pageKey);
    throw err;
  });

  inFlight.set(pageKey, p);
  return p;
}

// ----- Hook -----
type UseEntriesArgs = {
  basePayload: Omit<GetEntryRequest, "cursor">; // you pass start/end/filters here (no cursor)
  enabled?: boolean;
  refreshKey?: number;   // bump this to force a revalidate (ignores TTL)
  cacheTtlMs?: number;   // override TTL if needed
};

type UseEntriesReturn = {
  entries: Entry[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor: string | null;
  fetchMore: () => Promise<void>;
  refetch: () => Promise<void>;       // reset & load first page fresh
  reset: () => void;                  // clear data without fetching
};

export function useEntries({
  basePayload,
  enabled = true,
  refreshKey = 0,
  cacheTtlMs = TTL_MS,
}: UseEntriesArgs): UseEntriesReturn {
  const queryKey = useMemo(() => makeQueryKey(basePayload), [basePayload]);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);

  // serve cached aggregate instantly (if fresh)
  useEffect(() => {
    if (!enabled) return;

    const cached = queryCache.get(queryKey);
    if (cached && Date.now() - cached.ts < cacheTtlMs) {
      setEntries(cached.entries);
      setNextCursor(cached.nextCursor);
      setHasMore(Boolean(cached.nextCursor));
      setLoading(false);
      setError(null);
    } else {
      setEntries([]);
      setNextCursor(null);
      setHasMore(false);
      setLoading(true);
      setError(null);
    }

    // always revalidate (single-flight & backoff make it gentle)
    (async () => {
      try {
        if (!enabled) return;

        const pageKey = makePageKey(queryKey, undefined);
        const { data } = await getPage(queryKey, pageKey, { ...basePayload });

        // dedupe by id
        const seen = new Set<number>();
        const first = (data.results ?? []).filter((e) => !seen.has(e.id) && (seen.add(e.id), true));

        const nxt = data.next ? getCursorFromUrl(data.next) : null;

        if (!aliveRef.current) return;
        setEntries(first);
        setNextCursor(nxt);
        setHasMore(Boolean(nxt));
        setLoading(false);
        setError(null);

        queryCache.set(queryKey, { ts: Date.now(), entries: first, nextCursor: nxt });
      } catch (e: unknown) {
        if (!aliveRef.current) return;
        setLoading(false);
        setError(e instanceof Error ? e.message : "Erro ao carregar lançamentos.");
      }
    })();
  }, [queryKey, enabled, cacheTtlMs, refreshKey, basePayload]);

  const fetchMore = useCallback(async () => {
    if (!enabled || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const cursor = nextCursor ?? undefined;
      const pageKey = makePageKey(queryKey, cursor ?? undefined);
      const { data } = await getPage(queryKey, pageKey, { ...basePayload, cursor });

      const nxt = data.next ? getCursorFromUrl(data.next) : null;

      // merge + dedupe
      setEntries((prev) => {
        const set = new Set(prev.map((e) => e.id));
        const incoming = (data.results ?? []).filter((e) => !set.has(e.id));
        const merged = prev.concat(incoming);

        // update aggregate cache
        queryCache.set(queryKey, { ts: Date.now(), entries: merged, nextCursor: nxt });
        return merged;
      });

      setNextCursor(nxt);
      setHasMore(Boolean(nxt));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao carregar lançamentos.");
    } finally {
      setLoadingMore(false);
    }
  }, [enabled, hasMore, loadingMore, nextCursor, queryKey, basePayload]);

  const refetch = useCallback(async () => {
    // ignore TTL and refresh the first page
    setLoading(true);
    setError(null);
    try {
      const pageKey = makePageKey(queryKey, undefined);
      // bypass pageCache by removing first page (keeps rest)
      pageCache.delete(pageKey);

      const { data } = await getPage(queryKey, pageKey, { ...basePayload });
      const seen = new Set<number>();
      const first = (data.results ?? []).filter((e) => !seen.has(e.id) && (seen.add(e.id), true));
      const nxt = data.next ? getCursorFromUrl(data.next) : null;

      setEntries(first);
      setNextCursor(nxt);
      setHasMore(Boolean(nxt));
      setError(null);

      queryCache.set(queryKey, { ts: Date.now(), entries: first, nextCursor: nxt });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao recarregar lançamentos.");
    } finally {
      setLoading(false);
    }
  }, [queryKey, basePayload]);

  const reset = useCallback(() => {
    setEntries([]);
    setNextCursor(null);
    setHasMore(false);
    setError(null);
    setLoading(false);
  }, []);

  return { entries, loading, loadingMore, error, hasMore, nextCursor, fetchMore, refetch, reset };
}
