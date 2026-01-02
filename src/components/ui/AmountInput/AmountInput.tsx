import React, { forwardRef, useCallback, useId, useMemo } from "react";
import classNames from "classnames";
import type { AmountInputProps, AmountInputSize, AmountInputVariant } from "./AmountInput.types";
import {
  formatCurrency,
  formatMajorNumber,
  toCanonicalMajorString,
} from "@/lib/currency/formatCurrency";

const SHORTCUT_KEYS = new Set(["a", "c", "v", "x", "z", "y"]);
const NAV_KEYS = new Set(["Tab", "ArrowLeft", "ArrowRight", "Home", "End"]);

function digitsOnly(v: string) {
  return String(v ?? "").replace(/\D/g, "");
}

/** "123456" => "1234.56" */
function centsDigitsToMajorFixed(centsDigits: string): string {
  const d = digitsOnly(centsDigits);
  if (!d) return "";

  const padded = d.padStart(3, "0");
  const intPart = padded.slice(0, -2).replace(/^0+(?=\d)/, "") || "0";
  const fracPart = padded.slice(-2);
  return `${intPart}.${fracPart}`;
}

/** "-1234.56" => "123456" (string-based) */
function majorToCentsDigits(major: string): string {
  const canonical = toCanonicalMajorString(major);
  if (!canonical) return "";
  const unsigned = canonical.startsWith("-") ? canonical.slice(1) : canonical;
  return unsigned.replace(".", "");
}

function isZeroLikeMajor(v: string) {
  const c = toCanonicalMajorString(v);
  return !c || c === "0.00" || c === "-0.00";
}

function appendDigit(centsDigits: string, digitChar: string) {
  const clean = digitsOnly(centsDigits);
  const next = (clean + digitChar).replace(/^0+(?=\d)/, "");
  return next;
}

function dropLastDigit(centsDigits: string) {
  const clean = digitsOnly(centsDigits);
  return clean.slice(0, -1);
}

/* ------------------------------ Sizing -------------------------------- */

const SIZE: Record<
  AmountInputSize,
  {
    inputBox: string;
    label: string;
    error: string;

    icon: string;
    trailingRight: string;
    trailingGap: string;
    trailingBtnPad: string;

    rightPadNone: string;
    rightPadOne: string;
    rightPadTwo: string;
  }
> = {
  xs: {
    inputBox: "h-7 text-[11px] px-2.5 py-1.5 rounded-md",
    label: "text-[10px]",
    error: "text-[10px]",

    icon: "h-3.5 w-3.5",
    trailingRight: "right-1.5",
    trailingGap: "gap-0.5",
    trailingBtnPad: "p-0.5",

    rightPadNone: "pr-2.5",
    rightPadOne: "pr-8",
    rightPadTwo: "pr-12",
  },
  sm: {
    inputBox: "h-8 text-xs px-3 py-2 rounded-md",
    label: "text-[10.5px]",
    error: "text-[11px]",

    icon: "h-4 w-4",
    trailingRight: "right-2",
    trailingGap: "gap-1",
    trailingBtnPad: "p-1",

    rightPadNone: "pr-3",
    rightPadOne: "pr-10",
    rightPadTwo: "pr-16",
  },
  md: {
    // ✅ keep current look
    inputBox: "h-10 text-xs px-3 py-2.5 rounded-md",
    label: "text-[10.5px]",
    error: "text-[11px]",

    icon: "h-4 w-4",
    trailingRight: "right-2",
    trailingGap: "gap-1",
    trailingBtnPad: "p-1",

    rightPadNone: "pr-3.5",
    rightPadOne: "pr-10",
    rightPadTwo: "pr-16",
  },
  lg: {
    inputBox: "h-11 text-[13px] px-4 py-3 rounded-lg",
    label: "text-[11px]",
    error: "text-[12px]",

    icon: "h-4 w-4",
    trailingRight: "right-2.5",
    trailingGap: "gap-1.5",
    trailingBtnPad: "p-1",

    rightPadNone: "pr-4",
    rightPadOne: "pr-11",
    rightPadTwo: "pr-[4.25rem]",
  },
  xl: {
    inputBox: "h-12 text-[15px] px-5 py-3.5 rounded-xl",
    label: "text-[12px]",
    error: "text-[12.5px]",

    icon: "h-5 w-5",
    trailingRight: "right-3",
    trailingGap: "gap-2",
    trailingBtnPad: "p-1.5",

    rightPadNone: "pr-5",
    rightPadOne: "pr-12",
    rightPadTwo: "pr-[4.75rem]",
  },
};

/* ------------------------------ Component ------------------------------ */

const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  (
    {
      variant = "default",
      size = "md",

      label,
      errorMessage,
      style,

      isLoading = false,

      display = "currency",
      zeroAsEmpty = false,
      currency,
      value,
      onValueChange,
      allowNegative = false,

      ...rest
    },
    ref
  ) => {
    const autoId = useId();

    // Prefer explicit id, otherwise use generated one
    const inputId = rest.id ?? autoId;

    const disabled = rest.disabled ?? false;
    const placeholder = rest.placeholder;

    const centsDigits = useMemo(() => majorToCentsDigits(value), [value]);

    const displayValue = useMemo(() => {
      if (!value) return "";
      if (zeroAsEmpty && isZeroLikeMajor(value)) return "";
      return display === "currency"
        ? formatCurrency(value, currency)
        : formatMajorNumber(value);
    }, [value, zeroAsEmpty, display, currency]);

    const resolvedPlaceholder =
      placeholder == null || placeholder === ""
        ? display === "currency"
          ? formatCurrency("0.00", currency)
          : formatMajorNumber("0.00")
        : placeholder;

    const canClear =
      !isLoading &&
      !disabled &&
      typeof onValueChange === "function" &&
      !!value &&
      !(zeroAsEmpty && isZeroLikeMajor(value));

    const sz = SIZE[size];

    const rightPadClass = useMemo(() => {
      if (canClear && isLoading) return sz.rightPadTwo;
      if (canClear || isLoading) return sz.rightPadOne;
      return sz.rightPadNone;
    }, [canClear, isLoading, sz]);

    const baseInput =
      "w-full text-gray-900 outline-none transition-colors duration-150 " +
      "placeholder:text-gray-400 border bg-white " +
      "hover:bg-gray-50 focus:bg-gray-50 focus-visible:ring-1 focus-visible:ring-gray-300 " +
      "disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed " +
      "disabled:hover:bg-gray-100 disabled:focus:bg-gray-100 disabled:focus-visible:ring-0";

    const variantClasses: Record<AmountInputVariant, string> = {
      default: "border-gray-300",
      outlined: "border-2 border-gray-300 focus-visible:ring-0",
      filled: "bg-gray-50 border border-transparent focus:border-gray-300",
    };

    const inputClasses = classNames(
      baseInput,
      sz.inputBox,
      rightPadClass,
      variantClasses[variant] ?? variantClasses.default,
      errorMessage && "border-red-500 focus:border-red-500 focus-visible:ring-red-200"
    );

    const emitMajor = useCallback(
      (major: string) => {
        const canonical = toCanonicalMajorString(major);
        if (zeroAsEmpty && (!canonical || canonical === "0.00" || canonical === "-0.00")) {
          onValueChange("");
          return;
        }
        onValueChange(canonical || "");
      },
      [onValueChange, zeroAsEmpty]
    );

    const emitFromCentsDigits = useCallback(
      (nextDigits: string) => {
        const fixed = centsDigitsToMajorFixed(nextDigits);
        emitMajor(fixed);
      },
      [emitMajor]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        // allow cmd/ctrl shortcuts (copy/paste/select-all, etc.)
        if ((e.ctrlKey || e.metaKey) && !e.altKey) {
          const k = e.key.toLowerCase();
          if (SHORTCUT_KEYS.has(k)) return;
        }

        if (NAV_KEYS.has(e.key)) return;

        // Optional: toggle negative with "-"
        if (allowNegative && (e.key === "-" || e.key === "Subtract")) {
          e.preventDefault();
          if (!value) {
            emitMajor("-0.00");
            return;
          }
          emitMajor(value.startsWith("-") ? value.slice(1) : `-${value}`);
          return;
        }

        // Shift-decimal digit typing
        if (/^\d$/.test(e.key)) {
          e.preventDefault();
          const nextDigits = appendDigit(centsDigits, e.key);
          emitFromCentsDigits(nextDigits);
          return;
        }

        if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          const nextDigits = dropLastDigit(centsDigits);
          emitFromCentsDigits(nextDigits);
          return;
        }

        // block everything else (keeps formatting stable)
        e.preventDefault();
      },
      [allowNegative, centsDigits, emitFromCentsDigits, emitMajor, value]
    );

    const handlePaste = useCallback(
      (e: React.ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData("text");
        if (!text) return;
        e.preventDefault();
        emitMajor(text);
      },
      [emitMajor]
    );

    /**
     * Fallback handler for mouse edits / autofill / mobile IME.
     * Accepts loose input and normalizes to canonical major.
     */
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = String(e.target.value ?? "").trim();
        if (!raw) {
          onValueChange("");
          return;
        }
        emitMajor(raw);
      },
      [emitMajor, onValueChange]
    );

    const errorId = errorMessage ? `${inputId}-err` : undefined;

    return (
      <div className="flex flex-col gap-1.5" style={style}>
        {label ? (
          <label
            htmlFor={inputId}
            className={classNames("font-semibold text-gray-700 select-none", sz.label)}
          >
            {label}
          </label>
        ) : null}

        <div className="relative">
          <input
            {...rest} // ✅ safe: our props omit native numeric `size`, and we already consumed token `size`
            id={inputId}
            ref={ref}
            type="text"
            className={inputClasses}
            aria-invalid={!!errorMessage}
            aria-describedby={errorId}
            disabled={isLoading || disabled}
            value={displayValue}
            placeholder={resolvedPlaceholder}
            inputMode="decimal"
            autoComplete="off"
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onChange={handleChange}
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
                onClick={() => onValueChange("")}
                onMouseDown={(ev) => ev.preventDefault()}
                className={classNames(
                  "pointer-events-auto rounded hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300",
                  sz.trailingBtnPad
                )}
                aria-label="Clear amount"
                tabIndex={-1}
                disabled={isLoading || disabled}
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
          </div>
        </div>

        {errorMessage ? (
          <span id={errorId} className={classNames("text-red-600 leading-tight", sz.error)}>
            {errorMessage}
          </span>
        ) : null}
      </div>
    );
  }
);

AmountInput.displayName = "AmountInput";
export default AmountInput;
