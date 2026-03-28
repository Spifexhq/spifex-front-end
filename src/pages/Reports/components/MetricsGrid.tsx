import React from "react";
import MetricCard from "./MetricCard";

type Metric = {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "positive" | "negative";
};

const MetricsGrid: React.FC<{ metrics: Metric[] }> = ({ metrics }) => {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </section>
  );
};

export default MetricsGrid;