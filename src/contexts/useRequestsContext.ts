import { useContext } from "react";
import { RequestsContext, RequestsContextType } from "@/contexts/RequestsContext";

export const useRequestsContext = (): RequestsContextType => {
  const context = useContext(RequestsContext);
  if (!context) {
    throw new Error("useRequestsContext must be used within a RequestsProvider");
  }
  return context;
};
