
import SidebarUserConfiguration from "../SidebarUserConfiguration";
import { useEffect, useRef } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  FileUp,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  BookOpen,
  X,
  LayoutDashboard,
  Wallet,
  CircleCheck,
  ChartNoAxesCombined,
} from "lucide-react";
import { useAuthContext } from "@/hooks/useAuth";
import { PermissionMiddleware } from "@/middlewares";
import { useDialogFocus } from "@/shared/ui/useDialogFocus";
import type { ModalType } from "@/pages/Finance/components/EntryForm/types";
import type { SidebarMode } from "./Sidebar";
import "./sidebar.css";
import "../sidebar-motion.css";

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
  const navRef = useRef<HTMLElement>(null);
  const collapsed = !mobile && !isOpen;

  useDialogFocus(mobile && isOpen, navRef);

  useEffect(() => {
    if (!mobile || !isOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", escape);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", escape);
    };
  }, [mobile, isOpen, toggleSidebar]);

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
    <>
      {mobile && (
        <div
          data-open={isOpen}
          className="sidebar-mobile-backdrop fixed inset-0 z-[90] bg-gray-950/25 backdrop-blur-[2px]"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      <nav
        ref={navRef}
        id="workspace-sidebar"
        data-mobile={mobile}
        data-open={isOpen}
        data-collapsed={collapsed}
        tabIndex={-1}
        aria-label={t("sidebar.aria.nav")}
        role={mobile && isOpen ? "dialog" : undefined}
        aria-modal={(mobile && isOpen) || undefined}
        className={`workspace-sidebar sidebar-motion flex h-[100dvh] flex-col border-r border-gray-200 bg-gray-50 ${
          mobile
            ? "fixed left-0 top-0 z-[95] w-[280px] max-w-[85vw]"
            : `sticky top-0 ${collapsed ? "w-[72px]" : "w-[248px]"}`
        }`}
      >
        <div className="sidebar-header h-20 shrink-0 items-center">
          <div className="sidebar-header-copy sidebar-label">
            <p className="text-[15px] font-semibold tracking-tight text-gray-900">
              <Link to="/overview" tabIndex={collapsed ? -1 : undefined}>
                Spifex
              </Link>
            </p>
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {organization?.organization?.name || t("sidebar.title")}
            </p>
          </div>

          <button
            type="button"
            onClick={toggleSidebar}
            aria-expanded={isOpen}
            aria-controls="workspace-sidebar"
            title={t(
              mobile
                ? "sidebar.aria.close"
                : isOpen
                  ? "sidebar.aria.toggleClose"
                  : "sidebar.aria.toggleOpen"
            )}
            aria-label={t(
              mobile
                ? "sidebar.aria.close"
                : isOpen
                  ? "sidebar.aria.toggleClose"
                  : "sidebar.aria.toggleOpen"
            )}
            className="sidebar-toggle flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200/60"
          >
            {mobile ? (
              <X size={18} />
            ) : isOpen ? (
              <PanelLeftClose size={17} />
            ) : (
              <PanelLeftOpen size={17} />
            )}
          </button>
        </div>

        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-6">
          <section
            className="mb-5"
            aria-label={t("sidebar.sections.workspaces")}
          >
            <div className="sidebar-section-title text-[11px] font-medium text-gray-400">
              <span className="sidebar-label">
                {t("sidebar.sections.workspaces")}
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
              ...((isSubscribed || isSuperUser)
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
                  <Icon size={16} className="sidebar-icon" />
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
              <div className="sidebar-section-title text-[11px] font-medium text-gray-400">
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
        </div>

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
            <Settings2 size={16} className="sidebar-icon" />
            <span className="sidebar-label">
              {t("sidebar.settings")}
            </span>
          </Link>
        </div>

        <SidebarUserConfiguration collapsed={collapsed} />
      </nav>
    </>
  );
}
