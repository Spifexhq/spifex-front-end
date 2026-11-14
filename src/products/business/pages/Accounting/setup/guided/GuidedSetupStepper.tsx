import { useTranslation } from "react-i18next";

const steps = ["level", "questions", "review", "preview"] as const;

export default function GuidedSetupStepper({ step }: { step: number }) {
  const { t } = useTranslation("accountingSettings");
  return <ol className="grid grid-cols-4 gap-2" aria-label={t("guidedSetup.progress")}>
    {steps.map((key, index) => {
      const complete = index < step;
      const current = index === step;
      return <li key={key} className="min-w-0">
        <div className={`h-1 rounded-full transition-colors duration-200 motion-reduce:transition-none ${complete ? "bg-emerald-500" : current ? "bg-gray-900" : "bg-gray-200"}`} />
        <p className={`mt-1.5 truncate text-[11px] font-medium ${current ? "text-gray-900" : complete ? "text-emerald-700" : "text-gray-400"}`} aria-current={current ? "step" : undefined}>
          {index + 1}. {t(`guidedSetup.steps.${key}`)}
        </p>
      </li>;
    })}
  </ol>;
}
