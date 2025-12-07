// src/components/ui/DateInput.tsx
import React, {
  forwardRef,
  useId,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import classNames from "classnames";
import {
  format,
  parse,
  isValid,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
} from "date-fns";
import { getEffectiveDateFormat } from "@/lib/date";

type EffectiveDateCode = "DMY_SLASH" | "MDY_SLASH" | "YMD_ISO";

export type DateInputVariant = "default" | "outlined" | "filled";

export interface DateInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange"
  > {
  value?: string;
  onChange?: (valueIso: string) => void;
  label?: string;
  errorMessage?: string;
  variant?: DateInputVariant;
}

/* --------------------------- Segment helpers --------------------------- */

type SegmentBag = { day: string; month: string; year: string };

const parseISOToSegments = (iso: string): SegmentBag => {
  if (!iso) return { day: "", month: "", year: "" };
  const parsed = parse(iso, "yyyy-MM-dd", new Date());
  if (!isValid(parsed)) return { day: "", month: "", year: "" };
  return {
    day: format(parsed, "dd"),
    month: format(parsed, "MM"),
    year: format(parsed, "yyyy"),
  };
};

const getSegmentValue = (
  segments: SegmentBag,
  type: keyof SegmentBag,
): string => segments[type] || "";

/* ------------------------------ Component ------------------------------ */

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      value,
      onChange,
      label,
      errorMessage,
      variant = "default",
      disabled,
      className,
      style,
      ...rest
    },
    ref,
  ) => {
    const id = useId();
    const [isFocused, setIsFocused] = useState(false);

    const slot1Ref = useRef<HTMLInputElement | null>(null);
    const slot2Ref = useRef<HTMLInputElement | null>(null);
    const slot3Ref = useRef<HTMLInputElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    const { code } = getEffectiveDateFormat();
    const effectiveCode: EffectiveDateCode = code;

    /* ---------------------- Slot / format configuration ---------------------- */

    const slotConfig = useMemo(() => {
      switch (effectiveCode) {
        case "DMY_SLASH":
          return {
            slot1: { maxLength: 2, label: "dd", type: "day" as const },
            slot2: { maxLength: 2, label: "mm", type: "month" as const },
            slot3: { maxLength: 4, label: "yyyy", type: "year" as const },
            separator: "/",
          };
        case "MDY_SLASH":
          return {
            slot1: { maxLength: 2, label: "mm", type: "month" as const },
            slot2: { maxLength: 2, label: "dd", type: "day" as const },
            slot3: { maxLength: 4, label: "yyyy", type: "year" as const },
            separator: "/",
          };
        case "YMD_ISO":
        default:
          return {
            slot1: { maxLength: 4, label: "yyyy", type: "year" as const },
            slot2: { maxLength: 2, label: "mm", type: "month" as const },
            slot3: { maxLength: 2, label: "dd", type: "day" as const },
            separator: "-",
          };
      }
    }, [effectiveCode]);

    /* ---------------------------- Value → segments --------------------------- */

    const initialSegments = parseISOToSegments(value || "");

    const [slot1, setSlot1] = useState(
      getSegmentValue(initialSegments, slotConfig.slot1.type),
    );
    const [slot2, setSlot2] = useState(
      getSegmentValue(initialSegments, slotConfig.slot2.type),
    );
    const [slot3, setSlot3] = useState(
      getSegmentValue(initialSegments, slotConfig.slot3.type),
    );

    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    /* --------------------- Selected date / calendar month -------------------- */

    const selectedDate = useMemo(() => {
      const bag: SegmentBag = { day: "", month: "", year: "" };

      bag[slotConfig.slot1.type] = slot1;
      bag[slotConfig.slot2.type] = slot2;
      bag[slotConfig.slot3.type] = slot3;

      if (!bag.day || !bag.month || !bag.year) return null;
      const dateStr = `${bag.year}-${bag.month.padStart(2, "0")}-${bag.day.padStart(2, "0")}`;
      const parsed = parse(dateStr, "yyyy-MM-dd", new Date());
      return isValid(parsed) ? parsed : null;
    }, [slot1, slot2, slot3, slotConfig]);

    const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
      if (value) {
        const parsed = parse(value, "yyyy-MM-dd", new Date());
        if (isValid(parsed)) return parsed;
      }
      return new Date();
    });

    useEffect(() => {
      if (!value) return;
      const parsed = parse(value, "yyyy-MM-dd", new Date());
      if (isValid(parsed)) setCalendarMonth(parsed);
    }, [value]);

    /* ------------------ Forward outer ref to first segment ------------------- */

    useEffect(() => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(slot1Ref.current);
      } else {
        (ref as React.MutableRefObject<HTMLInputElement | null>).current =
          slot1Ref.current;
      }
    }, [ref]);

    /* -------------------- Sync external value → slot inputs ------------------ */

    useEffect(() => {
      if (!isFocused) {
        const seg = parseISOToSegments(value || "");
        setSlot1(getSegmentValue(seg, slotConfig.slot1.type));
        setSlot2(getSegmentValue(seg, slotConfig.slot2.type));
        setSlot3(getSegmentValue(seg, slotConfig.slot3.type));
      }
    }, [value, isFocused, slotConfig]);

    /* ----------------------------- Build ISO date ---------------------------- */

    const buildISO = (s1: string, s2: string, s3: string): string | null => {
      const bag: SegmentBag = { day: "", month: "", year: "" };

      bag[slotConfig.slot1.type] = s1;
      bag[slotConfig.slot2.type] = s2;
      bag[slotConfig.slot3.type] = s3;

      if (!bag.day && !bag.month && !bag.year) return "";
      if (!bag.day || !bag.month || !bag.year) return null;

      const dateStr = `${bag.year}-${bag.month.padStart(2, "0")}-${bag.day.padStart(2, "0")}`;
      const parsed = parse(dateStr, "yyyy-MM-dd", new Date());
      return isValid(parsed) ? format(parsed, "yyyy-MM-dd") : null;
    };

    const updateValue = (s1: string, s2: string, s3: string) => {
      const iso = buildISO(s1, s2, s3);
      if (iso !== null) {
        onChange?.(iso);
      }
    };

    /* -------------------------- Slot input handling -------------------------- */

    const handleSlotChange = (
      slotNum: 1 | 2 | 3,
      rawValue: string,
      maxLength: number,
      nextRef?: React.RefObject<HTMLInputElement>,
    ) => {
      let digits = rawValue.replace(/\D/g, "").slice(0, maxLength);
      const slotType =
        slotNum === 1
          ? slotConfig.slot1.type
          : slotNum === 2
            ? slotConfig.slot2.type
            : slotConfig.slot3.type;

      if (slotType === "month" && digits) {
        const monthNum = parseInt(digits, 10);
        if (monthNum > 12) digits = "12";
        else if (digits.length === 2 && monthNum < 1) digits = "01";
      } else if (slotType === "day" && digits) {
        const dayNum = parseInt(digits, 10);
        if (dayNum > 31) digits = "31";
        else if (digits.length === 2 && dayNum < 1) digits = "01";
      }

      if (slotNum === 1) setSlot1(digits);
      if (slotNum === 2) setSlot2(digits);
      if (slotNum === 3) setSlot3(digits);

      if (digits.length === maxLength && nextRef?.current) {
        nextRef.current.focus();
        nextRef.current.select();
      }
    };

    const handleKeyDown = (
      e: React.KeyboardEvent<HTMLInputElement>,
      prevRef?: React.RefObject<HTMLInputElement>,
      nextRef?: React.RefObject<HTMLInputElement>,
    ) => {
      const input = e.currentTarget;
      const cursorPos = input.selectionStart || 0;

      if (e.key === "Backspace" && cursorPos === 0 && prevRef?.current) {
        e.preventDefault();
        prevRef.current.focus();
        const prevValue = prevRef.current.value;
        prevRef.current.setSelectionRange(prevValue.length, prevValue.length);
      } else if (e.key === "ArrowLeft" && cursorPos === 0 && prevRef?.current) {
        e.preventDefault();
        prevRef.current.focus();
      } else if (
        e.key === "ArrowRight" &&
        cursorPos === input.value.length &&
        nextRef?.current
      ) {
        e.preventDefault();
        nextRef.current.focus();
      } else if (e.key === "/" || e.key === "-") {
        e.preventDefault();
        if (nextRef?.current) {
          nextRef.current.focus();
          nextRef.current.select();
        }
      }
    };

    const handleBlur = () => {
      setTimeout(() => {
        const focusedElement = document.activeElement;
        const isStillInSlots =
          focusedElement === slot1Ref.current ||
          focusedElement === slot2Ref.current ||
          focusedElement === slot3Ref.current;

        const isInsideWrapper =
          !!focusedElement &&
          !!wrapperRef.current &&
          wrapperRef.current.contains(focusedElement);

        if (!isStillInSlots && !isInsideWrapper) {
          setIsFocused(false);
          setIsCalendarOpen(false);
          updateValue(slot1, slot2, slot3);
        }
      }, 0);
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    /* --------------------- Personalized calendar click ---------------------- */

    const handleCalendarClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      if (selectedDate) {
        setCalendarMonth(selectedDate);
      } else if (value) {
        const parsed = parse(value, "yyyy-MM-dd", new Date());
        if (isValid(parsed)) setCalendarMonth(parsed);
      } else {
        setCalendarMonth(new Date());
      }

      setIsCalendarOpen((prev) => !prev);
      setIsFocused(true);
    };

    useEffect(() => {
      if (!isCalendarOpen) return;

      const handleClickOutside = (event: MouseEvent) => {
        if (
          wrapperRef.current &&
          !wrapperRef.current.contains(event.target as Node)
        ) {
          setIsCalendarOpen(false);
          setIsFocused(false);
          updateValue(slot1, slot2, slot3);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCalendarOpen, slot1, slot2, slot3]);

    /* ----------------------- Calendar day selection -------------------------- */

    const handleDateSelect = (date: Date) => {
      const segs: SegmentBag = {
        day: format(date, "dd"),
        month: format(date, "MM"),
        year: format(date, "yyyy"),
      };

      const s1 = segs[slotConfig.slot1.type];
      const s2 = segs[slotConfig.slot2.type];
      const s3 = segs[slotConfig.slot3.type];

      setSlot1(s1);
      setSlot2(s2);
      setSlot3(s3);

      const iso = format(date, "yyyy-MM-dd");
      onChange?.(iso);
      setIsCalendarOpen(false);
      setIsFocused(false);
    };

    /* -------------------------- Calendar rendering --------------------------- */

    const renderCalendar = () => {
      const start = startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 });

      const days: JSX.Element[] = [];
      let curr = start;

      while (curr <= end) {
        const current = curr;
        const isCurrentMonth = isSameMonth(current, calendarMonth);
        const isSelected = selectedDate ? isSameDay(current, selectedDate) : false;

        days.push(
          <button
            key={current.toISOString()}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleDateSelect(current)}
            className={classNames(
              "h-7 w-7 rounded-full text-xs flex items-center justify-center",
              !isCurrentMonth && "text-gray-400",
              isSelected && "bg-gray-900 text-white",
              !isSelected && "hover:bg-gray-100",
            )}
            tabIndex={isCalendarOpen ? 0 : -1}
          >
            {format(current, "d")}
          </button>,
        );

        curr = addDays(curr, 1);
      }

      const weekdayLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

      return (
        <div
          className={classNames(
            // position
            "absolute left-0 top-full origin-top z-[60]",
            // box
            "rounded-md border border-gray-200 bg-white shadow-lg p-2 text-xs min-w-[210px]",
            // animation (same style as SelectDropdown)
            "transition-all duration-150 ease-out will-change-transform",
            isCalendarOpen
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-1 pointer-events-none",
          )}
          aria-hidden={!isCalendarOpen}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
              className="h-6 w-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600 text-xs"
              tabIndex={isCalendarOpen ? 0 : -1}
            >
              ‹
            </button>

            <span className="font-medium text-gray-800 text-xs">
              {format(calendarMonth, "MMM yyyy")}
            </span>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
              className="h-6 w-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600 text-xs"
              tabIndex={isCalendarOpen ? 0 : -1}
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekdayLabels.map((w) => (
              <div
                key={w}
                className="h-5 flex items-center justify-center text-[10px] text-gray-500"
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">{days}</div>
        </div>
      );
    };

    /* ------------------------------ Styling ---------------------------------- */

    const errorId = errorMessage ? `${id}-err` : undefined;

    const baseContainer =
      "w-full h-10 text-xs text-gray-900 rounded-lg outline-none transition-colors duration-150 " +
      "border bg-white hover:bg-gray-50 focus-within:bg-gray-50 " +
      "focus-within:ring-1 focus-within:ring-gray-300 " +
      "disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 disabled:cursor-not-allowed " +
      "disabled:hover:bg-gray-100 disabled:focus-within:bg-gray-100 disabled:focus-within:ring-0 " +
      "px-2.5 py-1.5 flex items-center justify-between gap-1";

    const variantClasses: Record<DateInputVariant, string> = {
      default: "border-gray-300",
      outlined: "border-2 border-gray-300 focus-within:ring-0",
      filled:
        "bg-gray-50 border border-transparent focus-within:border-gray-300",
    };

    const containerClasses = classNames(
      baseContainer,
      variantClasses[variant] ?? variantClasses.default,
      errorMessage &&
        "border-red-500 focus-within:border-red-500 focus-within:ring-red-200",
      className,
    );

    const slotClasses =
      "bg-transparent outline-none text-center min-w-0 flex-shrink-0 " +
      "text-xs leading-none placeholder:text-xs placeholder:text-gray-400";

    /* -------------------------------- Render --------------------------------- */

    return (
      <div
        className="flex flex-col gap-1.5"
        style={style}
        ref={wrapperRef}
        {...rest}
      >
        {label && (
          <label
            htmlFor={id}
            className="text-[10.5px] font-semibold text-gray-700 select-none"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <div className={containerClasses}>
            <div className="flex items-center gap-0.5">
              <input
                id={id}
                ref={slot1Ref}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                disabled={disabled}
                className={slotClasses}
                style={{ width: `${slotConfig.slot1.maxLength * 1.5}ch` }}
                placeholder={slotConfig.slot1.label}
                value={slot1}
                onChange={(e) =>
                  handleSlotChange(
                    1,
                    e.target.value,
                    slotConfig.slot1.maxLength,
                    slot2Ref,
                  )
                }
                onKeyDown={(e) => handleKeyDown(e, undefined, slot2Ref)}
                onBlur={handleBlur}
                onFocus={handleFocus}
              />

              <span className="text-gray-400 text-xs">
                {slotConfig.separator}
              </span>

              <input
                ref={slot2Ref}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                disabled={disabled}
                className={slotClasses}
                style={{ width: `${slotConfig.slot2.maxLength * 1.5}ch` }}
                placeholder={slotConfig.slot2.label}
                value={slot2}
                onChange={(e) =>
                  handleSlotChange(
                    2,
                    e.target.value,
                    slotConfig.slot2.maxLength,
                    slot3Ref,
                  )
                }
                onKeyDown={(e) => handleKeyDown(e, slot1Ref, slot3Ref)}
                onBlur={handleBlur}
                onFocus={handleFocus}
              />

              <span className="text-gray-400 text-xs">
                {slotConfig.separator}
              </span>

              <input
                ref={slot3Ref}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                disabled={disabled}
                className={slotClasses}
                style={{ width: `${slotConfig.slot3.maxLength * 1}ch` }}
                placeholder={slotConfig.slot3.label}
                value={slot3}
                onChange={(e) =>
                  handleSlotChange(
                    3,
                    e.target.value,
                    slotConfig.slot3.maxLength,
                  )
                }
                onKeyDown={(e) => handleKeyDown(e, slot2Ref, undefined)}
                onBlur={handleBlur}
                onFocus={handleFocus}
              />
            </div>

            <button
              type="button"
              className="flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center hover:bg-gray-100"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCalendarClick}
              aria-label="Open date picker"
              tabIndex={-1}
              disabled={disabled}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 text-gray-400"
                fill="none"
              >
                <rect
                  x="3"
                  y="4"
                  width="18"
                  height="17"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M8 2v4M16 2v4M3 10h18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {renderCalendar()}
        </div>

        {errorMessage && (
          <span
            id={errorId}
            className="text-red-600 text-[11px] leading-tight"
          >
            {errorMessage}
          </span>
        )}
      </div>
    );
  },
);

DateInput.displayName = "DateInput";

export default DateInput;
