import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";


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

  return (
    <main className="accounting-workspace settings-page">
      <div className="settings-content space-y-4">
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
