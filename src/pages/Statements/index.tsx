/* -----------------------------------------------------------------------------
 * File: src/pages/Statements.tsx
 * Style: Minimalist / compact; no heavy shadows; light borders.
 * UX: Drag & drop, multi-upload with per-file progress, associate to Bank,
 *     auto-refresh list, optimistic rows, keyboard shortcuts.
 * -------------------------------------------------------------------------- */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Navbar from "@/components/Navbar";
import SidebarSettings from "@/components/Sidebar/SidebarSettings";
import { SuspenseLoader } from "@/components/Loaders";
import Button from "@/components/Button";
import Snackbar from "@/components/Snackbar";
import Alert from "@/components/Alert";
import { SelectDropdown } from "@/components/SelectDropdown";
import ConfirmToast from "@/components/ConfirmToast/ConfirmToast";
import Input from "@/components/Input";

import { api } from "@/api/requests";
import type { BankAccount } from "src/models/enterprise_structure/domain";

/* --------------------------------- Types ---------------------------------- */
type StatementStatus = "uploaded" | "processing" | "ready" | "failed";

type Statement = {
  id: string; // external_id
  bank_account_id: string | null;
  bank_account_label: string | null;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  pages: number | null;
  status: StatementStatus;
  created_at: string; // ISO
};

type UploadRow = {
  id: string; // temp id
  file: File;
  bankAccount?: { label: string; value: string } | null;
  progress: number; // 0..100
  error?: string;
};

/* ------------------------------ Utilities --------------------------------- */
const formatBytes = (n: number) => {
  if (!Number.isFinite(n)) return "-";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`;
};

const statusChip: Record<StatementStatus, string> = {
  uploaded: "bg-gray-100 text-gray-700",
  processing: "bg-amber-100 text-amber-800",
  ready: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
};

const isPDF = (f: File) =>
  f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");

const toStatus = (v?: string): "" | StatementStatus =>
  v === "uploaded" || v === "processing" || v === "ready" || v === "failed"
    ? (v as StatementStatus)
    : "";

/* --------------------------------- Page ----------------------------------- */
const Statements: React.FC = () => {
  useEffect(() => {
    document.title = "Extratos";
  }, []);

  const [snack, setSnack] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // banks for selector
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const bankItems = useMemo(
    () =>
      banks.map((b) => ({
        label: `${b.institution} • ${b.branch ?? "-"} / ${b.account_number ?? "-"}`,
        value: b.id, // external_id
      })),
    [banks]
  );

  // list & filters
  const [statements, setStatements] = useState<Statement[]>([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatementStatus | "">("");
  const [bankFilter, setBankFilter] = useState<string | "">("");

  // uploads
  const [queue, setQueue] = useState<UploadRow[]>([]);
  const dndRef = useRef<HTMLDivElement>(null);

  // confirm delete
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const deleteIdRef = useRef<string | null>(null);

  /* ------------------------------ Fetching -------------------------------- */
  const refreshBanks = useCallback(async () => {
    try {
      const { data } = await api.getAllBanks();
      setBanks(data?.results ?? []);
    } catch {
      setSnack("Erro ao carregar bancos.");
    }
  }, []);

  const refreshStatements = useCallback(async () => {
    try {
      const { data } = await api.getStatements({
        q: q || undefined,
        status: statusFilter || undefined,
        bank: bankFilter || undefined,
      });
      setStatements(data?.results ?? []);
    } catch {
      setSnack("Erro ao buscar extratos.");
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, bankFilter]);

  useEffect(() => {
    setLoading(true);
    Promise.all([refreshBanks(), refreshStatements()]).finally(() => {});
  }, [refreshBanks, refreshStatements]);

  /* ------------------------------- Upload --------------------------------- */
  const addFiles = (files: FileList | File[]) => {
    const rows: UploadRow[] = [];
    Array.from(files).forEach((file) => {
      if (!isPDF(file)) {
        setSnack(`Arquivo ignorado (não-PDF): ${file.name}`);
        return;
      }
      const id = `${file.name}_${file.size}_${file.lastModified}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      rows.push({ id, file, progress: 0, bankAccount: null });
    });
    if (rows.length) {
      setQueue((prev) => [...rows, ...prev]);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.currentTarget.value = "";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    dndRef.current?.classList.remove("ring-2", "ring-gray-300");
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dndRef.current?.classList.add("ring-2", "ring-gray-300");
  };
  const onDragLeave = () =>
    dndRef.current?.classList.remove("ring-2", "ring-gray-300");

  const removeFromQueue = (id: string) =>
    setQueue((prev) => prev.filter((r) => r.id !== id));

  const uploadOne = async (row: UploadRow) => {
    try {
      const form = new FormData();
      form.append("file", row.file);
      if (row.bankAccount?.value)
        form.append("bank_account_id", row.bankAccount.value);

      await api.uploadStatement(form, (p) => {
        setQueue((prev) =>
          prev.map((r) => (r.id === row.id ? { ...r, progress: p } : r))
        );
      });

      // optimistic remove from queue and refresh list
      removeFromQueue(row.id);
      await refreshStatements();
    } catch (err: unknown) {
      let msg = "Falha no upload do extrato.";
      if (err && typeof err === "object") {
        const maybe = err as {
          response?: { data?: { detail?: string } };
          message?: string;
        };
        msg = maybe.response?.data?.detail ?? maybe.message ?? msg;
      }
      setQueue((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, error: msg } : r))
      );
    }
  };

  const uploadAll = async () => {
    for (const row of queue) {
      if (!row.error) {
        await uploadOne(row);
      }
    }
  };

  /* ----------------------------- Actions list ------------------------------ */
  const requestDelete = (id: string) => {
    deleteIdRef.current = id;
    setConfirmOpen(true);
  };

  const doDelete = async () => {
    const id = deleteIdRef.current;
    if (!id) return;
    try {
      await api.deleteStatement(id);
      await refreshStatements();
    } catch {
      setSnack("Falha ao excluir extrato.");
    } finally {
      setConfirmBusy(false);
      setConfirmOpen(false);
      deleteIdRef.current = null;
    }
  };

  const triggerAnalysis = async (id: string) => {
    try {
      await api.triggerStatementAnalysis(id);
      setSnack("Análise iniciada. O status será atualizado em instantes.");
      await refreshStatements();
    } catch {
      setSnack("Não foi possível iniciar a análise.");
    }
  };

  // Keyboard: ⌘/Ctrl+U focuses hidden file input; ⌘/Ctrl+F focuses search
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMeta = e.ctrlKey || e.metaKey;
      if (isMeta && e.key.toLowerCase() === "u") {
        e.preventDefault();
        fileInputRef.current?.click();
      }
      if (isMeta && e.key.toLowerCase() === "f") {
        e.preventDefault();
        const el = document.getElementById("statements-q");
        (el as HTMLInputElement | null)?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* --------------------------------- UI ----------------------------------- */
  if (loading) return <SuspenseLoader />;

  return (
    <>
      <Navbar />
      <SidebarSettings activeItem="statements" />
      <main className="min-h-screen bg-gray-50 text-gray-900 pt-16 lg:ml-64 overflow-x-clip">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <header className="bg-white border border-gray-200 rounded-lg">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                EX
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-600">
                  Financeiro
                </div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  Extratos bancários (PDF)
                </h1>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="!py-1.5"
                  aria-label="Selecionar arquivos (⌘/Ctrl+U)"
                >
                  Enviar PDFs
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={onInputChange}
                />
              </div>
            </div>
          </header>

          {/* Upload area */}
          <section className="mt-6">
            <div
              ref={dndRef}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className="bg-white border border-dashed border-gray-300 rounded-lg p-6 text-center"
            >
              <p className="text-[13px] text-gray-700">
                Arraste e solte PDF(s) aqui, ou{" "}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:no-underline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  clique para selecionar
                </button>
                .
              </p>
              <p className="text-[12px] text-gray-500 mt-1">
                Dica: use <kbd className="px-1 border rounded">Ctrl/⌘</kbd>{" "}
                + <kbd className="px-1 border rounded">U</kbd> para abrir o
                seletor.
              </p>
            </div>

            {/* Queue */}
            {queue.length > 0 && (
              <div className="mt-4 border border-gray-200 bg-white rounded-lg">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    Fila de envio ({queue.length})
                  </span>
                  <div className="flex gap-2">
                    <Button variant="cancel" onClick={() => setQueue([])}>
                      Limpar fila
                    </Button>
                    <Button onClick={uploadAll}>Enviar tudo</Button>
                  </div>
                </div>
                <ul className="divide-y divide-gray-200">
                  {queue.map((row) => (
                    <li
                      key={row.id}
                      className="px-4 py-3 flex items-center gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-gray-900 truncate">
                          {row.file.name}
                        </p>
                        <p className="text-[12px] text-gray-600">
                          {formatBytes(row.file.size)}
                        </p>
                        <div className="mt-2 h-2 bg-gray-100 rounded">
                          <div
                            className="h-2 bg-gray-300 rounded"
                            style={{ width: `${row.progress}%` }}
                            aria-valuenow={row.progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            role="progressbar"
                          />
                        </div>
                        {row.error && (
                          <p className="mt-2 text-[12px] text-rose-700">
                            {row.error}
                          </p>
                        )}
                      </div>

                      <div className="w-72">
                        <SelectDropdown
                          label="Conta (opcional)"
                          items={bankItems}
                          selected={row.bankAccount ? [row.bankAccount] : []}
                          onChange={(items) =>
                            setQueue((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? { ...r, bankAccount: items?.[0] ?? null }
                                  : r
                              )
                            )
                          }
                          getItemKey={(i) => i.value}
                          getItemLabel={(i) => i.label}
                          singleSelect
                          hideCheckboxes
                          buttonLabel="Vincular a uma conta"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                          onClick={() => uploadOne(row)}
                        >
                          Enviar
                        </Button>
                        <Button
                          variant="cancel"
                          onClick={() => removeFromQueue(row.id)}
                        >
                          Remover
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Filters */}
          <section className="mt-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                  id="statements-q"
                  label="Buscar por nome do arquivo"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ex.: itau_outubro.pdf"
                />
                <SelectDropdown
                  label="Status"
                  items={[
                    { label: "Uploaded", value: "uploaded" },
                    { label: "Processando", value: "processing" },
                    { label: "Pronto", value: "ready" },
                    { label: "Falhou", value: "failed" },
                  ]}
                  selected={
                    statusFilter
                      ? [{ label: statusFilter, value: statusFilter }]
                      : []
                  }
                  onChange={(items) => setStatusFilter(toStatus(items?.[0]?.value))}
                  getItemKey={(i) => i.value}
                  getItemLabel={(i) => i.label}
                  singleSelect
                  hideCheckboxes
                  buttonLabel="Selecione o status"
                />
                <SelectDropdown
                  label="Conta"
                  items={bankItems}
                  selected={
                    bankFilter ? bankItems.filter((i) => i.value === bankFilter) : []
                  }
                  onChange={(items) => setBankFilter(items?.[0]?.value ?? "")}
                  getItemKey={(i) => i.value}
                  getItemLabel={(i) => i.label}
                  singleSelect
                  hideCheckboxes
                  buttonLabel="Filtrar por conta"
                />
                <div className="flex items-end gap-2">
                  <Button onClick={refreshStatements} className="!w-full">
                    Aplicar filtros
                  </Button>
                  <Button
                    variant="cancel"
                    onClick={() => {
                      setQ("");
                      setStatusFilter("");
                      setBankFilter("");
                      refreshStatements();
                    }}
                  >
                    Limpar
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* List */}
          <section className="mt-6">
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                <span className="text-[11px] uppercase tracking-wide text-gray-700">
                  Extratos enviados ({statements.length})
                </span>
              </div>

              {statements.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-500">
                  Nenhum extrato encontrado.
                </p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {statements.map((s) => (
                    <li key={s.id} className="px-4 py-3 grid grid-cols-12 gap-3">
                      {/* File info */}
                      <div className="col-span-6 min-w-0">
                        <p className="text-[13px] font-medium text-gray-900 truncate">
                          {s.original_filename}
                        </p>
                        <p className="text-[12px] text-gray-600">
                          {formatBytes(s.size_bytes)} · {s.pages ?? "-"} pág ·{" "}
                          {new Date(s.created_at).toLocaleString()}
                        </p>
                      </div>

                      {/* Bank */}
                      <div className="col-span-4">
                        <p className="text-[12px] text-gray-600">Conta</p>
                        <p className="text-[13px] text-gray-900">
                          {s.bank_account_label ?? "—"}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex items-center gap-2 justify-end">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] ${statusChip[s.status]}`}
                        >
                          {s.status}
                        </span>

                        <Button
                          variant="outline"
                          className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                          onClick={() => api.downloadStatement(s.id)}
                          title="Baixar PDF"
                        >
                          Baixar
                        </Button>

                        <Button
                          variant="common"
                          onClick={() => triggerAnalysis(s.id)}
                          disabled={s.status === "processing"}
                          title="Solicitar análise com IA"
                        >
                          Analisar
                        </Button>

                        <Button
                          variant="cancel"
                          onClick={() => requestDelete(s.id)}
                          title="Excluir"
                        >
                          Excluir
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* Confirm delete */}
        <ConfirmToast
          open={confirmOpen}
          text="Excluir este extrato? Esta ação não poderá ser desfeita."
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          variant="danger"
          onCancel={() => {
            if (confirmBusy) return;
            setConfirmOpen(false);
          }}
          onConfirm={() => {
            if (confirmBusy) return;
            setConfirmBusy(true);
            doDelete().catch(() => {
              setSnack("Falha ao excluir extrato.");
              setConfirmBusy(false);
              setConfirmOpen(false);
            });
          }}
          busy={confirmBusy}
        />
      </main>

      {/* Snackbar */}
      <Snackbar
        open={!!snack}
        autoHideDuration={5000}
        onClose={() => setSnack("")}
        severity="info"
      >
        <Alert severity="info">{snack}</Alert>
      </Snackbar>
    </>
  );
};

export default Statements;
