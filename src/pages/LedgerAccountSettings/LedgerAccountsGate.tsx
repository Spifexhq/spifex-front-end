import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, FileUser } from "lucide-react";

import Button from "@/shared/ui/Button";
import Snackbar from "@/shared/ui/Snackbar";
import { Select } from "src/shared/ui/Select";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";

import type { LedgerMode } from "@/models/settings/ledgerAccounts";

type Snack =
  | {
      message: React.ReactNode;
      severity: "success" | "error" | "warning" | "info";
    }
  | null;

type SetupMode = "csv" | "manual" | "standard" | null;
type TemplateOption = {
  label: string;
  value: "personal" | "organizational";
  icon: React.ReactNode;
};

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
const templateIcon = (item: TemplateOption) => item.icon;

const SetupOptionCard = ({
  title,
  description,
  active,
  onClick,
  embedded = false,
}: {
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
  embedded?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "rounded-lg border bg-white text-left transition-colors",
      embedded ? "min-h-[168px] px-5 py-5" : "p-4",
      active
        ? "border-gray-900 text-gray-900"
        : "border-gray-200 text-gray-900 hover:bg-gray-50",
    ].join(" ")}
  >
    <div className="text-[14px] font-semibold">{title}</div>
    <p className="mt-2 text-[12px] leading-7 text-gray-600">{description}</p>
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
  const { i18n } = useTranslation("ledgerAccounts");
  const t = React.useCallback(
    (key: string, defaultValue: string) =>
      String(
        i18n.t(key, {
          ns: "ledgerAccounts",
          lng: languageCode || i18n.resolvedLanguage || i18n.language,
          defaultValue,
        })
      ),
    [i18n, languageCode]
  );

  const { isOwner, permissions } = useAuthContext();
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
        label: t("setup.templatePersonal", "Personal starter template"),
        value: "personal",
        icon: <FileUser className="h-4 w-4" />,
      },
      {
        label: t("setup.templateOrganizational", "Organizational starter template"),
        value: "organizational",
        icon: <Building2 className="h-4 w-4" />,
      },
    ],
    [t]
  );

  const submit = async () => {
    if (!canAddLedgerAccounts) {
      setSnack({
        message: t("setup.permissionError", "You do not have permission to manage ledger accounts."),
        severity: "error",
      });
      return;
    }

    try {
      setBusy(true);

      if (setupMode === "csv") {
        if (!csvFile) {
          throw new Error(t("setup.selectFileError", "Select a CSV/XLSX file."));
        }

        const formData = new FormData();
        formData.append("mode", "csv");
        formData.append("file", csvFile);
        await api.importLedgerAccounts(formData);
      } else if (setupMode === "manual") {
        if (!textBlock.trim()) {
          throw new Error(t("setup.manualError", "Enter account rows first."));
        }

        const formData = new FormData();
        formData.append("mode", "manual");
        formData.append("manual_text", textBlock);
        await api.importLedgerAccounts(formData);
      } else if (setupMode === "standard") {
        await api.importStandardLedgerAccounts(standardPlan);
      } else {
        throw new Error(t("setup.chooseModeError", "Choose a setup mode."));
      }

      await onSuccess?.();
      setSnack({
        message: t("setup.success", "Ledger accounts configured."),
        severity: "success",
      });

      if (successRedirectTo) {
        navigate(successRedirectTo, { replace: true });
      }
    } catch (error) {
      setSnack({
        message:
          (error as Error)?.message ||
          t("setup.genericError", "Could not configure ledger accounts."),
        severity: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const embeddedShellClass = embedded
    ? "rounded-lg border border-gray-200 bg-gray-50 p-4 md:p-5"
    : "rounded-lg border border-gray-200 bg-white overflow-hidden";

  const bodyClass = embedded ? "space-y-5" : "px-4 py-4 sm:px-5 space-y-4";
  const optionGridClass = embedded
    ? "grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3"
    : "grid grid-cols-1 gap-3 lg:grid-cols-3";

  const modePanelClass = embedded
    ? "rounded-lg border border-gray-200 bg-white p-4 md:p-5"
    : "rounded-lg border border-gray-200 bg-white p-4";

  const actionRowClass = embedded
    ? "mt-4 flex justify-end border-t border-gray-200 pt-4"
    : "flex justify-end pt-4";

  const content = (
    <>
      {!embedded ? (
        <header className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-start gap-3 px-5 py-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-gray-200 bg-gray-50 text-[11px] font-semibold text-gray-700">
              LA
            </div>

            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-gray-600">
                {t("setup.pageLabel", "Settings")}
              </div>
              <h1 className="text-[16px] font-semibold leading-snug text-gray-900">
                {ledgerMode === "personal"
                  ? t("setup.titlePersonal", "Set up your personal ledger")
                  : t("setup.titleOrganizational", "Set up your organizational ledger")}
              </h1>

              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-gray-600">
                {compact
                  ? t(
                      "setup.descriptionCompact",
                      "Compact cashflow view is enabled. Start with a smaller chart and expand later if needed."
                    )
                  : ledgerMode === "personal"
                    ? t(
                        "setup.descriptionPersonal",
                        "Start with a clean personal structure and adapt it only where you need more detail."
                      )
                    : t(
                        "setup.descriptionOrganizational",
                        "Start with a practical business-ready chart of accounts and then refine it for your organization."
                      )}
              </p>
            </div>
          </div>
        </header>
      ) : null}

      <section className={embeddedShellClass}>
        {!embedded ? (
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-600">
              {t("setup.setupMethod", "Setup method")}
            </div>
          </div>
        ) : null}

        <div className={bodyClass}>
          <div className={optionGridClass}>
            <SetupOptionCard
              embedded={embedded}
              active={setupMode === "standard"}
              onClick={() => setSetupMode("standard")}
              title={t("setup.standardTitle", "Use a standard template")}
              description={t(
                "setup.standardDescription",
                "Load a generic chart of accounts designed as a strong starting point."
              )}
            />

            <SetupOptionCard
              embedded={embedded}
              active={setupMode === "csv"}
              onClick={() => setSetupMode("csv")}
              title={t("setup.uploadTitle", "Import CSV or XLSX")}
              description={t(
                "setup.uploadDescription",
                "Upload a chart using the provided template headers."
              )}
            />

            <SetupOptionCard
              embedded={embedded}
              active={setupMode === "manual"}
              onClick={() => setSetupMode("manual")}
              title={t("setup.manualTitle", "Paste rows manually")}
              description={t(
                "setup.manualDescription",
                "Paste delimited rows when you want to bootstrap quickly from text."
              )}
            />
          </div>

          {setupMode === "standard" ? (
            <div className={modePanelClass}>
              <div className="max-w-[420px]">
                <Select<TemplateOption>
                  label={t("setup.templateLabel", "Template")}
                  items={templateOptions}
                  selected={templateOptions.filter((item) => item.value === standardPlan)}
                  onChange={(items) =>
                    setStandardPlan(
                      items[0]?.value ??
                        (ledgerMode === "personal" ? "personal" : "organizational")
                    )
                  }
                  getItemKey={templateKey}
                  getItemLabel={templateLabel}
                  getItemIcon={templateIcon}
                  singleSelect
                  hideCheckboxes
                  buttonLabel={t("setup.templateLabel", "Template")}
                />
              </div>

              <div className={actionRowClass}>
                <Button onClick={() => void submit()} disabled={busy}>
                  {busy
                    ? t("setup.submitting", "Configuring...")
                    : t("setup.submit", "Configure ledger")}
                </Button>
              </div>
            </div>
          ) : null}

          {setupMode === "csv" ? (
            <div className={modePanelClass}>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                    {t("setup.fileLabel", "File")}
                  </span>
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
                    className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[13px] text-gray-900 outline-none file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-[13px] file:text-gray-700"
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => void api.downloadLedgerCsvTemplate()}
                  >
                    {t("setup.downloadCsv", "Download CSV template")}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => void api.downloadLedgerXlsxTemplate()}
                  >
                    {t("setup.downloadXlsx", "Download XLSX template")}
                  </Button>
                </div>
              </div>

              <div className={actionRowClass}>
                <Button onClick={() => void submit()} disabled={busy}>
                  {busy
                    ? t("setup.submitting", "Configuring...")
                    : t("setup.submit", "Configure ledger")}
                </Button>
              </div>
            </div>
          ) : null}

          {setupMode === "manual" ? (
            <div className={modePanelClass}>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-gray-700">
                  {t("setup.manualLabel", "Rows")}
                </span>

                <textarea
                  className="min-h-[240px] w-full rounded-md border border-gray-300 bg-white px-3 py-3 font-mono text-[13px] text-gray-900 outline-none focus:border-gray-400"
                  value={textBlock}
                  onChange={(event) => setTextBlock(event.target.value)}
                  placeholder={t(
                    "setup.manualPlaceholder",
                    "code,name,parent_code,description,account_type,statement_section,normal_balance,..."
                  )}
                />
              </label>

              <div className={actionRowClass}>
                <Button onClick={() => void submit()} disabled={busy}>
                  {busy
                    ? t("setup.submitting", "Configuring...")
                    : t("setup.submit", "Configure ledger")}
                </Button>
              </div>
            </div>
          ) : null}
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

  if (embedded) return <>{content}</>;

  return (
    <main className="min-h-full bg-transparent px-4 py-6 text-gray-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-6">{content}</div>
    </main>
  );
};

export default LedgerAccountsGate;
