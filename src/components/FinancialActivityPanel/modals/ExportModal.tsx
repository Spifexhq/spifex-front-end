import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { apiErrorMessage } from "@/lib/apiErrorMessage";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import SegmentedControl from "@/shared/ui/SegmentedControl";
import { ErrorState } from "@/shared/ui/State";

import type { ExportFormat } from "../export";
import { ModalShell } from "../ui/ModalShell";

export default function ExportModal({
  open,
  onClose,
  settled,
  defaultStart,
  defaultEnd,
  onExport,
}: {
  open: boolean;
  onClose(): void;
  settled: boolean;
  defaultStart?: string;
  defaultEnd?: string;
  onExport(options: { format: ExportFormat; start?: string; end?: string }): Promise<void>;
}) {
  const { t } = useTranslation("filterBar");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setFormat("csv");
    setStart(defaultStart || "");
    setEnd(defaultEnd || "");
    setError("");
  }, [open, defaultStart, defaultEnd]);

  const rangeError = useMemo(
    () => (start && end && end < start ? t("filterBar:exportModal.invalidRange") : ""),
    [start, end, t],
  );
  const canExport = !busy && !rangeError;

  const submit = async () => {
    if (!canExport) return;
    setBusy(true);
    setError("");
    try {
      await onExport({
        format,
        start: start || undefined,
        end: end || undefined,
      });
      onClose();
    } catch (cause) {
      setError(apiErrorMessage(cause, t("filterBar:exportModal.failed")));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <ModalShell
      title={t("filterBar:exportModal.title")}
      busy={busy}
      onClose={onClose}
      maxWidthClass="max-w-md"
    >
      {error && (
        <ErrorState
          message={error}
          tone="danger"
          size="sm"
          className="mb-4 leading-5"
        />
      )}

      <div className={busy ? "pointer-events-none opacity-60" : ""}>
        <p className="text-xs leading-5 text-gray-600">
          {t(
            settled
              ? "filterBar:exportModal.descriptionSettled"
              : "filterBar:exportModal.descriptionCashFlow",
          )}
        </p>

        <div className="mt-4 space-y-2">
          <span className="block text-xs font-medium text-gray-700">
            {t("filterBar:exportModal.format")}
          </span>
          <SegmentedControl<ExportFormat>
            value={format}
            onChange={setFormat}
            label={t("filterBar:exportModal.format")}
            stretch
            items={[
              { value: "csv", label: t("filterBar:exportModal.csv") },
              { value: "xlsx", label: t("filterBar:exportModal.excel") },
            ]}
          />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-700">
              {t("filterBar:exportModal.dateRange")}
            </span>
            {(start || end) && (
              <button
                type="button"
                className="rounded text-[11px] font-medium text-gray-500 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-[var(--accentPrimary)]"
                onClick={() => {
                  setStart("");
                  setEnd("");
                }}
              >
                {t("filterBar:exportModal.clearDates")}
              </button>
            )}
          </div>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              kind="date"
              label={t("filterBar:exportModal.start")}
              value={start}
              onValueChange={setStart}
            />
            <Input
              kind="date"
              label={t("filterBar:exportModal.end")}
              value={end}
              onValueChange={setEnd}
            />
          </div>
          <p className="mt-2 text-[11px] leading-4 text-gray-500">
            {t("filterBar:exportModal.dateHint")}
          </p>
          {rangeError && (
            <p role="alert" className="mt-2 text-xs text-rose-700">
              {rangeError}
            </p>
          )}
        </div>

        <div className="mt-5 space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-[11px] leading-4 text-gray-600">
          <p>{t("filterBar:exportModal.privacy")}</p>
          {format === "xlsx" && <p>{t("filterBar:exportModal.excelNote")}</p>}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            className="bg-white hover:bg-gray-50"
            onClick={onClose}
          >
            {t("filterBar:exportModal.cancel")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={busy}
            disabled={!canExport}
            onClick={() => void submit()}
          >
            {busy
              ? t("filterBar:exportModal.exporting")
              : t("filterBar:exportModal.export")}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
