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

const slice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthSnapshot: (_s, a: PayloadAction<{ user: User; organization: UserOrganizationDetail | null; permissions: string[]; is_subscribed: boolean }>) => ({
      user: a.payload.user,
      organization: a.payload.organization,
      orgExternalId: a.payload.organization?.organization?.id ?? null,
      permissions: [...new Set((a.payload.permissions || []).filter(value => typeof value === "string"))],
      isSubscribed: Boolean(a.payload.is_subscribed),
    }),
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
