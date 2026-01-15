// src/lib/tokens.ts

const ACCESS_STORAGE_KEY = "c0";                 // sessionStorage (tab-scoped)
const ORG_EXTERNAL_ID_STORAGE_KEY = "tenant";    // localStorage (cross-tab)
const USER_ID_STORAGE_KEY = "uid";               // localStorage (cross-tab)

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

function getLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function loadFrom(storage: Storage | null, key: string): string {
  if (!storage) return "";
  const v = storage.getItem(key);
  return typeof v === "string" ? v : "";
}

// Initialize
_access = loadFrom(getSessionStorage(), ACCESS_STORAGE_KEY);
_orgExternalId = loadFrom(getLocalStorage(), ORG_EXTERNAL_ID_STORAGE_KEY);
_userId = loadFrom(getLocalStorage(), USER_ID_STORAGE_KEY);

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
// Org external id (cross-tab persistence)
// -----------------------------------------------------------------------------

export const getOrgExternalIdStored = (): string => _orgExternalId;

export const setOrgExternalIdStored = (externalId: string) => {
  const v = (externalId || "").trim();
  _orgExternalId = v;

  const ls = getLocalStorage();
  if (!ls) return;

  if (v) ls.setItem(ORG_EXTERNAL_ID_STORAGE_KEY, v);
  else ls.removeItem(ORG_EXTERNAL_ID_STORAGE_KEY);
};

export const clearOrgExternalIdStored = () => {
  setOrgExternalIdStored("");
};

// -----------------------------------------------------------------------------
// User id (external_id) (cross-tab persistence)
// -----------------------------------------------------------------------------

export const getUserIdStored = (): string => _userId;

export const setUserIdStored = (userId: string) => {
  const v = (userId || "").trim();
  _userId = v;

  const ls = getLocalStorage();
  if (!ls) return;

  if (v) ls.setItem(USER_ID_STORAGE_KEY, v);
  else ls.removeItem(USER_ID_STORAGE_KEY);
};

export const clearUserIdStored = () => {
  setUserIdStored("");
};
