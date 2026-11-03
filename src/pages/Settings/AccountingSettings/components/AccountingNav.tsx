import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
const groups = [
  [{ to: "overview", key: "overview", label: "Overview" }, { to: "setup", key: "setup", label: "Setup" }],
  [{ to: "chart", key: "chart", label: "Chart" }, { to: "books", key: "books", label: "Books" }, { to: "periods", key: "periods", label: "Periods" }, { to: "bank-mappings", key: "bankMappings", label: "Bank mappings" }, { to: "posting-policies", key: "postingPolicies", label: "Posting policies" }],
  [{ to: "journals", key: "journals", label: "Journals" }, { to: "reconciliation", key: "reconciliation", label: "Reconciliation" }, { to: "correlation", key: "correlation", label: "Correlation" }],
];
export default function AccountingNav() {
  const { t } = useTranslation("accountingSettings");
  return <nav aria-label={t("nav.ariaLabel", { defaultValue: "Accounting settings navigation" })} className="flex gap-x-4 overflow-x-auto border-b border-gray-200">
    {groups.map((items, index) => <div key={index} className="flex shrink-0 gap-x-1">{items.map(item => <NavLink key={item.to} to={`/settings/accounting/${item.to}`} className={({ isActive }) => `-mb-px inline-flex shrink-0 items-center whitespace-nowrap border-b-2 px-2.5 pb-3 pt-2 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-gray-400 ${isActive ? "border-gray-900 font-semibold text-gray-900" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900"}`}>{t(`nav.${item.key}`, { defaultValue: item.label })}</NavLink>)}</div>)}
  </nav>;
}
