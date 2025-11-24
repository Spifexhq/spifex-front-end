// src/lib/currency/currencies.ts
// Build a (mostly) complete list of currencies, with value = ISO 4217 code ("EUR")
// and label = "({CODE}) {localized currency name}", e.g. "(EUR) Euro".

export interface CurrencyOption {
  value: string; // "EUR"
  label: string; // "(EUR) Euro"
}

// Minimal fallback for environments without Intl.supportedValuesOf("currency")
const FALLBACK_CURRENCY_CODES: readonly string[] = [
  "EUR", // Euro
  "USD", // US Dollar
  "BRL", // Brazilian Real
  "GBP", // British Pound
  "JPY", // Japanese Yen
  "CNY", // Chinese Yuan
];

// Fallback names if DisplayNames is not available or fails
const FALLBACK_CURRENCY_NAMES: Record<string, string> = {
  EUR: "Euro",
  USD: "US Dollar",
  BRL: "Brazilian Real",
  GBP: "Pound Sterling",
  JPY: "Japanese Yen",
  CNY: "Chinese Yuan",
};

const currencyDisplayName = (code: string, locale: string): string => {
  try {
    if (typeof Intl.DisplayNames === "function") {
      const dn = new Intl.DisplayNames([locale], { type: "currency" });
      const name = dn.of(code);
      if (name) return name;
    }
  } catch {
    // ignore and fallback below
  }
  return FALLBACK_CURRENCY_NAMES[code] ?? code;
};

// Narrowed type for Intl with optional supportedValuesOf
type IntlWithSupportedValuesOf = typeof Intl & {
  supportedValuesOf?: (input: string) => string[];
};

export const getCurrencies = (locale = "en"): CurrencyOption[] => {
  let codes: string[] = [...FALLBACK_CURRENCY_CODES];

  try {
    const intlWith = Intl as IntlWithSupportedValuesOf;
    if (typeof intlWith.supportedValuesOf === "function") {
      // Most modern browsers: will return almost all ISO 4217 active codes
      codes = intlWith.supportedValuesOf("currency");
    }
  } catch {
    // keep fallback list
  }

  const items: CurrencyOption[] = codes.map((c) => {
    const name = currencyDisplayName(c, locale);
    return {
      value: c,
      label: `(${c}) ${name}`, // ISO + name
    };
  });

  items.sort((a, b) => a.label.localeCompare(b.label, locale));

  return items;
};
