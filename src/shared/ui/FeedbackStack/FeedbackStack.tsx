import { useState, type ReactNode } from "react";
import { FeedbackStackContext } from "./context";

/**
 * One bottom-center portal target for Snackbar, ConfirmToast and selection
 * bars. Feedback layers become flex items, so they stack instead of colliding.
 * Above dialogs (z 15000), below nothing.
 */
export function FeedbackStackProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  return (
    <FeedbackStackContext.Provider value={node}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[15000] flex flex-col items-center gap-3 sm:bottom-6">
        <div ref={setNode} className="contents" />
      </div>
    </FeedbackStackContext.Provider>
  );
}
