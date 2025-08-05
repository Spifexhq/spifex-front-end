// src/lib/currency/decimalToCentsString.ts
export const decimalToCentsString = (amount: string | number) => {
  const num = Number(amount);
  return Number.isFinite(num) ? Math.round(num * 100).toString() : "";
};