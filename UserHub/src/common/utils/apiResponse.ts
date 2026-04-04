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

export const errorResponse = (res: Response, message: string, status = 500) => {
  return res.status(status).json({ success: false, message });
};