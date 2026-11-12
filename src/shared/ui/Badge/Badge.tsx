import type { HTMLAttributes, ReactNode } from "react";
import classNames from "classnames";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "lime" | "orange";
export type BadgeVariant = "soft" | "outline";
export type BadgeSize = "sm" | "md";

export type BadgeProps = {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Leading status dot; the label still carries the meaning. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">;

const SOFT: Record<BadgeTone, string> = {
  neutral: "border-gray-200 bg-gray-50 text-gray-600",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-indigo-200 bg-indigo-50 text-indigo-700",
  lime: "border-lime-200 bg-lime-50 text-lime-700",
  orange: "border-orange-200 bg-orange-50 text-orange-700",
};

const OUTLINE: Record<BadgeTone, string> = {
  neutral: "border-gray-200 bg-white text-gray-600",
  success: "border-emerald-200 bg-white text-emerald-700",
  warning: "border-amber-200 bg-white text-amber-800",
  danger: "border-rose-200 bg-white text-rose-700",
  info: "border-indigo-200 bg-white text-indigo-700",
  lime: "border-lime-200 bg-white text-lime-700",
  orange: "border-orange-200 bg-white text-orange-700",
};

const SIZE: Record<BadgeSize, string> = {
  sm: "text-[10px]",
  md: "text-[11px]",
};

/** Compact status/count label. Never use it as a button. */
export default function Badge({ tone = "neutral", variant = "soft", size = "sm", dot = false, children, className, ...rest }: BadgeProps) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 font-medium",
        variant === "outline" ? OUTLINE[tone] : SOFT[tone],
        SIZE[size],
        className
      )}
      {...rest}
    >
      {dot ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
