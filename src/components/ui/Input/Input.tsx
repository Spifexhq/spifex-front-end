import {
  useId,
  useState,
  forwardRef,
  KeyboardEvent as ReactKeyboardEvent,
  useMemo,
} from "react";
import classNames from "classnames";
import type { InputProps } from "./Input.types";
import visible from "@/assets/Icons/password/visible.svg";
import notVisible from "@/assets/Icons/password/not-visible.svg";

type Variant = "default" | "outlined" | "filled";

/** Button-like sizing */
export type InputSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE: Record<
  InputSize,
  {
    inputBox: string;        // controls height + font + base padding (left)
    label: string;           // label text size (optional)
    error: string;           // error text size (optional)
    icon: string;            // svg icon size (clear/spinner)
    pwIcon: { w: number; h: number }; // password img sizes
    trailingRight: string;   // absolute right positioning
    trailingGap: string;     // gap between trailing controls
    trailingBtnPad: string;  // padding for trailing buttons
    rightPadNone: string;    // when no trailing controls
    rightPadOne: string;     // when one trailing control
    rightPadTwo: string;     // when two trailing controls (password + clear)
  }
> = {
  xs: {
    inputBox: "h-7 text-[11px] px-2.5 py-1.5",
    label: "text-[10px]",
    error: "text-[10px]",
    icon: "h-3.5 w-3.5",
    pwIcon: { w: 16, h: 16 },
    trailingRight: "right-1.5",
    trailingGap: "gap-0.5",
    trailingBtnPad: "p-0.5",
    rightPadNone: "pr-2.5",
    rightPadOne: "pr-8",
    rightPadTwo: "pr-12",
  },
  sm: {
    inputBox: "h-8 text-xs px-3 py-2",
    label: "text-[10.5px]",
    error: "text-[11px]",
    icon: "h-4 w-4",
    pwIcon: { w: 18, h: 18 },
    trailingRight: "right-2",
    trailingGap: "gap-1",
    trailingBtnPad: "p-1",
    rightPadNone: "pr-3",
    rightPadOne: "pr-10",
    rightPadTwo: "pr-16",
  },
  md: {
    // ✅ Keep your current input feel as default
    inputBox: "h-10 text-xs px-3 py-2.5",
    label: "text-[10.5px]",
    error: "text-[11px]",
    icon: "h-4 w-4",
    pwIcon: { w: 18, h: 18 },
    trailingRight: "right-2",
    trailingGap: "gap-1",
    trailingBtnPad: "p-1",
    rightPadNone: "pr-3.5",
    rightPadOne: "pr-10",
    rightPadTwo: "pr-16",
  },
  lg: {
    inputBox: "h-11 text-[13px] px-4 py-3",
    label: "text-[11px]",
    error: "text-[12px]",
    icon: "h-4 w-4",
    pwIcon: { w: 20, h: 20 },
    trailingRight: "right-2.5",
    trailingGap: "gap-1.5",
    trailingBtnPad: "p-1",
    rightPadNone: "pr-4",
    rightPadOne: "pr-11",
    rightPadTwo: "pr-[4.25rem]",
  },
  xl: {
    inputBox: "h-12 text-[15px] px-5 py-3.5",
    label: "text-[12px]",
    error: "text-[12.5px]",
    icon: "h-5 w-5",
    pwIcon: { w: 22, h: 22 },
    trailingRight: "right-3",
    trailingGap: "gap-2",
    trailingBtnPad: "p-1.5",
    rightPadNone: "pr-5",
    rightPadOne: "pr-12",
    rightPadTwo: "pr-[4.75rem]",
  },
};

const Input = forwardRef<HTMLInputElement, InputProps & { size?: InputSize }>(
  (
    {
      variant = "default",
      size = "md",
      label,
      errorMessage,
      style,
      showTogglePassword = false,
      type = "text",
      isLoading = false,
      ...rest
    },
    ref
  ) => {
    const id = useId();
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const isPassword = showTogglePassword && type === "password";
    const inputType = isPassword ? (isPasswordVisible ? "text" : "password") : type;

    // Extract autoComplete so we can override for email/password
    const { autoComplete: _ignoredAutoComplete, ...restProps } =
      rest as React.InputHTMLAttributes<HTMLInputElement>;

    const derivedAutoComplete =
      type === "password" || type === "email"
        ? "off" // 🔒 NEVER let browser autofill password/email
        : _ignoredAutoComplete;

    const valueStr =
      typeof restProps.value === "string"
        ? (restProps.value as string)
        : typeof restProps.defaultValue === "string"
        ? (restProps.defaultValue as string)
        : "";

    const canClear =
      !isPassword &&
      !isLoading &&
      !restProps.disabled &&
      typeof restProps.onChange === "function" &&
      valueStr.length > 0 &&
      (type === "text" ||
        type === "search" ||
        type === "email" ||
        type === "tel" ||
        type === "url");

    const rightPadClass = useMemo(() => {
      // Two controls (password + clear)
      if (isPassword && canClear) return SIZE[size].rightPadTwo;
      // One control (password OR clear OR loading)
      if (isPassword || canClear || isLoading) return SIZE[size].rightPadOne;
      // None
      return SIZE[size].rightPadNone;
    }, [isPassword, canClear, isLoading, size]);

    const baseInput =
      "w-full text-gray-900 rounded-md outline-none transition-colors duration-150 " +
      "placeholder:text-gray-400 border bg-white " +
      "hover:bg-gray-50 focus:bg-gray-50 focus-visible:ring-1 focus-visible:ring-gray-300 " +
      "disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed " +
      "disabled:hover:bg-gray-100 disabled:focus:bg-gray-100 disabled:focus-visible:ring-0";

    const variantClasses: Record<Variant, string> = {
      default: "border-gray-300",
      outlined: "border-2 border-gray-300 focus-visible:ring-0",
      filled: "bg-gray-50 border border-transparent focus:border-gray-300",
    };

    const inputClasses = classNames(
      baseInput,
      SIZE[size].inputBox,
      rightPadClass,
      variantClasses[variant as Variant] ?? variantClasses.default,
      errorMessage && "border-red-500 focus:border-red-500 focus-visible:ring-red-200"
    );

    const togglePasswordVisibility = () => setIsPasswordVisible((v) => !v);

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && (restProps).formNoValidate) e.preventDefault();
    };

    const errorId = errorMessage ? `${id}-err` : undefined;

    const onClear = () => {
      const onChange = restProps.onChange as
        | React.ChangeEventHandler<HTMLInputElement>
        | undefined;
      if (onChange) {
        const name = (restProps).name ?? "";
        const synthetic = {
          target: { name, value: "" },
          currentTarget: { name, value: "" },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(synthetic);
      }
    };

    return (
      <div className="flex flex-col gap-1.5" style={style}>
        {label ? (
          <label
            htmlFor={id}
            className={classNames(
              "font-semibold text-gray-700 select-none",
              SIZE[size].label
            )}
          >
            {label}
          </label>
        ) : null}

        <div className="relative">
          <input
            id={id}
            ref={ref}
            type={inputType}
            className={inputClasses}
            aria-invalid={!!errorMessage}
            aria-describedby={errorId}
            disabled={isLoading || restProps.disabled}
            onKeyDown={handleKeyDown}
            {...restProps}
            autoComplete={derivedAutoComplete}
          />

          {/* Trailing controls */}
          <div
            className={classNames(
              "pointer-events-none absolute inset-y-0 flex items-center",
              SIZE[size].trailingRight,
              SIZE[size].trailingGap
            )}
          >
            {isLoading && (
              <svg
                className={classNames("animate-spin text-gray-400", SIZE[size].icon)}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            )}

            {canClear && (
              <button
                type="button"
                onClick={onClear}
                onMouseDown={(e) => e.preventDefault()}
                className={classNames(
                  "pointer-events-auto rounded hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300",
                  SIZE[size].trailingBtnPad
                )}
                aria-label="Clear"
                tabIndex={-1}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={classNames("text-gray-500", SIZE[size].icon)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {isPassword && (
              <button
                type="button"
                onClick={togglePasswordVisibility}
                onMouseDown={(e) => e.preventDefault()}
                className={classNames(
                  "pointer-events-auto rounded hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300",
                  SIZE[size].trailingBtnPad
                )}
                disabled={isLoading}
                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                aria-pressed={isPasswordVisible}
                tabIndex={-1}
              >
                {isPasswordVisible ? (
                  <img
                    src={notVisible}
                    alt=""
                    width={SIZE[size].pwIcon.w}
                    height={SIZE[size].pwIcon.h}
                  />
                ) : (
                  <img
                    src={visible}
                    alt=""
                    width={SIZE[size].pwIcon.w}
                    height={SIZE[size].pwIcon.h}
                  />
                )}
              </button>
            )}
          </div>
        </div>

        {errorMessage ? (
          <span
            id={errorId}
            className={classNames(
              "text-red-600 leading-tight",
              SIZE[size].error
            )}
          >
            {errorMessage}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
