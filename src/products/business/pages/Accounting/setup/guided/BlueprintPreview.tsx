import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, CheckCircle2, Copy, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import Badge from "@/shared/ui/Badge";
import Button from "@/shared/ui/Button";
import SegmentedControl from "@/shared/ui/SegmentedControl";
import type { AiSetupAccount, AiSetupBankAccount, AiSetupBlueprint, AiSetupMessage, AiSetupPreviewResponse } from "@/models/settings/accountingAiSetup";
import { buildChartManualText, downloadChartCsv } from "./chartExport";

type PreviewTab = "books" | "chart" | "rules" | "banks";
type SectionKey = AiSetupAccount["statement_section"];

const sectionOrder: SectionKey[] = ["asset", "liability", "equity", "income", "expense", "off_balance", "statistical"];

function MessageList({ title, messages }: { title: string; messages: AiSetupMessage[] }) {
  if (!messages.length) return null;
  return <details className="rounded-lg border border-gray-200 bg-white">
    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-gray-700">{title} ({messages.length})</summary>
    <ul className="space-y-1.5 border-t border-gray-100 px-3 py-2.5 text-xs leading-5 text-gray-600">
      {messages.map((message, index) => <li key={`${message.code}-${index}`}>{message.message}</li>)}
    </ul>
  </details>;
}

function Summary({ preview }: { preview: AiSetupPreviewResponse }) {
  const { t } = useTranslation("accountingSettings");
  const items = [
    ["books", preview.summary.books || 0],
    ["accounts", preview.summary.accounts || 0],
    ["categories", preview.summary.categories || 0],
    ["rules", preview.summary.category_rules || 0],
    ["banks", preview.summary.bank_mappings || 0],
  ] as const;
  return <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
    {items.map(([key, value]) => <div key={key} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
      <p className="text-[11px] text-gray-500">{t(`guidedSetup.summary.${key}`)}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-gray-900">{value}</p>
    </div>)}
  </div>;
}

export default function BlueprintPreview({ preview, banks }: { preview: AiSetupPreviewResponse; banks: AiSetupBankAccount[] }) {
  const { t } = useTranslation("accountingSettings");
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<PreviewTab>("books");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const blueprint: AiSetupBlueprint | null = preview.blueprint;
  if (!blueprint) return null;
  const copyChart = async () => {
    try {
      await navigator.clipboard.writeText(buildChartManualText(blueprint.accounts));
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError(t("guidedSetup.copyError", "Could not copy the chart rows."));
    }
  };

  const grouped = new Map<SectionKey, AiSetupAccount[]>();
  for (const account of blueprint.accounts) {
    const bucket = grouped.get(account.statement_section) || [];
    bucket.push(account);
    grouped.set(account.statement_section, bucket);
  }
  const bankLabel = (id: string) => banks.find(bank => bank.id === id)?.label || id;
  const accountLabel = (code?: string) => code || "—";
  const categoryLabel = (code: string) =>
    preview.category_labels?.[code]
    || blueprint.categories.find(category => category.code === code)?.name
    || code;
  const bookLabel = (code: string) =>
    blueprint.books.find(book => book.code === code)?.name || code;

  return <div className="space-y-4">
    <Summary preview={preview} />
    <p className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs leading-5 text-emerald-900">
      <CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{t("guidedSetup.structureValidated")}</span>
    </p>
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-gray-700">{t("guidedSetup.exportTitle", "Reuse this chart")}</p>
        <p className="mt-0.5 text-[11px] leading-5 text-gray-500">{t("guidedSetup.exportHelp", "Download the accounts or copy them into Chart setup -> Paste rows manually.")}</p>
        {copyError ? <p role="alert" className="mt-1 text-[11px] text-rose-700">{copyError}</p> : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => downloadChartCsv(blueprint.accounts)}>
          <Download size={14} aria-hidden="true" />{t("guidedSetup.downloadChartCsv", "Download CSV")}
        </Button>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void copyChart()}>
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? t("guidedSetup.copied", "Copied") : t("guidedSetup.copyChart", "Copy rows")}
        </Button>
      </div>
    </div>
    {preview.blockers.length ? <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
      <p className="font-medium">{t("guidedSetup.blockersTitle")}</p>
      <p className="mt-0.5">{preview.blockers.map(item => item.message).join(" ")}</p>
    </div> : null}

    <SegmentedControl<PreviewTab>
      id="guided-preview-tabs"
      tabs
      stretch
      label={t("guidedSetup.previewTabs")}
      value={tab}
      onChange={setTab}
      items={[
        { value: "books", label: t("guidedSetup.previewBooks"), panelId: "guided-preview-panel" },
        { value: "chart", label: t("guidedSetup.previewChart"), panelId: "guided-preview-panel" },
        { value: "rules", label: t("guidedSetup.previewRules"), panelId: "guided-preview-panel" },
        { value: "banks", label: t("guidedSetup.previewBanks"), panelId: "guided-preview-panel" },
      ]}
    />

    <div id="guided-preview-panel" role="tabpanel" aria-labelledby={`guided-preview-tabs-${tab}`} className="min-h-40">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: reduced ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -3 }} transition={{ duration: reduced ? 0 : 0.15, ease: "easeOut" }} className="space-y-2">
          {tab === "books" ? blueprint.books.map(book => <div key={book.code} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-gray-900">{book.name}</p>
              <p className="mt-0.5 text-xs text-gray-500">{book.code} · {t(`guidedSetup.bookBasis.${book.basis}`)} · {book.currency_code}</p>
            </div>
            {book.is_primary ? <Badge tone="success" variant="outline">{t("guidedSetup.primaryBook")}</Badge> : null}
          </div>) : null}

          {tab === "chart" ? <>
            {sectionOrder.map(section => {
            const accounts = grouped.get(section);
            if (!accounts?.length) return null;
            const ordered = [...accounts].sort((left, right) =>
              String(left.sort_key || left.path || left.code).localeCompare(String(right.sort_key || right.path || right.code))
            );
            return <details key={section} className="rounded-lg border border-gray-200 bg-white">
              <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-gray-700">{t(`guidedSetup.statementSections.${section}`)} ({ordered.length})</summary>
              <ul className="divide-y divide-gray-100 border-t border-gray-100">
                {ordered.map(account => <li key={account.code} title={account.path} style={{ paddingLeft: `${12 + Math.min(account.depth || 0, 4) * 12}px` }} className="flex items-start gap-3 py-1.5 pr-3 text-xs">
                  <span className="w-14 shrink-0 pt-0.5 font-mono text-[11px] text-gray-500">{account.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${account.account_type === "header" ? "font-medium text-gray-900" : "text-gray-700"}`}>{account.name}</span>
                    {(account.description || account.report_group || account.report_subgroup) ? <span className="mt-0.5 block truncate text-[10px] text-gray-500">{[account.description, [account.report_group, account.report_subgroup].filter(Boolean).join(" / ")].filter(Boolean).join(" · ")}</span> : null}
                  </span>
                  {account.is_bank_control ? <Badge tone="neutral" variant="outline">{t("guidedSetup.bankControl")}</Badge> : null}
                </li>)}
              </ul>
            </details>;
            })}
          </> : null}

          {tab === "rules" ? blueprint.category_rules.map(rule => <div key={`${rule.category_code}-${rule.book_code}`} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-gray-900">{categoryLabel(rule.category_code)}</span>
              <span className="text-gray-500">{bookLabel(rule.book_code)}</span>
            </div>
            <p className="mt-1 text-gray-600">{t("guidedSetup.debitAccount")}: {accountLabel(rule.settlement_debit_account_code)} · {t("guidedSetup.creditAccount")}: {accountLabel(rule.settlement_credit_account_code)}</p>
          </div>) : null}

          {tab === "banks" ? (blueprint.bank_mappings.length ? blueprint.bank_mappings.map(mapping => <div key={`${mapping.bank_account_id}-${mapping.book_code}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs">
            <span className="min-w-0 truncate font-medium text-gray-900">{bankLabel(mapping.bank_account_id)}</span>
            <span className="text-gray-500">{mapping.account_code} · {mapping.book_code}</span>
          </div>) : <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-xs text-gray-500">{t("guidedSetup.noBanks")}</p>) : null}
        </motion.div>
      </AnimatePresence>
    </div>

    <div className="flex flex-wrap gap-2">
      <MessageList title={t("guidedSetup.warningsTitle")} messages={preview.warnings} />
    </div>
  </div>;
}
