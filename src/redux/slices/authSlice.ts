// src/redux/slices/authSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User, UserOrganizationDetail } from "src/models/auth/user";

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
      s.organization = a.payload;
      s.orgExternalId = a.payload?.organization?.id ?? null;
    },

    setOrgExternalId: (s, a: PayloadAction<string | null>) => {
      s.orgExternalId = a.payload;
      if (!a.payload) s.organization = null;
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
  setUser,
  setUserOrganization,
  setOrgExternalId,
  setPermissions,
  setIsSubscribed,
  resetAuth,
} = slice.actions;

export default slice.reducer;
