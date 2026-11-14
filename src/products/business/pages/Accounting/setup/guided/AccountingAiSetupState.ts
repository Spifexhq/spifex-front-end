import { createContext, useContext } from "react";

export type AiSetupContextValue = {
  open: boolean;
  source: string;
  openSetup(source?: string): void;
  closeSetup(): void;
  hasProgress: boolean;
  setHasProgress(value: boolean): void;
  busy: boolean;
  setBusy(value: boolean): void;
};

export const AccountingAiSetupContext = createContext<AiSetupContextValue | null>(null);

export function useAccountingAiSetup() {
  const value = useContext(AccountingAiSetupContext);
  if (!value) throw new Error("useAccountingAiSetup must be used inside AccountingAiSetupProvider");
  return value;
}
