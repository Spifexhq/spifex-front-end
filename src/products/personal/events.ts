export const PERSONAL_FINANCE_CHANGED = "spifex:personal-finance-changed";

export function notifyPersonalFinanceChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PERSONAL_FINANCE_CHANGED));
}
