/* -------------------------------------------------------------------------- */
/*  File: src/pages/LedgerAccountSettings/LedgerAccountsGate.tsx              */
/* -------------------------------------------------------------------------- */

import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import Navbar from "@/components/Navbar";
import { SuspenseLoader } from "@/components/Loaders";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";

import { api } from "src/api/requests";

// ⚠️ Se não tiver @types/papaparse, ver instruções mais abaixo.
import Papa from "papaparse";

// Estes JSONs são opcionais no seu repo.
// Se não existir, remova as importações ou crie-os.
import personalAccounts from "src/data/personalAccounts.json";
import businessAccounts from "src/data/businessAccounts.json";

/* ------------------------------ Tipos locais ------------------------------ */

type CsvRow = {
  GRUPO?: string;
  SUBGRUPO?: string;
  CONTA?: string;
  group?: string;
  subgroup?: string;
  account?: string;
};

type NewLedgerItem = {
  general_ledger_account: string;
  group: string;
  subgroup: string;
  transaction_type: "debit" | "credit";
};

type Mode = "csv" | "manual" | "standard" | null;

// request() lança este shape:
type ApiErrorThrown = {
  code: string;
  message: string;
  details?: unknown;
};

/* ---------------------------- Componente único ---------------------------- */
/*  - Se EXISTEM contas => redireciona para /settings/ledger-accounts        */
/*  - Se NÃO existem/404/NOT_FOUND => permanece e exibe onboarding           */
/*  - Se NOT_AUTHENTICATED => mostra aviso e permanece                       */
/* -------------------------------------------------------------------------- */

const LedgerAccountsGate: React.FC = () => {
  const navigate = useNavigate();

  // Hooks: TUDO no topo (antes de qualquer return condicional)
  const [loading, setLoading] = useState(true);
  const [hasAccounts, setHasAccounts] = useState(false);

  const [mode, setMode] = useState<Mode>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [textBlock, setTextBlock] = useState("");
  const [stdChoice, setStdChoice] = useState<"personal" | "business" | null>(null);

  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState("");

  // NÃO chame hooks depois de returns condicionais
  const csvTemplate = useMemo(() => {
    const rows = [
      ["GRUPO", "SUBGRUPO", "CONTA"],
      ["Receitas Operacionais", "Vendas", "Vendas de Produtos"],
      ["Despesas Operacionais", "Administrativas", "Salários e Encargos"],
    ];
    return rows.map((r) => r.join(",")).join("\n");
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getAllLedgerAccounts();
        const list = res.data?.general_ledger_accounts ?? [];
        setHasAccounts(Array.isArray(list) && list.length > 0);
      } catch (e) {
        const err = e as ApiErrorThrown;
        if (
          err?.code === "NOT_FOUND_GENERAL_LEDGER_ACCOUNT" ||
          // Alguns backends mandam 404 em GET de coleção vazia; trate como “sem contas”.
          err?.code === "NOT_FOUND"
        ) {
          setHasAccounts(false);
        } else if (err?.code === "NOT_AUTHENTICATED") {
          setHasAccounts(false);
          setSnack("Você precisa estar autenticado para cadastrar contas.");
        } else {
          setHasAccounts(false);
          setSnack("Não foi possível verificar suas contas. Você pode cadastrá-las agora.");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------------------------- Early returns ----------------------------- */
  if (loading) return <SuspenseLoader />;
  if (hasAccounts) return <Navigate to="/settings/ledger-accounts" replace />;

  /* -------------------- Funções auxiliares (onboarding) ------------------- */

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spifex-standard-general-ledger-accounts.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const addMany = async (items: NewLedgerItem[]) => {
    // Em produção convém fazer “batching” (ex.: em blocos de 20) para evitar saturar API
    await Promise.all(items.map((item) => api.addLedgerAccount(item)));
  };

  const parseManual = (text: string): NewLedgerItem[] => {
    // Formato por linha:
    // GRUPO;SUBGRUPO;CONTA   (ou separado por vírgula)
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/;|,/).map((p) => p.trim());
        const [group, subgroup, account] = parts;
        const transaction_type: "debit" | "credit" =
          (group ?? "").startsWith("Receitas") ? "credit" : "debit";
        return {
          general_ledger_account: account ?? "",
          group: group ?? "",
          subgroup: subgroup ?? "",
          transaction_type,
        };
      })
      .filter((it) => it.group && it.general_ledger_account);
  };

  const handleUploadCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCsvFile(file);
  };

  const submit = async () => {
    try {
      setBusy(true);

      if (mode === "csv") {
        if (!csvFile) {
          setSnack("Selecione um arquivo CSV.");
          return;
        }
        await new Promise<void>((resolve, reject) => {
          Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (result: { data: CsvRow[] }) => {
              try {
                const mapped: NewLedgerItem[] = (result.data || [])
                  .filter((r) => (r.GRUPO || r.group) && (r.CONTA || r.account))
                  .map((r) => {
                    const group = r.GRUPO || r.group || "";
                    const transaction_type: "debit" | "credit" =
                      group.startsWith("Receitas") ? "credit" : "debit";
                    return {
                      general_ledger_account: r.CONTA || r.account || "",
                      group,
                      subgroup: r.SUBGRUPO || r.subgroup || "",
                      transaction_type,
                    };
                  });
                if (mapped.length === 0) {
                  setSnack("CSV vazio ou inválido.");
                  return reject(new Error("CSV inválido"));
                }
                await addMany(mapped);
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            error: (err: unknown) => reject(err),
          });
        });
      } else if (mode === "manual") {
        const items = parseManual(textBlock);
        if (items.length === 0) {
          setSnack("Preencha o campo no formato GRUPO;SUBGRUPO;CONTA.");
          return;
        }
        await addMany(items);
      } else if (mode === "standard") {
        if (!stdChoice) {
          setSnack("Selecione um plano padrão (Pessoal ou Empresarial).");
          return;
        }
        // Tipos dos JSONs padrão
        type StandardRow = { account: string; group: string; subgroup: string };
        const src = (stdChoice === "personal" ? personalAccounts : businessAccounts) as StandardRow[];

        const mapped: NewLedgerItem[] = src.map((e) => ({
          general_ledger_account: e.account,
          group: e.group,
          subgroup: e.subgroup,
          transaction_type: e.group?.startsWith("Receitas") ? "credit" : "debit",
        }));
        await addMany(mapped);
      } else {
        setSnack("Escolha uma opção (CSV, Manual ou Plano Padrão).");
        return;
      }

      navigate("/settings/ledger-accounts", { replace: true });
    } catch (e) {
      const err = e as { message?: string };
      setSnack(err?.message || "Erro ao registrar contas contábeis.");
    } finally {
      setBusy(false);
    }
  };

  /* --------------------------------- UI ---------------------------------- */

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 px-8 py-20 text-gray-900">
        <section className="max-w-3xl mx-auto p-8 border rounded-lg bg-white space-y-6">
          <h1 className="text-xl font-semibold">Vamos configurar suas Contas Contábeis</h1>
          <p className="text-sm text-gray-600">
            Escolha uma forma de cadastrar seu plano de contas. Você pode alterar/expandir depois.
          </p>

          {/* CSV */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Upload via CSV</h2>
              <label className="text-sm flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "csv"}
                  onChange={() => setMode("csv")}
                />
                Selecionar
              </label>
            </div>
            {mode === "csv" && (
              <div className="space-y-3">
                <Button variant="outline" onClick={downloadTemplate}>
                  Baixar modelo .csv
                </Button>
                <Input type="file" label="Enviar arquivo .csv" onChange={handleUploadCSV} />
              </div>
            )}
          </div>

          {/* Manual */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Inserir manualmente</h2>
              <label className="text-sm flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "manual"}
                  onChange={() => setMode("manual")}
                />
                Selecionar
              </label>
            </div>
            {mode === "manual" && (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  Use o formato <b>GRUPO;SUBGRUPO;CONTA</b> — uma conta por linha. Vírgula também é
                  aceita.
                </p>
                <textarea
                  className="w-full border rounded p-2 resize-y min-h-[140px]"
                  placeholder={
                    "Exemplos:\nReceitas Operacionais;Vendas;Vendas de Produtos\nDespesas Operacionais;Administrativas;Salários e Encargos"
                  }
                  value={textBlock}
                  onChange={(e) => setTextBlock(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Plano padrão */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Usar Plano Padrão</h2>
              <label className="text-sm flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "standard"}
                  onChange={() => setMode("standard")}
                />
                Selecionar
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
                  />
                  Plano de Contas Pessoal
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="std"
                    checked={stdChoice === "business"}
                    onChange={() => setStdChoice("business")}
                  />
                  Plano de Contas Empresarial
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
              Limpar seleção
            </Button>
            <Button onClick={submit} disabled={busy}>
              Concluir
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
