// src/redux/slices/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User, UserOrganizationDetail } from '@/models/auth/domain';
import { GetSubscriptionStatusResponse } from '@/models/auth/dto';

export interface AuthState {
  user: User | null;
  organization: UserOrganizationDetail | null;
  orgExternalId: string | null;
  subscription: GetSubscriptionStatusResponse | null;
  permissions: string[];
}

const initialState: AuthState = {
  user: null,
  organization: null,
  orgExternalId: null,
  subscription: null,
  permissions: [],
};

const slice = createSlice({
  name: 'auth',
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
    setSubscription: (s, a: PayloadAction<GetSubscriptionStatusResponse | null>) => {
      s.subscription = a.payload;
    },
    // Alias para compatibilidade com código que chama setSubscriptionStatus
    setSubscriptionStatus: (s, a: PayloadAction<GetSubscriptionStatusResponse | null>) => {
      s.subscription = a.payload;
    },
    clearSubscriptionStatus: (s) => {
      s.subscription = null;
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
  setSubscription,
  setSubscriptionStatus,
  clearSubscriptionStatus,
  resetAuth,
} = slice.actions;

export default slice.reducer;
