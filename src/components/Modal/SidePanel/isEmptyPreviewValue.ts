import type { ReactNode } from "react";
/** Recognize missing data and legacy placeholders without hiding zero or false. */
export default function isEmptyPreviewValue(value: ReactNode): boolean {
  return value == null || (Array.isArray(value) && value.length === 0) ||
    (typeof value === "string" && (value.trim() === "" || /^[—–\-�]+$/.test(value.trim())));
}
