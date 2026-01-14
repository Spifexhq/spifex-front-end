import { createContext } from "react";
import type { api } from "@/api/requests";

export type RequestsContextType = typeof api;

export const RequestsContext = createContext<RequestsContextType | undefined>(undefined);
