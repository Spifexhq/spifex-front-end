import type { AccountingReadinessStatus } from "@/models/entries/accountingReadiness";
export const accountingColors: Record<AccountingReadinessStatus, string> = { uncategorised: "bg-gray-400", missing_policy: "bg-amber-500", missing_bank_mapping: "bg-orange-500", ready: "bg-emerald-500", posted: "bg-blue-500", error: "bg-red-500" };
