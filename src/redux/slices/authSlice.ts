// src/redux/slices/authSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User, UserOrganizationDetail } from "@/models/auth/user";

export interface AuthState {
  user: User | null;
  organization: UserOrganizationDetail | null;
  orgExternalId: string | null;

  isSubscribed: boolean;
  permissions: string[];
}

const initialState: AuthState = {
  user: null,
  organization: null,
  orgExternalId: null,
  isSubscribed: false,
  permissions: [],
};

// Preserve references when session revalidation returns the same JSON data.
// Dependent forms and lists must not reinitialize merely because focus returned.
function sameValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.prototype.hasOwnProperty.call(b, key) && sameValue(a[key], b[key]));
}

const slice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthSnapshot: (state, action: PayloadAction<{ user: User; organization: UserOrganizationDetail | null; permissions: string[]; is_subscribed: boolean }>) => {
      const payload = action.payload;
      const permissions = [...new Set((payload.permissions || []).filter(value => typeof value === "string"))].sort();
      if (!sameValue(state.user, payload.user)) state.user = payload.user;
      if (!sameValue(state.organization, payload.organization)) state.organization = payload.organization;
      state.orgExternalId = payload.organization?.organization?.id ?? null;
      if (!sameValue([...state.permissions].sort(), permissions)) state.permissions = permissions;
      state.isSubscribed = Boolean(payload.is_subscribed);
    },
    setUser: (s, a: PayloadAction<User | null>) => {
      if (s.user?.id !== a.payload?.id) { s.organization = null; s.orgExternalId = null; s.permissions = []; s.isSubscribed = false; }
      s.user = a.payload;
    },

    setUserOrganization: (s, a: PayloadAction<UserOrganizationDetail | null>) => {
      if (s.orgExternalId !== (a.payload?.organization?.id ?? null)) { s.permissions = []; s.isSubscribed = false; }
      s.organization = a.payload;
      s.orgExternalId = a.payload?.organization?.id ?? null;
    },

    setOrgExternalId: (s, a: PayloadAction<string | null>) => {
      if (s.orgExternalId !== a.payload) { s.organization = null; s.permissions = []; s.isSubscribed = false; }
      s.orgExternalId = a.payload;
    },

    setPermissions: (s, a: PayloadAction<string[]>) => {
      s.permissions = Array.isArray(a.payload) ? a.payload : [];
    },

    setIsSubscribed: (s, a: PayloadAction<boolean>) => {
      s.isSubscribed = Boolean(a.payload);
    },

    resetAuth: () => initialState,
  },
});

export const {
  setAuthSnapshot,
  setUser,
  setUserOrganization,
  setOrgExternalId,
  setPermissions,
  setIsSubscribed,
  resetAuth,
} = slice.actions;

export default slice.reducer;
