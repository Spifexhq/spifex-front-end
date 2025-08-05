import { createContext } from "react";
import { SignInRequest, SignInResponse, GetUserResponse } from "@/models/auth/dto";

export interface RequestsContextType {
  getUser: () => Promise<{ data?: GetUserResponse | null }>;
  signIn: (params: SignInRequest) => Promise<{ data?: SignInResponse | null; detail?: string }>;
}

export const RequestsContext = createContext<RequestsContextType | undefined>(undefined);
