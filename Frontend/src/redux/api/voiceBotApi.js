import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "../../utils/axios";
import {
  USER_ENDPOINTS,
  AGENT_ENDPOINTS,
  SESSION_ENDPOINTS,
  MESSAGE_ENDPOINTS,
} from "../../utils/ApiUrls";

export const voiceBotApi = createApi({
  reducerPath: "voiceBotApi",
  baseQuery: axiosBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  }),
  tagTypes: ["User", "Agent", "Session", "Message"],
  endpoints: (builder) => ({
    // User endpoints
    createUser: builder.mutation({
      query: (data) => ({
        url: "/users",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["User"],
    }),

    getUserById: builder.query({
      query: (userId) => ({
        url: `/users/${userId}`,
        method: "GET",
      }),
      providesTags: ["User"],
    }),

    getAllUsers: builder.query({
      query: () => ({
        url: "/users",
        method: "GET",
      }),
      providesTags: ["User"],
    }),

    // Agent endpoints
    createAgent: builder.mutation({
      query: (data) => {
        // Don't set Content-Type header for FormData, let the browser set it with boundary
        return {
          url: "/agents",
          method: "POST",
          body: data,
        };
      },
      invalidatesTags: ["Agent"],
    }),

    getAgentById: builder.query({
      query: (agentId) => ({
        url: `/agents/${agentId}`,
        method: "GET",
      }),
      providesTags: ["Agent"],
    }),

    getUserAgents: builder.query({
      query: (userId) => ({
        url: `/agents/user/${userId}`,
        method: "GET",
      }),
      providesTags: ["Agent"],
    }),

    // Session endpoints
    startSession: builder.mutation({
      query: (data) => ({
        url: "/sessions/start",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Session"],
    }),

    endSession: builder.mutation({
      query: (sessionId) => ({
        url: `/sessions/${sessionId}/end`,
        method: "PATCH",
      }),
      invalidatesTags: ["Session"],
    }),

    getSessionById: builder.query({
      query: (sessionId) => ({
        url: `/sessions/${sessionId}`,
        method: "GET",
      }),
      providesTags: ["Session"],
    }),

    // Message endpoints
    createMessage: builder.mutation({
      query: (data) => {
        // Don't set Content-Type header for FormData, let the browser set it with boundary
        return {
          url: "/messages",
          method: "POST",
          body: data,
        };
      },
      invalidatesTags: ["Message"],
    }),

    getSessionMessages: builder.query({
      query: (sessionId) => ({
        url: `/messages/session/${sessionId}`,
        method: "GET",
      }),
      providesTags: ["Message"],
    }),

    getMessageById: builder.query({
      query: (messageId) => ({
        url: `/messages/${messageId}`,
        method: "GET",
      }),
      providesTags: ["Message"],
    }),
  }),
});

export const {
  // User hooks
  useCreateUserMutation,
  useGetUserByIdQuery,
  useGetAllUsersQuery,

  // Agent hooks
  useCreateAgentMutation,
  useGetAgentByIdQuery,
  useGetUserAgentsQuery,

  // Session hooks
  useStartSessionMutation,
  useEndSessionMutation,
  useGetSessionByIdQuery,

  // Message hooks
  useCreateMessageMutation,
  useGetSessionMessagesQuery,
  useGetMessageByIdQuery,
} = voiceBotApi;
