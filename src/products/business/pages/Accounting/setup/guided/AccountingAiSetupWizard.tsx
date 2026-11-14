import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { api } from "@/core/api/requests";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { getCountries } from "@/lib/location/countries";
import Button from "@/shared/ui/Button";
import Card from "@/shared/ui/Card";
import PageSkeleton from "@/shared/ui/Loaders/PageSkeleton";
import { Select } from "@/shared/ui/Select";
import { useAccountingSetup } from "../useAccountingSetup";
import { useAccountingAiSetup } from "./AccountingAiSetupState";
import type { AiSetupApplyResponse, AiSetupContext, AiSetupLanguage, AiSetupLevel, AiSetupPreviewResponse, AiSetupQuestion, AiSetupSection } from "@/models/settings/accountingAiSetup";
import GuidedSetupStepper from "./GuidedSetupStepper";
import QuestionField from "./QuestionField";
import BlueprintPreview from "./BlueprintPreview";
import { clearAiSetupScratch, readAiSetupScratch, writeAiSetupScratch } from "./AccountingAiSetupScratch";

type Answer = string | string[] | boolean;
type Answers = Record<string, Answer>;

const languages: AiSetupLanguage[] = ["en", "pt", "fr", "de"];
const levels: AiSetupLevel[] = ["none", "basic", "average", "accountant"];

function isEmpty(value: Answer | undefined) {
  return value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
}

function selectsOther(value: Answer | undefined) {
  return value === "other" || (Array.isArray(value) && value.includes("other"));
}

export default function AccountingAiSetupWizard({ source, onClose }: { source: string; onClose(): void }) {
  const { t, i18n } = useTranslation("accountingSettings");
  const { refresh } = useAccountingSetup();
  const { setHasProgress, busy, setBusy } = useAccountingAiSetup();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const inFlight = useRef(false);
  const [context, setContext] = useState<AiSetupContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [contextError, setContextError] = useState("");
  const [scratch] = useState(() => readAiSetupScratch());
  // From a specific accounting page, the assistant skips the expertise step.
  const [step, setStep] = useState(scratch ? Math.min(scratch.step, 2) : source === "overview" ? 0 : 1);
  const [level, setLevel] = useState<AiSetupLevel>(scratch?.level || "basic");
  const [language, setLanguage] = useState<AiSetupLanguage>(scratch?.language || "en");
  const [answers, setAnswers] = useState<Answers>(scratch?.answers || {});
  const [preview, setPreview] = useState<AiSetupPreviewResponse | null>(null);
  const [result, setResult] = useState<AiSetupApplyResponse | null>(null);
  const [error, setError] = useState("");
  const countryOptions = useMemo(() => getCountries(i18n.language).map(country => ({ value: country.label, label: country.label })), [i18n.language]);
  const defaultCountry = useMemo(() => {
    const raw = context?.defaults.country?.trim();
    if (!raw) return "";
    if (raw.length === 2) {
      const match = getCountries(i18n.language).find(country => country.value.toUpperCase() === raw.toUpperCase());
      if (match) return match.label;
    }
    return raw;
  }, [context?.defaults.country, i18n.language]);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setContextError("");
    try {
      const { data } = await api.getAccountingAiSetupContext();
      setContext(data);
      if (!scratch) setLanguage(data.language);
    } catch (cause) {
      setContextError(apiErrorMessage(cause, t("guidedSetup.loadError")));
    } finally {
      setLoading(false);
    }
  }, [t, scratch]);

  useEffect(() => { void loadContext(); }, [loadContext]);
  useEffect(() => {
    const keys = Object.keys(answers);
    const onlyDefaultCountry = keys.length === 1 && Boolean(defaultCountry) && answers.country === defaultCountry;
    setHasProgress(step < 4 && keys.length > 0 && !onlyDefaultCountry);
  }, [answers, defaultCountry, step, setHasProgress]);
  useEffect(() => {
    const keys = Object.keys(answers);
    const onlyDefaultCountry = keys.length === 1 && Boolean(defaultCountry) && answers.country === defaultCountry;
    if (step < 4 && keys.length > 0 && !onlyDefaultCountry) writeAiSetupScratch({ level, language, answers, step: Math.min(step, 2) });
  }, [answers, defaultCountry, language, level, step]);
  useEffect(() => {
    if (!defaultCountry) return;
    setAnswers(previous => {
      if (!previous.country) return { ...previous, country: defaultCountry };
      const current = previous.country;
      if (typeof current === "string" && current.length === 2) {
        const localized = getCountries(i18n.language).find(country => country.value.toUpperCase() === current.toUpperCase())?.label;
        return localized ? { ...previous, country: localized } : previous;
      }
      return previous;
    });
  }, [defaultCountry, i18n.language]);
  const go = (target: string) => { onClose(); navigate(target); };

  const questionnaire = useMemo<AiSetupSection[]>(() => context?.questionnaires[level] || [], [context, level]);
  const questions = useMemo(() => questionnaire.flatMap(section => section.questions), [questionnaire]);
  const missingRequired = questions.filter(question =>
    (question.required && isEmpty(answers[question.key]))
    || (selectsOther(answers[question.key]) && isEmpty(answers[`${question.key}_other`]))
  );
  const blocker = context?.blockers[0];
  const blocked = Boolean(blocker) || (context && !context.provider_configured);

  const changeLevel = (next: AiSetupLevel) => {
    setLevel(next);
    setAnswers(defaultCountry ? { country: defaultCountry } : {});
    setPreview(null);
    setError("");
  };
  const changeAnswer = (question: AiSetupQuestion, value: Answer) => {
    setAnswers(previous => {
      const next = { ...previous, [question.key]: value };
      if (!selectsOther(value)) delete next[`${question.key}_other`];
      return next;
    });
    setPreview(null);
  };
  const labelFor = (question: AiSetupQuestion, value: Answer | undefined) => {
    if (value === undefined) return t("guidedSetup.notAnswered");
    if (typeof value === "boolean") return value ? t("guidedSetup.yes") : t("guidedSetup.no");
    if (question.key === "country" && typeof value === "string") return value;
    const options = question.options;
    const base = Array.isArray(value)
      ? value.map(item => t(options.find(option => option.value === item)?.label_key || item)).join(", ")
      : t(options.find(option => option.value === value)?.label_key || String(value));
    const other = answers[`${question.key}_other`];
    return selectsOther(value) && typeof other === "string" && other.trim() ? `${base} — ${other}` : base;
  };

  const generate = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setPreview(null);
    setStep(3);
    try {
      const { data } = await api.previewAccountingAiSetup({ level, language, answers });
      setPreview(data);
      if (!data.blueprint) setError(data.blockers[0]?.message || t("guidedSetup.generateError"));
    } catch (cause) {
      setError(apiErrorMessage(cause, t("guidedSetup.generateError")));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const apply = async () => {
    if (inFlight.current || !preview?.blueprint) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.applyAccountingAiSetup({
        level,
        language,
        answers,
        blueprint: preview.blueprint,
        revision: preview.revision,
        activate: true,
      });
      setResult(data);
      clearAiSetupScratch();
      await refresh();
      setStep(4);
    } catch (cause) {
      setError(apiErrorMessage(cause, t("guidedSetup.applyError")));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  if (loading) return <PageSkeleton variant="form" rows={7}/>;
  if (contextError || !context) {
    return <Card as="section" radius="xl" tone="slate" padding="default" className="mx-auto max-w-2xl space-y-3" role="alert">
      <h1 className="text-base font-semibold text-gray-900">{t("guidedSetup.unavailableTitle")}</h1>
      <p className="text-sm leading-6 text-gray-600">{contextError || t("guidedSetup.unavailableBody")}</p>
      <Button variant="outline" onClick={() => void loadContext()}>{t("guidedSetup.retry")}</Button>
    </Card>;
  }
  if (blocked) {
    const target = blocker?.code === "profile_required" ? "/settings" : "/accounting/chart-of-accounts";
    return <Card as="section" radius="xl" tone="slate" padding="default" className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500"><Sparkles size={16} aria-hidden="true" /></span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">{t("guidedSetup.blockedTitle")}</h1>
          <p className="mt-1.5 text-sm leading-6 text-gray-600">{blocker?.message || t("guidedSetup.providerUnavailable")}</p>
        </div>
      </div>
      <Button variant="outlineBlack" onClick={() => go(target)}>{t("guidedSetup.continueSetup")}</Button>
    </Card>;
  }

  const levelItems = levels.map(value => ({ value, label: t(`guidedSetup.levels.${value}.title`), description: t(`guidedSetup.levels.${value}.description`) }));
  const stepBody = step === 0 ? <>
    <div>
      <h2 className="text-base font-semibold text-gray-900">{t("guidedSetup.levelTitle")}</h2>
      <p className="mt-1 text-sm leading-6 text-gray-500">{t("guidedSetup.levelBody")}</p>
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      {levelItems.map(item => <button key={item.value} type="button" aria-pressed={level === item.value} onClick={() => changeLevel(item.value)} className={`rounded-lg border px-3 py-3 text-left transition-colors ${level === item.value ? "border-gray-900 bg-gray-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
        <span className="block text-[13px] font-medium text-gray-900">{item.label}</span>
        <span className="mt-1 block text-xs leading-5 text-gray-500">{item.description}</span>
      </button>)}
    </div>
    <div className="max-w-sm"><Select<{ value: AiSetupLanguage; label: string }>
      label={t("guidedSetup.accountLanguage")}
      buttonLabel={t("guidedSetup.accountLanguage")}
      items={languages.map(value => ({ value, label: t(`guidedSetup.languages.${value}`) }))}
      selected={languages.filter(value => value === language).map(value => ({ value, label: t(`guidedSetup.languages.${value}`) }))}
      onChange={items => setLanguage(items[0]?.value || "en")}
      getItemKey={item => item.value}
      getItemLabel={item => item.label}
      singleSelect
      hideCheckboxes
    /></div>
  </> : step === 1 ? <>
    <div>
      <h2 className="text-base font-semibold text-gray-900">{t("guidedSetup.questionsTitle")}</h2>
      <p className="mt-1 text-sm leading-6 text-gray-500">{t("guidedSetup.questionsBody")}</p>
    </div>
    <div className="space-y-5">
      {questionnaire.map(section => <fieldset key={section.id} className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t(section.title_key)}</legend>
        <p className="-mt-1.5 text-xs leading-5 text-gray-500">{t(section.description_key)}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {section.questions.map(question => <div key={question.key} className={question.type === "boolean" ? "sm:col-span-2" : ""}><QuestionField question={question} value={answers[question.key]} onChange={value => changeAnswer(question, value)} options={question.key === "country" ? countryOptions : undefined} otherValue={typeof answers[`${question.key}_other`] === "string" ? String(answers[`${question.key}_other`]) : ""} onOtherChange={value => setAnswers(previous => ({ ...previous, [`${question.key}_other`]: value }))} /></div>)}
        </div>
      </fieldset>)}
    </div>
  </> : step === 2 ? <>
    <div>
      <h2 className="text-base font-semibold text-gray-900">{t("guidedSetup.reviewTitle")}</h2>
      <p className="mt-1 text-sm leading-6 text-gray-500">{t("guidedSetup.reviewBody")}</p>
    </div>
    <dl className="grid gap-x-6 gap-y-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2">
      <div><dt className="text-[11px] text-gray-500">{t("guidedSetup.levelLabel")}</dt><dd className="mt-0.5 text-[13px] font-medium text-gray-900">{t(`guidedSetup.levels.${level}.title`)}</dd></div>
      <div><dt className="text-[11px] text-gray-500">{t("guidedSetup.accountLanguage")}</dt><dd className="mt-0.5 text-[13px] font-medium text-gray-900">{t(`guidedSetup.languages.${language}`)}</dd></div>
      <div><dt className="text-[11px] text-gray-500">{t("guidedSetup.currencyLabel")}</dt><dd className="mt-0.5 text-[13px] font-medium text-gray-900">{context.defaults.currency}</dd></div>
      {questions.filter(question => !isEmpty(answers[question.key])).map(question => <div key={question.key}><dt className="text-[11px] text-gray-500">{t(`guidedSetup.questions.${question.key}.label`)}</dt><dd className="mt-0.5 text-[13px] font-medium text-gray-900">{labelFor(question, answers[question.key])}</dd></div>)}
    </dl>
  </> : step === 3 ? <>
    {busy && !preview ? <div role="status" aria-busy="true" className="space-y-4 py-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700"><Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />{t("guidedSetup.generating")}</div>
      {[92, 78, 86].map((width, index) => <motion.div key={width} initial={{ opacity: 0.35, x: reduced ? 0 : -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: reduced ? 0 : 0.2, delay: indexedDelay(index, reduced) }} className="h-3 rounded-full bg-gray-100"><div className="h-3 rounded-full bg-gray-200" style={{ width: `${width}%` }} /></motion.div>)}
    </div> : preview?.blueprint ? <>
      <div>
        <h2 className="text-base font-semibold text-gray-900">{t("guidedSetup.previewTitle")}</h2>
        <p className="mt-1 text-sm leading-6 text-gray-500">{t("guidedSetup.previewBody")}</p>
      </div>
      <BlueprintPreview preview={preview} banks={context.existing.bank_accounts}/>
    </> : null}
  </> : result ? <div className="space-y-4 py-2 text-center">
    <motion.span initial={{ scale: reduced ? 1 : 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: reduced ? 0 : 0.2 }} className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check size={20} aria-hidden="true" /></motion.span>
    <div><h2 className="text-base font-semibold text-gray-900">{t("guidedSetup.successTitle")}</h2><p className="mt-1 text-sm leading-6 text-gray-500">{t("guidedSetup.successBody", { accounts: result.created.accounts, books: result.created.books, rules: result.created.category_rules })}</p></div>
    <Button variant="outlineBlack" onClick={() => go("/accounting/overview")}>{t("guidedSetup.openAccounting")}</Button>
  </div> : null;

  const primary = step === 0 ? { label: t("guidedSetup.continue"), action: () => setStep(1), disabled: false }
    : step === 1 ? { label: t("guidedSetup.continue"), action: () => setStep(2), disabled: missingRequired.length > 0 }
    : step === 2 ? { label: t("guidedSetup.generate"), action: () => void generate(), disabled: busy }
    : step === 3 ? preview?.can_apply ? { label: t("guidedSetup.apply"), action: () => void apply(), disabled: busy } : { label: t("guidedSetup.regenerate"), action: () => void generate(), disabled: busy }
    : null;

  return <section className="space-y-4">
    <GuidedSetupStepper step={step}/>
    {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">{error}</div> : null}
    <Card as="section" radius="xl" tone="slate" padding="default" className="min-h-56" aria-busy={busy}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} initial={{ opacity: 0, y: reduced ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -4 }} transition={{ duration: reduced ? 0 : 0.15, ease: "easeOut" }} className="space-y-5">
          {stepBody}
        </motion.div>
      </AnimatePresence>
    </Card>
    {step < 4 ? <footer className="flex flex-wrap items-center justify-between gap-3">
      <div>{step > 0 && step < 4 ? <Button variant="outline" className="gap-2" onClick={() => setStep(value => value - 1)} disabled={busy}><ArrowLeft size={15} aria-hidden="true" />{t("guidedSetup.back")}</Button> : null}</div>
      {primary ? <Button variant="outlineBlack" className="gap-2" onClick={primary.action} disabled={primary.disabled || busy} isLoading={busy}>{primary.label}{step < 2 ? <ArrowRight size={15} aria-hidden="true" /> : null}</Button> : null}
    </footer> : null}
  </section>;
}

function indexedDelay(index: number, reduced: boolean | null) {
  return reduced ? 0 : index * 0.08;
}
