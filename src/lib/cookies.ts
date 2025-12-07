// src/lib/cookies.ts

/**
 * Utilitário centralizado para gerenciamento de cookies
 * Implementa hashing opcional para valores sensíveis e segurança adicional
 */

type CookieOptions = {
  path?: string;
  maxAge?: number;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  httpOnly?: boolean; // Apenas para referência (backend only)
};

/**
 * Hash simples usando base64
 * Não é criptografia forte, apenas ofuscação básica
 */
function simpleHash(value: string): string {
  return btoa(value);
}

/**
 * Decode hash base64
 */
function simpleUnhash(value: string): string {
  try {
    return atob(value);
  } catch {
    return value; // Retorna original se falhar
  }
}

/**
 * Hash usando SubtleCrypto (mais seguro, assíncrono)
 * Usa SHA-256 para criar um hash real
 */
async function cryptoHash(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Classe principal para gerenciar cookies
 */
export const Cookies = {
  /**
   * Define um cookie
   */
  set(name: string, value: string, options?: CookieOptions): void {
    const opts: Required<Omit<CookieOptions, 'httpOnly'>> = {
      path: '/',
      maxAge: 31536000, // 1 ano padrão
      secure: window.location.protocol === 'https:',
      sameSite: 'lax',
      ...options,
    };

    let cookie = `${name}=${encodeURIComponent(value)}`;
    cookie += `; path=${opts.path}`;
    cookie += `; max-age=${opts.maxAge}`;
    if (opts.secure) cookie += '; secure';
    cookie += `; samesite=${opts.sameSite}`;

    document.cookie = cookie;
  },

  /**
   * Define um cookie com valor hasheado (base64)
   */
  setHashed(name: string, value: string, options?: CookieOptions): void {
    const hashed = simpleHash(value);
    this.set(name, hashed, options);
  },

  /**
   * Obtém um cookie
   */
  get(name: string): string | null {
    const cookies = document.cookie.split('; ');
    const found = cookies.find(c => c.startsWith(`${name}=`));
    
    if (!found) return null;
    
    const value = found.split('=')[1];
    return decodeURIComponent(value);
  },

  /**
   * Obtém um cookie hasheado e retorna o valor original
   */
  getHashed(name: string): string | null {
    const value = this.get(name);
    if (!value) return null;
    return simpleUnhash(value);
  },

  /**
   * Remove um cookie
   */
  remove(name: string, path: string = '/'): void {
    document.cookie = `${name}=; path=${path}; max-age=0`;
  },

  /**
   * Obtém cookie como JSON
   */
  getJSON<T>(name: string): T | null {
    const value = this.get(name);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  /**
   * Define cookie como JSON
   */
  setJSON<T>(name: string, value: T, options?: CookieOptions): void {
    this.set(name, JSON.stringify(value), options);
  },

  /**
   * Verifica se um cookie existe
   */
  exists(name: string): boolean {
    return this.get(name) !== null;
  },

  /**
   * Lista todos os cookies disponíveis
   */
  getAll(): Record<string, string> {
    const cookies: Record<string, string> = {};
    const allCookies = document.cookie.split('; ');
    
    allCookies.forEach(cookie => {
      const [name, ...valueParts] = cookie.split('=');
      if (name) {
        cookies[name] = decodeURIComponent(valueParts.join('='));
      }
    });
    
    return cookies;
  },

  /**
   * Remove todos os cookies (útil para logout completo)
   */
  clearAll(): void {
    const all = this.getAll();
    Object.keys(all).forEach(name => this.remove(name));
  },
};

/* ==================== Cookies Específicos da Aplicação ==================== */

/**
 * Cookie de idioma (NÃO hasheado por padrão - pode ser hasheado se necessário)
 */
export const LanguageCookie = {
  NAME: 'app_language',
  MAX_AGE: 365 * 24 * 60 * 60, // 1 ano

  set(language: string, useHash: boolean = false): void {
    if (useHash) {
      Cookies.setHashed(this.NAME, language, {
        maxAge: this.MAX_AGE,
        sameSite: 'lax',
      });
    } else {
      Cookies.set(this.NAME, language, {
        maxAge: this.MAX_AGE,
        sameSite: 'lax',
      });
    }
  },

  get(useHash: boolean = false): string | null {
    return useHash 
      ? Cookies.getHashed(this.NAME)
      : Cookies.get(this.NAME);
  },

  remove(): void {
    Cookies.remove(this.NAME);
  },
};

export const NumberFormatCookie = {
  NAME: "app_number_format",
  set(code: "EU" | "US"): void {
    Cookies.set(this.NAME, code, { maxAge: 365 * 24 * 60 * 60, sameSite: "lax" });
  },
  get(): "EU" | "US" | null {
    const v = Cookies.get(this.NAME);
    return v === "EU" || v === "US" ? v : null;
  },
  remove(): void {
    Cookies.remove(this.NAME);
  },
};

export const DateFormatCookie = {
  NAME: "app_date_format",
  set(code: "DMY_SLASH" | "MDY_SLASH" | "YMD_ISO"): void {
    Cookies.set(this.NAME, code, { maxAge: 365 * 24 * 60 * 60, sameSite: "lax" });
  },
  get(): "DMY_SLASH" | "MDY_SLASH" | "YMD_ISO" | null {
    const v = Cookies.get(this.NAME);
    return v === "DMY_SLASH" || v === "MDY_SLASH" || v === "YMD_ISO" ? v : null;
  },
  remove(): void {
    Cookies.remove(this.NAME);
  },
};

/**
 * Cookie de tema (light/dark)
 */
export const ThemeCookie = {
  NAME: 'app_theme',
  MAX_AGE: 365 * 24 * 60 * 60,

  set(theme: 'light' | 'dark'): void {
    Cookies.set(this.NAME, theme, {
      maxAge: this.MAX_AGE,
      sameSite: 'lax',
    });
  },

  get(): 'light' | 'dark' | null {
    const value = Cookies.get(this.NAME);
    return value === 'light' || value === 'dark' ? value : null;
  },

  remove(): void {
    Cookies.remove(this.NAME);
  },
};

/**
 * Cookie de estado da sidebar
 */
export const SidebarCookie = {
  NAME: 'sidebar_collapsed',
  MAX_AGE: 365 * 24 * 60 * 60,

  set(collapsed: boolean): void {
    Cookies.set(this.NAME, String(collapsed), {
      maxAge: this.MAX_AGE,
      sameSite: 'lax',
    });
  },

  get(): boolean {
    const value = Cookies.get(this.NAME);
    return value === 'true';
  },

  remove(): void {
    Cookies.remove(this.NAME);
  },
};

/**
 * Cookie de densidade de tabelas
 */
export const TableDensityCookie = {
  NAME: 'table_density',
  MAX_AGE: 365 * 24 * 60 * 60,

  set(density: 'compact' | 'comfortable' | 'spacious'): void {
    Cookies.set(this.NAME, density, {
      maxAge: this.MAX_AGE,
      sameSite: 'lax',
    });
  },

  get(): 'compact' | 'comfortable' | 'spacious' {
    const value = Cookies.get(this.NAME);
    return (value as any) || 'comfortable';
  },

  remove(): void {
    Cookies.remove(this.NAME);
  },
};

/**
 * Cookie de preferências de formato de moeda
 */
export const CurrencyFormatCookie = {
  NAME: 'currency_format',
  MAX_AGE: 365 * 24 * 60 * 60,

  set(format: { currency: string; decimals: number; separator: string }): void {
    Cookies.setJSON(this.NAME, format, {
      maxAge: this.MAX_AGE,
      sameSite: 'lax',
    });
  },

  get(): { currency: string; decimals: number; separator: string } | null {
    return Cookies.getJSON(this.NAME);
  },

  remove(): void {
    Cookies.remove(this.NAME);
  },
};

/**
 * Cookie de última página visitada (para redirect após login)
 */
export const LastVisitedCookie = {
  NAME: 'last_visited',
  MAX_AGE: 60 * 60, // 1 hora

  set(path: string): void {
    Cookies.set(this.NAME, path, {
      maxAge: this.MAX_AGE,
      sameSite: 'lax',
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
 * Cookie de onboarding concluído
 */
export const OnboardingCookie = {
  NAME: 'onboarding_done',
  MAX_AGE: 365 * 24 * 60 * 60,

  set(done: boolean): void {
    Cookies.set(this.NAME, String(done), {
      maxAge: this.MAX_AGE,
      sameSite: 'lax',
    });
  },

  get(): boolean {
    const value = Cookies.get(this.NAME);
    return value === 'true';
  },

  remove(): void {
    Cookies.remove(this.NAME);
  },
};

/**
 * Cookie de tooltips dispensados
 */
export const DismissedTooltipsCookie = {
  NAME: 'dismissed_tooltips',
  MAX_AGE: 365 * 24 * 60 * 60,

  set(tooltipIds: string[]): void {
    Cookies.setJSON(this.NAME, tooltipIds, {
      maxAge: this.MAX_AGE,
      sameSite: 'lax',
    });
  },

  get(): string[] {
    return Cookies.getJSON(this.NAME) || [];
  },

  add(tooltipId: string): void {
    const current = this.get();
    if (!current.includes(tooltipId)) {
      this.set([...current, tooltipId]);
    }
  },

  remove(): void {
    Cookies.remove(this.NAME);
  },
};

/**
 * Cookie CSRF Token (referência - deve ser HttpOnly no backend)
 */
export const CSRFCookie = {
  NAME: 'csrf_token',

  get(): string | null {
    return Cookies.get(this.NAME);
  },

  // Note: CSRF tokens devem ser definidos pelo BACKEND com httpOnly: true
  // Este método é apenas para leitura no frontend
};

/* ==================== Hooks React (opcional) ==================== */

import { useState, useEffect } from 'react';

export function useLanguageCookie(useHash: boolean = false) {
  const [language, setLanguageState] = useState<string | null>(() => 
    LanguageCookie.get(useHash)
  );

  const setLanguage = (lang: string) => {
    LanguageCookie.set(lang, useHash);
    setLanguageState(lang);
  };

  return [language, setLanguage] as const;
}

export function useThemeCookie() {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => 
    ThemeCookie.get() || 'light'
  );

  const setTheme = (newTheme: 'light' | 'dark') => {
    ThemeCookie.set(newTheme);
    setThemeState(newTheme);
  };

  return [theme, setTheme] as const;
}

export function useSidebarCookie() {
  const [collapsed, setCollapsedState] = useState<boolean>(() => 
    SidebarCookie.get()
  );

  const setCollapsed = (value: boolean) => {
    SidebarCookie.set(value);
    setCollapsedState(value);
  };

  return [collapsed, setCollapsed] as const;
}

export function useTableDensityCookie() {
  const [density, setDensityState] = useState<'compact' | 'comfortable' | 'spacious'>(() => 
    TableDensityCookie.get()
  );

  const setDensity = (newDensity: typeof density) => {
    TableDensityCookie.set(newDensity);
    setDensityState(newDensity);
  };

  return [density, setDensity] as const;
}