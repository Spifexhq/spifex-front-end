// src/components/Sidebar/Sidebar.tsx  (ORCHESTRATOR)
import React, { useEffect, useState } from "react";
import type { ModalType } from "@/components/Modal/Modal.types";

import SidebarDesktop from "./Sidebar.desktop";
import SidebarMobile from "./Sidebar.mobile";

export interface SidebarProps {
  isOpen: boolean;
  handleOpenModal: (type: ModalType) => void;
  handleOpenTransferenceModal: () => void;
  toggleSidebar: () => void;
  mode: string;
}

const Sidebar: React.FC<SidebarProps> = (props) => {
  const [isMobile, setIsMobile] = useState(false);

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

  return isMobile ? <SidebarMobile {...props} /> : <SidebarDesktop {...props} />;
};

export default Sidebar;
