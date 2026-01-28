/* --------------------------------------------------------------------------
 * File: src/pages/LedgerAccountSettings/LedgerAccountsGate.tsx
 * -------------------------------------------------------------------------- */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";
import Snackbar from "@/shared/ui/Snackbar";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";
import { PermissionMiddleware } from "src/middlewares";
import { useTranslation } from "react-i18next";

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

type Mode = "csv" | "manual" | "standard" | null;

function getInitials() {
  return "GL";
}

const LedgerAccountsGate: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("ledgerAccountsGate");
  const { isOwner, permissions } = useAuthContext();

  const canAddLedgerAccounts = useMemo(() => {
    if (isOwner) return true;
    return permissions.includes("add_ledger_account");
  }, [isOwner, permissions]);

  useEffect(() => {
    document.title = t("pageTitle");
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

  const guardNoPermission = () => {
    setSnack({
      message: t("snackbar.noPermission"),
      severity: "error",
    });
  };

  const downloadCsvTemplate = async () => {
    if (!canAddLedgerAccounts) {
      guardNoPermission();
      return;
    }

    try {
      await api.downloadLedgerCsvTemplate();
    } catch (e) {
      const msg =
        (e as { message?: string })?.message ||
        (t("snackbar.downloadError") as string) ||
        "Error while downloading template.";
      setSnack({ message: msg, severity: "error" });
    }
  };

  const downloadXlsxTemplate = async () => {
    if (!canAddLedgerAccounts) {
      guardNoPermission();
      return;
    }

    try {
      await api.downloadLedgerXlsxTemplate();
    } catch (e) {
      const msg =
        (e as { message?: string })?.message ||
        (t("snackbar.downloadError") as string) ||
        "Error while downloading template.";
      setSnack({ message: msg, severity: "error" });
    }
  };

  const handleUploadCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCsvFile(file);
  };

  const addStandardPlan = async (): Promise<boolean> => {
    if (!canAddLedgerAccounts) {
      guardNoPermission();
      return false;
    }

    if (!stdChoice) {
      setSnack({
        message: t("snackbar.standardRequired"),
        severity: "warning",
      });
      return false;
    }

    await api.importStandardLedgerAccounts(stdChoice);
    return true;
  };

  const submit = async () => {
    if (!canAddLedgerAccounts) {
      guardNoPermission();
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === "csv") {
        if (!csvFile) {
          setSnack({ message: t("snackbar.selectCsv"), severity: "warning" });
          return;
        }

        const formData = new FormData();
        formData.append("mode", "csv");
        formData.append("file", csvFile);

        await api.importLedgerAccounts(formData);

        setSnack({ message: t("snackbar.csvSuccess"), severity: "success" });
      } else if (mode === "manual") {
        if (!textBlock.trim()) {
          setSnack({ message: t("snackbar.manualRequired"), severity: "warning" });
          return;
        }

        const formData = new FormData();
        formData.append("mode", "manual");
        formData.append("manual_text", textBlock);

        await api.importLedgerAccounts(formData);

        setSnack({ message: t("snackbar.manualSuccess"), severity: "success" });
      } else if (mode === "standard") {
        const ok = await addStandardPlan();
        if (!ok) return;

        setSnack({ message: t("snackbar.standardSuccess"), severity: "success" });
      } else {
        setSnack({ message: t("snackbar.chooseMode"), severity: "info" });
        return;
      }

      navigate("/settings/ledger-accounts", { replace: true });
    } catch (e) {
      const msg = (e as { message?: string })?.message || (t("snackbar.saveError") as string);
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
                  {t("header.settings")}
                </div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  {t("title")}
                </h1>
                <p className="mt-1 text-[11px] text-gray-600">
                  {t("header.categoriesInfo")}
                </p>
              </div>
            </div>
          </header>

          {/* Content */}
          <PermissionMiddleware codeName={"add_ledger_account"} behavior="lock">
            <section className="mt-6">
              <div className="max-w-3xl mx-auto p-6 md:p-8 border border-gray-200 rounded-lg bg-white space-y-6">
                <p className="text-sm text-gray-600">{t("subtitle")}</p>

                {/* CSV / XLSX */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-medium">{t("modes.csv.title")}</h2>
                    <label className="text-sm flex items-center gap-2">
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === "csv"}
                        onChange={() => setMode("csv")}
                        disabled={isSubmitting}
                      />
                      {t("modes.csv.choose")}
                    </label>
                  </div>

                  {mode === "csv" && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={downloadCsvTemplate} disabled={isSubmitting}>
                          {t("modes.csv.downloadTemplate")}
                        </Button>
                        <Button variant="outline" onClick={downloadXlsxTemplate} disabled={isSubmitting}>
                          {t("modes.csv.downloadXlsxTemplate")}
                        </Button>
                      </div>

                      <Input
                        kind="text"
                        type="file"
                        label={t("modes.csv.uploadLabel")}
                        onChange={handleUploadCSV}
                        accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                        disabled={isSubmitting}
                      />

                      <p className="text-[12px] text-gray-500">
                        {t("modes.csv.hintHeaderRow")} · {t("modes.csv.hintColumns")}
                      </p>
                      <p className="text-[11px] text-gray-500">{t("modes.csv.hintCategories")}</p>
                      <p className="text-[11px] text-gray-400">{t("modes.csv.hintXlsxMeta")}</p>
                    </div>
                  )}
                </div>

                {/* Manual */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-medium">{t("modes.manual.title")}</h2>
                    <label className="text-sm flex items-center gap-2">
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === "manual"}
                        onChange={() => setMode("manual")}
                        disabled={isSubmitting}
                      />
                      {t("modes.manual.choose")}
                    </label>
                  </div>

                  {mode === "manual" && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">{t("modes.manual.instructions")}</p>

                      <textarea
                        className="w-full border border-gray-200 rounded p-2 resize-y min-h-[140px] outline-none focus:ring-2 focus:ring-gray-200"
                        placeholder={t("modes.manual.placeholder")}
                        value={textBlock}
                        onChange={(e) => setTextBlock(e.target.value)}
                        disabled={isSubmitting}
                      />

                      <p className="text-[11px] text-gray-500">{t("modes.manual.hintCategories")}</p>
                    </div>
                  )}
                </div>

                {/* Standard */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-medium">{t("modes.standard.title")}</h2>
                    <label className="text-sm flex items-center gap-2">
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === "standard"}
                        onChange={() => setMode("standard")}
                        disabled={isSubmitting}
                      />
                      {t("modes.standard.choose")}
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
                          {t("modes.standard.personal")}
                        </label>

                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="std"
                            checked={stdChoice === "business"}
                            onChange={() => setStdChoice("business")}
                            disabled={isSubmitting}
                          />
                          {t("modes.standard.business")}
                        </label>
                      </div>

                      <p className="text-[12px] text-gray-500">{t("modes.standard.hint")}</p>
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
                    {t("buttons.clear")}
                  </Button>

                  <Button onClick={submit} disabled={isSubmitting}>
                    {isSubmitting ? t("buttons.finishing") : t("buttons.finish")}
                  </Button>
                </div>
              </div>
            </section>
          </PermissionMiddleware>
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
