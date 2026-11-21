import { createContext, useContext } from "react";

type SidePanelContextValue = { onClose(): void; busy: boolean };

/** Lets footers rendered inside the panel body reach the drawer's close action. */
export const SidePanelContext = createContext<SidePanelContextValue | null>(null);

export function useSidePanel() {
  return useContext(SidePanelContext);
}
