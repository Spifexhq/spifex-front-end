/* -------------------------------------------------------------------------- */
/*  File: src/pages/LedgerAccountSettings/LedgerAccountsGate.tsx              */
/*  Goal: Onboarding p/ plano de contas                                       */
/*        - Verifica se já existem contas (paginação nova)                    */
/*        - Importa CSV / Manual / Plano Padrão                               */
/*        - Envia category como número (1..4) para a API                      */
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
import type {
  AddGLAccountRequest,
  GetLedgerAccountsResponse,
} from "src/models/enterprise_structure/dto";

// ⚠️ Se não tiver @types/papaparse, mantenha assim:
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

type Mode = "csv" | "manual" | "standard" | null;

type StandardRow = { account: string; group: string; subgroup: string };

/* ------------------------- Categoria (1..4) Helpers ----------------------- */

type CategoryValue = 1 | 2 | 3 | 4;

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

function normalize(str: string): string {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/** Converte rótulo textual do grupo para CategoryValue (1..4) */
function toCategoryValue(groupLabel: string): CategoryValue {
  const g = groupLabel.trim();

  // Match exato primeiro
  if (g in LABEL_TO_CATEGORY) return LABEL_TO_CATEGORY[g as keyof typeof LABEL_TO_CATEGORY];

  // Heurística: Receitas/Despesas + "não operacionais"
  const n = normalize(g);
  const isReceita = n.startsWith("receita") || n.startsWith("receitas");
  const isDespesa = n.startsWith("despesa") || n.startsWith("despesas");
  const isNaoOper = /\bnao\b.*\boperacionais?\b/.test(n) || /\bnao-operacionais?\b/.test(n);

  if (isReceita && isNaoOper) return 2;
  if (isReceita) return 1;
  if (isDespesa && isNaoOper) return 4;
  // default despesas operacionais
  return 3;
}

/* ---------------------------- Componente único ---------------------------- */
/*  - Se EXISTEM contas => redireciona para /settings/ledger-accounts        */
/*  - Se NÃO existem => permanece e exibe onboarding                          */
/* -------------------------------------------------------------------------- */

const LedgerAccountsGate: React.FC = () => {
  const navigate = useNavigate();

  // Hooks no topo
  const [loading, setLoading] = useState(true);
  const [hasAccounts, setHasAccounts] = useState(false);

  const [mode, setMode] = useState<Mode>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [textBlock, setTextBlock] = useState("");
  const [stdChoice, setStdChoice] = useState<"personal" | "business" | null>(null);

  const [busy, setBusy] = useState(false);
  const [snack, setSnack] = useState("");

  // CSV modelo
  const csvTemplate = useMemo(() => {
    const rows = [
      ["GRUPO", "SUBGRUPO", "CONTA"],
      ["Receitas Operacionais", "Vendas", "Vendas de Produtos"],
      ["Despesas Operacionais", "Administrativas", "Salários e Encargos"],
    ];
    return rows.map((r) => r.join(",")).join("\n");
  }, []);

  // Checa existência de contas (usa endpoint paginado)
  useEffect(() => {
    (async () => {
      try {
        const { data } = (await api.getLedgerAccounts({
          page_size: 1,
        })) as { data: GetLedgerAccountsResponse };
        const list = data?.results ?? [];
        setHasAccounts(Array.isArray(list) && list.length > 0);
      } catch {
        // Se der erro, assume que não há contas (onboarding permite registrar)
        setHasAccounts(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------------------------- Early returns ----------------------------- */
  if (loading) return <SuspenseLoader />;
  if (hasAccounts) return <Navigate to="/settings/ledger-accounts" replace />;

  /* -------------------------- Funções auxiliares -------------------------- */

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spifex-standard-general-ledger-accounts.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Envia muitos AddGLAccountRequest em pequenos lotes para não saturar a API */
  const addMany = async (items: AddGLAccountRequest[]) => {
    const CHUNK = 30;
    for (let i = 0; i < items.length; i += CHUNK) {
      const slice = items.slice(i, i + CHUNK);
      // paraleliza dentro do chunk
      await Promise.all(slice.map((payload) => api.addLedgerAccount(payload)));
    }
  };

  /** Manual: cada linha "GRUPO;SUBGRUPO;CONTA" (ou vírgula) -> AddGLAccountRequest */
  const parseManual = (text: string): AddGLAccountRequest[] => {
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/;|,/).map((p) => p.trim());
        const [group, subgroup, account] = parts;
        const category = toCategoryValue(group ?? "");
        const payload: AddGLAccountRequest = {
          name: account ?? "",
          category, // 1..4
          subcategory: subgroup || undefined,
          // code omitido => backend gera com prefixo por categoria
          is_active: true,
        };
        return payload;
      })
      .filter((p) => p.name && p.category);
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
                    const category = toCategoryValue(group);
                    const payload: AddGLAccountRequest = {
                      name: account,
                      category, // 1..4
                      subcategory: subgroup || undefined,
                      is_active: true,
                    };
                    return payload;
                  });

                if (mapped.length === 0) {
                  setSnack("CSV vazio ou inválido.");
                  return reject(new Error("CSV inválido"));
                }
                await addMany(mapped);
                resolve();
              } catch (err) {
                reject(err instanceof Error ? err : new Error("Falha ao importar CSV"));
              }
            },
            error: (err) => reject(err),
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
        const src = (stdChoice === "personal" ? personalAccounts : businessAccounts) as StandardRow[];
        const mapped: AddGLAccountRequest[] = src.map((e) => ({
          name: e.account,
          category: toCategoryValue(e.group), // 1..4
          subcategory: e.subgroup || undefined,
          is_active: true,
        }));
        await addMany(mapped);
      } else {
        setSnack("Escolha uma opção (CSV, Manual ou Plano Padrão).");
        return;
      }

      navigate("/settings/ledger-accounts", { replace: true });
    } catch (e) {
      const err = e as { message?: string };
      setSnack(err?.message || "Erro ao cadastrar contas contábeis.");
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
                <Input
                  type="file"
                  label="Enviar arquivo .csv"
                  onChange={handleUploadCSV}
                  accept=".csv,text/csv"
                />
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
