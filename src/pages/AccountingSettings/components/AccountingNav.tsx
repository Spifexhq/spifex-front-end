import React from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

const items = [
  { to: "/settings/accounting/chart", labelKey: "nav.chart", defaultLabel: "Chart" },
  { to: "/settings/accounting/books", labelKey: "nav.books", defaultLabel: "Books" },
  { to: "/settings/accounting/bank-mappings", labelKey: "nav.bankMappings", defaultLabel: "Bank mappings" },
  { to: "/settings/accounting/posting-policies", labelKey: "nav.postingPolicies", defaultLabel: "Posting policies" },
  { to: "/settings/accounting/journals", labelKey: "nav.journals", defaultLabel: "Journals" },
  { to: "/settings/accounting/correlation", labelKey: "nav.correlation", defaultLabel: "Correlation" },
  { to: "/settings/accounting/reconciliation", labelKey: "nav.reconciliation", defaultLabel: "Reconciliation" },
];

const AccountingNav: React.FC = () => {
  const { t } = useTranslation("accountingSettings");

  return (
    <nav
      aria-label={t("nav.ariaLabel", { defaultValue: "Accounting settings navigation" })}
      className="overflow-x-auto"
    >
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
            {t(item.labelKey, { defaultValue: item.defaultLabel })}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default AccountingNav;
