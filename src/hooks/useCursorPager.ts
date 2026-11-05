import { useCallback, useEffect, useRef, useState } from "react";
export type FetchPage<T, M = unknown> = (cursor?: string, pageSize?: number) => Promise<{
    items: T[];
    nextCursor?: string;
    totalCount?: number;
    metadata?: M;
}>;
export type UseCursorPagerOptions = {
    autoLoadFirst?: boolean;
    deps?: unknown[];
    accumulate?: boolean;
};
export type UseCursorPagerReturn<T, M = unknown> = {
    items: T[];
    metadata?: M;
    pageSize: number;
    setPageSize(size: number): void;
    totalCount?: number;
    index: number;
    knownPages: number;
    reachedEnd: boolean;
    loading: boolean;
    error: string | null;
    prev(): Promise<void>;
    next(): Promise<void>;
    goto(index: number): Promise<void>;
    refresh(): Promise<void>;
    canPrev: boolean;
    canNext: boolean;
};
/** Cursor cache, request coalescing and stale-response protection shared by every list. */
export function useCursorPager<T, M = unknown>(fetchPage: FetchPage<T, M>, opts: UseCursorPagerOptions = {}): UseCursorPagerReturn<T, M> {
    const fetchRef = useRef(fetchPage);
    fetchRef.current = fetchPage;
    const [pageSize, setPageSize] = useState(20), [items, setItems] = useState<T[]>([]), [metadata, setMetadata] = useState<M>(), [totalCount, setTotal] = useState<number>(), [index, setIndex] = useState(0), [loading, setLoading] = useState(false), [error, setError] = useState<string | null>(null), [knownPages, setKnown] = useState(0), [reachedEnd, setEnd] = useState(false), [hasNext, setNext] = useState(false);
    const pages = useRef(new Map<number, {
        items: T[];
        nextCursor?: string;
        totalCount?: number;
        metadata?: M;
    }>());
    const generation = useRef(0), busy = useRef(false), currentIndex = useRef(0), pending = useRef(new Map<string, Promise<void>>()), refreshing = useRef<{
        version: number;
        promise: Promise<void>;
    } | null>(null);
    const settings = useRef({ pageSize, accumulate: opts.accumulate });
    settings.current = { pageSize, accumulate: opts.accumulate };
    const load = useCallback((page: number, cursor?: string): Promise<void> => {
        const version = generation.current, key = `${version}:${page}`;
        const existing = pending.current.get(key);
        if (existing)
            return existing;
        busy.current = true;
        setLoading(true);
        setError(null);
        const request = (async () => {
            try {
                const result = await fetchRef.current(cursor, settings.current.pageSize);
                if (version !== generation.current)
                    return;
                if (cursor && result.nextCursor === cursor)
                    throw new Error("Repeated pagination cursor.");
                pages.current.set(page, result);
                currentIndex.current = page;
                setIndex(page);
                const loadedItems = [...pages.current.entries()].sort((a, b) => a[0] - b[0]).flatMap(([, value]) => value.items);
                setItems(settings.current.accumulate ? loadedItems : result.items);
                setMetadata(result.metadata);
                // An endpoint may enforce a different batch size from the one requested.
                // Infinite lists can count actual responses once the final cursor is reached.
                setTotal(previous => result.totalCount ?? (!result.nextCursor
                    ? settings.current.accumulate ? loadedItems.length : page * settings.current.pageSize + result.items.length
                    : previous));
                setNext(!!result.nextCursor);
                setKnown(pages.current.size);
                setEnd(!result.nextCursor);
            }
            catch (cause) {
                if (version === generation.current)
                    setError(cause instanceof Error ? cause.message : "Unable to load records.");
            }
            finally {
                pending.current.delete(key);
                if (version === generation.current) {
                    busy.current = false;
                    setLoading(false);
                }
            }
        })();
        pending.current.set(key, request);
        return request;
    }, []);
    const refresh = useCallback(() => {
        if (refreshing.current?.version === generation.current)
            return refreshing.current.promise;
        generation.current++;
        const version = generation.current;
        pages.current.clear();
        currentIndex.current = 0;
        setIndex(0);
        setItems([]);
        setTotal(undefined);
        setMetadata(undefined);
        setKnown(0);
        setNext(false);
        setEnd(false);
        const promise = load(0).finally(() => { if (refreshing.current?.version === version)
            refreshing.current = null; });
        refreshing.current = { version, promise };
        return promise;
    }, [load]);
    const goto = useCallback(async (page: number) => {
        if (page < 0 || busy.current)
            return;
        const cached = pages.current.get(page);
        if (cached) {
            currentIndex.current = page;
            setIndex(page);
            setItems(cached.items);
            setMetadata(cached.metadata);
            setTotal(previous => cached.totalCount ?? previous ?? (!cached.nextCursor ? page * settings.current.pageSize + cached.items.length : undefined));
            setNext(!!cached.nextCursor);
            setEnd(!cached.nextCursor);
            return;
        }
        const cursor = pages.current.get(page - 1)?.nextCursor;
        if (page === 0 || cursor)
            await load(page, cursor);
    }, [load]);
    const signature = JSON.stringify([opts.autoLoadFirst ?? true, pageSize, opts.deps ?? [], !!opts.accumulate]);
    const auto = opts.autoLoadFirst ?? true;
    const invalidate = useCallback(() => { generation.current++; refreshing.current = null; busy.current = false; }, []);
    useEffect(() => { invalidate(); if (auto)
        void refresh();
    else {
        setLoading(false);
        setItems([]);
    } return invalidate; }, [signature, auto, refresh, invalidate]);
    return { items, metadata, pageSize, setPageSize, totalCount, index, knownPages, reachedEnd, loading, error, refresh, goto, prev: () => goto(currentIndex.current - 1), next: () => goto(currentIndex.current + 1), canPrev: index > 0 && !loading, canNext: hasNext && !loading };
}
