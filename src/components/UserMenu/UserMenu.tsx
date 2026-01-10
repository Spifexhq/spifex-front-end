/**
 * UserMenu.tsx
 *
 * Dropdown menu for user-related actions (i18n ready).
 * Adds the same open/close transition used by SelectDropdown:
 * - transition-all duration-150 ease-out
 * - opacity/translate + pointer-events gating
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
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

const CLOSE_MS = 150;

function isModifiedClick(e: React.MouseEvent) {
  return (
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey ||
    // non-left click (e.g., middle click)
    (typeof e.button === "number" && e.button !== 0)
  );
}

const UserMenu: React.FC<UserMenuProps> = ({ onClose, onHelpClick }) => {
  const navigate = useNavigate();
  const { handleSignOut } = useAuth();
  const { t } = useTranslation("userMenu");

  // Local mount/open state to enable enter/exit transitions.
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const openRafRef = useRef<number | null>(null);

  useEffect(() => {
    // Animate in on mount (next frame) so CSS transitions can interpolate.
    openRafRef.current = window.requestAnimationFrame(() => setIsOpen(true));

    return () => {
      if (openRafRef.current != null) window.cancelAnimationFrame(openRafRef.current);
      if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const closeWithAnimation = useCallback(
    (after?: () => void) => {
      setIsOpen(false);
      if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);

      closeTimerRef.current = window.setTimeout(() => {
        onClose();
        after?.();
      }, CLOSE_MS);
    },
    [onClose]
  );

  const handleNavigate = useCallback(
    (path: string) =>
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Preserve default browser behavior for modified clicks (new tab, etc.).
        if (isModifiedClick(e)) {
          closeWithAnimation();
          return;
        }
        e.preventDefault();
        closeWithAnimation(() => navigate(path));
      },
    [closeWithAnimation, navigate]
  );

  const handleHelp = () => {
    closeWithAnimation(onHelpClick);
  };

  const handleLogout = () => {
    handleSignOut();
    closeWithAnimation(() => navigate("/signin"));
  };

  return (
    <div
      role="menu"
      aria-label={t("aria.menu")}
      className={[
        "user-menu absolute top-[85%] right-2 z-50 w-64 max-w-[calc(100vw-1rem)]",
        "bg-white shadow-lg rounded-md py-1 border-[0.5px] border-[#d6d6d6]",
        "origin-top",
        "transition-all duration-150 ease-out",
        isOpen
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 -translate-y-1 pointer-events-none",
      ].join(" ")}
      data-user-menu-open={isOpen ? "true" : "false"}
    >
      {/* Personal Settings */}
      <Link
        to="/settings/personal"
        onClick={handleNavigate("/settings/personal")}
        className="flex items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
        role="menuitem"
        aria-label={t("items.personal")}
      >
        <img alt={t("alt.personal")} src={personalIcon} className="w-5 h-5" />
        <span className="ml-2">{t("items.personal")}</span>
      </Link>

      {/* Organization Settings */}
      <Link
        to="/settings/organization-settings"
        onClick={handleNavigate("/settings/organization-settings")}
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
        onClick={handleNavigate("/settings/notifications")}
        className="flex w-full items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
        role="menuitem"
        aria-label={t("items.notifications")}
      >
        <img alt={t("alt.notifications")} src={notificationsIcon} className="w-5 h-5" />
        <span className="ml-2">{t("items.notifications")}</span>
      </Link>

      {/* Help */}
      <button
        onClick={handleHelp}
        className="flex w-full items-center justify-start px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
        role="menuitem"
        aria-label={t("items.help")}
        type="button"
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
        type="button"
      >
        <img alt={t("alt.signout")} src={exitIcon} className="w-5 h-5" />
        <span className="ml-2">{t("items.signout")}</span>
      </button>
    </div>
  );
};

export default UserMenu;
