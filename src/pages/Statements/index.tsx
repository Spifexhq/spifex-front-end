/* -----------------------------------------------------------------------------
 * File: src/pages/Statements.tsx
 * Style: Minimalist / compact; no heavy shadows; light borders.
 * UX: Drag & drop, multi-upload with per-file progress, associate to Bank,
 *     auto-refresh list, optimistic rows, keyboard shortcuts.
 * i18n: group "statements" inside namespace "settings"
 * -------------------------------------------------------------------------- */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Navbar from "src/components/layout/Navbar";
import SidebarSettings from "src/components/layout/Sidebar/SidebarSettings";
import { SuspenseLoader } from "@/components/Loaders";
import Button from "src/components/ui/Button";
import Snackbar from "src/components/ui/Snackbar";
import { SelectDropdown } from "src/components/ui/SelectDropdown";
import ConfirmToast from "src/components/ui/ConfirmToast";
import Input from "src/components/ui/Input";

import { api } from "@/api/requests";
import type { BankAccount } from "src/models/enterprise_structure/domain";
import { useTranslation } from "react-i18next";

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

type Snack =
  | { message: React.ReactNode; severity: "success" | "error" | "warning" | "info" }
  | null;

/* ------------------------------ Utilities --------------------------------- */
const formatBytes = (n: number) => {
  if (!Number.isFinite(n)) return "-";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return `${(n / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`;
};

const chipClass: Record<StatementStatus, string> = {
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
  const { t, i18n } = useTranslation(["settings"]);
  useEffect(() => { document.title = t("settings:statements.title"); }, [t]);
  useEffect(() => { document.documentElement.lang = i18n.language; }, [i18n.language]);

  const [snack, setSnack] = useState<Snack>(null);
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
      setSnack({ message: t("settings:statements.toast.banksFetchError"), severity: "error" });
    }
  }, [t]);

  const refreshStatements = useCallback(async () => {
    try {
      const { data } = await api.getStatements({
        q: q || undefined,
        status: statusFilter || undefined,
        bank: bankFilter || undefined,
      });
      setStatements(data?.results ?? []);
    } catch {
      setSnack({ message: t("settings:statements.toast.listFetchError"), severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, bankFilter, t]);

  useEffect(() => {
    setLoading(true);
    Promise.all([refreshBanks(), refreshStatements()]).finally(() => {});
  }, [refreshBanks, refreshStatements]);

  /* ------------------------------- Upload --------------------------------- */
  const addFiles = (files: FileList | File[]) => {
    const rows: UploadRow[] = [];
    Array.from(files).forEach((file) => {
      if (!isPDF(file)) {
        setSnack({ message: t("settings:statements.toast.nonPdfIgnored", { name: file.name }), severity: "warning" });
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
      setSnack({ message: t("settings:statements.toast.uploadOk"), severity: "success" });
    } catch (err: unknown) {
      let msg = t("settings:statements.toast.uploadFail");
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
      setSnack({ message: msg, severity: "error" });
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
      setSnack({ message: t("settings:statements.toast.deleteOk"), severity: "success" });
    } catch {
      setSnack({ message: t("settings:statements.toast.deleteFail"), severity: "error" });
    } finally {
      setConfirmBusy(false);
      setConfirmOpen(false);
      deleteIdRef.current = null;
    }
  };

  const triggerAnalysis = async (id: string) => {
    try {
      await api.triggerStatementAnalysis(id);
      setSnack({ message: t("settings:statements.toast.analysisStarted"), severity: "info" });
      await refreshStatements();
    } catch {
      setSnack({ message: t("settings:statements.toast.analysisFail"), severity: "error" });
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

  const statusOptions = [
    { label: t("settings:statements.statuses.uploaded"), value: "uploaded" },
    { label: t("settings:statements.statuses.processing"), value: "processing" },
    { label: t("settings:statements.statuses.ready"), value: "ready" },
    { label: t("settings:statements.statuses.failed"), value: "failed" }
  ];

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
                  {t("settings:statements.header.settings")}
                </div>
                <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">
                  {t("settings:statements.header.title")}
                </h1>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="!py-1.5"
                  aria-label={t("settings:statements.aria.uploadTrigger")}
                >
                  {t("settings:statements.btn.upload")}
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
                {t("settings:statements.dnd.text")}{" "}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:no-underline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t("settings:statements.dnd.click")}
                </button>
                .
              </p>
              <p className="text-[12px] text-gray-500 mt-1">
                {t("settings:statements.dnd.hint")}
              </p>
            </div>

            {/* Queue */}
            {queue.length > 0 && (
              <div className="mt-4 border border-gray-200 bg-white rounded-lg">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("settings:statements.queue.title", { count: queue.length })}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="cancel" onClick={() => setQueue([])}>
                      {t("settings:statements.btn.clearQueue")}
                    </Button>
                    <Button onClick={uploadAll}>{t("settings:statements.btn.sendAll")}</Button>
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
                          label={t("settings:statements.row.accountOptional")}
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
                          buttonLabel={t("settings:statements.row.accountButton")}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                          onClick={() => uploadOne(row)}
                        >
                          {t("settings:statements.btn.send")}
                        </Button>
                        <Button
                          variant="cancel"
                          onClick={() => removeFromQueue(row.id)}
                        >
                          {t("settings:statements.btn.remove")}
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
                  label={t("settings:statements.filters.searchLabel")}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("settings:statements.filters.placeholder")}
                />
                <SelectDropdown
                  label={t("settings:statements.filters.status")}
                  items={statusOptions}
                  selected={
                    statusFilter
                      ? [{ label: statusOptions.find(s => s.value === statusFilter)?.label ?? "", value: statusFilter }]
                      : []
                  }
                  onChange={(items) => setStatusFilter(toStatus(items?.[0]?.value))}
                  getItemKey={(i) => i.value}
                  getItemLabel={(i) => i.label}
                  singleSelect
                  hideCheckboxes
                  buttonLabel={t("settings:statements.filters.statusPick")}
                />
                <SelectDropdown
                  label={t("settings:statements.filters.bank")}
                  items={bankItems}
                  selected={
                    bankFilter ? bankItems.filter((i) => i.value === bankFilter) : []
                  }
                  onChange={(items) => setBankFilter(items?.[0]?.value ?? "")}
                  getItemKey={(i) => i.value}
                  getItemLabel={(i) => i.label}
                  singleSelect
                  hideCheckboxes
                  buttonLabel={t("settings:statements.filters.bankPick")}
                />
                <div className="flex items-end gap-2">
                  <Button onClick={refreshStatements} className="!w-full">
                    {t("settings:statements.btn.applyFilters")}
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
                    {t("settings:statements.btn.clearFilters")}
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
                  {t("settings:statements.list.title", { count: statements.length })}
                </span>
              </div>

              {statements.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-500">
                  {t("settings:statements.list.empty")}
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
                        <p className="text-[12px] text-gray-600">{t("settings:statements.filters.bank")}</p>
                        <p className="text-[13px] text-gray-900">
                          {s.bank_account_label ?? "—"}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex items-center gap-2 justify-end">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] ${chipClass[s.status]}`}
                        >
                          {t(`settings:statements.meta.chip.${s.status}`)}
                        </span>

                        <Button
                          variant="outline"
                          className="!border-gray-200 !text-gray-700 hover:!bg-gray-50"
                          onClick={() => api.downloadStatement(s.id)}
                          title={t("settings:statements.actions.download")}
                        >
                          {t("settings:statements.actions.download")}
                        </Button>

                        <Button
                          variant="common"
                          onClick={() => triggerAnalysis(s.id)}
                          disabled={s.status === "processing"}
                          title={t("settings:statements.actions.analyze")}
                        >
                          {t("settings:statements.actions.analyze")}
                        </Button>

                        <Button
                          variant="cancel"
                          onClick={() => requestDelete(s.id)}
                          title={t("settings:statements.actions.delete")}
                        >
                          {t("settings:statements.actions.delete")}
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
          text={t("settings:statements.confirm.deleteText")}
          confirmLabel={t("settings:statements.confirm.confirmLabel")}
          cancelLabel={t("settings:statements.confirm.cancelLabel")}
          variant="danger"
          onCancel={() => {
            if (confirmBusy) return;
            setConfirmOpen(false);
          }}
          onConfirm={() => {
            if (confirmBusy) return;
            setConfirmBusy(true);
            doDelete().catch(() => {
              setSnack({ message: t("settings:statements.toast.deleteFail"), severity: "error" });
              setConfirmBusy(false);
              setConfirmOpen(false);
            });
          }}
          busy={confirmBusy}
        />
      </main>

      {/* Typed Snackbar (no Alert child) */}
      <Snackbar
        open={!!snack}
        onClose={() => setSnack(null)}
        autoHideDuration={5000}
        message={snack?.message}
        severity={snack?.severity ?? "info"}
        anchor={{ vertical: "bottom", horizontal: "center" }}
        pauseOnHover
        showCloseButton
      />
    </>
  );
};

export default Statements;
