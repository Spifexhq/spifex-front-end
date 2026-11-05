import { createContext, useContext } from "react";

export type AppShellState = {
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  toggleMobile: () => void;
  closeMobile: () => void;
  sidebarSlot: HTMLDivElement | null;
  openHelp: () => void;
  financialRevision?: number;
};
export const AppShellContext = createContext<AppShellState | null>(null);
export const useAppShell = () => useContext(AppShellContext);
