import React, { useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

import { PermissionMiddleware } from "@/middlewares";
import { useAuthContext } from "@/hooks/useAuth";
import type { OnboardingStatus } from "@/models/auth/onboarding";

import UserMenu from "@/components/UserMenu";

type NavbarDesktopProps = {
  userMenuOpen: boolean;
  onToggleUserMenu: () => void;
  onCloseUserMenu: () => void;
  onOpenHelp: () => void;
  userMenuRef: React.RefObject<HTMLDivElement>;
  onboarding?: OnboardingStatus | null;
  showOnboardingWarning?: boolean;
};

const NavbarDesktop: React.FC<NavbarDesktopProps> = ({
  userMenuOpen,
  onToggleUserMenu,
  onCloseUserMenu,
  onOpenHelp,
  userMenuRef,
  onboarding,
  showOnboardingWarning = false,
}) => {
  const { t } = useTranslation("navbar");
  const { isSuperUser, isSubscribed } = useAuthContext();
  const navigate = useNavigate();

  const onboardingRedirectPath = useMemo(() => {
    if (!onboarding?.personal_locale_setup) return "/locale-setup?step=locale";
    if (!onboarding?.personal_info_setup) return "/settings/personal";
    if (!onboarding?.org_locale_setup || !onboarding?.org_info_setup) return "/settings/organization-settings";
    if (!onboarding?.ledger_accounts_setup) return "/settings/ledger-accounts";
    return "/settings/personal";
  }, [onboarding]);

  return (
    <nav
      className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-[9999]"
      aria-label={t("aria.mainNav")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          <div className="flex items-center shrink-0">
            <NavLink to="/home" className="text-xl font-bold" end aria-label="Spifex">
              Spifex
            </NavLink>
          </div>

          <div className="flex items-center space-x-4 min-w-0">
            <PermissionMiddleware codeName="view_cash_flow_page">
              <NavLink
                to="/cashflow"
                end
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium ${
                    isActive ? "text-orange-500 font-bold" : "text-gray-800"
                  }`
                }
              >
                {t("links.cashflow")}
              </NavLink>
            </PermissionMiddleware>

            <PermissionMiddleware codeName="view_settlement_page">
              <NavLink
                to="/settled"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium ${
                    isActive ? "text-orange-500 font-bold" : "text-gray-800"
                  }`
                }
              >
                {t("links.settled")}
              </NavLink>
            </PermissionMiddleware>

            {(isSubscribed || isSuperUser) && (
              <PermissionMiddleware codeName="view_report_page">
                <NavLink
                  to="/reports"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium ${
                      isActive ? "text-orange-500 font-bold" : "text-gray-800"
                    }`
                  }
                >
                  {t("links.reports")}
                </NavLink>
              </PermissionMiddleware>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {showOnboardingWarning && (
              <button
                type="button"
                onClick={() => navigate(onboardingRedirectPath)}
                className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 transition-colors"
                title={t("links.cta")}
                aria-label={t("links.cta")}
              >
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden lg:inline">{t("links.cta")}</span>
              </button>
            )}

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={onToggleUserMenu}
                className="cursor-pointer flex items-center justify-center px-4 py-2 rounded-md text-gray-600 hover:text-gray-800 text-sm font-medium focus:outline-none"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label={t("actions.menu")}
              >
                {t("actions.menu")}
                <svg
                  className={`h-4 w-4 ml-2 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  role="none"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    fillRule="evenodd"
                    d="m12 6.662 9.665 8.59-1.33 1.495L12 9.337l-8.335 7.41-1.33-1.495L12 6.662Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {userMenuOpen && <UserMenu onClose={onCloseUserMenu} onHelpClick={onOpenHelp} />}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavbarDesktop;