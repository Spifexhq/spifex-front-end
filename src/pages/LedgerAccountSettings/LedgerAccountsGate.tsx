/* --------------------------------------------------------------------------
 * File: src/pages/LedgerAccountsGate.tsx
 * Style/UX: Matches Settings pages (header card, compact labels)
 * Logic:
 *  - Initial probe for existing accounts -> redirect if found
 *  - Modes: CSV / Manual / Standard (personal|business)
 *  - Flags: isInitialLoading, isSubmitting
 *  - TopProgress + PageSkeleton during initial check
 *  - Consistent disabled states while busy
 * i18n: settings:ledgerAccountsGate.*
 * -------------------------------------------------------------------------- */

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";

import Button from "src/components/ui/Button";
import Input from "src/components/ui/Input";
import Snackbar from "src/components/ui/Snackbar";

import { api } from "src/api/requests";
import type {
  AddGLAccountRequest,
  GetLedgerAccountsResponse,
} from "src/models/enterprise_structure/dto";
import Papa from "papaparse";
import personalAccounts from "src/data/personalAccounts.json";
import businessAccounts from "src/data/businessAccounts.json";
import { useTranslation } from "react-i18next";

/* --- Snackbar type --- */
type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* --- Types & helpers --- */
type CsvRow = {
  GRUPO?: string;
  SUBGRUPO?: string;
  CONTA?: string;
  group?: string;
  subgroup?: string;
  account?: string;
};
type Mode = "csv" | "manual" | "standard" | null;
type StandardRow = { account: string; group: string; subgroup: string };
type CategoryValue = 1 | 2 | 3 | 4;

/**
 * Mapping of Portuguese group labels to category values (1..4).
 * NOTE: This is internal data mapping (CSV/manual input), not UI.
 */
const LABEL_TO_CATEGORY: Record<
  | "Receitas Operacionais"
  | "Receitas Não Operacionais"
  | "Despesas Operacionais"
  | "Despesas Não Operacionais",
  CategoryValue
> = {
  "Receitas Operacionais": 1,
  "Receitas Não Operacionais": 2,
  "Despesas Operacionais": 3,
  "Despesas Não Operacionais": 4,
};

const normalize = (str: string) =>
  str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

/**
 * Heuristic mapping of a textual group label to one of the 4 categories.
 */
function toCategoryValue(groupLabel: string): CategoryValue {
  const g = (groupLabel || "").trim();
  if (g in LABEL_TO_CATEGORY) return LABEL_TO_CATEGORY[g as keyof typeof LABEL_TO_CATEGORY];

  const n = normalize(g);
  const isReceita = n.startsWith("receita");
  const isDespesa = n.startsWith("despesa");
  const isNaoOper =
    /\bnao\b.*\boperacionais?\b/.test(n) || /\bnao-operacionais?\b/.test(n);

  if (isReceita && isNaoOper) return 2;
  if (isReceita) return 1;
  if (isDespesa && isNaoOper) return 4;
  return 3;
}

const getInitials = () => "GL";

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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* --------- Gate state --------- */
  const [hasAccounts, setHasAccounts] = useState(false);

  /* --------- UI state --------- */
  const [mode, setMode] = useState<Mode>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [textBlock, setTextBlock] = useState("");
  const [stdChoice, setStdChoice] = useState<"personal" | "business" | null>(null);
  const [snack, setSnack] = useState<Snack>(null);

  const csvTemplate = useMemo(() => {
    const rows = [
      ["GRUPO", "SUBGRUPO", "CONTA"],
      ["Receitas Operacionais", "Vendas", "Vendas de Produtos"],
      ["Despesas Operacionais", "Administrativas", "Salários e Encargos"],
    ];
    return rows.map((r) => r.join(",")).join("\n");
  }, []);

  /* --------- Probe existing accounts (redirect if exists) --------- */
  useEffect(() => {
    (async () => {
      try {
        const { data } = (await api.getLedgerAccounts({
          page_size: 1,
        })) as { data: GetLedgerAccountsResponse };

        const list = data?.results ?? [];
        const any = Array.isArray(list) && list.length > 0;

        setHasAccounts(any);

        if (any) {
          // Hard redirect to the listing page (no gate flash).
          navigate("/settings/ledger-accounts", { replace: true });
          return;
        }
      } catch {
        // Stay on gate if probe fails.
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, [navigate]);

  /* --------- Loading UI --------- */
  if (isInitialLoading || hasAccounts) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  /* --------- Actions --------- */
  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t(
      "settings:ledgerAccountsGate.misc.fileNameTemplate"
    ) as string;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addMany = async (items: AddGLAccountRequest[]) => {
    const CHUNK = 30;
    for (let i = 0; i < items.length; i += CHUNK) {
      const slice = items.slice(i, i + CHUNK);
      // Parallelize inserts within a chunk.
      await Promise.all(slice.map((payload) => api.addLedgerAccount(payload)));
    }
  };

  const parseManual = (text: string): AddGLAccountRequest[] =>
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/;|,/).map((p) => p.trim());
        const [group, subgroup, account] = parts;
        const category = toCategoryValue(group ?? "");
        return {
          name: account ?? "",
          category,
          subcategory: subgroup || undefined,
          is_active: true,
        };
      })
      .filter((p) => p.name && p.category);

  const handleUploadCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCsvFile(file);
  };

  const submit = async () => {
    try {
      setIsSubmitting(true);

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
                  .filter((r) => (r.GRUPO || r.group) && (r.CONTA || r.account))
                  .map((r) => {
                    const group = (r.GRUPO || r.group || "").trim();
                    const subgroup = (r.SUBGRUPO || r.subgroup || "").trim();
                    const account = (r.CONTA || r.account || "").trim();
                    return {
                      name: account,
                      category: toCategoryValue(group),
                      subcategory: subgroup || undefined,
                      is_active: true,
                    };
                  });

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
      } else if (mode === "manual") {
        const items = parseManual(textBlock);
        if (items.length === 0) {
          setSnack({
            message: t(
              "settings:ledgerAccountsGate.snackbar.manualRequired"
            ),
            severity: "warning",
          });
          return;
        }
        await addMany(items);
        setSnack({
          message: t("settings:ledgerAccountsGate.snackbar.manualSuccess"),
          severity: "success",
        });
      } else if (mode === "standard") {
        if (!stdChoice) {
          setSnack({
            message: t(
              "settings:ledgerAccountsGate.snackbar.standardRequired"
            ),
            severity: "warning",
          });
          return;
        }

        const src = (stdChoice === "personal"
          ? personalAccounts
          : businessAccounts) as StandardRow[];

        const mapped: AddGLAccountRequest[] = src.map((e) => ({
          name: e.account,
          category: toCategoryValue(e.group),
          subcategory: e.subgroup || undefined,
          is_active: true,
        }));

        await addMany(mapped);
        setSnack({
          message: t("settings:ledgerAccountsGate.snackbar.standardSuccess"),
          severity: "success",
        });
      } else {
        setSnack({
          message: t("settings:ledgerAccountsGate.snackbar.chooseMode"),
          severity: "info",
        });
        return;
      }

      navigate("/settings/ledger-accounts", { replace: true });
    } catch (e) {
      const msg =
        (e as { message?: string })?.message ||
        (t(
          "settings:ledgerAccountsGate.snackbar.saveError"
        ) as string);
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
                      {t(
                        "settings:ledgerAccountsGate.modes.csv.downloadTemplate"
                      )}
                    </Button>
                    <Input
                      type="file"
                      label={t(
                        "settings:ledgerAccountsGate.modes.csv.uploadLabel"
                      )}
                      onChange={handleUploadCSV}
                      accept=".csv,text/csv"
                      disabled={isSubmitting}
                    />
                    <p className="text-[12px] text-gray-500">
                      {t(
                        "settings:ledgerAccountsGate.modes.csv.hintHeaderRow"
                      )}{" "}
                      ·{" "}
                      {t(
                        "settings:ledgerAccountsGate.modes.csv.hintColumns"
                      )}
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
                      {t(
                        "settings:ledgerAccountsGate.modes.manual.instructions"
                      )}
                    </p>
                    <textarea
                      className="w-full border border-gray-200 rounded p-2 resize-y min-h-[140px] outline-none focus:ring-2 focus:ring-gray-200"
                      placeholder={t(
                        "settings:ledgerAccountsGate.modes.manual.placeholder"
                      )}
                      value={textBlock}
                      onChange={(e) => setTextBlock(e.target.value)}
                      disabled={isSubmitting}
                    />
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
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="std"
                        checked={stdChoice === "personal"}
                        onChange={() => setStdChoice("personal")}
                        disabled={isSubmitting}
                      />
                      {t(
                        "settings:ledgerAccountsGate.modes.standard.personal"
                      )}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="std"
                        checked={stdChoice === "business"}
                        onChange={() => setStdChoice("business")}
                        disabled={isSubmitting}
                      />
                      {t(
                        "settings:ledgerAccountsGate.modes.standard.business"
                      )}
                    </label>
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
