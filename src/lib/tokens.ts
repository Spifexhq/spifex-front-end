// src/lib/tokens.ts

const ACCESS_STORAGE_KEY = "spifex:access";
const ORG_EXTERNAL_ID_STORAGE_KEY = "spifex:org-external-id";
const USER_ID_STORAGE_KEY = "spifex:user-id";

let _access = "";
let _orgExternalId = "";
let _userId = "";

function getSessionStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function loadFromSession(key: string): string {
  const ss = getSessionStorage();
  if (!ss) return "";
  const v = ss.getItem(key);
  return typeof v === "string" ? v : "";
}

// Initialize from sessionStorage (tab-scoped persistence)
_access = loadFromSession(ACCESS_STORAGE_KEY);
_orgExternalId = loadFromSession(ORG_EXTERNAL_ID_STORAGE_KEY);
_userId = loadFromSession(USER_ID_STORAGE_KEY);

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

// -----------------------------------------------------------------------------
// Org external id (tab-scoped persistence)
// -----------------------------------------------------------------------------

export const getOrgExternalIdStored = (): string => _orgExternalId;

export const setOrgExternalIdStored = (externalId: string) => {
  const v = (externalId || "").trim();
  _orgExternalId = v;

  const ss = getSessionStorage();
  if (!ss) return;

  if (v) ss.setItem(ORG_EXTERNAL_ID_STORAGE_KEY, v);
  else ss.removeItem(ORG_EXTERNAL_ID_STORAGE_KEY);
};

export const clearOrgExternalIdStored = () => {
  setOrgExternalIdStored("");
};

// -----------------------------------------------------------------------------
// User id (external_id) (tab-scoped persistence)
// -----------------------------------------------------------------------------

export const getUserIdStored = (): string => _userId;

export const setUserIdStored = (userId: string) => {
  const v = (userId || "").trim();
  _userId = v;

  const ss = getSessionStorage();
  if (!ss) return;

  if (v) ss.setItem(USER_ID_STORAGE_KEY, v);
  else ss.removeItem(USER_ID_STORAGE_KEY);
};

export const clearUserIdStored = () => {
  setUserIdStored("");
};
