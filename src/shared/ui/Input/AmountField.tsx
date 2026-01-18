import React, { forwardRef, useCallback, useId, useMemo } from "react";
import classNames from "classnames";

import type { AmountInputProps, InputVariant, InputSize } from "./Input.types";
import { INPUT_SIZE } from "./sizes";

import { formatCurrency, formatMajorNumber, toCanonicalMajorString } from "@/lib/currency/formatCurrency";

const SHORTCUT_KEYS = new Set(["a", "c", "v", "x", "z", "y"]);
const NAV_KEYS = new Set(["Tab", "ArrowLeft", "ArrowRight", "Home", "End"]);

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

function digitsOnly(v: string) {
  return String(v ?? "").replace(/\D/g, "");
}

function centsDigitsToMajorFixed(centsDigits: string): string {
  const d = digitsOnly(centsDigits);
  if (!d) return "";

  const padded = d.padStart(3, "0");
  const intPart = padded.slice(0, -2).replace(/^0+(?=\d)/, "") || "0";
  const fracPart = padded.slice(-2);
  return `${intPart}.${fracPart}`;
}

function majorToCentsDigits(major: string): string {
  const canonical = toCanonicalMajorString(major.replace(",", "."));
  if (!canonical) return "";
  const unsigned = canonical.startsWith("-") ? canonical.slice(1) : canonical;
  return unsigned.replace(".", "");
}

function isZeroLikeMajor(v: string) {
  const c = toCanonicalMajorString(v.replace(",", "."));
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

const AmountField = forwardRef<HTMLInputElement, AmountInputProps>((props, ref) => {
  const {
    variant = "default",
    size = "md",

    label,
    errorMessage,
    style,

    isLoading = false,

    display = "currency",
    zeroAsEmpty = false,
    currency,
    allowNegative = false,

    ...rest
  } = props;

  const valueType = ("valueType" in props ? props.valueType : undefined) ?? "string";
  const isNumberMode = valueType === "number";

  const onValueChange =
    props.onValueChange as unknown as ((v: string) => void) & ((v: number | "") => void);

  const rawValue = props.value as unknown;

  const autoId = useId();
  const inputId = rest.id ?? autoId;

  const disabled = rest.disabled ?? false;
  const placeholder = rest.placeholder;

  // Always work internally with a "major string" like "1234.56"
  const majorValue = useMemo(() => {
    if (rawValue === "" || rawValue == null) return "";
    if (typeof rawValue === "number" && Number.isFinite(rawValue)) return rawValue.toFixed(2);
    return String(rawValue);
  }, [rawValue]);

  const centsDigits = useMemo(() => majorToCentsDigits(majorValue), [majorValue]);

  const displayValue = useMemo(() => {
    if (!majorValue) return "";
    if (zeroAsEmpty && isZeroLikeMajor(majorValue)) return "";
    return display === "currency" ? formatCurrency(majorValue, currency) : formatMajorNumber(majorValue);
  }, [majorValue, zeroAsEmpty, display, currency]);

  const resolvedPlaceholder =
    placeholder == null || placeholder === ""
      ? display === "currency"
        ? formatCurrency("0.00", currency)
        : formatMajorNumber("0.00")
      : placeholder;

  const canClear = !isLoading && !disabled && !!majorValue && !(zeroAsEmpty && isZeroLikeMajor(majorValue));

  const sz = INPUT_SIZE[size as InputSize];

  const rightPadClass = useMemo(() => {
    if (canClear && isLoading) return sz.rightPadTwo;
    if (canClear || isLoading) return sz.rightPadOne;
    return sz.rightPadNone;
  }, [canClear, isLoading, sz]);

  const inputClasses = classNames(
    BASE,
    sz.inputBox,
    rightPadClass,
    VARIANT[variant] ?? VARIANT.default,
    errorMessage && "border-red-500 focus:border-red-500 focus-visible:ring-red-200"
  );

  const emitEmpty = useCallback(() => {
    if (isNumberMode) {
      (onValueChange as (v: number | "") => void)("");
      return;
    }
    (onValueChange as (v: string) => void)("");
  }, [isNumberMode, onValueChange]);

  const emitMajor = useCallback(
    (major: string) => {
      const canonical = toCanonicalMajorString(String(major ?? "").replace(",", "."));

      if (zeroAsEmpty && (!canonical || canonical === "0.00" || canonical === "-0.00")) {
        emitEmpty();
        return;
      }

      if (!canonical) {
        emitEmpty();
        return;
      }

      if (isNumberMode) {
        const n = Number(canonical);
        const fixed = Number.isFinite(n) ? Number(n.toFixed(2)) : "";
        (onValueChange as (v: number | "") => void)(fixed);
        return;
      }

      (onValueChange as (v: string) => void)(canonical);
    },
    [emitEmpty, isNumberMode, onValueChange, zeroAsEmpty]
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
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase();
        if (SHORTCUT_KEYS.has(k)) return;
      }

      if (NAV_KEYS.has(e.key)) return;

      if (allowNegative && (e.key === "-" || e.key === "Subtract")) {
        e.preventDefault();
        if (!majorValue) {
          emitMajor("-0.00");
          return;
        }
        const toggled = majorValue.startsWith("-") ? majorValue.slice(1) : `-${majorValue}`;
        emitMajor(toggled);
        return;
      }

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

      e.preventDefault();
    },
    [allowNegative, centsDigits, emitFromCentsDigits, emitMajor, majorValue]
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

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = String(e.target.value ?? "").trim();
      if (!raw) {
        emitEmpty();
        return;
      }
      emitMajor(raw);
    },
    [emitEmpty, emitMajor]
  );

  const errorId = errorMessage ? `${inputId}-err` : undefined;

  return (
    <div className="flex flex-col gap-1.5 w-full min-w-0" style={style}>
      {label ? (
        <label htmlFor={inputId} className={classNames("font-semibold text-gray-700 select-none", sz.label)}>
          {label}
        </label>
      ) : null}

      <div className="relative w-full min-w-0">
        <input
          {...rest}
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
            <svg className={classNames("animate-spin text-gray-400", sz.icon)} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          )}

          {canClear && (
            <button
              type="button"
              onClick={() => emitEmpty()}
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
});

AmountField.displayName = "AmountField";
export default AmountField;
