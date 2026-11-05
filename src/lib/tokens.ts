import { advanceAuthGeneration } from "./authGeneration";
// src/lib/tokens.ts

export const ORG_EXTERNAL_ID_STORAGE_KEY = "spx_tenant";
export const USER_ID_STORAGE_KEY = "spx_uid";

let _access = "";
let _orgExternalId = "";
let _userId = "";

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
  try {
    const value = storage.getItem(key);
    return typeof value === "string" ? value : "";
  } catch { return ""; }
}

// Access token is memory-only.
// Do not read it from localStorage/sessionStorage.
_orgExternalId = loadFrom(getLocalStorage(), ORG_EXTERNAL_ID_STORAGE_KEY);
_userId = loadFrom(getLocalStorage(), USER_ID_STORAGE_KEY);

export const getAccess = (): string => _access;

// Keep the signature stable, but do not persist the access token.
export const setTokens = (access: string): void => {
  _access = access || "";
};

export const clearTokens = (): void => {
  _access = "";
  advanceAuthGeneration();
};

// -----------------------------------------------------------------------------
// Org external id
// -----------------------------------------------------------------------------

export const getOrgExternalIdStored = (): string => _orgExternalId;

export const setOrgExternalIdStored = (externalId: string): void => {
  const value = (externalId || "").trim();
  _orgExternalId = value;

  const storage = getLocalStorage();
  if (!storage) return;

  try {
    if (value) storage.setItem(ORG_EXTERNAL_ID_STORAGE_KEY, value);
    else storage.removeItem(ORG_EXTERNAL_ID_STORAGE_KEY);
  } catch { /* Memory state remains usable when storage is blocked. */ }
};

export const clearOrgExternalIdStored = (): void => {
  setOrgExternalIdStored("");
};

// -----------------------------------------------------------------------------
// User id
// -----------------------------------------------------------------------------

export const getUserIdStored = (): string => _userId;

export const setUserIdStored = (userId: string): void => {
  const value = (userId || "").trim();
  _userId = value;

  const storage = getLocalStorage();
  if (!storage) return;

  try {
    if (value) storage.setItem(USER_ID_STORAGE_KEY, value);
    else storage.removeItem(USER_ID_STORAGE_KEY);
  } catch { /* Memory state remains usable when storage is blocked. */ }
};

export const clearUserIdStored = (): void => {
  setUserIdStored("");
};
export function reloadStoredIdentity() {
  _orgExternalId = loadFrom(getLocalStorage(), ORG_EXTERNAL_ID_STORAGE_KEY);
  _userId = loadFrom(getLocalStorage(), USER_ID_STORAGE_KEY);
}
