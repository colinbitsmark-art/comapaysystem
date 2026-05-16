import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthResponse } from "../types";

export interface AuthState {
  user: AuthResponse | null;
}

const saved = localStorage.getItem("auth_user");
const initialState: AuthState = {
  user: saved ? (JSON.parse(saved) as AuthResponse) : null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthResponse | null>) {
      state.user = action.payload;
      if (action.payload) {
        localStorage.setItem("auth_user", JSON.stringify(action.payload));
      } else {
        localStorage.removeItem("auth_user");
      }
    },
    updateThemePreferences(
      state,
      action: PayloadAction<{ sidebarBgColor?: string | null; displayBgColor?: string | null; themeHeaderBg?: string | null; themeCardBg?: string | null; themeBorder?: string | null; themeTextPrimary?: string | null; themeTextSecondary?: string | null; themeSidebarNavText?: string | null }>
    ) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem("auth_user", JSON.stringify(state.user));
      }
    },
  },
});

export const { setUser, updateThemePreferences } = authSlice.actions;
export default authSlice.reducer;

