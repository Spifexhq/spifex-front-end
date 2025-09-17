import { useCallback, useEffect, useMemo, useState } from "react";

export type FetchPageResult<T> = {
  items: T[];
  /** next cursor token; undefined/null means “no next page” */
  nextCursor?: string | null;
};

export type CursorPage<T> = { items: T[]; nextCursor?: string | null };

export type UseCursorPagerOptions = {
  /** auto-load first page on mount/deps change (default: true) */
  autoLoadFirst?: boolean;
  /** reset & refetch when any dependency changes (e.g., search query) */
  deps?: React.DependencyList;
};

export type UseCursorPagerReturn<T> = {
  /** items of the current page */
  items: T[];
  /** 0-based index of the current page */
  index: number;
  /** known page count (doesn’t imply the true total when end not reached) */
  knownPages: number;
  /** true when server indicated there is no next page */
  reachedEnd: boolean;
  /** true while loading the first page or a hard refresh */
  loading: boolean;
  /** last error message (if any) */
  error: string | null;

  /** go to previous page (no-op if already at first) */
  prev: () => Promise<void>;
  /** go to next page (discovers sequentially if needed) */
  next: () => Promise<void>;
  /** go to a specific 0-based index (discovers intermediate pages) */
  goto: (idx: number) => Promise<void>;
  /** reset pagination and (re)load first page */
  refresh: () => Promise<void>;

  /** convenience flags for UI */
  canPrev: boolean;
  canNext: boolean;
};

/**
 * Generic cursor-based pager with arrow-only navigation.
 * - Caches pages & next-cursors.
 * - Discovers intermediate pages when jumping forward.
 * - Safe from “maximum update depth exceeded” loops.
 *
 * IMPORTANT: Pass a **stable** fetcher (wrap with useCallback in the caller).
 */
export function useCursorPager<T>(
  fetchPageFn: (cursor?: string) => Promise<FetchPageResult<T>>,
  options: UseCursorPagerOptions = {}
): UseCursorPagerReturn<T> {
  const { autoLoadFirst = true, deps = [] } = options;

  const [pages, setPages] = useState<Array<CursorPage<T> | undefined>>([]);
  const [pageStartTokens, setPageStartTokens] = useState<Array<string | undefined>>([undefined]); // page 0 starts at undefined
  const [index, setIndex] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(() => pages[index]?.items ?? [], [pages, index]);

  /** low-level fetch for a given page index using its start token */
  const fetchAt = useCallback(
    async (pageIndex: number, startToken: string | undefined) => {
      const res = await fetchPageFn(startToken);
      setPages((prev) => {
        const clone = prev.slice();
        clone[pageIndex] = { items: res.items, nextCursor: res.nextCursor ?? undefined };
        return clone;
      });
      setPageStartTokens((prev) => {
        const clone = prev.slice();
        clone[pageIndex + 1] = (res.nextCursor ?? undefined) || undefined;
        return clone;
      });
      if (!res.nextCursor) setReachedEnd(true);
    },
    [fetchPageFn]
  );

  /** ensure a given page exists by discovering sequentially if needed */
  const ensure = useCallback(
    async (targetIndex: number) => {
      for (let i = 0; i <= targetIndex; i++) {
        if (!pages[i]) {
          const start = pageStartTokens[i];
          if (i > 0 && start == null) break; // cannot discover further; reached end
          await fetchAt(i, start);
        }
      }
    },
    [fetchAt, pages, pageStartTokens]
  );

  /** goto helpers */
  const goto = useCallback(
    async (target: number) => {
      if (target < 0) return;
      const lastKnown = Math.max(0, pages.length - 1);
      const clamped = reachedEnd ? Math.min(target, lastKnown) : target;
      await ensure(clamped);
      const last = Math.max(0, pages.length - 1);
      setIndex(Math.min(clamped, last));
    },
    [ensure, pages.length, reachedEnd]
  );

  const prev = useCallback(async () => {
    if (index > 0) await goto(index - 1);
  }, [goto, index]);

  const next = useCallback(async () => {
    await goto(index + 1);
  }, [goto, index]);

  /** hard refresh: reset and (optionally) load the first page */
  const refresh = useCallback(async () => {
    setLoading(true);
    setPages([]);
    setPageStartTokens([undefined]);
    setIndex(0);
    setReachedEnd(false);
    setError(null);
    if (autoLoadFirst) {
      try {
        await fetchAt(0, undefined);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data.");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [autoLoadFirst, fetchAt]);

  /** initial load + reset on deps change */
  useEffect(() => {
    const alive = true;
    (async () => {
      try {
        setLoading(true);
        setPages([]);
        setPageStartTokens([undefined]);
        setIndex(0);
        setReachedEnd(false);
        setError(null);
        if (autoLoadFirst) await fetchAt(0, undefined);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load data.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAt, autoLoadFirst, ...deps]);

  const knownPages = pages.length || 1;
  const canPrev = index > 0;
  const canNext = !(reachedEnd && index >= knownPages - 1);

  return {
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
