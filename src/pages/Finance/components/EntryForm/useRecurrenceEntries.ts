import { useEffect, useState } from "react";
import { api } from "@/api/requests";
import { fetchAllCursor } from "@/lib/list";
import { useShiftSelect } from "@/hooks/useShiftSelect";
import type { Entry, RecurrenceEntry } from "@/models/entries/entries";

export function useRecurrenceEntries(open: boolean, entry?: Entry | null) {
  const [entries, setEntries] = useState<RecurrenceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const selection = useShiftSelect(entries.filter(row => row.id !== entry?.id), row => row.id);
  const { setSelectedIds } = selection;
  useEffect(() => {
    setSelectedIds([]);
    setEntries([]);
    setError(false);
    if (!open || !entry?.installment_group_id) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    void fetchAllCursor<RecurrenceEntry>(params => api.getEntryRecurrence(entry.id, params)).then(rows => {
      if (alive) setEntries(rows);
    }).catch(() => { if (alive) setError(true); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, entry?.id, entry?.installment_group_id, attempt, setSelectedIds]);
  return { entries, loading, error, retry: () => setAttempt(value => value + 1), ...selection };
}
