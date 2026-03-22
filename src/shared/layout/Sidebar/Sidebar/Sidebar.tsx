import React, { useEffect, useState } from "react";
import type { ModalType } from "@/components/Modal/Modal.types";

import SidebarDesktop from "./Sidebar.desktop";
import SidebarMobile from "./Sidebar.mobile";
import { StatementImportModal } from "@/components/Modal";
import { api } from "@/api/requests";
import type { BankAccount } from "@/models/settings/banking";

export interface SidebarProps {
  isOpen: boolean;
  handleOpenModal: (type: ModalType) => void;
  handleOpenTransferenceModal: () => void;
  toggleSidebar: () => void;
  mode: string;
}

const Sidebar: React.FC<SidebarProps> = (props) => {
  const [isMobile, setIsMobile] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [banks, setBanks] = useState<BankAccount[]>([]);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    const apply = () => setIsMobile(mql.matches);
    apply();
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
    const legacy = mql as unknown as {
      addListener?: (cb: () => void) => void;
      removeListener?: (cb: () => void) => void;
    };
    if (typeof legacy.addListener === "function") legacy.addListener(apply);
    return () => {
      if (typeof legacy.removeListener === "function") legacy.removeListener(apply);
    };
  }, []);

  useEffect(() => {
    if (!importOpen) return;
    api.getBanks().then(({ data }) => setBanks(data?.results || [])).catch(() => setBanks([]));
  }, [importOpen]);

  const sidebarProps = {
    ...props,
    handleOpenStatementImportModal: () => setImportOpen(true),
  };

  return (
    <>
      {isMobile ? <SidebarMobile {...sidebarProps} /> : <SidebarDesktop {...sidebarProps} />}
      <StatementImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        bankOptions={banks.map((b) => ({ label: `${b.institution} • ${b.branch ?? "-"} / ${b.account_number ?? "-"}`, value: b.id }))}
      />
    </>
  );
};

export default Sidebar;
