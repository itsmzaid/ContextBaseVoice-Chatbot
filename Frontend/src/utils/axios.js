// redux/axiosBaseQuery.ts
import axios from "axios";
import toast from "react-hot-toast";
import { accessKey } from "./constants";

// Base query function with global success/error handling
export const axiosBaseQuery =
  (
    { baseUrl } = {
      baseUrl: "",
    }
  ) =>
  async ({ url, method, body, params }) => {
    try {
      // Check if body is FormData
      const isFormData = body instanceof FormData;

      // Don't spread FormData, send it directly
      const data = isFormData ? body : body;

      // Set headers based on data type
      const headers = {
        Authorization: `Bearer ${localStorage.getItem(accessKey)}`,
      };

      // Don't set Content-Type for FormData, let browser set it with boundary
      if (!isFormData) {
        headers["Content-Type"] = "application/json";
      }

      const result = await axios({
        url: baseUrl + url,
        method,
        data: data,
        params,
        headers,
      });

      // Show success toast for non-GET requests
      if (method !== "GET" && result?.data?.status != 204) {
        if (result?.data?.status == 200) {
          toast.success(result?.data?.message);
        } else {
          toast.error(result?.data?.message);
        }
      }

      return { data: result.data };
    } catch (axiosError) {
      const error = axiosError;

      if (Array.isArray(error.response?.data?.message)) {
        toast.error(error.response?.data?.message[0]);
      } else {
        toast.error(error.response?.data?.message || "An error occurred!");
      }

      console.log("error", error.response?.status);
      // if (error.response?.status == 401) {
      //   const currentPath = window.location.pathname;
      //   if (currentPath != "/login" && currentPath != "/register") {
      //     localStorage.removeItem(accessKey);
      //     window.location.href = "/login";
      //   }
      // }
      // Show error toast

      return {
        error: {
          status: error.response?.status,
          data: error.response?.data || error.message,
        },
      };
    }
  };
