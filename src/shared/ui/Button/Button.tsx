// src/components/ui/Button.tsx
import * as React from "react";
import { ButtonProps, ButtonSize, ButtonVariant } from "./Button.types";

// Helper simples sem dependências externas
function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

/* Base consistente com o projeto */
const base =
  "inline-flex select-none items-center justify-center rounded-md font-medium " +
  "transition-colors focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-offset-2 focus-visible:ring-[color:var(--accentPrimary)] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

/* Tamanhos (inclui xs/xl e ícone-only) */
const sizes: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-[11px]",
  sm: "h-8 px-3 text-xs",
  md: "h-8 px-4 text-[13px]",
  lg: "h-10 px-6 text-base",
  xl: "h-11 px-7 text-[17px]",
  iconSm: "h-8 w-8 p-0",
  iconMd: "h-10 w-10 p-0",
  iconLg: "h-12 w-12 p-0",
};

/* Variantes (mantém as originais e adiciona várias novas) */
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
  outlineBlack:
    "text-[var(--black)] [border:var(--standardBorder)] " +
    "bg-black text-white hover:bg-[#1b1b1b] active:bg-[#242124] disabled:bg-[#fbfbfb]",
  link:
    "h-auto px-0 bg-transparent border-0 underline-offset-4 " +
    "text-[var(--accentPrimary)] hover:underline",
  outlinePrimary:
    "bg-transparent border border-[color:var(--accentPrimary)] " +
    "text-[color:var(--accentPrimary)] hover:bg-[#f4f7ff] active:bg-[#edf2ff]",
  outlineDanger:
    "bg-transparent border border-[color:var(--accentDanger)] " +
    "text-[color:var(--accentDanger)] hover:bg-[#fff1f1] active:bg-[#ffe4e4]",
  ghost:
    "bg-transparent border border-transparent text-[var(--black)] " +
    "hover:bg-black/5 active:bg-black/10",
  softPrimary:
    "text-[color:var(--accentPrimary)] [border:var(--standardBorder)] " +
    "bg-[#f4f7ff] hover:bg-[#edf2ff] active:bg-[#e6eeff]",
  muted:
    "text-gray-700 [border:var(--standardBorder)] " +
    "bg-gray-100 hover:bg-gray-200 active:bg-gray-300",
  success:
    "text-white [border:var(--standardBorder)] " +
    "bg-[var(--accentSuccess)] hover:bg-[var(--accentSuccessHover)] " +
    "active:bg-[var(--accentSuccessPressed)] disabled:bg-[var(--accentSuccessDisabled)]",
  warning:
    "text-[#1d1d1f] [border:var(--standardBorder)] " +
    "bg-[var(--accentWarning)] hover:bg-[var(--accentWarningHover)] " +
    "active:bg-[var(--accentWarningPressed)] disabled:bg-[var(--accentWarningDisabled)]",
  info:
    "text-white [border:var(--standardBorder)] " +
    "bg-[var(--accentInfo)] hover:bg-[var(--accentInfoHover)] " +
    "active:bg-[var(--accentInfoPressed)] disabled:bg-[var(--accentInfoDisabled)]",
  dashed:
    "bg-transparent border-2 border-dashed border-[color:var(--accentPrimary)] " +
    "text-[color:var(--accentPrimary)] hover:bg-[#f9fbff] active:bg-[#f1f6ff]",
  gradient:
    "text-white border border-transparent " +
    "bg-[linear-gradient(135deg,var(--accentPrimary),var(--accentSecondary))] " +
    "hover:opacity-90 active:opacity-80",
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
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
