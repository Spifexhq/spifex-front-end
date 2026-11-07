import { accountingColors } from "./accountingColors";
import { useTranslation } from "react-i18next";
import InfoTooltip from "@/shared/ui/InfoTooltip";
import type { AccountingReadiness } from "@/models/entries/accountingReadiness";
export function AccountingLegend({ showLabel = true }: {
    showLabel?: boolean;
}) { const { t } = useTranslation("financeEntries"); return <span className="inline-flex max-w-full min-w-0 items-center gap-1">{showLabel && <span className="truncate">{t("accounting")}</span>}<span className="inline-flex shrink-0"><InfoTooltip label={t("statusLegend")}><span className="space-y-2">{Object.entries(accountingColors).map(([key, color]) => <span key={key} className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${color}`}/>{t(`statuses.${key}`)}</span>)}</span></InfoTooltip></span></span>; }
export default function AccountingIndicator({ accounting, onOpen }: {
    accounting?: Partial<AccountingReadiness> | null;
    onOpen(): void;
}) {
    const { t } = useTranslation("financeEntries");
    const status = accounting?.status || "uncategorised";
    return <span className="inline-flex items-center"><button type="button" onClick={event => { event.stopPropagation(); onOpen(); }} className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-gray-400" aria-label={t("statusPreview", { status: t(`statuses.${status}`) })}><span aria-hidden className={`h-2 w-2 rounded-full ${accountingColors[status] || accountingColors.error}`}/></button></span>;
}
