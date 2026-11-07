import { useCallback, useContext, useState, type Dispatch, type SetStateAction } from "react";
import { AccountingSetupContext } from "./AccountingSetupContext";
export function useAccountingSetup() {
  const context = useContext(AccountingSetupContext);
  if (!context) throw new Error("AccountingSetupProvider is required.");
  return context;
}

/** Keep interrupted setup input in memory for this workspace, never localStorage. */
export function useAccountingDraft<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const { drafts } = useAccountingSetup();
  const [value, setValue] = useState<T>(() => drafts.has(key) ? drafts.get(key) as T : initial);
  const update = useCallback<Dispatch<SetStateAction<T>>>(next => {
    setValue(previous => {
      const value = typeof next === "function" ? (next as (previous: T) => T)(previous) : next;
      drafts.set(key, value);
      return value;
    });
  }, [drafts, key]);
  return [value, update];
}
