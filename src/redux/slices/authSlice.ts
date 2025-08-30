// src/redux/slices/authSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User, UserOrganizationDetail } from "@/models/auth/domain";
import { Subscription } from "@/models/auth/dto";

export interface AuthState {
  user: User | null;
  organization: UserOrganizationDetail | null;
  subscription: Subscription | null;
  permissions: string[];
}

const initialState: AuthState = {
  user: null,
  organization: null,
  subscription: null,
  permissions: [],
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (s, a: PayloadAction<User | null>) => {
      s.user = a.payload;
    },
    setUserOrganization: (s, a: PayloadAction<UserOrganizationDetail | null>) => {
      s.organization = a.payload
        ? { ...a.payload, permissions: Array.isArray(a.payload.permissions) ? a.payload.permissions : s.organization?.permissions }
        : null;
    },
    setOrganizationPermissions: (s, a: PayloadAction<string[]>) => {
      if (s.organization) s.organization.permissions = a.payload;
      s.permissions = Array.isArray(a.payload) ? a.payload : [];
    },
    setPermissions: (s, a: PayloadAction<string[]>) => {
      s.permissions = Array.isArray(a.payload) ? a.payload : [];
      if (s.organization) s.organization.permissions = s.permissions;
    },
    setSubscription: (s, a: PayloadAction<Subscription | null>) => {
      s.subscription = a.payload;
    },
    resetAuth: () => initialState,
  },
});

export const {
  setUser,
  setUserOrganization,
  setOrganizationPermissions,
  setPermissions,
  setSubscription,
  resetAuth,
} = authSlice.actions;

export default authSlice.reducer;
