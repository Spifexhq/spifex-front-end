// src/components/ui/Button.tsx
import * as React from "react";
import { ButtonProps } from "./Button.types";
import { BUTTON_BASE, BUTTON_SIZES, BUTTON_VARIANTS } from "./sizes";

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

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
      children,
      ...rest
    },
    ref
  ) => {
    const width = fullWidth ? "w-full" : "";
    const classes = cn(
      BUTTON_BASE,
      BUTTON_SIZES[size],
      BUTTON_VARIANTS[variant],
      width,
      className
    );

    return (
      <button
        ref={ref}
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