// src/hooks/useCursorPager.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type FetchPage<T> = (cursor?: string, pageSize?: number) => Promise<{
  items: T[];
  nextCursor?: string;
  totalCount?: number;
}>;

export type UseCursorPagerOptions = {
  /** Load first page automatically */
  autoLoadFirst?: boolean;
  /** External deps that should reset & reload page 0 when they change (shallow compare) */
  deps?: unknown[];
};

export type UseCursorPagerReturn<T> = {
  items: T[];
  pageSize: number;
  setPageSize(size: number): void;
  totalCount?: number;
  index: number;
  knownPages: number;
  reachedEnd: boolean;

  loading: boolean;
  error: string | null;

  prev: () => Promise<void>;
  next: () => Promise<void>;
  goto: (index: number) => Promise<void>;
  refresh: () => Promise<void>;

  canPrev: boolean;
  canNext: boolean;
};

export function useCursorPager<T>(
  fetchPage: FetchPage<T>,
  opts: UseCursorPagerOptions = {}
): UseCursorPagerReturn<T> {
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  const refreshPromise = useRef<Promise<void> | null>(null);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState<number>();
  const { autoLoadFirst = true, deps = [] } = opts;

  /** ---------- Internal refs (source of truth, no staleness) ---------- */
  const pagesRef = useRef<Array<{ items: T[]; nextCursor?: string }>>([]);
  const tokensRef = useRef<Array<string | undefined>>([undefined]);
  const reachedEndRef = useRef(false);
  const indexRef = useRef(0);
  const loadingRef = useRef(false);

  /** ---------- State for rendering ---------- */
  const [items, setItems] = useState<T[]>([]);
  const [index, setIndex] = useState(0);
  const [knownPages, setKnownPages] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // keep indexRef in sync with state
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const syncDerivedState = useCallback(() => {
    setKnownPages(pagesRef.current.length);
    setReachedEnd(reachedEndRef.current);
  }, []);

  /** Load page `i` if missing. Returns true if it exists after the call. */
  const ensurePage = useCallback(
    async (i: number): Promise<boolean> => {
      if (pagesRef.current[i]) return true;

      const startToken = tokensRef.current[i];
      if (i > 0 && startToken == null) {
        // we tried to go beyond the end
        reachedEndRef.current = true;
        syncDerivedState();
        return false;
      }

      loadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const { items, nextCursor, totalCount } = await fetchRef.current(startToken, pageSize);
        setTotalCount(totalCount ?? (!nextCursor ? i * pageSize + items.length : undefined));

        const p = pagesRef.current.slice();
        p[i] = { items, nextCursor };
        pagesRef.current = p;

        const t = tokensRef.current.slice();
        t[i + 1] = nextCursor;
        tokensRef.current = t;

        if (!nextCursor) {
          reachedEndRef.current = true;
        }

        if (i === indexRef.current) {
          setItems(items);
        }

        syncDerivedState();
        setError(null);
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load data.";
        setError(msg);
        return false;
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [syncDerivedState, pageSize]
  );

  /** Go to target page (load if needed). */
  const goto = useCallback(
    async (target: number) => {
      if (target < 0) return;
      const ok = await ensurePage(target);
      if (!ok) return;

      const page = pagesRef.current[target];
      if (!page) return;

      setIndex(target);
      setItems(page.items);
      syncDerivedState();
    },
    [ensurePage, syncDerivedState]
  );

  const next = useCallback(async () => {
    if (loadingRef.current) return;
    const target = indexRef.current + 1;
    await goto(target);
  }, [goto]);

  const prev = useCallback(async () => {
    if (loadingRef.current) return;
    const target = indexRef.current - 1;
    if (target < 0) return;

    await ensurePage(target);
    const page = pagesRef.current[target];
    if (!page) return;

    setIndex(target);
    setItems(page.items);
    syncDerivedState();
  }, [ensurePage, syncDerivedState]);

  const refreshInternal = useCallback(async () => {
    pagesRef.current = [];
    tokensRef.current = [undefined];
    reachedEndRef.current = false;
    indexRef.current = 0;

    setIndex(0);
    setItems([]);
    setKnownPages(0);
    setReachedEnd(false);
    setError(null);

    await ensurePage(0);
    const first = pagesRef.current[0];
    if (first) {
      setIndex(0);
      setItems(first.items);
      syncDerivedState();
    }
  }, [ensurePage, syncDerivedState]);

  // Several settings pages refresh on mount as well as enabling auto-load.
  // Share that request; a second request used to trip their in-flight guard,
  // cache an empty page, and incorrectly mark pagination as finished.
  const refresh = useCallback((): Promise<void> => {
    if (refreshPromise.current) return refreshPromise.current;
    const request = refreshInternal().finally(() => { refreshPromise.current = null; });
    refreshPromise.current = request;
    return request;
  }, [refreshInternal]);

  /** ========= Effects without spread-in-deps ========= */

  // 1) Initial auto-load (and when autoLoadFirst flag toggles)
  useEffect(() => {
    if (!autoLoadFirst) return;
    void refresh();
  }, [autoLoadFirst, refresh]);

  // 2) Reset and reload when external deps (array) change — shallow compare
  const prevDepsRef = useRef<unknown[]>(deps);
  useEffect(() => {
    const prev = prevDepsRef.current;
    const curr = deps;
    const changed =
      prev.length !== curr.length ||
      prev.some((v, i) => !Object.is(v, curr[i]));

    if (changed) {
      prevDepsRef.current = curr;
      void refresh();
    }
  }, [deps, refresh]);

  /** UI booleans */
  const canPrev = useMemo(() => index > 0 && !loading, [index, loading]);
  const canNext = useMemo(
    () =>
      !loading &&
      (
        index < pagesRef.current.length - 1 ||
        !reachedEndRef.current
      ),
    [index, loading]
  );

  return {
    pageSize, setPageSize, totalCount,
    items,
    index,
    knownPages,
    reachedEnd,

    loading,
    error,

    prev,
    next,
    goto,
    refresh,

    canPrev,
    canNext,
  };
}
