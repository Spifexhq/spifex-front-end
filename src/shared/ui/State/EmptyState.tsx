import type { ReactNode } from "react";
import classNames from "classnames";

export type EmptyStateSize = "xs" | "sm" | "md";

export type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Icon or illustration; caller controls its size (22–24px recommended). */
  icon?: ReactNode;
  action?: ReactNode;
  size?: EmptyStateSize;
  className?: string;
};

const PADDING: Record<EmptyStateSize, string> = {
  xs: "py-4",
  sm: "py-8",
  md: "py-12",
};

/** Canonical empty state: centered title, optional description and action. */
export default function EmptyState({ title, description, icon, action, size = "md", className }: EmptyStateProps) {
  return (
    <div role="status" className={classNames("flex flex-col items-center justify-center px-4 text-center", PADDING[size], className)}>
      {icon ? <div aria-hidden="true" className="mb-3 text-gray-300">{icon}</div> : null}
      <p className="text-[13px] font-medium text-gray-700">{title}</p>
      {description ? <p className="mt-1 max-w-md text-xs leading-5 text-gray-500">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
