import React from "react";
import { PermissionMiddleware } from "@/middlewares";
import { useTranslation } from "react-i18next";

import type { ModalType } from "@/components/Modal/Modal.types";
import type { SidebarMode } from "./Sidebar";

type Props = {
  isOpen: boolean;
  toggleSidebar: () => void;
  handleOpenModal: (type: ModalType) => void;
  handleOpenTransferenceModal: () => void;
  handleOpenStatementImportModal: () => void;
  mode: SidebarMode;
};

const SidebarDesktop: React.FC<Props> = ({
  isOpen,
  toggleSidebar,
  handleOpenModal,
  handleOpenTransferenceModal,
  handleOpenStatementImportModal,
  mode,
}) => {
  const { t } = useTranslation(["sidebar"]);

  const ActionButton = ({
    onClick,
    label,
    icon,
  }: {
    onClick: () => void;
    label: string;
    icon: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-full items-center rounded-lg bg-white transition-colors duration-200 hover:bg-gray-100"
      aria-label={label}
      title={!isOpen ? label : undefined}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
        {icon}
      </div>

      <span
        className={[
          "overflow-hidden whitespace-nowrap text-[14px] transition-all duration-300",
          isOpen ? "ml-2 max-w-44 opacity-100" : "ml-0 max-w-0 opacity-0",
        ].join(" ")}
      >
        {label}
      </span>
    </button>
  );

  return (
    <nav
      aria-label={t("sidebar:sidebar.aria.nav")}
      className={[
        "top-16 left-0 z-50 flex h-[calc(100vh-4rem)] flex-col border-r border-gray-200 bg-white transition-all duration-300",
        isOpen ? "w-60" : "w-16",
      ].join(" ")}
    >
      <div className="flex flex-1 flex-col space-y-1 p-3 select-none">
        {mode !== "settled" && (
          <>
            <PermissionMiddleware codeName={["add_cash_flow_entries"]} requireAll>
              <ActionButton
                onClick={() => handleOpenModal("credit")}
                label={t("sidebar:sidebar.items.credit")}
                icon={
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <rect
                      x="4.5"
                      y="4.5"
                      width="15"
                      height="15"
                      rx="4"
                      strokeWidth="1.75"
                    />
                    <path
                      d="M12 8.5v7"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                    <path
                      d="M8.5 12h7"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  </svg>
                }
              />
            </PermissionMiddleware>

            <PermissionMiddleware codeName={["add_cash_flow_entries"]} requireAll>
              <ActionButton
                onClick={() => handleOpenModal("debit")}
                label={t("sidebar:sidebar.items.debit")}
                icon={
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <rect
                      x="4.5"
                      y="4.5"
                      width="15"
                      height="15"
                      rx="4"
                      strokeWidth="1.75"
                    />
                    <path
                      d="M8.5 12h7"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  </svg>
                }
              />
            </PermissionMiddleware>

            <PermissionMiddleware codeName={["add_transference"]} requireAll>
              <ActionButton
                onClick={handleOpenTransferenceModal}
                label={t("sidebar:sidebar.items.transfer")}
                icon={
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M5 9h14"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M17 7l2 2-2 2"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M19 15H5"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M7 13l-2 2 2 2"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                }
              />
            </PermissionMiddleware>

            <PermissionMiddleware codeName={["add_statement"]} requireAll requireSubscription>
              <ActionButton
                onClick={handleOpenStatementImportModal}
                label={t("sidebar:sidebar.items.importStatement", "Import statement")}
                icon={
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <path
                      d="M12 3v12"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                    <path
                      d="M8 11l4 4 4-4"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <rect
                      x="4"
                      y="17"
                      width="16"
                      height="4"
                      rx="1.5"
                      strokeWidth="1.75"
                    />
                  </svg>
                }
              />
            </PermissionMiddleware>
          </>
        )}
      </div>

      <div
        className={[
          "flex p-3 pt-0",
          isOpen ? "justify-end" : "justify-end",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          className="flex h-10 w-10 items-center justify-center rounded-lg bg-white transition-colors duration-200 hover:bg-gray-100"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            {isOpen ? (
              <path
                d="M15 6l-6 6 6 6"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M9 6l6 6-6 6"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </button>
      </div>
    </nav>
  );
};

export default SidebarDesktop;