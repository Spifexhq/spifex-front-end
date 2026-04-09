import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "@/shared/ui/Button";
import Snackbar from "@/shared/ui/Snackbar";
import { SelectDropdown } from "@/shared/ui/SelectDropdown";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { getLedgerMessages } from "./messages";

import type { LedgerMode } from "@/models/settings/ledgerAccounts";

type Snack =
  | {
      message: React.ReactNode;
      severity: "success" | "error" | "warning" | "info";
    }
  | null;

type SetupMode = "csv" | "manual" | "standard" | null;
type TemplateOption = { label: string; value: "personal" | "organizational" };

type Props = {
  ledgerMode: LedgerMode;
  compact: boolean;
  languageCode?: string | null;
  embedded?: boolean;
  onSuccess?: () => void | Promise<void>;
  successRedirectTo?: string | null;
};

const templateKey = (item: TemplateOption) => item.value;
const templateLabel = (item: TemplateOption) => item.label;

const Surface = ({
  title,
  description,
  active,
  onClick,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "rounded-2xl border p-4 text-left transition-colors",
      active
        ? "border-gray-900 bg-gray-900 text-white"
        : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50",
    ].join(" ")}
  >
    <div className="text-sm font-semibold">{title}</div>
    <p className={["mt-1 text-sm", active ? "text-gray-100" : "text-gray-600"].join(" ")}>
      {description}
    </p>
  </button>
);

const LedgerAccountsGate: React.FC<Props> = ({
  ledgerMode,
  compact,
  languageCode,
  embedded = false,
  onSuccess,
  successRedirectTo = "/settings/ledger-accounts",
}) => {
  const navigate = useNavigate();
  const { isOwner, permissions } = useAuthContext();
  const messages = getLedgerMessages(languageCode);

  const canAddLedgerAccounts = useMemo(
    () => isOwner || permissions.includes("add_ledger_account"),
    [isOwner, permissions]
  );

  const [setupMode, setSetupMode] = useState<SetupMode>("standard");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [textBlock, setTextBlock] = useState("");
  const [standardPlan, setStandardPlan] = useState<"personal" | "organizational">(
    ledgerMode === "personal" ? "personal" : "organizational"
  );
  const [snack, setSnack] = useState<Snack>(null);
  const [busy, setBusy] = useState(false);

  const templateOptions = useMemo<TemplateOption[]>(
    () => [
      {
        label: messages.setup.templatePersonal,
        value: "personal",
      },
      {
        label: messages.setup.templateOrganizational,
        value: "organizational",
      },
    ],
    [messages]
  );

  const submit = async () => {
    if (!canAddLedgerAccounts) {
      setSnack({ message: messages.setup.permissionError, severity: "error" });
      return;
    }

    try {
      setBusy(true);

      if (setupMode === "csv") {
        if (!csvFile) throw new Error(messages.setup.selectFileError);

        const formData = new FormData();
        formData.append("mode", "csv");
        formData.append("file", csvFile);

        await api.importLedgerAccounts(formData);
      } else if (setupMode === "manual") {
        if (!textBlock.trim()) throw new Error(messages.setup.manualError);

        const formData = new FormData();
        formData.append("mode", "manual");
        formData.append("manual_text", textBlock);

        await api.importLedgerAccounts(formData);
      } else if (setupMode === "standard") {
        await api.importStandardLedgerAccounts(standardPlan);
      } else {
        throw new Error(messages.setup.chooseModeError);
      }

      await onSuccess?.();
      setSnack({ message: messages.setup.success, severity: "success" });

      if (successRedirectTo) {
        navigate(successRedirectTo, { replace: true });
      }
    } catch (e) {
      setSnack({
        message: (e as Error)?.message || messages.setup.genericError,
        severity: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const content = (
    <>
      {!embedded ? (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="grid gap-5 px-4 py-4 sm:px-5 lg:grid-cols-[1.4fr_0.9fr]">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-600">
                {messages.setup.pageLabel}
              </div>

              <h1 className="mt-1 text-[16px] font-semibold text-gray-900 sm:text-[18px]">
                {ledgerMode === "personal"
                  ? messages.setup.titlePersonal
                  : messages.setup.titleOrganizational}
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                {compact
                  ? messages.setup.descriptionCompact
                  : ledgerMode === "personal"
                  ? messages.setup.descriptionPersonal
                  : messages.setup.descriptionOrganizational}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="text-[11px] uppercase tracking-wide text-gray-700">
                {messages.setup.currentProfile}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                  {messages.setup.modeLabel}:{" "}
                  {ledgerMode === "personal"
                    ? messages.setup.personal
                    : messages.setup.organizational}
                </span>

                <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                  {messages.setup.viewLabel}:{" "}
                  {compact ? messages.setup.compact : messages.setup.full}
                </span>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {!embedded ? (
          <div className="border-b border-gray-200 px-4 py-3 sm:px-5">
            <div className="text-[11px] uppercase tracking-wide text-gray-700">
              {messages.setup.setupMethod}
            </div>
          </div>
        ) : null}

        <div className={embedded ? "space-y-4" : "px-4 py-4 sm:px-5"}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Surface
              active={setupMode === "standard"}
              onClick={() => setSetupMode("standard")}
              title={messages.setup.standardTitle}
              description={messages.setup.standardDescription}
            />
            <Surface
              active={setupMode === "csv"}
              onClick={() => setSetupMode("csv")}
              title={messages.setup.uploadTitle}
              description={messages.setup.uploadDescription}
            />
            <Surface
              active={setupMode === "manual"}
              onClick={() => setSetupMode("manual")}
              title={messages.setup.manualTitle}
              description={messages.setup.manualDescription}
            />
          </div>

          <div className="space-y-4">
            {setupMode === "standard" ? (
              <div className="grid gap-4 lg:grid-cols-[1.2fr_auto_auto]">
                <SelectDropdown<TemplateOption>
                  label={messages.setup.templateLabel}
                  items={templateOptions}
                  selected={templateOptions.filter((x) => x.value === standardPlan)}
                  onChange={(items) =>
                    setStandardPlan(
                      items[0]?.value ??
                        (ledgerMode === "personal" ? "personal" : "organizational")
                    )
                  }
                  getItemKey={templateKey}
                  getItemLabel={templateLabel}
                  singleSelect
                  hideCheckboxes
                  buttonLabel={messages.setup.templateLabel}
                />

                <div className="lg:self-end">
                  <Button variant="outline" className="h-10" onClick={() => void api.downloadLedgerCsvTemplate()}>
                    {messages.setup.downloadCsv}
                  </Button>
                </div>

                <div className="lg:self-end">
                  <Button variant="outline" className="h-10" onClick={() => void api.downloadLedgerXlsxTemplate()}>
                    {messages.setup.downloadXlsx}
                  </Button>
                </div>
              </div>
            ) : null}

            {setupMode === "csv" ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">
                    {messages.setup.fileLabel}
                  </span>
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                    className="block w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none file:mr-3 file:rounded-xl file:border file:border-gray-200 file:bg-white file:px-3 file:py-1.5 file:text-sm file:text-gray-700"
                  />
                </label>

                <div className="lg:self-end">
                  <Button variant="outline" className="h-10" onClick={() => void api.downloadLedgerCsvTemplate()}>
                    {messages.setup.downloadCsv}
                  </Button>
                </div>

                <div className="lg:self-end">
                  <Button variant="outline" className="h-10" onClick={() => void api.downloadLedgerXlsxTemplate()}>
                    {messages.setup.downloadXlsx}
                  </Button>
                </div>
              </div>
            ) : null}

            {setupMode === "manual" ? (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">
                  {messages.setup.manualLabel}
                </span>

                <textarea
                  className="min-h-[240px] w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 outline-none focus:border-gray-500"
                  value={textBlock}
                  onChange={(e) => setTextBlock(e.target.value)}
                  placeholder={messages.setup.manualPlaceholder}
                />
              </label>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void submit()} disabled={busy}>
              {busy ? messages.setup.submitting : messages.setup.submit}
            </Button>
          </div>
        </div>
      </section>

      <Snackbar
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={5000}
        message={snack?.message}
        severity={snack?.severity}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </>
  );

  if (embedded) {
    return <>{content}</>;
  }

  return (
    <main className="min-h-full bg-transparent px-4 py-6 text-gray-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-6">{content}</div>
    </main>
  );
};

export default LedgerAccountsGate;