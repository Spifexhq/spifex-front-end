import { createContext, useContext, useEffect } from "react";
export type Slot = "metrics" | "banks" | "entries";
export const LoadingContext = createContext<((slot: Slot, loading: boolean | undefined) => void) | null>(null);
export function useFinanceLoading(slot: Slot, loading: boolean) {
  const report = useContext(LoadingContext);
  useEffect(() => { report?.(slot, loading); }, [report, slot, loading]);
  useEffect(() => () => { report?.(slot, undefined); }, [report, slot]);
}


export function isFinancePending(expected: Slot[], slots: Partial<Record<Slot, boolean>>) { return expected.some(slot => slots[slot] === undefined || slots[slot]); }
