// src/components/ui/Button.tsx
import * as React from "react";
import { ButtonProps } from "./Button.types";
import { BUTTON_BASE, BUTTON_DISABLED, BUTTON_SIZES, BUTTON_VARIANTS } from "./sizes";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      quietDisabled = false,
      fullWidth = false,
      className,
      disabled,
      type = "button",
      children,
      ...rest
    },
    ref
  ) => {
    const width = fullWidth ? "w-full" : "";
    // Loading is a pause, not an unavailable action: keep the normal look and
    // only block interaction. `quietDisabled` extends that to background
    // refreshes (filters, tabs, polling).
    const dim = !quietDisabled && !isLoading;
    const classes = cn(
      BUTTON_BASE,
      BUTTON_SIZES[size],
      BUTTON_VARIANTS[variant],
      dim && BUTTON_DISABLED,
      width,
      className
    );

    return (
      <button
        ref={ref}
        data-ui="button"
        data-variant={variant}
        type={type}
        className={classes}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...rest}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
