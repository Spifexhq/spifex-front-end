import { useAccountingDraft } from "../setup/useAccountingSetup";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Building2,
  Check,
  CircleAlert,
  CircleCheck,
  ClipboardPaste,
  Copy,
  FileUp,
  ListTree,
} from "lucide-react";

import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import Snackbar from "@/shared/ui/Snackbar";
import Textarea from "@/shared/ui/Input/Textarea";

import { api } from "@/core/api/requests";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useAuthContext } from "@/hooks/useAuth";
import { normalizeManualText, validateManualText, type ManualIssue } from "./manualImport";

type Snack =
  | {
      message: React.ReactNode;
      severity: "success" | "error" | "warning" | "info";
    }
  | null;

type SetupMode = "csv" | "manual" | "standard" | null;

type Props = {
  compact: boolean;
  languageCode?: string | null;
  embedded?: boolean;
  onSuccess?: () => void | Promise<void>;
  onCancel?: () => void;
  successRedirectTo?: string | null;
};

const BASE_STRUCTURE = "code;name;parent_code;account_type;statement_section;normal_balance;is_bank_control";

const PASTE_EXAMPLE = [
  BASE_STRUCTURE,
  "1000;Assets;;header;asset;debit;no",
  "1010;Operating bank;1000;posting;asset;debit;yes",
  "1100;Accounts receivable;1000;posting;asset;debit;no",
  "2000;Liabilities;;header;liability;credit;no",
  "2100;Accounts payable;2000;posting;liability;credit;no",
  "4000;Sales;;posting;income;credit;no",
  "5000;General expenses;;posting;expense;debit;no",
].join("\n");

const METHODS: Array<{ value: Exclude<SetupMode, null>; titleKey: string; descriptionKey: string; Icon: typeof Building2 }> = [
  { value: "standard", titleKey: "standardTitle", descriptionKey: "standardDescription", Icon: Building2 },
  { value: "csv", titleKey: "uploadTitle", descriptionKey: "uploadDescription", Icon: FileUp },
  { value: "manual", titleKey: "manualTitle", descriptionKey: "manualDescription", Icon: ClipboardPaste },
];

const ChartImport: React.FC<Props> = ({
  compact,
  embedded = false,
  onSuccess,
  onCancel,
  successRedirectTo = null,
}) => {
  const navigate = useNavigate();
  const { i18n } = useTranslation("ledgerAccounts");
  const language = i18n.resolvedLanguage || i18n.language || "en";
  const t = React.useCallback(
    (key: string, defaultValue: string, options?: Record<string, unknown>) =>
      String(
        i18n.t(key, {
          lng: language,
          ns: "ledgerAccounts",
          defaultValue,
          ...options,
        })
      ),
    [i18n, language]
  );

  const { isOwner, permissions } = useAuthContext();
  const canAddLedgerAccounts = useMemo(
    () => isOwner || permissions.includes("add_ledger_account"),
    [isOwner, permissions]
  );

  const [setupMode, setSetupMode] = useAccountingDraft<SetupMode>("chart-import-method", "standard");
  const [csvFile, setCsvFile] = useAccountingDraft<File | null>("chart-import-file", null);
  const [textBlock, setTextBlock] = useAccountingDraft("chart-import-text", "");
  const [snack, setSnack] = useState<Snack>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const inFlight = useRef(false);

  const validation = useMemo(() => validateManualText(textBlock), [textBlock]);
  const manualBlocked = setupMode === "manual" && textBlock.trim().length > 0 && !validation.valid;

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyStructure = async () => {
    try {
      await navigator.clipboard.writeText(BASE_STRUCTURE);
      setCopied(true);
    } catch {
      setSnack({ message: t("setup.copyError", "Could not copy the base structure."), severity: "error" });
    }
  };

  const issueText = (issue: ManualIssue) => t(`setup.issue.${issue.code}`, issue.code, issue.params);

  const submit = async () => {
    if (!canAddLedgerAccounts) {
      setSnack({
        message: t("setup.permissionError", "You do not have permission to manage ledger accounts."),
        severity: "error",
      });
      return;
    }

    try {
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(true);

      if (setupMode === "csv") {
        if (!csvFile) {
          throw new Error(t("setup.selectFileError", "Select a CSV/XLSX file."));
        }

        const formData = new FormData();
        formData.append("mode", "csv");
        formData.append("file", csvFile);
        await api.importLedgerAccounts(formData);
      } else if (setupMode === "manual") {
        if (!validation.rowCount) {
          throw new Error(t("setup.manualError", "Enter account rows first."));
        }
        if (!validation.valid) {
          throw new Error(t("setup.manualFixErrors", "Fix the highlighted issues before configuring."));
        }

        const formData = new FormData();
        formData.append("mode", "manual");
        formData.append("manual_text", normalizeManualText(textBlock));
        await api.importLedgerAccounts(formData);
      } else if (setupMode === "standard") {
        await api.importStandardLedgerAccounts("organizational");
      } else {
        throw new Error(t("setup.chooseModeError", "Choose a setup mode."));
      }

      setTextBlock(""); setCsvFile(null);
      await onSuccess?.();
      setSnack({
        message: t("setup.success", "Ledger accounts configured."),
        severity: "success",
      });

      if (successRedirectTo) {
        navigate(successRedirectTo, { replace: true });
      }
    } catch (error) {
      setSnack({
        message: apiErrorMessage(error, t("setup.genericError", "Could not configure ledger accounts.")),
        severity: "error",
      });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const methodCards = (
    <div role="radiogroup" aria-label={t("setup.setupMethod", "Setup method")} className={embedded ? "grid gap-2 sm:grid-cols-3" : "grid gap-3 lg:grid-cols-3"}>
      {METHODS.map(({ value, titleKey, descriptionKey, Icon }) => {
        const active = setupMode === value;
        return <button
          key={value}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => setSetupMode(value)}
          className={`group flex min-h-20 items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-gray-400 ${active ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"}`}
        >
          <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md border ${active ? "border-gray-300 bg-white text-gray-800" : "border-gray-200 bg-gray-50 text-gray-500 group-hover:text-gray-700"}`}><Icon size={16} aria-hidden="true" /></span>
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-gray-900">{t(`setup.${titleKey}`, "")}</span>
            <span className="mt-0.5 block text-[11px] leading-5 text-gray-500">{t(`setup.${descriptionKey}`, "")}</span>
          </span>
        </button>;
      })}
    </div>
  );

  const panel = <div className="rounded-lg border border-gray-200 bg-white p-4">
    {setupMode === "standard" ? <div className="space-y-4">
      <div className="flex items-start gap-3 text-xs leading-6 text-gray-600">
        <Building2 size={17} className="mt-0.5 shrink-0 text-gray-400" aria-hidden="true" />
        <p>{t("setup.businessTemplateDescription", "The business starter template creates a practical, business-ready chart of accounts. You can refine every account later.")}</p>
      </div>
    </div> : null}

    {setupMode === "csv" ? <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center transition-colors hover:border-gray-400 hover:bg-gray-100">
        <FileUp size={20} className="text-gray-400" aria-hidden="true" />
        <span className="text-[13px] font-medium text-gray-700">{csvFile?.name || t("setup.chooseFile", "Choose a CSV or XLSX file")}</span>
        <span className="text-[11px] text-gray-500">{t("setup.fileHelp", "Use the template headers, or download one below and fill it in.")}</span>
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
          className="sr-only"
        />
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => void api.downloadLedgerCsvTemplate()}>
          {t("setup.downloadCsv", "Download CSV template")}
        </Button>
        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => void api.downloadLedgerXlsxTemplate()}>
          {t("setup.downloadXlsx", "Download XLSX template")}
        </Button>
      </div>
    </div> : null}

    {setupMode === "manual" ? <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-gray-700">{t("setup.manualLabel", "Rows")}</span>
          <span className="text-[11px] text-gray-500">{t("setup.manualHelp", "One row per account. Commas or semicolons are accepted.")}</span>
        </div>
        <Textarea
          className="mt-1.5 min-h-[220px] font-mono text-[12px]"
          value={textBlock}
          onChange={(event) => setTextBlock(event.target.value)}
          placeholder={PASTE_EXAMPLE}
          spellCheck={false}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-700">{t("setup.baseStructureTitle", "Base structure")}</p>
            <p className="text-[11px] leading-5 text-gray-500">{t("setup.baseStructureHelp", "Copy this header and add one row per account.")}</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void copyStructure()} aria-label={t("setup.copyStructure", "Copy base structure")}>
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
            <span className="hidden sm:inline">{copied ? t("setup.copied", "Copied") : t("setup.copyStructure", "Copy structure")}</span>
          </Button>
        </div>
        <pre className="overflow-x-auto px-3 py-2 font-mono text-[11px] leading-5 text-gray-700">{BASE_STRUCTURE}</pre>
      </div>

      <div role="status" aria-live="polite" className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs font-semibold text-gray-700"><ListTree size={14} className="text-gray-400" aria-hidden="true"/>{t("setup.validatorTitle", "Paste inspector")}</p>
          {validation.rowCount > 0 ? <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
            <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5">{t("setup.validatorRows", "{{count}} rows", { count: validation.rowCount })}</span>
            <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5">{t("setup.validatorColumns", "{{count}} columns", { count: validation.columnCount })}</span>
          </div> : null}
        </div>

        {validation.rowCount === 0 ? <p className="mt-2 text-[11px] leading-5 text-gray-500">{t("setup.validatorHint", "Paste rows to check them before configuring.")}</p> : <>
          {validation.headers.length ? <p className="mt-2 break-words font-mono text-[11px] leading-5 text-gray-500">{t("setup.validatorHeaders", "Detected columns: {{columns}}", { columns: validation.headers.join(", ") })}</p> : null}
          {validation.valid ? <p className="mt-2 flex items-center gap-2 text-[11px] font-medium text-emerald-700"><CircleCheck size={14} aria-hidden="true"/>{t("setup.validatorClean", "No issues found. Ready to configure.")}</p> : null}
          {validation.errors.length ? <ul className="mt-2 space-y-1">{validation.errors.slice(0, 8).map((issue, index) => <li key={`${issue.code}-${issue.line ?? "global"}-${index}`} className="flex items-start gap-2 text-[11px] leading-5 text-red-700"><CircleAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true"/><span>{issue.line ? `${t("setup.validatorLine", "Line {{line}}:", { line: issue.line })} ` : ""}{issueText(issue)}</span></li>)}</ul> : null}
          {validation.errors.length > 8 ? <p className="mt-1 text-[11px] text-red-700">{t("setup.validatorMore", "{{count}} more issues are hidden.", { count: validation.errors.length - 8 })}</p> : null}
          {validation.warnings.length ? <ul className="mt-2 space-y-1">{validation.warnings.slice(0, 4).map((issue, index) => <li key={`${issue.code}-${issue.line ?? "global"}-${index}`} className="flex items-start gap-2 text-[11px] leading-5 text-amber-700"><CircleAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true"/><span>{issue.line ? `${t("setup.validatorLine", "Line {{line}}:", { line: issue.line })} ` : ""}{issueText(issue)}</span></li>)}</ul> : null}
        </>}
      </div>
    </div> : null}

    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
      <p className="text-[11px] leading-5 text-gray-500">{compact ? t("setup.descriptionCompact", "Compact cashflow view is enabled.") : t("setup.descriptionOrganizational", "Start with a practical business-ready chart of accounts and then refine it for your organization.")}</p>
      <div className="flex items-center gap-2">
        {onCancel ? <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>{t("setup.cancel", "Cancel")}</Button> : null}
        <Button type="button" onClick={() => void submit()} disabled={busy || manualBlocked} isLoading={busy}>
          {busy ? t("setup.submitting", "Configuring...") : t("setup.submit", "Configure ledger")}
        </Button>
      </div>
    </div>
  </div>;

  const content = <>
    <Card as="section" radius="xl" tone="slate" padding="default" className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">{t("setup.panelTitle", "Chart setup")}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-gray-500">{t("setup.panelDescription", "Choose a starting point. You can edit, add or remove accounts afterwards.")}</p>
        </div>
      </div>
      {methodCards}
      {panel}
    </Card>

    <Snackbar
      notificationKey={snack}
      open={!!snack}
      onClose={() => setSnack(null)}
      autoHideDuration={5000}
      message={snack?.message}
      severity={snack?.severity}
      anchor={{ vertical: "bottom", horizontal: "center" }}
      pauseOnHover
      showCloseButton
    />
  </>;

  if (embedded) return <>{content}</>;

  return (
    <main className="min-w-0">
      <div className="mx-auto max-w-6xl space-y-5">{content}</div>
    </main>
  );
};

export default ChartImport;
