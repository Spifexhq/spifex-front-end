// src/lib/tokens.ts

// 💥 CRITICAL SECURITY FIX: Access Token is now stored in-memory (private module variable)
// This prevents XSS attacks from stealing the token.
let _access: string = '';

// The refresh token is expected to be managed by the browser's secure (HttpOnly, Secure, SameSite=Strict)
// cookie jar, which cannot be read by client-side JavaScript.
// We assume the backend reads the cookie, so we don't need to return it here.

export const getAccess = (): string => _access;

export const getRefresh = (): string => {
  // Returns empty because the client code should never handle the raw refresh token string.
  return '';
};

// We accept the second argument to maintain compatibility with existing calls (e.g. from auth.ts),
// but we disable the lint warning because we intentionally do not use it in memory storage.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const setTokens = (access: string, _refresh?: string) => {
  _access = access;
  // Note: The backend should set the 'refresh' token as a Set-Cookie header.
};

export const clearTokens = () => {
  _access = '';
  // Note: The logout API call is responsible for clearing the HttpOnly cookie.
};