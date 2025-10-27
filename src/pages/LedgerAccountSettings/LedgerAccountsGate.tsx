import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Navbar from "@/components/Navbar";
import { SuspenseLoader } from "@/components/Loaders";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";

import { api } from "src/api/requests";
import type { AddGLAccountRequest, GetLedgerAccountsResponse } from "src/models/enterprise_structure/dto";
import Papa from "papaparse";
import personalAccounts from "src/data/personalAccounts.json";
import businessAccounts from "src/data/businessAccounts.json";
import { useTranslation } from "react-i18next";

/* --- types & helpers (unchanged) --- */
type CsvRow = { GRUPO?: string; SUBGRUPO?: string; CONTA?: string; group?: string; subgroup?: string; account?: string; };
type Mode = "csv" | "manual" | "standard" | null;
type StandardRow = { account: string; group: string; subgroup: string };
type CategoryValue = 1 | 2 | 3 | 4;
const LABEL_TO_CATEGORY: Record<
  | "Receitas Operacionais"
  | "Receitas Não Operacionais"
  | "Despesas Operacionais"
  | "Despesas Não Operacionais", CategoryValue
> = { "Receitas Operacionais": 1, "Receitas Não Operacionais": 2, "Despesas Operacionais": 3, "Despesas Não Operacionais": 4 };

function normalize(str: string) { return str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim(); }
function toCategoryValue(groupLabel: string): CategoryValue {
  const g = groupLabel.trim();
  if (g in LABEL_TO_CATEGORY) return LABEL_TO_CATEGORY[g as keyof typeof LABEL_TO_CATEGORY];
  const n = normalize(g);
  const isReceita = n.startsWith("receita") || n.startsWith("receitas");
  const isDespesa = n.startsWith("despesa") || n.startsWith("despesas");
  const isNaoOper = /\bnao\b.*\boperacionais?\b/.test(n) || /\bnao-operacionais?\b/.test(n);
  if (isReceita && isNaoOper) return 2;
  if (isReceita) return 1;
  if (isDespesa && isNaoOper) return 4;
  return 3;
}

const LedgerAccountsGate: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(["settings"]);

  const [loading, setLoading] = useState(true);
  const [hasAccounts, setHasAccounts] = useState(false);

  const [mode, setMode] = useState<Mode>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [textBlock, setTextBlock] = useState("");
  const [stdChoice, setStdChoice] = useState<"personal" | "business" | null>(null);
  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState("");

  const csvTemplate = useMemo(() => {
    const rows = [
      ["GRUPO", "SUBGRUPO", "CONTA"],
      ["Receitas Operacionais", "Vendas", "Vendas de Produtos"],
      ["Despesas Operacionais", "Administrativas", "Salários e Encargos"],
    ];
    return rows.map((r) => r.join(",")).join("\n");
  }, []);

  // Fetch first page to detect existing accounts
  useEffect(() => {
    (async () => {
      try {
        const { data } = (await api.getLedgerAccounts({ page_size: 1 })) as { data: GetLedgerAccountsResponse };
        const list = data?.results ?? [];
        setHasAccounts(Array.isArray(list) && list.length > 0);
      } catch {
        setHasAccounts(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ✅ Imperative redirect (no UI flash)
  useEffect(() => {
    if (!loading && hasAccounts) {
      navigate("/settings/ledger-accounts", { replace: true });
    }
  }, [loading, hasAccounts, navigate]);

  // While checking or redirecting, just show loader
  if (loading || hasAccounts) return <SuspenseLoader />;

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t("settings:ledgerAccountsGate.misc.fileNameTemplate");
    a.click();
    URL.revokeObjectURL(url);
  };

  const addMany = async (items: AddGLAccountRequest[]) => {
    const CHUNK = 30;
    for (let i = 0; i < items.length; i += CHUNK) {
      const slice = items.slice(i, i + CHUNK);
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
      setBusy(true);

      if (mode === "csv") {
        if (!csvFile) { setSnack(t("settings:ledgerAccountsGate.snackbar.selectCsv")); return; }
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
                    return { name: account, category: toCategoryValue(group), subcategory: subgroup || undefined, is_active: true };
                  });

                if (mapped.length === 0) { setSnack(t("settings:ledgerAccountsGate.snackbar.emptyCsv")); return reject(new Error("EMPTY_CSV")); }
                await addMany(mapped);
                resolve();
              } catch (err) { reject(err instanceof Error ? err : new Error("CSV_IMPORT_FAIL")); }
            },
            error: (err) => reject(err),
          });
        });
      } else if (mode === "manual") {
        const items = parseManual(textBlock);
        if (items.length === 0) { setSnack(t("settings:ledgerAccountsGate.snackbar.manualRequired")); return; }
        await addMany(items);
      } else if (mode === "standard") {
        if (!stdChoice) { setSnack(t("settings:ledgerAccountsGate.snackbar.standardRequired")); return; }
        const src = (stdChoice === "personal" ? personalAccounts : businessAccounts) as StandardRow[];
        const mapped: AddGLAccountRequest[] = src.map((e) => ({
          name: e.account,
          category: toCategoryValue(e.group),
          subcategory: e.subgroup || undefined,
          is_active: true,
        }));
        await addMany(mapped);
      } else {
        setSnack(t("settings:ledgerAccountsGate.snackbar.chooseMode"));
        return;
      }

      navigate("/settings/ledger-accounts", { replace: true });
    } catch (e) {
      const msg = (e as { message?: string })?.message || t("settings:ledgerAccountsGate.snackbar.saveError");
      setSnack(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 px-8 py-20 text-gray-900">
        <section className="max-w-3xl mx-auto p-8 border rounded-lg bg-white space-y-6">
          <h1 className="text-xl font-semibold">{t("settings:ledgerAccountsGate.title")}</h1>
          <p className="text-sm text-gray-600">{t("settings:ledgerAccountsGate.subtitle")}</p>

          {/* CSV */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{t("settings:ledgerAccountsGate.modes.csv.title")}</h2>
              <label className="text-sm flex items-center gap-2">
                <input type="radio" name="mode" checked={mode === "csv"} onChange={() => setMode("csv")} />
                {t("settings:ledgerAccountsGate.modes.csv.choose")}
              </label>
            </div>
            {mode === "csv" && (
              <div className="space-y-3">
                <Button variant="outline" onClick={downloadTemplate}>
                  {t("settings:ledgerAccountsGate.modes.csv.downloadTemplate")}
                </Button>
                <Input type="file" label={t("settings:ledgerAccountsGate.modes.csv.uploadLabel")} onChange={handleUploadCSV} accept=".csv,text/csv" />
                <p className="text-[12px] text-gray-500">
                  {t("settings:ledgerAccountsGate.modes.csv.hintHeaderRow")} · {t("settings:ledgerAccountsGate.modes.csv.hintColumns")}
                </p>
              </div>
            )}
          </div>

          {/* Manual */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{t("settings:ledgerAccountsGate.modes.manual.title")}</h2>
              <label className="text-sm flex items-center gap-2">
                <input type="radio" name="mode" checked={mode === "manual"} onChange={() => setMode("manual")} />
                {t("settings:ledgerAccountsGate.modes.manual.choose")}
              </label>
            </div>
            {mode === "manual" && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">{t("settings:ledgerAccountsGate.modes.manual.instructions")}</p>
                <textarea
                  className="w-full border rounded p-2 resize-y min-h-[140px]"
                  placeholder={t("settings:ledgerAccountsGate.modes.manual.placeholder")}
                  value={textBlock}
                  onChange={(e) => setTextBlock(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Standard */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{t("settings:ledgerAccountsGate.modes.standard.title")}</h2>
              <label className="text-sm flex items-center gap-2">
                <input type="radio" name="mode" checked={mode === "standard"} onChange={() => setMode("standard")} />
                {t("settings:ledgerAccountsGate.modes.standard.choose")}
              </label>
            </div>
            {mode === "standard" && (
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="std" checked={stdChoice === "personal"} onChange={() => setStdChoice("personal")} />
                  {t("settings:ledgerAccountsGate.modes.standard.personal")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="std" checked={stdChoice === "business"} onChange={() => setStdChoice("business")} />
                  {t("settings:ledgerAccountsGate.modes.standard.business")}
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
              disabled={busy}
            >
              {t("settings:ledgerAccountsGate.buttons.clear")}
            </Button>
            <Button onClick={submit} disabled={busy}>
              {t("settings:ledgerAccountsGate.buttons.finish")}
            </Button>
          </div>
        </section>
      </main>

      <Snackbar open={!!snack} autoHideDuration={6000} onClose={() => setSnack("")}>
        <Alert severity="error">{snack}</Alert>
      </Snackbar>
    </>
  );
};

export default LedgerAccountsGate;
