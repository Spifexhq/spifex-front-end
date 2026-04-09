import React from 'react';
import { NavLink } from 'react-router-dom';

const items = [
  { to: '/settings/accounting/chart', label: 'Chart' },
  { to: '/settings/accounting/books', label: 'Books' },
  { to: '/settings/accounting/bank-mappings', label: 'Bank mappings' },
  { to: '/settings/accounting/posting-policies', label: 'Posting policies' },
  { to: '/settings/accounting/journals', label: 'Journals' },
  { to: '/settings/accounting/reconciliation', label: 'Reconciliation' },
];

const AccountingNav: React.FC = () => {
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            [
              'rounded-2xl border px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50',
            ].join(' ')
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
};

export default AccountingNav;
