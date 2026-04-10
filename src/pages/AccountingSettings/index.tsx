import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import TopProgress from "@/shared/ui/Loaders/TopProgress";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { api } from "@/api";

import AccountingNav from "./components/AccountingNav";
import AccountingWorkspace from "./pages/AccountingWorkspace";
import AccountingBooksPage from "./pages/AccountingBooksPage";
import AccountingBankMappingsPage from "./pages/AccountingBankMappingsPage";
import AccountingPostingPoliciesPage from "./pages/AccountingPostingPoliciesPage";
import AccountingJournalsPage from "./pages/AccountingJournalsPage";
import AccountingReconciliationPage from "./pages/AccountingReconciliationPage";

import type { OrgLedgerProfileResponse } from "@/models/auth/organization";

const DEFAULT_PROFILE: OrgLedgerProfileResponse = {
  mode: "organizational",
  default_template: "",
  language_code: "",
  use_compact_cashflow_view: false,
  auto_bootstrapped_at: null,
};

const AccountingSettings: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [profile, setProfile] = React.useState<OrgLedgerProfileResponse>(DEFAULT_PROFILE);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.getOrgLedgerProfile();
        if (!cancelled) {
          setProfile(data || DEFAULT_PROFILE);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={8} />
      </>
    );
  }

  return (
    <main className="min-h-full px-4 py-6 text-gray-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-600">
              Settings
            </div>
          </div>

          <div className="space-y-5 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="text-[16px] font-semibold text-gray-900">
                  Accounting settings
                </h1>
                <p className="mt-1 text-[13px] leading-6 text-gray-600">
                  Configure ledger structure, posting rules, bank control, journals,
                  and accounting readiness without mixing those controls into the
                  operational cashflow workflow.
                </p>
              </div>
            </div>

            <AccountingNav />
          </div>
        </section>

        <Routes>
          <Route path="/" element={<Navigate to="chart" replace />} />
          <Route path="chart" element={<AccountingWorkspace ledgerProfile={profile} />} />
          <Route path="books" element={<AccountingBooksPage />} />
          <Route path="bank-mappings" element={<AccountingBankMappingsPage />} />
          <Route path="posting-policies" element={<AccountingPostingPoliciesPage />} />
          <Route path="journals" element={<AccountingJournalsPage />} />
          <Route path="reconciliation" element={<AccountingReconciliationPage />} />
        </Routes>
      </div>
    </main>
  );
};

export default AccountingSettings;
