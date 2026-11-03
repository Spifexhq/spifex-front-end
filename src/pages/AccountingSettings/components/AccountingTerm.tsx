import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import InfoTooltip from "@/shared/ui/InfoTooltip";

export type AccountingTermName = "basis" | "primary" | "header" | "posting" | "section" | "normalBalance" | "bankControl" | "manualPosting" | "debit" | "credit" | "policy" | "clearing" | "accrual" | "postingDate";
export default function AccountingTerm({ term, children }: { term: AccountingTermName; children: ReactNode }) {
  const { t } = useTranslation("accountingSettings");
  return <span className="inline-flex items-center gap-1">{children}<InfoTooltip label={t("terms.learn", "About {{term}}", { term: children })}>{t(`terms.${term}`)}</InfoTooltip></span>;
}
