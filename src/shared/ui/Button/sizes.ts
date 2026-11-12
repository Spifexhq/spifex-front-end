// src/components/ui/sizes.ts
import type { ButtonSize, ButtonVariant } from "./Button.types";

export const BUTTON_BASE =
  "inline-flex select-none items-center justify-center rounded-md font-medium " +
  "transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export const BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-[11px]",
  sm: "h-8 px-3 text-xs",
  md: "h-8 px-4 text-[13px]",
  lg: "h-10 px-6 text-base",
  xl: "h-11 px-7 text-base",
  iconSm: "h-8 w-8 p-0",
  iconMd: "h-10 w-10 p-0",
  iconLg: "h-12 w-12 p-0",
};

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "text-[var(--black)] border border-transparent " +
    "bg-[var(--accentPrimary)] hover:bg-[var(--accentPrimaryHover)] " +
    "active:bg-[var(--accentPrimaryPressed)] disabled:bg-[var(--accentPrimaryDisabled)]",

  common:
    "text-[var(--black)] [border:var(--controlBorder)] " +
    "bg-[var(--accentCommon)] hover:bg-[var(--accentCommonHover)] " +
    "active:bg-[var(--accentCommonPressed)] disabled:bg-[var(--accentCommonDisabled)]",

  cancel:
    "text-[var(--black)] [border:var(--controlBorder)] " +
    "bg-[var(--accentCancel)] hover:bg-[var(--accentCancelHover)] " +
    "active:bg-[var(--accentCancelPressed)] disabled:bg-[var(--accentCancelDisabled)]",

  danger:
    "text-white [border:var(--controlBorder)] " +
    "bg-[var(--accentDanger)] hover:bg-[var(--accentDangerHover)] " +
    "active:bg-[var(--accentDangerPressed)] disabled:bg-[var(--accentDangerDisabled)]",

  outline:
    "text-[var(--black)] [border:var(--controlBorder)] " +
    "bg-transparent hover:bg-[#f9f9f9] active:bg-[#f2f2f2] disabled:bg-[#fbfbfb]",

  outlineBlack:
    "text-white [border:var(--controlBorder)] " +
    "bg-black hover:bg-[#1b1b1b] active:bg-[#242124] disabled:bg-[#fbfbfb] disabled:text-[var(--black)]",

  ghost:
    "bg-transparent border border-transparent text-[var(--black)] " +
    "hover:bg-black/5 active:bg-black/10",

  muted:
    "text-gray-700 [border:var(--controlBorder)] " +
    "bg-gray-100 hover:bg-gray-200 active:bg-gray-300",
};
