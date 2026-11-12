import WorkspaceSwitcher from "@/features/workspaces/components/WorkspaceSwitcher";

import SidebarUserConfiguration from "../../../../shared/layout/Sidebar/SidebarUserConfiguration";
import SidebarFrame from "@/shared/layout/Sidebar/SidebarFrame";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  FileUp,
  Settings2,
  BookOpen,
  LayoutDashboard,
  Wallet,
  CircleCheck,
  ChartNoAxesCombined,
} from "lucide-react";
import { useAuthContext } from "@/hooks/useAuth";
import { PermissionMiddleware } from "@/middlewares";

import type { ModalType } from "@/products/business/pages/Finance/components/EntryForm/types";
import type { SidebarMode } from "./Sidebar";
import "./sidebar.css";
import "../../../../shared/layout/Sidebar/sidebar-motion.css";

export type SidebarNavigationProps = {
  isOpen: boolean;
  toggleSidebar: () => void;
  handleOpenModal: (type: ModalType) => void;
  handleOpenTransferenceModal: () => void;
  mode: SidebarMode;
  mobile?: boolean;
};

export default function SidebarNavigation({
  isOpen,
  toggleSidebar,
  handleOpenModal,
  handleOpenTransferenceModal,
  mode,
  mobile = false,
}: SidebarNavigationProps) {
  const { t } = useTranslation(["sidebar", "navbar"]);
  const { organization, isSubscribed, isSuperUser } = useAuthContext();
  const retainedHistory = ["legacy", "deletion_pending"].includes(organization?.organization?.lifecycle || "");
  const collapsed = !mobile && !isOpen;

  const run = (action: () => void) => {
    if (mobile && isOpen) toggleSidebar();
    action();
  };

  const actions = [
    {
      key: "credit",
      Icon: ArrowDownLeft,
      permission: "add_cash_flow_entries",
      onClick: () => handleOpenModal("credit"),
    },
    {
      key: "debit",
      Icon: ArrowUpRight,
      permission: "add_cash_flow_entries",
      onClick: () => handleOpenModal("debit"),
    },
    {
      key: "transfer",
      Icon: ArrowLeftRight,
      permission: "add_transference",
      onClick: handleOpenTransferenceModal,
    },
  ];

  return (
    <SidebarFrame open={isOpen} mobile={mobile} onToggle={toggleSidebar} product="Enterprise" label={t("sidebar.aria.nav")} toggleLabel={t(mobile ? "sidebar.aria.close" : isOpen ? "sidebar.aria.toggleClose" : "sidebar.aria.toggleOpen")} workspace={<WorkspaceSwitcher compact={collapsed}/>} footer={<>
        <div className="shrink-0 border-t border-gray-200 p-3">
          <Link
            to="/settings"
            onClick={() => {
              if (mobile && isOpen) toggleSidebar();
            }}
            aria-label={t("sidebar.settings")}
            title={collapsed ? t("sidebar.settings") : undefined}
            className="sidebar-row rounded-md text-xs text-gray-500 hover:bg-gray-100"
          >
            <Settings2 size={16} className="sidebar-icon" aria-hidden="true" />
            <span className="sidebar-label">
              {t("sidebar.settings")}
            </span>
          </Link>
        </div>

        <SidebarUserConfiguration collapsed={collapsed} />
    </>}>
          <section
            className="mb-5"
            aria-label={t("sidebar.sections.overview")}
          >
            <div className="sidebar-section-title text-[11px] font-medium text-gray-500">
              <span className="sidebar-label">
                {t("sidebar.sections.overview")}
              </span>
            </div>

            {[
              {
                to: "/overview",
                label: t("navbar:pages.overview"),
                Icon: LayoutDashboard,
                permission: "view_overview_page",
              },
              {
                to: "/cashflow",
                label: t("navbar:links.cashflow"),
                Icon: Wallet,
                permission: "view_cash_flow_page",
              },
              {
                to: "/settled",
                label: t("navbar:links.settled"),
                Icon: CircleCheck,
                permission: "view_settlement_page",
              },
              ...((isSubscribed || isSuperUser || retainedHistory)
                ? [
                    {
                      to: "/reports",
                      label: t("navbar:links.reports"),
                      Icon: ChartNoAxesCombined,
                      permission: "view_report_page",
                    },
                  ]
                : []),
              {
                to: "/bank-imports",
                label: t("navbar:pages.bankImports"),
                Icon: FileUp,
                permission: "view_statements_page",
              },
              {
                to: "/accounting",
                label: t("accountingSettings:section.title"),
                Icon: BookOpen,
                permission: "view_ledger_accounts_page",
              },
            ].map(({ to, label, Icon, permission }) => {
              const item = (
                <NavLink
                  to={to}
                  aria-label={label}
                  title={collapsed ? label : undefined}
                  onClick={() => {
                    if (mobile && isOpen) toggleSidebar();
                  }}
                  className={({ isActive }) =>
                    `sidebar-row rounded-md text-[13px] transition-colors ${
                      isActive
                        ? "bg-white font-semibold text-gray-900 shadow-sm ring-1 ring-gray-200"
                        : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
                    }`
                  }
                >
                  <Icon size={16} className="sidebar-icon" aria-hidden="true" />
                  <span className="sidebar-label">{label}</span>
                </NavLink>
              );

              return (
                <div key={to} className="mb-1">
                  {permission ? (
                    <PermissionMiddleware codeName={permission}>
                      {item}
                    </PermissionMiddleware>
                  ) : (
                    item
                  )}
                </div>
              );
            })}
          </section>

          {mode !== "settled" && (
            <section aria-label={t("sidebar.sections.actions")}>
              <div className="sidebar-section-title text-[11px] font-medium text-gray-500">
                <span className="sidebar-label">
                  {t("sidebar.sections.actions")}
                </span>
              </div>

              <ul className="space-y-1">
                {actions.map(({ key, Icon, permission, onClick }) => (
                  <PermissionMiddleware
                    key={key}
                    codeName={permission}
                    requireAll
                  >
                    <li>
                      <button
                        type="button"
                        onClick={() => run(onClick)}
                        aria-label={t(`sidebar.items.${key}`)}
                        title={
                          collapsed
                            ? t(`sidebar.items.${key}`)
                            : undefined
                        }
                        className="sidebar-row group rounded-md text-left text-[13px] text-gray-600 transition-colors hover:bg-gray-200/50 hover:text-gray-900"
                      >
                        <Icon
                          size={16}
                          className="sidebar-icon"
                          aria-hidden="true"
                        />
                        <span className="sidebar-label">
                          {t(`sidebar.items.${key}`)}
                        </span>
                      </button>
                    </li>
                  </PermissionMiddleware>
                ))}
              </ul>
            </section>
          )}
    </SidebarFrame>
  );
}
