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

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = "default",
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

    const valueStr =
      typeof rest.value === "string"
        ? (rest.value as string)
        : typeof rest.defaultValue === "string"
        ? (rest.defaultValue as string)
        : "";
    const canClear =
      !isPassword &&
      !isLoading &&
      !rest.disabled &&
      typeof rest.onChange === "function" &&
      valueStr.length > 0 &&
      (type === "text" ||
        type === "search" ||
        type === "email" ||
        type === "tel" ||
        type === "url");

    const rightPadClass = useMemo(() => {
      if (isPassword && canClear) return "pr-16";
      if (isPassword || canClear || isLoading) return "pr-10";
      return "pr-3.5";
    }, [isPassword, canClear, isLoading]);

    const baseInput =
      "w-full h-10 text-xs text-gray-900 rounded-md outline-none transition-colors duration-150 " +
      "placeholder:text-gray-400 border bg-white " +
      "hover:bg-gray-50 focus:bg-gray-50 focus-visible:ring-1 focus-visible:ring-gray-300 " +
      "disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed " +
      "disabled:hover:bg-gray-100 disabled:focus:bg-gray-100 disabled:focus-visible:ring-0 " +
      "px-3 py-2.5";

    const variantClasses: Record<Variant, string> = {
      default: "border-gray-300",
      outlined: "border-2 border-gray-300 focus-visible:ring-0",
      filled: "bg-gray-50 border border-transparent focus:border-gray-300",
    };

    const inputClasses = classNames(
      baseInput,
      rightPadClass,
      variantClasses[variant as Variant] ?? variantClasses.default,
      errorMessage && "border-red-500 focus:border-red-500 focus-visible:ring-red-200"
    );

    const togglePasswordVisibility = () => setIsPasswordVisible((v) => !v);

    const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && (rest).formNoValidate) e.preventDefault();
    };

    const errorId = errorMessage ? `${id}-err` : undefined;

    const onClear = () => {
      const onChange = rest.onChange as React.ChangeEventHandler<HTMLInputElement> | undefined;
      if (onChange) {
        const name = (rest).name ?? "";
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
          <label htmlFor={id} className="text-[10.5px] font-semibold text-gray-700 select-none">
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
            disabled={isLoading || rest.disabled}
            onKeyDown={handleKeyDown}
            {...rest}
          />

          {/* Trailing controls */}
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-1">
            {isLoading && (
              <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
                <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            )}

            {canClear && (
              <button
                type="button"
                onClick={onClear}
                onMouseDown={(e) => e.preventDefault()}
                className="pointer-events-auto p-1 rounded hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                aria-label="Clear"
                tabIndex={-1}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-gray-500"
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
                className="pointer-events-auto p-1 rounded hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                disabled={isLoading}
                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                aria-pressed={isPasswordVisible}
                tabIndex={-1}
              >
                {isPasswordVisible ? (
                  <img src={notVisible} alt="" width={18} height={18} />
                ) : (
                  <img src={visible} alt="" width={18} height={18} />
                )}
              </button>
            )}
          </div>
        </div>

        {errorMessage ? (
          <span id={errorId} className="text-red-600 text-[11px] leading-tight">
            {errorMessage}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
