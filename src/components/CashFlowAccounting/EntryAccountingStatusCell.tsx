import React from 'react';
import { ChevronRight } from 'lucide-react';

import AccountingReadinessBadge from './AccountingReadinessBadge';

import type { AccountingReadiness } from '@/models/entries/accountingReadiness';

interface Props {
  accounting?: Partial<AccountingReadiness> | null;
  onOpen?: () => void;
}

const EntryAccountingStatusCell: React.FC<Props> = ({ accounting, onOpen }) => {
  return (
    <div className="flex items-center gap-2">
      <AccountingReadinessBadge accounting={accounting} compact />
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-50"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
};

export default EntryAccountingStatusCell;
