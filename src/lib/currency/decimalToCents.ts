// src/lib/currency/decimalToCentsString.ts
export const decimalToCentsString = (amount: string | number) => {
  const num = Number(amount);
  return Number.isFinite(num) ? Math.round(num * 100).toString() : "";
};

export const decimalToCentsDigits = (s: string) => {
  const norm = String(s ?? "0").replace(",", ".");
  const [intPart, fracPart = ""] = norm.split(".");
  const cents = (fracPart + "00").slice(0, 2);
  const digits = `${intPart.replace(/\D/g, "")}${cents}`.replace(/^$/, "0");
  return digits;
};