import type { ReactNode } from "react";
import classNames from "classnames";

export type ErrorStateTone = "danger" | "warning";
export type ErrorStateVariant = "inline" | "panel";
export type ErrorStateSize = "sm" | "md";

export type ErrorStateProps = {
  message: ReactNode;
  title?: ReactNode;
  action?: ReactNode;
  tone?: ErrorStateTone;
  variant?: ErrorStateVariant;
  size?: ErrorStateSize;
  className?: string;
};

const TONE: Record<ErrorStateTone, string> = {
  danger: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

const SIZE: Record<ErrorStateSize, string> = {
  sm: "p-3 text-xs",
  md: "p-4 text-sm",
};

/**
 * Canonical error surface. `inline` sits inside an existing card (no border),
 * `panel` is a bordered alert for page or dialog content.
 */
export default function ErrorState({ message, title, action, tone = "danger", variant = "panel", size = "md", className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={classNames(
        variant === "panel" ? classNames("rounded-lg border", TONE[tone], SIZE[size]) : "p-3 text-xs text-red-700",
        className
      )}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      <p className={title ? "mt-1" : undefined}>{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
