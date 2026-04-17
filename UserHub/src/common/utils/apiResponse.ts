import { Response } from "express";

export const successResponse = <T>(
  res: Response,
  message: string,
  data?: T,
  status = 200
) => {
  let responseData: any = data;

  // Professional handling for "empty" data
  if (data === null || data === undefined) {
    responseData = Array.isArray(data) ? [] : undefined; 
  } else if (typeof data === "object" && !Array.isArray(data)) {
    // If object but empty, return empty object
    if (Object.keys(data as object).length === 0) {
      responseData = {};
    }
  }

  // Build response
  const responseBody: any = { success: true, message };
  if (responseData !== undefined) {
    responseBody.data = responseData;
  }

  return res.status(status).json(responseBody);
};
export const errorResponse = (
  res: Response,
  message: string,
  status = 500,
  devMessage?: any
) => {
  const payload: any = {
    success: false,
    message,
  };

  // Only add this (main upgrade)
  if (process.env.NODE_ENV === "development" && devMessage) {
    payload.devMessage =
      typeof devMessage === "object"
        ? JSON.stringify(devMessage)
        : devMessage;
  }

  // Keep your logging (no change)
  if (status >= 500) {
    console.error("[API ERROR RESPONSE]", { status, message });
  } else {
    console.warn("[API RESPONSE WARNING]", { status, message });
  }

  return res.status(status).json(payload);
};