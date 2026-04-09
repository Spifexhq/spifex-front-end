import React from "react";
import { X, ArrowUpRight } from "lucide-react";

import AccountingReadinessBadge from "./AccountingReadinessBadge";

import type { AccountingReadiness } from "@/models/entries/accountingReadiness";

interface Props {
  open: boolean;
  accounting?: Partial<AccountingReadiness> | null;
  onClose: () => void;
  onOpenAccountingSettings?: () => void;
}

const AccountingReasonDrawer: React.FC<Props> = ({
  open,
  accounting,
  onClose,
  onOpenAccountingSettings,
}) => {
  const [mounted, setMounted] = React.useState(open);
  const [visible, setVisible] = React.useState(open);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      setVisible(false);

      const id = window.setTimeout(() => setVisible(true), 16);
      return () => window.clearTimeout(id);
    }

    setVisible(false);

    const id = window.setTimeout(() => setMounted(false), 300);
    return () => window.clearTimeout(id);
  }, [open]);

  React.useEffect(() => {
    if (!mounted) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mounted]);

  React.useEffect(() => {
    if (!mounted) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="accounting-reason-drawer-title"
        className={[
          "absolute inset-y-0 right-0 flex h-full w-full max-w-[420px] flex-col border-l border-gray-200 bg-white",
          "transition-transform duration-300 ease-out",
          visible ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
                Accounting reason
              </div>
              <h2
                id="accounting-reason-drawer-title"
                className="mt-1 truncate text-[18px] font-semibold text-gray-900"
              >
                Operational → accounting status
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 grid place-items-center shrink-0"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
          <div className="space-y-5">
            <div>
              <AccountingReadinessBadge accounting={accounting} />
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {accounting?.message || "This entry still needs accounting bridge validation."}
              </p>
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="grid gap-3 text-sm">
                <Row label="Category" value={accounting?.category_name || "Not classified"} />
                <Row label="Operational mapping" value={accounting?.ledger_account_name || "Not selected"} />
                <Row label="Posting policy" value={boolLabel(accounting?.policy_configured)} />
                <Row label="Bank mapping" value={boolLabel(accounting?.bank_mapping_configured)} />
                <Row label="Book" value={accounting?.book_code || "Not resolved"} />
                <Row label="Journal" value={accounting?.linked_journal?.entry_number || "Not posted"} />
              </div>
            </section>

            <section className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-900">Next action</div>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {accounting?.next_action || "Review accounting setup for this entry."}
              </p>
            </section>

            {onOpenAccountingSettings ? (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onOpenAccountingSettings}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-900 bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black"
                >
                  Open accounting settings
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}

function boolLabel(value?: boolean) {
  if (value === true) return "Configured";
  if (value === false) return "Missing";
  return "Unknown";
}

export default AccountingReasonDrawer;