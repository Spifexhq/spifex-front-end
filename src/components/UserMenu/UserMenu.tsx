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
  const { t } = useTranslation(["settings"]);

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
      aria-label={t("settings:userMenu.aria.menu")}
      className="user-menu absolute top-[85%] z-50 w-64 max-w-[calc(100vw-1rem)] bg-white
                 shadow-lg rounded-md py-1 border-[0.5px] border-[#d6d6d6] right-2"
    >
      {/* Personal Settings */}
      <Link
        to="/settings/personal"
        onClick={onClose}
        className="flex items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
        role="menuitem"
        aria-label={t("settings:userMenu.items.personal")}
      >
        <img alt={t("settings:userMenu.alt.personal")} src={personalIcon} className="w-5 h-5" />
        <span className="ml-2">{t("settings:userMenu.items.personal")}</span>
      </Link>

      {/* Company Settings */}
      <Link
        to="/settings/company-settings"
        onClick={onClose}
        className="flex items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
        role="menuitem"
        aria-label={t("settings:userMenu.items.company")}
      >
        <img alt={t("settings:userMenu.alt.company")} src={settingsIcon} className="w-5 h-5" />
        <span className="ml-2">{t("settings:userMenu.items.company")}</span>
      </Link>

      {/* Notifications */}
      <button
        onClick={onClose}
        className="flex w-full items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
        role="menuitem"
        aria-label={t("settings:userMenu.items.notifications")}
      >
        <img alt={t("settings:userMenu.alt.notifications")} src={notificationsIcon} className="w-5 h-5" />
        <span className="ml-2">{t("settings:userMenu.items.notifications")}</span>
      </button>

      {/* Help */}
      <button
        onClick={() => {
          onClose();
          onHelpClick();
        }}
        className="flex w-full items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
        role="menuitem"
        aria-label={t("settings:userMenu.items.help")}
      >
        <img alt={t("settings:userMenu.alt.help")} src={helpIcon} className="w-5 h-5" />
        <span className="ml-2">{t("settings:userMenu.items.help")}</span>
      </button>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-start px-4 py-2 text-sm text-red-600 hover:bg-gray-100 text-left"
        role="menuitem"
        aria-label={t("settings:userMenu.items.signout")}
      >
        <img alt={t("settings:userMenu.alt.signout")} src={exitIcon} className="w-5 h-5" />
        <span className="ml-2">{t("settings:userMenu.items.signout")}</span>
      </button>
    </div>
  );
};

export default UserMenu;
