// src/shared/ui/Input/sizes.ts
import type { InputSize } from "./Input.types";

export const INPUT_SIZE: Record<
  InputSize,
  {
    inputBox: string;
    label: string;
    error: string;

    icon: string;
    pwIcon: { w: number; h: number };
    trailingRight: string;
    trailingGap: string;
    trailingBtnPad: string;

    trailingText: string;

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
    pwIcon: { w: 16, h: 16 },
    trailingRight: "right-1.5",
    trailingGap: "gap-0.5",
    trailingBtnPad: "p-0.5",
    trailingText: "text-[11px]",
    rightPadNone: "pr-2.5",
    rightPadOne: "pr-8",
    rightPadTwo: "pr-12",
  },
  sm: {
    inputBox: "h-8 text-xs px-3 py-2 rounded-md",
    label: "text-[10.5px]",
    error: "text-[11px]",
    icon: "h-4 w-4",
    pwIcon: { w: 18, h: 18 },
    trailingRight: "right-2",
    trailingGap: "gap-1",
    trailingBtnPad: "p-1",
    trailingText: "text-xs",
    rightPadNone: "pr-3",
    rightPadOne: "pr-10",
    rightPadTwo: "pr-16",
  },
  md: {
    inputBox: "h-10 text-xs px-3 py-2.5 rounded-lg",
    label: "text-[10.5px]",
    error: "text-[11px]",
    icon: "h-4 w-4",
    pwIcon: { w: 18, h: 18 },
    trailingRight: "right-2",
    trailingGap: "gap-1",
    trailingBtnPad: "p-1",
    trailingText: "text-xs",
    rightPadNone: "pr-3.5",
    rightPadOne: "pr-10",
    rightPadTwo: "pr-16",
  },
  lg: {
    inputBox: "h-11 text-[13px] px-4 py-3 rounded-lg",
    label: "text-[11px]",
    error: "text-[12px]",
    icon: "h-4 w-4",
    pwIcon: { w: 20, h: 20 },
    trailingRight: "right-2.5",
    trailingGap: "gap-1.5",
    trailingBtnPad: "p-1",
    trailingText: "text-[13px]",
    rightPadNone: "pr-4",
    rightPadOne: "pr-11",
    rightPadTwo: "pr-[4.25rem]",
  },
  xl: {
    inputBox: "h-12 text-[15px] px-5 py-3.5 rounded-xl",
    label: "text-[12px]",
    error: "text-[12.5px]",
    icon: "h-5 w-5",
    pwIcon: { w: 22, h: 22 },
    trailingRight: "right-3",
    trailingGap: "gap-2",
    trailingBtnPad: "p-1.5",
    trailingText: "text-[15px]",
    rightPadNone: "pr-5",
    rightPadOne: "pr-12",
    rightPadTwo: "pr-[4.75rem]",
  },
};

export const DATE_SIZE: Record<
  InputSize,
  {
    label: string;
    error: string;

    container: string;
    slot: string;
    sep: string;

    calBtn: string;
    calIcon: string;

    popover: string;
    navBtn: string;
    title: string;
    weekday: string;
    dayCell: string;
  }
> = {
  xs: {
    label: "text-[10px]",
    error: "text-[10px]",
    container: "h-7 px-2 py-1 gap-0.5 text-[11px] rounded-md",
    slot: "text-[11px] placeholder:text-[11px]",
    sep: "text-[11px]",
    calBtn: "h-5 w-5",
    calIcon: "h-3 w-3",
    popover: "p-2 text-[11px] min-w-[190px]",
    navBtn: "h-5 w-5 text-[12px]",
    title: "text-[11px]",
    weekday: "h-4 text-[9px]",
    dayCell: "h-6 w-6 text-[11px]",
  },
  sm: {
    label: "text-[10.5px]",
    error: "text-[11px]",
    container: "h-8 px-2.5 py-1 gap-0.5 text-xs rounded-md",
    slot: "text-xs placeholder:text-xs",
    sep: "text-xs",
    calBtn: "h-6 w-6",
    calIcon: "h-3.5 w-3.5",
    popover: "p-2 text-xs min-w-[200px]",
    navBtn: "h-6 w-6 text-xs",
    title: "text-xs",
    weekday: "h-5 text-[10px]",
    dayCell: "h-7 w-7 text-xs",
  },
  md: {
    label: "text-[10.5px]",
    error: "text-[11px]",
    container: "h-10 px-2.5 py-1.5 gap-1 text-xs rounded-lg",
    slot: "text-xs placeholder:text-xs",
    sep: "text-xs",
    calBtn: "h-6 w-6",
    calIcon: "h-3.5 w-3.5",
    popover: "p-2 text-xs min-w-[210px]",
    navBtn: "h-6 w-6 text-xs",
    title: "text-xs",
    weekday: "h-5 text-[10px]",
    dayCell: "h-7 w-7 text-xs",
  },
  lg: {
    label: "text-[11px]",
    error: "text-[12px]",
    container: "h-11 px-3 py-2 gap-1.5 text-[13px] rounded-lg",
    slot: "text-[13px] placeholder:text-[13px]",
    sep: "text-[13px]",
    calBtn: "h-7 w-7",
    calIcon: "h-4 w-4",
    popover: "p-3 text-[13px] min-w-[230px]",
    navBtn: "h-7 w-7 text-[14px]",
    title: "text-[13px]",
    weekday: "h-6 text-[11px]",
    dayCell: "h-8 w-8 text-[13px]",
  },
  xl: {
    label: "text-[12px]",
    error: "text-[12.5px]",
    container: "h-12 px-4 py-2.5 gap-2 text-[15px] rounded-xl",
    slot: "text-[15px] placeholder:text-[15px]",
    sep: "text-[15px]",
    calBtn: "h-8 w-8",
    calIcon: "h-5 w-5",
    popover: "p-3.5 text-[15px] min-w-[250px]",
    navBtn: "h-8 w-8 text-[16px]",
    title: "text-[15px]",
    weekday: "h-7 text-[12px]",
    dayCell: "h-9 w-9 text-[15px]",
  },
};
