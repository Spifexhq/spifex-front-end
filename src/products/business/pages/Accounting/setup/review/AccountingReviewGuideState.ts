import { createContext, useContext } from "react";

export type ReviewGuideContextValue = {
  open: boolean;
  openGuide(): void;
  closeGuide(): void;
};

export const AccountingReviewGuideContext = createContext<ReviewGuideContextValue | null>(null);

export function useAccountingReviewGuide() {
  const value = useContext(AccountingReviewGuideContext);
  if (!value) throw new Error("useAccountingReviewGuide must be used inside AccountingReviewGuideProvider");
  return value;
}
