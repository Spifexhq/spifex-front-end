import React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";


import "./accounting.css";
import AccountingOverviewPage from "./pages/AccountingOverviewPage";
import AccountingNav from "./components/AccountingNav";
import AccountingWorkspace from "./pages/AccountingWorkspace";
import AccountingBooksPage from "./pages/AccountingBooksPage";
import AccountingBankMappingsPage from "./pages/AccountingBankMappingsPage";
import AccountingPostingPoliciesPage from "./pages/AccountingPostingPoliciesPage";
import AccountingJournalsPage from "./pages/AccountingJournalsPage";
import AccountingReconciliationPage from "./pages/AccountingReconciliationPage";
import AccountingCorrelationsPage from "./pages/AccountingCorrelationsPage";

const AccountingSettings: React.FC = () => {
  const { t } = useTranslation("accountingSettings");
  const isChart = useLocation().pathname.endsWith("/chart");

  return (
    <main className="accounting-workspace min-h-full px-4 py-5 text-gray-900 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1440px] space-y-4">
        <header>
          <p className="mb-2 text-xs font-medium text-gray-400">{t("common.settings", { defaultValue: "Settings" })}</p>
          <h1 className="font-semibold">{t("redesign.title", "Accounting")}</h1>
          {!isChart && <p className="mt-2 text-[13px] leading-6 text-gray-500">{t("redesign.subtitle", "Connect your cashflow to a clear, consistent accounting record.")}</p>}
        </header>
        <AccountingNav />
        <div className="accounting-page min-w-0">
        <Routes>
          <Route path="/" element={<Navigate to="/settings/accounting/overview" replace />} />
          <Route path="overview" element={<AccountingOverviewPage />} />
          <Route path="chart" element={<AccountingWorkspace />} />
          <Route path="books" element={<AccountingBooksPage />} />
          <Route path="bank-mappings" element={<AccountingBankMappingsPage />} />
          <Route path="posting-policies" element={<AccountingPostingPoliciesPage />} />
          <Route path="journals" element={<AccountingJournalsPage />} />
          <Route path="reconciliation" element={<AccountingReconciliationPage />} />
          <Route path="correlation" element={<AccountingCorrelationsPage />} />
        </Routes>
        </div>
      </div>
    </main>
  );
};

export default AccountingSettings;
