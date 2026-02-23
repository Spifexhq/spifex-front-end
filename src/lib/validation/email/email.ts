type EmailValidationResult = {
  isValid: boolean;
  normalized: string;
  message?: string;
};

const COMMON_EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  "gmal.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmail.con": "gmail.com",
  "hotmial.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com",
  "yaho.com": "yahoo.com",
  "yhoo.com": "yahoo.com",
  "iclod.com": "icloud.com",
};

const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
]);

export const validateEmailFormat = (
  emailRaw: string,
  t: (key: string, options?: Record<string, unknown>) => string
): EmailValidationResult => {
  const normalized = emailRaw.trim().toLowerCase();

  if (!normalized) {
    return { isValid: false, normalized, message: t("fillAllFields") };
  }

  if (normalized.length > 254) {
    return { isValid: false, normalized, message: t("invalidEmailFormat") };
  }

  if (/\s/.test(normalized)) {
    return { isValid: false, normalized, message: t("invalidEmailFormat") };
  }

  // Must contain exactly one "@"
  const atCount = (normalized.match(/@/g) || []).length;
  if (atCount !== 1) {
    return { isValid: false, normalized, message: t("invalidEmailFormat") };
  }

  const [localPart, domain] = normalized.split("@");

  if (!localPart || !domain) {
    return { isValid: false, normalized, message: t("invalidEmailFormat") };
  }

  if (localPart.length > 64) {
    return { isValid: false, normalized, message: t("invalidEmailFormat") };
  }

  // Local-part sanity
  if (
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..")
  ) {
    return { isValid: false, normalized, message: t("invalidEmailFormat") };
  }

  // Domain sanity
  if (
    domain.startsWith(".") ||
    domain.endsWith(".") ||
    domain.includes("..")
  ) {
    return { isValid: false, normalized, message: t("invalidEmailFormat") };
  }

  // Reject localhost and plain IPs (optional but common for public signup)
  if (domain === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) {
    return { isValid: false, normalized, message: t("invalidEmailFormat") };
  }

  // Require at least one dot in domain and a 2+ letter TLD
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(domain)) {
    return { isValid: false, normalized, message: t("invalidEmailFormat") };
  }

  const tld = domain.split(".").pop() || "";
  if (!/^[a-z]{2,24}$/i.test(tld)) {
    return { isValid: false, normalized, message: t("invalidEmailFormat") };
  }

  // Reasonable overall regex (not too strict)
  const emailRegex =
    /^(?=.{1,254}$)(?=.{1,64}@)[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;

  if (!emailRegex.test(normalized)) {
    return { isValid: false, normalized, message: t("invalidEmailFormat") };
  }

  // Disposable email (optional)
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { isValid: false, normalized, message: t("disposableEmailNotAllowed") };
  }

  // Common typo suggestion (UX)
  if (COMMON_EMAIL_DOMAIN_TYPOS[domain]) {
    const suggestion = `${localPart}@${COMMON_EMAIL_DOMAIN_TYPOS[domain]}`;
    return {
      isValid: false,
      normalized,
      message: t("emailTypoSuggestion", { suggestedEmail: suggestion }),
    };
  }

  return { isValid: true, normalized };
};
