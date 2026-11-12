import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { api } from "@/core/api/requests";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import Checkbox from "@/shared/ui/Checkbox";
import Input from "@/shared/ui/Input";
import Textarea from "@/shared/ui/Input/Textarea";
import { Select } from "@/shared/ui/Select";
import { useAccountingSetup } from "./useAccountingSetup";
import type { LedgerGuideAccount, LedgerGuideKnowledge, LedgerGuideLanguage, LedgerGuideResponse } from "@/models/settings/ledgerAccounts";

type AnswerState = {
  sells_inventory: boolean;
  has_employees: boolean;
  vat_registered: boolean;
  notes: string;
};

const steps = ["language", "business", "review", "preview"] as const;
const knowledgeLevels: LedgerGuideKnowledge[] = ["none", "basic", "average", "accountant"];
const languages: { value: LedgerGuideLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
];
const businessTypes = ["services", "retail", "ecommerce", "manufacturing", "freelance", "nonprofit", "other"] as const;

export default function AccountingGuidedSetupPage() {
  const { t } = useTranslation("accountingSettings");
  const { status, refresh } = useAccountingSetup();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState<LedgerGuideLanguage>("en");
  const [knowledge, setKnowledge] = useState<LedgerGuideKnowledge>("average");
  const [businessType, setBusinessType] = useState<(typeof businessTypes)[number]>("services");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState(status?.profile.currency || "EUR");
  const [answers, setAnswers] = useState<AnswerState>({ sells_inventory: false, has_employees: false, vat_registered: false, notes: "" });
  const [preview, setPreview] = useState<LedgerGuideResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status?.profile.currency) setCurrency(status.profile.currency);
  }, [status?.profile.currency]);

  const tr = (key: string, defaultValue: string, options: Record<string, unknown> = {}) => t(key, { defaultValue, ...options });
  const generate = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api.generateLedgerGuide({
        language,
        knowledge_level: knowledge,
        business_type: businessType,
        country,
        currency,
        answers,
        apply: false,
      });
      setPreview(result.data);
      setStep(3);
    } catch (cause) {
      setError(apiErrorMessage(cause, tr("guidedSetup.generateError", "Could not generate a chart. Try again.")));
    } finally {
      setBusy(false);
    }
  };
  const apply = async () => {
    if (busy || !preview) return;
    setBusy(true);
    setError("");
    try {
      await api.generateLedgerGuide({
        language,
        knowledge_level: knowledge,
        business_type: businessType,
        country,
        currency,
        answers,
        accounts: preview.accounts,
        apply: true,
      });
      await refresh();
      navigate("/accounting/setup/chart", { replace: true });
    } catch (cause) {
      setError(apiErrorMessage(cause, tr("guidedSetup.applyError", "Could not apply the chart. Try again.")));
    } finally {
      setBusy(false);
    }
  };

  const languageItems = languages;
  const chartStep = status?.steps.find(item => item.key === "chart");
  if (!status) return null;
  if (!chartStep?.available) return <section className="mx-auto w-full max-w-2xl space-y-4">
    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{tr("guidedSetup.title", "Let's build your chart of accounts")}</h1>
    <Card radius="xl" tone="slate" padding="default" className="space-y-3">
      <p className="text-sm text-slate-700">{tr("guidedSetup.blocked", "Finish the profile and currency steps before generating a chart.")}</p>
      <Link to={`/accounting/setup/${status.current_phase}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:underline underline-offset-4">{tr("guidedSetup.continueSetup", "Continue setup")}<ArrowRight size={14} aria-hidden="true" /></Link>
    </Card>
  </section>;
  const businessItems = businessTypes.map(value => ({ value, label: tr(`guidedSetup.businessTypes.${value}`, value) }));
  const sectionLabels: Record<LedgerGuideAccount["statement_section"], string> = {
    asset: tr("guidedSetup.sections.asset", "Assets"),
    liability: tr("guidedSetup.sections.liability", "Liabilities"),
    equity: tr("guidedSetup.sections.equity", "Equity"),
    income: tr("guidedSetup.sections.income", "Income"),
    expense: tr("guidedSetup.sections.expense", "Expenses"),
    off_balance: tr("guidedSetup.sections.off_balance", "Off balance"),
    statistical: tr("guidedSetup.sections.statistical", "Statistical"),
  };

  return <section className="mx-auto w-full max-w-[1100px] space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">{tr("guidedSetup.eyebrow", "Guided setup")}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{tr("guidedSetup.title", "Let's build your chart of accounts")}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{tr("guidedSetup.description", "Answer a few questions. We suggest a chart in your language, you preview it, then you decide whether to apply it.")}</p>
      </div>
      <Link to="/accounting/chart" className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-950"><ArrowLeft size={14} aria-hidden="true" />{tr("guidedSetup.backToChart", "Back to chart")}</Link>
    </div>

    <ol className="flex flex-wrap gap-2" aria-label={tr("guidedSetup.progress", "Setup progress")}>
      {steps.map((key, index) => <li key={key} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium ${index === step ? "border-indigo-200 bg-indigo-50 text-indigo-700" : index < step ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
        <span className="grid h-4 w-4 place-items-center rounded-full bg-white/70 text-[10px]">{index < step ? <Check size={11} aria-hidden="true" /> : index + 1}</span>
        {tr(`guidedSetup.steps.${key}`, key)}
      </li>)}
    </ol>

    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

    <Card as="section" radius="xl" tone="slate" padding="default" className="space-y-5">
      {step === 0 && <>
        <div>
          <h2 className="text-base font-semibold text-slate-950">{tr("guidedSetup.languageTitle", "Language and experience")}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{tr("guidedSetup.languageBody", "Choose the language for the generated accounts. It does not change your app language.")}</p>
        </div>
        <div className="max-w-sm"><Select<{ value: LedgerGuideLanguage; label: string }> label={tr("guidedSetup.language", "Account language")} buttonLabel={tr("guidedSetup.language", "Account language")} items={languageItems} selected={languageItems.filter(item => item.value === language)} onChange={items => setLanguage(items[0]?.value || "en")} getItemKey={item => item.value} getItemLabel={item => item.label} singleSelect hideCheckboxes /></div>
        <div>
          <p className="mb-2 text-xs font-medium text-slate-700">{tr("guidedSetup.knowledge", "How comfortable are you with accounting?")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {knowledgeLevels.map(value => <button key={value} type="button" onClick={() => setKnowledge(value)} aria-pressed={knowledge === value} className={`rounded-lg border p-3 text-left transition-colors ${knowledge === value ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
              <span className="block text-sm font-medium text-slate-900">{tr(`guidedSetup.knowledgeLevels.${value}.title`, value)}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">{tr(`guidedSetup.knowledgeLevels.${value}.description`, "")}</span>
            </button>)}
          </div>
        </div>
      </>}

      {step === 1 && <>
        <div>
          <h2 className="text-base font-semibold text-slate-950">{tr("guidedSetup.businessTitle", "Tell us about the business")}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{tr("guidedSetup.businessBody", "These answers shape the suggested accounts. You can change everything later.")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select<{ value: string; label: string }> label={tr("guidedSetup.businessType", "Business type")} buttonLabel={tr("guidedSetup.businessType", "Business type")} items={businessItems} selected={businessItems.filter(item => item.value === businessType)} onChange={items => setBusinessType((items[0]?.value || "services") as typeof businessType)} getItemKey={item => item.value} getItemLabel={item => item.label} singleSelect hideCheckboxes />
          <Input kind="text" label={tr("guidedSetup.country", "Country")} value={country} onChange={event => setCountry(event.target.value)} placeholder={tr("guidedSetup.countryPlaceholder", "e.g. Portugal")} />
          <Input kind="text" label={tr("guidedSetup.currency", "Currency")} value={currency} maxLength={3} onChange={event => setCurrency(event.target.value.toUpperCase())} />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <label className="inline-flex items-center gap-2 text-xs text-slate-700"><Checkbox checked={answers.sells_inventory} onChange={event => setAnswers(previous => ({ ...previous, sells_inventory: event.target.checked }))} />{tr("guidedSetup.sellsInventory", "Sells physical inventory")}</label>
          <label className="inline-flex items-center gap-2 text-xs text-slate-700"><Checkbox checked={answers.has_employees} onChange={event => setAnswers(previous => ({ ...previous, has_employees: event.target.checked }))} />{tr("guidedSetup.hasEmployees", "Has employees or payroll")}</label>
          <label className="inline-flex items-center gap-2 text-xs text-slate-700"><Checkbox checked={answers.vat_registered} onChange={event => setAnswers(previous => ({ ...previous, vat_registered: event.target.checked }))} />{tr("guidedSetup.vatRegistered", "VAT registered")}</label>
        </div>
        <Textarea label={tr("guidedSetup.notes", "Anything else we should know?")} value={answers.notes} onChange={event => setAnswers(previous => ({ ...previous, notes: event.target.value }))} placeholder={tr("guidedSetup.notesPlaceholder", "Optional: main activities, unusual income, inventory, payroll...")} />
      </>}

      {step === 2 && <>
        <div>
          <h2 className="text-base font-semibold text-slate-950">{tr("guidedSetup.reviewTitle", "Review and generate")}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{tr("guidedSetup.reviewBody", "We will ask the AI provider for a chart suggestion. Nothing is saved until you apply it.")}</p>
        </div>
        <dl className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-xs sm:grid-cols-2">
          <div><dt className="text-slate-500">{tr("guidedSetup.language", "Account language")}</dt><dd className="mt-1 font-medium text-slate-900">{languages.find(item => item.value === language)?.label}</dd></div>
          <div><dt className="text-slate-500">{tr("guidedSetup.knowledge", "Accounting level")}</dt><dd className="mt-1 font-medium text-slate-900">{tr(`guidedSetup.knowledgeLevels.${knowledge}.title`, knowledge)}</dd></div>
          <div><dt className="text-slate-500">{tr("guidedSetup.businessType", "Business type")}</dt><dd className="mt-1 font-medium text-slate-900">{tr(`guidedSetup.businessTypes.${businessType}`, businessType)}</dd></div>
          <div><dt className="text-slate-500">{tr("guidedSetup.currency", "Currency")}</dt><dd className="mt-1 font-medium text-slate-900">{currency || "—"}</dd></div>
        </dl>
      </>}

      {step === 3 && preview && <>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">{tr("guidedSetup.previewTitle", "Suggested chart")}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{tr("guidedSetup.previewBody", "Review the accounts below. Applying creates them in your chart; existing charts are never overwritten.")}</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600">{preview.provider} · {preview.model}</span>
        </div>
        <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-slate-500"><tr><th className="px-3 py-2 font-medium">{tr("guidedSetup.code", "Code")}</th><th className="px-3 py-2 font-medium">{tr("guidedSetup.name", "Name")}</th><th className="px-3 py-2 font-medium">{tr("guidedSetup.section", "Section")}</th><th className="px-3 py-2 font-medium">{tr("guidedSetup.type", "Type")}</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{preview.accounts.map(account => <tr key={account.code}><td className="px-3 py-2 font-mono text-[11px] text-slate-500">{account.code}</td><td className={`px-3 py-2 ${account.account_type === "header" ? "font-semibold text-slate-900" : "text-slate-700"}`}>{account.name}{account.parent_code && account.account_type !== "header" ? <span className="ml-2 text-[10px] text-slate-400">↳ {account.parent_code}</span> : null}</td><td className="px-3 py-2 text-slate-500">{sectionLabels[account.statement_section]}</td><td className="px-3 py-2 text-slate-500">{tr(`guidedSetup.accountTypes.${account.account_type}`, account.account_type)}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">{tr("guidedSetup.count", "{{count}} accounts generated.", { count: preview.accounts.length })}</p>
      </>}
    </Card>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>{step > 0 && step < 3 && <Button variant="outline" onClick={() => setStep(value => value - 1)} disabled={busy}>{tr("guidedSetup.back", "Back")}</Button>}{step === 3 && <Button variant="outline" onClick={() => { setPreview(null); setStep(0); }} disabled={busy}>{tr("guidedSetup.startOver", "Start over")}</Button>}</div>
      <div className="flex items-center gap-2">
        {step < 2 && <Button onClick={() => setStep(value => value + 1)} disabled={step === 1 && !currency.trim()}>{tr("guidedSetup.continue", "Continue")}<ArrowRight size={15} aria-hidden="true" /></Button>}
        {step === 2 && <Button onClick={() => void generate()} isLoading={busy} disabled={busy}><Sparkles size={15} aria-hidden="true" />{tr("guidedSetup.generate", "Generate chart")}</Button>}
        {step === 3 && <Button onClick={() => void apply()} isLoading={busy} disabled={busy}>{tr("guidedSetup.apply", "Apply chart")}</Button>}
      </div>
    </div>
  </section>;
}
