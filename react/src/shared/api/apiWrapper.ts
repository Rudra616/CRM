import type { AxiosRequestConfig } from "axios";
import axiosClient from "./axiosClient";
import type { ApiResponse } from "../../modules/auth/types/auth.types";
interface ApiError {
  message?: string;
  response?: { data?: { message?: string }; status?: number };
  config?: { method?: string; url?: string; data?: unknown };
}

const getErrorMessage = (err: unknown): string => {
  if (!err) return "Request failed";
  if (typeof err === "string") return err;
  const e = err as ApiError;
  if (typeof e.message === "string" && e.message) return e.message;
  const data = e.response?.data;
  if (data && typeof data.message === "string") return data.message;
  const status = e.response?.status;
  if (status === 404) return "Not found";
  if (status === 403) return "Access denied";
  if (status === 401) return "Please login again";
  return "Request failed. Please try again.";
};

export const apiRequest = async <T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  try {
    const response = await axiosClient({ method, url, data, ...config });
    return response.data;
  } catch (error) {
    const e = error as ApiError;
    const msg = getErrorMessage(error);

    // Keep developer-facing diagnostics in console without exposing internals to users.
    console.error("[API ERROR]", {
      request: {
        method,
        url,
        data,
      },
      responseStatus: e?.response?.status,
      responseMessage: e?.response?.data?.message,
      rawError: error,
    });

    const err = new Error(msg) as Error & { original: unknown };
    err.original = error;
    throw err;
  }
};