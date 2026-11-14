import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import Badge from "@/shared/ui/Badge";
import SegmentedControl from "@/shared/ui/SegmentedControl";
import type { AiSetupAccount, AiSetupBankAccount, AiSetupBlueprint, AiSetupMessage, AiSetupPreviewResponse } from "@/models/settings/accountingAiSetup";

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
  const blueprint: AiSetupBlueprint | null = preview.blueprint;
  if (!blueprint) return null;

  const grouped = new Map<SectionKey, AiSetupAccount[]>();
  for (const account of blueprint.accounts) {
    const bucket = grouped.get(account.statement_section) || [];
    bucket.push(account);
    grouped.set(account.statement_section, bucket);
  }
  const bankLabel = (id: string) => banks.find(bank => bank.id === id)?.label || id;
  const accountLabel = (code?: string) => code || "—";

  return <div className="space-y-4">
    <Summary preview={preview} />
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

          {tab === "chart" ? sectionOrder.map(section => {
            const accounts = grouped.get(section);
            if (!accounts?.length) return null;
            return <details key={section} className="rounded-lg border border-gray-200 bg-white">
              <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-gray-700">{t(`guidedSetup.statementSections.${section}`)} ({accounts.length})</summary>
              <ul className="divide-y divide-gray-100 border-t border-gray-100">
                {accounts.map(account => <li key={account.code} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                  <span className="w-14 shrink-0 font-mono text-[11px] text-gray-500">{account.code}</span>
                  <span className={`min-w-0 flex-1 truncate ${account.account_type === "header" ? "font-medium text-gray-900" : "text-gray-700"}`}>{account.name}</span>
                  {account.is_bank_control ? <Badge tone="neutral" variant="outline">{t("guidedSetup.bankControl")}</Badge> : null}
                </li>)}
              </ul>
            </details>;
          }) : null}

          {tab === "rules" ? blueprint.category_rules.map(rule => <div key={`${rule.category_code}-${rule.book_code}`} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium text-gray-900">{rule.category_code}</span>
              <span className="text-gray-500">{rule.book_code}</span>
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
      <MessageList title={t("guidedSetup.assumptionsTitle")} messages={preview.assumptions} />
    </div>
    <p className="text-[11px] text-gray-400">{preview.provider}{preview.model ? ` · ${preview.model}` : ""}{preview.prompt_version ? ` · ${preview.prompt_version}` : ""}</p>
  </div>;
}
