import { useTranslation } from "react-i18next";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import SidePanel from "@/components/Modal/SidePanel";
import Button from "@/shared/ui/Button";
import AccountingTerm from "../components/AccountingTerm";
type Props = { selected?: LedgerAccount; items: LedgerAccount[]; onClose(): void; onEdit?: (account: LedgerAccount) => void; onDelete?: (account: LedgerAccount) => void };
export default function AccountPreview({ selected, items, onClose, onEdit, onDelete }: Props) {
  const { t } = useTranslation("ledgerAccounts");
  const { t: common } = useTranslation("common");
  const { t: accounting } = useTranslation("accountingSettings");
  const sectionLabel = (value: string) => accounting(`common.sections.${value === "off_balance" ? "offBalance" : value}`);
  return (
    <SidePanel className="accounting-dialog" recordLabel={common("modalHints.ledgerAccount")} recordName={selected?.name} isOpen={!!selected} title={selected?.name || ""} subtitle={selected?.code} onClose={() => onClose()}
      footer={selected && (onEdit || onDelete) ? <>
        {onDelete && !selected.is_system ? <Button type="button" variant="cancel" className="w-full md:w-auto" onClick={() => { onClose(); onDelete(selected); }}>{t("workspace.delete")}</Button> : <span />}
        {onEdit && <Button type="button" variant="outline" className="w-full md:w-auto" onClick={() => { onClose(); onEdit(selected); }}>{t("workspace.edit")}</Button>}
      </> : undefined}>
      {selected && <div className="space-y-6"><dl className="divide-y divide-gray-100 text-[13px]">{[
        [<AccountingTerm term="posting">{t("modal.accountType")}</AccountingTerm>, t(`modal.${selected.account_type}`)], [<AccountingTerm term="section">{t("modal.statementSection")}</AccountingTerm>, sectionLabel(selected.statement_section)], [<AccountingTerm term="normalBalance">{t("modal.normalBalance")}</AccountingTerm>, t(`modal.${selected.normal_balance}`)], [t("modal.parent"), items.find(item => item.id === selected.parent_id)?.name || "—"], [t("modal.currencyCode"), selected.currency_code || "—"], [<AccountingTerm term="bankControl">{t("modal.bankControl")}</AccountingTerm>, accounting(selected.is_bank_control ? "common.yes" : "common.no")], [<AccountingTerm term="manualPosting">{t("modal.manualPosting")}</AccountingTerm>, accounting(selected.allows_manual_posting ? "common.yes" : "common.no")], [t("modal.reportGroup"), selected.report_group || "—"], [t("modal.reportSubgroup"), selected.report_subgroup || "—"], [t("modal.externalRef"), selected.external_ref || "—"],
      ].map(([label, value], index) => <div key={index} className="flex justify-between gap-6 py-3"><dt className="text-gray-500">{label}</dt><dd className="max-w-[60%] break-words text-right font-medium text-gray-900">{value}</dd></div>)}</dl>{selected.description && <p className="text-[13px] leading-6 text-gray-500">{selected.description}</p>}
      </div>}
    </SidePanel>  );
}
