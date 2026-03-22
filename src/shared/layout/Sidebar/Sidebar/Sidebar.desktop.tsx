import React from "react";
import { PermissionMiddleware } from "@/middlewares";
import { ModalType } from "@/components/Modal/Modal.types";
import { useTranslation } from "react-i18next";

import type { SidebarProps } from "./Sidebar";

type Props = SidebarProps & { handleOpenStatementImportModal: () => void };

const SidebarDesktop: React.FC<Props> = ({
  isOpen,
  handleOpenModal,
  handleOpenTransferenceModal,
  handleOpenStatementImportModal,
  mode,
}) => {
  const { t } = useTranslation(["sidebar"]);

  const ActionButton = ({ onClick, label, icon }: { onClick: () => void; label: string; icon: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      className="relative flex h-10 w-full items-center rounded-lg bg-white transition-colors duration-200 hover:bg-gray-100"
      aria-label={label}
    >
      <div className="flex h-10 w-10 items-center justify-center">{icon}</div>
      <span className={["absolute left-10 whitespace-nowrap text-[14px] transition-all duration-300", isOpen ? "max-w-44 opacity-100" : "pointer-events-none max-w-0 opacity-0"].join(" ")}>{label}</span>
    </button>
  );

  return (
    <nav
      aria-label={t("sidebar:sidebar.aria.nav")}
      className={["top-16 left-0 z-50 flex h-[calc(100vh-4rem)] flex-col border-r border-gray-200 bg-white transition-all duration-300", isOpen ? "w-60" : "w-16"].join(" ")}
    >
      <div className="flex flex-grow flex-col space-y-1 p-3 select-none">
        {mode !== "settled" && (
          <>
            <PermissionMiddleware codeName={["add_cash_flow_entries"]} requireAll>
              <ActionButton
                onClick={() => handleOpenModal("credit" as ModalType)}
                label={t("sidebar:sidebar.items.credit")}
                icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4.5" y="4.5" width="15" height="15" rx="4" strokeWidth="1.75" /><path strokeWidth="1.75" strokeLinecap="round" d="M12 8.5v7" /><path strokeWidth="1.75" strokeLinecap="round" d="M8.5 12h7" /></svg>}
              />
            </PermissionMiddleware>
            <PermissionMiddleware codeName={["add_cash_flow_entries"]} requireAll>
              <ActionButton
                onClick={() => handleOpenModal("debit" as ModalType)}
                label={t("sidebar:sidebar.items.debit")}
                icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4.5" y="4.5" width="15" height="15" rx="4" strokeWidth="1.75" /><path strokeWidth="1.75" strokeLinecap="round" d="M8.5 12h7" /></svg>}
              />
            </PermissionMiddleware>
            <PermissionMiddleware codeName={["add_transference"]} requireAll>
              <ActionButton
                onClick={handleOpenTransferenceModal}
                label={t("sidebar:sidebar.items.transfer")}
                icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 9h14" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /><path d="M17 7l2 2-2 2" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /><path d="M19 15H5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 13l-2 2 2 2" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              />
            </PermissionMiddleware>
            <PermissionMiddleware codeName={["change_statement"]} requireAll>
              <ActionButton
                onClick={handleOpenStatementImportModal}
                label="Import statement"
                icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v12" strokeWidth="1.75" strokeLinecap="round"/><path d="M8 11l4 4 4-4" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/><rect x="4" y="17" width="16" height="4" rx="1.5" strokeWidth="1.75"/></svg>}
              />
            </PermissionMiddleware>
          </>
        )}
      </div>
    </nav>
  );
};

export default SidebarDesktop;
