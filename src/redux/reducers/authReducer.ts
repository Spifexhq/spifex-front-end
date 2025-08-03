import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { User, UserEnterpriseDetail } from "@/models/auth/domain"
import { Subscription } from "src/models/auth/dto";

interface AuthState {
  user: User | null;
  enterprise: UserEnterpriseDetail | null;
  subscription: Subscription | null;
}

const initialState: AuthState = {
  user: null,
  enterprise: null,
  subscription: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
    },
    setUserEnterprise: (state, action: PayloadAction<UserEnterpriseDetail | null>) => {
      state.enterprise = action.payload;
    },
    setSubscriptionStatus: (state, action: PayloadAction<Subscription | null>) => {
      state.subscription = action.payload;
    },
    clearSubscriptionStatus: (state) => {
      state.subscription = null;
    },
  },
});

export const { setUser, setUserEnterprise, setSubscriptionStatus, clearSubscriptionStatus } = authSlice.actions;
export default authSlice.reducer;
