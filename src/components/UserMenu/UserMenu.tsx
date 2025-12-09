/**
 * UserMenu.tsx
 *
 * Dropdown menu for user-related actions (i18n ready).
 */

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/api";
import settingsIcon from "@/assets/Icons/userMenu/settings.svg";
import personalIcon from "@/assets/Icons/userMenu/enterprise-panel.svg";
import notificationsIcon from "@/assets/Icons/userMenu/notifications.svg";
import helpIcon from "@/assets/Icons/userMenu/help.svg";
import exitIcon from "@/assets/Icons/userMenu/exit.svg";
import { useTranslation } from "react-i18next";

interface UserMenuProps {
  onClose: () => void;
  onHelpClick: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ onClose, onHelpClick }) => {
  const navigate = useNavigate();
  const { handleSignOut } = useAuth();
  const { t } = useTranslation("userMenu");

  const handleLogout = () => {
    handleSignOut();
    onClose();
    setTimeout(() => {
      navigate("/signin");
    }, 100);
  };

  return (
    <div
      role="menu"
      aria-label={t("aria.menu")}
      className="user-menu absolute top-[85%] z-50 w-64 max-w-[calc(100vw-1rem)] bg-white
                 shadow-lg rounded-md py-1 border-[0.5px] border-[#d6d6d6] right-2"
    >
      {/* Personal Settings */}
      <Link
        to="/settings/personal"
        onClick={onClose}
        className="flex items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
        role="menuitem"
        aria-label={t("items.personal")}
      >
        <img alt={t("alt.personal")} src={personalIcon} className="w-5 h-5" />
        <span className="ml-2">{t("items.personal")}</span>
      </Link>

      {/* Organization Settings (renamed from Company) */}
      <Link
        to="/settings/organization-settings"
        onClick={onClose}
        className="flex items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
        role="menuitem"
        aria-label={t("items.organization")}
      >
        <img alt={t("alt.organization")} src={settingsIcon} className="w-5 h-5" />
        <span className="ml-2">{t("items.organization")}</span>
      </Link>

      {/* Notifications */}
      <Link
        to="/settings/notifications"
        onClick={onClose}
        className="flex w-full items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
        role="menuitem"
        aria-label={t("items.notifications")}
      >
        <img alt={t("alt.notifications")} src={notificationsIcon} className="w-5 h-5" />
        <span className="ml-2">{t("items.notifications")}</span>
      </Link>

      {/* Help */}
      <button
        onClick={() => {
          onClose();
          onHelpClick();
        }}
        className="flex w-full items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
        role="menuitem"
        aria-label={t("items.help")}
      >
        <img alt={t("alt.help")} src={helpIcon} className="w-5 h-5" />
        <span className="ml-2">{t("items.help")}</span>
      </button>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-start px-4 py-2 text-sm text-red-600 hover:bg-gray-100 text-left"
        role="menuitem"
        aria-label={t("items.signout")}
      >
        <img alt={t("alt.signout")} src={exitIcon} className="w-5 h-5" />
        <span className="ml-2">{t("items.signout")}</span>
      </button>
    </div>
  );
};

export default UserMenu;
