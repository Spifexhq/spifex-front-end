// contexts/useAuthContext.ts
import { useContext } from "react";
import { AuthContext, AuthContextType } from "@/app/authentication/AuthContext";

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
