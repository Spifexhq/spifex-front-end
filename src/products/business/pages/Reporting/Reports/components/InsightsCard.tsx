import React from "react";
import SectionCard from "./SectionCard";

const InsightsCard: React.FC<{ insights: string[] }> = ({ insights }) => {
  return (
    <SectionCard title="Operational insights" subtitle="Quick reading of the current finance posture">
      {insights.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray-500">
          No critical insights for the selected range.
        </div>
      ) : (
        <ul className="space-y-2">
          {insights.map((item, index) => (
            <li key={`${item}-${index}`} className="rounded-md border border-gray-200 px-3 py-2 text-[13px] text-gray-700">
              {item}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
};

export default InsightsCard;
