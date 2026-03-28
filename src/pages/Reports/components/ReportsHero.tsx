import React from "react";
import Button from "@/shared/ui/Button";

type Props = {
  title: string;
  subtitle: string;
  error: string | null;
  banksError: string | null;
  onRefresh: () => void;
  refreshing: boolean;
};

const ReportsHero: React.FC<Props> = ({
  title,
  subtitle,
  error,
  banksError,
  onRefresh,
  refreshing,
}) => {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 text-white shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium tracking-wide text-slate-300">
            Financial intelligence
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-slate-300">{subtitle}</p>

          {(error || banksError) && (
            <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error || banksError}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="common" onClick={onRefresh} disabled={refreshing}>
            Refresh
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ReportsHero;