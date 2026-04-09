import React from 'react';

import type { AccountingReadiness, AccountingReadinessStatus } from '@/models/entries/accountingReadiness';

const statusClasses: Record<AccountingReadinessStatus, string> = {
  uncategorised: 'border-gray-200 bg-white text-gray-700',
  missing_policy: 'border-amber-200 bg-amber-50 text-amber-800',
  missing_bank_mapping: 'border-orange-200 bg-orange-50 text-orange-800',
  ready: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  posted: 'border-blue-200 bg-blue-50 text-blue-800',
  error: 'border-red-200 bg-red-50 text-red-800',
};

export interface AccountingReadinessBadgeProps {
  accounting?: Partial<AccountingReadiness> | null;
  compact?: boolean;
}

const labelFallback: Record<AccountingReadinessStatus, string> = {
  uncategorised: 'Unclassified',
  missing_policy: 'Missing policy',
  missing_bank_mapping: 'Missing bank map',
  ready: 'Ready',
  posted: 'Posted',
  error: 'Error',
};

const AccountingReadinessBadge: React.FC<AccountingReadinessBadgeProps> = ({
  accounting,
  compact = false,
}) => {
  const status = accounting?.status ?? 'uncategorised';
  const label = accounting?.label || labelFallback[status];

  return (
    <span
      className={[
        'inline-flex items-center rounded-full border font-medium',
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        statusClasses[status],
      ].join(' ')}
      title={accounting?.message || label}
    >
      {label}
    </span>
  );
};

export default AccountingReadinessBadge;
