import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/requests";
import { getCursorFromUrl } from "@/lib/list";
import { useCursorPager } from "@/hooks/useCursorPager";
import { useShiftSelect } from "@/hooks/useShiftSelect";
import type { Entry, RecurrenceEntry } from "@/models/entries/entries";

export function useRecurrenceEntries(open: boolean, entry?: Entry | null) {
  const [attempt, setAttempt] = useState(0);
  const [allMode, setAllMode] = useState(false);
  const [snapshot, setSnapshot] = useState<string>();
  const key = `${open}:${entry?.id}:${attempt}`;
  const [visited, setVisited] = useState<{ key: string; rows: RecurrenceEntry[] }>({ key: "", rows: [] });
  const pager = useCursorPager<RecurrenceEntry, { key: string; current: RecurrenceEntry; selectionVersion: string }>(async cursor => {
    const { data } = await api.getEntryRecurrence(entry!.id, { cursor, include_count: true });
    return { items: data.results, nextCursor: getCursorFromUrl(data.next), totalCount: data.count, metadata: { key, current: data.current, selectionVersion: data.selection_version } };
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
  useEffect(() => { setSelectedIds([]); setAllMode(false); setSnapshot(undefined); }, [key, setSelectedIds]);
  const isSelected = (id: string) => allMode ? !selection.selectedIds.includes(id) : selection.selectedIds.includes(id);
  const selectedIds = allMode ? entries.filter(row => row.id !== entry?.id && !selection.selectedIds.includes(row.id)).map(row => row.id) : selection.selectedIds;
  const selectedCount = allMode ? Math.max(0, (pager.totalCount ?? 1) - 1 - selection.selectedIds.length) : selection.selectedIds.length;
  const allSelected = allMode && selection.selectedIds.length === 0;
  const selectAll = () => {
    setAllMode(!allSelected);
    setSelectedIds([]);
    setSnapshot(allSelected ? undefined : pager.metadata?.selectionVersion);
  };
  const selectionPayload = useMemo(() => allMode ? { select_all: true, exclude_ids: selection.selectedIds, selection_version: snapshot } : undefined, [allMode, selection.selectedIds, snapshot]);
  return { ...selection, selectedIds, selectedCount, isSelected, selectionPayload, entries, pageEntries, loading: pager.loading || (Boolean(open && entry?.installment_group_id) && !pager.knownPages && !pager.error), error: pager.error, retry: () => setAttempt(value => value + 1), page: pager.index, total: pager.totalCount, canNext: pager.canNext, canPrev: pager.canPrev, next: pager.next, prev: pager.prev, allSelected, someSelected: selectedCount > 0 && !allSelected, selectAll };
}
