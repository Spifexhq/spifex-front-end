import * as React from "react";
import { InlineLoader } from "@/components/Loaders";
import { ButtonProps, ButtonSize, ButtonVariant } from "./Button.types";

// Helper simples sem dependências externas
function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

const base =
  "inline-flex select-none items-center justify-center rounded-md font-medium " +
  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "disabled:cursor-not-allowed";

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-base",
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "text-white border border-transparent " +
    "bg-[var(--accentPrimary)] hover:bg-[var(--accentPrimaryHover)] " +
    "active:bg-[var(--accentPrimaryPressed)] disabled:bg-[var(--accentPrimaryDisabled)]",
  secondary:
    "text-white border border-transparent " +
    "bg-[var(--accentSecondary)] hover:bg-[var(--accentSecondaryHover)] " +
    "active:bg-[var(--accentSecondaryPressed)] disabled:bg-[var(--accentSecondaryDisabled)]",
  common:
    "text-[var(--black)] [border:var(--standardBorder)] " +
    "bg-[var(--accentCommon)] hover:bg-[var(--accentCommonHover)] " +
    "active:bg-[var(--accentCommonPressed)] disabled:bg-[var(--accentCommonDisabled)]",
  cancel:
    "text-[var(--black)] [border:var(--standardBorder)] " +
    "bg-[var(--accentCancel)] hover:bg-[var(--accentCancelHover)] " +
    "active:bg-[var(--accentCancelPressed)] disabled:bg-[var(--accentCancelDisabled)]",
  danger:
    "text-white [border:var(--standardBorder)] " +
    "bg-[var(--accentDanger)] hover:bg-[var(--accentDangerHover)] " +
    "active:bg-[var(--accentDangerPressed)] disabled:bg-[var(--accentDangerDisabled)]",
  outline:
    "text-[var(--black)] [border:var(--standardBorder)] " +
    "bg-transparent hover:bg-[#f9f9f9] active:bg-[#f2f2f2] disabled:bg-[#fbfbfb]",
  link:
    "h-auto px-0 bg-transparent border-0 underline-offset-4 " +
    "text-[var(--accentPrimary)] hover:underline",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      className,
      disabled,
      children,
      loaderColor,
      type = "button",
      ...rest
    },
    ref
  ) => {
    const width = fullWidth ? "w-full" : "";
    const classes = cn(base, sizes[size], variants[variant], width, className);

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...rest}
      >
        {isLoading ? <InlineLoader color={loaderColor} /> : children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
