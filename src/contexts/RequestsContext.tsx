import { createContext } from "react";
import { ApiSignIn, ApiGetUser } from "@/models/Auth"; 

export interface RequestsContextType {
  getUser: () => Promise<{ data?: ApiGetUser | null }>;
  signIn: (params: { email: string; password: string }) => Promise<{ data?: ApiSignIn | null; detail?: string }>;
}

export const RequestsContext = createContext<RequestsContextType | undefined>(undefined);
