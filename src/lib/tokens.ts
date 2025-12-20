// src/lib/tokens.ts

const ACCESS_STORAGE_KEY = "spifex:access";

let _access = "";

function getSessionStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function loadAccessFromSession(): string {
  const ss = getSessionStorage();
  if (!ss) return "";
  const v = ss.getItem(ACCESS_STORAGE_KEY);
  return typeof v === "string" ? v : "";
}

// Initialize from sessionStorage (tab-scoped persistence)
_access = loadAccessFromSession();

export const getAccess = (): string => _access;

export const getRefresh = (): string => "";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const setTokens = (access: string, _refresh?: string) => {
  _access = access || "";

  const ss = getSessionStorage();
  if (!ss) return;

  if (_access) ss.setItem(ACCESS_STORAGE_KEY, _access);
  else ss.removeItem(ACCESS_STORAGE_KEY);
};

export const clearTokens = () => {
  _access = "";

  const ss = getSessionStorage();
  if (!ss) return;

  ss.removeItem(ACCESS_STORAGE_KEY);
};
