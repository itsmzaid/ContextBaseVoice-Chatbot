import { createApi } from "@reduxjs/toolkit/query/react";
import { AUTH_ENDPOINTS } from "../../utils/ApiUrls";
import { axiosBaseQuery } from "../../utils/axios";

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: axiosBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL,
  }),
  endpoints: (builder) => ({
    // Add your API endpoints here
    // Example:
    // login: builder.mutation({
    //   query: (data) => ({
    //     url: AUTH_ENDPOINTS.LOGIN,
    //     method: "POST",
    //     body: data,
    //   }),
    // }),
  }),
});

// Export hooks as needed
// export const {
//   useLoginMutation,
//   useRegisterMutation,
//   useLogoutMutation,
//   useGetUserQuery,
//   useUpdateUserMutation,
// } = authApi;
