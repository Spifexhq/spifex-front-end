import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { LedgerAccount } from "@/models/settings/ledgerAccounts";
import { type AccountView } from "./accountHierarchy";
import { useAccountHierarchy } from "./useAccountHierarchy";
import AccountToolbar from "./AccountToolbar";
import AccountTable from "./AccountTable";
import AccountPreview from "./AccountPreview";

type Props = {
  items: LedgerAccount[];
  allAccounts?: LedgerAccount[];
  viewMode: AccountView;
  onViewModeChange(view: AccountView): void;
  onEdit?: (account: LedgerAccount) => void;
  onDelete?: (account: LedgerAccount) => void;
};

export default function ChartOfAccounts({ items, allAccounts = items, viewMode, onViewModeChange, onEdit, onDelete }: Props) {
  const { t } = useTranslation("ledgerAccounts");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const hierarchy = useAccountHierarchy(items, viewMode);
  return <section className="account-chart min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
    <AccountToolbar {...hierarchy} viewMode={viewMode} onViewModeChange={onViewModeChange} />
    <AccountTable {...hierarchy} viewMode={viewMode} onInspect={account => setSelectedId(account.id)} onEdit={onEdit} />
    <div className="border-t border-gray-200 bg-gray-50/50 px-4 py-2 text-[11px] text-gray-500">
      {t("explorer.visibleCount", { visible: hierarchy.rows.length, total: hierarchy.filtered.length })}
      <span className="ml-3 hidden sm:inline">{t("explorer.inspectHint")}</span>
    </div>
    <AccountPreview selected={items.find(account => account.id === selectedId)} items={allAccounts} onClose={() => setSelectedId(null)} onEdit={onEdit} onDelete={onDelete} />
  </section>;
}
