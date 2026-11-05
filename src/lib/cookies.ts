// src/lib/cookies.ts

import { useState } from "react";

/**
 * Centralized browser cookie utility.
 *
 * Rules:
 * - Cookies are only for values the backend may need.
 * - Frontend-only UI preferences should use localStorage/sessionStorage.
 * - This file does not implement hashing/encryption. Do not store secrets here.
 */

type CookieSameSite = "strict" | "lax" | "none";

type CookieOptions = {
  path?: string;
  maxAge?: number;
  secure?: boolean;
  sameSite?: CookieSameSite;
  domain?: string;
};

type RemoveCookieOptions = {
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: CookieSameSite;
};

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

function hasDocument(): boolean {
  return typeof document !== "undefined";
}

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function defaultSecure(): boolean {
  return hasWindow() && window.location.protocol === "https:";
}

function assertValidCookieName(name: string): void {
  if (!name || /[\s;=]/.test(name)) {
    throw new Error(`Invalid cookie name: "${name}"`);
  }
}

function formatSameSite(value: CookieSameSite): "Strict" | "Lax" | "None" {
  if (value === "strict") return "Strict";
  if (value === "none") return "None";
  return "Lax";
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export const Cookies = {
  set(name: string, value: string, options?: CookieOptions): void {
    if (!hasDocument()) return;

    assertValidCookieName(name);

    const sameSite = options?.sameSite ?? "lax";
    const secure = sameSite === "none" ? true : options?.secure ?? defaultSecure();

    const parts = [
      `${name}=${encodeURIComponent(value)}`,
      `Path=${options?.path ?? "/"}`,
      `Max-Age=${options?.maxAge ?? ONE_YEAR_SECONDS}`,
      `SameSite=${formatSameSite(sameSite)}`,
    ];

    if (secure) parts.push("Secure");
    if (options?.domain) parts.push(`Domain=${options.domain}`);

    document.cookie = parts.join("; ");
  },

  get(name: string): string | null {
    if (!hasDocument() || !document.cookie) return null;

    assertValidCookieName(name);

    const cookies = document.cookie.split("; ");

    for (const cookie of cookies) {
      const [cookieName, ...valueParts] = cookie.split("=");

      if (cookieName === name) {
        return safeDecodeURIComponent(valueParts.join("="));
      }
    }

    return null;
  },

  remove(name: string, options?: RemoveCookieOptions): void {
    if (!hasDocument()) return;

    assertValidCookieName(name);

    const sameSite = options?.sameSite ?? "lax";
    const secure = options?.secure ?? defaultSecure();

    const parts = [
      `${name}=`,
      `Path=${options?.path ?? "/"}`,
      "Max-Age=0",
      `SameSite=${formatSameSite(sameSite)}`,
    ];

    if (secure) parts.push("Secure");
    if (options?.domain) parts.push(`Domain=${options.domain}`);

    document.cookie = parts.join("; ");
  },

  getJSON<T>(name: string): T | null {
    const value = this.get(name);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  setJSON<T>(name: string, value: T, options?: CookieOptions): void {
    this.set(name, JSON.stringify(value), options);
  },

  exists(name: string): boolean {
    return this.get(name) !== null;
  },

  getAll(): Record<string, string> {
    if (!hasDocument() || !document.cookie) return {};

    const result: Record<string, string> = {};

    for (const cookie of document.cookie.split("; ")) {
      const [name, ...valueParts] = cookie.split("=");

      if (name) {
        result[name] = safeDecodeURIComponent(valueParts.join("="));
      }
    }

    return result;
  },

  clear(names: string[], options?: RemoveCookieOptions): void {
    names.forEach((name) => this.remove(name, options));
  },

  /**
   * Kept only for backward compatibility.
   * Do not use this for logout. Auth cookies must be cleared by the backend.
   */
  clearAll(): void {
    this.clearKnownAppCookies();
  },

  clearKnownAppCookies(): void {
    this.clear([LanguageCookie.NAME, LastVisitedCookie.NAME]);
  },
};

/* -------------------------------------------------------------------------- */
/* Local/session preference storage                                            */
/* -------------------------------------------------------------------------- */

type StoredValue<T> = {
  value: T;
  expiresAt?: number;
};

function getLocalStorage(): Storage | null {
  try {
    if (!hasWindow()) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  try {
    if (!hasWindow()) return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function writeStoredValue<T>(
  storage: Storage | null,
  key: string,
  value: T,
  maxAgeSeconds?: number,
): void {
  if (!storage) return;

  const payload: StoredValue<T> = {
    value,
    expiresAt: maxAgeSeconds ? Date.now() + maxAgeSeconds * 1000 : undefined,
  };

  storage.setItem(key, JSON.stringify(payload));
}

function readStoredValue<T>(
  storage: Storage | null,
  key: string,
  isValid?: (value: unknown) => value is T,
): T | null {
  if (!storage) return null;

  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredValue<unknown>;

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.expiresAt === "number" &&
      parsed.expiresAt <= Date.now()
    ) {
      storage.removeItem(key);
      return null;
    }

    const value = parsed && typeof parsed === "object" && "value" in parsed
      ? parsed.value
      : parsed;

    if (isValid && !isValid(value)) return null;

    return value as T;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function removeStoredValue(storage: Storage | null, key: string): void {
  storage?.removeItem(key);
}

function migrateCookieStringToLocalStorage<T extends string>(
  cookieName: string,
  storageKey: string,
  isValid: (value: unknown) => value is T,
  maxAgeSeconds?: number,
): T | null {
  const value = Cookies.get(cookieName);

  if (!isValid(value)) return null;

  writeStoredValue(getLocalStorage(), storageKey, value, maxAgeSeconds);
  Cookies.remove(cookieName);

  return value;
}

function migrateCookieJSONToLocalStorage<T>(
  cookieName: string,
  storageKey: string,
  isValid: (value: unknown) => value is T,
  maxAgeSeconds?: number,
): T | null {
  const value = Cookies.getJSON<unknown>(cookieName);

  if (!isValid(value)) return null;

  writeStoredValue(getLocalStorage(), storageKey, value, maxAgeSeconds);
  Cookies.remove(cookieName);

  return value;
}

/* -------------------------------------------------------------------------- */
/* Real cookies                                                                */
/* -------------------------------------------------------------------------- */

export const LanguageCookie = {
  NAME: "lang",
  MAX_AGE: ONE_YEAR_SECONDS,

  set(language: string): void {
    Cookies.set(this.NAME, language, {
      maxAge: this.MAX_AGE,
      sameSite: "lax",
    });
  },

  get(): string | null {
    return Cookies.get(this.NAME);
  },

  remove(): void {
    Cookies.remove(this.NAME);
  },
};

/**
 * Last visited route is frontend-only.
 * Kept under the old export name to avoid breaking imports.
 */
export const LastVisitedCookie = {
  NAME: "last_visited",
  STORAGE_KEY: "spifex:last_visited",
  MAX_AGE: 60 * 60,

  set(path: string): void {
    writeStoredValue(getSessionStorage(), this.STORAGE_KEY, path, this.MAX_AGE);
  },

  get(): string | null {
    const fromSession = readStoredValue<string>(
      getSessionStorage(),
      this.STORAGE_KEY,
      (v): v is string => typeof v === "string",
    );

    if (fromSession) return fromSession;

    const fromCookie = Cookies.get(this.NAME);
    if (!fromCookie) return null;

    writeStoredValue(getSessionStorage(), this.STORAGE_KEY, fromCookie, this.MAX_AGE);
    Cookies.remove(this.NAME);

    return fromCookie;
  },

  remove(): void {
    removeStoredValue(getSessionStorage(), this.STORAGE_KEY);
    Cookies.remove(this.NAME);
  },
};

/* -------------------------------------------------------------------------- */
/* Frontend-only preferences                                                   */
/* -------------------------------------------------------------------------- */

export const NumberFormatCookie = {
  NAME: "app_number_format",
  STORAGE_KEY: "spifex:number_format",
  MAX_AGE: ONE_YEAR_SECONDS,

  set(code: "EU" | "US"): void {
    writeStoredValue(getLocalStorage(), this.STORAGE_KEY, code, this.MAX_AGE);
  },

  get(): "EU" | "US" | null {
    const isValid = (v: unknown): v is "EU" | "US" => v === "EU" || v === "US";

    return (
      readStoredValue(getLocalStorage(), this.STORAGE_KEY, isValid) ??
      migrateCookieStringToLocalStorage(this.NAME, this.STORAGE_KEY, isValid, this.MAX_AGE)
    );
  },

  remove(): void {
    removeStoredValue(getLocalStorage(), this.STORAGE_KEY);
    Cookies.remove(this.NAME);
  },
};

export const DateFormatCookie = {
  NAME: "app_date_format",
  STORAGE_KEY: "spifex:date_format",
  MAX_AGE: ONE_YEAR_SECONDS,

  set(code: "DMY_SLASH" | "MDY_SLASH" | "YMD_ISO"): void {
    writeStoredValue(getLocalStorage(), this.STORAGE_KEY, code, this.MAX_AGE);
  },

  get(): "DMY_SLASH" | "MDY_SLASH" | "YMD_ISO" | null {
    const isValid = (v: unknown): v is "DMY_SLASH" | "MDY_SLASH" | "YMD_ISO" =>
      v === "DMY_SLASH" || v === "MDY_SLASH" || v === "YMD_ISO";

    return (
      readStoredValue(getLocalStorage(), this.STORAGE_KEY, isValid) ??
      migrateCookieStringToLocalStorage(this.NAME, this.STORAGE_KEY, isValid, this.MAX_AGE)
    );
  },

  remove(): void {
    removeStoredValue(getLocalStorage(), this.STORAGE_KEY);
    Cookies.remove(this.NAME);
  },
};

export const ThemeCookie = {
  NAME: "app_theme",
  STORAGE_KEY: "spifex:theme",
  MAX_AGE: ONE_YEAR_SECONDS,

  set(theme: "light" | "dark"): void {
    writeStoredValue(getLocalStorage(), this.STORAGE_KEY, theme, this.MAX_AGE);
  },

  get(): "light" | "dark" | null {
    const isValid = (v: unknown): v is "light" | "dark" => v === "light" || v === "dark";

    return (
      readStoredValue(getLocalStorage(), this.STORAGE_KEY, isValid) ??
      migrateCookieStringToLocalStorage(this.NAME, this.STORAGE_KEY, isValid, this.MAX_AGE)
    );
  },

  remove(): void {
    removeStoredValue(getLocalStorage(), this.STORAGE_KEY);
    Cookies.remove(this.NAME);
  },
};

export const SidebarCookie = {
  NAME: "sidebar_collapsed",
  STORAGE_KEY: "spifex:sidebar_collapsed",
  MAX_AGE: ONE_YEAR_SECONDS,

  set(collapsed: boolean): void {
    writeStoredValue(getLocalStorage(), this.STORAGE_KEY, collapsed, this.MAX_AGE);
  },

  get(): boolean {
    const local = readStoredValue<boolean>(
      getLocalStorage(),
      this.STORAGE_KEY,
      (v): v is boolean => typeof v === "boolean",
    );

    if (local !== null) return local;

    const cookie = Cookies.get(this.NAME);
    if (cookie === "true" || cookie === "false") {
      const value = cookie === "true";
      writeStoredValue(getLocalStorage(), this.STORAGE_KEY, value, this.MAX_AGE);
      Cookies.remove(this.NAME);
      return value;
    }

    return false;
  },

  remove(): void {
    removeStoredValue(getLocalStorage(), this.STORAGE_KEY);
    Cookies.remove(this.NAME);
  },
};

export type TableDensity = "compact" | "comfortable" | "spacious";

export const TableDensityCookie = {
  NAME: "table_density",
  STORAGE_KEY: "spifex:table_density",
  MAX_AGE: ONE_YEAR_SECONDS,

  set(density: TableDensity): void {
    writeStoredValue(getLocalStorage(), this.STORAGE_KEY, density, this.MAX_AGE);
  },

  get(): TableDensity {
    const isValid = (v: unknown): v is TableDensity =>
      v === "compact" || v === "comfortable" || v === "spacious";

    return (
      readStoredValue(getLocalStorage(), this.STORAGE_KEY, isValid) ??
      migrateCookieStringToLocalStorage(this.NAME, this.STORAGE_KEY, isValid, this.MAX_AGE) ??
      "comfortable"
    );
  },

  remove(): void {
    removeStoredValue(getLocalStorage(), this.STORAGE_KEY);
    Cookies.remove(this.NAME);
  },
};

type CurrencyFormat = {
  currency: string;
  decimals: number;
  separator: string;
};

function isCurrencyFormat(value: unknown): value is CurrencyFormat {
  if (!value || typeof value !== "object") return false;

  const v = value as Partial<CurrencyFormat>;

  return (
    typeof v.currency === "string" &&
    typeof v.decimals === "number" &&
    typeof v.separator === "string"
  );
}

export const CurrencyFormatCookie = {
  NAME: "currency_format",
  STORAGE_KEY: "spifex:currency_format",
  MAX_AGE: ONE_YEAR_SECONDS,

  set(format: CurrencyFormat): void {
    writeStoredValue(getLocalStorage(), this.STORAGE_KEY, format, this.MAX_AGE);
  },

  get(): CurrencyFormat | null {
    return (
      readStoredValue(getLocalStorage(), this.STORAGE_KEY, isCurrencyFormat) ??
      migrateCookieJSONToLocalStorage(this.NAME, this.STORAGE_KEY, isCurrencyFormat, this.MAX_AGE)
    );
  },

  remove(): void {
    removeStoredValue(getLocalStorage(), this.STORAGE_KEY);
    Cookies.remove(this.NAME);
  },
};

export const OnboardingCookie = {
  NAME: "onboarding_done",
  STORAGE_KEY: "spifex:onboarding_done",
  MAX_AGE: ONE_YEAR_SECONDS,

  set(done: boolean): void {
    writeStoredValue(getLocalStorage(), this.STORAGE_KEY, done, this.MAX_AGE);
  },

  get(): boolean {
    const local = readStoredValue<boolean>(
      getLocalStorage(),
      this.STORAGE_KEY,
      (v): v is boolean => typeof v === "boolean",
    );

    if (local !== null) return local;

    const cookie = Cookies.get(this.NAME);
    if (cookie === "true" || cookie === "false") {
      const value = cookie === "true";
      writeStoredValue(getLocalStorage(), this.STORAGE_KEY, value, this.MAX_AGE);
      Cookies.remove(this.NAME);
      return value;
    }

    return false;
  },

  remove(): void {
    removeStoredValue(getLocalStorage(), this.STORAGE_KEY);
    Cookies.remove(this.NAME);
  },
};

export const DismissedTooltipsCookie = {
  NAME: "dismissed_tooltips",
  STORAGE_KEY: "spifex:dismissed_tooltips",
  MAX_AGE: ONE_YEAR_SECONDS,

  set(tooltipIds: string[]): void {
    const cleanIds = tooltipIds.filter((id) => typeof id === "string" && id.trim());
    writeStoredValue(getLocalStorage(), this.STORAGE_KEY, cleanIds, this.MAX_AGE);
  },

  get(): string[] {
    const isValid = (value: unknown): value is string[] =>
      Array.isArray(value) && value.every((item) => typeof item === "string");

    return (
      readStoredValue(getLocalStorage(), this.STORAGE_KEY, isValid) ??
      migrateCookieJSONToLocalStorage(this.NAME, this.STORAGE_KEY, isValid, this.MAX_AGE) ??
      []
    );
  },

  add(tooltipId: string): void {
    const id = tooltipId.trim();
    if (!id) return;

    const current = this.get();

    if (!current.includes(id)) {
      this.set([...current, id]);
    }
  },

  remove(): void {
    removeStoredValue(getLocalStorage(), this.STORAGE_KEY);
    Cookies.remove(this.NAME);
  },
};

/**
 * CSRF cookie reader.
 *
 * This only works if the backend intentionally exposes a non-HttpOnly CSRF
 * cookie. If the cookie is HttpOnly, JavaScript cannot and should not read it.
 */
export const CSRFCookie = {
  NAME: "csrftoken",

  get(): string | null {
    return Cookies.get(this.NAME);
  },
};

/* -------------------------------------------------------------------------- */
/* React hooks                                                                 */
/* -------------------------------------------------------------------------- */

export function useLanguageCookie() {
  const [language, setLanguageState] = useState<string | null>(() => LanguageCookie.get());

  const setLanguage = (lang: string) => {
    LanguageCookie.set(lang);
    setLanguageState(lang);
  };

  return [language, setLanguage] as const;
}

export function useThemeCookie() {
  const [theme, setThemeState] = useState<"light" | "dark">(() => ThemeCookie.get() || "light");

  const setTheme = (newTheme: "light" | "dark") => {
    ThemeCookie.set(newTheme);
    setThemeState(newTheme);
  };

  return [theme, setTheme] as const;
}

export function useSidebarCookie() {
  const [collapsed, setCollapsedState] = useState<boolean>(() => SidebarCookie.get());

  const setCollapsed = (value: boolean) => {
    SidebarCookie.set(value);
    setCollapsedState(value);
  };

  return [collapsed, setCollapsed] as const;
}

export function useTableDensityCookie() {
  const [density, setDensityState] = useState<TableDensity>(() => TableDensityCookie.get());

  const setDensity = (newDensity: TableDensity) => {
    TableDensityCookie.set(newDensity);
    setDensityState(newDensity);
  };

  return [density, setDensity] as const;
}