// src/shared/ui/Button/sizes.ts
import type { ButtonSize, ButtonVariant } from "./Button.types";

export const BUTTON_BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap " +
  "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 " +
  "disabled:cursor-not-allowed";

/** Dimming is opt-in through the component so background work can stay quiet. */
export const BUTTON_DISABLED = "disabled:opacity-50";

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
    "border border-transparent bg-gray-900 text-white " +
    "hover:bg-gray-800 active:bg-black",

  secondary:
    "border border-gray-300 bg-white text-gray-900 " +
    "hover:bg-gray-50 active:bg-gray-100",

  ghost:
    "border border-transparent bg-transparent text-gray-700 " +
    "hover:bg-gray-100 active:bg-gray-200",

  danger:
    "border border-transparent bg-red-600 text-white " +
    "hover:bg-red-700 active:bg-red-800",

  dangerSoft:
    "border border-red-200 bg-white text-red-600 " +
    "hover:bg-red-50 active:bg-red-100",

  /** Brand orange. Shared components only — pages use `primary` instead. */
  accent:
    "border border-transparent bg-[var(--accentPrimary)] text-white " +
    "hover:bg-[var(--accentPrimaryHover)] active:bg-[var(--accentPrimaryPressed)]",
};
