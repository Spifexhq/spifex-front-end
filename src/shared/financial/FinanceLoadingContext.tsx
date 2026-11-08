import { createContext, useContext, useEffect } from "react";

export type FinanceLoadingSlot = "metrics" | "banks" | "entries";
export const FinanceLoadingContext = createContext<((slot: FinanceLoadingSlot, loading: boolean | undefined) => void) | null>(null);

export function useFinanceLoading(slot: FinanceLoadingSlot, loading: boolean) {
  const report = useContext(FinanceLoadingContext);
  useEffect(() => { report?.(slot, loading); }, [report, slot, loading]);
  useEffect(() => () => { report?.(slot, undefined); }, [report, slot]);
}

export function isFinancePending(expected: FinanceLoadingSlot[], slots: Partial<Record<FinanceLoadingSlot, boolean>>) {
  return expected.some(slot => slots[slot] === undefined || slots[slot]);
}
