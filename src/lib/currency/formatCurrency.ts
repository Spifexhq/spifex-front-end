// src/lib/currency/formatCurrency.ts
import i18n from "@/lib/i18n";

/**
 * Map i18n language ("pt", "en", "fr", "de", "pt-BR"...) to a concrete
 * locale used by Intl APIs.
 */
function getCurrentNumberLocale(): string {
  const lng = i18n.resolvedLanguage || i18n.language || "en";

  if (lng.startsWith("pt")) return "pt-BR";
  if (lng.startsWith("en")) return "en-US";
  if (lng.startsWith("fr")) return "fr-FR";
  if (lng.startsWith("de")) return "de-DE";

  // Fallback: still something safe for numbers
  return "en-US";
}

/**
 * Based on current locale, returns which decimal + grouping separators we expect
 * for plain numbers.
 */
function getLocaleSeparators() {
  const locale = getCurrentNumberLocale();

  // pt-BR, fr-FR, de-DE => comma decimal, dot/space grouping
  if (locale.startsWith("pt") || locale.startsWith("fr") || locale.startsWith("de")) {
    return {
      decimal: ",",
      group: /[.\s\u00A0]/g, // dot, normal space, non-breaking space
    };
  }

  // Default: en-US style => dot decimal, comma grouping
  return {
    decimal: ".",
    group: /[, \u00A0]/g, // comma + spaces
  };
}

/**
 * Converte um valor em centavos (string ou number) para "R$ 1.234,56"
 * ou "R$ 1,234.56" etc, dependendo do idioma atual.
 */
export function formatCurrency(amount: string | number): string {
  const cents = Number(amount) || 0;
  const locale = getCurrentNumberLocale();

  return (cents / 100).toLocaleString(locale, {
    style: "currency",
    currency: "BRL", // ✅ moeda fixa por enquanto
  });
}

/**
 * Formata um valor em centavos (string de dígitos) como número sem símbolo
 * de moeda, respeitando o locale (separador de milhar/decimal).
 *
 * Ex:
 *  - pt-BR:  "123456" -> "1.234,56"
 *  - en-US:  "123456" -> "1,234.56"
 *  - de-DE:  "123456" -> "1.234,56"
 */
export const formatAmount = (input: string) => {
  const numericAmount = input.replace(/\D/g, "");
  if (numericAmount === "") {
    return "";
  }

  const floatAmount = Number(numericAmount) / 100;
  const locale = getCurrentNumberLocale();

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(floatAmount);
};

/**
 * Faz o caminho inverso: pega "R$ 1.234,56", "1,234.56",
 * "1 234,56" etc e devolve "1234.56" (ponto como decimal)
 * para uso interno.
 *
 * OBS: não converte para centavos; apenas normaliza o formato.
 */
export const unformatAmount = (formattedAmount: string) => {
  if (!formattedAmount) return "";

  const { decimal, group } = getLocaleSeparators();

  // Remove tudo que NÃO é dígito, ponto, vírgula ou sinal de menos
  let raw = formattedAmount.replace(/[^\d.,-]/g, "");

  // Remove separadores de milhar do locale atual
  raw = raw.replace(group, "");

  // Troca o separador decimal do locale por ponto (formato "interno")
  const normalized = raw.replace(decimal, ".");

  return normalized;
};
