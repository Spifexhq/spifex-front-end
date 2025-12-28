import { createContext } from "react";
import type { SignInRequest, SignInResponse } from '@/models/auth/auth'
import type { GetUserResponse } from '@/models/auth/user';

export interface RequestsContextType {
  getUser: () => Promise<{ data?: GetUserResponse | null }>;
  signIn: (params: SignInRequest) => Promise<{ data?: SignInResponse | null; detail?: string }>;
}

export const RequestsContext = createContext<RequestsContextType | undefined>(undefined);
