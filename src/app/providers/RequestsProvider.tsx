import type { ReactNode } from "react";
import { RequestsContext } from "@/app/providers/RequestsContext";
import { api } from "@/core/api/requests";

export const RequestsProvider = ({ children }: { children: ReactNode }) => {
  return <RequestsContext.Provider value={api}>{children}</RequestsContext.Provider>;
};
