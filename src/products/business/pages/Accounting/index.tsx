import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";



import AccountingOverviewPage from "./pages/AccountingOverviewPage";

import ChartOfAccountsPage from "./chart/ChartOfAccountsPage";
import AccountingPeriodsPage from "./pages/AccountingPeriodsPage";
import AccountingRouteGuard from "./setup/AccountingRouteGuard";
import { useTranslation } from "react-i18next";

import AccountingBooksPage from "./pages/AccountingBooksPage";
import AccountingBankMappingsPage from "./pages/AccountingBankMappingsPage";
import AccountingPostingPoliciesPage from "./pages/AccountingPostingPoliciesPage";
import AccountingJournalsPage from "./pages/AccountingJournalsPage";

const AccountingWorkspace: React.FC = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation("accountingSettings");
  const page = pathname.split("/")[2] || "overview";
  const heading = ({ "bank-mappings": "bankMappings", "posting-policies": "postingPolicies", "chart-of-accounts": "chart", assistant: "assistant" } as Record<string, string>)[page] || page;

  return (
    <main className="min-w-0 px-4 py-6 text-gray-900 md:px-7">
      <div className="mx-auto w-full max-w-[1440px] space-y-5">
        {page !== "overview" && <header className="space-y-2"><h1 className="text-2xl font-semibold tracking-tight">{t(`nav.${heading}`)}</h1></header>}
        <div className="min-w-0 [&_table]:w-full [&_table]:border-collapse [&_th]:bg-gray-50 [&_th]:text-xs [&_th]:font-medium [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-gray-50">
        <AccountingRouteGuard>
        <Routes>
          <Route path="/" element={<Navigate to="/accounting/overview" replace />} />
          <Route path="overview" element={<AccountingOverviewPage />} />
          <Route path="chart-of-accounts" element={<ChartOfAccountsPage />} />
          <Route path="chart" element={<Navigate to="/accounting/chart-of-accounts" replace />} />
          <Route path="setup/*" element={<Navigate to="/accounting/overview" replace />} />
          <Route path="periods" element={<AccountingPeriodsPage />} />
          <Route path="books" element={<AccountingBooksPage />} />
          <Route path="bank-mappings" element={<AccountingBankMappingsPage />} />
          <Route path="posting-policies" element={<AccountingPostingPoliciesPage />} />
          <Route path="journals" element={<AccountingJournalsPage />} />
          <Route path="reconciliation" element={<Navigate to="/accounting/overview" replace />} />
          <Route path="correlation" element={<Navigate to="/accounting/overview" replace />} />
          <Route path="*" element={<Navigate to="/accounting/overview" replace />} />
        </Routes>
        </AccountingRouteGuard>
        </div>
      </div>
    </main>
  );
};

export default function Accounting() {
  return <AccountingWorkspace />;
}
