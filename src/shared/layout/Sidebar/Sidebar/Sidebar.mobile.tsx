import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { PermissionMiddleware } from "@/middlewares";

import type { ModalType } from "@/components/Modal/Modal.types";
import type { SidebarMode } from "./Sidebar";

const MOBILE_SIDEBAR_EVENT = "spifex:mobileSidebar:setHidden";

type Props = {
  handleOpenModal: (type: ModalType) => void;
  handleOpenTransferenceModal: () => void;
  handleOpenStatementImportModal: () => void;
  mode: SidebarMode;
};

type ActionButtonProps = {
  ariaLabel: string;
  onClick: () => void;
  children: React.ReactNode;
};

const ActionButton: React.FC<ActionButtonProps> = ({ ariaLabel, onClick, children }) => (
  <button
    type="button"
    aria-label={ariaLabel}
    onClick={onClick}
    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-gray-700 transition-colors hover:bg-gray-100 active:bg-gray-200"
  >
    {children}
  </button>
);

declare global {
  interface Window {
    __SPX_MOBILE_SIDEBAR_HIDDEN__?: boolean;
  }
}

const SidebarMobile: React.FC<Props> = ({
  handleOpenModal,
  handleOpenTransferenceModal,
  handleOpenStatementImportModal,
  mode,
}) => {
  const { t } = useTranslation(["sidebar"]);
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState<boolean>(() => !!window.__SPX_MOBILE_SIDEBAR_HIDDEN__);

  useEffect(() => {
    setMounted(true);

    const listener = (ev: Event) => {
      const customEvent = ev as CustomEvent<{ hidden?: boolean }>;
      const nextHidden = !!customEvent.detail?.hidden;
      window.__SPX_MOBILE_SIDEBAR_HIDDEN__ = nextHidden;
      setHidden(nextHidden);
    };

    window.addEventListener(MOBILE_SIDEBAR_EVENT, listener as EventListener);

    return () => {
      window.removeEventListener(MOBILE_SIDEBAR_EVENT, listener as EventListener);
    };
  }, []);

  if (!mounted || hidden || mode === "settled") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[90] flex justify-center px-3 sm:hidden">
      <div className="pointer-events-auto flex items-center gap-2 rounded-[22px] border border-gray-200 bg-white/95 px-3 py-2 shadow-xl backdrop-blur">
        <PermissionMiddleware codeName={["add_cash_flow_entries"]} requireAll>
          <ActionButton
            ariaLabel={t("sidebar:sidebar.items.credit")}
            onClick={() => handleOpenModal("credit")}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="4.5" y="4.5" width="15" height="15" rx="4" strokeWidth="1.75" />
              <path strokeWidth="1.75" strokeLinecap="round" d="M12 8.5v7" />
              <path strokeWidth="1.75" strokeLinecap="round" d="M8.5 12h7" />
            </svg>
          </ActionButton>
        </PermissionMiddleware>

        <PermissionMiddleware codeName={["add_cash_flow_entries"]} requireAll>
          <ActionButton
            ariaLabel={t("sidebar:sidebar.items.debit")}
            onClick={() => handleOpenModal("debit")}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="4.5" y="4.5" width="15" height="15" rx="4" strokeWidth="1.75" />
              <path strokeWidth="1.75" strokeLinecap="round" d="M8.5 12h7" />
            </svg>
          </ActionButton>
        </PermissionMiddleware>

        <PermissionMiddleware codeName={["add_transference"]} requireAll>
          <ActionButton
            ariaLabel={t("sidebar:sidebar.items.transfer")}
            onClick={handleOpenTransferenceModal}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M5 9h14" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M17 7l2 2-2 2" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 15H5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 13l-2 2 2 2" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </ActionButton>
        </PermissionMiddleware>

        <PermissionMiddleware codeName={["add_statement"]} requireAll requireSubscription>
          <ActionButton
            ariaLabel={t("sidebar:sidebar.items.importStatement", "Import statement")}
            onClick={handleOpenStatementImportModal}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12 3v12" strokeWidth="1.75" strokeLinecap="round" />
              <path d="M8 11l4 4 4-4" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="4" y="17" width="16" height="4" rx="1.5" strokeWidth="1.75" />
            </svg>
          </ActionButton>
        </PermissionMiddleware>
      </div>
    </div>,
    document.body,
  );
};

export default SidebarMobile;