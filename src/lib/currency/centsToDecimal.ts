// src/lib/currency/centsToDecimalString.ts
export const centsToDecimalString = (cents: string) => {
  if (!cents) return "";
  const value = (parseInt(cents, 10) || 0) / 100;
  // toFixed(2) garante duas casas decimais
  return value.toFixed(2);
};
