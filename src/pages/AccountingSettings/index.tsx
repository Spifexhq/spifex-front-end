import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import TopProgress from '@/shared/ui/Loaders/TopProgress';
import PageSkeleton from '@/shared/ui/Loaders/PageSkeleton';
import { api } from '@/api';

import AccountingNav from './components/AccountingNav';
import AccountingWorkspace from './pages/AccountingWorkspace';
import AccountingBooksPage from './pages/AccountingBooksPage';
import AccountingBankMappingsPage from './pages/AccountingBankMappingsPage';
import AccountingPostingPoliciesPage from './pages/AccountingPostingPoliciesPage';
import AccountingJournalsPage from './pages/AccountingJournalsPage';
import AccountingReconciliationPage from './pages/AccountingReconciliationPage';

import type { OrgLedgerProfileResponse } from '@/models/auth/organization';

const DEFAULT_PROFILE: OrgLedgerProfileResponse = {
  mode: 'organizational',
  default_template: '',
  language_code: '',
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
        if (!cancelled) setProfile(data || DEFAULT_PROFILE);
      } finally {
        if (!cancelled) setLoading(false);
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
    <main className="min-h-full bg-transparent px-4 py-6 text-gray-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[28px] border border-gray-200 bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">Accounting universe</div>
              <h1 className="mt-2 text-2xl font-semibold text-gray-900">Accounting control center</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                Separate accounting structure and posting mechanics from the operational cash flow page.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
              <span className="rounded-full border border-gray-200 px-3 py-1">Profile: {profile.mode}</span>
              <span className="rounded-full border border-gray-200 px-3 py-1">
                Cashflow view: {profile.use_compact_cashflow_view ? 'compact' : 'full'}
              </span>
            </div>
          </div>

          <div className="mt-5">
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
