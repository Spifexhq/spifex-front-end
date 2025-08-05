import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User, UserEnterpriseDetail } from "@/models/auth/domain";
import { Subscription } from "@/models/auth/dto";

export interface AuthState {
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
    setUser: (s, a: PayloadAction<User | null>) => { s.user = a.payload; },
    setUserEnterprise: (s, a: PayloadAction<UserEnterpriseDetail | null>) => {
      s.enterprise = a.payload;
    },
    setSubscription: (s, a: PayloadAction<Subscription | null>) => {
      s.subscription = a.payload;
    },
    /** Faz logout global */
    resetAuth: () => initialState,
  },
});

export const { setUser, setUserEnterprise, setSubscription, resetAuth } =
  authSlice.actions;
export default authSlice.reducer;
