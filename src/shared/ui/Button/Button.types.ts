// src/shared/ui/Button/Button.types.ts
import * as React from "react";

/**
 * Minimal button set shared by the whole product.
 *
 * - `primary`     solid black, one per screen (Stripe-style main action)
 * - `secondary`   white with border, supporting actions
 * - `ghost`       transparent, hover only, inline/tertiary actions
 * - `danger`      solid red, destructive confirmation
 * - `dangerSoft`  white with red text, destructive secondary action
 * - `accent`      brand orange, reserved for shared components (never pages)
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "dangerSoft"
  | "accent";

export type ButtonSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "iconSm"
  | "iconMd"
  | "iconLg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  /**
   * Disables the button without the dimmed "unavailable" look. Use it when the
   * button is only paused by a background refresh (filters, tabs, polling), not
   * when the action is genuinely unavailable.
   */
  quietDisabled?: boolean;
  fullWidth?: boolean;
}
