import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { AuthResponse } from "../types";
import { getAuthToken, setAuthToken } from "../utils/authToken";

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
        const { token, ...userWithoutToken } = action.payload;
        if (token) {
          setAuthToken(token);
        }
        localStorage.setItem("auth_user", JSON.stringify(userWithoutToken));
      } else {
        setAuthToken(null);
        localStorage.removeItem("auth_user");
      }
    },
    updateThemePreferences(
      state,
      action: PayloadAction<{ sidebarBgColor?: string | null; displayBgColor?: string | null; themeHeaderBg?: string | null; themeCardBg?: string | null; themeBorder?: string | null; themeTextPrimary?: string | null; themeTextSecondary?: string | null; themeSidebarNavText?: string | null }>
    ) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        const { token: _token, ...persistable } = state.user;
        localStorage.setItem("auth_user", JSON.stringify(persistable));
      }
    },
    updateUserEmail(state, action: PayloadAction<string>) {
      if (state.user) {
        state.user = { ...state.user, email: action.payload };
        const { token: _token, ...persistable } = state.user;
        localStorage.setItem("auth_user", JSON.stringify(persistable));
      }
    },
  },
});

export const { setUser, updateThemePreferences, updateUserEmail } = authSlice.actions;
export default authSlice.reducer;

/** Rehydrate token from storage on app load (token is not stored in auth_user JSON). */
export function hasStoredSession(): boolean {
  return Boolean(getAuthToken() && localStorage.getItem("auth_user"));
}
