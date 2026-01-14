import type { ReactNode } from "react";
import { RequestsContext } from "@/contexts/RequestsContext";
import { api } from "@/api/requests";

export const RequestsProvider = ({ children }: { children: ReactNode }) => {
  return <RequestsContext.Provider value={api}>{children}</RequestsContext.Provider>;
};
