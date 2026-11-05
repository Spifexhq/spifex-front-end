
import { createPortal } from "react-dom";
import { useAppShell } from "@/contexts/AppShellContext";
import React, { useCallback, useEffect, useState } from "react";
import { PermissionMiddleware } from "@/middlewares";

import SidebarDesktop from "./Sidebar.desktop";
import SidebarMobile from "./Sidebar.mobile";

import EntriesModal from "@/pages/Finance/components/EntryForm/EntriesModal";
import TransferenceModal from "@/pages/Finance/components/TransferForm/TransferenceModal";
import type { ModalType } from "@/pages/Finance/components/EntryForm/types";
import type { Entry } from "@/models/entries/entries";

export type SidebarMode = "default" | "settled";

export type SidebarEntryModalState = {
  isOpen: boolean;
  type: ModalType | null;
  initialEntry?: Entry | null;
  isLoadingEntry?: boolean;
};

export interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  mode: SidebarMode;

  onEntriesSaved?: () => void;
  onTransferenceSaved?: () => void;

  entryModalState?: SidebarEntryModalState;
  onEntryModalClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen: providedOpen,
  toggleSidebar: providedToggle,
  mode,
  onEntriesSaved,
  onTransferenceSaved,
  entryModalState,
  onEntryModalClose,
}) => {
  const shell = useAppShell();

  const isOpen = shell ? !shell.collapsed : providedOpen;
  const toggleSidebar = shell?.toggleCollapsed ?? providedToggle;

  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = useCallback(
    () => setMobileOpen((open) => !open),
    []
  );

  useEffect(() => {
    if (!isMobile) setMobileOpen(false);
  }, [isMobile]);

  const [localEntryOpen, setLocalEntryOpen] = useState(false);
  const [localEntryType, setLocalEntryType] =
    useState<ModalType | null>(null);

  const [isTransferenceOpen, setIsTransferenceOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const update = (event?: MediaQueryListEvent) => {
      setIsMobile(event ? event.matches : mediaQuery.matches);
    };

    update();
    mediaQuery.addEventListener("change", update);

    return () => {
      mediaQuery.removeEventListener("change", update);
    };
  }, []);

  const controlledEntryOpen =
    !!entryModalState?.isOpen && !!entryModalState?.type;

  const entryType = controlledEntryOpen
    ? entryModalState?.type ?? null
    : localEntryType;

  const entryInitial = controlledEntryOpen
    ? entryModalState?.initialEntry ?? null
    : null;

  const entryLoading = controlledEntryOpen
    ? !!entryModalState?.isLoadingEntry
    : false;

  const entryOpen = controlledEntryOpen
    ? true
    : localEntryOpen;

  const openEntryModal = (type: ModalType) => {
    setLocalEntryType(type);
    setLocalEntryOpen(true);
  };

  const closeEntryModal = () => {
    if (controlledEntryOpen) {
      onEntryModalClose?.();
      return;
    }

    setLocalEntryOpen(false);
    setLocalEntryType(null);
  };

  const handleEntrySave = () => {
    closeEntryModal();
    onEntriesSaved?.();
  };

  const handleTransferenceSave = () => {
    setIsTransferenceOpen(false);
    onTransferenceSaved?.();
  };

  const actionProps = {
    isOpen,
    toggleSidebar,
    mode,
    handleOpenModal: openEntryModal,
    handleOpenTransferenceModal: () =>
      setIsTransferenceOpen(true),
  };

  return (
    <>
      {shell
        ? shell.sidebarSlot &&
          createPortal(
            isMobile ? (
              <SidebarMobile
                {...actionProps}
                isOpen={shell.mobileOpen}
                toggleSidebar={shell.toggleMobile}
              />
            ) : (
              <SidebarDesktop {...actionProps} />
            ),
            shell.sidebarSlot
          )
        : isMobile ? (
          <SidebarMobile
            {...actionProps}
            isOpen={mobileOpen}
            toggleSidebar={toggleMobile}
          />
        ) : (
          <SidebarDesktop {...actionProps} />
        )}

      <PermissionMiddleware
        codeName={[
          "add_cash_flow_entries",
          "add_settled_entries",
        ]}
      >
        <EntriesModal
          isOpen={entryOpen}
          onClose={closeEntryModal}
          type={entryType ?? "credit"}
          initialEntry={entryInitial}
          isLoadingEntry={entryLoading}
          onSave={handleEntrySave}
        />
      </PermissionMiddleware>

      <PermissionMiddleware codeName="add_transference">
        <TransferenceModal
          isOpen={isTransferenceOpen}
          onClose={() => setIsTransferenceOpen(false)}
          onSave={handleTransferenceSave}
        />
      </PermissionMiddleware>
    </>
  );
};

export default Sidebar;
