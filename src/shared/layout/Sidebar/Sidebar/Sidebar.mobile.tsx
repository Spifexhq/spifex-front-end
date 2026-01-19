import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { PermissionMiddleware } from "@/middlewares";
import type { ModalType } from "@/components/Modal/Modal.types";
import type { SidebarProps } from "./Sidebar";

const MOBILE_SIDEBAR_EVENT = "spifex:mobileSidebar:setHidden";

type IconProps = { className?: string };

type ActionButtonProps = {
  ariaLabel: string;
  onClick: () => void;
  Icon: React.FC<IconProps>;
};

const ActionButton: React.FC<ActionButtonProps> = ({ ariaLabel, onClick, Icon }) => {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={[
        "inline-flex h-11 w-11 items-center justify-center rounded-2xl",
        "transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300",
        "text-gray-700 hover:bg-gray-100 active:bg-gray-200",
      ].join(" ")}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
};

const IconCredit: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
    <rect x="4.5" y="4.5" width="15" height="15" rx="4" strokeWidth="1.75" />
    <path strokeWidth="1.75" strokeLinecap="round" d="M12 8.5v7" />
    <path strokeWidth="1.75" strokeLinecap="round" d="M8.5 12h7" />
  </svg>
);

const IconDebit: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
    <rect x="4.5" y="4.5" width="15" height="15" rx="4" strokeWidth="1.75" />
    <path strokeWidth="1.75" strokeLinecap="round" d="M8.5 12h7" />
  </svg>
);

const IconTransfer: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
    <path d="M5 9h14" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 7l2 2-2 2" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 15H5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 13l-2 2 2 2" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

declare global {
  interface Window {
    __SPX_MOBILE_SIDEBAR_HIDDEN__?: boolean;
  }
}

const SidebarMobile: React.FC<SidebarProps> = ({ handleOpenModal, handleOpenTransferenceModal, mode }) => {
  const { t } = useTranslation(["sidebar"]);

  // Hooks must always run
  const [mounted, setMounted] = useState(false);
  const [hiddenBySelection, setHiddenBySelection] = useState<boolean>(() => Boolean(window.__SPX_MOBILE_SIDEBAR_HIDDEN__));

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handler = (ev: Event) => {
      const e = ev as CustomEvent<{ hidden?: boolean }>;
      const next = Boolean(e.detail?.hidden);
      setHiddenBySelection(next);
      window.__SPX_MOBILE_SIDEBAR_HIDDEN__ = next;
    };

    window.addEventListener(MOBILE_SIDEBAR_EVENT, handler as EventListener);
    return () => window.removeEventListener(MOBILE_SIDEBAR_EVENT, handler as EventListener);
  }, []);

  const portalTarget = useMemo(() => (mounted ? document.body : null), [mounted]);

  // Conditional returns AFTER hooks
  if (mode === "settled") return null;
  if (hiddenBySelection) return null;
  if (!portalTarget) return null;

  const node = (
    <nav
      aria-label={t("sidebar:sidebar.aria.nav")}
      className={[
        "sm:hidden",
        "fixed left-1/2 -translate-x-1/2",
        "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
        "z-[70]",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center gap-1 rounded-2xl",
          "border border-gray-200 bg-white/90 px-2 py-2 shadow-lg backdrop-blur",
        ].join(" ")}
      >
        <PermissionMiddleware codeName={["view_credit_modal_button"]} requireAll>
          <ActionButton
            ariaLabel={t("sidebar:sidebar.items.credit")}
            onClick={() => handleOpenModal("credit" as ModalType)}
            Icon={IconCredit}
          />
        </PermissionMiddleware>

        <PermissionMiddleware codeName={["view_debit_modal_button"]} requireAll>
          <ActionButton
            ariaLabel={t("sidebar:sidebar.items.debit")}
            onClick={() => handleOpenModal("debit" as ModalType)}
            Icon={IconDebit}
          />
        </PermissionMiddleware>

        <PermissionMiddleware codeName={["view_transference_modal_button"]} requireAll>
          <ActionButton
            ariaLabel={t("sidebar:sidebar.items.transfer")}
            onClick={handleOpenTransferenceModal}
            Icon={IconTransfer}
          />
        </PermissionMiddleware>
      </div>
    </nav>
  );

  return createPortal(node, portalTarget);
};

export default SidebarMobile;
