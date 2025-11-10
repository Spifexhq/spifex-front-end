/* --------------------------------------------------------------------------
 * File: src/pages/LedgerAccountSettings/LedgerAccountsGate.tsx
 * Logic (refactored):
 *  - CSV/XLSX / Manual are sent raw to backend import endpoint.
 *  - Backend parses:
 *      - CSV: CATEGORY,SUBGROUP,ACCOUNT (categories 1..4)
 *      - XLSX: official template check + _ledger_data A1:C10000
 *      - Manual: "CATEGORY;SUBGROUP;ACCOUNT" per line
 *  - Standard (personal|business) calls backend to apply JSON templates.
 *  - Template files (CSV/XLSX) are downloaded from backend endpoints.
 * -------------------------------------------------------------------------- */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "src/components/ui/Button";
import Input from "src/components/ui/Input";
import Snackbar from "src/components/ui/Snackbar";

import { api } from "src/api/requests";
import { useTranslation } from "react-i18next";

/* --- Snackbar type --- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type Mode = "csv" | "manual" | "standard" | null;

function getInitials() {
  return "GL";
}

const LedgerAccountsGate: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(["settings"]);

  /* --------- Page meta --------- */
  useEffect(() => {
    document.title = t("settings:ledgerAccountsGate.pageTitle");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  /* --------- Flags --------- */
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* --------- UI state --------- */
  const [mode, setMode] = useState<Mode>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [textBlock, setTextBlock] = useState("");
  const [stdChoice, setStdChoice] = useState<"personal" | "business" | null>(null);
  const [snack, setSnack] = useState<Snack>(null);

  /* --------- Template downloads (backend) --------- */

  const downloadCsvTemplate = async () => {
    try {
      await api.downloadLedgerCsvTemplate();
    } catch (e) {
      const msg =
        (e as { message?: string })?.message ||
        (t("settings:ledgerAccountsGate.snackbar.downloadError") as string) ||
        "Error while downloading CSV template.";
      setSnack({ message: msg, severity: "error" });
    }
  };

  const downloadXlsxTemplate = async () => {
    try {
      await api.downloadLedgerXlsxTemplate();
    } catch (e) {
      const msg =
        (e as { message?: string })?.message ||
        (t("settings:ledgerAccountsGate.snackbar.downloadError") as string) ||
        "Error while downloading XLSX template.";
      setSnack({ message: msg, severity: "error" });
    }
  };

  const handleUploadCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCsvFile(file);
  };

  // Standard mode now calls backend JSON templates
  const addStandardPlan = async () => {
    if (!stdChoice) {
      setSnack({
        message: t("settings:ledgerAccountsGate.snackbar.standardRequired"),
        severity: "warning",
      });
      return;
    }

    await api.importStandardLedgerAccounts(stdChoice);
  };

  const submit = async () => {
    try {
      setIsSubmitting(true);

      // CSV/XLSX -> backend import
      if (mode === "csv") {
        if (!csvFile) {
          setSnack({
            message: t("settings:ledgerAccountsGate.snackbar.selectCsv"),
            severity: "warning",
          });
          return;
        }

        const formData = new FormData();
        formData.append("mode", "csv");
        formData.append("file", csvFile);

        await api.importLedgerAccounts(formData);

        setSnack({
          message: t("settings:ledgerAccountsGate.snackbar.csvSuccess"),
          severity: "success",
        });
      }
      // Manual -> backend import
      else if (mode === "manual") {
        if (!textBlock.trim()) {
          setSnack({
            message: t("settings:ledgerAccountsGate.snackbar.manualRequired"),
            severity: "warning",
          });
          return;
        }

        const formData = new FormData();
        formData.append("mode", "manual");
        formData.append("manual_text", textBlock);

        await api.importLedgerAccounts(formData);

        setSnack({
          message: t("settings:ledgerAccountsGate.snackbar.manualSuccess"),
          severity: "success",
        });
      }
      // Standard -> backend JSON templates
      else if (mode === "standard") {
        await addStandardPlan();
        setSnack({
          message: t("settings:ledgerAccountsGate.snackbar.standardSuccess"),
          severity: "success",
        });
      }
      // No mode
      else {
        setSnack({
          message: t("settings:ledgerAccountsGate.snackbar.chooseMode"),
          severity: "info",
        });
        return;
      }

      // After import, go to main listing
      navigate("/settings/ledger-accounts", { replace: true });
    } catch (e) {
      const msg =
        (e as { message?: string })?.message ||
        (t("settings:ledgerAccountsGate.snackbar.saveError") as string);
      setSnack({ message: msg, severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* --------- Render --------- */
  return (
    <>
      <main className="min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                {getInitials()}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">
                  {t("settings:ledgerAccountsGate.header.settings")}
                </div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  {t("settings:ledgerAccountsGate.title")}
                </h1>
                <p className="mt-1 text-[11px] text-gray-600">
                  {t("settings:ledgerAccountsGate.header.categoriesInfo", {
                    defaultValue:
                      "Categories: 1 = Operational Revenue · 2 = Non-operational Revenue · 3 = Operational Expense · 4 = Non-operational Expense.",
                  })}
                </p>
              </div>
            </div>
          </header>

          {/* Content */}
          <section className="mt-6">
            <div className="max-w-3xl mx-auto p-6 md:p-8 border border-gray-200 rounded-lg bg-white space-y-6">
              <p className="text-sm text-gray-600">
                {t("settings:ledgerAccountsGate.subtitle")}
              </p>

              {/* CSV / XLSX */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">
                    {t("settings:ledgerAccountsGate.modes.csv.title")}
                  </h2>
                  <label className="text-sm flex items-center gap-2">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "csv"}
                      onChange={() => setMode("csv")}
                      disabled={isSubmitting}
                    />
                    {t("settings:ledgerAccountsGate.modes.csv.choose")}
                  </label>
                </div>
                {mode === "csv" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={downloadCsvTemplate}
                        disabled={isSubmitting}
                      >
                        {t("settings:ledgerAccountsGate.modes.csv.downloadTemplate", {
                          defaultValue: "Download .csv template",
                        })}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={downloadXlsxTemplate}
                        disabled={isSubmitting}
                      >
                        {t(
                          "settings:ledgerAccountsGate.modes.csv.downloadXlsxTemplate",
                          { defaultValue: "Download .xlsx template" }
                        )}
                      </Button>
                    </div>
                    <Input
                      type="file"
                      label={t("settings:ledgerAccountsGate.modes.csv.uploadLabel")}
                      onChange={handleUploadCSV}
                      // CSV or Excel
                      accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                      disabled={isSubmitting}
                    />
                    <p className="text-[12px] text-gray-500">
                      {t("settings:ledgerAccountsGate.modes.csv.hintHeaderRow")} ·{" "}
                      {t("settings:ledgerAccountsGate.modes.csv.hintColumns", {
                        defaultValue:
                          "Required columns (exact order): CATEGORY, SUBGROUP, ACCOUNT.",
                      })}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {t("settings:ledgerAccountsGate.modes.csv.hintCategories", {
                        defaultValue:
                          "CATEGORY codes: 1 = Operational Revenue · 2 = Non-operational Revenue · 3 = Operational Expense · 4 = Non-operational Expense.",
                      })}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {t("settings:ledgerAccountsGate.modes.csv.hintXlsxMeta", {
                        defaultValue:
                          "For .xlsx, use the official template. The file is validated using an internal meta sheet and ID.",
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Manual */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">
                    {t("settings:ledgerAccountsGate.modes.manual.title")}
                  </h2>
                  <label className="text-sm flex items-center gap-2">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "manual"}
                      onChange={() => setMode("manual")}
                      disabled={isSubmitting}
                    />
                    {t("settings:ledgerAccountsGate.modes.manual.choose")}
                  </label>
                </div>
                {mode === "manual" && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">
                      {t("settings:ledgerAccountsGate.modes.manual.instructions", {
                        defaultValue:
                          "One account per line. Format: CATEGORY;SUBGROUP;ACCOUNT. CATEGORY must be 1, 2, 3 or 4.",
                      })}
                    </p>
                    <textarea
                      className="w-full border border-gray-200 rounded p-2 resize-y min-h-[140px] outline-none focus:ring-2 focus:ring-gray-200"
                      placeholder={t(
                        "settings:ledgerAccountsGate.modes.manual.placeholder",
                        {
                          defaultValue:
                            "Example:\n1; Sales; Product sales\n3; Administrative; Salaries and wages\n4; Financial; Bank fees",
                        }
                      )}
                      value={textBlock}
                      onChange={(e) => setTextBlock(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <p className="text-[11px] text-gray-500">
                      {t("settings:ledgerAccountsGate.modes.manual.hintCategories", {
                        defaultValue:
                          "CATEGORY codes: 1 = Operational Revenue · 2 = Non-operational Revenue · 3 = Operational Expense · 4 = Non-operational Expense.",
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Standard */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">
                    {t("settings:ledgerAccountsGate.modes.standard.title")}
                  </h2>
                  <label className="text-sm flex items-center gap-2">
                    <input
                      type="radio"
                      name="mode"
                      checked={mode === "standard"}
                      onChange={() => setMode("standard")}
                      disabled={isSubmitting}
                    />
                    {t("settings:ledgerAccountsGate.modes.standard.choose")}
                  </label>
                </div>
                {mode === "standard" && (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="std"
                          checked={stdChoice === "personal"}
                          onChange={() => setStdChoice("personal")}
                          disabled={isSubmitting}
                        />
                        {t("settings:ledgerAccountsGate.modes.standard.personal")}
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="std"
                          checked={stdChoice === "business"}
                          onChange={() => setStdChoice("business")}
                          disabled={isSubmitting}
                        />
                        {t("settings:ledgerAccountsGate.modes.standard.business")}
                      </label>
                    </div>
                    <p className="text-[12px] text-gray-500">
                      {t("settings:ledgerAccountsGate.modes.standard.hint", {
                        defaultValue:
                          "We will create a suggested chart of accounts using the four categories. You can edit or delete them later.",
                      })}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMode(null);
                    setCsvFile(null);
                    setTextBlock("");
                    setStdChoice(null);
                  }}
                  disabled={isSubmitting}
                >
                  {t("settings:ledgerAccountsGate.buttons.clear")}
                </Button>
                <Button onClick={submit} disabled={isSubmitting}>
                  {isSubmitting
                    ? t("settings:ledgerAccountsGate.buttons.finishing")
                    : t("settings:ledgerAccountsGate.buttons.finish")}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>

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
};

export default LedgerAccountsGate;
