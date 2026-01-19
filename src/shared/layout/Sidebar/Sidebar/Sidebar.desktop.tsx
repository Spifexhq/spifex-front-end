// src/components/Sidebar/Sidebar.desktop.tsx
import React from "react";
import { PermissionMiddleware } from "@/middlewares";
import { ModalType } from "@/components/Modal/Modal.types";
import { useTranslation } from "react-i18next";
import type { SidebarProps } from "./Sidebar";

const SidebarDesktop: React.FC<SidebarProps> = ({
  isOpen,
  handleOpenModal,
  handleOpenTransferenceModal,
  toggleSidebar,
  mode,
}) => {
  const { t } = useTranslation(["sidebar"]);

  return (
    <nav
      aria-label={t("sidebar:sidebar.aria.nav")}
      className={[
        "fixed top-16 left-0 h-[calc(100vh-4rem)] z-50 bg-white flex flex-col transition-all duration-300 border-r border-gray-200",
        isOpen ? "w-60" : "w-16",
      ].join(" ")}
    >
      <div className="flex flex-col flex-grow p-3 space-y-1 select-none">
        {mode !== "settled" && (
          <>
            <PermissionMiddleware codeName={["view_credit_modal_button"]} requireAll>
              <button
                type="button"
                onClick={() => handleOpenModal("credit" as ModalType)}
                className="flex items-center relative h-10 bg-white rounded-lg transition-colors duration-200 hover:bg-gray-100 w-full"
                aria-label={t("sidebar:sidebar.items.credit")}
              >
                <div className="flex items-center justify-center w-10 h-10">
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <rect x="4.5" y="4.5" width="15" height="15" rx="4" strokeWidth="1.75" />
                    <path strokeWidth="1.75" strokeLinecap="round" d="M12 8.5v7" />
                    <path strokeWidth="1.75" strokeLinecap="round" d="M8.5 12h7" />
                  </svg>
                </div>

                <span
                  className={[
                    "absolute left-10 text-[14px] whitespace-nowrap transition-all duration-300",
                    isOpen ? "opacity-100 max-w-40" : "opacity-0 max-w-0 pointer-events-none",
                  ].join(" ")}
                >
                  {t("sidebar:sidebar.items.credit")}
                </span>
              </button>
            </PermissionMiddleware>

            <PermissionMiddleware codeName={["view_debit_modal_button"]} requireAll>
              <button
                type="button"
                onClick={() => handleOpenModal("debit" as ModalType)}
                className="flex items-center relative h-10 bg-white rounded-lg transition-colors duration-200 hover:bg-gray-100 w-full"
                aria-label={t("sidebar:sidebar.items.debit")}
              >
                <div className="flex items-center justify-center w-10 h-10">
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <rect x="4.5" y="4.5" width="15" height="15" rx="4" strokeWidth="1.75" />
                    <path strokeWidth="1.75" strokeLinecap="round" d="M8.5 12h7" />
                  </svg>
                </div>

                <span
                  className={[
                    "absolute left-10 text-[14px] whitespace-nowrap transition-all duration-300",
                    isOpen ? "opacity-100 max-w-40" : "opacity-0 max-w-0 pointer-events-none",
                  ].join(" ")}
                >
                  {t("sidebar:sidebar.items.debit")}
                </span>
              </button>
            </PermissionMiddleware>

            <PermissionMiddleware codeName={["view_transference_modal_button"]} requireAll>
              <button
                type="button"
                onClick={handleOpenTransferenceModal}
                className="flex items-center relative h-10 bg-white rounded-lg transition-colors duration-200 hover:bg-gray-100 w-full"
                aria-label={t("sidebar:sidebar.items.transfer")}
              >
                <div className="flex items-center justify-center w-10 h-10">
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M5 9h14" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M17 7l2 2-2 2" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M19 15H5" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7 13l-2 2 2 2" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <span
                  className={[
                    "absolute left-10 text-[14px] whitespace-nowrap transition-all duration-300",
                    isOpen ? "opacity-100 max-w-40" : "opacity-0 max-w-0 pointer-events-none",
                  ].join(" ")}
                >
                  {t("sidebar:sidebar.items.transfer")}
                </span>
              </button>
            </PermissionMiddleware>
          </>
        )}
      </div>

      <div className="flex justify-end items-center w-full p-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isOpen ? t("sidebar:sidebar.aria.toggleClose") : t("sidebar:sidebar.aria.toggleOpen")}
          className="border border-gray-300 hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-300"
        >
          <svg
            className={[
              "w-5 h-5 transform transition-transform duration-300",
              isOpen ? "rotate-180" : "rotate-0",
            ].join(" ")}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </nav>
  );
};

export default SidebarDesktop;
