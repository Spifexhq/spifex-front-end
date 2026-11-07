import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";



import AccountingOverviewPage from "./pages/AccountingOverviewPage";

import ChartOfAccountsPage from "./chart/ChartOfAccountsPage";
import AccountingSetupPage from "./setup/AccountingSetupPage";
import AccountingPeriodsPage from "./pages/AccountingPeriodsPage";
import { AccountingSetupProvider } from "./setup/AccountingSetupProvider";
import { useAccountingSetup } from "./setup/useAccountingSetup";
import AccountingRouteGuard from "./setup/AccountingRouteGuard";
import { useAuthContext } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import AccountingBooksPage from "./pages/AccountingBooksPage";
import AccountingBankMappingsPage from "./pages/AccountingBankMappingsPage";
import AccountingPostingPoliciesPage from "./pages/AccountingPostingPoliciesPage";
import AccountingJournalsPage from "./pages/AccountingJournalsPage";
import AccountingReconciliationPage from "./pages/AccountingReconciliationPage";
import AccountingCorrelationsPage from "./pages/AccountingCorrelationsPage";

const AccountingWorkspace: React.FC = () => {
  const { status } = useAccountingSetup();
  const { pathname } = useLocation();
  const page = pathname.split("/")[2] || "overview";
  const heading = ({ "bank-mappings": "bankMappings", "posting-policies": "postingPolicies" } as Record<string, string>)[page] || page;
  const { t } = useTranslation("accountingSettings");

  return (
    <main className="min-w-0 p-4 text-gray-900 md:p-7">
      <div className="mx-auto w-full max-w-[1440px] space-y-6">

        {status && !status.operational && <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900 flex flex-wrap items-center justify-between gap-3"><span>{t(status.status === "needs_attention" ? "setupFlow.attention" : "setupFlow.notActive")}</span><Link className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:underline underline-offset-4" to={`/accounting/setup/${status.current_phase}`}>{t("setupFlow.continue")}</Link></div>}
        {!["overview", "setup"].includes(page) && <header className="space-y-2"><h1 className="text-2xl font-semibold tracking-tight">{t(`nav.${heading}`)}</h1></header>}
        <div className="min-w-0 [&_table]:w-full [&_table]:border-collapse [&_th]:bg-gray-50 [&_th]:text-xs [&_th]:font-medium [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-gray-50">
        <AccountingRouteGuard>
        <Routes>
          <Route path="/" element={<Navigate to="/accounting/overview" replace />} />
          <Route path="overview" element={<AccountingOverviewPage />} />
          <Route path="chart" element={<ChartOfAccountsPage />} />
          <Route path="setup/:phase?" element={<AccountingSetupPage />} />
          <Route path="periods" element={<AccountingPeriodsPage />} />
          <Route path="books" element={<AccountingBooksPage />} />
          <Route path="bank-mappings" element={<AccountingBankMappingsPage />} />
          <Route path="posting-policies" element={<AccountingPostingPoliciesPage />} />
          <Route path="journals" element={<AccountingJournalsPage />} />
          <Route path="reconciliation" element={<AccountingReconciliationPage />} />
          <Route path="correlation" element={<AccountingCorrelationsPage />} />
          <Route path="*" element={<Navigate to="/accounting/overview" replace />} />
        </Routes>
        </AccountingRouteGuard>
        </div>
      </div>
    </main>
  );
};

export default function Accounting() {
  const { organization } = useAuthContext();
  return <AccountingSetupProvider key={organization?.organization?.id}><AccountingWorkspace /></AccountingSetupProvider>;
}
