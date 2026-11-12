import type { FormEventHandler, ReactNode } from "react";
import Card from "@/shared/ui/Card";

/** Shared dashboard filter composition used by both product overviews. */
export default function OverviewFilterPanel({ toolbar, children, onSubmit }: {
  toolbar?: ReactNode;
  children: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  return <div className="space-y-3">
    {toolbar && <div className="flex flex-wrap items-center justify-between gap-3">{toolbar}</div>}
    <Card as="form" radius="xl" tone="slate" padding="compact" onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      {children}
    </Card>
  </div>;
}
