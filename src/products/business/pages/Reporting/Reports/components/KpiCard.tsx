import React from "react";
import type { Tone } from "../helpers";

type Props = {
  label: string;
  value: string;
  hint: string;
  tone?: Tone;
};

const toneClass: Record<Tone, string> = {
  neutral: "text-gray-900",
  positive: "text-[#0E9384]",
  negative: "text-[#D92D20]",
};

const KpiCard: React.FC<Props> = ({ label, value, hint, tone = "neutral" }) => {
  return (
    <div className="border border-gray-300 rounded-md bg-white px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-gray-600">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${toneClass[tone]}`}>{value}</p>
      <p className="mt-1 text-[11px] text-gray-500">{hint}</p>
    </div>
  );
};

export default KpiCard;
