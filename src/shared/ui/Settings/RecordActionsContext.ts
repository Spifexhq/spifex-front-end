import { createContext } from "react";
export const RecordActionsContext = createContext<{ deleteRecord?: (id: string) => Promise<unknown>; onDeleted?: (ids: string[]) => unknown; permission?: string }>({});
