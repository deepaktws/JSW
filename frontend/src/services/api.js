import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * API base URL from Vite env (injected at build time). Falls back for local dev.
 */
const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5050';

/**
 * RTK Query API slice — JWT attached via Redux auth state for protected routes.
 */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth?.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User'],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation({
      query: (payload) => ({
        url: '/auth/register',
        method: 'POST',
        body: payload,
      }),
    }),
    getUsers: builder.query({
      query: () => '/users',
      providesTags: ['User'],
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useGetUsersQuery } = api;
