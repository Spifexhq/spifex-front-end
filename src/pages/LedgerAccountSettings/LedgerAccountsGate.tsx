/* --------------------------------------------------------------------------
 * File: src/pages/LedgerAccountSettings/LedgerAccountsGate.tsx
 * Style/UX: Matches Settings pages (header card, compact labels)
 * Logic:
 *  - Modes: CSV / Manual / Standard (personal|business)
 *  - Category must be an explicit code:
 *      1 = Operational Revenue
 *      2 = Non-operational Revenue
 *      3 = Operational Expense
 *      4 = Non-operational Expense
 *  - Subgroup and account labels are free text in ANY language
 *  - No legacy headers (GRUPO/SUBGRUPO/CONTA), no language inference
 *  - Flags: isSubmitting
 *  - Consistent disabled states while busy
 *  - Entry/exit is orchestrated by LedgerAccountsRouter
 * i18n: settings:ledgerAccountsGate.*
 * -------------------------------------------------------------------------- */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "src/components/ui/Button";
import Input from "src/components/ui/Input";
import Snackbar from "src/components/ui/Snackbar";

import { api } from "src/api/requests";
import type { AddGLAccountRequest } from "src/models/enterprise_structure/dto";
import Papa from "papaparse";
import personalAccounts from "src/data/personalAccounts.json";
import businessAccounts from "src/data/businessAccounts.json";
import { useTranslation } from "react-i18next";

/* --- Snackbar type --- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* --- Types & helpers --- */

/**
 * Category codes:
 *  1 = Operational Revenue
 *  2 = Non-operational Revenue
 *  3 = Operational Expense
 *  4 = Non-operational Expense
 */
export type CategoryValue = 1 | 2 | 3 | 4;

type CsvRow = {
  // Main, explicit headers (preferred)
  CATEGORY?: string | number;
  GROUP?: string;
  SUBGROUP?: string;
  ACCOUNT?: string;

  // Lowercase fallbacks (for user convenience)
  category?: string | number;
  group?: string;
  subgroup?: string;
  account?: string;
};

type Mode = "csv" | "manual" | "standard" | null;

/**
 * Expected JSON shape for standard sets
 * (personalAccounts.json / businessAccounts.json).
 */
type StandardRow = {
  category: CategoryValue;
  subgroup: string;
  account: string;
};

function getInitials() {
  return "GL";
}

/**
 * Parse a category code (no inference from words).
 * Accept only:
 *   1, 2, 3, 4  (number or string)
 */
function parseCategoryCode(raw: unknown): CategoryValue | null {
  if (raw == null) return null;
  const str = String(raw).trim();
  if (!str) return null;

  const num = Number(str);
  if (num === 1 || num === 2 || num === 3 || num === 4) {
    return num as CategoryValue;
  }
  return null;
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

  /* --------- CSV template (language-agnostic) --------- */
  const csvTemplate = useMemo(() => {
    const rows = [
      // CATEGORY: 1..4 (required)
      // GROUP / SUBGROUP / ACCOUNT: free text (any language)
      ["CATEGORY", "GROUP", "SUBGROUP", "ACCOUNT"],
      ["1", "Operational Revenue", "Sales", "Product sales"],
      ["3", "Operational Expense", "Administrative", "Salaries and wages"],
      ["4", "Non-operational Expense", "Financial", "Bank fees"],
    ];
    return rows.map((r) => r.join(",")).join("\n");
  }, []);

  /* --------- Actions --------- */

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      (t("settings:ledgerAccountsGate.misc.fileNameTemplate") as string) ||
      "ledger-accounts-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // 🔥 Use the new bulk endpoint
  const addMany = async (items: AddGLAccountRequest[]) => {
    if (!items.length) return;
    await api.addLedgerAccountsBulk(items);
  };

  /**
   * Manual text parser.
   * Expected format (semicolon or comma separated):
   *
   *   CATEGORY ; SUBGROUP ; ACCOUNT
   *
   * CATEGORY must be 1, 2, 3 or 4.
   * SUBGROUP and ACCOUNT can be any language.
   */
  const parseManual = (text: string): AddGLAccountRequest[] =>
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/;|,/).map((p) => p.trim());
        const [rawCategory, subgroup, account] = parts;

        const category = parseCategoryCode(rawCategory);

        return {
          account: account ?? "",
          category: category as CategoryValue,
          subcategory: subgroup || undefined,
          is_active: true,
        };
      })
      .filter((p) => p.account && p.category);

  const handleUploadCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCsvFile(file);
  };

  const submit = async () => {
    try {
      setIsSubmitting(true);

      // ---------------- CSV mode ----------------
      if (mode === "csv") {
        if (!csvFile) {
          setSnack({
            message: t("settings:ledgerAccountsGate.snackbar.selectCsv"),
            severity: "warning",
          });
          return;
        }

        await new Promise<void>((resolve, reject) => {
          Papa.parse<CsvRow>(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (result) => {
              try {
                const mapped: AddGLAccountRequest[] = (result.data || [])
                  .map((r) => {
                    const rawCategory = r.CATEGORY ?? r.category;
                    const category = parseCategoryCode(rawCategory);

                    const subgroup = (r.SUBGROUP || r.subgroup || "").trim();
                    const account = (r.ACCOUNT || r.account || "").trim();

                    return {
                      account,
                      category: category as CategoryValue,
                      subcategory: subgroup || undefined,
                      is_active: true,
                    };
                  })
                  .filter((p) => p.account && p.category);

                if (mapped.length === 0) {
                  setSnack({
                    message: t("settings:ledgerAccountsGate.snackbar.emptyCsv"),
                    severity: "warning",
                  });
                  return reject(new Error("EMPTY_CSV"));
                }

                await addMany(mapped);
                resolve();
              } catch (err) {
                reject(err instanceof Error ? err : new Error("CSV_IMPORT_FAIL"));
              }
            },
            error: (err) => reject(err),
          });
        });

        setSnack({
          message: t("settings:ledgerAccountsGate.snackbar.csvSuccess"),
          severity: "success",
        });
      }

      // ---------------- Manual mode ----------------
      else if (mode === "manual") {
        const items = parseManual(textBlock);
        if (items.length === 0) {
          setSnack({
            message: t("settings:ledgerAccountsGate.snackbar.manualRequired"),
            severity: "warning",
          });
          return;
        }
        await addMany(items);
        setSnack({
          message: t("settings:ledgerAccountsGate.snackbar.manualSuccess"),
          severity: "success",
        });
      }

      // ---------------- Standard mode ----------------
      else if (mode === "standard") {
        if (!stdChoice) {
          setSnack({
            message: t("settings:ledgerAccountsGate.snackbar.standardRequired"),
            severity: "warning",
          });
          return;
        }

        // JSON must include: category, subgroup, account
        const src = ((stdChoice === "personal"
          ? personalAccounts
          : businessAccounts) as unknown) as StandardRow[];

        const mapped: AddGLAccountRequest[] = src
          .map((e) => {
            const category = parseCategoryCode(e.category);
            return {
              account: e.account,
              category: category as CategoryValue,
              subcategory: e.subgroup || undefined,
              is_active: true,
            };
          })
          .filter((p) => p.account && p.category);

        if (mapped.length === 0) {
          setSnack({
            message: t("settings:ledgerAccountsGate.snackbar.standardEmpty"),
            severity: "warning",
          });
          return;
        }

        await addMany(mapped);
        setSnack({
          message: t("settings:ledgerAccountsGate.snackbar.standardSuccess"),
          severity: "success",
        });
      }

      // ---------------- No mode selected ----------------
      else {
        setSnack({
          message: t("settings:ledgerAccountsGate.snackbar.chooseMode"),
          severity: "info",
        });
        return;
      }

      // After successful import, go to the main listing URL.
      // LedgerAccountsRouter will then decide what to render.
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
          {/* Header card (consistent with Settings pages) */}
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

          {/* Gate content card */}
          <section className="mt-6">
            <div className="max-w-3xl mx-auto p-6 md:p-8 border border-gray-200 rounded-lg bg-white space-y-6">
              <p className="text-sm text-gray-600">
                {t("settings:ledgerAccountsGate.subtitle")}
              </p>

              {/* CSV */}
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
                    <Button
                      variant="outline"
                      onClick={downloadTemplate}
                      disabled={isSubmitting}
                    >
                      {t("settings:ledgerAccountsGate.modes.csv.downloadTemplate")}
                    </Button>
                    <Input
                      type="file"
                      label={t("settings:ledgerAccountsGate.modes.csv.uploadLabel")}
                      onChange={handleUploadCSV}
                      accept=".csv,text/csv"
                      disabled={isSubmitting}
                    />
                    <p className="text-[12px] text-gray-500">
                      {t("settings:ledgerAccountsGate.modes.csv.hintHeaderRow")} ·{" "}
                      {t("settings:ledgerAccountsGate.modes.csv.hintColumns", {
                        defaultValue:
                          "Required columns: CATEGORY (1..4), optional: GROUP, SUBGROUP, ACCOUNT.",
                      })}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {t("settings:ledgerAccountsGate.modes.csv.hintCategories", {
                        defaultValue:
                          "CATEGORY codes: 1 = Operational Revenue · 2 = Non-operational Revenue · 3 = Operational Expense · 4 = Non-operational Expense.",
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
                          "One account per line. Format: CATEGORY ; SUBGROUP ; ACCOUNT. CATEGORY must be 1, 2, 3 or 4.",
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

      {/* Snackbar */}
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
