import React from "react";

type Tone = "neutral" | "positive" | "negative";

type Props = {
  label: string;
  value: string;
  hint: string;
  tone?: Tone;
};

const toneClasses: Record<Tone, string> = {
  neutral: "text-slate-900",
  positive: "text-emerald-600",
  negative: "text-rose-600",
};

const MetricCard: React.FC<Props> = ({ label, value, hint, tone = "neutral" }) => {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className={`mt-2 text-xl font-semibold tracking-tight sm:text-2xl ${toneClasses[tone]}`}>
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </div>
  );
};

export default MetricCard;