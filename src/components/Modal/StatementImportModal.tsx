/* -------------------------------------------------------------------------- */
/* File: src/components/Modal/StatementImportModal.tsx                        */
/* -------------------------------------------------------------------------- */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import StatementImportWizard from "@/components/StatementImportWizard/StatementImportWizard";
import Snackbar from "@/shared/ui/Snackbar";
import type { Statement } from "@/models/settings/statements";

type BankOption = { label: string; value: string };

type Props = {
  open: boolean;
  statement?: Statement | null;
  initialStatementId?: string | null;
  bankOptions?: BankOption[];
  onClose: () => void;
  onCommitted?: (payload: {
    createdCount: number;
    entryIds: string[];
    statementId?: string | null;
  }) => void;
  onStatementCreated?: (statement: Statement) => void;
};

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

const StatementImportModal: React.FC<Props> = ({
  open,
  onClose,
  ...rest
}) => {
  const beforeCloseRef = useRef<null | (() => Promise<boolean>)>(null);
  const closingRef = useRef(false);
  const [snack, setSnack] = useState<Snack>(null);

  const requestClose = useCallback(async () => {
    if (closingRef.current) return;

    closingRef.current = true;
    try {
      const shouldClose = beforeCloseRef.current
        ? await beforeCloseRef.current()
        : true;

      if (shouldClose !== false) {
        onClose();
      }
    } catch {
      setSnack({
        message: "Could not close the review right now.",
        severity: "error",
      });
    } finally {
      closingRef.current = false;
    }
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      void requestClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, requestClose]);

  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9999] bg-black/35 md:grid md:place-items-center" >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Import statement"
          onMouseDown={(event) => event.stopPropagation()}
          className={[
            "relative flex w-full flex-col overflow-hidden bg-white shadow-2xl",
            "fixed inset-x-0 bottom-0 h-[100dvh] max-h-[100dvh] rounded-none border-0",
            "md:static md:h-[94vh] md:max-h-[94vh] md:w-[1560px] md:max-w-[96vw]",
            "md:rounded-lg md:border md:border-gray-200",
          ].join(" ")}
        >
          <div className="shrink-0 pb-1 pt-2 md:hidden flex justify-center">
            <div className="h-1.5 w-12 rounded-full bg-gray-300" />
          </div>

          <header className="shrink-0 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-3 md:px-5 md:pt-4">
              <div className="min-w-0 flex items-center gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-700">
                  AI
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wide text-gray-600">
                    Cashflow import
                  </div>
                  <h1 className="text-[16px] font-semibold leading-snug text-gray-900">
                    Review imported entries
                  </h1>
                </div>
              </div>

              <button
                type="button"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                onClick={() => void requestClose()}
                aria-label="Close"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-hidden">
            <StatementImportWizard
              registerBeforeClose={(handler) => {
                beforeCloseRef.current = handler;
              }}
              {...rest}
            />
          </div>
        </div>
      </div>

      <Snackbar
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={6000}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </>,
    document.body
  );
};

export default StatementImportModal;