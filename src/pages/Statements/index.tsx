/* --------------------------------------------------------------------------
 * File: src/pages/Statements.tsx
 * -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import PageSkeleton from "@/components/ui/Loaders/PageSkeleton";
import TopProgress from "@/components/ui/Loaders/TopProgress";
import Button from "@/components/ui/Button";
import Snackbar from "@/components/ui/Snackbar";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import ConfirmToast from "@/components/ui/ConfirmToast";
import Input from "src/components/ui/Input";

import { api } from "@/api/requests";
import { useAuthContext } from "@/hooks/useAuth";

import type { BankAccount } from "@/models/settings/banking";

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
  json_ready?: boolean; // backend provides this (optional in type)
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

/* ------------------------------ UI Limits --------------------------------- */
/**
 * Keep these aligned with backend:
 * - STATEMENT_UPLOAD_MAX_PDF_BYTES = 25MB
 * - STATEMENT_UPLOAD_MAX_IMAGE_BYTES = 10MB
 * - STATEMENT_PDF_MAX_PAGES = 10
 */
const LIMITS = {
  PDF_MAX_BYTES: 25 * 1024 * 1024,
  IMAGE_MAX_BYTES: 10 * 1024 * 1024,
  PDF_MAX_PAGES: 10
} as const;

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
  failed: "bg-rose-100 text-rose-800"
};

const isPDF = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
const isImage = (f: File) =>
  f.type === "image/png" ||
  f.type === "image/jpeg" ||
  f.name.toLowerCase().endsWith(".png") ||
  f.name.toLowerCase().endsWith(".jpg") ||
  f.name.toLowerCase().endsWith(".jpeg");
const isSupported = (f: File) => isPDF(f) || isImage(f);

const maxBytesForFile = (f: File) => (isPDF(f) ? LIMITS.PDF_MAX_BYTES : LIMITS.IMAGE_MAX_BYTES);
const isTooLarge = (f: File) => f.size > maxBytesForFile(f);

const toStatus = (v?: string): "" | StatementStatus =>
  v === "uploaded" || v === "processing" || v === "ready" || v === "failed" ? (v as StatementStatus) : "";

/**
 * Your API wraps errors like:
 * { error: { message, detail, fields, status, ... }, meta: { request_id } }
 *
 * This extracts a readable string from:
 * - { error: { fields: { file: ["..."] } } }
 * - { error: { detail: { file: ["..."] } } }
 * - { detail: "..." } (plain DRF)
 * - { file: ["..."] } (plain DRF serializer errors)
 */
const extractApiMessage = (data: unknown, depth = 0): string | null => {
  if (!data || depth > 4) return null;

  if (typeof data === "string") return data.trim() || null;

  if (Array.isArray(data)) {
    const s = data.find((x) => typeof x === "string" && x.trim());
    return typeof s === "string" ? s.trim() : null;
  }

  if (typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  // Envelope
  if (obj.error && typeof obj.error === "object") {
    return extractApiMessage(obj.error, depth + 1);
  }

  // Common message
  if (typeof obj.message === "string" && obj.message.trim()) return obj.message.trim();

  // Prefer structured field errors
  if (obj.fields) {
    const msg = extractApiMessage(obj.fields, depth + 1);
    if (msg) return msg;
  }
  if (obj.detail) {
    const msg = extractApiMessage(obj.detail, depth + 1);
    if (msg) return msg;
  }

  // Plain DRF fallback
  if (typeof obj.detail === "string" && obj.detail.trim()) return obj.detail.trim();

  // Serializer errors (prefer file)
  if (obj.file) {
    const msg = extractApiMessage(obj.file, depth + 1);
    if (msg) return msg;
  }

  // First nested string
  for (const v of Object.values(obj)) {
    const msg = extractApiMessage(v, depth + 1);
    if (msg) return msg;
  }

  return null;
};

const getHttpStatus = (err: unknown): number | null =>
  axios.isAxiosError(err) ? (err.response?.status ?? null) : null;

/**
 * Convert server “bytes” messages into dynamic, user-facing messages using:
 * - the actual file size the user selected (row.file.size)
 * - the configured limit (LIMITS.*)
 */
const normalizeUploadErrorMessage = (
  t: TFunction,
  row: UploadRow,
  err: unknown,
  serverMessage: string
): string => {
  const status = getHttpStatus(err);

  const lower = (serverMessage || "").toLowerCase();

  const isOversize =
    status === 413 ||
    /too\s+large/.test(lower) ||
    /max\s+allowed\s+is/.test(lower) ||
    /payload\s+too\s+large/.test(lower);

  if (isOversize) {
    const max = maxBytesForFile(row.file);
    if (isPDF(row.file)) {
      return t("toast.pdfTooLargeFriendly", {
        size: formatBytes(row.file.size),
        max: formatBytes(max)
      });
    }
    return t("toast.imageTooLargeFriendly", {
      size: formatBytes(row.file.size),
      max: formatBytes(max)
    });
  }

  if (/pdf\s+has\s+\d+\s+pages/.test(lower) || /max\s+allowed\s+is\s+\d+/.test(lower)) {
    return t("toast.pdfTooManyPagesFriendly", { max: LIMITS.PDF_MAX_PAGES });
  }

  return serverMessage;
};

const getApiErrorMessage = (t: TFunction, err: unknown, fallbackKey: string): string => {
  if (axios.isAxiosError(err)) {
    if (!err.response) return t("toast.networkError", { defaultValue: t(fallbackKey) });

    const extracted = extractApiMessage(err.response.data);
    if (extracted) return extracted;

    const status = err.response.status;
    if (status === 403) return t("toast.permissionDenied", { defaultValue: t(fallbackKey) });
    if (status === 404) return t("toast.notFound", { defaultValue: t(fallbackKey) });
    if (status === 429) return t("toast.rateLimited", { defaultValue: t(fallbackKey) });
    if (status === 413) return t("toast.payloadTooLarge", { defaultValue: t(fallbackKey) });
    if (status >= 500) return t("toast.serverError", { defaultValue: t(fallbackKey) });

    return t(fallbackKey);
  }

  if (err instanceof Error && err.message) return err.message;
  return t(fallbackKey);
};

/* ----------------------- In-memory guard for fetches ---------------------- */
let INFLIGHT_FETCH = false;

/* --------------------------------- Page ----------------------------------- */
const Statements: React.FC = () => {
  const { t, i18n } = useTranslation("statements");

  // Subscription (same verification pattern as SubscriptionMiddleware)
  const location = useLocation();
  const navigate = useNavigate();
  const { handleInitUser, isSuperUser, isSubscribed } = useAuthContext();
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await handleInitUser();
      } finally {
        setIsAuthLoading(false);
      }
    })();
  }, [handleInitUser]);

  const isAccessLocked = !isAuthLoading && !isSubscribed && !isSuperUser;

  useEffect(() => {
    document.title = t("title");
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  /* ------------------------------ Flags/State ------------------------------ */
  const [snack, setSnack] = useState<Snack>(null);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isBackgroundSync, setIsBackgroundSync] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // banks for selector
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const bankItems = useMemo(
    () =>
      banks.map((b) => ({
        label: `${b.institution} • ${b.branch ?? "-"} / ${b.account_number ?? "-"}`,
        value: b.id // external_id
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
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // keyboard
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ------------------------------ Fetching -------------------------------- */
  const refreshBanks = useCallback(async () => {
    try {
      const { data } = await api.getBanks();
      setBanks(data?.results ?? []);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(t, err, "toast.banksFetchError");
      setSnack({ message: msg, severity: "error" });
    }
  }, [t]);

  const refreshStatements = useCallback(
    async (opts: { background?: boolean } = {}) => {
      if (INFLIGHT_FETCH) return;
      INFLIGHT_FETCH = true;

      const setLoading = (v: boolean) => {
        if (opts.background) setIsBackgroundSync(v);
        else setIsInitialLoading(v);
      };

      setLoading(true);
      try {
        const { data } = await api.getStatements({
          q: q || undefined,
          status: statusFilter || undefined,
          bank: bankFilter || undefined
        });
        setStatements(data?.results ?? []);
      } catch (err: unknown) {
        const msg = getApiErrorMessage(t, err, "toast.listFetchError");
        setSnack({ message: msg, severity: "error" });
      } finally {
        setLoading(false);
        INFLIGHT_FETCH = false;
      }
    },
    [q, statusFilter, bankFilter, t]
  );

  // Initial fetch (skip completely if access is locked)
  useEffect(() => {
    if (isAuthLoading) return;

    if (isAccessLocked) {
      setIsInitialLoading(false);
      setIsBackgroundSync(false);
      return;
    }

    void Promise.all([refreshBanks(), refreshStatements()]);
  }, [isAuthLoading, isAccessLocked, refreshBanks, refreshStatements]);

  // Poll while there is any processing statement
  useEffect(() => {
    if (isAccessLocked) return;

    const hasProcessing = statements.some((s) => s.status === "processing");
    if (!hasProcessing) return;

    const timer = window.setInterval(() => {
      void refreshStatements({ background: true });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [statements, refreshStatements, isAccessLocked]);

  /* ------------------------------- Upload --------------------------------- */
  const buildTooLargeRowError = (file: File) => {
    const max = maxBytesForFile(file);
    if (isPDF(file)) {
      return t("toast.pdfTooLargeFriendly", { size: formatBytes(file.size), max: formatBytes(max) });
    }
    return t("toast.imageTooLargeFriendly", { size: formatBytes(file.size), max: formatBytes(max) });
  };

  const addFiles = (files: FileList | File[]) => {
    const rows: UploadRow[] = [];

    Array.from(files).forEach((file) => {
      if (!isSupported(file)) {
        setSnack({
          message: t("toast.nonPdfIgnored", { name: file.name }),
          severity: "warning"
        });
        return;
      }

      const id = `${file.name}_${file.size}_${file.lastModified}_${Math.random().toString(36).slice(2, 8)}`;

      // Client-side size gate (dynamic size + configured limit)
      if (isTooLarge(file)) {
        const msg = buildTooLargeRowError(file);
        rows.push({ id, file, progress: 0, bankAccount: null, error: msg });
        setSnack({ message: msg, severity: "error" });
        return;
      }

      rows.push({ id, file, progress: 0, bankAccount: null });
    });

    if (rows.length) setQueue((prev) => [...rows, ...prev]);
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
  const onDragLeave = () => dndRef.current?.classList.remove("ring-2", "ring-gray-300");

  const removeFromQueue = (id: string) => setQueue((prev) => prev.filter((r) => r.id !== id));

  const uploadOne = async (row: UploadRow) => {
    // If already flagged invalid (e.g. too large), don’t even hit the API.
    if (row.error) {
      setSnack({ message: row.error, severity: "error" });
      return;
    }

    // Extra safety (in case rows were created elsewhere)
    if (isTooLarge(row.file)) {
      const msg = buildTooLargeRowError(row.file);
      setQueue((prev) => prev.map((r) => (r.id === row.id ? { ...r, error: msg } : r)));
      setSnack({ message: msg, severity: "error" });
      return;
    }

    try {
      const form = new FormData();
      form.append("file", row.file);
      if (row.bankAccount?.value) form.append("bank_account_id", row.bankAccount.value);

      setIsSubmitting(true);
      await api.uploadStatement(form, (p) => {
        setQueue((prev) => prev.map((r) => (r.id === row.id ? { ...r, progress: p } : r)));
      });

      removeFromQueue(row.id);
      await refreshStatements({ background: true });
      setSnack({ message: t("toast.uploadOk"), severity: "success" });
    } catch (err: unknown) {
      const raw = getApiErrorMessage(t, err, "toast.uploadFail");
      const msg = normalizeUploadErrorMessage(t, row, err, raw);

      setQueue((prev) => prev.map((r) => (r.id === row.id ? { ...r, error: msg } : r)));
      setSnack({ message: msg, severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadAll = async () => {
    for (const row of queue) if (!row.error) await uploadOne(row);
  };

  /* ----------------------------- Actions list ------------------------------ */
  const requestDelete = (id: string) => {
    setDeleteTargetId(id);
    setConfirmOpen(true);
  };

  const doDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await api.deleteStatement(deleteTargetId);
      await refreshStatements({ background: true });
      setSnack({ message: t("toast.deleteOk"), severity: "success" });
    } catch (err: unknown) {
      const msg = getApiErrorMessage(t, err, "toast.deleteFail");
      setSnack({ message: msg, severity: "error" });
    } finally {
      setConfirmBusy(false);
      setConfirmOpen(false);
      setDeleteTargetId(null);
    }
  };

  const triggerAnalysis = async (id: string) => {
    try {
      await api.triggerStatementAnalysis(id);
      setSnack({ message: t("toast.analysisStarted"), severity: "info" });
      await refreshStatements({ background: true });
    } catch (err: unknown) {
      const msg = getApiErrorMessage(t, err, "toast.analysisFail");
      setSnack({ message: msg, severity: "error" });
    }
  };

  const downloadJson = async (id: string) => {
    try {
      await api.downloadStatementJson(id);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(t, err, "toast.downloadJsonFail");
      setSnack({ message: msg, severity: "error" });
    }
  };

  // Keyboard: ⌘/Ctrl+U focuses hidden file input; ⌘/Ctrl+F focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isAccessLocked) return;

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
  }, [isAccessLocked]);

  /* ------------------------------ Loading UI ------------------------------- */
  if (isAuthLoading) return <TopProgress active variant="center" />;

  if (isInitialLoading && !isAccessLocked) {
    return (
      <>
        <TopProgress active variant="top" topOffset={64} />
        <PageSkeleton rows={6} />
      </>
    );
  }

  const headerBadge = isBackgroundSync ? (
    <span
      aria-live="polite"
      className="text-[11px] px-2 py-0.5 rounded-full border border-gray-200 bg-white/70 backdrop-blur-sm"
    >
      {t("badge.syncing")}
    </span>
  ) : null;

  const statusOptions = [
    { label: t("statuses.uploaded"), value: "uploaded" },
    { label: t("statuses.processing"), value: "processing" },
    { label: t("statuses.ready"), value: "ready" },
    { label: t("statuses.failed"), value: "failed" }
  ];

  const globalBusy = isSubmitting || isBackgroundSync || confirmBusy;

  /* --------------------------------- UI ----------------------------------- */
  return (
    <>
      <TopProgress active={isBackgroundSync && !isAccessLocked} variant="top" topOffset={64} />

      <main className="relative min-h-[calc(100vh-64px)] bg-transparent text-gray-900 px-6 py-8">
        {/* Disable interactions under paywall */}
        <div className={isAccessLocked ? "pointer-events-none select-none" : ""} aria-hidden={isAccessLocked || undefined}>
          <div className="max-w-5xl mx-auto">
            <header className="bg-white border border-gray-200 rounded-lg">
              <div className="px-5 py-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-md border border-gray-200 bg-gray-50 grid place-items-center text-[11px] font-semibold text-gray-700">
                  EX
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-gray-600">{t("header.settings")}</div>
                    <h1 className="text-[16px] font-semibold text-gray-900 leading-snug">{t("header.title")}</h1>
                  </div>
                  {headerBadge}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="!py-1.5"
                    aria-label={t("aria.uploadTrigger")}
                    disabled={globalBusy}
                  >
                    {t("btn.upload")}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    multiple
                    className="hidden"
                    onChange={onInputChange}
                  />
                </div>
              </div>
            </header>

            <section className="mt-6">
              <div
                ref={dndRef}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className="bg-white border border-dashed border-gray-300 rounded-lg p-6 text-center"
                aria-busy={globalBusy || undefined}
              >
                <p className="text-[13px] text-gray-700">
                  {t("dnd.text")}{" "}
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:no-underline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {t("dnd.click")}
                  </button>
                  .
                </p>
                <p className="text-[12px] text-gray-500 mt-1">{t("dnd.hint")}</p>
              </div>

              {queue.length > 0 && (
                <div className="mt-4 border border-gray-200 bg-white rounded-lg">
                  <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <span className="text-[11px] uppercase tracking-wide text-gray-700">
                      {t("queue.title", { count: queue.length })}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="cancel" onClick={() => setQueue([])} disabled={globalBusy}>
                        {t("btn.clearQueue")}
                      </Button>
                      <Button onClick={uploadAll} disabled={globalBusy}>
                        {t("btn.sendAll")}
                      </Button>
                    </div>
                  </div>

                  <ul className="divide-y divide-gray-200">
                    {queue.map((row) => (
                      <li
                        key={row.id}
                        className={`px-4 py-3 flex items-end gap-3 ${globalBusy ? "opacity-70 pointer-events-none" : ""}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-gray-900 truncate">{row.file.name}</p>
                          <p className="text-[12px] text-gray-600">{formatBytes(row.file.size)}</p>

                          <div className="mt-2 h-2 bg-gray-100 rounded" aria-label={t("aria.progress")}>
                            <div
                              className="h-2 bg-gray-300 rounded"
                              style={{ width: `${row.progress}%` }}
                              aria-valuenow={row.progress}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              role="progressbar"
                            />
                          </div>

                          {row.error && <p className="mt-2 text-[12px] text-rose-700">{row.error}</p>}
                        </div>

                        <div className="w-72">
                          <SelectDropdown
                            label={t("row.accountOptional")}
                            items={bankItems}
                            selected={row.bankAccount ? [row.bankAccount] : []}
                            onChange={(items) =>
                              setQueue((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, bankAccount: items?.[0] ?? null } : r))
                              )
                            }
                            getItemKey={(i) => i.value}
                            getItemLabel={(i) => i.label}
                            singleSelect
                            hideCheckboxes
                            buttonLabel={t("row.accountButton")}
                            disabled={globalBusy || !!row.error}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => uploadOne(row)} disabled={globalBusy || !!row.error}>
                            {t("btn.send")}
                          </Button>
                          <Button variant="cancel" onClick={() => removeFromQueue(row.id)} disabled={globalBusy}>
                            {t("btn.remove")}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section className="mt-6">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <Input
                    kind="text"
                    id="statements-q"
                    label={t("filters.searchLabel")}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={t("filters.placeholder")}
                    disabled={globalBusy}
                  />
                  <SelectDropdown
                    label={t("filters.status")}
                    items={statusOptions}
                    selected={
                      statusFilter
                        ? [{ label: statusOptions.find((s) => s.value === statusFilter)?.label ?? "", value: statusFilter }]
                        : []
                    }
                    onChange={(items) => setStatusFilter(toStatus(items?.[0]?.value))}
                    getItemKey={(i) => i.value}
                    getItemLabel={(i) => i.label}
                    singleSelect
                    hideCheckboxes
                    buttonLabel={t("filters.statusPick")}
                  />
                  <SelectDropdown
                    label={t("filters.bank")}
                    items={bankItems}
                    selected={bankFilter ? bankItems.filter((i) => i.value === bankFilter) : []}
                    onChange={(items) => setBankFilter(items?.[0]?.value ?? "")}
                    getItemKey={(i) => i.value}
                    getItemLabel={(i) => i.label}
                    singleSelect
                    hideCheckboxes
                    buttonLabel={t("filters.bankPick")}
                  />
                  <div className="flex items-end gap-2">
                    <Button onClick={() => refreshStatements({ background: true })} className="!w-full" disabled={globalBusy}>
                      {t("btn.applyFilters")}
                    </Button>
                    <Button
                      variant="cancel"
                      onClick={() => {
                        setQ("");
                        setStatusFilter("");
                        setBankFilter("");
                        void refreshStatements({ background: true });
                      }}
                      disabled={globalBusy}
                    >
                      {t("btn.clearFilters")}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6">
              <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
                  <span className="text-[11px] uppercase tracking-wide text-gray-700">
                    {t("list.title", { count: statements.length })}
                  </span>
                </div>

                {statements.length === 0 ? (
                  <p className="p-4 text-center text-sm text-gray-500">{t("list.empty")}</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {statements.map((s) => {
                      const rowBusy = globalBusy || deleteTargetId === s.id || s.status === "processing";
                      const canDownloadJson = s.status === "ready" && (s.json_ready ?? true);

                      return (
                        <li
                          key={s.id}
                          className={`px-4 py-3 grid grid-cols-12 gap-3 ${rowBusy ? "opacity-70 pointer-events-none" : ""}`}
                        >
                          <div className="col-span-4 min-w-0">
                            <p className="text-[13px] font-medium text-gray-900 truncate">{s.original_filename}</p>
                            <p className="text-[12px] text-gray-600">
                              {formatBytes(s.size_bytes)} · {s.pages ?? "-"} pág · {new Date(s.created_at).toLocaleString()}
                            </p>
                          </div>

                          <div className="col-span-3">
                            <p className="text-[12px] text-gray-600">{t("filters.bank")}</p>
                            <p className="text-[13px] text-gray-900">{s.bank_account_label ?? "—"}</p>
                          </div>

                          <div className="col-span-5 flex items-center gap-2 justify-end">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[12px] ${chipClass[s.status]}`}>
                              {t(`meta.chip.${s.status}`)}
                            </span>

                            <Button
                              variant="outline"
                              onClick={() => api.downloadStatement(s.id)}
                              title={t("actions.download")}
                              disabled={globalBusy}
                            >
                              {t("actions.download")}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => downloadJson(s.id)}
                              title={t("actions.downloadJson")}
                              disabled={!canDownloadJson || globalBusy}
                            >
                              {t("actions.downloadJson")}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => triggerAnalysis(s.id)}
                              disabled={s.status === "processing" || globalBusy}
                              title={t("actions.analyze")}
                            >
                              {t("actions.analyze")}
                            </Button>

                            <Button
                              variant="cancel"
                              onClick={() => requestDelete(s.id)}
                              title={t("actions.delete")}
                              disabled={globalBusy}
                            >
                              {t("actions.delete")}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <ConfirmToast
            open={confirmOpen}
            text={t("confirm.deleteText")}
            confirmLabel={t("confirm.confirmLabel")}
            cancelLabel={t("confirm.cancelLabel")}
            variant="danger"
            onCancel={() => {
              if (confirmBusy) return;
              setConfirmOpen(false);
              setDeleteTargetId(null);
            }}
            onConfirm={() => {
              if (confirmBusy) return;
              setConfirmBusy(true);
              doDelete().catch(() => {
                setSnack({ message: t("toast.deleteFail"), severity: "error" });
                setConfirmBusy(false);
                setConfirmOpen(false);
                setDeleteTargetId(null);
              });
            }}
            busy={confirmBusy}
          />
        </div>

        {/* Paywall overlay: bottom-up blur + message */}
        {isAccessLocked && (
          <div className="absolute inset-0 z-50 pointer-events-auto">
            <div className="absolute inset-0 bg-white/10" />
            <div
              className="absolute inset-0 backdrop-blur-md bg-white/20
                         [mask-image:linear-gradient(to_top,rgba(0,0,0,1)_0%,rgba(0,0,0,0)_72%)]
                         [-webkit-mask-image:linear-gradient(to_top,rgba(0,0,0,1)_0%,rgba(0,0,0,0)_72%)]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white/85 via-white/45 to-transparent" />

            <div className="absolute inset-0 flex items-end justify-center px-6 pb-10">
              <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white/90 backdrop-blur-md shadow-lg p-6">
                <div className="text-[11px] uppercase tracking-wide text-gray-500">{t("paywall.badge")}</div>
                <h2 className="mt-1 text-[16px] font-semibold text-gray-900">{t("paywall.title")}</h2>
                <p className="mt-2 text-[13px] text-gray-700">{t("paywall.body")}</p>

                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() =>
                      navigate("/settings/subscription-management", {
                        replace: true,
                        state: { from: location.pathname }
                      })
                    }
                  >
                    {t("paywall.cta")}
                  </Button>
                  <Button variant="outline" onClick={() => navigate(-1)}>
                    {t("paywall.back")}
                  </Button>
                </div>

                <p className="mt-3 text-[12px] text-gray-500">{t("paywall.note")}</p>
              </div>
            </div>
          </div>
        )}
      </main>

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
