// src/lib/tokens.ts
const ACCESS_KEY = 'AUTH_ACCESS';
const REFRESH_KEY = 'AUTH_REFRESH';

export const getAccess = () => localStorage.getItem(ACCESS_KEY) ?? '';
export const getRefresh = () => localStorage.getItem(REFRESH_KEY) ?? '';

export const setTokens = (access: string, refresh?: string) => {
  localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
};
