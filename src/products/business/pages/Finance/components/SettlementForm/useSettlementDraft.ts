import type { SettlementSource } from "@/models/entries/settlements";
import { useEffect, useRef, useState } from "react";
import { api } from "@/core/api/requests";
import type { Entry } from "@/models/entries/entries";
import { cents, makeDraft, type SettlementDraft } from "./settlementDraft";
export function useSettlementDraft(open: boolean, entries: Entry[]) {
  const [rows, setRows] = useState<SettlementDraft[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  const preserve = useRef(false);
  const ids = JSON.stringify([...new Set(entries.map(entry => entry.id))].sort());
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const requested: string[] = JSON.parse(ids);
    const keeping = preserve.current; preserve.current = false;
    setLoading(true); setError(false); if (!keeping) setRows([]);
    void (async () => {
      try {
        const result: SettlementSource[] = [];
        for (let i = 0; i < requested.length; i += 100) {
          const { data } = await api.getSettlementDrafts(requested.slice(i, i+100));
          if (!alive) return;
          if (!Array.isArray(data)) throw new Error("Invalid entry details");
          result.push(...data);
        }
        if (result.length !== requested.length || new Set(result.map(row => row.id)).size !== requested.length || result.some(row => !requested.includes(row.id))) throw new Error("Incomplete entry details");
        const drafts = result.map(makeDraft);
        if (!keeping && drafts.some(row => (cents(row.remaining) ?? 0n) <= 0n)) throw new Error("Entry is already settled");
        if (alive) setRows(previous => keeping ? previous.map(row => { const fresh = drafts.find(item => item.id === row.id); return fresh ? { ...row, remaining: fresh.remaining, version: fresh.version } : row; }) : drafts);
      } catch { if (alive) setError(true); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [open, ids, attempt]);
  return { rows, setRows, loading, error, retry: () => setAttempt(value => value+1), refreshBalances: () => { preserve.current = true; setAttempt(value => value+1); } };
}
