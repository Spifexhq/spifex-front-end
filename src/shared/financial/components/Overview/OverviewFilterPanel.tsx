import type { FormEventHandler, ReactNode } from "react";

/** Shared dashboard filter composition used by both product overviews. */
export default function OverviewFilterPanel({ toolbar, children, onSubmit }: {
  toolbar?: ReactNode;
  children: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  return <div className="space-y-3">
    {toolbar && <div className="flex flex-wrap items-center justify-between gap-3">{toolbar}</div>}
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      {children}
    </form>
  </div>;
}
