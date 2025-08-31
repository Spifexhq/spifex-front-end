// src/redux/reducers/authReducer.ts
import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { User, UserOrganizationDetail } from "@/models/auth/domain"
import { Subscription } from "src/models/auth/dto";
export * from '../slices/authSlice';

interface AuthState {
  user: User | null;
  organization: UserOrganizationDetail | null;
  orgExternalId: string | null;
  subscription: Subscription | null;
  permissions: string[];
}

const initialState: AuthState = {
  user: null,
  organization: null,
  orgExternalId: null,
  subscription: null,
  permissions: [],
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
    },
    setUserOrganization: (state, action: PayloadAction<UserOrganizationDetail | null>) => {
      state.organization = action.payload;
    },
    setOrgExternalId: (state, action: PayloadAction<string | null>) => {
      state.orgExternalId = action.payload;
    },
    setSubscriptionStatus: (state, action: PayloadAction<Subscription | null>) => {
      state.subscription = action.payload;
    },
    setPermissions: (state, action: PayloadAction<string[]>) => {
      state.permissions = Array.isArray(action.payload) ? action.payload : [];
      if (state.organization) {
        state.organization.permissions = state.permissions;
      }
    },
    clearSubscriptionStatus: (state) => {
      state.subscription = null;
    },
    resetAuth: () => initialState,
  },
});

export const { 
  setUser, 
  setUserOrganization, 
  setOrgExternalId,
  setSubscriptionStatus,
  setPermissions,
  clearSubscriptionStatus, 
  resetAuth 
} = authSlice.actions;

export default authSlice.reducer;
