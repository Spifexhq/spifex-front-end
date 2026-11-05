import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/requests";
import { getCursorFromUrl } from "@/lib/list";
import { useCursorPager } from "@/hooks/useCursorPager";
import { useShiftSelect } from "@/hooks/useShiftSelect";
import type { Entry, RecurrenceEntry } from "@/models/entries/entries";

export function useRecurrenceEntries(open: boolean, entry?: Entry | null) {
  const [attempt, setAttempt] = useState(0);
  const key = `${open}:${entry?.id}:${attempt}`;
  const [visited, setVisited] = useState<{ key: string; rows: RecurrenceEntry[] }>({ key: "", rows: [] });
  const pager = useCursorPager<RecurrenceEntry, { key: string; current: RecurrenceEntry }>(async cursor => {
    const { data } = await api.getEntryRecurrence(entry!.id, { cursor, include_count: true });
    return { items: data.results, nextCursor: getCursorFromUrl(data.next), totalCount: data.count, metadata: { key, current: data.current } };
  }, { autoLoadFirst: Boolean(open && entry?.installment_group_id), deps: [key] });
  useEffect(() => {
    if (pager.metadata?.key !== key) return;
    const current = pager.metadata.current;
    setVisited(previous => ({ key, rows: [...new Map([...(previous.key === key ? previous.rows : []), ...pager.items, current].filter(Boolean).map(row => [row.id, row])).values()] }));
  }, [pager.items, pager.metadata, key]);
  const entries = visited.key === key ? visited.rows : [];
  const pageEntries = useMemo(() => pager.metadata?.key === key ? pager.items : [], [pager.metadata, pager.items, key]);
  const selection = useShiftSelect(pageEntries.filter(row => row.id !== entry?.id), row => row.id);
  const { setSelectedIds } = selection;
  useEffect(() => { setSelectedIds([]); }, [key, setSelectedIds]);
  const others = useMemo(() => pageEntries.filter(row => row.id !== entry?.id), [pageEntries, entry?.id]);
  const allPageSelected = others.length > 0 && others.every(row => selection.selectedIds.includes(row.id));
  const somePageSelected = others.some(row => selection.selectedIds.includes(row.id));
  const selectPage = () => setSelectedIds(previous => allPageSelected ? previous.filter(id => !others.some(row => row.id === id)) : [...new Set([...previous, ...others.map(row => row.id)])]);
  return { ...selection, entries, pageEntries, loading: pager.loading || (Boolean(open && entry?.installment_group_id) && !pager.knownPages && !pager.error), error: pager.error, retry: () => setAttempt(value => value + 1), page: pager.index, total: pager.totalCount, canNext: pager.canNext, canPrev: pager.canPrev, next: pager.next, prev: pager.prev, allPageSelected, somePageSelected, selectPage };
}
