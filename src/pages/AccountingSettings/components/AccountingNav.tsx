import React from "react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/settings/accounting/chart", label: "Chart" },
  { to: "/settings/accounting/books", label: "Books" },
  { to: "/settings/accounting/bank-mappings", label: "Bank mappings" },
  { to: "/settings/accounting/posting-policies", label: "Posting policies" },
  { to: "/settings/accounting/journals", label: "Journals" },
  { to: "/settings/accounting/reconciliation", label: "Reconciliation" },
];

const AccountingNav: React.FC = () => {
  return (
    <nav aria-label="Accounting settings navigation" className="overflow-x-auto">
      <div className="flex min-w-max gap-1 border-b border-gray-200">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                "inline-flex items-center whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-600 hover:text-gray-900",
              ].join(" ")
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default AccountingNav;
