import axiosClient from "./axiosClient";
import type { ApiResponse } from "../types/apiTypes";

interface ApiError {
  message?: string;
  response?: { data?: { message?: string }; status?: number };
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
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  data?: unknown
): Promise<ApiResponse<T>> => {
  try {
    const response = await axiosClient({ method, url, data });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};