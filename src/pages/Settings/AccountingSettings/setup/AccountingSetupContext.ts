import { createContext } from "react";
import type { AccountingSetupStatus } from "@/models/settings/accountingSetup";
export type SetupContext = {
  status: AccountingSetupStatus | null;
  loading: boolean;
  error: string | null;
  refresh(): Promise<void>;
  canManage: boolean;
  drafts: Map<string, unknown>;
};
export const AccountingSetupContext = createContext<SetupContext | null>(null);

