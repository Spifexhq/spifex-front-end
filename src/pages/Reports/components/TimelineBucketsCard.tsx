import React from "react";
import { formatCurrency } from "@/lib/currency/formatCurrency";

type Bucket = {
  rec: number;
  pay: number;
  net: number;
};

const BucketCard: React.FC<{
  label: string;
  bucket: Bucket;
}> = ({ label, bucket }) => {
  const netPositive = bucket.net >= 0;

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-blue-50 p-3">
          <p className="text-xs text-blue-700">To receive</p>
          <p className="mt-2 text-lg font-semibold text-blue-900">
            {formatCurrency(bucket.rec)}
          </p>
        </div>

        <div className="rounded-2xl bg-rose-50 p-3">
          <p className="text-xs text-rose-700">To pay</p>
          <p className="mt-2 text-lg font-semibold text-rose-900">
            {formatCurrency(bucket.pay)}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 p-3">
        <p className="text-xs text-slate-500">Net effect</p>
        <p className={`mt-2 text-lg font-semibold ${netPositive ? "text-emerald-600" : "text-rose-600"}`}>
          {netPositive ? "+" : ""}
          {formatCurrency(bucket.net)}
        </p>
      </div>
    </div>
  );
};

const TimelineBucketsCard: React.FC<{
  overdue: Bucket;
  next7: Bucket;
  next30: Bucket;
}> = ({ overdue, next7, next30 }) => {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <BucketCard label="Overdue" bucket={overdue} />
      <BucketCard label="Next 7 days" bucket={next7} />
      <BucketCard label="Next 30 days" bucket={next30} />
    </section>
  );
};

export default TimelineBucketsCard;