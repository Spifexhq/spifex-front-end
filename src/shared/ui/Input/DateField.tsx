import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useImperativeHandle,
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
  getDaysInMonth,
} from "date-fns";
import { getEffectiveDateFormat } from "@/lib/date";

import type { DateInputProps, InputVariant, InputSize } from "./Input.types";
import { DATE_SIZE, INPUT_MESSAGE_TONE } from "./sizes";

type EffectiveDateCode = "DMY_SLASH" | "MDY_SLASH" | "YMD_ISO";
type SegmentBag = { day: string; month: string; year: string };

const CLOSE_MS = 150;

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

const getSegmentValue = (segments: SegmentBag, type: keyof SegmentBag): string =>
  segments[type] || "";

const DateField = forwardRef<HTMLInputElement, DateInputProps>(
  (
    {
      value,
      onValueChange,
      label,
      labelChip,
      errorMessage,
      variant = "default",
      size = "md",
      disabled,
      className,
      style,
      name,
      required,
      ...rest
    },
    forwardedRef
  ) => {
    const autoId = useId();
    const id = rest.id ?? autoId;

    const [isFocused, setIsFocused] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isCalendarRendered, setIsCalendarRendered] = useState(false);
    const [placement, setPlacement] = useState<"bottom" | "top">("bottom");

    const calendarRef = useRef<HTMLDivElement | null>(null);
    const [calendarPosition, setCalendarPosition] = useState<React.CSSProperties>({});
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const slot1Ref = useRef<HTMLInputElement | null>(null);
    const slot2Ref = useRef<HTMLInputElement | null>(null);
    const slot3Ref = useRef<HTMLInputElement | null>(null);
    const closeTimerRef = useRef<number | null>(null);
    const openRafRef = useRef<number | null>(null);

    useImperativeHandle(forwardedRef, () => slot1Ref.current as HTMLInputElement, []);

    const { t, i18n } = useTranslation("common");
    const language = i18n.resolvedLanguage || i18n.language || "en";
    const { code } = getEffectiveDateFormat();
    const effectiveCode: EffectiveDateCode = code as EffectiveDateCode;

    const sz = DATE_SIZE[size as InputSize];

    const focusPrimarySlot = useCallback(() => {
      requestAnimationFrame(() => {
        slot1Ref.current?.focus({ preventScroll: true });
      });
    }, []);

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

    const initialSegments = parseISOToSegments(value || "");

    const [slot1, setSlot1] = useState(getSegmentValue(initialSegments, slotConfig.slot1.type));
    const [slot2, setSlot2] = useState(getSegmentValue(initialSegments, slotConfig.slot2.type));
    const [slot3, setSlot3] = useState(getSegmentValue(initialSegments, slotConfig.slot3.type));

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

    useEffect(() => {
      if (isFocused) return;
      const seg = parseISOToSegments(value || "");
      setSlot1(getSegmentValue(seg, slotConfig.slot1.type));
      setSlot2(getSegmentValue(seg, slotConfig.slot2.type));
      setSlot3(getSegmentValue(seg, slotConfig.slot3.type));
    }, [value, isFocused, slotConfig]);

    useEffect(() => {
      return () => {
        if (openRafRef.current != null) window.cancelAnimationFrame(openRafRef.current);
        if (closeTimerRef.current != null) window.clearTimeout(closeTimerRef.current);
      };
    }, []);

    const buildISO = useCallback(
      (s1: string, s2: string, s3: string): string | null => {
        const bag: SegmentBag = { day: "", month: "", year: "" };

        bag[slotConfig.slot1.type] = s1;
        bag[slotConfig.slot2.type] = s2;
        bag[slotConfig.slot3.type] = s3;

        if (!bag.day && !bag.month && !bag.year) return "";
        if (!bag.day || !bag.month || !bag.year) return null;

        const dateStr = `${bag.year}-${bag.month.padStart(2, "0")}-${bag.day.padStart(2, "0")}`;
        const parsed = parse(dateStr, "yyyy-MM-dd", new Date());
        return isValid(parsed) ? format(parsed, "yyyy-MM-dd") : null;
      },
      [slotConfig]
    );

    const updateValue = useCallback(
      (s1: string, s2: string, s3: string) => {
        const iso = buildISO(s1, s2, s3);
        if (iso !== null) onValueChange?.(iso);
      },
      [buildISO, onValueChange]
    );

    const openCalendar = useCallback(() => {
      if (disabled) return;

      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      setIsCalendarRendered(true);

      if (openRafRef.current != null) {
        window.cancelAnimationFrame(openRafRef.current);
      }

      openRafRef.current = window.requestAnimationFrame(() => {
        setIsCalendarOpen(true);
      });
    }, [disabled]);

    const closeCalendar = useCallback((after?: () => void) => {
      setIsCalendarOpen(false);

      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current);
      }

      closeTimerRef.current = window.setTimeout(() => {
        setIsCalendarRendered(false);
        after?.();
      }, CLOSE_MS);
    }, []);

    const closeAndKeepFocus = useCallback(() => {
      closeCalendar(() => {
        setIsFocused(false);
        focusPrimarySlot();
      });
    }, [closeCalendar, focusPrimarySlot]);

    const closeAndCommit = useCallback(() => {
      closeCalendar(() => {
        setIsFocused(false);
        updateValue(slot1, slot2, slot3);
      });
    }, [closeCalendar, slot1, slot2, slot3, updateValue]);

    window.useGlobalEsc?.(isCalendarRendered, () => {
      closeAndKeepFocus();
    });

    const handleSlotChange = (
      slotNum: 1 | 2 | 3,
      rawValue: string,
      maxLength: number,
      nextRef?: React.RefObject<HTMLInputElement>
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
      nextRef?: React.RefObject<HTMLInputElement>
    ) => {
      const input = e.currentTarget;
      const cursorPos = input.selectionStart || 0;

      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        if (disabled || rest.readOnly) return;

        const segments: SegmentBag = { day: "", month: "", year: "" };
        segments[slotConfig.slot1.type] = slot1;
        segments[slotConfig.slot2.type] = slot2;
        segments[slotConfig.slot3.type] = slot3;
        const segment = input === slot1Ref.current
          ? slotConfig.slot1.type
          : input === slot2Ref.current
            ? slotConfig.slot2.type
            : slotConfig.slot3.type;
        const today = new Date();
        const daysInMonth = () => {
          const date = new Date(0);
          date.setFullYear(Number(segments.year) || today.getFullYear(), (Number(segments.month) || today.getMonth() + 1) - 1, 1);
          return getDaysInMonth(date);
        };
        const maximum = segment === "year" ? 9999 : segment === "month" ? 12 : daysInMonth();
        const current = Number(segments[segment]);
        const next = current
          ? Math.min(maximum, Math.max(1, current + (e.key === "ArrowUp" ? 1 : -1)))
          : e.key === "ArrowUp" ? 1 : maximum;
        segments[segment] = String(next).padStart(segment === "year" ? 4 : 2, "0");
        // Preserve the day where possible when changing February or a leap year.
        if (segments.day) segments.day = String(Math.min(Number(segments.day), daysInMonth())).padStart(2, "0");
        setSlot1(segments[slotConfig.slot1.type]);
        setSlot2(segments[slotConfig.slot2.type]);
        setSlot3(segments[slotConfig.slot3.type]);
        return;
      }

      if (e.key === "Backspace" && cursorPos === 0 && prevRef?.current) {
        e.preventDefault();
        prevRef.current.focus();
        const prevValue = prevRef.current.value;
        prevRef.current.setSelectionRange(prevValue.length, prevValue.length);
      } else if (e.key === "ArrowLeft" && cursorPos === 0 && prevRef?.current) {
        e.preventDefault();
        prevRef.current.focus();
      } else if (e.key === "ArrowRight" && cursorPos === input.value.length && nextRef?.current) {
        e.preventDefault();
        nextRef.current.focus();
      } else if (e.key === "/" || e.key === "-") {
        e.preventDefault();
        if (nextRef?.current) {
          nextRef.current.focus();
          nextRef.current.select();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
      } else if (e.key === "Escape" && isCalendarRendered) {
        e.preventDefault();
        e.stopPropagation();
        closeAndKeepFocus();
      }
    };

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      event.currentTarget.select();
    };

    const handleBlur = () => {
      setTimeout(() => {
        const focusedElement = document.activeElement;
        const isStillInSlots =
          focusedElement === slot1Ref.current ||
          focusedElement === slot2Ref.current ||
          focusedElement === slot3Ref.current;

        const isInsideWrapper =
          !!focusedElement && !!wrapperRef.current && wrapperRef.current.contains(focusedElement);

        if (!isStillInSlots && !isInsideWrapper && !(focusedElement && calendarRef.current?.contains(focusedElement))) {
          setIsFocused(false);
          closeAndCommit();
        }
      }, 0);
    };

    const computePlacement = useCallback(() => {
      const el = wrapperRef.current;
      if (!el || typeof window === "undefined") return;

      const r = el.getBoundingClientRect();
      const viewport = window.visualViewport;
      const topEdge = (viewport?.offsetTop || 0) + 8;
      const bottomEdge = (viewport?.offsetTop || 0) + (viewport?.height || window.innerHeight) - 8;
      const below = Math.max(0, bottomEdge - r.bottom - 8);
      const above = Math.max(0, r.top - topEdge - 8);
      const bottom = below >= 320 || below >= above;
      const width = Math.min(({ xs: 210, sm: 230, md: 240, lg: 280, xl: 310 }[size]), window.innerWidth - 16);
      setPlacement(bottom ? "bottom" : "top");
      setCalendarPosition({ width, minWidth: 0, left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)),
        top: bottom ? r.bottom + 8 : undefined, bottom: bottom ? undefined : window.innerHeight - r.top + 8,
        maxHeight: Math.min(360, bottom ? below : above) });
    }, [size]);

    const handleCalendarClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      if (!isCalendarRendered || !isCalendarOpen) {
        if (selectedDate) {
          setCalendarMonth(selectedDate);
        } else if (value) {
          const parsed = parse(value, "yyyy-MM-dd", new Date());
          if (isValid(parsed)) setCalendarMonth(parsed);
          else setCalendarMonth(new Date());
        } else {
          setCalendarMonth(new Date());
        }

        computePlacement();
        openCalendar();
        setIsFocused(true);
        return;
      }

      closeAndKeepFocus();
    };

    useEffect(() => {
      if (!isCalendarRendered) return;

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        if (wrapperRef.current?.contains(target) || calendarRef.current?.contains(target)) return;
        closeAndCommit();
      };

      document.addEventListener("mousedown", handleClickOutside, true);
      return () => document.removeEventListener("mousedown", handleClickOutside, true);
    }, [isCalendarRendered, closeAndCommit]);

    useEffect(() => {
      if (!isCalendarRendered) return;

      const handleViewportChange = () => {
        computePlacement();
      };

      window.visualViewport?.addEventListener("resize", handleViewportChange);
      window.visualViewport?.addEventListener("scroll", handleViewportChange);
      window.addEventListener("resize", handleViewportChange);
      window.addEventListener("scroll", handleViewportChange, true);

      return () => {
        window.visualViewport?.removeEventListener("resize", handleViewportChange);
        window.visualViewport?.removeEventListener("scroll", handleViewportChange);
        window.removeEventListener("resize", handleViewportChange);
        window.removeEventListener("scroll", handleViewportChange, true);
      };
    }, [isCalendarRendered, computePlacement]);

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
      onValueChange?.(iso);

      closeCalendar(() => {
        setIsFocused(false);
        focusPrimarySlot();
      });
    };

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
            onMouseDown={(ev) => ev.preventDefault()}
            onClick={() => handleDateSelect(current)}
            className={classNames(
              "rounded-full flex items-center justify-center",
              sz.dayCell,
              !isCurrentMonth && "text-gray-400",
              isSelected && "bg-gray-900 text-white",
              !isSelected && "hover:bg-gray-100"
            )}
            tabIndex={isCalendarOpen ? 0 : -1}
          >
            {format(current, "d")}
          </button>
        );

        curr = addDays(curr, 1);
      }

      const weekdayLabels = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(language, { weekday: "short" }).format(new Date(2024, 0, 1 + index)));

      return (
        <div
          className={classNames(
            "fixed z-[11000] rounded-md border border-gray-200 bg-white shadow-lg",
            "max-h-[50vh] overflow-auto",
            placement === "bottom" ? "origin-top" : "origin-bottom",
            sz.popover,
            "transition-all duration-150 ease-out will-change-transform",
            isCalendarOpen
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 -translate-y-1 scale-[0.985] pointer-events-none"
          )}
          ref={calendarRef}
          data-calendar-portal
          style={calendarPosition}
          aria-hidden={!isCalendarOpen}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
              aria-label={t("input.previousMonth", "Previous month")}
              className={classNames(
                "rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600",
                sz.navBtn
              )}
              tabIndex={isCalendarOpen ? 0 : -1}
            >
              ‹
            </button>

            <span className={classNames("font-medium text-gray-800", sz.title)}>
              {new Intl.DateTimeFormat(language, { month: "short", year: "numeric" }).format(calendarMonth)}
            </span>

            <button
              type="button"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
              aria-label={t("input.nextMonth", "Next month")}
              className={classNames(
                "rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600",
                sz.navBtn
              )}
              tabIndex={isCalendarOpen ? 0 : -1}
            >
              ›
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {weekdayLabels.map((w) => (
              <div
                key={w}
                className={classNames("flex items-center justify-center text-gray-500", sz.weekday)}
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">{days}</div>
        </div>
      );
    };

    const errorId = errorMessage ? `${id}-err` : undefined;

    const baseContainer =
      "outline-none transition-colors duration-150 " +
      "border bg-white hover:bg-gray-50 focus-within:bg-gray-50 " +
      "focus-within:ring-1 focus-within:ring-gray-300 " +
      "relative flex items-center";

    const variantClasses: Record<InputVariant, string> = {
      default: "border-gray-300",
      outlined: "border-2 border-gray-300 focus-within:ring-0",
      filled: "bg-gray-50 border border-transparent focus-within:border-gray-300",
    };

    const containerClasses = classNames(
      baseContainer,
      sz.container,
      variantClasses[variant] ?? variantClasses.default,
      errorMessage && "border-red-500 focus-within:border-red-500 focus-within:ring-red-200",
      className
    );

    const slotClasses = classNames(
      "m-0 min-w-0 shrink-0 appearance-none rounded-sm border-0 bg-transparent p-0 text-center font-normal leading-5 tabular-nums tracking-normal text-slate-700 outline-none placeholder:text-slate-400 focus:bg-slate-200/50 selection:bg-slate-200 selection:text-slate-900 disabled:cursor-not-allowed",
      sz.slot
    );

    return (
      <div className="flex min-w-0 flex-col gap-1.5" style={style} ref={wrapperRef}>
        {label ? (
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={id}
              className={classNames("font-semibold text-gray-700 select-none min-w-0", sz.label)}
            >
              {label}
            </label>

            {labelChip ? (
              <span
                className={classNames(
                  "inline-flex shrink-0 items-center rounded-full border font-medium whitespace-nowrap",
                  sz.chip,
                  INPUT_MESSAGE_TONE[labelChip.tone ?? "neutral"]
                )}
              >
                {labelChip.label}
              </span>
            ) : null}
          </div>
        ) : null}

        {name ? (
          <input
            type="hidden"
            name={name}
            value={buildISO(slot1, slot2, slot3) ?? ""}
            required={required}
          />
        ) : null}

        <div className="relative w-full min-w-0">
          <div className={containerClasses}>
            <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden pr-8">
              <input
                id={id}
                ref={slot1Ref}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                disabled={disabled}
                className={slotClasses}
                style={{ width: `${slotConfig.slot1.maxLength + 0.5}ch` }}
                placeholder={slotConfig.slot1.label}
                value={slot1}
                onChange={(e) =>
                  handleSlotChange(1, e.target.value, slotConfig.slot1.maxLength, slot2Ref)
                }
                onKeyDown={(e) => handleKeyDown(e, undefined, slot2Ref)}
                onBlur={handleBlur}
                onFocus={handleFocus}
                aria-invalid={!!errorMessage}
                aria-describedby={errorId}
                {...rest}
              />

              <span
                aria-hidden="true"
                className={classNames("w-[0.75ch] shrink-0 select-none text-center font-normal leading-5 text-slate-400", sz.sep)}
              >
                {slotConfig.separator}
              </span>

              <input
                ref={slot2Ref}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                disabled={disabled}
                className={slotClasses}
                style={{ width: `${slotConfig.slot2.maxLength + 0.5}ch` }}
                placeholder={slotConfig.slot2.label}
                value={slot2}
                onChange={(e) =>
                  handleSlotChange(2, e.target.value, slotConfig.slot2.maxLength, slot3Ref)
                }
                onKeyDown={(e) => handleKeyDown(e, slot1Ref, slot3Ref)}
                onBlur={handleBlur}
                onFocus={handleFocus}
              />

              <span
                aria-hidden="true"
                className={classNames("w-[0.75ch] shrink-0 select-none text-center font-normal leading-5 text-slate-400", sz.sep)}
              >
                {slotConfig.separator}
              </span>

              <input
                ref={slot3Ref}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                disabled={disabled}
                className={slotClasses}
                style={{ width: `${slotConfig.slot3.maxLength + 0.5}ch` }}
                placeholder={slotConfig.slot3.label}
                value={slot3}
                onChange={(e) => handleSlotChange(3, e.target.value, slotConfig.slot3.maxLength)}
                onKeyDown={(e) => handleKeyDown(e, slot2Ref, undefined)}
                onBlur={handleBlur}
                onFocus={handleFocus}
              />
            </div>

            <button
              type="button"
              className={classNames(
                sz.calBtn,
                "!absolute !right-0.5 !top-1/2 !left-auto !bottom-auto -translate-y-1/2 z-10 " +
                  "flex-shrink-0 rounded-full flex items-center justify-center hover:bg-gray-100"
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCalendarClick}
              aria-label={t("input.openDatePicker", "Open date picker")}
              tabIndex={-1}
              disabled={disabled}
            >
              <svg
                viewBox="0 0 24 24"
                className={classNames("text-gray-400", sz.calIcon)}
                fill="none"
              >
                <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M8 2v4M16 2v4M3 10h18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {isCalendarRendered ? createPortal(renderCalendar(), document.body) : null}
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

DateField.displayName = "DateField";
export default DateField;