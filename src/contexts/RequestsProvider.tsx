import { ReactNode } from "react";
import { RequestsContext } from "@/contexts/RequestsContext";
import { useRequests } from "@/api/requests";

export const RequestsProvider = ({ children }: { children: ReactNode }) => {
  const requests = useRequests();

  return <RequestsContext.Provider value={requests}>{children}</RequestsContext.Provider>;
};
