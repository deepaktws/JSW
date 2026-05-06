import { createSlice } from '@reduxjs/toolkit';
import { api } from '../../services/api';

const TOKEN_KEY = 'token';

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

const initialState = {
  token: readStoredToken(),
  user: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.token = action.payload.token;
      state.user = action.payload.user ?? null;
      try {
        localStorage.setItem(TOKEN_KEY, action.payload.token);
      } catch {
        /* ignore quota / private mode */
      }
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        /* ignore */
      }
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(
      api.endpoints.login.matchFulfilled,
      (state, { payload }) => {
        state.token = payload.token;
        state.user = payload.user;
        try {
          localStorage.setItem(TOKEN_KEY, payload.token);
        } catch {
          /* ignore */
        }
      },
    );
    builder.addMatcher(
      api.endpoints.register.matchFulfilled,
      (state, { payload }) => {
        state.token = payload.token;
        state.user = payload.user;
        try {
          localStorage.setItem(TOKEN_KEY, payload.token);
        } catch {
          /* ignore */
        }
      },
    );
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
