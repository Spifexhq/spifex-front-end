import { createContext, useContext } from "react";

export const FeedbackStackContext = createContext<HTMLElement | null>(null);

export function useFeedbackStack() {
  return useContext(FeedbackStackContext);
}
