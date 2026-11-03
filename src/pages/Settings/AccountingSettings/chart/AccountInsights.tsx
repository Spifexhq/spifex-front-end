import { useTranslation } from "react-i18next";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import SettingsTable from "@/shared/ui/Settings/SettingsTable";

export type AccountInsight = "posting-controls" | "bank-control" | "reporting";

export default function AccountInsights({ accounts, view }: { accounts: LedgerAccount[]; view: AccountInsight }) {
  const { t } = useTranslation("ledgerAccounts");
  const { t: accounting } = useTranslation("accountingSettings");
  const visible = accounts.filter(account => view === "posting-controls" ? account.account_type === "posting" : view === "bank-control" ? account.is_bank_control : true);
  const groups = new Map<string, number>();
  accounts.forEach(account => { const key = account.report_group || t("workspace.unassigned"); groups.set(key, (groups.get(key) ?? 0) + 1); });
  return <div className="space-y-4">
    {view === "reporting" && <SettingsTable><thead><tr><th>{t("modal.reportGroup")}</th><th>{t("workspace.summaryTotal")}</th></tr></thead><tbody>{[...groups].sort((a, b) => b[1] - a[1]).map(([group, count]) => <tr key={group}><td>{group}</td><td>{count}</td></tr>)}</tbody></SettingsTable>}
    <SettingsTable><thead><tr><th>{t("modal.name")}</th><th>{t("modal.code")}</th><th>{t("modal.accountType")}</th><th>{t(view === "reporting" ? "modal.statementSection" : "workspace.manualPostingLabel")}</th><th>{t(view === "reporting" ? "modal.reportGroup" : "workspace.bankControlLabel")}</th><th>{t("workspace.activeLabel")}</th></tr></thead>
      <tbody>{visible.map(account => <tr key={account.id}><td>{account.name}</td><td>{account.code}</td><td>{t(`modal.${account.account_type}`)}</td><td>{view === "reporting" ? accounting(`common.sections.${account.statement_section === "off_balance" ? "offBalance" : account.statement_section}`) : t(account.allows_manual_posting ? "workspace.manualAllowed" : "workspace.manualBlocked")}</td><td>{view === "reporting" ? [account.report_group, account.report_subgroup].filter(Boolean).join(" / ") || "—" : t(account.is_bank_control ? "workspace.bankControlYes" : "workspace.bankControlNo")}</td><td>{t(account.is_active ? "modal.active" : "workspace.inactive")}</td></tr>)}</tbody>
    </SettingsTable>
  </div>;
}
