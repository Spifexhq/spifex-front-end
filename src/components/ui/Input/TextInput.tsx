import {
  forwardRef,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import classNames from "classnames";

import type { InputVariant, InputSize, TextInputProps } from "./Input.types";
import { INPUT_SIZE } from "./sizes";

import visible from "@/assets/Icons/password/visible.svg";
import notVisible from "@/assets/Icons/password/not-visible.svg";

const VARIANT: Record<InputVariant, string> = {
  default: "border-gray-300",
  outlined: "border-2 border-gray-300 focus-visible:ring-0",
  filled: "bg-gray-50 border border-transparent focus:border-gray-300",
};

const BASE =
  "w-full max-w-full min-w-0 text-gray-900 outline-none transition-colors duration-150 " +
  "placeholder:text-gray-400 border bg-white " +
  "hover:bg-gray-50 focus:bg-gray-50 focus-visible:ring-1 focus-visible:ring-gray-300 " +
  "disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed " +
  "disabled:hover:bg-gray-100 disabled:focus:bg-gray-100 disabled:focus-visible:ring-0";

const TextInput = forwardRef<HTMLInputElement, TextInputProps>((props, ref) => {
  const {
    variant = "default",
    size = "md",
    label,
    errorMessage,
    style,
    className,
    showTogglePassword = false,
    type = "text",
    isLoading = false,
    ...rest
  } = props;

  const autoId = useId();
  const id = rest.id ?? autoId;

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isPassword = showTogglePassword && type === "password";
  const inputType = isPassword ? (isPasswordVisible ? "text" : "password") : type;

  const { autoComplete: rawAutoComplete, ...restProps } =
    rest as Omit<TextInputProps, "variant" | "size" | "label" | "errorMessage" | "showTogglePassword">;

  const derivedAutoComplete =
    type === "password" || type === "email" ? "off" : (rawAutoComplete as string | undefined);

  const valueStr =
    typeof (restProps as { value?: unknown }).value === "string"
      ? ((restProps as { value?: string }).value ?? "")
      : typeof (restProps as { defaultValue?: unknown }).defaultValue === "string"
      ? ((restProps as { defaultValue?: string }).defaultValue ?? "")
      : "";

  const canClear =
    !isPassword &&
    !isLoading &&
    !restProps.disabled &&
    typeof (restProps as { onChange?: unknown }).onChange === "function" &&
    valueStr.length > 0 &&
    (type === "text" ||
      type === "search" ||
      type === "email" ||
      type === "tel" ||
      type === "url");

  const sz = INPUT_SIZE[size as InputSize];

  const rightPadClass = useMemo(() => {
    if (isPassword && canClear) return sz.rightPadTwo;
    if (isPassword || canClear || isLoading) return sz.rightPadOne;
    return sz.rightPadNone;
  }, [isPassword, canClear, isLoading, sz]);

  const inputClasses = classNames(
    BASE,
    sz.inputBox,
    rightPadClass,
    VARIANT[variant] ?? VARIANT.default,
    errorMessage && "border-red-500 focus:border-red-500 focus-visible:ring-red-200",
    className
  );

  const togglePasswordVisibility = () => setIsPasswordVisible((v) => !v);

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    // Preserve user handlers
    (restProps as { onKeyDown?: (e: ReactKeyboardEvent<HTMLInputElement>) => void }).onKeyDown?.(e);
  };

  const errorId = errorMessage ? `${id}-err` : undefined;

  const onClear = () => {
    const onChange = (restProps as { onChange?: React.ChangeEventHandler<HTMLInputElement> }).onChange;
    if (!onChange) return;

    const name = (restProps as { name?: string }).name ?? "";
    const synthetic = {
      target: { name, value: "" },
      currentTarget: { name, value: "" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    onChange(synthetic);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full min-w-0" style={style}>
      {label ? (
        <label
          htmlFor={id}
          className={classNames("font-semibold text-gray-700 select-none", sz.label)}
        >
          {label}
        </label>
      ) : null}

      <div className="relative w-full min-w-0">
        <input
          id={id}
          ref={ref}
          type={inputType}
          className={inputClasses}
          aria-invalid={!!errorMessage}
          aria-describedby={errorId}
          disabled={isLoading || restProps.disabled}
          onKeyDown={handleKeyDown}
          {...(restProps as Record<string, unknown>)}
          autoComplete={derivedAutoComplete}
        />

        <div
          className={classNames(
            "pointer-events-none absolute inset-y-0 flex items-center",
            sz.trailingRight,
            sz.trailingGap
          )}
        >
          {isLoading && (
            <svg
              className={classNames("animate-spin text-gray-400", sz.icon)}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                opacity="0.25"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          )}

          {canClear && (
            <button
              type="button"
              onClick={onClear}
              onMouseDown={(e) => e.preventDefault()}
              className={classNames(
                "pointer-events-auto rounded hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300",
                sz.trailingBtnPad
              )}
              aria-label="Clear"
              tabIndex={-1}
            >
              <svg
                viewBox="0 0 24 24"
                className={classNames("text-gray-500", sz.icon)}
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
                sz.trailingBtnPad
              )}
              disabled={isLoading}
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              aria-pressed={isPasswordVisible}
              tabIndex={-1}
            >
              {isPasswordVisible ? (
                <img src={notVisible} alt="" width={sz.pwIcon.w} height={sz.pwIcon.h} />
              ) : (
                <img src={visible} alt="" width={sz.pwIcon.w} height={sz.pwIcon.h} />
              )}
            </button>
          )}
        </div>
      </div>

      {errorMessage ? (
        <span id={errorId} className={classNames("text-red-600 leading-tight", sz.error)}>
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
});

TextInput.displayName = "TextInput";
export default TextInput;
