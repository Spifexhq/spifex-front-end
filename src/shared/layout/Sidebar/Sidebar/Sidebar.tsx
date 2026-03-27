import React, { useEffect, useMemo, useState } from "react";
import { PermissionMiddleware } from "@/middlewares";

import SidebarDesktop from "./Sidebar.desktop";
import SidebarMobile from "./Sidebar.mobile";

import { EntriesModal, StatementImportModal, TransferenceModal } from "@/components/Modal";
import type { ModalType } from "@/components/Modal/Modal.types";

import { api } from "@/api/requests";
import { fetchAllCursor } from "@/lib/list";

import type { BankAccount } from "@/models/settings/banking";
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
  onStatementImportSaved?: () => void;

  entryModalState?: SidebarEntryModalState;
  onEntryModalClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  toggleSidebar,
  mode,
  onEntriesSaved,
  onTransferenceSaved,
  entryModalState,
  onEntryModalClose,
}) => {
  const [isMobile, setIsMobile] = useState(false);

  const [localEntryOpen, setLocalEntryOpen] = useState(false);
  const [localEntryType, setLocalEntryType] = useState<ModalType | null>(null);

  const [isTransferenceOpen, setIsTransferenceOpen] = useState(false);
  const [isStatementImportOpen, setIsStatementImportOpen] = useState(false);

  const [banks, setBanks] = useState<BankAccount[]>([]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const update = (event?: MediaQueryListEvent) => {
      setIsMobile(event ? event.matches : mediaQuery.matches);
    };

    update();
    mediaQuery.addEventListener("change", update);

    return () => {
      mediaQuery.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    if (!isStatementImportOpen) return;

    let alive = true;

    (async () => {
      try {
        const allBanks = await fetchAllCursor<BankAccount>((params?: { cursor?: string }) =>
          api.getBanks({ cursor: params?.cursor, active: "true" }),
        );

        if (!alive) return;
        setBanks(allBanks);
      } catch {
        if (!alive) return;
        setBanks([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isStatementImportOpen]);

  const controlledEntryOpen = !!entryModalState?.isOpen && !!entryModalState?.type;
  const entryType = controlledEntryOpen ? entryModalState?.type ?? null : localEntryType;
  const entryInitial = controlledEntryOpen ? entryModalState?.initialEntry ?? null : null;
  const entryLoading = controlledEntryOpen ? !!entryModalState?.isLoadingEntry : false;
  const entryOpen = controlledEntryOpen ? true : localEntryOpen;

  const bankOptions = useMemo(
    () =>
      banks.map((bank) => ({
        label: `${bank.institution} • ${bank.branch ?? "-"} / ${bank.account_number ?? "-"}`,
        value: bank.id,
      })),
    [banks],
  );

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

  const handleStatementImportClose = () => {
    setIsStatementImportOpen(false);
  };

  const actionProps = {
    isOpen,
    toggleSidebar,
    mode,
    handleOpenModal: openEntryModal,
    handleOpenTransferenceModal: () => setIsTransferenceOpen(true),
    handleOpenStatementImportModal: () => setIsStatementImportOpen(true),
  };

  return (
    <>
      {isMobile ? <SidebarMobile {...actionProps} /> : <SidebarDesktop {...actionProps} />}

      {entryType && (
        <PermissionMiddleware codeName={["add_cash_flow_entries", "add_settled_entries"]}>
          <EntriesModal
            isOpen={entryOpen}
            onClose={closeEntryModal}
            type={entryType}
            initialEntry={entryInitial}
            isLoadingEntry={entryLoading}
            onSave={handleEntrySave}
          />
        </PermissionMiddleware>
      )}

      {isTransferenceOpen && (
        <PermissionMiddleware codeName={"add_transference"}>
          <TransferenceModal
            isOpen={isTransferenceOpen}
            onClose={() => setIsTransferenceOpen(false)}
            onSave={handleTransferenceSave}
          />
        </PermissionMiddleware>
      )}

      {isStatementImportOpen && (
        <PermissionMiddleware codeName={"add_statement"} requireSubscription>
          <StatementImportModal
            open={isStatementImportOpen}
            onClose={handleStatementImportClose}
            bankOptions={bankOptions}
          />
        </PermissionMiddleware>
      )}
    </>
  );
};

export default Sidebar;