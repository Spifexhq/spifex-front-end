import { ReactNode } from "react";
import { RequestsContext } from "@/contexts/RequestsContext";
import { api } from "src/api/requests"; // <- substitui useRequests por api

export const RequestsProvider = ({ children }: { children: ReactNode }) => {
  return (
    <RequestsContext.Provider value={api}>
      {children}
    </RequestsContext.Provider>
  );
};
