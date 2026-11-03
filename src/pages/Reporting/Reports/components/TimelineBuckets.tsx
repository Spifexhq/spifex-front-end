import React from "react";
import { formatCurrency } from "@/lib/currency/formatCurrency";

type Bucket = { rec: number; pay: number; net: number };

const Card: React.FC<{ title: string; bucket: Bucket }> = ({ title, bucket }) => (
  <div className="rounded-md border border-gray-300 bg-white px-3 py-2.5">
    <p className="text-[11px] uppercase tracking-wide text-gray-600">{title}</p>
    <div className="mt-3 grid grid-cols-2 gap-3">
      <div>
        <p className="text-[11px] text-gray-500">To receive</p>
        <p className="mt-1 text-[15px] font-semibold text-gray-900 tabular-nums">{formatCurrency(bucket.rec)}</p>
      </div>
      <div>
        <p className="text-[11px] text-gray-500">To pay</p>
        <p className="mt-1 text-[15px] font-semibold text-[#D92D20] tabular-nums">{formatCurrency(bucket.pay)}</p>
      </div>
    </div>
    <div className="mt-3 border-t border-gray-200 pt-2">
      <p className="text-[11px] text-gray-500">Net</p>
      <p className={`mt-1 text-[15px] font-semibold tabular-nums ${bucket.net >= 0 ? "text-gray-900" : "text-red-700"}`}>
        {bucket.net >= 0 ? "+" : ""}{formatCurrency(bucket.net)}
      </p>
    </div>
  </div>
);

const TimelineBuckets: React.FC<{ overdue: Bucket; next7: Bucket; next30: Bucket }> = ({ overdue, next7, next30 }) => {
  return (
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <Card title="Overdue" bucket={overdue} />
      <Card title="Next 7 days" bucket={next7} />
      <Card title="Next 30 days" bucket={next30} />
    </section>
  );
};

export default TimelineBuckets;
