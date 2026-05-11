import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthUser = {
  id?: string | number;
  name?: string;
  email?: string;
  createdAt?: string;
  [key: string]: unknown;
};

type AuthResponse = {
  token: string;
  user: AuthUser;
};

type UsersResponse = {
  users: AuthUser[];
};

/**
 * API base URL from Vite env (injected at build time). Falls back for local dev.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050';

/**
 * RTK Query API slice — JWT attached via Redux auth state for protected routes.
 */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as { auth?: { token?: string | null } } | undefined;
      const token = state?.auth?.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User'],
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginCredentials>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation<AuthResponse, { email: string; password: string; name?: string }>({
      query: (payload) => ({
        url: '/auth/register',
        method: 'POST',
        body: payload,
      }),
    }),
    getUsers: builder.query<UsersResponse, void>({
      query: () => '/users',
      providesTags: ['User'],
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useGetUsersQuery } = api;

