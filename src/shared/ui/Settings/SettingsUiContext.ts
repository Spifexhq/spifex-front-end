import { createContext } from "react";
export const SettingsUiContext = createContext<{ settings: boolean; owner?: string }>({ settings: false });
