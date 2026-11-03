import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";


import "./accounting.css";
import AccountingOverviewPage from "./pages/AccountingOverviewPage";
import AccountingNav from "./components/AccountingNav";
import ChartOfAccountsPage from "./chart/ChartOfAccountsPage";
import AccountingSetupPage from "./setup/AccountingSetupPage";
import AccountingPeriodsPage from "./pages/AccountingPeriodsPage";
import { AccountingSetupProvider } from "./setup/AccountingSetupProvider";
import { useAccountingSetup } from "./setup/useAccountingSetup";
import AccountingRouteGuard from "./setup/AccountingRouteGuard";
import { useAuthContext } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./setup/accounting-setup.css";
import AccountingBooksPage from "./pages/AccountingBooksPage";
import AccountingBankMappingsPage from "./pages/AccountingBankMappingsPage";
import AccountingPostingPoliciesPage from "./pages/AccountingPostingPoliciesPage";
import AccountingJournalsPage from "./pages/AccountingJournalsPage";
import AccountingReconciliationPage from "./pages/AccountingReconciliationPage";
import AccountingCorrelationsPage from "./pages/AccountingCorrelationsPage";

const AccountingWorkspace: React.FC = () => {
  const { status } = useAccountingSetup();
  const { t } = useTranslation("accountingSettings");

  return (
    <main className="accounting-workspace settings-page">
      <div className="settings-content space-y-4">
        <AccountingNav />
        {status && !status.operational && <div className="accounting-notice flex flex-wrap items-center justify-between gap-3"><span>{t(status.status === "needs_attention" ? "setupFlow.attention" : "setupFlow.notActive")}</span><Link className="accounting-link" to={`/settings/accounting/setup/${status.current_phase}`}>{t("setupFlow.continue")}</Link></div>}
        <div className="accounting-page min-w-0">
        <AccountingRouteGuard>
        <Routes>
          <Route path="/" element={<Navigate to="/settings/accounting/overview" replace />} />
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
          <Route path="*" element={<Navigate to="/settings/accounting/overview" replace />} />
        </Routes>
        </AccountingRouteGuard>
        </div>
      </div>
    </main>
  );
};

export default function AccountingSettings() {
  const { organization } = useAuthContext();
  return <AccountingSetupProvider key={organization?.organization?.id}><AccountingWorkspace /></AccountingSetupProvider>;
}
