// src/redux/slices/authSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User, UserOrganizationDetail } from "@/models/auth/domain";

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
    setUser: (s, a: PayloadAction<User | null>) => {
      s.user = a.payload;
    },
    setUserOrganization: (s, a: PayloadAction<UserOrganizationDetail | null>) => {
      s.organization = a.payload
        ? {
            ...a.payload,
            permissions: Array.isArray(a.payload.permissions)
              ? a.payload.permissions
              : s.organization?.permissions,
          }
        : null;

      s.orgExternalId = a.payload?.organization?.external_id ?? null;
    },
    setOrgExternalId: (s, a: PayloadAction<string | null>) => {
      s.orgExternalId = a.payload;
    },
    setOrganizationPermissions: (s, a: PayloadAction<string[]>) => {
      if (s.organization) s.organization.permissions = a.payload;
      s.permissions = Array.isArray(a.payload) ? a.payload : [];
    },
    setPermissions: (s, a: PayloadAction<string[]>) => {
      s.permissions = Array.isArray(a.payload) ? a.payload : [];
      if (s.organization) s.organization.permissions = s.permissions;
    },

    setIsSubscribed: (s, a: PayloadAction<boolean>) => {
      s.isSubscribed = Boolean(a.payload);
    },

    resetAuth: () => initialState,
  },
});

export const {
  setUser,
  setUserOrganization,
  setOrgExternalId,
  setOrganizationPermissions,
  setPermissions,
  setIsSubscribed,
  resetAuth,
} = slice.actions;

export default slice.reducer;
